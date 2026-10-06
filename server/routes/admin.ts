import { Router } from 'express';
import { db } from '../db.ts';
import { Product, OrderStatus, Category, Customer, Order, SocialMarketingSettings } from '../../src/types/index.ts';
import { GoogleGenAI } from '@google/genai';
import { approveOrderForDropi } from './orders.ts';
import { sendSaleNotification, dispatchWhatsAppAlert } from '../services/whatsappAlerts.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';
import { metaGraphService } from '../services/metaGraphService.ts';

const router = Router();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn('Could not initialize GoogleGenAI:', err);
    }
  }
  return aiClient;
}

// ==========================================
// 1. METRICS & DASHBOARD
// ==========================================
router.get('/metrics', (req, res) => {
  try {
    const metrics = db.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. CATEGORIES CRUD
// ==========================================
router.get('/categories', (req, res) => {
  try {
    const categories = db.getCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/categories', (req, res) => {
  try {
    const saved = db.saveCategory(req.body);
    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Categoría Creada',
      details: `Categoría "${saved.name}" creada exitosamente.`,
      status: 'success'
    });
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/categories/:id', (req, res) => {
  try {
    const saved = db.saveCategory({ ...req.body, id: req.params.id });
    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Categoría Modificada',
      details: `Categoría "${saved.name}" actualizada.`,
      status: 'success'
    });
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/categories/:id', (req, res) => {
  try {
    const deleted = db.deleteCategory(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }
    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Categoría Eliminada',
      details: `Categoría con ID ${req.params.id} eliminada.`,
      status: 'info'
    });
    res.json({ success: true, message: 'Categoría eliminada' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. PRODUCTS CRUD
// ==========================================
router.get('/products', (req, res) => {
  try {
    const products = db.getProducts();
    res.json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const body = req.body;
    const costPrice = Number(body.costPrice) || 0;
    const price = Number(body.price) || 0;
    const marginAmount = price - costPrice;
    const marginPercentage = costPrice > 0 ? (marginAmount / costPrice) * 100 : 0;
    const compareAtPrice = Number(body.compareAtPrice) || (price > 0 ? price + 20000 : 0);
    const discountPercentage = compareAtPrice > price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

    const rawImages = Array.isArray(body.images) ? body.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0) : [];
    const validImages = rawImages.length > 0 ? rawImages : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];

    const newProduct: Product = {
      id: body.id || `prod-${Date.now()}`,
      title: body.title || 'Nuevo Producto',
      slug: body.slug || (body.title ? body.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : `prod-${Date.now()}`),
      description: body.description || '',
      shortDescription: body.shortDescription || '',
      price,
      costPrice,
      compareAtPrice,
      discountPercentage,
      marginAmount,
      marginPercentage: Math.round(marginPercentage * 10) / 10,
      stock: Number(body.stock) || 0,
      active: body.active !== false,
      featured: Boolean(body.featured),
      images: validImages,
      warrantyInfo: body.warrantyInfo || '30 días de garantía oficial Zavela Store por defectos de fábrica.',
      tags: Array.isArray(body.tags) ? body.tags : (body.tags ? String(body.tags).split(',').map(t => t.trim()) : ['tendencia', 'calidad']),
      weightKg: Number(body.weightKg) || 0.5,
      categoryId: body.categoryId || db.getCategories()[0]?.id,
      categoryName: db.getCategories().find(c => c.id === body.categoryId)?.name || db.getCategories()[0]?.name,
      warehouseCity: body.warehouseCity || 'Bogotá D.C.',
      brand: body.brand || 'Zavela Store',
      dropi_product_id: body.dropi_product_id !== undefined ? body.dropi_product_id : (body.dropiProductId !== undefined ? body.dropiProductId : ''),
      variants: Array.isArray(body.variants) ? body.variants : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveProduct(newProduct);

    // Sincronizar producto con la base de datos MySQL en cPanel vía POST /api.php?action=productos
    cpanelDbService.saveProduct(saved).catch(err => {
      console.warn('[cPanel DB Sync] Error al guardar producto en cPanel:', err);
    });

    // Auto-broadcast a redes sociales y publicación directa en Facebook Meta Graph API v26.0
    let socialPost = null;
    let facebookSync = null;

    if (body.publishToSocial !== false) {
      socialPost = db.autoBroadcastProduct(saved);
    }

    const fbConfig = metaGraphService.getFacebookConfig();
    const shouldPublishToFb = body.publishToFacebook === true || 
      (body.publishToFacebook !== false && fbConfig.connected && fbConfig.autoPostEnabled);

    if (shouldPublishToFb) {
      try {
        console.log(`[Facebook Auto-Post v26.0] Publicando "${saved.title}" en Facebook Page...`);
        facebookSync = await metaGraphService.publishProductToFacebook(saved);
      } catch (fbErr: any) {
        console.error('[Facebook Auto-Post Error]:', fbErr);
        facebookSync = {
          success: false,
          message: `Fallo al publicar en Facebook: ${fbErr.message}`
        };
      }
    }

    db.addLog({
      type: 'PRODUCT_UPDATE',
      action: 'Producto Creado',
      details: `Producto creado: "${saved.title}" con stock de ${saved.stock} unidades.${facebookSync?.success ? ` Publicado automáticamente en Facebook Page (ID ${facebookSync.postId}).` : ''}`,
      status: 'success'
    });

    res.status(201).json({ success: true, data: saved, socialPost, facebookSync });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const body = req.body;
    let existing = db.getProductById(productId);

    if (!existing) {
      // Look up by slug or ID match fallback
      const all = db.getProducts();
      existing = all.find(p => p.id === productId || p.slug === productId || p.slug === body.slug);
    }

    const costPrice = body.costPrice !== undefined ? Number(body.costPrice) : (existing?.costPrice || 0);
    const price = body.price !== undefined ? Number(body.price) : (existing?.price || 0);
    const marginAmount = price - costPrice;
    const marginPercentage = costPrice > 0 ? (marginAmount / costPrice) * 100 : 0;
    const compareAtPrice = body.compareAtPrice !== undefined ? Number(body.compareAtPrice) : (existing?.compareAtPrice || 0);
    const discountPercentage = (compareAtPrice && compareAtPrice > price) 
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) 
      : 0;

    let finalImages = existing?.images || [];
    if (Array.isArray(body.images)) {
      const filtered = body.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
      if (filtered.length > 0) {
        finalImages = filtered;
      }
    }

    const updated: Product = {
      id: productId,
      title: body.title || existing?.title || 'Producto',
      slug: body.slug || existing?.slug || productId,
      description: body.description !== undefined ? body.description : (existing?.description || ''),
      shortDescription: body.shortDescription !== undefined ? body.shortDescription : (existing?.shortDescription || ''),
      price,
      costPrice,
      compareAtPrice,
      discountPercentage,
      marginAmount,
      marginPercentage: Math.round(marginPercentage * 10) / 10,
      stock: body.stock !== undefined ? Number(body.stock) : (existing?.stock ?? 10),
      active: body.active !== undefined ? Boolean(body.active) : (existing?.active ?? true),
      featured: body.featured !== undefined ? Boolean(body.featured) : (existing?.featured ?? false),
      images: finalImages.length > 0 ? finalImages : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'],
      warrantyInfo: body.warrantyInfo || existing?.warrantyInfo || '30 días de garantía oficial Zavela Store.',
      tags: Array.isArray(body.tags) ? body.tags : (existing?.tags || ['tendencia']),
      weightKg: body.weightKg !== undefined ? Number(body.weightKg) : (existing?.weightKg || 0.5),
      categoryId: body.categoryId || existing?.categoryId || db.getCategories()[0]?.id,
      categoryName: db.getCategories().find(c => c.id === (body.categoryId || existing?.categoryId))?.name || existing?.categoryName || 'General',
      warehouseCity: body.warehouseCity || existing?.warehouseCity || 'Bogotá D.C.',
      brand: body.brand || existing?.brand || 'Zavela Store',
      dropi_product_id: body.dropi_product_id !== undefined ? body.dropi_product_id : (body.dropiProductId !== undefined ? body.dropiProductId : existing?.dropi_product_id),
      variants: Array.isArray(body.variants) ? body.variants : (existing?.variants || []),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveProduct(updated);

    // Sincronizar actualización de producto con la base de datos MySQL en cPanel vía POST /api.php?action=productos
    cpanelDbService.saveProduct(saved).catch(err => {
      console.warn('[cPanel DB Sync] Error al actualizar producto en cPanel:', err);
    });

    let socialPost = null;
    let facebookSync = null;

    if (body.publishToSocial === true) {
      socialPost = db.publishSocialPost({ productId: saved.id });
    }

    const fbConfig = metaGraphService.getFacebookConfig();
    const shouldPublishToFb = body.publishToFacebook === true || 
      (body.publishToFacebook !== false && body.publishToFacebook !== 'false' && fbConfig.connected && fbConfig.autoPostEnabled);

    if (shouldPublishToFb) {
      try {
        console.log(`[Facebook Sync v26.0] Publicando actualización de "${saved.title}" en Facebook Page...`);
        facebookSync = await metaGraphService.publishProductToFacebook(saved);
      } catch (fbErr: any) {
        console.error('[Facebook Sync Error]:', fbErr);
        facebookSync = {
          success: false,
          message: `Fallo al publicar en Facebook: ${fbErr.message}`
        };
      }
    }

    db.addLog({
      type: 'PRODUCT_UPDATE',
      action: 'Producto Actualizado',
      details: `Producto actualizado: "${saved.title}" - Precio: $${saved.price.toLocaleString()} COP.${socialPost ? ' Republicado en redes sociales.' : ''}${facebookSync?.success ? ` Publicado en Facebook Page (ID ${facebookSync.postId}).` : ''}`,
      status: 'success'
    });

    res.json({ success: true, data: saved, socialPost, facebookSync });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/products/:id', (req, res) => {
  try {
    const deleted = db.deleteProduct(req.params.id);
    cpanelDbService.deleteProduct(req.params.id).catch(err => {
      console.warn('[cPanel Product Delete Sync Warning]:', err.message);
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    db.addLog({
      type: 'PRODUCT_UPDATE',
      action: 'Producto Eliminado',
      details: `Producto con ID ${req.params.id} fue eliminado del inventario (sincronizado con cPanel MySQL).`,
      status: 'info'
    });

    res.json({ success: true, message: 'Producto eliminado correctamente.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/products/bulk-delete', (req, res) => {
  try {
    const { ids, softDelete } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere una lista de IDs de productos' });
    }

    // Sincronizar en cPanel MySQL
    if (softDelete) {
      cpanelDbService.batchUpdateProductStatus(ids, false).catch(err => console.warn('[cPanel Batch Soft Delete]:', err));
    } else {
      cpanelDbService.batchDeleteProducts(ids).catch(err => console.warn('[cPanel Batch Delete]:', err));
    }

    let count = 0;
    for (const id of ids) {
      if (softDelete) {
        const prod = db.getProductById(id);
        if (prod) {
          db.saveProduct({ ...prod, active: false });
          count++;
        }
      } else {
        const ok = db.deleteProduct(id);
        if (ok) count++;
      }
    }

    db.addLog({
      type: 'PRODUCT_UPDATE',
      action: softDelete ? 'Productos Pausados en Lote' : 'Productos Eliminados en Lote',
      details: `${count} productos fueron ${softDelete ? 'ocultados de la tienda' : 'eliminados permanentemente'}.`,
      status: 'info'
    });

    res.json({ success: true, count, message: `${count} productos procesados con éxito.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/products/sync-all - Replace all products in data_store with provided array (e.g. from Firestore)
router.post('/products/sync-all', (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ success: false, message: 'Se requiere un array de productos' });
    }
    const updated = db.setProducts(products);
    res.json({ success: true, count: updated.length, message: 'Catálogo sincronizado exitosamente.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. ORDERS CRUD
// ==========================================
router.get('/orders', async (req, res) => {
  try {
    const { status, search } = req.query;

    // 1. Intento de sincronización de pedidos con la API PHP de cPanel (MySQL)
    const remoteOrders = await cpanelDbService.fetchOrders();
    if (remoteOrders && remoteOrders.length > 0) {
      db.mergeRemoteOrders(remoteOrders);
    }

    // 2. Consulta y filtrado de pedidos con fallback transparente a la base de datos local
    const orders = db.getOrders({
      status: status as OrderStatus,
      search: search as string
    });
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orders - Create Manual Order
router.post('/orders', (req, res) => {
  try {
    const body = req.body;
    const orderNumber = `ZV-${Math.floor(1000 + Math.random() * 9000)}`;
    const subtotal = Number(body.subtotal) || 0;
    const shippingCost = Number(body.shippingCost) || 0;
    const total = subtotal + shippingCost;
    const productCostTotal = Number(body.productCostTotal) || Math.round(subtotal * 0.45);
    const grossMargin = total - productCostTotal;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerName: body.customerName || 'Cliente Manual',
      customerPhone: body.customerPhone || '3000000000',
      customerEmail: body.customerEmail || 'cliente@zavelastore.com',
      department: body.department || 'Bogotá D.C.',
      city: body.city || 'Bogotá D.C.',
      address: body.address || 'Dirección de entrega',
      additionalNotes: body.additionalNotes || 'Pedido manual registrado desde panel de control',
      subtotal,
      shippingCost,
      total,
      productCostTotal,
      grossMargin,
      paymentMethod: body.paymentMethod || 'contra_entrega',
      paymentStatus: body.paymentStatus || 'CASH_ON_DELIVERY',
      status: body.status || 'pendiente',
      carrier: body.carrier || 'Servientrega',
      trackingNumber: body.trackingNumber || '',
      guideUrl: body.guideUrl || '',
      items: Array.isArray(body.items) && body.items.length > 0 ? body.items : [
        {
          id: `item-${Date.now()}`,
          orderId: `ord-${Date.now()}`,
          productId: 'prod-101',
          title: 'Producto Manual',
          quantity: 1,
          unitPrice: subtotal,
          unitCost: productCostTotal,
          subtotal
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveOrder(newOrder);

    db.addLog({
      type: 'ORDER_CREATED',
      orderId: saved.id,
      action: 'Pedido Manual Creado',
      details: `Pedido ${saved.orderNumber} registrado por $${saved.total.toLocaleString()} COP para ${saved.customerName}.`,
      status: 'success'
    });

    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/orders/:id', (req, res) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    const { status, trackingNumber, carrier, guideUrl } = req.body;
    const prevStatus = order.status;

    const updated = db.saveOrder({
      ...order,
      ...req.body,
      id: order.id,
      shippedAt: status === 'enviado' && !order.shippedAt ? new Date().toISOString() : order.shippedAt,
      deliveredAt: status === 'entregado' && !order.deliveredAt ? new Date().toISOString() : order.deliveredAt,
      updatedAt: new Date().toISOString()
    });

    db.addLog({
      type: 'STATUS_UPDATE',
      orderId: order.id,
      action: 'Estado de Pedido Modificado',
      details: `Pedido ${order.orderNumber} actualizado de "${prevStatus}" a "${updated.status}". ${trackingNumber ? `Guía: ${trackingNumber} (${carrier || 'Transportadora'})` : ''}`,
      status: 'success'
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orders/:id/approve or /api/admin/orders/approve - Approve order for Dropi
router.post('/orders/:id/approve', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { carrier, customer, items, dane_code } = req.body;
    const result = await approveOrderForDropi(orderId, {
      carrier,
      customer,
      items,
      dane_code
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al aprobar orden para Dropi',
      error_message: error.message
    });
  }
});

router.post('/orders/approve', async (req, res) => {
  try {
    const { orderId, id, carrier, customer, items, dane_code } = req.body;
    const targetId = orderId || id;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'ID de orden requerido' });
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
      message: error.message || 'Error al aprobar orden para Dropi',
      error_message: error.message
    });
  }
});

router.delete('/orders/:id', (req, res) => {
  try {
    const deleted = db.deleteOrder(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    db.addLog({
      type: 'ORDER_CREATED',
      action: 'Pedido Eliminado',
      details: `Pedido con ID ${req.params.id} fue eliminado.`,
      status: 'info'
    });

    res.json({ success: true, message: 'Pedido eliminado correctamente.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/cpanel-status - Diagnóstico y verificación de conexión con la API PHP / MySQL en cPanel
router.get('/cpanel-status', async (req, res) => {
  const apiUrl = cpanelDbService.getApiUrl();
  const endpoint = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=productos`;
  
  try {
    const start = Date.now();
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    const durationMs = Date.now() - start;
    const isOk = response.ok;
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {}

    res.json({
      success: true,
      configuredUrl: apiUrl,
      testEndpoint: endpoint,
      httpStatus: response.status,
      latencyMs: durationMs,
      connected: isOk,
      fallbackActive: !isOk,
      message: isOk
        ? '✅ Conexión exitosa con la API PHP y base de datos MySQL en cPanel.'
        : `⚠️ cPanel respondió HTTP ${response.status}. El fallback transparente en memoria está activo.`,
      preview: parsed ? { itemsCount: Array.isArray(parsed) ? parsed.length : (Array.isArray(parsed?.data) ? parsed.data.length : 1) } : text.substring(0, 150)
    });
  } catch (err: any) {
    res.json({
      success: true,
      configuredUrl: apiUrl,
      testEndpoint: endpoint,
      connected: false,
      fallbackActive: true,
      message: `ℹ️ Fallback activo: No se pudo conectar con cPanel (${err?.message || err}). La tienda opera 100% estable en memoria local.`,
      error: err?.message || 'Error de red / Timeout'
    });
  }
});

// ==========================================
// 5. CUSTOMERS CRUD
// ==========================================
router.get('/customers', async (req, res) => {
  try {
    // 1. Intento de sincronización con la API de clientes en cPanel (MySQL)
    const remoteCustomers = await cpanelDbService.fetchCustomers();
    const localCustomers = db.getCustomers();

    if (remoteCustomers && remoteCustomers.length > 0) {
      // Fusionar clientes de cPanel respetando duplicados por email o teléfono
      const merged = [...localCustomers];
      for (const rc of remoteCustomers) {
        const cleanRcEmail = (rc.email || '').trim().toLowerCase();
        const cleanRcPhone = (rc.phone || rc.telefono || '').replace(/\D/g, '');
        const exists = merged.some(m => 
          (cleanRcEmail && m.email?.trim().toLowerCase() === cleanRcEmail) ||
          (cleanRcPhone && m.phone?.replace(/\D/g, '') === cleanRcPhone)
        );

        if (!exists) {
          merged.push({
            id: rc.id,
            firstName: rc.firstName || rc.nombre || rc.name || 'Cliente',
            lastName: rc.lastName || '',
            email: rc.email || '',
            phone: rc.phone || rc.telefono || '',
            address: rc.address || rc.direccion || '',
            city: rc.city || rc.ciudad || 'Bogotá D.C.',
            department: rc.department || rc.departamento || 'Cundinamarca',
            notes: 'Registrado vía cPanel MySQL',
            totalOrders: 0,
            totalSpent: 0,
            createdAt: rc.createdAt || rc.created_at || new Date().toISOString()
          });
        }
      }
      return res.json({ success: true, count: merged.length, data: merged });
    }

    res.json({ success: true, count: localCustomers.length, data: localCustomers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/cpanel-customers', async (req, res) => {
  try {
    const list = await cpanelDbService.fetchCustomers();
    res.json({ success: true, count: list?.length || 0, data: list || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/customers', (req, res) => {
  try {
    const saved = db.saveCustomer(req.body);

    // Sincronización transparente con cPanel MySQL
    cpanelDbService.createCustomer({
      name: `${saved.firstName} ${saved.lastName || ''}`.trim(),
      nombre: `${saved.firstName} ${saved.lastName || ''}`.trim(),
      email: saved.email || '',
      phone: saved.phone || '',
      telefono: saved.phone || '',
      address: saved.address || '',
      direccion: saved.address || '',
      city: saved.city || '',
      ciudad: saved.city || '',
      department: saved.department || '',
      departamento: saved.department || ''
    }).catch(err => {
      console.warn('[cPanel Customer Sync Warning]:', err);
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Cliente Creado',
      details: `Cliente ${saved.firstName} ${saved.lastName} registrado en el sistema.`,
      status: 'success'
    });
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/customers/:id', (req, res) => {
  try {
    const saved = db.saveCustomer({ ...req.body, id: req.params.id });
    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Cliente Actualizado',
      details: `Datos del cliente ${saved.firstName} ${saved.lastName} modificados.`,
      status: 'success'
    });
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/customers/:id', (req, res) => {
  try {
    const deleted = db.deleteCustomer(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Cliente Eliminado',
      details: `Registro de cliente ${req.params.id} eliminado.`,
      status: 'info'
    });
    res.json({ success: true, message: 'Cliente eliminado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 6. SETTINGS & CMS
// ==========================================
router.get('/settings', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/settings', (req, res) => {
  try {
    const incoming = req.body?.settings || req.body;
    const updated = db.saveSettings(incoming);
    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Ajustes de Tienda Actualizados',
      details: `Configuraciones globales y número de WhatsApp actualizados correctamente.`,
      status: 'success'
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 6.0 SEGURIDAD: CAMBIO DE CONTRASEÑA DE USUARIOS (ADMIN / ASESORES)
// ==========================================
router.post('/security/password', (req, res) => {
  try {
    const newPassword = req.body?.newPassword || req.body?.adminPassword || req.body?.password;
    const targetUserId = req.body?.targetUserId || 'admin-master';
    const targetUserType = req.body?.targetUserType || 'admin';
    const targetUserName = req.body?.targetUserName || 'Administrador';

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'La nueva contraseña debe tener al menos 4 caracteres.' 
      });
    }

    const cleanPass = newPassword.trim();

    if (targetUserType === 'advisor' || (targetUserId && targetUserId.startsWith('AS-'))) {
      const advisorId = targetUserId.startsWith('advisor-') ? targetUserId.replace('advisor-', '') : targetUserId;
      const adv = db.getAdvisorById(advisorId);
      if (!adv) {
        return res.status(404).json({ success: false, message: `No se encontró el asesor con ID ${advisorId}` });
      }

      const updatedAdv = db.saveAdvisor({ ...adv, password: cleanPass });
      db.addLog({
        type: 'SETTINGS_UPDATE',
        action: 'Contraseña de Asesor Actualizada',
        details: `Se cambió la contraseña del asesor "${updatedAdv.name}" (${updatedAdv.id}). Usuario de acceso: ${updatedAdv.username || updatedAdv.id}.`,
        status: 'success'
      });

      return res.json({ 
        success: true, 
        message: `Contraseña de "${updatedAdv.name}" actualizada correctamente.`,
        data: { success: true, targetUserId: updatedAdv.id, updatedAt: new Date().toISOString() }
      });
    }

    // Default: Master Admin
    const updated = db.saveSettings({ adminPassword: cleanPass });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Clave de Administrador Master Actualizada',
      details: 'La clave maestra de acceso al panel fue actualizada exitosamente por el administrador.',
      status: 'success'
    });

    res.json({ 
      success: true, 
      message: 'Contraseña del Administrador Master actualizada correctamente.',
      data: { success: true, targetUserId: 'admin-master', updatedAt: new Date().toISOString() }
    });
  } catch (error: any) {
    console.error('Error al actualizar contraseña:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al actualizar contraseña' });
  }
});

// ==========================================
// 6.1 MANTENIMIENTO Y PRUEBAS PRIVADAS
// ==========================================
router.post('/maintenance/toggle', (req, res) => {
  try {
    const currentSettings = db.getSettings();
    const explicitState = req.body?.active !== undefined ? Boolean(req.body.active) : !Boolean(currentSettings.maintenanceMode);
    
    const updated = db.saveSettings({
      maintenanceMode: explicitState
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: explicitState ? 'Modo Mantenimiento ACTIVADO' : 'Modo Mantenimiento DESACTIVADO (Tienda Abierta)',
      details: explicitState 
        ? 'La tienda pública está cerrada para clientes. Solo accesible mediante sesión admin o enlace con token de bypass.'
        : 'La tienda pública ha sido abierta exitosamente al público general.',
      status: explicitState ? 'info' : 'success'
    });

    res.json({ 
      success: true, 
      maintenanceMode: updated.maintenanceMode,
      message: explicitState ? 'Modo Mantenimiento activado' : 'Tienda abierta al público con éxito'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Registro de visitantes interesados para ser notificados al reabrir la tienda
router.post('/maintenance/notify-lead', (req, res) => {
  try {
    const { contact, type = 'email', name } = req.body;
    if (!contact || typeof contact !== 'string' || !contact.trim()) {
      return res.status(400).json({ success: false, message: 'Por favor ingresa un correo o WhatsApp válido.' });
    }

    const currentSettings = db.getSettings();
    const leads = Array.isArray(currentSettings.maintenanceNotifyLeads) ? [...currentSettings.maintenanceNotifyLeads] : [];

    // Evitar duplicados
    const normalized = contact.trim().toLowerCase();
    const exists = leads.some(l => l.contact.trim().toLowerCase() === normalized);
    
    if (!exists) {
      leads.unshift({
        id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        contact: contact.trim(),
        type: type === 'whatsapp' ? 'whatsapp' : 'email',
        name: name ? String(name).trim() : undefined,
        createdAt: new Date().toISOString()
      });

      db.saveSettings({
        maintenanceNotifyLeads: leads
      });

      db.addLog({
        type: 'SYSTEM',
        action: 'Interesado Registrado en Mantenimiento',
        details: `Nuevo cliente interesado en reapertura (${type}): ${contact.trim()}`,
        status: 'info'
      });
    }

    res.json({ 
      success: true, 
      message: '¡Excelente! Te notificaremos de inmediato apenas abramos las puertas con ofertas exclusivas.' 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generador de Token de Bypass Seguro
router.post('/maintenance/generate-token', (req, res) => {
  try {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newToken = `zavela_test_${randomSuffix}`;
    
    const updated = db.saveSettings({
      maintenanceBypassToken: newToken
    });

    res.json({ 
      success: true, 
      token: newToken,
      message: 'Nuevo token de bypass privado generado con éxito' 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 7. LOGS & DIAGNOSTICS
// ==========================================
router.get('/logs', (req, res) => {
  try {
    const logs = db.getLogs(Number(req.query.limit) || 100);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/logs', (req, res) => {
  try {
    db.clearLogs();
    res.json({ success: true, message: 'Registros de actividad limpiados' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orders/clear-all - Delete all orders
router.post('/orders/clear-all', (req, res) => {
  try {
    db.clearAllOrders();
    db.addLog({
      type: 'STATUS_UPDATE',
      action: 'Ventas Reiniciadas',
      details: 'Se eliminaron todas las ventas, pedidos y simulaciones del sistema.',
      status: 'info'
    });
    res.json({ success: true, message: 'Todas las ventas y simulaciones han sido borradas correctamente.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/clean-tests - Clear test orders, simulated sales, and test customers
router.post('/clean-tests', (req, res) => {
  try {
    const result = db.cleanTestRecords();
    db.addLog({
      type: 'STATUS_UPDATE',
      action: 'Limpieza de Pruebas Internas',
      details: `Se borraron ${result.deletedOrders} ventas de prueba y ${result.deletedCustomers} clientes simulados. La tienda quedó lista y limpia para producción.`,
      status: 'info'
    });
    res.json({
      success: true,
      message: `Pruebas internas y simulaciones borradas con éxito (${result.deletedOrders} pedidos y ${result.deletedCustomers} clientes removidos).`,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/customers/clear-all - Delete all test customers
router.post('/customers/clear-all', (req, res) => {
  try {
    db.clearAllCustomers();
    res.json({ success: true, message: 'Todos los clientes de prueba han sido eliminados correctamente.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orders/simulate - Configurable simulation with carrier costs and Dropi fees
router.post('/orders/simulate', async (req, res) => {
  try {
    const { 
      countPerProduct = 3, 
      carrierCost = 16500, 
      dropiFeePercent = 5, 
      dropiFixedFee = 0,
      selectedProductIds 
    } = req.body || {};

    const orders = db.simulateOrders({
      countPerProduct: Number(countPerProduct) || 3,
      carrierCost: Number(carrierCost) || 16500,
      dropiFeePercent: Number(dropiFeePercent) || 5,
      dropiFixedFee: Number(dropiFixedFee) || 0,
      selectedProductIds
    });

    const metrics = db.getMetrics();
    
    // Despacho de alerta agrupada o individual a WhatsApp (+573008784427)
    const firstOrder = orders[0];
    const topProd = firstOrder?.items?.[0]?.title || 'Taladro 2421 Dewalt Con Herramientas';
    const waReportText = `🚨 ¡REPORTE DE VENTAS - ZAVELA STORE!
Se acaban de registrar ${orders.length} nuevas ventas.
• Nuevos ingresos: COP ${(metrics.todaySales || metrics.totalSales || 870000).toLocaleString()}
• Acumulado del día: COP ${(metrics.totalSales || 11736000).toLocaleString()} (${db.getOrders().length} pedidos)
• Producto destacado: ${topProd}
• Modalidad predominante: Pago Contra Entrega (88%)
👉 Revisa el panel para aprobar despachos y generar guías.`;

    let whatsappAlert: any = null;
    try {
      whatsappAlert = await dispatchWhatsAppAlert({
        type: 'DAILY_SUMMARY',
        title: '🚨 Reporte de Ventas Simuladas Zavela Store',
        message: waReportText,
        details: { count: orders.length, sales: metrics.totalSales }
      });
    } catch (e) {
      console.warn('Could not dispatch simulation whatsapp alert:', e);
    }

    db.addLog({
      type: 'ORDER_CREATED',
      action: `Simulación de ${countPerProduct} Ventas por Producto`,
      details: `Se generaron ${orders.length} pedidos simulados (${countPerProduct} por producto). Total Ventas: $${metrics.totalSales.toLocaleString()} COP | Fletes Transportadora: $${(metrics.totalCarrierCosts || 0).toLocaleString()} COP | Tarifas Dropi: $${(metrics.totalDropiFees || 0).toLocaleString()} COP | Ganancia Neta Real: $${(metrics.totalNetProfit || 0).toLocaleString()} COP. Alerta enviada a WhatsApp (+57 300 878 4427).`,
      status: 'success'
    });

    res.json({
      success: true,
      message: `¡Simulación exitosa! Se generaron ${orders.length} pedidos (${countPerProduct} por producto) con costos operativos y comisiones Dropi calculadas.`,
      whatsappAlert,
      data: {
        ordersCount: orders.length,
        totalSales: metrics.totalSales,
        totalProductCosts: metrics.totalProductCosts,
        totalCarrierCosts: metrics.totalCarrierCosts,
        totalDropiFees: metrics.totalDropiFees,
        totalGrossProfit: metrics.totalGrossProfit,
        totalNetProfit: metrics.totalNetProfit,
        todaySales: metrics.todaySales,
        monthSales: metrics.monthSales,
        orders: orders.slice(0, 10)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/orders/simulate-3-per-product - Simulate 3 orders per product (Backward compatible)
router.post('/orders/simulate-3-per-product', async (req, res) => {
  try {
    const orders = db.simulateOrders({ countPerProduct: 3, carrierCost: 16500, dropiFeePercent: 5 });
    const metrics = db.getMetrics();

    // Despacho de alerta a WhatsApp (+573008784427)
    const firstOrder = orders[0];
    const topProd = firstOrder?.items?.[0]?.title || 'Taladro 2421 Dewalt Con Herramientas';
    const waReportText = `🚨 ¡REPORTE DE VENTAS - ZAVELA STORE!
Se acaban de registrar ${orders.length} nuevas ventas.
• Nuevos ingresos: COP ${(metrics.todaySales || metrics.totalSales || 870000).toLocaleString()}
• Acumulado del día: COP ${(metrics.totalSales || 11736000).toLocaleString()} (${db.getOrders().length} pedidos)
• Producto destacado: ${topProd}
• Modalidad predominante: Pago Contra Entrega (88%)
👉 Revisa el panel para aprobar despachos y generar guías.`;

    let whatsappAlert: any = null;
    try {
      whatsappAlert = await dispatchWhatsAppAlert({
        type: 'DAILY_SUMMARY',
        title: '🚨 Reporte de Ventas Simuladas Zavela Store',
        message: waReportText,
        details: { count: orders.length, sales: metrics.totalSales }
      });
    } catch (e) {
      console.warn('Could not dispatch simulation whatsapp alert:', e);
    }

    db.addLog({
      type: 'ORDER_CREATED',
      action: 'Simulación de 3 Ventas por Producto',
      details: `Se generaron ${orders.length} pedidos simulados (3 por cada producto) con un total en ventas de $${metrics.totalSales.toLocaleString()} COP y ganancia neta estimada de $${(metrics.totalNetProfit || metrics.totalGrossProfit).toLocaleString()} COP. Alerta WhatsApp despachada a +57 300 878 4427.`,
      status: 'success'
    });
    res.json({
      success: true,
      message: `Se simularon 3 ventas para cada producto (${orders.length} pedidos en total).`,
      whatsappAlert,
      data: {
        ordersCount: orders.length,
        totalSales: metrics.totalSales,
        totalGrossProfit: metrics.totalGrossProfit,
        totalNetProfit: metrics.totalNetProfit,
        totalCarrierCosts: metrics.totalCarrierCosts,
        totalDropiFees: metrics.totalDropiFees,
        todaySales: metrics.todaySales,
        monthSales: metrics.monthSales
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/simulate-order - Simulate test COD order
router.post('/simulate-order', async (req, res) => {
  try {
    const mockCustomers = [
      { name: 'Diana Marcela Torres', phone: '3128475920', city: 'Bucaramanga', dept: 'Santander', addr: 'Carrera 27 # 45 - 19, Cabecera' },
      { name: 'Mateo Alejandro Orozco', phone: '3187261944', city: 'Pereira', dept: 'Risaralda', addr: 'Avenida Circunvalar # 12 - 30' },
      { name: 'Camila Andrea Vargas', phone: '3169482103', city: 'Barranquilla', dept: 'Atlántico', addr: 'Calle 82 # 51B - 40, Alto Prado' }
    ];
    const pick = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
    const products = db.getProducts({ onlyActive: true });
    const prod = products[Math.floor(Math.random() * products.length)] || products[0];

    const orderNumber = `ZV-${Math.floor(2000 + Math.random() * 8000)}`;
    const quantity = 1;
    const subtotal = prod.price * quantity;
    const shippingCost = subtotal >= (db.getSettings().freeShippingThreshold || 120000) ? 0 : 12000;
    const total = subtotal + shippingCost;
    const productCostTotal = (prod.costPrice || prod.price * 0.45) * quantity;
    const grossMargin = total - productCostTotal;

    const simulatedOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerName: pick.name,
      customerPhone: pick.phone,
      customerEmail: `${pick.name.toLowerCase().replace(/[^a-z]/g, '.')}@gmail.com`,
      department: pick.dept,
      city: pick.city,
      address: pick.addr,
      additionalNotes: 'Simulación de pedido contra entrega desde panel administrativo',
      subtotal,
      shippingCost,
      total,
      productCostTotal,
      grossMargin,
      paymentMethod: 'contra_entrega',
      paymentStatus: 'CASH_ON_DELIVERY',
      status: 'pendiente',
      carrier: 'Servientrega',
      items: [
        {
          id: `item-${Date.now()}`,
          orderId: `ord-${Date.now()}`,
          productId: prod.id,
          title: prod.title,
          quantity,
          unitPrice: prod.price,
          unitCost: prod.costPrice || 0,
          subtotal,
          image: prod.images[0]
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveOrder(simulatedOrder);

    // Despacho de alerta automática a WhatsApp (+573008784427)
    let whatsappAlert: any = null;
    try {
      whatsappAlert = await sendSaleNotification(saved);
    } catch (waErr) {
      console.warn('Could not dispatch whatsapp alert for simulated order:', waErr);
    }

    db.addLog({
      type: 'ORDER_CREATED',
      orderId: saved.id,
      action: 'Simulación de Pedido Generada',
      details: `Pedido de prueba ${saved.orderNumber} simulado exitosamente por $${saved.total.toLocaleString()} COP. Alerta WhatsApp despachada a +57 300 878 4427.`,
      status: 'success'
    });

    res.status(201).json({ success: true, data: saved, whatsappAlert });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 8. ADVISORS & DROPI BAG (Sergio Martínez Profile)
// ==========================================
router.post('/advisors/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
    }

    const advisor = db.authenticateAdvisor(username, password);
    if (!advisor) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas o asesor inactivo. Contacta a Sergio Martínez.' });
    }

    db.addLog({
      type: 'STATUS_UPDATE',
      action: 'Inicio de Sesión de Asesor',
      details: `El asesor ${advisor.name} (${advisor.id}) inició sesión en el portal.`,
      status: 'success'
    });

    res.json({
      success: true,
      message: `¡Bienvenido ${advisor.name}!`,
      data: advisor
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/advisors', async (req, res) => {
  try {
    const remote = await cpanelDbService.fetchAdvisors();
    let advisors = db.getAdvisors();

    if (remote && remote.length > 0) {
      const merged = [...advisors];
      for (const r of remote) {
        const cleanPhone = (r.phone || r.telefono || '').replace(/\D/g, '');
        const exists = merged.find(m => m.id === r.id || (cleanPhone && m.phone?.replace(/\D/g, '') === cleanPhone));
        if (!exists) {
          merged.push({
            id: r.id,
            name: r.name || r.nombre || 'Asesor',
            username: `asesor_${r.id.toLowerCase()}`,
            password: 'demo',
            role: r.role?.toLowerCase().includes('admin') ? 'admin' : 'advisor',
            status: r.status || (r.activo ? 'active' : 'inactive'),
            phone: r.phone || r.telefono || '',
            channel: 'WhatsApp Directo',
            sellerCode: r.id.substring(0, 8).toUpperCase(),
            commissionRate: 0.10,
            settlementStatus: 'al_dia',
            createdAt: r.created_at || r.createdAt || new Date().toISOString()
          });
        } else {
          // Actualizar datos desde cPanel si cambiaron
          exists.name = r.name || r.nombre || exists.name;
          exists.phone = r.phone || r.telefono || exists.phone;
          exists.status = r.status || (r.activo ? 'active' : 'inactive');
        }
      }
      advisors = merged;
    }

    const performance = db.getAdvisorsPerformance();
    res.json({ success: true, data: { advisors, performance } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/cpanel-advisors', async (req, res) => {
  try {
    const list = await cpanelDbService.fetchAdvisors();
    res.json({ success: true, count: list?.length || 0, data: list || [] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/advisors', (req, res) => {
  try {
    const saved = db.saveAdvisor(req.body);

    // Sincronización transparente con MySQL cPanel (POST action=asesores)
    cpanelDbService.saveAdvisor({
      id: saved.id,
      nombre: saved.name,
      name: saved.name,
      telefono: saved.phone,
      whatsapp: saved.phone,
      phone: saved.phone,
      rol: saved.role === 'admin' ? 'Administrador' : 'Asesor de Ventas',
      role: saved.role === 'admin' ? 'Administrador' : 'Asesor de Ventas',
      activo: saved.status === 'active' ? 1 : 0
    }).catch(err => {
      console.warn('[cPanel Advisor Sync Warning]:', err);
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Subperfil de Asesor Creado',
      details: `Asesor "${saved.name}" (${saved.id}) registrado con canal ${saved.channel}.`,
      status: 'success'
    });
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/advisors/:id', (req, res) => {
  try {
    const saved = db.saveAdvisor({ ...req.body, id: req.params.id });

    // Sincronización transparente con MySQL cPanel (POST action=asesores)
    cpanelDbService.saveAdvisor({
      id: saved.id,
      nombre: saved.name,
      name: saved.name,
      telefono: saved.phone,
      whatsapp: saved.phone,
      phone: saved.phone,
      rol: saved.role === 'admin' ? 'Administrador' : 'Asesor de Ventas',
      role: saved.role === 'admin' ? 'Administrador' : 'Asesor de Ventas',
      activo: saved.status === 'active' ? 1 : 0
    }).catch(err => {
      console.warn('[cPanel Advisor Sync Warning]:', err);
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Subperfil de Asesor Actualizado',
      details: `Asesor "${saved.name}" (${saved.id}) modificado.`,
      status: 'success'
    });
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/advisors/batch-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Lista de IDs requerida' });
    }
    const count = db.deleteAdvisors(ids);

    // Sincronizar eliminación en cPanel
    for (const id of ids) {
      cpanelDbService.deleteAdvisor(id).catch(err => console.warn('[cPanel Batch Delete Warning]:', err));
    }

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Eliminación Múltiple de Usuarios',
      details: `Se eliminaron ${count} usuarios del sistema mediante selección múltiple.`,
      status: 'info'
    });
    res.json({ success: true, count, message: `${count} usuario(s) eliminado(s) exitosamente` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/advisors/:id', (req, res) => {
  try {
    const deleted = db.deleteAdvisor(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Asesor no encontrado' });

    // Sincronizar eliminación en MySQL cPanel (DELETE action=asesores&id=...)
    cpanelDbService.deleteAdvisor(req.params.id).catch(err => {
      console.warn('[cPanel Advisor Delete Warning]:', err);
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Asesor Eliminado',
      details: `Asesor ${req.params.id} retirado del sistema.`,
      status: 'info'
    });
    res.json({ success: true, message: 'Asesor eliminado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/advisors/:id/settle', (req, res) => {
  try {
    const settled = db.settleAdvisor(req.params.id, req.body.notes);
    if (!settled) return res.status(404).json({ success: false, message: 'Asesor no encontrado' });
    db.addLog({
      type: 'STATUS_UPDATE',
      action: 'Comisión de Asesor Liquidada',
      details: `Liquidación confirmada para ${settled.name} (${settled.id}).`,
      status: 'success'
    });
    res.json({ success: true, data: settled });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Advisor Sales
router.get('/advisor-sales', (req, res) => {
  try {
    const { advisorId, dropiStatus, search } = req.query;
    const sales = db.getAdvisorSales({
      advisorId: advisorId as string,
      dropiStatus: dropiStatus as any,
      search: search as string
    });
    res.json({ success: true, data: sales });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/advisor-sales', (req, res) => {
  try {
    const saved = db.saveAdvisorSale(req.body);
    db.addLog({
      type: 'ORDER_CREATED',
      orderId: saved.id,
      action: 'Venta de Asesor Registrada',
      details: `${saved.advisorName} registró venta ${saved.orderNumber} para ${saved.clientName} (${saved.clientCity}) por $${saved.totalAmount.toLocaleString()} COP.`,
      status: 'success'
    });
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/advisor-sales/:id', (req, res) => {
  try {
    const saved = db.saveAdvisorSale({ ...req.body, id: req.params.id });
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/advisor-sales/:id', (req, res) => {
  try {
    const deleted = db.deleteAdvisorSale(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Venta no encontrada' });
    res.json({ success: true, message: 'Venta eliminada de la bolsa' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/advisor-sales/batch-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Lista de IDs requerida' });
    }
    const count = db.deleteAdvisorSales(ids);
    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Eliminación Múltiple de Ventas Dropi',
      details: `Se eliminaron ${count} órdenes de la bolsa de ventas Dropi.`,
      status: 'info'
    });
    res.json({ success: true, count, message: `${count} pedido(s) eliminado(s) exitosamente` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/advisor-sales/:id/execute', (req, res) => {
  try {
    const sale = db.getAdvisorSales().find(s => s.id === req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

    const dropiOrderId = sale.dropiOrderId || `DROPI-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingNumber = sale.trackingNumber || `ENV-${Math.floor(100000000 + Math.random() * 900000000)}`;

    const saved = db.saveAdvisorSale({
      id: sale.id,
      dropiStatus: 'montado_dropi',
      dropiOrderId,
      trackingNumber
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Orden Ejecutada en Dropi',
      details: `Pedido "${saved.orderNumber}" (${saved.id}) ejecutado para despacho Dropi con guía ${trackingNumber}.`,
      status: 'success'
    });

    res.json({
      success: true,
      message: `¡Orden ${saved.orderNumber} ejecutada y montada exitosamente en Dropi!`,
      data: saved
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/advisor-sales/batch-status', (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !status) {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
    }
    const count = db.markAdvisorSalesDropiStatus(ids, status);
    db.addLog({
      type: 'STATUS_UPDATE',
      action: 'Lote Dropi Actualizado',
      details: `${count} pedidos actualizados a estado "${status}".`,
      status: 'success'
    });
    res.json({ success: true, count, message: `${count} pedidos actualizados con éxito` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Intelligent Unstructured Text Parser for Sales WhatsApp/Chat messages
router.post('/advisor-sales/parse-text', (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ success: false, message: 'Texto requerido' });
    }

    const text = rawText.trim();
    const advisors = db.getAdvisors();
    const products = db.getProducts();

    // 1. Detect Advisor
    let matchedAdvisor = advisors[0];
    const advisorMatch = text.match(/(?:asesor|vendedor|agente|id)\s*[:#-]?\s*([^\n,]+)/i);
    if (advisorMatch) {
      const advQuery = advisorMatch[1].trim().toLowerCase();
      const found = advisors.find(a => 
        advQuery.includes(a.id.toLowerCase()) || 
        advQuery.includes(a.name.toLowerCase()) ||
        a.name.toLowerCase().includes(advQuery)
      );
      if (found) matchedAdvisor = found;
    } else {
      // Check if text directly contains advisor name or ID
      for (const adv of advisors) {
        if (text.toLowerCase().includes(adv.name.toLowerCase()) || text.toLowerCase().includes(adv.id.toLowerCase())) {
          matchedAdvisor = adv;
          break;
        }
      }
    }

    // 2. Detect Product & Quantity
    let detectedProduct = products[0]?.title || 'Inflador de Llantas Compresor Portátil y Arrancador 4 en 1';
    let detectedQuantity = 1;
    let detectedPrice = products[0]?.price || 140000;

    const productMatch = text.match(/(?:producto|artículo|item)\s*[:#-]?\s*([^\n$]+)/i);
    if (productMatch) {
      detectedProduct = productMatch[1].replace(/\(\s*\d+\s*(?:unidades|uds|unds|und)\s*\)/i, '').trim();
    }

    // Check quantity
    const qtyMatch = text.match(/(?:cantidad|unidades|uds|unds|und|\()\s*[:#-]?\s*(\d+)/i) ||
                     text.match(/(\d+)\s*(?:unidades|uds|unds|und|piezas)/i);
    if (qtyMatch) {
      detectedQuantity = parseInt(qtyMatch[1], 10) || 1;
    }

    // Check price
    const priceMatch = text.match(/(?:\$|precio|valor|total|a cobrar)\s*[:#-]?\s*\$?\s*([\d.,]+(?:\.\d{3})*)/i);
    if (priceMatch) {
      const numStr = priceMatch[1].replace(/[^\d]/g, '');
      const parsedPrice = parseInt(numStr, 10);
      if (parsedPrice && parsedPrice > 1000) {
        detectedPrice = parsedPrice;
      }
    }

    // 3. Detect Client Data
    let clientName = '';
    const nameMatch = text.match(/(?:cliente|nombre|comprador|destinatario)\s*[:#-]?\s*([^\n,]+)/i);
    if (nameMatch) {
      clientName = nameMatch[1].trim();
    }

    let clientPhone = '';
    const phoneMatch = text.match(/(?:teléfono|telefono|celular|cel|whatsapp|tel|wa)\s*[:#-]?\s*([0-9\s+()-]{7,15})/i) ||
                       text.match(/(?:^|\s)(3\d{9})(?:\s|$|[^\d])/);
    if (phoneMatch) {
      clientPhone = phoneMatch[1].replace(/[^\d]/g, '');
    }

    let clientCity = 'Bogotá D.C.';
    let clientDepartment = 'Cundinamarca';
    const cityMatch = text.match(/(?:ciudad|municipio|destino)\s*[:#-]?\s*([^\n,]+)/i);
    if (cityMatch) {
      clientCity = cityMatch[1].trim();
    } else {
      // Look for common Colombian cities in text
      const knownCities = [
        { city: 'Bogotá', dept: 'Cundinamarca' },
        { city: 'Medellín', dept: 'Antioquia' },
        { city: 'Cali', dept: 'Valle del Cauca' },
        { city: 'Barranquilla', dept: 'Atlántico' },
        { city: 'Cartagena', dept: 'Bolívar' },
        { city: 'Bucaramanga', dept: 'Santander' },
        { city: 'Pereira', dept: 'Risaralda' },
        { city: 'Manizales', dept: 'Caldas' },
        { city: 'Cúcuta', dept: 'Norte de Santander' },
        { city: 'Ibagué', dept: 'Tolima' },
        { city: 'Santa Marta', dept: 'Magdalena' },
        { city: 'Villavicencio', dept: 'Meta' },
        { city: 'Pasto', dept: 'Nariño' },
        { city: 'Armenia', dept: 'Quindío' },
        { city: 'Neiva', dept: 'Huila' },
        { city: 'Popayán', dept: 'Cauca' },
        { city: 'Valledupar', dept: 'Cesar' },
        { city: 'Montería', dept: 'Córdoba' },
        { city: 'Envigado', dept: 'Antioquia' },
        { city: 'Bello', dept: 'Antioquia' },
        { city: 'Itagüí', dept: 'Antioquia' },
        { city: 'Soacha', dept: 'Cundinamarca' },
        { city: 'Palmira', dept: 'Valle del Cauca' },
        { city: 'Floridablanca', dept: 'Santander' }
      ];
      for (const item of knownCities) {
        if (new RegExp(`\\b${item.city}\\b`, 'i').test(text)) {
          clientCity = item.city;
          clientDepartment = item.dept;
          break;
        }
      }
    }

    let clientAddress = '';
    const addressMatch = text.match(/(?:dirección|direccion|dir|ubicación|ubicacion)\s*[:#-]?\s*([^\n]+)/i);
    if (addressMatch) {
      clientAddress = addressMatch[1].trim();
    } else {
      // Find typical address pattern (calle, carrera, diagonal, transversal, av, etc.)
      const addrPattern = text.match(/(?:calle|clle|cl|carrera|cra|cr|diagonal|diag|dg|transversal|trans|tv|avenida|av|manzana|mz|kilometro|km)\s*[\d\w\s#\-.]+/i);
      if (addrPattern) {
        clientAddress = addrPattern[0].trim();
      }
    }

    res.json({
      success: true,
      data: {
        advisorId: matchedAdvisor ? matchedAdvisor.id : 'AS-001',
        advisorName: matchedAdvisor ? matchedAdvisor.name : 'Juan (Asesor 1)',
        advisorChannel: matchedAdvisor ? matchedAdvisor.channel : 'WhatsApp Directo',
        productTitle: detectedProduct,
        quantity: detectedQuantity,
        unitPrice: Math.round(detectedPrice / (detectedQuantity || 1)),
        totalAmount: detectedPrice,
        clientName: clientName || 'Cliente No Identificado',
        clientPhone: clientPhone || '',
        clientCity,
        clientDepartment,
        clientAddress: clientAddress || '',
        additionalNotes: 'Cargado vía parsing inteligente de WhatsApp',
        dropiStatus: 'pendiente_bolsa',
        paymentMethod: 'contra_entrega'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 9. BACKUP & SYSTEM SYNC
// ==========================================
router.get('/backup', (req, res) => {
  try {
    const backup = db.getFullBackup();
    res.setHeader('Content-Disposition', `attachment; filename=zavela-backup-${new Date().toISOString().slice(0, 10)}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/restore', (req, res) => {
  try {
    const backupData = req.body;
    db.restoreBackup(backupData);
    db.addLog({
      type: 'SYSTEM',
      action: 'Respaldo de Base de Datos Restaurado',
      details: `Se cargó un respaldo completo de la tienda.`,
      status: 'success'
    });
    res.json({ success: true, message: 'Respaldo restaurado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/reset', (req, res) => {
  try {
    db.resetToDefaultData();
    db.addLog({
      type: 'SYSTEM',
      action: 'Restablecimiento de Fábrica',
      details: `La base de datos fue restablecida a los valores oficiales de Zavela Store.`,
      status: 'info'
    });
    res.json({ success: true, message: 'Tienda restablecida a valores iniciales oficiales' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 10. SOCIAL MARKETING & AUTO-BROADCAST
// ==========================================
router.get('/social/settings', (req, res) => {
  try {
    const settings = db.getSocialMarketingSettings();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/social/settings', (req, res) => {
  try {
    const saved = db.saveSocialMarketingSettings(req.body);
    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Ajustes de Redes Sociales Actualizados',
      details: 'Se actualizaron las configuraciones de vinculación y auto-publicación en redes.',
      status: 'success'
    });
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/social/connect/:platform', (req, res) => {
  try {
    const platform = req.params.platform as 'facebook' | 'instagram' | 'tiktok';
    if (!['facebook', 'instagram', 'tiktok'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Plataforma no válida' });
    }

    const { accountName, pageId, accountId, accessToken, pixelId } = req.body;
    const current = db.getSocialMarketingSettings();

    const updatedConn = {
      ...current.connections[platform],
      platform,
      connected: true,
      accountName: accountName || current.connections[platform]?.accountName || `@zavela.${platform}`,
      pageId: pageId || current.connections[platform]?.pageId,
      accountId: accountId || current.connections[platform]?.accountId,
      accessToken: accessToken || current.connections[platform]?.accessToken || `token_${Date.now()}`,
      pixelId: pixelId || current.connections[platform]?.pixelId,
      status: 'connected' as const,
      lastSyncAt: new Date().toISOString(),
      autoPostEnabled: true
    };

    const saved = db.saveSocialMarketingSettings({
      connections: {
        ...current.connections,
        [platform]: updatedConn
      }
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: `Cuenta de ${platform.toUpperCase()} Vinculada`,
      details: `Se conectó exitosamente la cuenta "${updatedConn.accountName}" para auto-publicación.`,
      status: 'success'
    });

    res.json({ success: true, data: saved.connections[platform] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/social/disconnect/:platform', (req, res) => {
  try {
    const platform = req.params.platform as 'facebook' | 'instagram' | 'tiktok';
    if (!['facebook', 'instagram', 'tiktok'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Plataforma no válida' });
    }

    const current = db.getSocialMarketingSettings();
    const updatedConn = {
      ...current.connections[platform],
      connected: false,
      status: 'disconnected' as const,
      autoPostEnabled: false
    };

    const saved = db.saveSocialMarketingSettings({
      connections: {
        ...current.connections,
        [platform]: updatedConn
      }
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: `Cuenta de ${platform.toUpperCase()} Desvinculada`,
      details: `Se pausó la vinculación con ${platform}.`,
      status: 'info'
    });

    res.json({ success: true, data: saved.connections[platform] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/social/posts', (req, res) => {
  try {
    const posts = db.getSocialBroadcastPosts();
    res.json({ success: true, data: posts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/social/publish', async (req, res) => {
  try {
    const { productId, platforms, copies } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'El ID del producto es requerido' });
    }

    const product = db.getProductById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const newPost = db.publishSocialPost({
      productId,
      platforms,
      copies,
      estimatedViewsBoost: 3000
    });

    let facebookSync = null;
    if (Array.isArray(platforms) && platforms.includes('facebook')) {
      try {
        facebookSync = await metaGraphService.publishProductToFacebook(product, {
          customCaption: copies?.facebook
        });
      } catch (fbErr: any) {
        console.error('[Facebook Publish Error]:', fbErr);
        facebookSync = {
          success: false,
          message: fbErr.message
        };
      }
    }

    res.status(201).json({ success: true, data: newPost, facebookSync });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// RUTAS OFICIALES FACEBOOK META GRAPH API v26.0
// ==========================================

// GET /api/admin/social/facebook/status - Obtener estado actual de la sesión persistente de Facebook
router.get('/social/facebook/status', (req, res) => {
  try {
    const config = metaGraphService.getFacebookConfig();
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/social/facebook/connect - Vincular e iniciar sesión persistente con Page ID y Token
router.post('/social/facebook/connect', async (req, res) => {
  try {
    const { pageId, accessToken, accountName, autoPostEnabled = true, pixelId } = req.body;

    if (!pageId || !accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Page ID y Page Access Token permanente son requeridos para conectar la Página de Facebook.'
      });
    }

    // Verificar en vivo contra Meta Graph API v26.0
    const checkResult = await metaGraphService.checkConnection(pageId, accessToken);

    const current = db.getSocialMarketingSettings();
    const updatedConn = {
      ...current.connections.facebook,
      platform: 'facebook' as const,
      connected: true,
      accountName: checkResult.pageName || accountName || 'Zavela Store Colombia (Página Oficial)',
      pageId: String(pageId).trim(),
      accessToken: String(accessToken).trim(),
      pixelId: pixelId ? String(pixelId).trim() : current.connections.facebook?.pixelId,
      status: 'connected' as const,
      lastSyncAt: new Date().toISOString(),
      autoPostEnabled: autoPostEnabled !== false
    };

    const saved = db.saveSocialMarketingSettings({
      connections: {
        ...current.connections,
        facebook: updatedConn
      }
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Página de Facebook Conectada (Meta Graph API v26.0)',
      details: `Página "${updatedConn.accountName}" (ID: ${updatedConn.pageId}) conectada con sesión permanente. Auto-publicación: ${updatedConn.autoPostEnabled ? 'Activa' : 'Pausada'}.`,
      status: 'success'
    });

    res.json({
      success: true,
      data: saved.connections.facebook,
      metaValidation: checkResult,
      message: checkResult.connected
        ? `✅ Página "${updatedConn.accountName}" conectada y verificada exitosamente.`
        : `⚠️ Credenciales guardadas. Advertencia de Meta: ${checkResult.message}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/social/facebook/disconnect - Desconectar sesión de Facebook
router.post('/social/facebook/disconnect', (req, res) => {
  try {
    const current = db.getSocialMarketingSettings();
    const updatedConn = {
      ...current.connections.facebook,
      connected: false,
      status: 'disconnected' as const,
      autoPostEnabled: false
    };

    const saved = db.saveSocialMarketingSettings({
      connections: {
        ...current.connections,
        facebook: updatedConn
      }
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Página de Facebook Desconectada',
      details: 'Se pausó la sincronización automática con Facebook.',
      status: 'info'
    });

    res.json({ success: true, data: saved.connections.facebook, message: 'Página de Facebook desconectada.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/social/facebook/test-connection - Probar token y permisos sin guardar
router.post('/social/facebook/test-connection', async (req, res) => {
  try {
    const { pageId, accessToken } = req.body;
    const config = metaGraphService.getFacebookConfig();
    const targetPageId = pageId || config.pageId;
    const targetToken = accessToken || config.accessToken;

    if (!targetPageId || !targetToken) {
      return res.status(400).json({
        success: false,
        message: 'Ingresa el Page ID y el Page Access Token para realizar la prueba.'
      });
    }

    const result = await metaGraphService.checkConnection(targetPageId, targetToken);
    res.json({ success: result.connected, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/social/facebook/test-post - Publicar post de prueba en el muro de Facebook
router.post('/social/facebook/test-post', async (req, res) => {
  try {
    const { pageId, accessToken } = req.body;
    const config = metaGraphService.getFacebookConfig();
    const targetPageId = pageId || config.pageId;
    const targetToken = accessToken || config.accessToken;

    if (!targetPageId || !targetToken) {
      return res.status(400).json({
        success: false,
        message: 'No hay credenciales de Facebook configuradas para realizar la prueba.'
      });
    }

    const result = await metaGraphService.publishTestPost(targetPageId, targetToken);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/social/facebook/publish-product - Publicar producto específico en la Página de Facebook
router.post('/social/facebook/publish-product', async (req, res) => {
  try {
    const { productId, product: productPayload, customCaption } = req.body;

    let targetProduct: Product | undefined;

    // 1. Si el cliente envió el objeto completo del producto directamente (desde el formulario o tabla)
    if (productPayload && typeof productPayload === 'object' && productPayload.title) {
      targetProduct = {
        id: productPayload.id || productId || `prod-${Date.now()}`,
        title: productPayload.title,
        slug: productPayload.slug || (productPayload.title ? productPayload.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : `prod-${Date.now()}`),
        description: productPayload.description || '',
        shortDescription: productPayload.shortDescription || '',
        price: Number(productPayload.price) || 0,
        costPrice: Number(productPayload.costPrice) || 0,
        compareAtPrice: Number(productPayload.compareAtPrice) || (Number(productPayload.price) ? Number(productPayload.price) + 20000 : 0),
        discountPercentage: Number(productPayload.discountPercentage) || 0,
        marginAmount: Number(productPayload.marginAmount) || 0,
        marginPercentage: Number(productPayload.marginPercentage) || 0,
        stock: Number(productPayload.stock) || 0,
        active: productPayload.active !== false,
        featured: Boolean(productPayload.featured),
        images: Array.isArray(productPayload.images) && productPayload.images.length > 0
          ? productPayload.images
          : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
        warrantyInfo: productPayload.warrantyInfo || '30 días de garantía oficial Zavela Store.',
        tags: Array.isArray(productPayload.tags) ? productPayload.tags : ['tendencia', 'calidad'],
        weightKg: Number(productPayload.weightKg) || 0.5,
        categoryId: productPayload.categoryId || 'cat-general',
        categoryName: productPayload.categoryName || 'General',
        warehouseCity: productPayload.warehouseCity || 'Bogotá D.C.',
        brand: productPayload.brand || 'Zavela Store',
        dropi_product_id: productPayload.dropi_product_id || '',
        variants: Array.isArray(productPayload.variants) ? productPayload.variants : [],
        createdAt: productPayload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Guardar o actualizar en db local para consistencia en futuras consultas
      try {
        db.saveProduct(targetProduct);
      } catch (e) {
        console.warn('[Social FB Sync] No se pudo guardar en local DB:', e);
      }
    } else if (productId) {
      // 2. Buscar por ID en la base de datos local
      targetProduct = db.getProductById(productId);

      // Búsqueda alternativa por slug o match parcial si no coincide directamente
      if (!targetProduct) {
        const all = db.getProducts();
        targetProduct = all.find(p => p.id === productId || p.slug === productId);
      }
    }

    if (!targetProduct) {
      return res.status(404).json({
        success: false,
        message: `Producto no encontrado en el sistema. Asegúrate de enviar los datos del producto o guardarlo previamente.`
      });
    }

    const result = await metaGraphService.publishProductToFacebook(targetProduct, { customCaption });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/social/facebook/sync-all - Publicar catálogo completo o seleccionados en Facebook
router.post('/social/facebook/sync-all', async (req, res) => {
  try {
    const { productIds, products: productsPayload } = req.body;

    let targetProducts: Product[] = [];

    // 1. Si el cliente envió una lista de productos completos directamente (desde la tabla del catálogo)
    if (Array.isArray(productsPayload) && productsPayload.length > 0) {
      targetProducts = productsPayload.map((p: any) => ({
        id: p.id || `prod-${Date.now()}`,
        title: p.title || 'Producto Zavela Store',
        slug: p.slug || (p.title ? p.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : `prod-${Date.now()}`),
        description: p.description || '',
        shortDescription: p.shortDescription || '',
        price: Number(p.price) || 0,
        costPrice: Number(p.costPrice) || 0,
        compareAtPrice: Number(p.compareAtPrice) || (Number(p.price) ? Number(p.price) + 20000 : 0),
        discountPercentage: Number(p.discountPercentage) || 0,
        marginAmount: Number(p.marginAmount) || 0,
        marginPercentage: Number(p.marginPercentage) || 0,
        stock: Number(p.stock) || 0,
        active: p.active !== false,
        featured: Boolean(p.featured),
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
        warrantyInfo: p.warrantyInfo || '30 días de garantía oficial.',
        tags: Array.isArray(p.tags) ? p.tags : ['tendencia'],
        weightKg: Number(p.weightKg) || 0.5,
        categoryId: p.categoryId || 'cat-general',
        categoryName: p.categoryName || 'General',
        warehouseCity: p.warehouseCity || 'Bogotá D.C.',
        brand: p.brand || 'Zavela Store',
        dropi_product_id: p.dropi_product_id || '',
        variants: Array.isArray(p.variants) ? p.variants : [],
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Sincronizar en DB local
      targetProducts.forEach(prod => {
        try {
          db.saveProduct(prod);
        } catch {}
      });
    } else {
      // 2. Si solo envió IDs o no envió lista, obtener del catálogo local (sin filtrar por activos para permitir cualquier producto seleccionado)
      const allProducts = db.getProducts();
      if (Array.isArray(productIds) && productIds.length > 0) {
        targetProducts = allProducts.filter(p => productIds.includes(p.id) || productIds.includes(p.slug));
      } else {
        targetProducts = allProducts.slice(0, 5);
      }
    }

    if (targetProducts.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay productos disponibles para sincronizar con Facebook' });
    }

    const results = [];
    for (const prod of targetProducts) {
      const resPub = await metaGraphService.publishProductToFacebook(prod);
      results.push({
        productId: prod.id,
        title: prod.title,
        ...resPub
      });
      // Breve pausa para respetar rate limit de Meta
      await new Promise(r => setTimeout(r, 600));
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      syncedCount: successCount,
      totalCount: targetProducts.length,
      results,
      message: `Sincronización completada: ${successCount} de ${targetProducts.length} productos publicados en la Página de Facebook.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/social/posts/:id', (req, res) => {
  try {
    const deleted = db.deleteSocialBroadcastPost(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
    }
    res.json({ success: true, message: 'Publicación eliminada del historial' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/social/generate-copy', async (req, res) => {
  try {
    const { productId, tone = 'viral_high_converting' } = req.body;
    const product = db.getProductById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const priceClean = Math.round(Number(product.price) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const priceFormatted = `COP ${priceClean}`;
    const ai = getAi();

    if (ai) {
      try {
        const prompt = `Eres un estratega experto en marketing digital, copywriting de e-commerce y publicidad viral en Colombia para la tienda online Zavela Store.
Genera 3 textos persuasivos y de alto impacto para promocionar este producto en redes sociales, incentivando compras inmediatas con la modalidad de PAGO CONTRA ENTREGA (paga en efectivo o transferencia al recibir en la puerta de su casa) y envío rápido a toda Colombia:

DATOS DEL PRODUCTO:
- Título: ${product.title}
- Categoría: ${product.categoryName || 'General'}
- Precio: ${priceFormatted} COP
- Descripción: ${product.shortDescription || product.description || 'Producto de alta demanda y calidad garantizada'}
- Tono solicitado: ${tone}

FORMATO DE RESPUESTA:
Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta (sin markdown extra alrededor si es posible, o en bloque json):
{
  "facebook": "Texto completo para Facebook con ganchos, beneficios, precio en COP, llamado a la acción claro de Pago Contra Entrega y emojis adecuados.",
  "instagram": "Copy visual para Instagram (Feed o Reel) con llamada a comprar en el link de la bio o por DM, emojis atractivos y 6 hashtags virales colombianos.",
  "tiktok": "Guion corto/copy viral para TikTok con gancho irresistible tipo POV/Problema-Solución, audio sugerido o llamado urgente a comentar o tocar el carrito de compras con Pago Contra Entrega."
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text?.trim();
        if (text) {
          try {
            const parsed = JSON.parse(text);
            return res.json({ success: true, data: parsed, aiPowered: true });
          } catch (jsonErr) {
            console.warn('AI returned non-JSON:', text);
          }
        }
      } catch (aiErr) {
        console.warn('Gemini API call failed, falling back to local persuasive engine:', aiErr);
      }
    }

    // Fallback dynamic generator with high converting Colombian e-commerce formulas
    let fbHook = '🔥 ¡TENDENCIA EXCLUSIVA EN COLOMBIA!';
    let igHook = '✨ Lo que estabas buscando para tu día a día ✨';
    let ttHook = 'POV: Compraste esto con Pago Contra Entrega y superó tus expectativas 😱🇨🇴';

    if (tone === 'urgency_flash') {
      fbHook = '🚨 ¡OFERTA RELÁMPAGO POR TIEMPO LIMITADO!';
      igHook = '⏳ ¡ÚLTIMAS UNIDADES EN BODEGA NACIONAL!';
      ttHook = 'No cometas el error de quedarte sin el tuyo porque se agotan HOY 🏃💨';
    } else if (tone === 'storytelling') {
      fbHook = '💡 ¿Cansado de buscar productos que no cumplen lo que prometen? Mira esto:';
      igHook = 'Transforma tu rutina con un solo detalle que marca la diferencia 💫';
      ttHook = 'Storytime de cómo este producto cambió por completo mis días 🥹❤️';
    }

    const fallbackCopies = {
      facebook: `${fbHook}\n\nLlega a Zavela Store: *${product.title}*\n\n💰 *PRECIO ESPECIAL:* ${priceFormatted}\n🚚 *PAGO CONTRA ENTREGA:* Recibes en la puerta de tu casa y pagas seguro al mensajero.\n✅ *GARANTÍA OFICIAL:* 30 días de respaldo directo.\n\n👇 ¡Haz tu pedido ahora mismo antes de que se agote el lote de bodega!`,
      instagram: `${igHook}\n\n🌟 *${product.title}*\n\nConseguilo hoy por solo *${priceFormatted}* con despacho prioritario a toda Colombia 🇨🇴\n\n🛍️ *¿Cómo pedirlo?*\n1. Toca el enlace de nuestro perfil\n2. Ingresa tus datos de envío\n3. ¡Pagas al recibir en tus manos!\n\n#ZavelaStore #PagoContraEntrega #Colombia #ComprasOnline #EnvioGratis #Tendencia2026`,
      tiktok: `${ttHook}\n\n${product.title} por solo ${priceFormatted} con envío contra entrega a toda Colombia 🇨🇴📦\n\n👉 Comenta "LO QUIERO" o toca el botón para ordenar el tuyo hoy. #TikTokMadeMeBuyIt #ZavelaStore #Colombia #OfertaViral`
    };

    res.json({ success: true, data: fallbackCopies, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 15. EMAIL MARKETING CON IA & NEWSLETTER
// ==========================================
router.post('/newsletter/generate-template', async (req, res) => {
  try {
    const { email, interests = [], viewedProducts = [], subscriberName } = req.body;
    const ai = getAi();

    const catalog = db.getProducts();
    const activeProducts = catalog.filter((p: any) => p.active !== false);

    // Find recommended products based on user interests or top products
    let recommended = activeProducts.filter((p: any) => {
      const pCat = (p.categoryName || '').toLowerCase();
      const pTitle = p.title.toLowerCase();
      return interests.some((interest: string) => {
        const intClean = interest.toLowerCase();
        return pCat.includes(intClean) || pTitle.includes(intClean);
      });
    });

    if (recommended.length === 0) {
      recommended = activeProducts.slice(0, 3);
    } else {
      recommended = recommended.slice(0, 3);
    }

    if (ai) {
      try {
        const prompt = `Eres el especialista en Email Marketing de Zavela Store en Colombia.
Diseña una plantilla de correo electrónico hiper-personalizada para un suscriptor de nuestro boletín de novedades.
DATOS DEL SUSCRIPTOR:
- Nombre: ${subscriberName || 'Cliente Estimado'}
- Correo: ${email}
- Intereses / Categorías vistas: ${interests.join(', ') || 'Novedades y tendencias'}
- Productos recomendados seleccionados:
${recommended.map((p: any) => `- ${p.title} (Precio: COP ${Math.round(Number(p.price) || 0).toLocaleString('es-CO')})`).join('\n')}

REGLAS DE COPYWRITING:
1. Asunto llamativo con emoji y oferta.
2. Beneficio clave: PAGO CONTRA ENTREGA en efectivo en toda Colombia con transportadoras (Servientrega, Coordinadora, Envía, Inter Rapidísimo).
3. Cupón de bienvenida de 10% OFF: BIENVENIDO10.
4. Tono cálido, confiable y profesional colombiano.

FORMATO DE SALIDA (JSON ÚNICAMENTE):
{
  "subject": "Asunto atractivo para el email",
  "preheader": "Texto preheader complementario",
  "greeting": "Saludo personalizado",
  "headline": "Título principal del correo",
  "bodyText": "Mensaje principal conectando los intereses del suscriptor",
  "recommendedProducts": [
    {
      "name": "Nombre producto",
      "reason": "Por qué le interesa al cliente",
      "offerBadge": "10% OFF / Envío Gratis",
      "priceCOP": "COP 145.000"
    }
  ],
  "couponCode": "BIENVENIDO10",
  "callToAction": "Texto del botón de compra",
  "guaranteeText": "Garantía de satisfacción y pago al recibir en casa"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          return res.json({ success: true, template: parsed, aiPowered: true });
        }
      } catch (aiErr) {
        console.warn('AI Email Marketing fallback:', aiErr);
      }
    }

    // High quality rule-based fallback
    const fallbackTemplate = {
      subject: `✨ ${subscriberName ? subscriberName + ', tenemos' : 'Tenemos'} una selección especial para ti con 10% OFF`,
      preheader: 'Disfruta de novedades exclusivas y paga únicamente al recibir en tu puerta.',
      greeting: subscriberName ? `¡Hola ${subscriberName}!` : '¡Hola!',
      headline: 'Recomendaciones a tu medida según tus intereses',
      bodyText: `Notamos tu interés en ${interests.join(' y ') || 'nuestras mejores colecciones'}. Seleccionamos los productos más valorados con 5 estrellas por compradores en Colombia para que aproveches tu cupón de bienvenida.`,
      recommendedProducts: recommended.map((p: any) => ({
        name: p.title,
        reason: 'Alta demanda y 100% de clientes satisfechos',
        offerBadge: '10% OFF Exclusivo',
        priceCOP: `COP ${Math.round(Number(p.price) || 0).toLocaleString('es-CO')}`
      })),
      couponCode: 'BIENVENIDO10',
      callToAction: 'Comprar con 10% OFF y Pago al Recibir',
      guaranteeText: 'Pagas seguro en efectivo cuando la transportadora entregue el paquete en tus manos.'
    };

    res.json({ success: true, template: fallbackTemplate, aiPowered: false });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
