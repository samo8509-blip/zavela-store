import { Router, Request, Response } from 'express';
import { 
  ADMIN_WHATSAPP_NUMBER_RAW, 
  ADMIN_WHATSAPP_NUMBER_FORMATTED,
  getAlertLogs, 
  getAdminPhoneNumber,
  isCopilotAlertsEnabled,
  dispatchWhatsAppAlert, 
  sendSaleNotification, 
  sendSecurityAlert, 
  sendLowStockAlert,
  generateWaMeLink,
  buildSaleConfirmedMessage,
  buildSecurityAlertMessage,
  buildLowStockAlertMessage
} from '../services/whatsappAlerts.ts';
import { db } from '../db.ts';
import { sendHumanRequestAlert } from '../services/whatsappAlerts.ts';
import { savePrivateConfig, getPrivateConfig } from '../services/privateConfig.ts';
import { getResendKey, getSmtp, getAlertEmailTo, isSmtpConfigured, isValidEmail, maskEmail, sendAlertEmail } from '../services/emailAlerts.ts';

// Enmascara el número personal para que no viaje completo al navegador.
const maskPhone = (p: string) => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 7 ? `+${d.slice(0, 2)} ${d.slice(2, 5)} *** ${d.slice(-4)}` : ''; };

// El resultado hacia el navegador nunca lleva el número real ni enlaces wa.me con él.
const safeResult = (r: any) => ({ ...r, waMeUrl: '', recipientPhone: maskPhone(r?.recipientPhone), metaResponse: undefined });

const router = Router();
let sendHits: number[] = [];

/**
 * GET /api/alerts/config
 * Provides current private alert configuration, admin phone, and status
 */
router.get('/config', (req: Request, res: Response) => {
  const settings = db.getSettings();
  const alertSettings = settings.whatsappAlerts || {
    enabled: true,
    adminPhoneNumber: '+573008784427',
    notifyNewSales: true,
    notifySecurityAlerts: true,
    notifyLowStock: true,
    lowStockThreshold: 5
  };

  const currentAdminPhone = getAdminPhoneNumber();
  const hasToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN || settings.whatsappCloudApi?.accessToken);
  const hasPhoneId = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID || settings.whatsappCloudApi?.phoneNumberId);

  res.json({
    success: true,
    channel: 'CANAL_PRIVADO_COPILOTO',
    settings: { ...alertSettings, adminPhoneNumber: maskPhone(alertSettings.adminPhoneNumber || currentAdminPhone) },
    recipient: {
      display: maskPhone(currentAdminPhone),
      isDefault: currentAdminPhone === ADMIN_WHATSAPP_NUMBER_RAW
    },
    email: {
      to: maskEmail(getAlertEmailTo()),
      hasRecipient: Boolean(getAlertEmailTo()),
      smtpReady: isSmtpConfigured(),
      hasResend: Boolean(getResendKey()),
      smtp: { host: getSmtp().host, port: getSmtp().port, user: getSmtp().user, hasPass: Boolean(getSmtp().pass) }
    },
    enabled: isCopilotAlertsEnabled(),
    statusText: `Copiloto conectado para reportes privados a ${maskPhone(currentAdminPhone)}`,
    cloudApi: {
      isReady: hasToken && hasPhoneId,
      hasAccessToken: hasToken,
      hasPhoneNumberId: hasPhoneId,
      apiVersion: settings.whatsappCloudApi?.metaApiVersion || 'v20.0'
    },
    activeTriggers: [
      { id: 'NEW_SALE', name: 'Nueva Orden por Aprobar (Venta)', icon: '🛍️', active: alertSettings.notifyNewSales !== false },
      { id: 'SECURITY_ALERT', name: 'Alerta Crítica de Ciberseguridad / Centinela', icon: '🛡️', active: alertSettings.notifySecurityAlerts !== false },
      { id: 'LOW_STOCK', name: 'Quiebre de Stock (≤ 5 unidades)', icon: '⚠️', active: alertSettings.notifyLowStock !== false }
    ]
  });
});

/**
 * POST /api/alerts/config
 * Updates and persists private copilot alert settings
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const { 
      adminPhoneNumber, 
      enabled, 
      notifyNewSales, 
      notifySecurityAlerts, 
      notifyLowStock, 
      lowStockThreshold,
      alertEmail
    } = req.body;

    const settings = db.getSettings();
    const currentAlerts = settings.whatsappAlerts || {
      enabled: true,
      adminPhoneNumber: '+573008784427',
      notifyNewSales: true,
      notifySecurityAlerts: true,
      notifyLowStock: true,
      lowStockThreshold: 5
    };

    // Si llega el número enmascarado (con ***) se conserva el real.
    const incomingPhone = adminPhoneNumber ? String(adminPhoneNumber).trim() : '';
    const cleanPhone = incomingPhone && !incomingPhone.includes('*') ? incomingPhone : currentAlerts.adminPhoneNumber;
    if (alertEmail !== undefined && String(alertEmail).trim() && !isValidEmail(alertEmail)) {
      return res.status(400).json({ success: false, message: 'El correo de alertas no es válido.' });
    }

    const updatedAlerts = {
      ...currentAlerts,
      adminPhoneNumber: cleanPhone || '+573008784427',
      enabled: enabled !== undefined ? Boolean(enabled) : currentAlerts.enabled,
      notifyNewSales: notifyNewSales !== undefined ? Boolean(notifyNewSales) : currentAlerts.notifyNewSales,
      notifySecurityAlerts: notifySecurityAlerts !== undefined ? Boolean(notifySecurityAlerts) : currentAlerts.notifySecurityAlerts,
      notifyLowStock: notifyLowStock !== undefined ? Boolean(notifyLowStock) : currentAlerts.notifyLowStock,
      lowStockThreshold: Number(lowStockThreshold) || currentAlerts.lowStockThreshold || 5,
      alertEmail: alertEmail !== undefined ? String(alertEmail).trim() : (currentAlerts as any).alertEmail
    };

    db.saveSettings({
      ...settings,
      whatsappAlerts: updatedAlerts
    });
    if (alertEmail !== undefined) await savePrivateConfig({ alertEmail: String(alertEmail).trim() });

    res.json({
      success: true,
      message: 'Configuración del Canal Privado de Alertas actualizada exitosamente.',
      data: { ...updatedAlerts, adminPhoneNumber: maskPhone(updatedAlerts.adminPhoneNumber) }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error guardando configuración de alertas.'
    });
  }
});

/**
 * POST /api/alerts/smtp  (solo administrador: lo exige apiGuard)
 * Guarda la cuenta de envío de correo en MySQL. La contraseña vacía o enmascarada conserva la actual.
 */
router.post('/smtp', async (req: Request, res: Response) => {
  try {
    const host = String(req.body?.host || '').trim();
    const user = String(req.body?.user || '').trim();
    const port = Number(req.body?.port) || 465;
    const passIn = String(req.body?.pass || '');
    const prev = getPrivateConfig().smtp || {};
    const pass = passIn && !passIn.includes('•') && !passIn.includes('*') ? passIn : (prev.pass || '');
    if (!host || !isValidEmail(user)) {
      return res.status(400).json({ success: false, message: 'Escribe el servidor y el correo de la cuenta de envío.' });
    }
    if (!pass) return res.status(400).json({ success: false, message: 'Falta la contraseña de la cuenta de correo.' });
    const ok = await savePrivateConfig({ smtp: { host, port, user, pass } });
    res.json({ success: true, persisted: ok, message: ok ? 'Cuenta de envío guardada.' : 'Guardada solo hasta que el servidor se reinicie: no se pudo escribir en la base de datos.' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Error guardando.' });
  }
});

/** POST /api/alerts/resend (solo administrador): guarda la clave de Resend en MySQL. */
router.post('/resend', async (req: Request, res: Response) => {
  const key = String(req.body?.key || '').trim();
  if (!/^re_[A-Za-z0-9_\-]{10,}$/.test(key)) {
    return res.status(400).json({ success: false, message: 'La clave de Resend debe empezar por "re_".' });
  }
  const ok = await savePrivateConfig({ resendKey: key });
  res.json({ success: true, persisted: ok, message: ok ? 'Clave guardada.' : 'Guardada solo hasta que el servidor se reinicie.' });
});

/**
 * GET /api/alerts/logs
 * Retrieves recent alerts sent or prepared for direct WhatsApp Web backup
 */
router.get('/logs', (req: Request, res: Response) => {
  const logs = getAlertLogs().map(l => ({ ...l, recipientPhone: maskPhone(l.recipientPhone), waMeUrl: '' }));
  res.json({
    success: true,
    count: logs.length,
    data: logs
  });
});

/**
 * POST /api/alerts/send
 * Dispatches an automated alert or creates a direct WhatsApp Web backup
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { type, order, product, account, details, message, rawText, title } = req.body;

    // Visitantes (sin sesión de admin) solo pueden disparar la alerta de seguridad del Centinela, con tope por hora.
    if (!(res.locals as any).isAdmin) {
      const nowTs = Date.now();
      sendHits = sendHits.filter(t => nowTs - t < 60 * 60 * 1000);
      if (type !== 'SECURITY_ALERT' || sendHits.length >= 10) {
        return res.json({ success: true, throttled: true });
      }
      sendHits.push(nowTs);
    }

    let result;

    if (type === 'NEW_SALE') {
      result = await sendSaleNotification(order || {});
    } else if (type === 'SECURITY_ALERT') {
      result = await sendSecurityAlert(account || 'usuario@desconocido', details);
    } else if (type === 'LOW_STOCK') {
      result = await sendLowStockAlert(product || { title: 'Producto Zavela', stock: 1 });
    } else {
      // Custom or generic notification (e.g. DAILY_SUMMARY)
      const alertMsg = rawText || message || 'Notificación ejecutiva del Copiloto Zavela Store.';
      result = await dispatchWhatsAppAlert({
        type: type || 'CUSTOM',
        title: title || (type === 'DAILY_SUMMARY' ? '🚨 Reporte de Ventas Zavela Store' : 'Aviso Privado Copiloto Zavela'),
        message: alertMsg,
        details
      });
    }

    res.json({
      success: true,
      ...safeResult(result)
    });
  } catch (error: any) {
    console.error('Error in /api/alerts/send:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Error al despachar alerta a WhatsApp.'
    });
  }
});

/**
 * POST /api/alerts/test
 * Quick trigger to verify the WhatsApp alert system for admin
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { testType = 'NEW_SALE' } = req.body;
    const targetPhone = getAdminPhoneNumber();

    let result;

    if (testType === 'NEW_SALE') {
      result = await sendSaleNotification({
        id: `ord-test-${Date.now()}`,
        orderNumber: `NV-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: 'Santiago Morales',
        customerPhone: '+57 300 000 0000',
        city: 'Bogotá D.C.',
        address: 'Carrera 15 # 93-60 Apto 402',
        total: 189900,
        items: [
          {
            id: 'it-1',
            orderId: 'test',
            productId: 'PROD-PERF-01',
            title: 'Perfume Sauvage Elixir 100ml Hombre',
            quantity: 1,
            unitPrice: 189900,
            subtotal: 189900
          }
        ]
      });
    } else if (testType === 'SECURITY_ALERT') {
      result = await sendSecurityAlert('admin@zavelastore.co', {
        eventType: 'Fuerza bruta en contraseñas',
        ip: '190.85.122.44 (Bogotá, Colombia - Red Tor / Nodo de Salida)',
        failedAttempts: 47,
        reason: 'Ráfaga de contraseñas no autorizadas detectada y mitigada por el Centinela.'
      });
    } else if (testType === 'LOW_STOCK') {
      result = await sendLowStockAlert({
        id: 'PROD-RELOJ-01',
        title: 'Reloj de Lujo Minimalista Cuero Café',
        sku: 'ZV-WATCH-01',
        stock: 2
      });
    } else {
      // General verification test
      result = await dispatchWhatsAppAlert({
        type: 'CUSTOM',
        title: 'Verificación Canal Privado Copiloto',
        message: `🔔 VERIFICACIÓN DE CANAL PRIVADO - ZAVELA STORE
¡Hola Administrador! Tu Copiloto de Inteligencia Artificial está conectado y sincronizado con este chat privado.
• Teléfono verificado: ${maskPhone(targetPhone)}
• Estado: Operativo 24/7 para alertar sobre nuevas órdenes por aprobar, quiebres de inventario y eventos de seguridad.`
      });
    }

    res.json({
      success: true,
      testType,
      targetPhone: maskPhone(targetPhone),
      ...safeResult(result)
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Error en prueba de alerta'
    });
  }
});

/**
 * POST /api/alerts/human-request  (público)
 * Un cliente pidió hablar con una persona. Avisa al administrador por correo.
 * Limitado por IP para evitar abuso.
 */
const humanHits = new Map<string, number[]>();
let humanGlobal: number[] = [];
router.post('/human-request', async (req: Request, res: Response) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'x').split(',')[0].trim();
  const now = Date.now();
  const recent = (humanHits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  humanGlobal = humanGlobal.filter(t => now - t < 60 * 60 * 1000);
  if (recent.length >= 3 || humanGlobal.length >= 30) {
    return res.json({ success: true, throttled: true });
  }
  recent.push(now); humanHits.set(ip, recent); humanGlobal.push(now);
  try {
    const { name, phone, message, page } = req.body || {};
    await sendHumanRequestAlert({ name, phone, message, page });
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

/**
 * POST /api/alerts/test-email
 * Envía un correo de prueba al destino configurado y dice si funcionó.
 */
router.post('/test-email', async (req: Request, res: Response) => {
  const r = await sendAlertEmail('Prueba de alertas', '✅ Si lees esto, las alertas por correo de Zavela Store funcionan.\n\nRecibirás aquí: compras nuevas, stock bajo, alertas de seguridad y clientes que piden hablar con una persona.');
  res.json({ success: r.sent, message: r.sent ? 'Correo de prueba enviado.' : (r.reason || 'No se pudo enviar.') });
});

export default router;
