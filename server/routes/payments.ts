import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';
import { pool } from '../mysqlPool.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';
import { epaycoConfig } from '../config/epayco.ts';
import { Order, OrderItem } from '../../src/types/index.ts';
import { sendSaleNotification } from '../services/whatsappAlerts.ts';

const router = Router();

/**
 * Validador de firma SHA-256 de ePayco Colombia
 * Calcula el hash con P_CUST_ID_CLIENTE, P_KEY, x_ref_pay, x_transaction_id y x_amount
 */
function verifyEpaycoSignature(payload: {
  pCustId: string;
  pKey: string;
  xRefPay: string;
  xTransactionId: string;
  xAmount: string | number;
  xCurrency?: string;
  xSignature: string;
}): boolean {
  const { pCustId, pKey, xRefPay, xTransactionId, xAmount, xCurrency, xSignature } = payload;
  if (!xSignature) return false;

  const amountStr = String(xAmount || '').trim();
  const amountNoDec = amountStr.includes('.') ? String(Math.round(parseFloat(amountStr))) : amountStr;
  const currency = (xCurrency || 'COP').trim();

  // ePayco soporta las siguientes variantes según la versión del plugin / API:
  // 1. p_cust_id_cliente ^ p_key ^ x_ref_pay ^ x_transaction_id ^ x_amount ^ x_currency_code
  // 2. p_cust_id_cliente ^ p_key ^ x_ref_pay ^ x_transaction_id ^ x_amount
  const variations = [
    `${pCustId}^${pKey}^${xRefPay}^${xTransactionId}^${amountStr}^${currency}`,
    `${pCustId}^${pKey}^${xRefPay}^${xTransactionId}^${amountStr}^${currency.toUpperCase()}`,
    `${pCustId}^${pKey}^${xRefPay}^${xTransactionId}^${amountStr}^${currency.toLowerCase()}`,
    `${pCustId}^${pKey}^${xRefPay}^${xTransactionId}^${amountNoDec}^${currency}`,
    `${pCustId}^${pKey}^${xRefPay}^${xTransactionId}^${amountStr}`,
    `${pCustId}^${pKey}^${xRefPay}^${xTransactionId}^${amountNoDec}`
  ];

  const incomingClean = xSignature.trim().toLowerCase();
  for (const str of variations) {
    const hash = crypto.createHash('sha256').update(str).digest('hex').toLowerCase();
    if (hash === incomingClean) {
      return true;
    }
  }

  return false;
}

/**
 * Función central para procesar aprobación y descuento de inventario
 * Reutilizable tanto por el Webhook como por la verificación bajo demanda de la pantalla de confirmación.
 */
export async function applyApprovedPayment(
  order: Order, 
  refPay: string, 
  transactionId?: string, 
  extraData?: any
): Promise<Order> {
  const wasAlreadyApproved = order.paymentStatus === 'APPROVED' && order.stock_deducted === true;

  order.paymentStatus = 'APPROVED';
  order.status = 'APROBADO_DROPI'; // Listo para despacho Dropi
  order.epayco_ref_pay = refPay;
  if (transactionId) order.epayco_transaction_id = transactionId;
  if (extraData) order.epayco_data = extraData;
  order.updatedAt = new Date().toISOString();

  // Si no se había descontado stock todavía, realizar descuento atómico
  if (!order.stock_deducted) {
    for (const item of order.items) {
      const prodId = item.productId;
      const qty = item.quantity || 1;

      // 1. Descuento en MySQL: UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ?
      try {
        await pool.query(
          'UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ?',
          [qty, prodId]
        );
      } catch (sqlErr: any) {
        console.warn(`[ePayco MySQL Stock Deduction Warning for ${prodId}]:`, sqlErr.message);
      }

      // 2. Descuento en store local en memoria
      const product = db.getProductById(prodId);
      if (product) {
        product.stock = Math.max(0, product.stock - qty);

        // Descontar en variantes si aplica
        if (Array.isArray(product.variants) && product.variants.length > 0) {
          const vIndex = product.variants.findIndex(v => 
            (item.variantId && v.id === item.variantId) ||
            (item.dropi_variation_id && String(v.dropi_variation_id) === String(item.dropi_variation_id)) ||
            (item.variantColor && v.color && v.color.toLowerCase() === item.variantColor.toLowerCase() &&
              (!item.variantSize || (v.size || v.talla || '').toLowerCase() === item.variantSize.toLowerCase()))
          );
          if (vIndex >= 0) {
            const varObj = product.variants[vIndex];
            varObj.stock = Math.max(0, (varObj.stock !== undefined ? varObj.stock : 10) - qty);
          }
        }

        db.saveProduct(product);

        // Sincronizar actualización con cPanel MySQL
        cpanelDbService.saveProduct({
          ...product,
          variants: product.variants
        } as any).catch(() => {});
      }
    }

    order.stock_deducted = true;
  }

  // Guardar orden actualizada
  const savedOrder = db.saveOrder(order);

  // Sincronizar estado de pedido en cPanel MySQL
  cpanelDbService.createOrder(savedOrder).catch(err => {
    console.warn('[cPanel Sync ePayco Order]:', err);
  });

  // Actualizar tabla pedidos en MySQL local si existe
  try {
    await pool.query(
      `UPDATE pedidos 
       SET estado = 'PAGADO', payment_status = 'APPROVED', epayco_ref_pay = ? 
       WHERE id = ? OR order_number = ?`,
      [refPay, order.id, order.orderNumber]
    );
  } catch {}

  if (!wasAlreadyApproved) {
    db.addLog({
      type: 'STATUS_UPDATE',
      orderId: order.id,
      action: 'Pago ePayco Confirmado y Aprobado',
      details: `Transacción ePayco #${refPay} aprobada con éxito. Pedido ${order.orderNumber} pasó a APROBADO_DROPI. Inventario descontado.`,
      status: 'success'
    });

    // Enviar notificación automática por WhatsApp de venta confirmada
    sendSaleNotification(savedOrder).catch(err => {
      console.warn('Error al enviar WhatsApp de venta ePayco:', err);
    });
  }

  return savedOrder;
}

/**
 * GET /api/payments/config
 * Devuelve la configuración pública y segura para inicializar el checkout de ePayco en el frontend
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    pCustIdCliente: epaycoConfig.pCustIdCliente,
    publicKey: epaycoConfig.publicKey,
    testMode: epaycoConfig.testMode,
    responseUrl: epaycoConfig.responseUrl,
    confirmationUrl: epaycoConfig.confirmationUrl
  });
});

/**
 * POST /api/payments/epayco-webhook
 * Webhook oficial invocado por ePayco Colombia tras completar una transacción.
 * 
 * Campos estándar de ePayco:
 * - x_ref_pay: Referencia de ePayco
 * - x_transaction_id: ID de transacción
 * - x_amount: Monto
 * - x_currency_code: Moneda (COP)
 * - x_id_invoice: Factura / número de orden nuestro
 * - x_cod_response: 1 (Aprobada), 2 (Rechazada), 3 (Pendiente), 4 (Fallida)
 * - x_transaction_state: Texto del estado
 * - x_signature: Hash SHA-256 de verificación
 */
router.post('/epayco-webhook', async (req, res) => {
  console.log('[ePayco Webhook Received]:', {
    x_ref_pay: req.body?.x_ref_pay,
    x_id_invoice: req.body?.x_id_invoice,
    x_cod_response: req.body?.x_cod_response,
    x_transaction_state: req.body?.x_transaction_state,
    x_amount: req.body?.x_amount
  });

  try {
    const {
      x_ref_pay,
      x_transaction_id,
      x_amount,
      x_currency_code,
      x_id_invoice,
      x_cod_response,
      x_transaction_state,
      x_signature,
      x_response_reason_text
    } = req.body || {};

    if (!x_ref_pay) {
      console.warn('[ePayco Webhook Warning]: Solicitud sin x_ref_pay.');
      return res.status(200).json({ status: 'success', message: 'Payload received without x_ref_pay' });
    }

    // 1. Validar autenticidad de la firma SHA-256
    const isSignatureValid = verifyEpaycoSignature({
      pCustId: epaycoConfig.pCustIdCliente,
      pKey: epaycoConfig.pKey,
      xRefPay: String(x_ref_pay),
      xTransactionId: String(x_transaction_id || ''),
      xAmount: x_amount,
      xCurrency: x_currency_code,
      xSignature: String(x_signature || '')
    });

    if (!isSignatureValid && !epaycoConfig.testMode) {
      console.warn('[ePayco Webhook Signature Mismatch]: Firma no válida para ref_pay:', x_ref_pay);
      return res.status(200).json({ status: 'error', message: 'Signature verification failed' });
    }

    // 2. Localizar el pedido en la base de datos
    const invoiceQuery = String(x_id_invoice || '').trim();
    let order: Order | undefined;

    if (invoiceQuery) {
      order = db.getOrderById(invoiceQuery);
    }
    if (!order && x_ref_pay) {
      order = db.getOrders().find(o => 
        (o as any).epayco_ref_pay === String(x_ref_pay) || 
        o.orderNumber === String(x_ref_pay) ||
        o.id === String(x_ref_pay)
      );
    }

    if (!order) {
      console.warn(`[ePayco Webhook]: No se encontró pedido para factura ${x_id_invoice} o ref ${x_ref_pay}`);
      // Siempre responder 200 a ePayco para evitar reintentos continuos
      return res.status(200).json({ status: 'success', message: 'Order not found, acknowledged' });
    }

    const codResponse = Number(x_cod_response);

    // 3. Evaluar respuesta de ePayco
    if (codResponse === 1) {
      // PAGO APROBADO (x_cod_response == 1)
      console.log(`[ePayco Webhook]: ¡Pago Aprobado para pedido ${order.orderNumber}! Procesando stock...`);
      await applyApprovedPayment(order, String(x_ref_pay), String(x_transaction_id || ''), req.body);
    } else if (codResponse === 2 || codResponse === 4) {
      // PAGO RECHAZADO O CANCELADO (x_cod_response == 2 o 4)
      console.log(`[ePayco Webhook]: Pago Rechazado/Cancelado para pedido ${order.orderNumber} (código ${codResponse})`);
      order.paymentStatus = 'REJECTED';
      order.status = 'RECHAZADO';
      order.epayco_ref_pay = String(x_ref_pay);
      order.epayco_data = req.body;
      order.updatedAt = new Date().toISOString();
      db.saveOrder(order);

      db.addLog({
        type: 'STATUS_UPDATE',
        orderId: order.id,
        action: 'Pago ePayco Rechazado / Cancelado',
        details: `Transacción ePayco #${x_ref_pay} rechazada (${x_response_reason_text || x_transaction_state || 'Rechazado'}).`,
        status: 'error'
      });
    } else if (codResponse === 3) {
      // PAGO PENDIENTE (x_cod_response == 3)
      console.log(`[ePayco Webhook]: Pago Pendiente para pedido ${order.orderNumber}`);
      order.paymentStatus = 'PENDING';
      order.status = 'PENDIENTE_PAGO';
      order.epayco_ref_pay = String(x_ref_pay);
      order.epayco_data = req.body;
      order.updatedAt = new Date().toISOString();
      db.saveOrder(order);
    }

    // Siempre responder con HTTP 200 { status: "success" } a ePayco
    return res.status(200).json({ status: 'success' });
  } catch (error: any) {
    console.error('[ePayco Webhook Error]:', error);
    // ePayco requiere HTTP 200 para no bloquear la cola de reintentos
    return res.status(200).json({ status: 'success', warning: error.message });
  }
});

/**
 * GET /api/payments/epayco-webhook
 * Verificación de disponibilidad de endpoint para tests y pings de ePayco
 */
router.get('/epayco-webhook', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ePayco Webhook ZavelaStore',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/payments/verify/:ref_pay
 * Endpoint de verificación directa consumido por la página de confirmación (/order-confirmation).
 * Consulta la API pública de validación de ePayco y sincroniza la orden local si aún no fue procesada.
 */
router.get('/verify/:ref_pay', async (req, res) => {
  const refPay = req.params.ref_pay;
  if (!refPay) {
    return res.status(400).json({ success: false, message: 'Falta ref_pay' });
  }

  try {
    // 1. Consultar el estado oficial en la API de validación de ePayco
    let epaycoData: any = null;
    try {
      const epaycoRes = await fetch(`https://secure.epayco.co/validation/v1/reference/${encodeURIComponent(refPay)}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (epaycoRes.ok) {
        const json = await epaycoRes.json();
        if (json && json.success && json.data) {
          epaycoData = json.data;
        }
      }
    } catch (e: any) {
      console.warn('[ePayco Validation Fetch Warning]:', e.message);
    }

    // 2. Buscar pedido asociado en la base de datos local
    const invoiceQuery = epaycoData?.x_id_invoice || '';
    let order: Order | undefined;

    if (invoiceQuery) {
      order = db.getOrderById(String(invoiceQuery));
    }
    if (!order) {
      order = db.getOrders().find(o => 
        (o as any).epayco_ref_pay === refPay || 
        o.orderNumber === refPay || 
        o.id === refPay
      );
    }

    // 3. Si ePayco confirma pago aprobado (x_cod_response == 1) y tenemos la orden, aplicar aprobación y stock
    if (epaycoData && Number(epaycoData.x_cod_response) === 1 && order) {
      order = await applyApprovedPayment(
        order, 
        refPay, 
        epaycoData.x_transaction_id, 
        epaycoData
      );
    } else if (epaycoData && (Number(epaycoData.x_cod_response) === 2 || Number(epaycoData.x_cod_response) === 4) && order) {
      if (order.paymentStatus !== 'REJECTED') {
        order.paymentStatus = 'REJECTED';
        order.status = 'RECHAZADO';
        order.epayco_ref_pay = refPay;
        order.epayco_data = epaycoData;
        order.updatedAt = new Date().toISOString();
        db.saveOrder(order);
      }
    }

    res.json({
      success: true,
      ref_pay: refPay,
      epayco: epaycoData,
      order: order || null,
      status: epaycoData?.x_response || epaycoData?.x_transaction_state || (order ? order.paymentStatus : 'DESCONOCIDO'),
      cod_response: epaycoData?.x_cod_response !== undefined ? Number(epaycoData.x_cod_response) : null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
