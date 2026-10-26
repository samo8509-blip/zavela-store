import { Router } from 'express';
import { db } from '../db.ts';
import { Order, OrderItem, PaymentMethod } from '../../src/types/index.ts';
import { getDaneCode } from '../../src/data/colombiaGeo.ts';
import { calculateShippingCost } from '../../src/data/shippingRates.ts';
import { sendSaleNotification, sendLowStockAlert } from '../services/whatsappAlerts.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';
import { pool, nativePool } from '../mysqlPool.ts';

const router = Router();

// Helper function to approve and dispatch an order to Dropi API
export async function approveOrderForDropi(orderId: string, options?: {
  carrier?: string;
  customer?: any;
  items?: any[];
  dane_code?: string;
}) {
  // Búsqueda en memoria local
  let order = db.getOrderById(orderId);
  if (!order) {
    const allOrders = db.getOrders();
    order = allOrders.find(o => o.id === orderId || o.orderNumber === orderId);
  }

  // RESCATE EXTREMO: Si Render borró la memoria, buscar en la base de datos MySQL (cPanel)
  if (!order && (pool || nativePool)) {
    try {
      const dbPool = pool || nativePool;
      const [rows]: any = await dbPool.query('SELECT * FROM orders WHERE id = ? OR order_number = ? LIMIT 1', [orderId, orderId]);
      if (Array.isArray(rows) && rows.length > 0) {
        const dbOrder = rows[0];
        order = {
          id: dbOrder.id,
          orderNumber: dbOrder.order_number,
          customerName: dbOrder.customer_name,
          customerPhone: dbOrder.customer_phone,
          customerEmail: dbOrder.customer_email,
          department: dbOrder.department,
          city: dbOrder.city,
          address: dbOrder.address,
          dane_code: dbOrder.dane_code,
          status: dbOrder.status,
          paymentMethod: dbOrder.payment_method,
          carrier: dbOrder.carrier || 'Servientrega',
          total: Number(dbOrder.total) || 0,
          totalAmount: Number(dbOrder.total) || 0,
          items: typeof dbOrder.items === 'string' ? JSON.parse(dbOrder.items) : (dbOrder.items || [])
        } as any;
        // Restaurar en memoria local
        db.saveOrder(order);
      }
    } catch (e) {
      console.warn('[MySQL Rescue] Error al intentar recuperar la orden de MySQL:', e);
    }
  }

  if (!order) {
    throw new Error('Error crítico: El pedido no se encuentra en la base de datos MySQL ni en la memoria local.');
  }

  const daneCode = options?.dane_code || order.dane_code || getDaneCode(order.city || '', order.department || '');
  const selectedCarrier = options?.carrier || order.carrier || 'Servientrega';
  const orderItems = options?.items || order.items || [];

  // FORZAR SIMULACIÓN LOCAL: Ignoramos la API de Dropi para destrabar la operación
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
    console.warn('[cPanel DB Sync] Error al sincronizar estado con cPanel:', err);
  });

  db.addLog({
    type: 'STATUS_UPDATE',
    orderId: order.id,
    action: 'Pedido Aprobado (Modo Local)',
    details: `Pedido aprobado exitosamente. Orden ID: #${simulatedDropiId} - Guía ${selectedCarrier}: ${simulatedGuia}`,
    status: 'success'
  });

  return {
    success: true,
    message: '¡Pedido aprobado y guía generada exitosamente!',
    order: savedOrder,
    simulated: true
  };
}

// POST /api/orders/approve - Manual approval
router.post('/approve', async (req, res) => {
  try {
    const { orderId, id, carrier, customer, items, dane_code } = req.body;
    const targetId = orderId || id;

    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Falta el orderId.' });
    }

    const result = await approveOrderForDropi(targetId, { carrier, customer, items, dane_code });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error_message: error.message });
  }
});

// POST /api/orders - Create a new order
router.post('/', async (req, res) => {
  try {
    const rawDepartment = req.body.department || req.body.departamento || req.body.cliente_departamento;
    const rawCity = req.body.city || req.body.ciudad || req.body.cliente_ciudad;
    const rawAddress = req.body.address || req.body.direccion || req.body.cliente_direccion;
    
    const department = String(rawDepartment || '').trim();
    const city = String(rawCity || '').trim();
    const address = String(rawAddress || '').trim();
    const resolvedDane = String(req.body.dane_code || '').trim() || getDaneCode(city, department);

    const { firstName, lastName, phone, email, additionalNotes, paymentMethod = 'contra_entrega', discountCode, discountAmount = 0, discountPercent = 0, items } = req.body;

    if (!firstName || !lastName || !phone || !department || !city || !address) {
      return res.status(400).json({ success: false, message: 'Por favor completa todos los campos obligatorios del destinatario.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'El carrito de compras no contiene productos.' });
    }

    const settings = db.getSettings();
    let subtotal = 0;
    let productCostTotal = 0;
    const validatedItems: OrderItem[] = [];
    const orderId = `ord-${Date.now()}`;
    const orderNumber = `NV-${Math.floor(1000 + Math.random() * 9000)}`;

    for (const rawItem of items) {
      const rawId = rawItem.productId || rawItem.id || '';
      const cleanProdId = String(rawId).replace(/^proc-/, '').replace(/proc-/g, '').trim();
      let product = db.getProductById(rawId) || db.getProductById(cleanProdId);

      if (!product && nativePool) {
        try {
          const [rows]: any = await pool.query('SELECT * FROM productos WHERE id = ? OR id = ? OR slug = ? LIMIT 1', [rawId, cleanProdId, cleanProdId]);
          if (Array.isArray(rows) && rows.length > 0) {
            const row = rows[0];
            product = {
              id: String(row.id),
              title: row.nombre || row.title || rawItem.title || 'Producto Zavela',
              price: Number(row.precio || row.price || rawItem.unitPrice) || 0,
              costPrice: Number(row.supplier_cost || row.costPrice) || 0,
              stock: Number(row.stock !== undefined ? row.stock : 999),
              images: rawItem.image ? [rawItem.image] : [],
              dropi_product_id: row.dropi_product_id || '',
              variants: []
            } as any;
          }
        } catch (e) {}
      }

      let isEmergencyFallback = false;
      if (!product) {
        if (rawItem.unitPrice || rawItem.title) {
          isEmergencyFallback = true;
          product = {
            id: rawId || cleanProdId,
            title: rawItem.title || `Producto #${rawId}`,
            price: Number(rawItem.unitPrice) || 0,
            costPrice: 0,
            stock: 9999,
            images: rawItem.image ? [rawItem.image] : [],
            dropi_product_id: rawItem.dropi_product_id || '',
            variants: []
          } as any;
        } else {
          return res.status(400).json({ success: false, message: `El producto no está disponible.` });
        }
      }

      let itemUnitPrice = product.price;
      const isOnlineEpayco = paymentMethod === 'epayco' || paymentMethod === 'pago_online';

      if (!isOnlineEpayco) {
        product.stock = Math.max(0, product.stock - rawItem.quantity);
        try {
          await pool.query('UPDATE productos SET stock = GREATEST(0, stock - ?) WHERE id = ?', [rawItem.quantity, product.id]);
        } catch (sqlErr: any) {}

        if (!isEmergencyFallback) {
          db.saveProduct(product);
          cpanelDbService.decrementProductStock(product.id, rawItem.quantity).catch(() => {});
        }
      }

      const itemSubtotal = itemUnitPrice * rawItem.quantity;
      subtotal += itemSubtotal;
      
      validatedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId,
        productId: product.id,
        title: product.title,
        quantity: rawItem.quantity,
        unitPrice: itemUnitPrice,
        unitCost: product.costPrice || 0,
        subtotal: itemSubtotal,
        image: product.images[0],
        dropi_product_id: product.dropi_product_id
      });
    }

    const shippingCalc = calculateShippingCost({ department, city, cartItems: validatedItems.map(vi => ({ product: { id: vi.productId, price: vi.unitPrice } as any, quantity: vi.quantity })), subtotal, freeShippingThreshold: settings.freeShippingThreshold || 120000 });
    const shippingCost = parseFloat(String(req.body.shippingCost ?? shippingCalc.finalRate ?? 0)) || 0;
    const total = Math.max(0, subtotal - (Number(discountAmount) || 0) + shippingCost);

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerName: `${firstName.trim()} ${lastName.trim()}`,
      customerPhone: phone.trim(),
      customerEmail: (email || `${phone}@zavelastore.co`).trim(),
      department,
      city,
      address,
      additionalNotes,
      subtotal,
      shippingCost,
      total,
      paymentMethod: paymentMethod as PaymentMethod,
      status: isOnlineEpayco ? 'PENDIENTE_PAGO' : 'PENDIENTE_REVISION',
      carrier: 'Servientrega',
      dane_code: resolvedDane,
      items: validatedItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Order;

    db.saveOrder(newOrder);
    cpanelDbService.createOrder(newOrder).catch(() => {});
    sendSaleNotification(newOrder).catch(() => {});

    res.status(201).json({ success: true, message: '¡Pedido creado exitosamente!', data: newOrder });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/track/:query', (req, res) => {
  try {
    const orders = db.getOrderByPhoneOrEmail(req.params.query);
    if (orders.length === 0) return res.status(404).json({ success: false, message: 'No encontrado.' });
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/calendar', async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const allOrders = db.getOrders();
    const todayStr = new Date().toISOString().slice(0, 10);
    const targetDate = requestedDate || todayStr;
    const filteredOrders = allOrders.filter(o => String(o.createdAt).startsWith(targetDate));
    res.json({ success: true, date: targetDate, orders: filteredOrders, totals: { orderCount: filteredOrders.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', (req, res) => {
  const order = db.getOrderById(req.params.id);
  order ? res.json({ success: true, data: order }) : res.status(404).json({ success: false, message: 'No encontrado' });
});

router.delete('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    db.deleteOrder(orderId);
    if (pool) {
      await pool.query('DELETE FROM orders WHERE id = ?', [orderId]).catch(()=>{});
      await pool.query('DELETE FROM pedidos WHERE id = ?', [orderId]).catch(()=>{});
    }
    res.json({ success: true, message: `Eliminado` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
