/**
 * WhatsApp Automatic Notifications & Alert Dispatcher for ZAVELA STORE Colombia
 * 
 * CANAL PRIVADO DE ALERTAS DEL COPILOTO (Exclusivo para el Administrador / Dueño)
 * Target Destination: +57 300 878 4427 (573008784427)
 * 
 * Separación Estricta:
 * - Canal Público Comercial: Asesoría de compras y pedidos para clientes de la tienda.
 * - Canal Privado Copiloto: Alertas internas de ventas por aprobar, ciberseguridad y quiebre de stock.
 * 
 * Critical Automated Events:
 * 1. Nueva Orden por Aprobar (Pago Contra Entrega o En Línea)
 * 2. Alerta Crítica de Ciberseguridad / Bloqueo Centinela (Fuerza bruta, Inyección, Intento de robo de datos)
 * 3. Novedad de Inventario / Quiebre de Stock (Stock <= 5)
 */

import { Order, WhatsAppAlertLog, WhatsAppAlertType } from '../../src/types/index.ts';
import { db } from '../db.ts';

export const ADMIN_WHATSAPP_NUMBER_RAW = '573008784427';
export const ADMIN_WHATSAPP_NUMBER_FORMATTED = '+57 300 878 4427';

// In-memory circular buffer of recent alerts
const alertLogs: WhatsAppAlertLog[] = [];

export function getAlertLogs(): WhatsAppAlertLog[] {
  return [...alertLogs];
}

export function addAlertLog(log: WhatsAppAlertLog): void {
  alertLogs.unshift(log);
  if (alertLogs.length > 80) {
    alertLogs.pop();
  }
}

/**
 * Returns current configured admin WhatsApp number from settings, env or default
 */
export function getAdminPhoneNumber(): string {
  try {
    const settings = db.getSettings();
    const configured = settings.whatsappAlerts?.adminPhoneNumber || process.env.ADMIN_WHATSAPP_NUMBER;
    if (configured && configured.trim()) {
      return configured.replace(/[^\d]/g, '');
    }
  } catch {}
  return ADMIN_WHATSAPP_NUMBER_RAW;
}

/**
 * Checks whether Copilot WhatsApp alerts are enabled
 */
export function isCopilotAlertsEnabled(): boolean {
  try {
    const settings = db.getSettings();
    if (settings.whatsappAlerts && settings.whatsappAlerts.enabled === false) {
      return false;
    }
  } catch {}
  return true;
}

/**
 * Format currency amount for WhatsApp text
 */
function formatCOPNumber(val: number): string {
  return `$${Math.round(val || 0).toLocaleString('es-CO')}`;
}

/**
 * Generates direct wa.me link with encoded message
 */
export function generateWaMeLink(text: string, phone?: string): string {
  const targetPhone = phone ? phone.replace(/[^\d]/g, '') : getAdminPhoneNumber();
  const cleanPhone = targetPhone || ADMIN_WHATSAPP_NUMBER_RAW;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Format message: NUEVA ORDEN POR APROBAR
 */
export function buildSaleConfirmedMessage(order: Partial<Order>): string {
  const orderNum = order.orderNumber || order.id || 'N/A';
  const customer = order.customerName || 'Cliente Zavela';
  const phone = order.customerPhone || 'No especificado';
  const city = order.city || 'Colombia';
  const address = order.address || 'Dirección de entrega';
  const total = formatCOPNumber(order.total || 0);

  // Products formatted line by line
  let itemsList = '';
  if (order.items && order.items.length > 0) {
    itemsList = order.items
      .map(it => `   - ${it.quantity}x ${it.title}${it.variantName ? ` (${it.variantName})` : ''}`)
      .join('\n');
  } else {
    itemsList = '   - 1x Producto de catálogo Zavela Store';
  }

  return `🚨 ¡NUEVA ORDEN POR APROBAR - ZAVELA STORE!
• Pedido #: ${orderNum}
• Cliente: ${customer}
• Teléfono: ${phone}
• Ciudad / Dirección: ${city}, ${address}
• Productos:
${itemsList}
• Total a Recaudar: COP ${total}
• Método: Pago Contra Entrega
👉 Acción: Revisar stock, aprobar despacho y generar guía con transportadora.`;
}

/**
 * Format message: ALERTA CRÍTICA DE CIBERSEGURIDAD Y PROTECCIÓN DE DATOS
 */
export function buildSecurityAlertMessage(
  account: string, 
  extra?: { 
    eventType?: 'Fuerza bruta' | 'Intento de extracción de datos' | 'Inyección de código' | string;
    ip?: string; 
    failedAttempts?: number; 
    reason?: string; 
    timestamp?: string;
  }
): string {
  const eventType = extra?.eventType || (extra?.failedAttempts ? 'Fuerza bruta en contraseñas' : 'Intento de acceso sospechoso');
  const ipText = extra?.ip ? `\n• IP Detectada: ${extra.ip}` : '';
  const reasonText = extra?.reason ? `\n• Detalle de anomalía: ${extra.reason}` : '';
  const timeText = extra?.timestamp ? `\n• Hora del incidente: ${extra.timestamp}` : `\n• Hora del incidente: ${new Date().toLocaleString('es-CO')}`;

  return `🛡️ ALERTA DE SEGURIDAD - INTENTO DE ACCESO SOSPECHOSO
Atención Administrador: Se detectaron anomalías en la tienda.
• Tipo de evento: ${eventType}
• Cuenta/Dato objetivo: ${account}${ipText}${reasonText}${timeText}
• Acción tomada: El copiloto ha bloqueado el acceso preventivamente para proteger la información de los clientes.`;
}

/**
 * Format message: NOVEDAD DE INVENTARIO / QUIEBRE DE STOCK
 */
export function buildLowStockAlertMessage(product: {
  title: string;
  sku?: string;
  stock: number;
  minThreshold?: number;
}): string {
  const skuText = product.sku || 'CAT-ZAVELA';
  const units = product.stock;

  return `⚠️ ALERTA DE INVENTARIO - ZAVELA STORE 📦
Atención Administrador: El producto "${product.title}" (SKU: ${skuText}) de alta demanda tiene solo ${units} unidad(es) disponible(s).
👉 Acción sugerida: Reabastecer inventario con el proveedor Dropi de inmediato para evitar quiebre de stock.`;
}

export interface DispatchAlertResult {
  success: boolean;
  alertId: string;
  sentViaApi: boolean;
  status: 'sent_cloud_api' | 'pending_direct_backup' | 'failed_api' | 'simulated' | 'disabled';
  waMeUrl: string;
  formattedMessage: string;
  recipientPhone: string;
  metaResponse?: any;
  error?: string;
}

/**
 * Sends message to Meta WhatsApp Cloud API if credentials exist.
 */
async function sendViaMetaCloudApi(
  recipientPhone: string,
  message: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const settings = db.getSettings();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || settings.whatsappCloudApi?.phoneNumberId;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || settings.whatsappCloudApi?.accessToken;
  const apiVersion = settings.whatsappCloudApi?.metaApiVersion || 'v20.0';

  if (!phoneNumberId || !accessToken) {
    return {
      success: false,
      error: 'Credenciales Meta Cloud API no configuradas. Se genera enlace directo para WhatsApp Web del Administrador.'
    };
  }

  try {
    const cleanPhone = recipientPhone.replace(/[^\d]/g, '');
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: true,
          body: message
        }
      })
    });

    const resJson = await res.json();
    if (res.ok) {
      return { success: true, data: resJson };
    } else {
      console.warn('Meta WhatsApp Cloud API error:', resJson);
      return { success: false, data: resJson, error: resJson?.error?.message || 'Error en Meta Cloud API' };
    }
  } catch (netErr: any) {
    console.error('Network exception connecting to Meta Cloud API:', netErr);
    return { success: false, error: netErr?.message || 'Error de red' };
  }
}

/**
 * Centralized Dispatcher for Private Copilot WhatsApp Alerts
 */
export async function dispatchWhatsAppAlert(params: {
  type: WhatsAppAlertType;
  title: string;
  message: string;
  recipientPhone?: string;
  details?: Record<string, any>;
}): Promise<DispatchAlertResult> {
  const alertId = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const targetPhone = params.recipientPhone ? params.recipientPhone.replace(/[^\d]/g, '') : getAdminPhoneNumber();
  const waMeUrl = generateWaMeLink(params.message, targetPhone);

  const isEnabled = isCopilotAlertsEnabled();

  console.log(`\n📢 [CANAL PRIVADO COPILOTO WHATSAPP] Tipo: ${params.type} | Destinatario: +${targetPhone}`);
  console.log(params.message);

  if (!isEnabled) {
    console.log(`⏸️ [CANAL PRIVADO COPILOTO] Alertas pausadas por configuración de administrador.`);
    const logEntry: WhatsAppAlertLog = {
      id: alertId,
      timestamp: new Date().toISOString(),
      type: params.type,
      title: params.title,
      recipientPhone: targetPhone,
      message: params.message,
      status: 'simulated',
      waMeUrl,
      details: { ...params.details, note: 'Alertas desactivadas en panel' }
    };
    addAlertLog(logEntry);
    return {
      success: true,
      alertId,
      sentViaApi: false,
      status: 'disabled',
      waMeUrl,
      formattedMessage: params.message,
      recipientPhone: targetPhone,
      error: 'Alertas automáticas desactivadas temporalmente en el panel.'
    };
  }

  // Attempt Automated Meta Cloud API Send
  const apiResult = await sendViaMetaCloudApi(targetPhone, params.message);

  let status: 'sent_cloud_api' | 'pending_direct_backup' | 'failed_api' = 'pending_direct_backup';
  if (apiResult.success) {
    status = 'sent_cloud_api';
    console.log(`✅ [CANAL PRIVADO COPILOTO] Despachado automáticamente por Meta Cloud API a +${targetPhone}`);
  } else {
    console.log(`ℹ️ [CANAL PRIVADO COPILOTO] Respaldo Directo Activo para WhatsApp Web: ${waMeUrl}`);
  }

  const logEntry: WhatsAppAlertLog = {
    id: alertId,
    timestamp: new Date().toISOString(),
    type: params.type,
    title: params.title,
    recipientPhone: targetPhone,
    message: params.message,
    status,
    waMeUrl,
    metaMessageId: apiResult.data?.messages?.[0]?.id,
    details: {
      ...params.details,
      apiError: apiResult.error
    }
  };

  addAlertLog(logEntry);

  // Save to persistent system logs
  db.addLog({
    type: 'WHATSAPP_ALERT',
    action: `Canal Privado Copiloto: ${params.title}`,
    details: `${params.title} -> +${targetPhone}. Estado: ${status}`,
    status: apiResult.success ? 'success' : 'info'
  });

  return {
    success: true,
    alertId,
    sentViaApi: apiResult.success,
    status,
    waMeUrl,
    formattedMessage: params.message,
    recipientPhone: targetPhone,
    metaResponse: apiResult.data,
    error: apiResult.error
  };
}

/**
 * Trigger: NUEVA ORDEN POR APROBAR
 */
export async function sendSaleNotification(order: Partial<Order>): Promise<DispatchAlertResult> {
  const message = buildSaleConfirmedMessage(order);
  return dispatchWhatsAppAlert({
    type: 'NEW_SALE',
    title: `Nueva Orden por Aprobar #${order.orderNumber || order.id || ''}`,
    message,
    details: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      total: order.total
    }
  });
}

/**
 * Trigger: ALERTA CRÍTICA DE CIBERSEGURIDAD
 */
export async function sendSecurityAlert(
  account: string,
  extra?: { 
    eventType?: 'Fuerza bruta' | 'Intento de extracción de datos' | 'Inyección de código' | string;
    ip?: string; 
    failedAttempts?: number; 
    reason?: string; 
    timestamp?: string; 
  }
): Promise<DispatchAlertResult> {
  const message = buildSecurityAlertMessage(account, extra);
  return dispatchWhatsAppAlert({
    type: 'SECURITY_ALERT',
    title: `Alerta de Ciberseguridad: ${extra?.eventType || 'Acceso Sospechoso'}`,
    message,
    details: {
      account,
      ...extra
    }
  });
}

/**
 * Trigger: NOVEDAD DE INVENTARIO / QUIEBRE DE STOCK
 */
export async function sendLowStockAlert(product: {
  id?: string;
  title: string;
  sku?: string;
  stock: number;
  minThreshold?: number;
}): Promise<DispatchAlertResult> {
  const message = buildLowStockAlertMessage(product);
  return dispatchWhatsAppAlert({
    type: 'LOW_STOCK',
    title: `Quiebre de Stock: ${product.title}`,
    message,
    details: {
      productId: product.id,
      sku: product.sku,
      stock: product.stock
    }
  });
}
