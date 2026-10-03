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

const router = Router();

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
    settings: alertSettings,
    recipient: {
      raw: currentAdminPhone,
      formatted: `+${currentAdminPhone.replace(/^57/, '57 ')}`,
      display: alertSettings.adminPhoneNumber || '+573008784427',
      isDefault: currentAdminPhone === ADMIN_WHATSAPP_NUMBER_RAW
    },
    enabled: isCopilotAlertsEnabled(),
    statusText: `Copiloto conectado para reportes privados a +${currentAdminPhone}`,
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
router.post('/config', (req: Request, res: Response) => {
  try {
    const { 
      adminPhoneNumber, 
      enabled, 
      notifyNewSales, 
      notifySecurityAlerts, 
      notifyLowStock, 
      lowStockThreshold 
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

    const cleanPhone = adminPhoneNumber ? adminPhoneNumber.trim() : currentAlerts.adminPhoneNumber;

    const updatedAlerts = {
      ...currentAlerts,
      adminPhoneNumber: cleanPhone || '+573008784427',
      enabled: enabled !== undefined ? Boolean(enabled) : currentAlerts.enabled,
      notifyNewSales: notifyNewSales !== undefined ? Boolean(notifyNewSales) : currentAlerts.notifyNewSales,
      notifySecurityAlerts: notifySecurityAlerts !== undefined ? Boolean(notifySecurityAlerts) : currentAlerts.notifySecurityAlerts,
      notifyLowStock: notifyLowStock !== undefined ? Boolean(notifyLowStock) : currentAlerts.notifyLowStock,
      lowStockThreshold: Number(lowStockThreshold) || currentAlerts.lowStockThreshold || 5
    };

    db.saveSettings({
      ...settings,
      whatsappAlerts: updatedAlerts
    });

    res.json({
      success: true,
      message: 'Configuración del Canal Privado de Alertas actualizada exitosamente.',
      data: updatedAlerts
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error guardando configuración de alertas.'
    });
  }
});

/**
 * GET /api/alerts/logs
 * Retrieves recent alerts sent or prepared for direct WhatsApp Web backup
 */
router.get('/logs', (req: Request, res: Response) => {
  const logs = getAlertLogs();
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
      ...result
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
        customerPhone: '+57 300 878 4427',
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
      result = await sendSecurityAlert('admin@zavelastore.co / +573008784427', {
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
• Teléfono verificado: +${targetPhone}
• Estado: Operativo 24/7 para alertar sobre nuevas órdenes por aprobar, quiebres de inventario y eventos de seguridad.`
      });
    }

    res.json({
      success: true,
      testType,
      targetPhone: `+${targetPhone}`,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error?.message || 'Error en prueba de alerta'
    });
  }
});

export default router;
