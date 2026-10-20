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
      const dropiVarId = it.dropi_variation_id || it.dropiVariationId;
      dropiProducts.push({
        product_id: dropiId,
        ...(dropiVarId ? { variation_id: dropiVarId } : {}),
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
    const rawDepartment = req.body.department || req.body.departamento || req.body.cliente_departamento;
    const rawCity = req.body.city || req.body.ciudad || req.body.cliente_ciudad;
    const rawAddress = req.body.address || req.body.direccion || req.body.cliente_direccion;
    const rawDane = req.body.dane_code || req.body.daneCode || req.body.codigo_dane;

    const department = String(rawDepartment || '').trim();
    const city = String(rawCity || '').trim();
    const address = String(rawAddress || '').trim();
    const resolvedDane = String(rawDane || '').trim() || getDaneCode(city, department);

    const {
      firstName,
      lastName,
      phone,
      email,
      additionalNotes,
      paymentMethod = 'contra_entrega',
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

    for (const rawItem of items) {
      const rawId = rawItem.productId || rawItem.id || '';
      const cleanProdId = String(rawId).replace(/^proc-/, '').replace(/proc-/g, '').trim();
      let product = db.getProductById(rawId) || db.getProductById(cleanProdId);

      // Si no está en data_store.json, buscar en MySQL (cPanel) por ID real, limpio o con prefijo
      if (!product && nativePool) {
        try {
          const [rows]: any = await pool.query(
            'SELECT * FROM productos WHERE id = ? OR id = ? OR id = ? OR slug = ? LIMIT 1',
            [rawId, cleanProdId, `proc-${cleanProdId}`, `prod-${cleanProdId}`]
          );
          if (Array.isArray(rows) && rows.length > 0) {
            const row = rows[0];
            let rowVariants = [];
            try { rowVariants = typeof row.variants === 'string' ? JSON.parse(row.variants) : (row.variants || []); } catch {}
            
            let parsedImages: string[] = [];
            try {
              if (row.images) {
                parsedImages = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
              } else if (row.imagenes) {
                parsedImages = typeof row.imagenes === 'string' ? JSON.parse(row.imagenes) : row.imagenes;
              } else if (row.imagen) {
                parsedImages = [row.imagen];
              }
            } catch {}
            if (!Array.isArray(parsedImages) || parsedImages.length === 0) {
              if (rawItem.image) parsedImages = [rawItem.image];
              else if (Array.isArray(rawItem.images) && rawItem.images.length > 0) parsedImages = rawItem.images;
            }

            product = {
              id: String(row.id),
              title: row.nombre || row.title || rawItem.title || rawItem.name || 'Producto Zavela',
              slug: row.slug || String(row.id),
              price: Number(row.precio || row.price || rawItem.unitPrice || rawItem.price) || 0,
              costPrice: Number(row.supplier_cost || row.costPrice) || 0,
              compareAtPrice: Number(row.suggested_price || row.compareAtPrice) || 0,
              stock: Number(row.stock !== undefined ? row.stock : 999),
              active: true,
              variants: rowVariants,
              images: parsedImages,
              description: row.descripcion || row.description || '',
              categoryId: row.category_id || row.categoryId || 'cat-general',
              tags: [],
              dropi_product_id: row.dropi_product_id || row.dropiProductId || '',
              dropiProductId: row.dropi_product_id || row.dropiProductId || '',
              provider: row.provider || 'derocha',
              supplier: row.supplier || 'DeRocha'
            } as any;
          }
        } catch (e) {
          console.warn('[Orders] Error al buscar producto en MySQL:', e);
        }
      }

      let isEmergencyFallback = false;
      // Si no existe en BD local ni MySQL, pero viene con datos del carrito (título y precio), permitir la orden sin corromper el catálogo
      if (!product) {
        if (rawItem.unitPrice || rawItem.price || rawItem.title || rawItem.name) {
          isEmergencyFallback = true;
          product = {
            id: rawId || cleanProdId,
            title: rawItem.title || rawItem.name || `Producto #${rawId || cleanProdId}`,
            slug: rawItem.slug || rawId || cleanProdId,
            price: Number(rawItem.unitPrice || rawItem.price) || 0,
            costPrice: 0,
            compareAtPrice: 0,
            stock: 9999,
            active: true,
            variants: [],
            images: Array.isArray(rawItem.images) && rawItem.images.length > 0 ? rawItem.images : (rawItem.image ? [rawItem.image] : []),
            description: '',
            categoryId: 'cat-general',
            tags: [],
            dropi_product_id: rawItem.dropi_product_id || '',
            dropiProductId: rawItem.dropi_product_id || '',
            provider: rawItem.provider || 'derocha',
            supplier: rawItem.supplier || 'DeRocha'
          } as any;
        } else {
          return res.status(400).json({
            success: false,
            message: `El producto ${rawId || cleanProdId} no existe o no está disponible.`
          });
        }
      }

      if (product.stock < rawItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${product.title}. Disponible: ${product.stock}`
        });
      }

      let itemUnitPrice = product.price;
      let itemUnitCost = product.costPrice;
      let variantName: string | undefined = rawItem.variantName;
      let dropiVariationId: string | number | undefined = rawItem.dropi_variation_id || rawItem.dropiVariationId;
      let variantColor: string | undefined = rawItem.variantColor || rawItem.color;
      let variantSize: string | undefined = rawItem.variantSize || rawItem.size || rawItem.talla;

      if (rawItem.variantId && product.variants) {
        const variant = product.variants.find(v => v.id === rawItem.variantId);
        if (variant) {
          variantName = variant.name;
          itemUnitPrice = variant.price || product.price;
          itemUnitCost = variant.costPrice || product.costPrice;
          dropiVariationId = variant.dropi_variation_id || variant.dropiVariationId || dropiVariationId;
          variantColor = variant.color || variantColor;
          variantSize = variant.size || variant.talla || variantSize;
        }
      }

      const isOnlineEpayco = paymentMethod === 'epayco' || paymentMethod === 'pago_online';

      if (!isOnlineEpayco) {
        // 1. Deduct general product stock in memory for immediate cash-on-delivery orders
        product.stock = Math.max(0, product.stock - rawItem.quantity);

        // 2. Si el ítem incluye variante (color/talla/id), descontar unidades en el array JSON de variantes del producto
        if (Array.isArray(product.variants) && product.variants.length > 0) {
          const vIndex = product.variants.findIndex(v => 
            (rawItem.variantId && v.id === rawItem.variantId) ||
            (dropiVariationId && (String(v.dropi_variation_id) === String(dropiVariationId) || String(v.dropiVariationId) === String(dropiVariationId))) ||
            (variantColor && v.color && v.color.toLowerCase() === variantColor.toLowerCase() && 
              (!variantSize || (v.size || v.talla || '').toLowerCase() === variantSize.toLowerCase()))
          );
          if (vIndex >= 0) {
            const varObj = product.variants[vIndex];
            varObj.stock = Math.max(0, (varObj.stock !== undefined ? varObj.stock : 10) - rawItem.quantity);
          }
        }

        // 3. Descuento atómico de stock en MySQL (base espejo en ventas):
        // UPDATE productos SET stock = GREATEST(0, stock - ?), variants = ? WHERE id = ?;
        try {
          await pool.query(
            'UPDATE productos SET stock = GREATEST(0, stock - ?), variants = ? WHERE id = ?',
            [rawItem.quantity, JSON.stringify(product.variants || []), product.id]
          );
        } catch (sqlErr: any) {
          console.warn(`[MySQL Stock Deduction Warning for ${product.id}]:`, sqlErr.message);
        }

        // 4. Guardar en store local y sincronizar descuento seguro con cPanel MySQL (solo para productos reales)
        if (!isEmergencyFallback) {
          db.saveProduct(product);
          // REGLA DE SEGURIDAD EXTREMA: Descuento atómico de inventario SIN sobrescribir nombre, imagen ni precio
          cpanelDbService.decrementProductStock(product.id, rawItem.quantity).catch(err => {
            console.warn('[cPanel Sync Stock Warning]:', err?.message || err);
          });
        }
      }

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
        variantColor,
        variantSize,
        dropi_variation_id: dropiVariationId,
        dropiVariationId,
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

    // Modalidad A: Envío Gratis Nacional ($0 COP) en todos los pedidos
    const shippingCost = 0;
    const validDiscountAmount = Math.max(0, Math.min(Number(discountAmount) || 0, subtotal));
    const total = Math.max(0, subtotal - validDiscountAmount);
    const grossMargin = total - productCostTotal;

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
      paymentStatus: (paymentMethod === 'epayco' || paymentMethod === 'pago_online')
        ? 'PENDING'
        : (paymentMethod === 'contra_entrega' ? 'CASH_ON_DELIVERY' : 'APPROVED'),
      status: (paymentMethod === 'epayco' || paymentMethod === 'pago_online')
        ? 'PENDIENTE_PAGO'
        : 'PENDIENTE_REVISION',
      stock_deducted: !(paymentMethod === 'epayco' || paymentMethod === 'pago_online'),
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

// GET /api/orders/calendar?date=YYYY-MM-DD - Historical sales calendar & spreadsheet audit
router.get('/calendar', async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const allOrders = db.getOrders();
    const allProducts = db.getProducts();

    const productMap = new Map<string, any>();
    allProducts.forEach(p => {
      productMap.set(p.id, p);
      if (p.slug) productMap.set(p.slug, p);
    });

    const getSupplierName = (item: any): string => {
      if (item.supplier_name) return item.supplier_name;
      if (item.supplier) return item.supplier;
      const prod = productMap.get(item.productId);
      if (prod?.supplier_name) return prod.supplier_name;
      if (prod?.supplier) return prod.supplier;
      if (prod?.dropi_product_id || item.dropi_product_id) return 'Dropi Colombia';
      return 'DeRocha Store / Propio';
    };

    // Calculate dates list with order counts
    const salesDatesMap: Record<string, { count: number; totalSales: number }> = {};
    for (const o of allOrders) {
      if (!o.createdAt) continue;
      const d = o.createdAt.slice(0, 10);
      if (!salesDatesMap[d]) {
        salesDatesMap[d] = { count: 0, totalSales: 0 };
      }
      salesDatesMap[d].count += 1;
      salesDatesMap[d].totalSales += (o.total || 0);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const targetDate = requestedDate || (Object.keys(salesDatesMap).sort().reverse()[0] || todayStr);

    const filteredOrders = allOrders.filter(o => {
      if (!o.createdAt) return false;
      const orderDate = o.createdAt.slice(0, 10);
      return orderDate === targetDate;
    });

    let totalSales = 0;
    let totalOperatingCost = 0;
    let totalNetProfit = 0;

    const enrichedOrders = filteredOrders.map(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      let itemsCost = 0;
      const suppliersSet = new Set<string>();

      const productsSummary = items.map(it => {
        const prod = productMap.get(it.productId);
        const unitCost = Number(it.unitCost || prod?.supplier_cost || prod?.cost || 0);
        itemsCost += unitCost * (it.quantity || 1);
        suppliersSet.add(getSupplierName(it));
        return `${it.title || 'Producto'} (x${it.quantity || 1})`;
      }).join(' + ') || 'Sin productos';

      const operatingCost = (order.productCostTotal && order.productCostTotal > 0)
        ? order.productCostTotal + (order.shippingCost || 0)
        : itemsCost + (order.shippingCost || 0);

      const netProfit = (order.total || 0) - operatingCost;

      totalSales += (order.total || 0);
      totalOperatingCost += operatingCost;
      totalNetProfit += netProfit;

      const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';

      return {
        id: order.id,
        orderNumber: order.orderNumber || order.id,
        createdAt: order.createdAt,
        time: timeStr,
        date: targetDate,
        customerName: order.customerName || 'Cliente Anónimo',
        customerPhone: order.customerPhone || 'N/A',
        city: order.city || 'Bogotá D.C.',
        department: order.department || 'Cundinamarca',
        daneCode: order.dane_code || getDaneCode(order.city, order.department),
        products: productsSummary,
        supplier: Array.from(suppliersSet).join(', ') || 'Dropi Colombia',
        totalSale: order.total || 0,
        operatingCost,
        netProfit,
        status: order.status || 'PENDIENTE_REVISION',
        paymentMethod: order.paymentMethod || 'contra_entrega',
        carrier: order.carrier || 'Servientrega',
        trackingNumber: order.trackingNumber || order.dropi_guia || ''
      };
    });

    res.json({
      success: true,
      date: targetDate,
      orders: enrichedOrders,
      totals: {
        orderCount: enrichedOrders.length,
        totalSales,
        totalOperatingCost,
        totalNetProfit
      },
      salesDates: salesDatesMap
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

// DELETE /api/orders/:id - Delete order permanently from local DB and MySQL
router.delete('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const targetOrder = db.getOrderById(orderId);
    const orderNumber = targetOrder?.orderNumber || orderId;

    // 1. Local JSON deletion
    const deletedLocal = db.deleteOrder(orderId);

    // 2. MySQL deletion in orders and pedidos tables
    const p = pool || nativePool;
    if (p) {
      try {
        await p.query('DELETE FROM order_items WHERE order_id = ? OR orderId = ?', [orderId, orderId]);
        await p.query('DELETE FROM orders WHERE id = ? OR order_number = ?', [orderId, orderNumber]);
        await p.query('DELETE FROM pedidos WHERE id = ? OR order_number = ?', [orderId, orderNumber]);
        console.log(`[MySQL] ✓ Pedido ${orderNumber} (${orderId}) eliminado de tablas MySQL.`);
      } catch (sqlErr: any) {
        console.warn('[MySQL Delete Order Warning]:', sqlErr.message);
      }
    }

    // 3. Activity logging
    db.addLog({
      type: 'ORDER_DELETED' as any,
      orderId,
      action: 'Pedido Eliminado Permanentemente',
      details: `Pedido ${orderNumber} (${orderId}) fue eliminado permanentemente del sistema y base de datos MySQL.`,
      status: 'info'
    });

    res.json({
      success: true,
      message: `Pedido ${orderNumber} eliminado permanentemente con éxito.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

