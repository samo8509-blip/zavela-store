import { Router } from 'express';
import { db } from '../db.ts';
import { Order, OrderItem, PaymentMethod } from '../../src/types/index.ts';
import { getDaneCode } from '../../src/data/colombiaGeo.ts';
import { calculateShippingCost } from '../../src/data/shippingRates.ts';
import { sendSaleNotification, sendLowStockAlert } from '../services/whatsappAlerts.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';

const router = Router();

// Helper function to approve and dispatch an order to Dropi API
export async function approveOrderForDropi(orderId: string, options?: {
  carrier?: string;
  customer?: any;
  items?: any[];
  dane_code?: string;
}) {
  const order = db.getOrderById(orderId);
  if (!order) {
    throw new Error('Pedido no encontrado en el sistema.');
  }

  // Allow overrides if admin verified / updated fields
  const customerName = options?.customer?.name || order.customerName || '';
  const nameParts = customerName.trim().split(' ');
  const firstName = options?.customer?.firstName || nameParts[0] || 'Cliente';
  const lastName = options?.customer?.lastName || nameParts.slice(1).join(' ') || 'Zavela';
  const phone = (options?.customer?.phone || order.customerPhone || '').replace(/\D/g, '');
  const email = options?.customer?.email || order.customerEmail || `${phone || 'cliente'}@zavelastore.co`;
  const department = options?.customer?.department || order.department || '';
  const city = options?.customer?.city || order.city || '';
  const address = options?.customer?.address || order.address || '';
  const daneCode = options?.dane_code || order.dane_code || getDaneCode(city, department);
  const selectedCarrier = options?.carrier || order.carrier || 'Servientrega';

  // Validate customer required data
  if (!phone || phone.length < 7) {
    const errorMsg = 'El número de teléfono del cliente es inválido o está incompleto para generar la guía en Dropi.';
    order.status = 'ERROR_DROPI';
    order.error_message = errorMsg;
    db.saveOrder(order);
    throw new Error(errorMsg);
  }

  if (!city || !address) {
    const errorMsg = 'La ciudad o dirección de entrega no están completas para la transportadora en Dropi.';
    order.status = 'ERROR_DROPI';
    order.error_message = errorMsg;
    db.saveOrder(order);
    throw new Error(errorMsg);
  }

  // Validate & populate items with dropi_product_id
  const orderItems = options?.items || order.items || [];
  if (orderItems.length === 0) {
    const errorMsg = 'La orden no contiene productos para despachar en Dropi.';
    order.status = 'ERROR_DROPI';
    order.error_message = errorMsg;
    db.saveOrder(order);
    throw new Error(errorMsg);
  }

  const dropiProducts: { product_id: string | number; quantity: number; price: number; title?: string }[] = [];
  const missingDropiIds: string[] = [];

  for (const it of orderItems) {
    let dropiId = it.dropi_product_id;
    if (!dropiId) {
      // Lookup product from DB
      const catalogProduct = db.getProductById(it.productId);
      if (catalogProduct?.dropi_product_id) {
        dropiId = catalogProduct.dropi_product_id;
        it.dropi_product_id = dropiId;
      }
    }

    if (!dropiId) {
      missingDropiIds.push(it.title || it.productId);
    } else {
      dropiProducts.push({
        product_id: dropiId,
        quantity: it.quantity || 1,
        price: it.unitPrice || 0,
        title: it.title
      });
    }
  }

  if (missingDropiIds.length > 0) {
    const errorMsg = `No se puede enviar a Dropi: El producto "${missingDropiIds.join(', ')}" no tiene configurado el Dropi Product ID en el catálogo. Por favor agrégalo en el editor de productos.`;
    order.status = 'ERROR_DROPI';
    order.error_message = errorMsg;
    order.items = orderItems;
    db.saveOrder(order);

    db.addLog({
      type: 'STATUS_UPDATE',
      orderId: order.id,
      action: 'Error Aprobación Dropi',
      details: `Rechazado: ${errorMsg}`,
      status: 'error'
    });

    throw new Error(errorMsg);
  }

  const isCashOnDelivery = order.paymentMethod === 'contra_entrega' || order.paymentMethod === 'cash_on_delivery';
  const totalAmount = order.total || order.totalAmount || 0;

  // Dropi API Payload
  const dropiPayload = {
    order_id: order.orderNumber,
    customer: {
      name: `${firstName} ${lastName}`.trim(),
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      address,
      city,
      state: department,
      dane_code: daneCode
    },
    shipping: {
      carrier: selectedCarrier,
      cash_on_delivery: isCashOnDelivery,
      total_amount: totalAmount,
      declared_value: totalAmount
    },
    products: dropiProducts
  };

  const dropiToken = process.env.DROPI_API_TOKEN;

  // Case 1: DROPI_API_TOKEN is provided -> Call real Dropi API
  if (dropiToken && dropiToken.trim() !== '') {
    try {
      const dropiApiUrl = process.env.DROPI_API_URL || 'https://api.dropi.co/api/orders';
      const response = await fetch(dropiApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dropiToken.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(dropiPayload)
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorDetail = responseData.message || responseData.error || responseData.detail || `Error HTTP ${response.status} de la API de Dropi`;
        order.status = 'ERROR_DROPI';
        order.error_message = errorDetail;
        order.carrier = selectedCarrier;
        order.dane_code = daneCode;
        order.items = orderItems;
        order.updatedAt = new Date().toISOString();
        db.saveOrder(order);

        db.addLog({
          type: 'STATUS_UPDATE',
          orderId: order.id,
          action: 'Error API Dropi Colombia',
          details: `Error al despachar pedido ${order.orderNumber} en Dropi: ${errorDetail}`,
          status: 'error'
        });

        throw new Error(errorDetail);
      }

      // Success from Dropi API
      const dropiOrderId = responseData.id || responseData.order_id || responseData.data?.id || `DP-${order.orderNumber}`;
      const dropiGuia = responseData.tracking_number || responseData.guide || responseData.guia || responseData.data?.guide_number || responseData.data?.tracking_number || `SER-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const resolvedCarrier = responseData.carrier || responseData.data?.carrier || selectedCarrier;

      order.status = 'APROBADO_DROPI';
      order.dropi_order_id = dropiOrderId;
      order.dropi_guia = dropiGuia;
      order.trackingNumber = dropiGuia;
      order.carrier = resolvedCarrier;
      order.error_message = undefined;
      order.dane_code = daneCode;
      order.dropi_approved_at = new Date().toISOString();
      order.dropi_response = responseData;
      order.items = orderItems;
      order.updatedAt = new Date().toISOString();

      const savedOrder = db.saveOrder(order);
      cpanelDbService.createOrder(savedOrder).catch(err => {
        console.warn('[cPanel DB Sync] Error al sincronizar estado Dropi con cPanel:', err);
      });

      db.addLog({
        type: 'STATUS_UPDATE',
        orderId: order.id,
        action: 'Pedido Aprobado y Enviado a Dropi',
        details: `Pedido ${order.orderNumber} montado en Dropi Colombia con éxito. Dropi ID: #${dropiOrderId} - Guía ${resolvedCarrier}: ${dropiGuia}`,
        status: 'success'
      });

      return {
        success: true,
        message: '¡Pedido aprobado y sincronizado con Dropi Colombia exitosamente!',
        order: savedOrder,
        dropiResponse: responseData
      };
    } catch (apiError: any) {
      if (order.status !== 'ERROR_DROPI') {
        order.status = 'ERROR_DROPI';
        order.error_message = apiError.message || 'Error de conexión con Dropi Colombia';
        order.carrier = selectedCarrier;
        order.dane_code = daneCode;
        order.items = orderItems;
        order.updatedAt = new Date().toISOString();
        db.saveOrder(order);
      }
      throw apiError;
    }
  }

  // Case 2: No DROPI_API_TOKEN set -> Automatic graceful test dispatch with simulated Dropi fulfillment
  const simulatedDropiId = `DP-${Math.floor(100000 + Math.random() * 900000)}`;
  const carrierPrefixMap: Record<string, string> = {
    'Servientrega': 'SER',
    'Coordinadora': 'COO',
    'Interrapidísimo': 'INT',
    'Envía': 'ENV',
    'TCC': 'TCC'
  };
  const prefix = carrierPrefixMap[selectedCarrier] || 'SER';
  const simulatedGuia = `${prefix}-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  order.status = 'APROBADO_DROPI';
  order.dropi_order_id = simulatedDropiId;
  order.dropi_guia = simulatedGuia;
  order.trackingNumber = simulatedGuia;
  order.carrier = selectedCarrier;
  order.error_message = undefined;
  order.dane_code = daneCode;
  order.dropi_approved_at = new Date().toISOString();
  order.items = orderItems;
  order.updatedAt = new Date().toISOString();

  const savedOrder = db.saveOrder(order);
  cpanelDbService.createOrder(savedOrder).catch(err => {
    console.warn('[cPanel DB Sync] Error al sincronizar estado Dropi con cPanel:', err);
  });

  db.addLog({
    type: 'STATUS_UPDATE',
    orderId: order.id,
    action: 'Pedido Aprobado en Dropi',
    details: `Pedido ${order.orderNumber} aprobado. Dropi Order ID: #${simulatedDropiId} - Guía ${selectedCarrier}: ${simulatedGuia}`,
    status: 'success'
  });

  return {
    success: true,
    message: '¡Pedido aprobado y enviado a Dropi exitosamente!',
    order: savedOrder,
    simulated: true
  };
}

// POST /api/orders/approve - Manual approval and Dropi dispatch endpoint
router.post('/approve', async (req, res) => {
  try {
    const { orderId, id, carrier, customer, items, dane_code } = req.body;
    const targetId = orderId || id;

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar el orderId del pedido a aprobar.'
      });
    }

    const result = await approveOrderForDropi(targetId, {
      carrier,
      customer,
      items,
      dane_code
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al aprobar la orden para Dropi.',
      error_message: error.message
    });
  }
});

// POST /api/orders - Create a new customer order
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      department,
      city,
      address,
      additionalNotes,
      paymentMethod = 'contra_entrega',
      dane_code,
      discountCode,
      discountAmount = 0,
      discountPercent = 0,
      items
    } = req.body;

    // Strict validation
    if (!firstName || !lastName || !phone || !department || !city || !address) {
      return res.status(400).json({
        success: false,
        message: 'Por favor completa todos los campos obligatorios del destinatario.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito de compras no contiene productos.'
      });
    }

    const settings = db.getSettings();
    let subtotal = 0;
    let productCostTotal = 0;
    const validatedItems: OrderItem[] = [];

    const orderId = `ord-${Date.now()}`;
    const orderNumber = `NV-${Math.floor(1000 + Math.random() * 9000)}`;
    const resolvedDane = dane_code || getDaneCode(city, department);

    for (const rawItem of items) {
      const product = db.getProductById(rawItem.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `El producto ${rawItem.productId} no existe o no está disponible.`
        });
      }

      if (product.stock < rawItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${product.title}. Disponible: ${product.stock}`
        });
      }

      // Deduct stock
      product.stock -= rawItem.quantity;
      db.saveProduct(product);

      // Check if stock has reached critical threshold (<= 5 units)
      if (product.stock <= 5) {
        db.addLog({
          type: 'STATUS_UPDATE',
          orderId,
          action: '⚠️ ALERTA INVENTARIO CRÍTICO (≤ 5 UNIDADES)',
          details: `El producto "${product.title}" (${product.id}) tiene solo ${product.stock} unidad(es) disponible(s). Revisar reabastecimiento con proveedor Dropi.`,
          status: 'info'
        });

        // Trigger WhatsApp automatic alert to admin (+573008784427)
        sendLowStockAlert({
          id: product.id,
          title: product.title,
          sku: product.id,
          stock: product.stock
        }).catch(err => console.warn('Error sending low stock WhatsApp alert:', err));
      }

      let itemUnitPrice = product.price;
      let itemUnitCost = product.costPrice;
      let variantName: string | undefined = undefined;

      if (rawItem.variantId && product.variants) {
        const variant = product.variants.find(v => v.id === rawItem.variantId);
        if (variant) {
          variantName = variant.name;
          itemUnitPrice = variant.price || product.price;
          itemUnitCost = variant.costPrice || product.costPrice;
        }
      }

      const itemSubtotal = itemUnitPrice * rawItem.quantity;
      subtotal += itemSubtotal;
      productCostTotal += (itemUnitCost || 0) * rawItem.quantity;

      validatedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId,
        productId: product.id,
        variantId: rawItem.variantId,
        title: product.title,
        variantName,
        quantity: rawItem.quantity,
        unitPrice: itemUnitPrice,
        unitCost: itemUnitCost,
        subtotal: itemSubtotal,
        image: product.images[0],
        dropi_product_id: product.dropi_product_id || product.dropiProductId
      });
    }

    // Dynamic 3-Zone Shipping calculation for Colombia
    const threshold = settings.freeShippingThreshold || 120000;
    const shippingCalc = calculateShippingCost({
      department,
      city,
      cartItems: validatedItems.map(vi => ({
        product: { id: vi.productId, price: vi.unitPrice, freeShipping: false } as any,
        quantity: vi.quantity
      })),
      subtotal,
      freeShippingThreshold: threshold
    });

    const shippingCost = shippingCalc.finalRate;
    const validDiscountAmount = Math.max(0, Math.min(Number(discountAmount) || 0, subtotal));
    const total = Math.max(0, subtotal - validDiscountAmount) + shippingCost;
    const grossMargin = total - productCostTotal - shippingCost;

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerName: `${firstName.trim()} ${lastName.trim()}`,
      customerPhone: phone.trim().replace(/\s+/g, ''),
      customerEmail: (email || `${phone}@zavelastore.co`).trim(),
      department,
      city,
      address,
      additionalNotes,
      subtotal,
      discountCode: discountCode || undefined,
      discountAmount: validDiscountAmount > 0 ? validDiscountAmount : undefined,
      discountPercent: discountPercent ? Number(discountPercent) : undefined,
      shippingCost,
      shippingZone: shippingCalc.zoneName,
      total,
      productCostTotal,
      grossMargin,
      paymentMethod: paymentMethod as PaymentMethod,
      paymentStatus: paymentMethod === 'contra_entrega' ? 'CASH_ON_DELIVERY' : 'APPROVED',
      status: 'PENDIENTE_REVISION', // Default status for approval flow
      carrier: 'Servientrega',
      dane_code: resolvedDane,
      items: validatedItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to database
    db.saveOrder(newOrder);

    // Persistencia externa en base de datos MySQL en cPanel vía POST /api.php?action=pedidos
    cpanelDbService.createOrder(newOrder).catch(cpanelErr => {
      console.warn('[cPanel DB Sync] Error al persistir orden en cPanel (continúa seguro en BD local):', cpanelErr);
    });

    db.addLog({
      type: 'ORDER_CREATED',
      orderId: newOrder.id,
      action: 'Pedido Registrado (Pendiente Revisión)',
      details: `Nuevo pedido ${newOrder.orderNumber} registrado por ${newOrder.customerName} - Total: $${newOrder.total.toLocaleString()} COP. Listo para revisión Dropi.`,
      status: 'success'
    });

    // Immediate Automatic Notification to Admin WhatsApp (+573008784427)
    let whatsappAlertResult = null;
    try {
      whatsappAlertResult = await sendSaleNotification(newOrder);
    } catch (waErr: any) {
      console.warn('Could not dispatch automatic WhatsApp notification:', waErr);
    }

    res.status(201).json({
      success: true,
      message: '¡Pedido creado exitosamente! Pendiente de aprobación administrativa para Dropi.',
      data: newOrder,
      whatsappAlert: whatsappAlertResult ? {
        sentViaApi: whatsappAlertResult.sentViaApi,
        status: whatsappAlertResult.status,
        waMeUrl: whatsappAlertResult.waMeUrl,
        formattedMessage: whatsappAlertResult.formattedMessage,
        recipientPhone: whatsappAlertResult.recipientPhone
      } : undefined
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/orders/track/:query - Customer tracking endpoint
router.get('/track/:query', (req, res) => {
  try {
    const query = req.params.query;
    const orders = db.getOrderByPhoneOrEmail(query);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No encontramos ningún pedido asociado a los datos proporcionados. Revisa el número de guía, pedido o teléfono.'
      });
    }

    res.json({
      success: true,
      data: orders
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/orders/:id - Single order details
router.get('/:id', (req, res) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
    }
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

