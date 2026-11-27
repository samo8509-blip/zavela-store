import { publishProductPhotos, publishPhotoUrls, publishVideoUrl, storeTmpMedia, normalizeVideo } from '../services/tiktokService.ts';
import { saveHomeVideo, deleteHomeVideo } from './homeVideo.ts';
import { Router } from 'express';
import { signAdvisorToken, verifyAdvisorToken, signResetToken, verifyResetToken, signPayToken } from '../middleware/apiGuard.ts';
import { publicAdvisor, setPresence, refreshAdvisorsIfStale, isSalesAdvisor, isAccountingRole } from '../services/advisorStore.ts';
import * as advisorSales from '../services/advisorSalesStore.ts';
import * as payouts from '../services/payouts.ts';
import { verifyPassword } from '../services/advisorStore.ts';
import { findByEmail, passwordFingerprint, saveAdvisor as saveAdvisorRecord, getAdvisor as getAdvisorRecord, listAdvisors as listAdvisorRecords } from '../services/advisorStore.ts';
import { sendAlertEmail } from '../services/emailAlerts.ts';
import { sendSaleNotificationOnce } from '../services/whatsappAlerts.ts';
import { db, isTestProduct } from '../db.ts';
import { Product, OrderStatus, Category, Customer, Order, SocialMarketingSettings } from '../../src/types/index.ts';
import { GoogleGenAI } from '@google/genai';
import { approveOrderForDropi } from './orders.ts';
import { sendSaleNotification, dispatchWhatsAppAlert } from '../services/whatsappAlerts.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';
import { metaGraphService, isPlaceholderToken } from '../services/metaGraphService.ts';
import { pool } from '../mysqlPool.ts';
import { publicOrderView, exactMatch } from '../services/publicOrder.ts';
import { dropiBackupService } from '../services/dropiBackupService.ts';
import { applyCampaignDisplay } from '../services/campaign.ts';
import { canSeeCosts, redactProductCosts } from '../utils/redactCosts.ts';
import { listPrivacyRequests, updatePrivacyRequest } from './legal.ts';

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
function validateCategoryPayload(data: any): { valid: boolean; message?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, message: 'El cuerpo de la solicitud debe ser un objeto JSON válido.' };
  }

  // 1. Bloqueo estricto por prefijo de ID de producto
  const rawId = String(data.id || '').trim().toLowerCase();
  if (rawId.startsWith('prod-') || rawId.startsWith('product-')) {
    return {
      valid: false,
      message: `Bloqueado: El identificador "${data.id}" posee prefijo de producto ("prod-" / "product-") y no puede ser guardado en la base de datos de categorías.`
    };
  }

  // 2. Bloqueo estricto por presencia de atributos exclusivos de productos
  const productSpecificFields = [
    'price', 'precio',
    'costPrice', 'cost_price', 'supplier_cost',
    'compareAtPrice', 'suggested_price',
    'stock', 'cantidad',
    'dropiProductId', 'dropi_product_id',
    'variants', 'variantes',
    'shippingCost', 'flete_envio', 'flete', 'estimatedShippingCost',
    'dropiFee', 'dropi_fee',
    'supplierSku', 'supplier_sku',
    'weightKg', 'warehouseCity',
    'provider', 'supplier'
  ];

  for (const field of productSpecificFields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      return {
        valid: false,
        message: `Bloqueado: El objeto contiene el campo de producto "${field}". No se permite registrar productos dentro de la colección de categorías.`
      };
    }
  }

  // 3. Estructura de producto con 'title' en vez de 'name'
  if (data.title && !data.name) {
    return {
      valid: false,
      message: 'Bloqueado: El objeto tiene atributo "title" propio de un producto en lugar de "name" para categoría.'
    };
  }

  return { valid: true };
}

router.get('/categories', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM categorias ORDER BY `order` ASC, createdAt ASC');
    const list = Array.isArray(rows) ? rows : [];

    const categories = list.map((row: any) => {
      let subcategories: any[] = [];
      if (row.subcategories !== null && row.subcategories !== undefined) {
        if (typeof row.subcategories === 'string' && row.subcategories.trim()) {
          try {
            subcategories = JSON.parse(row.subcategories);
          } catch {
            subcategories = [];
          }
        } else if (Array.isArray(row.subcategories)) {
          subcategories = row.subcategories;
        }
      }

      return {
        id: String(row.id),
        name: row.name || '',
        slug: row.slug || '',
        active: row.active === 1 || row.active === true || row.active === '1',
        icon: row.icon || 'Sparkles',
        description: row.description || '',
        order: Number(row.order !== undefined ? row.order : (row['`order`'] ?? 0)),
        subcategories: Array.isArray(subcategories) ? subcategories : [],
        createdAt: row.createdAt || row.created_at || new Date().toISOString()
      };
    });

    res.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('[GET /categories Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al consultar categorías en MySQL' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    // Validación estricta anti-inyección de productos en categorías
    const validation = validateCategoryPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CATEGORY_PAYLOAD',
        message: validation.message
      });
    }

    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es obligatorio.'
      });
    }

    const rawId = req.body?.id ? String(req.body.id).trim() : '';
    const id = rawId || `cat-${Date.now()}`;
    const slug = String(req.body?.slug || '').trim() || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const active = req.body?.active !== false ? 1 : 0;
    const icon = String(req.body?.icon || 'Sparkles').trim();
    const description = String(req.body?.description || '').trim();
    const order = Number(req.body?.order !== undefined ? req.body.order : 1);

    // Serializar obligatoriamente el array de subcategorías con JSON.stringify() antes de guardarlo en MySQL
    const rawSubcategories = Array.isArray(req.body?.subcategories) ? req.body.subcategories : [];
    const subcategoriesJson = JSON.stringify(rawSubcategories);

    // Consulta directa INSERT INTO categorias a MySQL
    await pool.query(
      'INSERT INTO categorias (id, name, slug, active, icon, description, `order`, subcategories) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, slug, active, icon, description, order, subcategoriesJson]
    );

    const createdCategory = {
      id,
      name,
      slug,
      active: active === 1,
      icon,
      description,
      order,
      subcategories: rawSubcategories,
      createdAt: new Date().toISOString()
    };

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Categoría Creada',
      details: `Categoría "${name}" (ID: ${id}) guardada exitosamente en la tabla MySQL categorias.`,
      status: 'success'
    });

    res.status(201).json({ success: true, data: createdCategory });
  } catch (error: any) {
    console.error('[POST /categories Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al guardar la categoría en MySQL' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const rawId = req.params.id || req.body?.id;
    const targetId = decodeURIComponent(String(rawId || '').trim());

    if (!targetId) {
      return res.status(400).json({ success: false, message: 'ID de categoría no especificado.' });
    }

    // Validar que no se intente sobreescribir con datos de producto
    const validation = validateCategoryPayload({ ...req.body, id: targetId });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CATEGORY_PAYLOAD',
        message: validation.message
      });
    }

    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es obligatorio.'
      });
    }

    const slug = String(req.body?.slug || '').trim() || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const active = req.body?.active !== false ? 1 : 0;
    const icon = String(req.body?.icon || 'Sparkles').trim();
    const description = String(req.body?.description || '').trim();
    const order = Number(req.body?.order !== undefined ? req.body.order : 1);

    // Serializar subcategorías con JSON.stringify() antes de actualizar en MySQL
    const rawSubcategories = Array.isArray(req.body?.subcategories) ? req.body.subcategories : [];
    const subcategoriesJson = JSON.stringify(rawSubcategories);

    // Consulta directa UPDATE categorias en MySQL
    await pool.query(
      'UPDATE categorias SET name = ?, slug = ?, active = ?, icon = ?, description = ?, `order` = ?, subcategories = ? WHERE id = ?',
      [name, slug, active, icon, description, order, subcategoriesJson, targetId]
    );

    const updatedCategory = {
      id: targetId,
      name,
      slug,
      active: active === 1,
      icon,
      description,
      order,
      subcategories: rawSubcategories,
      updatedAt: new Date().toISOString()
    };

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Categoría Modificada',
      details: `Categoría "${name}" (ID: ${targetId}) actualizada en tabla MySQL categorias.`,
      status: 'success'
    });

    res.json({ success: true, data: updatedCategory });
  } catch (error: any) {
    console.error('[PUT /categories Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al actualizar la categoría en MySQL' });
  }
});

// Acepta eliminación individual o múltiple sin importar el prefijo (cat-, prod-, etc.)
router.delete(['/categories/batch', '/categories/:id', '/categories'], async (req, res) => {
  try {
    const rawIds = req.body?.ids || req.body?.categoryIds || req.query?.ids || req.params.id || req.query.id || req.body?.id;

    let idsList: string[] = [];
    if (Array.isArray(rawIds)) {
      idsList = rawIds;
    } else if (typeof rawIds === 'string') {
      idsList = rawIds.includes(',') ? rawIds.split(',') : [rawIds];
    }

    const idsToDelete = idsList
      .map(id => decodeURIComponent(String(id || '').trim()))
      .filter(Boolean);

    if (idsToDelete.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron IDs válidos para eliminar de categorías.'
      });
    }

    // Consulta directa DELETE FROM categorias en MySQL
    const placeholders = idsToDelete.map(() => '?').join(', ');
    await pool.query(`DELETE FROM categorias WHERE id IN (${placeholders})`, idsToDelete);

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Categorías Eliminadas',
      details: `${idsToDelete.length} categoría(s) eliminada(s) de la tabla MySQL categorias: ${idsToDelete.join(', ')}.`,
      status: 'info'
    });

    res.json({
      success: true,
      deletedCount: idsToDelete.length,
      deletedIds: idsToDelete,
      message: idsToDelete.length === 1 
        ? `Categoría "${idsToDelete[0]}" eliminada exitosamente.` 
        : `Se eliminaron ${idsToDelete.length} categorías exitosamente de MySQL.`
    });
  } catch (error: any) {
    console.error('[DELETE /categories Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al eliminar categorías en MySQL' });
  }
});

// Endpoint POST para clientes o proxies HTTP que restrinjan el envío de cuerpo en peticiones DELETE
router.post('/categories/batch-delete', async (req, res) => {
  try {
    const rawIds = req.body?.ids || req.body?.categoryIds;
    const idsList = Array.isArray(rawIds) ? rawIds : (typeof rawIds === 'string' ? rawIds.split(',') : []);

    const idsToDelete = idsList
      .map(id => decodeURIComponent(String(id || '').trim()))
      .filter(Boolean);

    if (idsToDelete.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar un array "ids" con los identificadores de categorías a eliminar.'
      });
    }

    const placeholders = idsToDelete.map(() => '?').join(', ');
    await pool.query(`DELETE FROM categorias WHERE id IN (${placeholders})`, idsToDelete);

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Eliminación Múltiple de Categorías',
      details: `${idsToDelete.length} categoría(s) eliminada(s) en lote de MySQL categorias: ${idsToDelete.join(', ')}.`,
      status: 'info'
    });

    res.json({
      success: true,
      deletedCount: idsToDelete.length,
      deletedIds: idsToDelete,
      message: `Se eliminaron ${idsToDelete.length} categorías exitosamente de la base de datos MySQL.`
    });
  } catch (error: any) {
    console.error('[POST /categories/batch-delete Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al eliminar categorías en lote' });
  }
});

// ==========================================
// 3. PRODUCTS CRUD
// ==========================================
router.get('/products', async (req, res) => {
  try {
    let productsList: any[] = [];

    // 1. Consulta SQL directa a la tabla física productos en MySQL cPanel (priorizando `productos`)
    try {
      const [altRows]: any = await pool.query('SELECT * FROM productos ORDER BY created_at DESC');
      if (Array.isArray(altRows) && altRows.length > 0) {
        productsList = altRows;
      } else {
        const [sqlRows]: any = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        if (Array.isArray(sqlRows) && sqlRows.length > 0) {
          productsList = sqlRows;
        }
      }
    } catch (sqlErr: any) {
      console.warn('[Admin GET /products MySQL Error]:', sqlErr.message);
    }

    // 2. Mapeo y filtrado seguro (sin re-inyección de datos de prueba)
    const dropiMap = dropiBackupService.getBackupMap();
    const mapped = productsList
      .filter((row: any) => !isTestProduct(row))
      .map((row: any) => {
        let images: string[] = [];
        if (Array.isArray(row.images) && row.images.length > 0) {
          images = row.images;
        } else if (Array.isArray(row.imagenes) && row.imagenes.length > 0) {
          images = row.imagenes;
        } else if (typeof row.imagenes === 'string' && row.imagenes.trim()) {
          try {
            const parsed = JSON.parse(row.imagenes);
            images = Array.isArray(parsed) ? parsed : [row.imagenes];
          } catch {
            images = row.imagenes.includes(',') ? row.imagenes.split(',').map((s: string) => s.trim()) : [row.imagenes];
          }
        } else if (typeof row.images === 'string' && row.images.trim()) {
          try {
            const parsed = JSON.parse(row.images);
            images = Array.isArray(parsed) ? parsed : [row.images];
          } catch {
            images = row.images.includes(',') ? row.images.split(',').map((s: string) => s.trim()) : [row.images];
          }
        } else if (row.imagen) {
          images = [row.imagen];
        } else if (row.image) {
          images = [row.image];
        }

        const mainImage = images.length > 0 ? images[0] : (row.imagen || row.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800');
        if (images.length === 0) {
          images = [mainImage];
        }

        const dropiProductId = row.dropi_product_id !== undefined && row.dropi_product_id !== null && String(row.dropi_product_id).trim() !== ''
          ? String(row.dropi_product_id).trim()
          : (row.dropiProductId !== undefined && row.dropiProductId !== null && String(row.dropiProductId).trim() !== ''
            ? String(row.dropiProductId).trim()
            : (dropiMap[String(row.id)] || ''));

        const price = Number(row.price !== undefined ? row.price : row.precio) || 0;
        const supplierCost = Number(row.supplier_cost !== undefined ? row.supplier_cost : (row.costPrice || 0)) || 0;
        const suggestedPrice = Number(row.suggested_price !== undefined ? row.suggested_price : (row.compareAtPrice || 0)) || 0; // sin "antes" inventado: solo cuenta un precio anterior real

        // Extracción robusta de categoría (evita que 'General' eclipse una categoría real)
        let resolvedCategory = 'General';
        const rawCat = row.categoria || row.category || row.category_name;
        if (row.categoria && String(row.categoria).trim() && String(row.categoria).trim().toLowerCase() !== 'general') {
          resolvedCategory = String(row.categoria).trim();
        } else if (row.category && String(row.category).trim() && String(row.category).trim().toLowerCase() !== 'general') {
          resolvedCategory = String(row.category).trim();
        } else if (rawCat && String(rawCat).trim()) {
          resolvedCategory = String(rawCat).trim();
        }

        let resolvedCategoryId = row.category_id || row.categoria_id || '';
        if (!resolvedCategoryId || resolvedCategoryId === 'cat-general') {
          const clean = resolvedCategory.toLowerCase().replace(/^[^\w\s]+/, '').trim();
          const matched = db.getCategories().find(c => {
            const cClean = c.name.toLowerCase().replace(/^[^\w\s]+/, '').trim();
            return c.id.toLowerCase() === clean ||
                   c.slug.toLowerCase() === clean ||
                   cClean === clean ||
                   cClean.includes(clean) ||
                   clean.includes(cClean);
          });
          if (matched) {
            resolvedCategoryId = matched.id;
            if (resolvedCategory === 'General' || resolvedCategory === resolvedCategoryId) {
              resolvedCategory = matched.name;
            }
          } else {
            resolvedCategoryId = 'cat-general';
          }
        }

        return {
          id: String(row.id),
          title: row.title || row.nombre || row.name || 'Producto Zavela',
          name: row.title || row.nombre || row.name || 'Producto Zavela',
          nombre: row.title || row.nombre || row.name || 'Producto Zavela',
          slug: row.slug || String(row.id),
          price,
          precio: price,
          costPrice: supplierCost,
          supplier_cost: supplierCost,
          compareAtPrice: suggestedPrice,
          suggested_price: suggestedPrice,
          shippingCost: Number(row.shipping_cost !== undefined && row.shipping_cost !== null ? row.shipping_cost : (row.flete_envio ?? row.flete ?? 0)),
          shipping_cost: Number(row.shipping_cost !== undefined && row.shipping_cost !== null ? row.shipping_cost : (row.flete_envio ?? row.flete ?? 0)),
          flete_envio: Number(row.flete_envio !== undefined && row.flete_envio !== null ? row.flete_envio : (row.shipping_cost ?? 0)),
          flete: Number(row.flete !== undefined && row.flete !== null ? row.flete : (row.shipping_cost ?? 0)),
          estimatedShippingCost: Number(row.shipping_cost !== undefined && row.shipping_cost !== null ? row.shipping_cost : (row.flete_envio ?? row.flete ?? 0)),
          dropiFee: Number(row.dropi_fee ?? (row as any).dropiFee ?? 0),
          dropi_fee: Number(row.dropi_fee ?? (row as any).dropiFee ?? 0),
          stock: Number(row.stock !== undefined ? row.stock : 10),
          description: row.description !== undefined ? row.description : (row.descripcion || ''),
          descripcion: row.description !== undefined ? row.description : (row.descripcion || ''),
          category: resolvedCategory,
          categoria: resolvedCategory,
          categoryName: resolvedCategory,
          categoryId: resolvedCategoryId,
          category_id: resolvedCategoryId,
          categoria_id: resolvedCategoryId,
          image: mainImage,
          imagen: mainImage,
          images,
          imagenes: images,
          dropi_product_id: dropiProductId,
          dropiProductId: dropiProductId,
          provider: row.provider || (dropiProductId ? 'dropi' : 'direct'),
          supplier: row.supplier || (row.provider === 'derocha' ? 'DeRocha' : (dropiProductId ? 'Dropi Colombia' : 'Bodega Directa')),
          supplier_sku: row.supplier_sku || undefined,
          variants: (() => {
            let vList: any[] = [];
            const rawV = row.variants || row.variantes || row.sizes;
            if (Array.isArray(rawV)) vList = rawV;
            else if (typeof rawV === 'string' && rawV.trim()) {
              try { const parsed = JSON.parse(rawV); if (Array.isArray(parsed)) vList = parsed; } catch {
                if (rawV.includes(',')) {
                  vList = rawV.split(',').map((s: string, idx: number) => ({
                    id: `var-${row.id}-${idx}`,
                    name: s.trim(),
                    size: s.trim(),
                    talla: s.trim(),
                    stock: Number(row.stock) || 10,
                    price
                  }));
                }
              }
            }
            return vList.map((v: any, idx: number) => {
              if (typeof v === 'string') {
                return {
                  id: `var-${row.id}-${idx}`,
                  name: v.trim(),
                  size: v.trim(),
                  talla: v.trim(),
                  stock: Number(row.stock) || 10,
                  price
                };
              }
              const sName = v.size || v.talla || (v.name?.includes('/') ? v.name.split('/')[1]?.trim() : (v.name || 'Única'));
              const cName = v.color || (v.name?.includes('/') ? v.name.split('/')[0]?.trim() : (v.color || 'Color Único'));
              return {
                ...v,
                id: String(v.id || `var-${row.id}-${idx}`),
                name: v.name || `${cName} / ${sName}`,
                color: cName,
                size: sName,
                talla: sName,
                stock: v.stock !== undefined ? Number(v.stock) : (Number(row.stock) || 10),
                price: v.price !== undefined ? Number(v.price) : price
              };
            });
          })(),
          variantes: (() => {
            let vList: any[] = [];
            const rawV = row.variants || row.variantes || row.sizes;
            if (Array.isArray(rawV)) vList = rawV;
            else if (typeof rawV === 'string' && rawV.trim()) {
              try { const parsed = JSON.parse(rawV); if (Array.isArray(parsed)) vList = parsed; } catch {}
            }
            return vList;
          })(),
          active: row.active !== undefined 
            ? Boolean(row.active === 1 || row.active === true || row.active === '1' || row.status === 'active' || row.estado === 'activo')
            : (row.status === 'inactive' || row.estado === 'inactivo' ? false : true),
          status: (row.active === 0 || row.active === false || row.active === '0' || row.status === 'inactive' || row.estado === 'inactivo') ? 'inactive' : 'active',
          estado: (row.active === 0 || row.active === false || row.active === '0' || row.status === 'inactive' || row.estado === 'inactivo') ? 'inactivo' : 'activo',
          featured: Boolean(row.featured === 1 || row.featured === true || row.featured === '1'),
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
        };
      });

    const withCampaign = mapped.map(applyCampaignDisplay).map(p => canSeeCosts(res) ? p : redactProductCosts(p));
    res.json({ success: true, count: withCampaign.length, data: withCampaign });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/products/:id - Consulta de lectura individual explícita con shipping_cost
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let foundRow: any = null;

    try {
      const [altRows]: any = await pool.query(
        'SELECT id, nombre, precio, supplier_cost, suggested_price, shipping_cost, stock, descripcion, categoria, category, category_id, dropi_product_id, provider, supplier, supplier_sku, imagen, imagenes, raw_dropi_payload, variants, active, status, estado, created_at, updated_at FROM productos WHERE id = ? LIMIT 1',
        [id]
      );
      if (Array.isArray(altRows) && altRows.length > 0) {
        foundRow = altRows[0];
      } else {
        const [sqlRows]: any = await pool.query(
          'SELECT id, title, name, slug, price, supplier_cost, suggested_price, shipping_cost, stock, description, dropi_product_id, provider, supplier, supplier_sku, category, category_id, images, raw_dropi_payload, variants, active, status, estado, created_at, updated_at FROM products WHERE id = ? OR slug = ? LIMIT 1',
          [id, id]
        );
        if (Array.isArray(sqlRows) && sqlRows.length > 0) {
          foundRow = sqlRows[0];
        }
      }
    } catch (sqlErr: any) {
      console.warn('[Admin GET /products/:id MySQL Error]:', sqlErr.message);
    }

    if (foundRow) {
      const dropiMap = dropiBackupService.getBackupMap();
      const dropiId = foundRow.dropi_product_id !== undefined && foundRow.dropi_product_id !== null && String(foundRow.dropi_product_id).trim() !== ''
        ? String(foundRow.dropi_product_id).trim()
        : (dropiMap[String(foundRow.id)] || '');

      let images: string[] = [];
      if (Array.isArray(foundRow.images) && foundRow.images.length > 0) images = foundRow.images;
      else if (Array.isArray(foundRow.imagenes) && foundRow.imagenes.length > 0) images = foundRow.imagenes;
      else if (typeof foundRow.imagenes === 'string' && foundRow.imagenes.trim()) {
        try { images = JSON.parse(foundRow.imagenes); } catch { images = [foundRow.imagenes]; }
      } else if (typeof foundRow.images === 'string' && foundRow.images.trim()) {
        try { images = JSON.parse(foundRow.images); } catch { images = [foundRow.images]; }
      } else if (foundRow.imagen) images = [foundRow.imagen];
      else if (foundRow.image) images = [foundRow.image];

      const price = Number(foundRow.price !== undefined ? foundRow.price : foundRow.precio) || 0;
      const supplierCost = Number(foundRow.supplier_cost !== undefined ? foundRow.supplier_cost : (foundRow.costPrice || 0)) || 0;
      const suggestedPrice = Number(foundRow.suggested_price !== undefined ? foundRow.suggested_price : (foundRow.compareAtPrice || 0)) || 0; // sin "antes" inventado
      const shippingCost = Number(foundRow.shipping_cost !== undefined && foundRow.shipping_cost !== null ? foundRow.shipping_cost : (foundRow.flete_envio ?? foundRow.flete ?? 0));

      const productData = {
        id: String(foundRow.id),
        title: foundRow.title || foundRow.nombre || foundRow.name || 'Producto Zavela',
        name: foundRow.title || foundRow.nombre || foundRow.name || 'Producto Zavela',
        nombre: foundRow.title || foundRow.nombre || foundRow.name || 'Producto Zavela',
        slug: foundRow.slug || String(foundRow.id),
        price,
        precio: price,
        costPrice: supplierCost,
        supplier_cost: supplierCost,
        compareAtPrice: suggestedPrice,
        suggested_price: suggestedPrice,
        shippingCost: shippingCost,
        shipping_cost: shippingCost,
        flete_envio: shippingCost,
        flete: shippingCost,
        estimatedShippingCost: shippingCost,
        dropiFee: Number(foundRow.dropi_fee ?? foundRow.dropiFee ?? 0),
        dropi_fee: Number(foundRow.dropi_fee ?? foundRow.dropiFee ?? 0),
        stock: Number(foundRow.stock !== undefined ? foundRow.stock : 10),
        description: foundRow.description !== undefined ? foundRow.description : (foundRow.descripcion || ''),
        descripcion: foundRow.description !== undefined ? foundRow.description : (foundRow.descripcion || ''),
        category: foundRow.categoria || foundRow.category || 'General',
        categoria: foundRow.categoria || foundRow.category || 'General',
        categoryName: foundRow.categoria || foundRow.category || 'General',
        categoryId: foundRow.category_id || foundRow.categoria_id || 'cat-general',
        category_id: foundRow.category_id || foundRow.categoria_id || 'cat-general',
        categoria_id: foundRow.category_id || foundRow.categoria_id || 'cat-general',
        image: images[0] || '',
        imagen: images[0] || '',
        images,
        imagenes: images,
        dropi_product_id: dropiId,
        dropiProductId: dropiId,
        provider: foundRow.provider || (dropiId ? 'dropi' : 'direct'),
        supplier: foundRow.supplier || (dropiId ? 'Dropi Colombia' : 'Bodega Directa'),
        supplier_sku: foundRow.supplier_sku || undefined,
        active: foundRow.active !== undefined 
          ? Boolean(foundRow.active === 1 || foundRow.active === true || foundRow.active === '1')
          : true
      };

      return res.json({ success: true, data: canSeeCosts(res) ? applyCampaignDisplay(productData) : redactProductCosts(applyCampaignDisplay(productData)) });
    }

    const fallback = db.getProductById(id);
    if (fallback) {
      const fallbackShipping = Number((fallback as any).shippingCost ?? (fallback as any).shipping_cost ?? (fallback as any).flete_envio ?? (fallback as any).flete ?? fallback.estimatedShippingCost ?? 0);
      const fallbackFee = Number((fallback as any).dropiFee ?? (fallback as any).dropi_fee ?? 0);
      const fallbackData: any = {
        ...fallback,
        shippingCost: fallbackShipping,
        shipping_cost: fallbackShipping,
        estimatedShippingCost: fallbackShipping,
        flete_envio: fallbackShipping,
        flete: fallbackShipping,
        dropiFee: fallbackFee,
        dropi_fee: fallbackFee
      };
      return res.json({ success: true, data: canSeeCosts(res) ? fallbackData : redactProductCosts(fallbackData) });
    }

    res.status(404).json({ success: false, message: 'Producto no encontrado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper para ejecutar UPDATE unificado en productos (evita duplicación)
async function executeProductUpdate(productId: string, body: any) {
  let existing = db.getProductById(productId);
  if (!existing) {
    const all = db.getProducts();
    existing = all.find(p => p.id === productId || p.slug === productId || p.slug === body.slug);
  }

  const costPrice = body.costPrice !== undefined ? Number(body.costPrice) : (body.costo !== undefined ? Number(body.costo) : (existing?.costPrice || 0));
  const price = body.price !== undefined ? Number(body.price) : (body.precio !== undefined ? Number(body.precio) : (existing?.price || 0));
  const shippingCost = Number(body.shippingCost ?? body.shipping_cost ?? body.flete_envio ?? body.flete ?? body.estimatedShippingCost ?? ((existing as any)?.shippingCost ?? (existing as any)?.shipping_cost ?? (existing as any)?.flete_envio ?? existing?.estimatedShippingCost ?? 0));
  const dropiFee = Number(body.dropiFee ?? body.dropi_fee ?? ((existing as any)?.dropiFee ?? (existing as any)?.dropi_fee ?? 0));
  const marginAmount = price - costPrice;
  const marginPercentage = costPrice > 0 ? (marginAmount / costPrice) * 100 : 0;
  const compareAtPrice = body.compareAtPrice !== undefined ? Number(body.compareAtPrice) : (existing?.compareAtPrice || 0);
  const discountPercentage = (compareAtPrice && compareAtPrice > price) 
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) 
    : 0;

  let finalImages = existing?.images || [];
  if (Array.isArray(body.images) && body.images.length > 0) {
    const filtered = body.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    if (filtered.length > 0) finalImages = filtered;
  } else if (Array.isArray(body.imagenes) && body.imagenes.length > 0) {
    const filtered = body.imagenes.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    if (filtered.length > 0) finalImages = filtered;
  } else if (typeof body.imagenes === 'string' && body.imagenes.trim()) {
    try {
      const parsed = JSON.parse(body.imagenes);
      if (Array.isArray(parsed) && parsed.length > 0) finalImages = parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    } catch {}
  } else if (body.image || body.imagen) {
    const single = (body.image || body.imagen).trim();
    if (single) {
      finalImages = [single, ...(existing?.images?.filter((i: string) => i !== single) || [])];
    }
  }

  if (finalImages.length === 0) {
    finalImages = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];
  }
  const mainImage = finalImages[0];

  // Blindaje de dropi_product_id: Si viene vacío o indefinido, conservar el valor anterior
  const rawIncomingDropi = body.dropi_product_id !== undefined && body.dropi_product_id !== null && String(body.dropi_product_id).trim() !== ''
    ? String(body.dropi_product_id).trim()
    : (body.dropiProductId !== undefined && body.dropiProductId !== null && String(body.dropiProductId).trim() !== ''
      ? String(body.dropiProductId).trim()
      : (body.dropi_id !== undefined && body.dropi_id !== null && String(body.dropi_id).trim() !== ''
        ? String(body.dropi_id).trim()
        : ''));

  const existingDropi = existing?.dropi_product_id !== undefined && existing?.dropi_product_id !== null && String(existing.dropi_product_id).trim() !== ''
    ? String(existing.dropi_product_id).trim()
    : ((existing as any)?.dropiProductId ? String((existing as any).dropiProductId).trim() : '');

  // Lógica COALESCE(NULLIF(incoming, ''), dropi_product_id)
  const dropiProductId = rawIncomingDropi !== '' ? rawIncomingDropi : existingDropi;

  // Extracción estricta y preservación de Categoría (evita reseteos a categoría por defecto)
  const rawCat = body.categoria || body.category || body.categoryName || body.categoria_nombre;
  let categoryName = rawCat ? String(rawCat).trim() : ((existing as any)?.categoria || (existing as any)?.category || existing?.categoryName || 'General');
  let categoryId = body.categoryId || body.categoria_id || body.category_id || existing?.categoryId || 'cat-general';

  const matchedCat = db.getCategories().find(c => {
    const clean = categoryName.toLowerCase().replace(/^[^\w\s]+/, '').trim();
    const cClean = c.name.toLowerCase().replace(/^[^\w\s]+/, '').trim();
    return c.id === categoryId ||
           c.slug === categoryId ||
           c.id.toLowerCase() === clean ||
           c.slug.toLowerCase() === clean ||
           cClean === clean ||
           cClean.includes(clean) ||
           clean.includes(cClean);
  });
  if (matchedCat) {
    categoryId = matchedCat.id;
    if (categoryName === 'General' || categoryName === categoryId || categoryName === matchedCat.slug) {
      categoryName = matchedCat.name;
    }
  }

  const effectiveProvider = body.provider || (dropiProductId ? 'dropi' : 'direct');
  const effectiveSupplier = body.supplier || (effectiveProvider === 'derocha' ? 'DeRocha' : (dropiProductId ? 'Dropi Colombia' : 'Bodega Directa'));
  const effectiveSupplierSku = body.supplier_sku || body.supplierSku || null;

  const updated: Product = {
      id: productId,
      title: (body.title || body.nombre || body.name || existing?.title || 'Producto').trim(),
      slug: body.slug || existing?.slug || productId,
      description: body.description !== undefined ? body.description : (body.descripcion !== undefined ? body.descripcion : (existing?.description || '')),
      shortDescription: body.shortDescription !== undefined ? body.shortDescription : (existing?.shortDescription || ''),
      price,
      costPrice,
      compareAtPrice,
      discountPercentage,
      marginAmount,
      marginPercentage: Math.round(marginPercentage * 10) / 10,
      stock: body.stock !== undefined ? Number(body.stock) : (body.inventario !== undefined ? Number(body.inventario) : (existing?.stock ?? 10)),
      active: body.active !== undefined ? Boolean(body.active) : (existing?.active ?? true),
      featured: body.featured !== undefined ? Boolean(body.featured) : (existing?.featured ?? false),
      images: finalImages,
      warrantyInfo: body.warrantyInfo || existing?.warrantyInfo || '30 días de garantía oficial Zavela Store.',
      tags: Array.isArray(body.tags) ? body.tags : (existing?.tags || ['tendencia']),
      weightKg: body.weightKg !== undefined ? Number(body.weightKg) : (existing?.weightKg || 0.5),
      categoryId,
      categoryName,
      category: categoryName,
      categoria: categoryName,
      categoria_id: categoryId,
      warehouseCity: body.warehouseCity || existing?.warehouseCity || 'Bogotá D.C.',
      brand: body.brand || existing?.brand || 'Zavela Store',
      dropi_product_id: dropiProductId,
      dropiProductId: dropiProductId,
      provider: effectiveProvider,
      supplier: effectiveSupplier,
      shippingCost: shippingCost,
      shipping_cost: shippingCost,
      flete_envio: shippingCost,
      flete: shippingCost,
      estimatedShippingCost: shippingCost,
      dropiFee: dropiFee,
      dropi_fee: dropiFee,
      variants: Array.isArray(body.variants) ? body.variants : (existing?.variants || []),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveProduct(updated);

    if (dropiProductId) {
      dropiBackupService.saveDropiId(productId, dropiProductId);
    }

    const isActiveInt = (body.active === 1 || body.active === true || body.status === 'active' || body.estado === 'activo' || (body.active === undefined && existing?.active !== false)) ? 1 : 0;

    // Ejecutar UPDATE en MySQL directamente en ambas tablas protegiendo dropi_product_id y guardando category:
    try {
      // 1. Confirmar actualización explícita de categoria, category y category_id en la tabla productos (MySQL cPanel)
      await pool.query(`
        UPDATE productos SET 
          categoria = ?, 
          category = ?, 
          category_id = ? 
        WHERE id = ?
      `, [categoryName, categoryName, categoryId, productId]);

      const imagesJson = JSON.stringify(finalImages);
      await pool.query(`
        UPDATE productos 
        SET 
          nombre = ?,
          precio = ?,
          supplier_cost = ?,
          suggested_price = ?,
          shipping_cost = ?,
          flete_envio = ?,
          flete = ?,
          dropi_fee = ?,
          stock = ?,
          descripcion = ?,
          categoria = ?,
          category = ?,
          category_id = ?,
          provider = ?,
          supplier = ?,
          supplier_sku = ?,
          imagen = ?,
          imagenes = ?,
          dropi_product_id = COALESCE(NULLIF(?, ''), dropi_product_id),
          active = ?,
          variants = ?,
          variantes = ?,
          sizes = ?,
          updated_at = NOW()
        WHERE id = ? OR slug = ?
      `, [
        saved.title,
        saved.price,
        costPrice,
        compareAtPrice,
        shippingCost,
        shippingCost,
        shippingCost,
        dropiFee,
        saved.stock,
        saved.description,
        categoryName,
        categoryName,
        categoryId,
        effectiveProvider,
        effectiveSupplier,
        effectiveSupplierSku,
        mainImage,
        imagesJson,
        rawIncomingDropi || '',
        isActiveInt,
        JSON.stringify(saved.variants || []),
        JSON.stringify(saved.variants || []),
        JSON.stringify(saved.variants || []),
        productId,
        productId
      ]);
    } catch (err: any) {
      console.warn('[MySQL Product UPDATE Warning productos]:', err.message);
    }

    try {
      const imagesJson = JSON.stringify(finalImages);
      await pool.query(`
        UPDATE products 
        SET 
          title = ?,
          price = ?,
          supplier_cost = ?,
          suggested_price = ?,
          shipping_cost = ?,
          dropi_fee = ?,
          stock = ?,
          descripcion = ?,
          description = ?,
          category = ?,
          category_id = ?,
          provider = ?,
          supplier = ?,
          supplier_sku = ?,
          imagen = ?,
          image = ?,
          imagenes = ?,
          images = ?,
          dropi_product_id = COALESCE(NULLIF(?, ''), dropi_product_id),
          active = ?,
          variants = ?,
          variantes = ?,
          sizes = ?,
          updated_at = NOW()
        WHERE id = ? OR slug = ?
      `, [
        saved.title,
        saved.price,
        costPrice,
        compareAtPrice,
        shippingCost,
        dropiFee,
        saved.stock,
        saved.description,
        saved.description,
        categoryName,
        categoryId,
        effectiveProvider,
        effectiveSupplier,
        effectiveSupplierSku,
        mainImage,
        mainImage,
        imagesJson,
        imagesJson,
        rawIncomingDropi || '',
        isActiveInt,
        JSON.stringify(saved.variants || []),
        JSON.stringify(saved.variants || []),
        JSON.stringify(saved.variants || []),
        productId,
        productId
      ]);
    } catch (err: any) {
      console.warn('[MySQL Product UPDATE Warning products]:', err.message);
    }

  // Sincronizar actualización de producto con MySQL en cPanel vía POST /api.php?action=productos
  cpanelDbService.saveProduct({
    ...saved,
    imagen: mainImage,
    imagenes: finalImages,
    dropi_product_id: dropiProductId
  } as any).catch(err => {
    console.warn('[cPanel DB Sync] Error al actualizar producto en cPanel:', err);
  });

  return saved;
}

router.post('/products', async (req, res) => {
  try {
    const body = req.body;
    if (isTestProduct(body)) {
      return res.status(400).json({
        success: false,
        message: 'No se permite la creación de productos de prueba o simulación en el catálogo.'
      });
    }
    const targetId = body.id || body.productId;

    // Si ya existe el producto con ese ID, actualizarlo (UPDATE) en lugar de crear un duplicado
    const existing = targetId ? (db.getProductById(targetId) || db.getProducts().find(p => p.id === targetId || p.slug === targetId)) : null;

    if (targetId && existing) {
      const saved = await executeProductUpdate(targetId, body);

      let socialPost = null;
      let facebookSync = null;

      if (body.publishToSocial === true) {
        socialPost = db.publishSocialPost({ productId: saved.id });
      }

      const fbConfig = await metaGraphService.getEffectiveFacebookConfig();
      const shouldPublishToFb = body.publishToFacebook === true || 
        (body.publishToFacebook !== false && fbConfig.connected && fbConfig.autoPostEnabled);

      if (shouldPublishToFb) {
        try {
          facebookSync = await metaGraphService.publishProductToFacebook(saved);
        } catch (fbErr: any) {
          facebookSync = { success: false, message: `Fallo al publicar en Facebook: ${fbErr.message}` };
        }
      }

      db.addLog({
        type: 'PRODUCT_UPDATE',
        action: 'Producto Actualizado (vía POST)',
        details: `Producto actualizado: "${saved.title}".`,
        status: 'success'
      });

      return res.status(200).json({ success: true, data: saved, socialPost, facebookSync });
    }

    // Creación de producto nuevo (INSERT)
    const costPrice = Number(body.costPrice || body.costo) || 0;
    const price = Number(body.price || body.precio) || 0;
    const marginAmount = price - costPrice;
    const marginPercentage = costPrice > 0 ? (marginAmount / costPrice) * 100 : 0;
    const compareAtPrice = Number(body.compareAtPrice || body.compare_price) || (price > 0 ? price + 20000 : 0);
    const discountPercentage = compareAtPrice > price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

    let rawImages: string[] = [];
    if (Array.isArray(body.images) && body.images.length > 0) {
      rawImages = body.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    } else if (Array.isArray(body.imagenes) && body.imagenes.length > 0) {
      rawImages = body.imagenes.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    } else if (typeof body.imagenes === 'string' && body.imagenes.trim()) {
      try {
        const parsed = JSON.parse(body.imagenes);
        if (Array.isArray(parsed)) rawImages = parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
      } catch {}
    }

    if (rawImages.length === 0 && (body.image || body.imagen)) {
      const single = body.image || body.imagen;
      if (typeof single === 'string' && single.trim()) rawImages.push(single.trim());
    }

    const validImages = rawImages.length > 0 ? rawImages : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];
    const mainImage = validImages[0];

    const dropiProductId = body.dropi_product_id !== undefined && body.dropi_product_id !== null
      ? String(body.dropi_product_id).trim()
      : (body.dropiProductId !== undefined && body.dropiProductId !== null
        ? String(body.dropiProductId).trim()
        : (body.dropi_id !== undefined && body.dropi_id !== null ? String(body.dropi_id).trim() : ''));

    const title = (body.title || body.nombre || body.name || 'Nuevo Producto').trim();
    const slug = body.slug || title.toLowerCase().replace(/[^a-z0-9]/g, '-') || `prod-${Date.now()}`;
    const description = body.description !== undefined ? body.description : (body.descripcion || '');

    // Extracción estricta y preservación de Categoría para nuevo producto
    const rawPostCat = body.category || body.categoryName || body.categoria || body.category_name;
    const matchedPostCat = rawPostCat ? db.getCategories().find(c => 
      c.name.toLowerCase() === String(rawPostCat).toLowerCase() || 
      c.id.toLowerCase() === String(rawPostCat).toLowerCase() ||
      c.slug.toLowerCase() === String(rawPostCat).toLowerCase() ||
      String(rawPostCat).toLowerCase().includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(String(rawPostCat).toLowerCase())
    ) : null;
    const postCatName = rawPostCat ? (matchedPostCat?.name || String(rawPostCat).trim()) : 'General';
    const postCatId = body.categoryId || body.categoria_id || matchedPostCat?.id || 'cat-general';

    const effectiveNewProvider = body.provider || (dropiProductId ? 'dropi' : 'direct');
    const effectiveNewSupplier = body.supplier || (effectiveNewProvider === 'derocha' ? 'DeRocha' : (dropiProductId ? 'Dropi Colombia' : 'Bodega Directa'));

    const newProduct: Product = {
      id: targetId || `prod-${Date.now()}`,
      title,
      slug,
      description,
      shortDescription: body.shortDescription || body.descripcion_corta || '',
      price,
      costPrice,
      compareAtPrice,
      discountPercentage,
      marginAmount,
      marginPercentage: Math.round(marginPercentage * 10) / 10,
      stock: Number(body.stock !== undefined ? body.stock : (body.inventario !== undefined ? body.inventario : 0)),
      active: body.active !== false && body.activo !== false,
      featured: Boolean(body.featured || body.destacado),
      images: validImages,
      warrantyInfo: body.warrantyInfo || '30 días de garantía oficial Zavela Store por defectos de fábrica.',
      tags: Array.isArray(body.tags) ? body.tags : (body.tags ? String(body.tags).split(',').map((t: string) => t.trim()) : ['tendencia', 'calidad']),
      weightKg: Number(body.weightKg || body.peso) || 0.5,
      categoryId: postCatId,
      categoryName: postCatName,
      category: postCatName,
      categoria: postCatName,
      categoria_id: postCatId,
      warehouseCity: body.warehouseCity || 'Bogotá D.C.',
      brand: body.brand || 'Zavela Store',
      dropi_product_id: dropiProductId,
      dropiProductId: dropiProductId,
      provider: effectiveNewProvider,
      supplier: effectiveNewSupplier,
      shippingCost: Number(body.shippingCost ?? body.shipping_cost ?? body.flete_envio ?? body.flete ?? body.estimatedShippingCost ?? 0),
      shipping_cost: Number(body.shippingCost ?? body.shipping_cost ?? body.flete_envio ?? body.flete ?? body.estimatedShippingCost ?? 0),
      flete_envio: Number(body.shippingCost ?? body.shipping_cost ?? body.flete_envio ?? body.flete ?? body.estimatedShippingCost ?? 0),
      flete: Number(body.shippingCost ?? body.shipping_cost ?? body.flete_envio ?? body.flete ?? body.estimatedShippingCost ?? 0),
      estimatedShippingCost: Number(body.shippingCost ?? body.shipping_cost ?? body.flete_envio ?? body.flete ?? body.estimatedShippingCost ?? 0),
      dropiFee: Number(body.dropiFee ?? body.dropi_fee ?? 0),
      dropi_fee: Number(body.dropiFee ?? body.dropi_fee ?? 0),
      variants: Array.isArray(body.variants) ? body.variants : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newShippingCost = newProduct.shipping_cost;
    const newDropiFee = newProduct.dropi_fee;

    if (dropiProductId) {
      dropiBackupService.saveDropiId(newProduct.id, dropiProductId);
    }

    const effectiveNewSupplierSku = body.supplier_sku || body.supplierSku || null;
    const isNewActiveInt = (body.active === 1 || body.active === true || body.status === 'active' || body.estado === 'activo' || (body.active === undefined && body.activo !== false)) ? 1 : 0;

    // Persistir físicamente en MySQL cPanel
    try {
      await pool.query(`
        INSERT INTO products (
          id, title, name, slug, price, supplier_cost, suggested_price, shipping_cost, flete_envio, dropi_fee, stock, description, category, category_id,
          provider, supplier, supplier_sku, dropi_product_id, images, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          name = VALUES(name),
          slug = VALUES(slug),
          price = VALUES(price),
          supplier_cost = VALUES(supplier_cost),
          suggested_price = VALUES(suggested_price),
          shipping_cost = VALUES(shipping_cost),
          flete_envio = VALUES(flete_envio),
          dropi_fee = VALUES(dropi_fee),
          stock = VALUES(stock),
          description = VALUES(description),
          category = VALUES(category),
          category_id = VALUES(category_id),
          provider = VALUES(provider),
          supplier = VALUES(supplier),
          supplier_sku = VALUES(supplier_sku),
          dropi_product_id = VALUES(dropi_product_id),
          images = VALUES(images),
          active = VALUES(active),
          updated_at = NOW()
      `, [
        newProduct.id, title, title, slug, price, costPrice, compareAtPrice, newShippingCost, newShippingCost, newDropiFee, newProduct.stock, description,
        postCatName, postCatId, effectiveNewProvider, effectiveNewSupplier, effectiveNewSupplierSku,
        dropiProductId || null, JSON.stringify(validImages), isNewActiveInt
      ]);

      await pool.query(`
        INSERT INTO productos (
          id, nombre, precio, supplier_cost, suggested_price, shipping_cost, flete_envio, flete, dropi_fee, stock, descripcion, categoria, category, category_id,
          provider, supplier, supplier_sku, dropi_product_id, imagen, imagenes, active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          nombre = VALUES(nombre),
          precio = VALUES(precio),
          supplier_cost = VALUES(supplier_cost),
          suggested_price = VALUES(suggested_price),
          shipping_cost = VALUES(shipping_cost),
          flete_envio = VALUES(flete_envio),
          flete = VALUES(flete),
          dropi_fee = VALUES(dropi_fee),
          stock = VALUES(stock),
          descripcion = VALUES(descripcion),
          categoria = VALUES(categoria),
          category = VALUES(category),
          category_id = VALUES(category_id),
          provider = VALUES(provider),
          supplier = VALUES(supplier),
          supplier_sku = VALUES(supplier_sku),
          dropi_product_id = VALUES(dropi_product_id),
          imagen = VALUES(imagen),
          imagenes = VALUES(imagenes),
          active = VALUES(active),
          updated_at = NOW()
      `, [
        newProduct.id, title, price, costPrice, compareAtPrice, newShippingCost, newShippingCost, newShippingCost, newDropiFee, newProduct.stock, description,
        postCatName, postCatName, postCatId, effectiveNewProvider, effectiveNewSupplier, effectiveNewSupplierSku,
        dropiProductId || null, mainImage, JSON.stringify(validImages), isNewActiveInt
      ]);

      // Confirmar actualización explícita de categoria, category y category_id en la tabla productos
      await pool.query(`
        UPDATE productos SET 
          categoria = ?, 
          category = ?, 
          category_id = ? 
        WHERE id = ?
      `, [postCatName, postCatName, postCatId, newProduct.id]);
    } catch (sqlErr: any) {
      console.warn('[Admin MySQL Save Product Error]:', sqlErr.message);
    }

    const saved = db.saveProduct({
      ...newProduct,
      dropi_product_id: dropiProductId,
      dropiProductId: dropiProductId
    });

    // Sincronizar producto con la base de datos MySQL en cPanel vía POST /api.php?action=productos
    cpanelDbService.saveProduct({
      ...saved,
      imagen: mainImage,
      imagenes: validImages,
      dropi_product_id: dropiProductId,
      dropiProductId: dropiProductId
    } as any).catch(err => {
      console.warn('[cPanel DB Sync] Error al guardar producto en cPanel:', err);
    });

    // Auto-broadcast a redes sociales y publicación directa en Facebook Meta Graph API v26.0
    let socialPost = null;
    let facebookSync = null;

    if (body.publishToSocial !== false) {
      socialPost = db.autoBroadcastProduct(saved);
    }

    const fbConfig = await metaGraphService.getEffectiveFacebookConfig();
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
    const saved = await executeProductUpdate(productId, body);

    let socialPost = null;
    let facebookSync = null;

    if (body.publishToSocial === true) {
      socialPost = db.publishSocialPost({ productId: saved.id });
    }

    // Publicación en Facebook no bloqueante con timeout para evitar colgar la petición
    if (body.publishToFacebook === true) {
      try {
        const fbPromise = metaGraphService.publishProductToFacebook(saved);
        const fbTimeout = new Promise(resolve => setTimeout(() => resolve({ success: false, message: 'Facebook publish timeout' }), 3500));
        facebookSync = await Promise.race([fbPromise, fbTimeout]);
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

    return res.status(200).json({
      success: true,
      message: "Producto actualizado correctamente",
      product: saved,
      data: saved,
      socialPost,
      facebookSync
    });
  } catch (error: any) {
    console.error("Error al actualizar producto:", error);
    return res.status(500).json({ success: false, error: error.message, message: error.message });
  }
});

// PATCH /api/admin/products/:id/toggle-active
router.patch('/products/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID de producto requerido' });
    }

    let newActive = req.body?.active;
    if (newActive === undefined) {
      const [rows]: any = await pool.query('SELECT active, status, estado FROM productos WHERE id = ? LIMIT 1', [id]);
      const current = rows && rows.length > 0 ? rows[0].active : 1;
      newActive = (current === 1 || current === true || current === '1') ? 0 : 1;
    } else {
      newActive = (newActive === 1 || newActive === true || newActive === '1' || newActive === 'active' || newActive === 'activo') ? 1 : 0;
    }

    const statusVal = newActive === 1 ? 'active' : 'inactive';
    const estadoVal = newActive === 1 ? 'activo' : 'inactivo';

    await pool.query(
      'UPDATE productos SET active = ?, status = ?, estado = ?, updated_at = NOW() WHERE id = ?',
      [newActive, statusVal, estadoVal, id]
    );

    try {
      await pool.query(
        'UPDATE products SET active = ?, status = ?, estado = ?, updated_at = NOW() WHERE id = ?',
        [newActive, statusVal, estadoVal, id]
      );
    } catch {}

    const prod = db.getProductById(id);
    if (prod) {
      db.saveProduct({ ...prod, active: newActive === 1, status: statusVal, estado: estadoVal } as any);
    }

    res.json({
      success: true,
      id,
      active: newActive === 1,
      status: statusVal,
      estado: estadoVal,
      message: newActive === 1 ? 'Visible / Activo: Producto activado en cPanel MySQL.' : 'Oculto: Producto pausado / ocultado en cPanel MySQL.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID de producto no proporcionado' });
    }

    // Eliminación limpia directa de MySQL sin bloqueos de clave foránea
    try {
      await pool.query('SET FOREIGN_KEY_CHECKS = 0');
      await pool.query('DELETE FROM productos WHERE id = ?', [id]);
      await pool.query('DELETE FROM products WHERE id = ?', [id]);
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (sqlErr: any) {
      console.warn('[MySQL Delete Product Warning]:', sqlErr.message);
      try { await pool.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
    }

    // Sincronizar eliminación local y cPanel
    dropiBackupService.removeDropiId(id);
    db.deleteProduct(id);
    cpanelDbService.deleteProduct(id).catch(() => {});

    db.addLog({
      type: 'PRODUCT_UPDATE',
      action: 'Producto Eliminado',
      details: `Producto con ID ${id} fue eliminado correctamente de MySQL.`,
      status: 'info'
    });

    return res.json({ success: true, message: 'Producto eliminado correctamente de MySQL' });
  } catch (error: any) {
    console.error('Error al eliminar producto de MySQL:', error);
    return res.status(500).json({ error: 'Error al eliminar producto', details: error.message });
  }
});

router.post('/products/bulk-delete', async (req, res) => {
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

      // Eliminación limpia directa de MySQL en lote sin bloqueos de clave foránea
      try {
        const placeholders = ids.map(() => '?').join(',');
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await pool.query(`DELETE FROM productos WHERE id IN (${placeholders})`, ids);
        await pool.query(`DELETE FROM products WHERE id IN (${placeholders})`, ids);
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (sqlErr: any) {
        console.warn('[MySQL Bulk Delete SQL Warning]:', sqlErr.message);
        try { await pool.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
      }
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
        dropiBackupService.removeDropiId(id);
        const ok = db.deleteProduct(id);
        if (ok) count++;
      }
    }

    db.addLog({
      type: 'PRODUCT_UPDATE',
      action: softDelete ? 'Productos Pausados en Lote' : 'Productos Eliminados en Lote',
      details: `${count} productos fueron ${softDelete ? 'ocultados de la tienda' : 'eliminados permanentemente de MySQL'}.`,
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
    let orders = db.getOrders({
      status: status as OrderStatus,
      search: search as string
    });
    if (!(res.locals as any).isAdmin) {
      // Seguimiento público: solo con una búsqueda concreta y con pocos datos.
      const q = String(search || '').trim();
      if (q.length < 6) return res.json({ success: true, data: [] });
      orders = orders.filter(o => exactMatch(o, q)).slice(0, 3).map(publicOrderView) as any;
    } else {
      orders = orders.map(o => {
        const a = advisorSales.getAttribution(o.id);
        return a ? { ...o, advisorId: a.advisorId, advisorName: a.advisorName, sellerCode: a.sellerCode, advisorCommissionRate: a.commissionRate } : o;
      }) as any;
    }
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
      carrier: req.body.transportadora || req.body.carrier || carrier || order.carrier,
      trackingNumber: req.body.numero_guia || req.body.guia || req.body.trackingNumber || trackingNumber || order.trackingNumber,
      cedula: req.body.cedula || order.cedula,
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
// 6. SETTINGS & CMS - PERSISTENCIA REAL EN MYSQL CPANEL
// ==========================================
// Quita de la configuración todo lo privado antes de enviarla a visitantes.
const PRIVATE_KEYS = /pass(word)?|secret|token|api_?key|credential/i;
const PRIVATE_BLOCKS = new Set(['whatsappCloudApi', 'whatsappAlerts', 'maintenanceNotifyLeads', 'adminUsername']);
function publicSettings(input: any): any {
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out: any = {};
      for (const [k, val] of Object.entries(v)) {
        if (PRIVATE_BLOCKS.has(k) || PRIVATE_KEYS.test(k)) continue;
        out[k] = walk(val);
      }
      return out;
    }
    return v;
  };
  return walk(input);
}

router.get('/settings', async (req, res) => {
  try {
    let settings = db.getSettings();

    // Consultar configuraciones persistidas en MySQL cPanel
    try {
      const [rows]: any = await pool.query(
        "SELECT clave, valor FROM configuraciones WHERE clave IN ('general_settings', 'hero_banners', 'hero_banner_style')"
      );

      if (Array.isArray(rows) && rows.length > 0) {
        let generalVal: any = {};
        for (const row of rows) {
          if (row.clave === 'general_settings' && row.valor) {
            try { generalVal = { ...generalVal, ...JSON.parse(row.valor) }; } catch {}
          } else if (row.clave === 'hero_banners' && row.valor) {
            try { generalVal.heroBanners = JSON.parse(row.valor); } catch {}
          } else if (row.clave === 'hero_banner_style' && row.valor) {
            generalVal.heroBannerStyle = row.valor;
          }
        }
        if (Object.keys(generalVal).length > 0) {
          settings = db.saveSettings(generalVal);
        }
      }
    } catch (mysqlErr: any) {
      console.warn('[MySQL cPanel Settings GET Warning]:', mysqlErr.message);
    }

    // Quien no es administrador solo recibe la versión pública, sin contraseñas, tokens ni datos privados.
    res.json({ success: true, data: (res.locals as any).isAdmin ? settings : publicSettings(settings) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const incoming = req.body?.settings || req.body;
    const updated = db.saveSettings(incoming);

    // Persistencia física en MySQL cPanel tabla `configuraciones`
    try {
      const serializedGeneral = JSON.stringify(updated);
      await pool.query(`
        INSERT INTO configuraciones (clave, valor, updated_at) 
        VALUES ('general_settings', ?, NOW())
        ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()
      `, [serializedGeneral]);

      // Si vienen heroBanners, persistir en `configuraciones` y en la tabla `banners`
      if (Array.isArray(incoming.heroBanners) || Array.isArray(updated.heroBanners)) {
        const bannersList = incoming.heroBanners || updated.heroBanners || [];
        const serializedBanners = JSON.stringify(bannersList);

        await pool.query(`
          INSERT INTO configuraciones (clave, valor, updated_at) 
          VALUES ('hero_banners', ?, NOW())
          ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()
        `, [serializedBanners]);

        for (const b of bannersList) {
          if (!b.id) continue;
          await pool.query(`
            INSERT INTO banners (
              id, title, subtitle, badge, badge_text, notification_text, tagline, cta_text, cta_link, image_url, video_url, has_video, active, banner_order, text_color, discount_badge, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
              title = VALUES(title),
              subtitle = VALUES(subtitle),
              badge = VALUES(badge),
              badge_text = VALUES(badge_text),
              notification_text = VALUES(notification_text),
              tagline = VALUES(tagline),
              cta_text = VALUES(cta_text),
              cta_link = VALUES(cta_link),
              image_url = VALUES(image_url),
              video_url = VALUES(video_url),
              has_video = VALUES(has_video),
              active = VALUES(active),
              banner_order = VALUES(banner_order),
              text_color = VALUES(text_color),
              discount_badge = VALUES(discount_badge),
              updated_at = NOW()
          `, [
            String(b.id),
            b.title || '',
            b.subtitle || '',
            b.badge || '',
            b.badgeText || '',
            b.notificationText || '',
            b.tagline || '',
            b.ctaText || 'Comprar Ahora',
            b.ctaLink || '#products',
            b.imageUrl || '',
            b.videoUrl || '',
            b.hasVideo ? 1 : 0,
            b.active !== false ? 1 : 0,
            Number(b.order) || 1,
            b.textColor || '#ffffff',
            b.discountBadge || ''
          ]);
        }
      }

      if (incoming.heroBannerStyle || updated.heroBannerStyle) {
        await pool.query(`
          INSERT INTO configuraciones (clave, valor, updated_at) 
          VALUES ('hero_banner_style', ?, NOW())
          ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()
        `, [incoming.heroBannerStyle || updated.heroBannerStyle]);
      }
    } catch (sqlErr: any) {
      console.warn('[MySQL cPanel Settings Save Warning]:', sqlErr.message);
    }

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Ajustes de Tienda Actualizados',
      details: 'Configuración guardada con éxito en cPanel MySQL.',
      status: 'success'
    });

    res.json({ 
      success: true, 
      message: 'Configuración guardada con éxito en cPanel MySQL',
      data: updated 
    });
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

// DELETE /api/admin/orders/:id - Delete single order by ID
router.delete('/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const targetOrder = db.getOrderById(orderId);
    const orderNumber = targetOrder?.orderNumber || orderId;

    // 1. Eliminación en store local
    db.deleteOrder(orderId);

    // 2. Eliminación directa en tablas MySQL si está conectada
    if (pool) {
      try {
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await pool.query('DELETE FROM order_items WHERE order_id = ? OR orderId = ?', [orderId, orderId]);
        await pool.query('DELETE FROM orders WHERE id = ? OR order_number = ?', [orderId, orderNumber]);
        await pool.query('DELETE FROM pedidos WHERE id = ? OR order_number = ?', [orderId, orderNumber]);
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log(`[MySQL Admin] ✓ Pedido ${orderNumber} (${orderId}) eliminado.`);
      } catch (sqlErr: any) {
        console.warn('[MySQL Admin Delete Order Warning]:', sqlErr.message);
        try { await pool.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
      }
    }

    db.addLog({
      type: 'STATUS_UPDATE',
      action: 'Pedido Eliminado',
      details: `Pedido ${orderNumber} (${orderId}) eliminado permanentemente.`,
      status: 'info'
    });

    res.json({ success: true, message: `Pedido ${orderNumber} eliminado con éxito.` });
  } catch (error: any) {
    console.error('Error al eliminar pedido en admin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/clean-tests - Clear test orders, simulated sales, test customers and test products
router.post('/clean-tests', (req, res) => {
  try {
    const result = db.cleanTestRecords();
    const parts = [
      result.deletedOrders > 0 ? `${result.deletedOrders} pedidos de prueba` : null,
      result.deletedCustomers > 0 ? `${result.deletedCustomers} clientes simulados` : null,
      (result as any).deletedProducts > 0 ? `${(result as any).deletedProducts} productos de prueba` : null
    ].filter(Boolean);

    const summaryText = parts.length > 0 ? parts.join(', ') : '0 registros de prueba';

    db.addLog({
      type: 'STATUS_UPDATE',
      action: 'Limpieza de Pruebas Internas',
      details: `Se borraron ${summaryText}. El catálogo de productos y la base de datos quedaron limpios para producción real con Dropi.`,
      status: 'info'
    });
    res.json({
      success: true,
      message: `Pruebas internas y simulaciones borradas con éxito (${summaryText} removidos).`,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Desactivar permanentemente endpoints de prueba o seed para que no se disparen de fondo
router.all(['/test-product', '/seed', '/products/test', '/products/seed'], (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Endpoints de prueba deshabilitados permanentemente. El catálogo gestiona únicamente productos reales creados por el administrador o importados de Dropi.'
  });
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
      carrierCost = 0, 
      dropiFeePercent = 5, 
      dropiFixedFee = 0,
      selectedProductIds 
    } = req.body || {};

    const orders = db.simulateOrders({
      countPerProduct: Number(countPerProduct) || 3,
      carrierCost: Number(carrierCost) || 0,
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
    const orders = db.simulateOrders({ countPerProduct: 3, carrierCost: 0, dropiFeePercent: 5 });
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
router.post('/advisors/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
    }

    let advisor = db.authenticateAdvisor(username, password);
    if (!advisor) {
      // Puede que la lista en memoria esté desactualizada (reinicio de Render, MySQL lento): se relee y se reintenta.
      try { if (await refreshAdvisorsIfStale()) advisor = db.authenticateAdvisor(username, password); } catch {}
    }
    if (!advisor) {
      console.warn(`[Asesores] Ingreso rechazado para "${String(username).slice(0, 60)}" (usuario inexistente, inactivo o clave incorrecta).`);
      return res.status(401).json({ success: false, message: 'Credenciales inválidas o asesor inactivo. Contacta al administrador.' });
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
      data: publicAdvisor(advisor),
      token: signAdvisorToken({ id: advisor.id }, isAccountingRole(advisor.role) ? advisor.role : undefined)
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/advisors', (req, res) => {
  try {
    const advisors = db.getAdvisors().map(publicAdvisor);
    const performance = db.getAdvisorsPerformance();
    res.json({ success: true, data: { advisors, performance } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Interruptor "Disponible" + señal de vida del portal del asesor
router.post('/advisors/me/presence', (req, res) => {
  const h = req.headers.authorization || '';
  const tok = verifyAdvisorToken(h.startsWith('Bearer ') ? h.slice(7).trim() : '');
  if (!tok?.id) return res.status(401).json({ success: false, message: 'Sesión de asesor no válida.' });
  const updated = setPresence(String(tok.id), typeof req.body?.available === 'boolean' ? req.body.available : undefined);
  if (!updated) return res.status(404).json({ success: false, message: 'Asesor no encontrado.' });
  res.json({ success: true, data: publicAdvisor(updated) });
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


    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Subperfil de Asesor Creado',
      details: `Asesor "${saved.name}" (${saved.id}) registrado con canal ${saved.channel}.`,
      status: 'success'
    });
    res.status(201).json({ success: true, data: publicAdvisor(saved) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/advisors/:id', (req, res) => {
  try {
    const saved = db.saveAdvisor({ ...req.body, id: req.params.id });


    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Subperfil de Asesor Actualizado',
      details: `Asesor "${saved.name}" (${saved.id}) modificado.`,
      status: 'success'
    });
    res.json({ success: true, data: publicAdvisor(saved) });
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
    res.json({ success: true, data: publicAdvisor(settled) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Advisor Sales
// Un asesor solo ve y registra SUS ventas; todo lo demás es del administrador.
const callerAdvisorId = (req: any): string | null => {
  const h = req.headers.authorization || '';
  const t = verifyAdvisorToken(h.startsWith('Bearer ') ? h.slice(7).trim() : '');
  return t?.id ? String(t.id) : null;
};
const adminOnly = (req: any, res: any, next: any) => {
  if ((res.locals as any).isAdmin) return next();
  return res.status(403).json({ success: false, message: 'Esta acción es solo del administrador.' });
};

router.get('/advisor-sales', (req, res) => {
  try {
    const { advisorId, dropiStatus, search } = req.query;
    const isAdmin = Boolean((res.locals as any).isAdmin);
    const own = isAdmin ? null : callerAdvisorId(req);
    if (!isAdmin && !own) return res.status(401).json({ success: false, message: 'Sesión de asesor no válida.' });
    const sales = db.getAdvisorSales({
      advisorId: (own || advisorId) as string,
      dropiStatus: dropiStatus as any,
      search: search as string
    });
    res.json({ success: true, data: sales });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/advisor-sales', async (req, res) => {
  try {
    const isAdmin = Boolean((res.locals as any).isAdmin);
    const own = isAdmin ? null : callerAdvisorId(req);
    if (!isAdmin && !own) return res.status(401).json({ success: false, message: 'Sesión de asesor no válida.' });
    const saved = db.saveAdvisorSale({ ...req.body, id: undefined, ...(own ? { advisorId: own } : {}) });
    // El pedido se guarda también en la base de cPanel (para que no se pierda) y se avisa al administrador.
    const createdOrder = db.getOrderById(saved.id);
    if (createdOrder) {
      cpanelDbService.createOrder(createdOrder).catch(() => {});
      sendSaleNotificationOnce(createdOrder).catch(() => {});
    }
    db.addLog({
      type: 'ORDER_CREATED',
      orderId: saved.id,
      action: 'Venta de Asesor Registrada',
      details: `${saved.advisorName} registró venta ${saved.orderNumber} para ${saved.clientName} (${saved.clientCity}) por $${saved.totalAmount.toLocaleString()} COP.`,
      status: 'success'
    });
    const extra = saved.paymentMethod === 'pse' ? await buildPaymentLink(saved.id, true) : {};
    res.status(201).json({ success: true, data: saved, ...extra });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/** Genera el enlace de pago (PSE/ePayco) de una venta y, si hay correo del cliente, se lo envía. */
async function buildPaymentLink(orderId: string, sendEmail: boolean) {
  const o: any = db.getOrderById(orderId);
  if (!o) return {};
  const paymentLink = `${SITE}/?pagar=${encodeURIComponent(signPayToken(o.id))}`;
  let emailSent = false, emailNote = '';
  if (sendEmail) {
    if (!o.customerEmail) emailNote = 'No se indicó correo del cliente.';
    else {
      const first = String(o.customerName || '').split(' ')[0] || 'cliente';
      const r = await sendAlertEmail(`Tu pedido ${o.orderNumber} en Zavela Store: paga aquí`,
        `Hola ${first},\n\nTu pedido ${o.orderNumber} por ${payouts.cop(Number(o.total || 0))} está listo para pagarse en línea (PSE, tarjeta y otros medios).\n\nPaga de forma segura aquí:\n${paymentLink}\n\nEl enlace vence en 7 días. Si ya pagaste, ignora este mensaje.\n\nZavela Store`, o.customerEmail, { rawSubject: true });
      emailSent = r.sent; emailNote = r.sent ? '' : (r.reason || 'No se pudo enviar.');
    }
  }
  return { paymentLink, emailSent, emailNote };
}

// Reenviar / obtener de nuevo el enlace de pago de una venta PSE (asesor dueño o administrador)
router.post('/advisor-sales/:id/payment-link', async (req, res) => {
  try {
    const isAdmin = Boolean((res.locals as any).isAdmin);
    const own = isAdmin ? null : callerAdvisorId(req);
    if (!isAdmin && !own) return res.status(401).json({ success: false, message: 'Sesión no válida.' });
    const a = advisorSales.getAttribution(req.params.id);
    const o: any = db.getOrderById(req.params.id);
    if (!a || !o || (own && a.advisorId !== own)) return res.status(404).json({ success: false, message: 'Venta no encontrada.' });
    if (o.paymentMethod !== 'epayco' || o.paymentStatus === 'APPROVED') return res.status(400).json({ success: false, message: 'Esta venta no tiene un pago PSE pendiente.' });
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { o.customerEmail = email; db.saveOrder(o); }
    res.json({ success: true, ...(await buildPaymentLink(o.id, Boolean(email) || Boolean(req.body?.sendEmail))) });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/advisor-sales/:id', adminOnly, (req, res) => {
  try {
    const saved = db.saveAdvisorSale({ ...req.body, id: req.params.id });
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/advisor-sales/:id', adminOnly, (req, res) => {
  try {
    const deleted = db.deleteAdvisorSale(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Solo se pueden eliminar ventas que aún no han sido autorizadas.' });
    res.json({ success: true, message: 'Venta eliminada' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/advisor-sales/batch-delete', adminOnly, (req, res) => {
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

router.post('/advisor-sales/:id/execute', adminOnly, (_req, res) => {
  res.status(400).json({ success: false, message: 'Las ventas de asesores se autorizan y envían a Dropi desde el Centro de Despachos (pestaña "Por autorizar").' });
});

router.post('/advisor-sales/batch-status', adminOnly, (req, res) => {
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

// ---------- Comisiones de asesores (administrador) ----------
router.get('/advisor-commissions', adminOnly, (req, res) => {
  try {
    const { advisorId, status } = req.query;
    let rows = db.getAdvisorSales({ advisorId: advisorId as string });
    if (status) rows = rows.filter(r => r.commissionStatus === status);
    const sum = (st: string) => db.getAdvisorSales({}).filter(r => r.commissionStatus === st).reduce((n, r) => n + Number(r.commissionAmount || 0), 0);
    res.json({
      success: true,
      data: rows,
      totals: { en_proceso: sum('en_proceso'), esperando_dropi: sum('esperando_dropi'), por_pagar: sum('por_pagar'), pagada: sum('pagada') }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// "Dropi ya pagó" (uno o varios pedidos): congela la comisión y la pasa a "por pagar"
router.post('/advisor-commissions/dropi-paid', adminOnly, (req, res) => {
  try {
    const ids: string[] = Array.isArray(req.body?.orderIds) ? req.body.orderIds.map(String) : [];
    if (!ids.length) return res.status(400).json({ success: false, message: 'Selecciona al menos un pedido.' });
    const orders = ids.map(id => db.getOrderById(id)).filter(Boolean) as any[];
    const result = advisorSales.markDropiPaid(orders);
    db.addLog({ type: 'SETTINGS_UPDATE', action: 'Dropi pagó pedidos de asesores', details: `${result.ok.length} pedido(s) marcados como pagados por Dropi; comisión lista para liquidar.`, status: 'success' });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/advisor-commissions/undo-dropi-paid', adminOnly, (req, res) => {
  const ids: string[] = Array.isArray(req.body?.orderIds) ? req.body.orderIds.map(String) : [];
  res.json({ success: true, undone: advisorSales.undoDropiPaid(ids) });
});

// ---------- Liquidación de comisiones ----------
const SITE = 'https://zavelastore.com.co';

/** Resumen por asesor: por pagar (ya cobrado a Dropi), esperando a Dropi, pagado y ciclo de pago. */
router.get('/advisor-settlements/summary', adminOnly, (_req, res) => {
  try {
    const all = db.getAdvisorSales({});
    const rows = listAdvisorRecords().filter((a: any) => isSalesAdvisor(a)).map((a: any) => {
      const mine = all.filter(x => x.advisorId === a.id);
      const sum = (st: string) => mine.filter(x => x.commissionStatus === st).reduce((n, x) => n + Number(x.commissionAmount || 0), 0);
      const cnt = (st: string) => mine.filter(x => x.commissionStatus === st).length;
      const c = payouts.cycleInfo(a);
      return {
        advisorId: a.id, name: a.name, email: a.email || '', sellerCode: a.sellerCode, rate: a.commissionRate ?? 25,
        cycle: c.cycle, nextCutoff: c.nextCutoff, payDate: c.payDate, daysToCutoff: c.daysToCutoff, payoutDelayDays: a.payoutDelayDays ?? 3,
        porPagar: sum('por_pagar'), porPagarCount: cnt('por_pagar'),
        esperandoDropi: sum('esperando_dropi'), enProceso: sum('en_proceso'), pagada: sum('pagada'), pagadaCount: cnt('pagada'),
        orderIds: mine.filter(x => x.commissionStatus === 'por_pagar').map(x => x.id)
      };
    });
    res.json({ success: true, data: rows });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/advisor-settlements', adminOnly, (req, res) => {
  res.json({ success: true, data: payouts.listSettlements(req.query.advisorId as string | undefined) });
});

/** Liquidar: paga todas las comisiones "por pagar" del asesor (o las indicadas) y le envía el estado de cuenta por correo. */
router.post('/advisor-settlements', adminOnly, async (req, res) => {
  try {
    const { advisorId, method, reference, notes } = req.body || {};
    const adv: any = getAdvisorRecord(String(advisorId || ''));
    if (!adv) return res.status(404).json({ success: false, message: 'Asesor no encontrado.' });
    const wanted: string[] | null = Array.isArray(req.body?.orderIds) ? req.body.orderIds.map(String) : null;
    const payable = db.getAdvisorSales({ advisorId: adv.id }).filter(x => x.commissionStatus === 'por_pagar' && (!wanted || wanted.includes(x.id)));
    if (!payable.length) return res.status(400).json({ success: false, message: 'No hay comisiones por pagar para este asesor. Primero marca "Dropi ya pagó" en sus pedidos entregados.' });
    const c = payouts.cycleInfo(adv);
    const dates = payable.map(x => String(x.createdAt || '').slice(0, 10)).filter(Boolean).sort();
    const total = payable.reduce((n, x) => n + Number(x.commissionAmount || 0), 0);
    const s = payouts.createSettlement({
      advisorId: adv.id, advisorName: adv.name, sellerCode: adv.sellerCode || '', orderIds: payable.map(x => x.id),
      count: payable.length, total, periodFrom: dates[0] || c.periodFrom, periodTo: payouts.ymd(payouts.bogotaNow()),
      method: String(method || '').slice(0, 60), reference: String(reference || '').slice(0, 80), notes: String(notes || '').slice(0, 300)
    });
    advisorSales.markPaid(s.orderIds, adv.id, s.id);
    db.addLog({ type: 'SETTINGS_UPDATE', action: 'Comisiones liquidadas', details: `${s.id}: ${payable.length} venta(s) de ${adv.name} por ${payouts.cop(total)}.`, status: 'success' });
    let emailed = false, emailNote = '';
    if (adv.email) {
      const text = payouts.statementText(adv, s, db.getAdvisorSales({ advisorId: adv.id }));
      const r = await sendAlertEmail(`Liquidación de comisiones ${s.id} — Zavela Store`, text, adv.email, { rawSubject: true });
      emailed = r.sent; emailNote = r.sent ? '' : (r.reason || '');
      if (r.sent) payouts.markEmailed(s.id);
    } else emailNote = 'El asesor no tiene correo registrado.';
    res.json({ success: true, data: { ...s, emailed }, emailNote });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
});

/** Estado de cuenta del propio asesor (portal). */
router.get('/advisors/me/statement', (req, res) => {
  const h = req.headers.authorization || '';
  const tok = verifyAdvisorToken(h.startsWith('Bearer ') ? h.slice(7).trim() : '');
  const adv: any = tok?.id ? getAdvisorRecord(String(tok.id)) : null;
  if (!adv) return res.status(401).json({ success: false, message: 'Sesión de asesor no válida.' });
  const mine = db.getAdvisorSales({ advisorId: adv.id });
  const sum = (st: string) => mine.filter(x => x.commissionStatus === st).reduce((n, x) => n + Number(x.commissionAmount || 0), 0);
  const est = (st: string) => mine.filter(x => x.commissionStatus === st).reduce((n, x) => n + Number(x.commissionAmount || 0), 0);
  const c = payouts.cycleInfo(adv);
  res.json({
    success: true,
    data: {
      cycle: c.cycle, periodFrom: c.periodFrom, periodTo: c.periodTo, nextCutoff: c.nextCutoff, payDate: c.payDate, daysToCutoff: c.daysToCutoff,
      porPagar: sum('por_pagar'), esperandoDropi: est('esperando_dropi'), enProceso: est('en_proceso'), pagada: sum('pagada'),
      refLink: `${SITE}/?ref=${encodeURIComponent(adv.sellerCode || '')}`,
      settlements: payouts.listSettlements(adv.id).map(({ orderIds, ...rest }) => rest)
    }
  });
});

/** Meta del mes y puesto del asesor frente a los demás (sin mostrar montos ajenos). */
router.get('/advisors/me/ranking', (req, res) => {
  const h = req.headers.authorization || '';
  const tok = verifyAdvisorToken(h.startsWith('Bearer ') ? h.slice(7).trim() : '');
  const me: any = tok?.id ? getAdvisorRecord(String(tok.id)) : null;
  if (!me) return res.status(401).json({ success: false, message: 'Sesión de asesor no válida.' });
  const month = payouts.ymd(payouts.bogotaNow()).slice(0, 7);
  const all = db.getAdvisorSales({}).filter(x => x.dropiStatus !== 'cancelado' && payouts.ymd(new Date(new Date(x.createdAt).getTime() - 5 * 3600 * 1000)).startsWith(month));
  const board = listAdvisorRecords().filter((a: any) => isSalesAdvisor(a) && a.status !== 'inactive').map((a: any) => {
    const mine = all.filter(x => x.advisorId === a.id);
    return { id: a.id, name: String(a.name).split(' ')[0], count: mine.length, total: mine.reduce((n, x) => n + Number(x.totalAmount || 0), 0) };
  }).sort((a, b) => b.total - a.total || b.count - a.count);
  const pos = Math.max(1, board.findIndex(b => b.id === me.id) + 1);
  const mineRow = board.find(b => b.id === me.id);
  res.json({
    success: true,
    data: {
      month, goal: Number(me.monthlyGoal || 0), monthTotal: mineRow?.total || 0, monthCount: mineRow?.count || 0,
      position: pos, advisors: board.length,
      leaderboard: board.slice(0, 5).map((b, i) => ({ position: i + 1, name: b.name, count: b.count, isMe: b.id === me.id }))
    }
  });
});

/** El asesor cambia su propia clave (necesita la actual). */
router.post('/advisors/me/password', (req, res) => {
  try {
    const h = req.headers.authorization || '';
    const tok = verifyAdvisorToken(h.startsWith('Bearer ') ? h.slice(7).trim() : '');
    const adv: any = tok?.id ? getAdvisorRecord(String(tok.id)) : null;
    if (!adv) return res.status(401).json({ success: false, message: 'Sesión de asesor no válida. Vuelve a ingresar.' });
    const { currentPassword, newPassword } = req.body || {};
    if (!verifyPassword(String(currentPassword || ''), adv.password)) return res.status(400).json({ success: false, message: 'La clave actual no es correcta.' });
    if (String(newPassword || '').length < 6) return res.status(400).json({ success: false, message: 'La clave nueva debe tener al menos 6 caracteres.' });
    saveAdvisorRecord({ id: adv.id, password: String(newPassword) } as any);
    db.addLog({ type: 'SETTINGS_UPDATE', action: 'Clave de asesor cambiada', details: `${adv.name} cambió su propia clave.`, status: 'success' });
    res.json({ success: true });
  } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

// ---------- Recuperación de clave del asesor (público) ----------
const resetLimiter = new Map<string, number>();
router.post('/advisors/forgot-password', async (req, res) => {
  const generic = { success: true, message: 'Si el correo está registrado, te enviamos un enlace para crear una clave nueva (vence en 1 hora).' };
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json(generic);
    const last = resetLimiter.get(email) || 0;
    if (Date.now() - last < 60_000) return res.json(generic);
    resetLimiter.set(email, Date.now());
    const adv: any = findByEmail(email);
    if (adv && adv.active !== false) {
      const token = signResetToken(adv.id, passwordFingerprint(adv));
      const link = `${SITE}/?reset=${encodeURIComponent(token)}`;
      void sendAlertEmail('Recupera tu clave — Zavela Store', `Hola ${String(adv.name).split(' ')[0]},\n\nRecibimos una solicitud para crear una clave nueva en tu portal de asesor.\n\nEntra a este enlace (vence en 1 hora y sirve una sola vez):\n${link}\n\nSi no fuiste tú, ignora este mensaje: tu clave actual sigue igual.`, adv.email, { rawSubject: true });
    }
    res.json(generic);
  } catch { res.json(generic); }
});

router.post('/advisors/reset-password', (req, res) => {
  try {
    const tok = verifyResetToken(String(req.body?.token || ''));
    const password = String(req.body?.password || '');
    if (!tok?.id) return res.status(400).json({ success: false, message: 'El enlace no es válido o ya venció. Solicita uno nuevo.' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'La clave debe tener al menos 6 caracteres.' });
    const adv: any = getAdvisorRecord(String(tok.id));
    if (!adv || passwordFingerprint(adv) !== tok.fp) return res.status(400).json({ success: false, message: 'El enlace ya fue usado o venció. Solicita uno nuevo.' });
    saveAdvisorRecord({ id: adv.id, password } as any);
    db.addLog({ type: 'SETTINGS_UPDATE', action: 'Clave de asesor restablecida', details: `${adv.name} creó una clave nueva por enlace de correo.`, status: 'success' });
    res.json({ success: true, message: 'Listo, ya puedes iniciar sesión con tu clave nueva.' });
  } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
});

// Intelligent Unstructured Text Parser for Sales WhatsApp/Chat messages
router.post('/advisor-sales/parse-text', (req, res) => {
  try {
    // El portal envía `text`; se acepta también `rawText` por compatibilidad.
    const rawText = req.body?.text ?? req.body?.rawText;
    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ success: false, message: 'Texto requerido' });
    }

    const text = rawText.trim();
    const advisors = db.getAdvisors().filter((a: any) => !isAccountingRole(a.role));
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
    let detectedProduct = '';
    let detectedQuantity = 1;
    let detectedPrice = 0;

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

    let clientCity = '';
    let clientDepartment = '';
    const cityMatch = text.match(/(?:ciudad|municipio|destino)\s*[:#-]?\s*([^\n,]+)/i);
    if (cityMatch) {
      clientCity = cityMatch[1].trim();
      // "Ciudad: Medellín, Antioquia" → también se toma el departamento si viene después de la coma
      const deptMatch = text.match(/(?:ciudad|municipio|destino)\s*[:#-]?\s*[^\n,]+,\s*([^\n,]+)/i);
      if (deptMatch) clientDepartment = deptMatch[1].trim();
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
        clientName: clientName,
        clientPhone: clientPhone || '',
        clientCity,
        clientDepartment,
        clientAddress: clientAddress || '',
        additionalNotes: (text.match(/(?:notas?|observaci[oó]n(?:es)?|referencias?)\s*[:#-]?\s*([^\n]+)/i)?.[1] || '').trim(),
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

// ==========================================
// 9.1 RESPALDOS DE EMERGENCIA DEL CATÁLOGO (MySQL catalog_backups)
// ==========================================

// GET /api/admin/backups - Listar historial de respaldos disponibles
router.get('/backups', async (req, res) => {
  try {
    let backups: any[] = [];
    try {
      const [rows]: any = await pool.query(
        'SELECT id, nombre_respaldo, total_productos, origen, created_at FROM catalog_backups ORDER BY id DESC'
      );
      if (Array.isArray(rows) && rows.length > 0) {
        backups = rows.map((r: any) => ({
          id: Number(r.id),
          nombre_respaldo: r.nombre_respaldo,
          total_productos: Number(r.total_productos),
          origen: r.origen || 'manual',
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
        }));
      }
    } catch (err: any) {
      console.warn('[GET /api/admin/backups MySQL Error]:', err.message);
    }

    // Fallback con db local si MySQL no devolvió registros
    if (backups.length === 0) {
      backups = db.getCatalogBackups().map(b => ({
        id: b.id,
        nombre_respaldo: b.nombre_respaldo,
        total_productos: b.total_productos,
        origen: b.origen,
        created_at: b.created_at
      }));
    }

    res.json({ success: true, data: backups });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/backups/create - Crear respaldo instantáneo del catálogo actual
router.post('/backups/create', async (req, res) => {
  try {
    const { nombre, origen } = req.body || {};

    // Obtener productos actuales completos con sus IDs de Dropi, fotos, stock y variantes
    const currentProducts = db.getProducts().map((p: any) => ({
      id: String(p.id),
      title: p.title || p.nombre || p.name || 'Producto Zavela',
      name: p.title || p.nombre || p.name || 'Producto Zavela',
      nombre: p.title || p.nombre || p.name || 'Producto Zavela',
      slug: p.slug || String(p.id),
      price: Number(p.price || p.precio || 0),
      precio: Number(p.price || p.precio || 0),
      costPrice: Number(p.costPrice || p.costo || 0),
      compareAtPrice: Number(p.compareAtPrice || 0),
      stock: Number(p.stock !== undefined ? p.stock : 10),
      description: p.description || p.descripcion || '',
      descripcion: p.description || p.descripcion || '',
      shortDescription: p.shortDescription || '',
      image: p.image || p.imagen || (p.images && p.images[0]) || '',
      imagen: p.imagen || p.image || (p.images && p.images[0]) || '',
      images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.imagen ? [p.imagen] : []),
      imagenes: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.imagen ? [p.imagen] : []),
      dropi_product_id: p.dropi_product_id || p.dropiProductId || '',
      dropiProductId: p.dropi_product_id || p.dropiProductId || '',
      variants: Array.isArray(p.variants) ? p.variants : [],
      active: p.active !== false,
      featured: Boolean(p.featured),
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      brand: p.brand || 'Zavela Store',
      createdAt: p.createdAt || new Date().toISOString()
    }));

    const total = currentProducts.length;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const backupName = (nombre && String(nombre).trim())
      ? String(nombre).trim()
      : `Respaldo Catálogo - ${formattedDate} (${total} productos)`;

    const datosJson = JSON.stringify(currentProducts);
    const backupOrigin = origen || 'manual';

    let insertedId: number = Date.now();

    // 1. Guardar en MySQL tabla catalog_backups
    try {
      const [result]: any = await pool.query(
        'INSERT INTO catalog_backups (nombre_respaldo, total_productos, datos_json, origen) VALUES (?, ?, ?, ?)',
        [backupName, total, datosJson, backupOrigin]
      );
      if (result && result.insertId) {
        insertedId = Number(result.insertId);
      }
    } catch (sqlErr: any) {
      console.warn('[MySQL Backup Insert Warning]:', sqlErr.message);
    }

    // 2. Guardar en espejo local para alta disponibilidad
    const savedLocal = db.saveCatalogBackup({
      nombre_respaldo: backupName,
      total_productos: total,
      datos_json: datosJson,
      origen: backupOrigin
    });
    if (!insertedId || insertedId > 1000000000) {
      insertedId = savedLocal.id;
    }

    db.addLog({
      type: 'SYSTEM',
      action: 'Respaldo de Catálogo Creado',
      details: `Se generó el respaldo de emergencia "${backupName}" con ${total} productos y códigos Dropi en MySQL.`,
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Respaldo de emergencia del catálogo creado con éxito.',
      data: {
        id: insertedId,
        nombre_respaldo: backupName,
        total_productos: total,
        origen: backupOrigin,
        created_at: now.toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/backups/:id/restore - Restaurar catálogo desde respaldo autorizado
router.post('/backups/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    let backupRecord: any = null;

    // Buscar en MySQL
    try {
      const [rows]: any = await pool.query(
        'SELECT id, nombre_respaldo, total_productos, datos_json, origen, created_at FROM catalog_backups WHERE id = ? LIMIT 1',
        [id]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        backupRecord = rows[0];
      }
    } catch (sqlErr: any) {
      console.warn('[MySQL Backup Select Warning]:', sqlErr.message);
    }

    // Fallback con db local
    if (!backupRecord) {
      const localBackup = db.getCatalogBackupById(id);
      if (localBackup) {
        backupRecord = localBackup;
      }
    }

    if (!backupRecord || !backupRecord.datos_json) {
      return res.status(404).json({ success: false, message: `Respaldo con ID ${id} no encontrado en la base de datos.` });
    }

    let productsToRestore: any[] = [];
    try {
      productsToRestore = JSON.parse(backupRecord.datos_json);
    } catch {
      return res.status(400).json({ success: false, message: 'El contenido JSON del respaldo está dañado.' });
    }

    if (!Array.isArray(productsToRestore)) {
      return res.status(400).json({ success: false, message: 'Formato de productos en respaldo no es un array válido.' });
    }

    let restoredCount = 0;

    for (const prod of productsToRestore) {
      const prodId = String(prod.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
      const title = prod.title || prod.nombre || prod.name || 'Producto Restaurado';
      const price = Number(prod.price || prod.precio || 0);
      const stock = Number(prod.stock !== undefined ? prod.stock : 10);
      const description = prod.description || prod.descripcion || '';
      const dropiProductId = prod.dropi_product_id || prod.dropiProductId || '';
      const images = Array.isArray(prod.images) && prod.images.length > 0 
        ? prod.images 
        : (Array.isArray(prod.imagenes) && prod.imagenes.length > 0 ? prod.imagenes : (prod.imagen ? [prod.imagen] : []));
      const mainImage = images[0] || prod.imagen || prod.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';
      const imagesJson = JSON.stringify(images);
      const variants = Array.isArray(prod.variants) ? prod.variants : [];
      const variantsJson = JSON.stringify(variants);

      // 1. Restaurar o actualizar en MySQL usando ON DUPLICATE KEY UPDATE protegiendo dropi_product_id
      try {
        await pool.query(`
          INSERT INTO productos (id, nombre, precio, stock, descripcion, dropi_product_id, imagen, imagenes, variants)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            precio = VALUES(precio),
            stock = VALUES(stock),
            descripcion = VALUES(descripcion),
            dropi_product_id = COALESCE(NULLIF(VALUES(dropi_product_id), ''), productos.dropi_product_id),
            imagen = VALUES(imagen),
            imagenes = VALUES(imagenes),
            variants = VALUES(variants)
        `, [
          prodId,
          title,
          price,
          stock,
          description,
          dropiProductId,
          mainImage,
          imagesJson,
          variantsJson
        ]);
      } catch (sqlErr: any) {
        console.warn(`[MySQL Restore Prod ${prodId} Warning]:`, sqlErr.message);
      }

      // 2. Restaurar en data_store local
      db.saveProduct({
        ...prod,
        id: prodId,
        title,
        price,
        stock,
        description,
        dropi_product_id: dropiProductId,
        images: images.length > 0 ? images : [mainImage],
        variants
      });

      // 3. Sincronizar en cPanel MySQL
      cpanelDbService.saveProduct({
        ...prod,
        id: prodId,
        title,
        price,
        stock,
        description,
        dropi_product_id: dropiProductId,
        imagen: mainImage,
        imagenes: images,
        variants
      } as any).catch(() => {});

      restoredCount++;
    }

    db.addLog({
      type: 'SYSTEM',
      action: 'Restauración de Catálogo Exitosa',
      details: `Se restauró el respaldo #${id} ("${backupRecord.nombre_respaldo}") con ${restoredCount} productos, recuperando imágenes, variantes y códigos Dropi en MySQL.`,
      status: 'success'
    });

    res.json({
      success: true,
      message: `Respaldo restaurado exitosamente. Se restablecieron ${restoredCount} productos en MySQL.`,
      restoredCount,
      backupId: id,
      backupName: backupRecord.nombre_respaldo
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/backups/:id - Eliminar respaldo obsoleto
router.delete('/backups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = false;

    // Borrar de MySQL
    try {
      const [resSql]: any = await pool.query('DELETE FROM catalog_backups WHERE id = ?', [id]);
      if (resSql && resSql.affectedRows > 0) {
        deleted = true;
      }
    } catch (sqlErr: any) {
      console.warn('[MySQL Delete Backup Warning]:', sqlErr.message);
    }

    // Borrar de store local
    const localDeleted = db.deleteCatalogBackup(id);
    if (localDeleted) {
      deleted = true;
    }

    db.addLog({
      type: 'SYSTEM',
      action: 'Respaldo de Catálogo Eliminado',
      details: `El respaldo de catálogo con ID #${id} fue eliminado.`,
      status: 'info'
    });

    res.json({ success: true, message: 'Respaldo eliminado correctamente.' });
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
router.get('/social/settings', async (req, res) => {
  try {
    const fbConfig = await metaGraphService.getEffectiveFacebookConfig();
    const settings = db.getSocialMarketingSettings();
    settings.connections.facebook = {
      ...settings.connections.facebook,
      platform: 'facebook',
      connected: fbConfig.connected,
      accountName: fbConfig.accountName,
      pageId: fbConfig.pageId,
      accessToken: fbConfig.accessToken,
      pixelId: fbConfig.pixelId,
      status: fbConfig.connected ? 'connected' : 'disconnected',
      autoPostEnabled: fbConfig.autoPostEnabled,
      lastSyncAt: fbConfig.lastSyncAt || settings.connections.facebook?.lastSyncAt
    };
    // Instagram y TikTok: solo cuentan como vinculadas si el usuario las guardó de verdad.
    // Los datos de ejemplo que venían en data_store.json ya no se muestran como "En línea".
    for (const plat of ['instagram', 'tiktok'] as const) {
      const stored = await pool.getSocialConnection(plat);
      if (stored) {
        settings.connections[plat] = stored;
      } else {
        settings.connections[plat] = {
          platform: plat,
          connected: false,
          status: 'disconnected',
          autoPostEnabled: false
        } as any;
      }
    }
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/social/settings', async (req, res) => {
  try {
    const saved = db.saveSocialMarketingSettings(req.body);
    if (req.body?.connections?.facebook) {
      await pool.setFacebookConfig(req.body.connections.facebook);
    }
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

router.post('/social/connect/:platform', async (req, res) => {
  try {
    const platform = req.params.platform as 'facebook' | 'instagram' | 'tiktok';
    if (!['facebook', 'instagram', 'tiktok'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Plataforma no válida' });
    }

    const { accountName, pageId, accountId, accessToken, pixelId } = req.body;
    const current = db.getSocialMarketingSettings();
    const previousConn: any = platform === 'facebook' ? current.connections[platform] : await pool.getSocialConnection(platform as 'instagram' | 'tiktok');
    const finalToken = String(accessToken || previousConn?.accessToken || '').trim();
    if (platform !== 'facebook' && (!finalToken || /^token_\d+$/.test(finalToken))) {
      return res.status(400).json({ success: false, message: 'Falta el Access Token real de la cuenta. Pégalo en el campo del token.' });
    }

    const updatedConn = {
      ...current.connections[platform],
      platform,
      connected: true,
      accountName: accountName || current.connections[platform]?.accountName || `@zavela.${platform}`,
      pageId: pageId || current.connections[platform]?.pageId,
      accountId: accountId || current.connections[platform]?.accountId,
      accessToken: platform === 'facebook' ? (accessToken || current.connections[platform]?.accessToken || `token_${Date.now()}`) : finalToken,
      pixelId: pixelId || current.connections[platform]?.pixelId,
      status: 'connected' as const,
      lastSyncAt: new Date().toISOString(),
      autoPostEnabled: true
    };

    if (platform === 'facebook') {
      await pool.setFacebookConfig(updatedConn);
    } else {
      await pool.setSocialConnection(platform as 'instagram' | 'tiktok', updatedConn);
    }

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

router.post('/social/disconnect/:platform', async (req, res) => {
  try {
    const platform = req.params.platform as 'facebook' | 'instagram' | 'tiktok';
    if (!['facebook', 'instagram', 'tiktok'].includes(platform)) {
      return res.status(400).json({ success: false, message: 'Plataforma no válida' });
    }

    const current = db.getSocialMarketingSettings();
    const base: any = platform === 'facebook' ? current.connections[platform] : await pool.getSocialConnection(platform as 'instagram' | 'tiktok');
    const updatedConn = {
      ...(base || { platform }),
      connected: false,
      status: 'disconnected' as const,
      autoPostEnabled: false,
      accessToken: ''
    };

    if (platform === 'facebook') {
      await pool.setFacebookConfig(updatedConn);
    } else {
      await pool.setSocialConnection(platform as 'instagram' | 'tiktok', updatedConn);
    }

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

// Historial de publicaciones sociales: se guarda en MySQL (configuraciones, clave social_posts_history).
// El guardado en memoria de db.publishSocialPost no hace nada, por eso antes devolvía null y la pantalla se rompía.
const SOCIAL_HISTORY_KEY = 'social_posts_history';
async function readSocialHistory(): Promise<any[]> {
  try {
    const [rows]: any = await pool.query('SELECT valor FROM configuraciones WHERE clave = ? LIMIT 1', [SOCIAL_HISTORY_KEY]);
    if (Array.isArray(rows) && rows[0]?.valor) {
      const list = JSON.parse(rows[0].valor);
      return Array.isArray(list) ? list.filter(p => p && typeof p === 'object') : [];
    }
  } catch (e: any) { console.warn('[social] no se pudo leer el historial:', e?.message || e); }
  return [];
}
async function writeSocialHistory(list: any[]): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO configuraciones (clave, valor, updated_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()`,
      [SOCIAL_HISTORY_KEY, JSON.stringify(list.slice(0, 100))]
    );
  } catch (e: any) { console.warn('[social] no se pudo guardar el historial:', e?.message || e); }
}

// Solicitudes de derechos sobre datos personales (Habeas Data) recibidas desde /derechos-datos
router.get('/privacy-requests', async (_req, res) => {
  try { res.json({ success: true, data: await listPrivacyRequests() }); }
  catch (e: any) { res.status(500).json({ success: false, message: e?.message || 'Error' }); }
});
router.put('/privacy-requests/:id', async (req, res) => {
  try {
    const ok = await updatePrivacyRequest(req.params.id, { status: req.body?.status, note: req.body?.note });
    if (!ok) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, message: e?.message || 'Error' }); }
});

router.get('/social/posts', async (req, res) => {
  try {
    const posts = await readSocialHistory();
    res.json({ success: true, data: posts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/** Trae de Facebook los números reales de cada publicación (reacciones, comentarios, compartidos y alcance) y los guarda en el historial. */
router.post('/social/sync-metrics', async (_req, res) => {
  try {
    const fb = await metaGraphService.getEffectiveFacebookConfig();
    if (!fb?.connected || !fb.accessToken) return res.status(400).json({ success: false, message: 'Facebook no está vinculado.' });
    const base = 'https://graph.facebook.com/v26.0';
    const posts = await readSocialHistory();
    let updated = 0, failed = 0; let lastError = '';
    for (const p of posts) {
      if (!Array.isArray(p.platforms) || !p.platforms.includes('facebook') || !p.postUrl) continue;
      const m = /facebook\.com\/([\w.\-]+)\/?$/i.exec(String(p.postUrl));
      if (!m) continue;
      const id = m[1];
      try {
        const q = new URLSearchParams({ fields: 'reactions.summary(true).limit(0),comments.summary(true).limit(0),shares', access_token: fb.accessToken });
        const r = await fetch(`${base}/${encodeURIComponent(id)}?${q}`);
        const j: any = await r.json().catch(() => ({}));
        if (!r.ok || j?.error) { failed++; lastError = j?.error?.message || `HTTP ${r.status}`; continue; }
        p.likes = Number(j?.reactions?.summary?.total_count) || 0;
        p.shares = Number(j?.shares?.count) || 0;
        p.comments = Number(j?.comments?.summary?.total_count) || 0;
        // Alcance: Facebook cambió el nombre de la métrica con las versiones; se prueba una y luego la otra
        for (const metric of ['post_media_view', 'post_impressions']) {
          const ri = await fetch(`${base}/${encodeURIComponent(id)}/insights?${new URLSearchParams({ metric, access_token: fb.accessToken })}`);
          const ji: any = await ri.json().catch(() => ({}));
          const val = ji?.data?.[0]?.values?.[0]?.value;
          if (ri.ok && typeof val === 'number') { p.views = val; break; }
        }
        p.metricsSyncedAt = new Date().toISOString();
        updated++;
      } catch (e: any) { failed++; lastError = e?.message || String(e); }
    }
    await writeSocialHistory(posts);
    res.json({ success: true, updated, failed, lastError, message: failed && !updated ? `Facebook no entregó los números: ${lastError}` : `Se actualizaron ${updated} publicaciones de Facebook.` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'No se pudieron traer las métricas.' });
  }
});

// Proxy de imágenes para la plantilla de campaña: el navegador no puede dibujar fotos de otros sitios en un lienzo
// sin permiso (CORS), así que el servidor las descarga y las entrega desde el mismo dominio. Solo administradores.
router.get('/social/image-proxy', async (req, res) => {
  try {
    const raw = String(req.query.url || '');
    let u: URL;
    try { u = new URL(raw); } catch { return res.status(400).json({ success: false, message: 'URL inválida' }); }
    const host = u.hostname.toLowerCase();
    const privateHost = host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd])/i.test(host);
    if (!/^https?:$/.test(u.protocol) || privateHost) return res.status(400).json({ success: false, message: 'URL no permitida' });
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);
    const r = await fetch(u.toString(), { signal: ctl.signal, redirect: 'follow' });
    clearTimeout(timer);
    const type = String(r.headers.get('content-type') || '');
    if (!r.ok || !type.startsWith('image/')) return res.status(502).json({ success: false, message: 'No se pudo descargar la imagen' });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return res.status(413).json({ success: false, message: 'Imagen demasiado grande' });
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buf);
  } catch (e: any) {
    res.status(502).json({ success: false, message: e?.message || 'Error al descargar la imagen' });
  }
});

// Publica en Facebook una imagen de campaña de la tienda (plantilla generada en el panel).
/** Voz para los videos de la tienda: texto -> audio (WAV) con Gemini TTS, en español latino. Usa GEMINI_API_KEY. */
router.post('/social/tts', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(400).json({ success: false, message: 'Falta GEMINI_API_KEY en Render.' });
    const text = String(req.body?.text || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
    if (!text) return res.status(400).json({ success: false, message: 'Escribe el texto de la voz.' });
    const voices = ['Kore', 'Puck', 'Charon', 'Aoede', 'Fenrir', 'Leda'];
    const voice = voices.includes(req.body?.voice) ? req.body.voice : 'Kore';
    const prompt = `Di con acento latinoamericano (colombiano neutro), tono entusiasta de anuncio publicitario, ritmo ágil y natural: ${text}`;
    let lastErr = '';
    for (const model of ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts']) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } }
        })
      });
      const j: any = await r.json().catch(() => ({}));
      const b64 = j?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data)?.inlineData?.data;
      if (r.ok && b64) {
        const pcm = Buffer.from(b64, 'base64');
        const head = Buffer.alloc(44);
        head.write('RIFF', 0); head.writeUInt32LE(36 + pcm.length, 4); head.write('WAVE', 8); head.write('fmt ', 12);
        head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22); head.writeUInt32LE(24000, 24);
        head.writeUInt32LE(48000, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(pcm.length, 40);
        return res.json({ success: true, audioDataUrl: `data:audio/wav;base64,${Buffer.concat([head, pcm]).toString('base64')}` });
      }
      lastErr = j?.error?.message || `Gemini respondió ${r.status}`;
    }
    res.status(502).json({ success: false, message: `No se pudo generar la voz: ${lastErr}` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'No se pudo generar la voz.' });
  }
});

/** Comprime el video de la campaña para el estado de WhatsApp (tope ~8 MB; el límite es 16 MB). */
router.post('/social/video-whatsapp', async (req, res) => {
  try {
    const m = /^data:video\/(?:mp4|webm)(?:;codecs=[^;,]+)?;base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.mediaDataUrl || ''));
    if (!m) return res.status(400).json({ success: false, message: 'El video no es válido.' });
    const dur = Math.max(5, Math.min(90, Number(req.body?.durationSec) || 35));
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > 40 * 1024 * 1024) return res.status(413).json({ success: false, message: 'El archivo pesa más de 40 MB.' });
    const out = await normalizeVideo(buf, { maxBytes: 8 * 1024 * 1024, durationSec: dur });
    if (!out.converted) return res.status(500).json({ success: false, message: `No se pudo comprimir el video en el servidor. Motivo: ${out.error || 'desconocido'}` });
    res.json({ success: true, sizeMB: Math.round(out.buf.length / 1048576 * 10) / 10, videoDataUrl: `data:video/mp4;base64,${out.buf.toString('base64')}` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'No se pudo comprimir el video.' });
  }
});

/** Pone el video de la campaña en la portada de la tienda (se comprime a ~5 MB y se guarda en MySQL). */
router.post('/home-video', async (req, res) => {
  try {
    const m = /^data:video\/(?:mp4|webm)(?:;codecs=[^;,]+)?;base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.mediaDataUrl || ''));
    if (!m) return res.status(400).json({ success: false, message: 'El video no es válido.' });
    const dur = Math.max(5, Math.min(90, Number(req.body?.durationSec) || 35));
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > 40 * 1024 * 1024) return res.status(413).json({ success: false, message: 'El archivo pesa más de 40 MB.' });
    const out = await normalizeVideo(buf, { maxBytes: 5 * 1024 * 1024, durationSec: dur });
    if (!out.converted) return res.status(500).json({ success: false, message: `No se pudo comprimir el video en el servidor. Motivo: ${out.error || 'desconocido'}` });
    await saveHomeVideo(out.buf, String(req.body?.title || ''));
    res.json({ success: true, sizeMB: Math.round(out.buf.length / 1048576 * 10) / 10 });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'No se pudo guardar el video en la portada.' });
  }
});

router.delete('/home-video', async (_req, res) => {
  try { await deleteHomeVideo(); res.json({ success: true }); }
  catch (e: any) { res.status(500).json({ success: false, message: e?.message || 'No se pudo quitar el video.' }); }
});

/** Campañas de la tienda en TikTok: una imagen (foto) o un video corto generado en el navegador. */
router.post('/social/tiktok/publish-media', async (req, res) => {
  try {
    const { mediaDataUrl, kind, caption, title } = req.body || {};
    const conn: any = await pool.getSocialConnection('tiktok');
    if (!conn?.connected || !conn.accessToken) return res.status(400).json({ success: false, message: 'TikTok no está vinculado.' });
    const m = /^data:((?:image\/(?:jpeg|webp))|(?:video\/(?:mp4|webm)))(?:;codecs=[^;,]+)?;base64,([A-Za-z0-9+/=]+)$/.exec(String(mediaDataUrl || ''));
    if (!m) return res.status(400).json({ success: false, message: 'El archivo no es válido (foto JPG/WEBP o video MP4/WEBM).' });
    const isVideo = m[1].startsWith('video/');
    if ((kind === 'video') !== isVideo) return res.status(400).json({ success: false, message: 'El tipo de archivo no coincide.' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 40 * 1024 * 1024) return res.status(413).json({ success: false, message: 'El archivo pesa más de 40 MB.' });
    let outBuf = buf, outMime = m[1], conv = false;
    if (isVideo) { const n = await normalizeVideo(buf); outBuf = n.buf; conv = n.converted; if (conv) outMime = 'video/mp4'; }
    const url = storeTmpMedia(outBuf, outMime);
    const text = String(caption || '').slice(0, 2200);
    const label = String(title || 'Zavela Store').slice(0, 80);
    const result = isVideo ? await publishVideoUrl(url, text || label) : await publishPhotoUrls([url], label, text || label);
    const history = await readSocialHistory();
    await writeSocialHistory([{
      id: `post-${Date.now()}`, productId: 'store-campaign', productTitle: label, productPrice: 0,
      productImageUrl: '', productSlug: '', platforms: ['tiktok'], copies: { tiktok: text }, status: result.success ? 'published' : 'failed',
      publishedAt: new Date().toISOString(), views: 0, clicks: 0, likes: 0, shares: 0, attributedSalesCOP: 0,
      note: `TikTok (${isVideo ? 'video' : 'foto'}${isVideo ? (conv ? ', convertido' : ', sin convertir') : ''}): ${result.message}`
    }, ...history]);
    res.status(result.success ? 201 : 200).json({ success: result.success, result });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'No se pudo publicar en TikTok.' });
  }
});

router.post('/social/publish-image', async (req, res) => {
  try {
    const { imageDataUrl, caption, title } = req.body || {};
    const m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(imageDataUrl || ''));
    if (!m) return res.status(400).json({ success: false, message: 'La imagen no es válida (se espera PNG o JPG).' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 8 * 1024 * 1024) return res.status(413).json({ success: false, message: 'La imagen pesa más de 8 MB.' });
    const text = String(caption || '').slice(0, 5000);
    const result = await metaGraphService.publishImageToFacebook(buf, m[1], text);
    if (result.success) {
      const history = await readSocialHistory();
      await writeSocialHistory([{
        id: `post-${Date.now()}`, productId: 'store-campaign', productTitle: String(title || 'Campaña de la tienda').slice(0, 80), productPrice: 0,
        productImageUrl: '', productSlug: '', platforms: ['facebook'], copies: { facebook: text }, status: 'published',
        publishedAt: new Date().toISOString(), views: 0, clicks: 0, likes: 0, shares: 0, attributedSalesCOP: 0, postUrl: result.permalink
      }, ...history]);
    }
    res.status(result.success ? 201 : 200).json({ success: result.success, result });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Error al publicar' });
  }
});

router.post('/social/publish', async (req, res) => {
  try {
    const { productId, platforms, copies, product: passedProduct } = req.body;
    const pId = String(productId || passedProduct?.id || '').trim();

    let product = pId ? db.getProductById(pId) : null;

    if (!product && pId) {
      const allLocal = db.getProducts();
      product = allLocal.find(p => String(p.id) === pId || String(p.slug) === pId || (p.title && p.title.toLowerCase().includes(pId.toLowerCase())));
    }

    if (!product && pId) {
      try {
        const cpanelList = await cpanelDbService.fetchProducts();
        if (Array.isArray(cpanelList) && cpanelList.length > 0) {
          product = cpanelList.find(p => String(p.id) === pId || String(p.slug) === pId);
        }
      } catch {}
    }

    if (!product && passedProduct && typeof passedProduct === 'object') {
      product = passedProduct;
      try { db.saveProduct(product); } catch {}
    }

    if (!product) {
      const allLocal = db.getProducts();
      if (allLocal.length > 0) product = allLocal[0];
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado en el catálogo' });
    }

    let facebookSync: any = null;
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

    let tiktokSync: any = null;
    if (Array.isArray(platforms) && platforms.includes('tiktok')) {
      const ttConn: any = await pool.getSocialConnection('tiktok');
      if (ttConn?.connected && ttConn.accessToken) {
        tiktokSync = await publishProductPhotos(product, copies?.tiktok);
      } else {
        tiktokSync = { success: false, message: 'TikTok no está vinculado: se guardó solo en el historial.' };
      }
    }

    const plats = (Array.isArray(platforms) ? platforms : []).filter((p: any) => ['facebook', 'instagram', 'tiktok'].includes(p));
    const fbFailedOnly = (plats.length === 1 && plats[0] === 'facebook' && facebookSync && facebookSync.success === false)
      || (plats.length === 1 && plats[0] === 'tiktok' && tiktokSync && tiktokSync.success === false);
    const imgs: any[] = Array.isArray((product as any).images) ? (product as any).images : [];
    const newPost = {
      id: `post-${Date.now()}`,
      productId: String(product.id),
      productTitle: String((product as any).title || (product as any).nombre || 'Producto'),
      productPrice: Number((product as any).price) || 0,
      productImageUrl: String(imgs[0] || (product as any).image || ''),
      productSlug: String((product as any).slug || product.id),
      platforms: plats,
      copies: { facebook: copies?.facebook, instagram: copies?.instagram, tiktok: copies?.tiktok },
      status: fbFailedOnly ? 'failed' : 'published',
      publishedAt: new Date().toISOString(),
      views: 0, clicks: 0, likes: 0, shares: 0, attributedSalesCOP: 0,
      postUrl: facebookSync?.permalink || undefined,
      note: tiktokSync ? `TikTok: ${tiktokSync.message}` : undefined
    };
    const history = await readSocialHistory();
    await writeSocialHistory([newPost, ...history]);

    res.status(201).json({ success: true, data: newPost, facebookSync, tiktokSync });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// RUTAS OFICIALES FACEBOOK META GRAPH API v26.0
// ==========================================

// GET /api/admin/social/facebook/status - Obtener estado actual de la sesión persistente de Facebook desde MySQL
router.get('/social/facebook/status', async (req, res) => {
  try {
    const config = await metaGraphService.getEffectiveFacebookConfig();
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/social/facebook/connect - Vincular e iniciar sesión persistente con Page ID y Token en MySQL
router.post('/social/facebook/connect', async (req, res) => {
  try {
    const { pageId, accessToken, accountName, autoPostEnabled = true, pixelId } = req.body;

    if (!pageId || !accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Page ID y Page Access Token permanente son requeridos para conectar la Página de Facebook.'
      });
    }

    const cleanPageId = String(pageId).trim();
    const cleanToken = String(accessToken).trim();
    const cleanName = String(accountName || 'Zavela Store Colombia (Página Oficial)').trim();
    const cleanPixel = pixelId ? String(pixelId).trim() : '';

    // Verificar en vivo contra Meta Graph API v26.0
    const checkResult = await metaGraphService.checkConnection(cleanPageId, cleanToken);

    const updatedConn = {
      platform: 'facebook' as const,
      connected: true,
      accountName: checkResult.pageName || cleanName,
      pageId: cleanPageId,
      accessToken: cleanToken,
      pixelId: cleanPixel,
      status: 'connected' as const,
      lastSyncAt: new Date().toISOString(),
      autoPostEnabled: autoPostEnabled !== false
    };

    // 1. Guardar de forma persistente en MySQL (tabla configuraciones)
    await pool.setFacebookConfig(updatedConn);

    // 2. Guardar en store local
    const current = db.getSocialMarketingSettings();
    const saved = db.saveSocialMarketingSettings({
      connections: {
        ...current.connections,
        facebook: updatedConn
      }
    });

    db.addLog({
      type: 'SETTINGS_UPDATE',
      action: 'Página de Facebook Conectada (Meta Graph API v26.0)',
      details: `Página "${updatedConn.accountName}" (ID: ${updatedConn.pageId}) persistida en MySQL y sesión iniciada.`,
      status: 'success'
    });

    res.json({
      success: true,
      data: updatedConn,
      metaValidation: checkResult,
      message: checkResult.connected
        ? `✅ Página "${updatedConn.accountName}" guardada en MySQL y verificada exitosamente.`
        : `⚠️ Credenciales guardadas en MySQL. Advertencia de Meta: ${checkResult.message}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/social/facebook/disconnect - Desconectar sesión de Facebook
router.post('/social/facebook/disconnect', async (req, res) => {
  try {
    const current = db.getSocialMarketingSettings();
    const updatedConn = {
      ...current.connections.facebook,
      connected: false,
      status: 'disconnected' as const,
      autoPostEnabled: false
    };

    // Actualizar en MySQL (tabla configuraciones)
    await pool.setFacebookConfig(updatedConn);

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
    const config = await metaGraphService.getEffectiveFacebookConfig();
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
    const config = await metaGraphService.getEffectiveFacebookConfig();
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
    const rawBody = req.body || {};
    const customCaption = rawBody.customCaption || req.query.customCaption;

    // 1. Extraer ID del producto de cualquier campo posible
    const incomingId = String(
      rawBody.productId ||
      rawBody.id ||
      rawBody._id ||
      rawBody.product?.id ||
      rawBody.productPayload?.id ||
      req.query.productId ||
      req.query.id ||
      ''
    ).trim();

    // 2. Extraer el objeto de datos de producto (ya sea anidado en .product/.productPayload o en el body raíz)
    const rawProduct = (rawBody.product && typeof rawBody.product === 'object')
      ? rawBody.product
      : (rawBody.productPayload && typeof rawBody.productPayload === 'object')
        ? rawBody.productPayload
        : (rawBody.item && typeof rawBody.item === 'object')
          ? rawBody.item
          : (rawBody.data && typeof rawBody.data === 'object')
            ? rawBody.data
            : rawBody;

    let targetProduct: Product | undefined;

    // 3. Evaluar si disponemos de datos utilizables del producto
    const hasUsableProductData = rawProduct && typeof rawProduct === 'object' && (
      Boolean(rawProduct.title || rawProduct.nombre || rawProduct.name || rawProduct.titulo || rawProduct.slug) ||
      rawProduct.price !== undefined || rawProduct.precio !== undefined ||
      Boolean(rawProduct.images || rawProduct.imagen || rawProduct.image) ||
      Boolean(rawProduct.description || rawProduct.descripcion || rawProduct.shortDescription)
    );

    if (hasUsableProductData) {
      const resolvedTitle = String(
        rawProduct.title ||
        rawProduct.nombre ||
        rawProduct.name ||
        rawProduct.titulo ||
        (rawProduct.slug ? String(rawProduct.slug).replace(/-/g, ' ') : '') ||
        'Producto Zavela Store Colombia'
      ).trim();

      const finalTitle = resolvedTitle.length > 0 ? resolvedTitle : 'Producto Zavela Store Colombia';
      const resolvedId = String(rawProduct.id || incomingId || `prod-${Date.now()}`);
      const resolvedSlug = rawProduct.slug || finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      let resolvedImages: string[] = [];
      if (Array.isArray(rawProduct.images) && rawProduct.images.length > 0) {
        resolvedImages = rawProduct.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
      } else if (typeof rawProduct.images === 'string' && rawProduct.images.trim()) {
        try {
          const parsed = JSON.parse(rawProduct.images);
          resolvedImages = Array.isArray(parsed) ? parsed : [rawProduct.images];
        } catch {
          resolvedImages = rawProduct.images.includes(',') ? rawProduct.images.split(',').map((s: string) => s.trim()) : [rawProduct.images];
        }
      } else if (rawProduct.imagen) {
        resolvedImages = [rawProduct.imagen];
      } else if (rawProduct.image) {
        resolvedImages = [rawProduct.image];
      }

      if (resolvedImages.length === 0) {
        resolvedImages = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
      }

      const price = Number(rawProduct.price !== undefined ? rawProduct.price : rawProduct.precio) || 89900;
      const costPrice = Number(rawProduct.costPrice !== undefined ? rawProduct.costPrice : (rawProduct.costo || rawProduct.cost_price)) || 45000;
      const compareAtPrice = Number(rawProduct.compareAtPrice !== undefined ? rawProduct.compareAtPrice : (rawProduct.compare_price || rawProduct.comparePrice)) || (price + 20000);

      targetProduct = {
        id: resolvedId,
        title: finalTitle,
        slug: resolvedSlug,
        description: rawProduct.description || rawProduct.descripcion || 'Producto disponible con Pago Contra Entrega en toda Colombia.',
        shortDescription: rawProduct.shortDescription || rawProduct.descripcion_corta || 'Envío gratis y garantía asegurada Zavela Store.',
        price,
        costPrice,
        compareAtPrice,
        discountPercentage: Number(rawProduct.discountPercentage || rawProduct.discount_percentage) || 20,
        marginAmount: price - costPrice,
        marginPercentage: costPrice > 0 ? Math.round(((price - costPrice) / costPrice) * 100) : 0,
        stock: Number(rawProduct.stock !== undefined ? rawProduct.stock : (rawProduct.inventario !== undefined ? rawProduct.inventario : 20)),
        active: rawProduct.active !== false && rawProduct.activo !== false,
        featured: Boolean(rawProduct.featured || rawProduct.destacado),
        images: resolvedImages,
        warrantyInfo: rawProduct.warrantyInfo || rawProduct.warranty_info || '30 días de garantía oficial Zavela Store.',
        tags: Array.isArray(rawProduct.tags) ? rawProduct.tags : ['tendencia', 'calidad', 'contraentrega'],
        weightKg: Number(rawProduct.weightKg || rawProduct.weight_kg) || 0.5,
        categoryId: rawProduct.categoryId || rawProduct.category_id || 'cat-general',
        categoryName: rawProduct.categoryName || rawProduct.category_name || rawProduct.category || 'General',
        warehouseCity: rawProduct.warehouseCity || rawProduct.warehouse_city || 'Bogotá D.C.',
        brand: rawProduct.brand || 'Zavela Store',
        dropi_product_id: rawProduct.dropi_product_id || rawProduct.dropiProductId || rawProduct.dropi_id || '',
        variants: Array.isArray(rawProduct.variants) ? rawProduct.variants : [],
        createdAt: rawProduct.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Guardar o actualizar en base local para disponibilidad permanente
      try {
        db.saveProduct(targetProduct);
      } catch (e) {
        console.warn('[Social FB Sync] Guardado local warning:', e);
      }

      // Sincronizar en cPanel MySQL en segundo plano
      try {
        cpanelDbService.saveProduct(targetProduct).catch(() => {});
      } catch {}
    } else if (incomingId) {
      // 4. Si solo llegó un ID, buscar en todas las fuentes disponibles
      targetProduct = db.getProductById(incomingId);

      if (!targetProduct) {
        const allLocal = db.getProducts();
        targetProduct = allLocal.find(p => 
          String(p.id) === incomingId || 
          String(p.slug) === incomingId || 
          String((p as any).dropi_product_id) === incomingId ||
          (p.title && p.title.toLowerCase().includes(incomingId.toLowerCase()))
        );
      }

      // Búsqueda en cPanel MySQL
      if (!targetProduct) {
        try {
          const cpanelList = await cpanelDbService.fetchProducts();
          if (Array.isArray(cpanelList) && cpanelList.length > 0) {
            targetProduct = cpanelList.find(p => 
              String(p.id) === incomingId || 
              String(p.slug) === incomingId || 
              String((p as any).dropi_product_id) === incomingId ||
              (p.title && p.title.toLowerCase().includes(incomingId.toLowerCase()))
            );
          }
        } catch (e) {
          console.warn('[Social FB Sync] Error buscando en cPanel MySQL:', e);
        }
      }
    }

    // 5. Fallback definitivo: si el producto no existiera, tomar el más reciente del catálogo
    // o sintetizarlo con los datos mínimos válidos para no bloquear la publicación
    if (!targetProduct) {
      const allLocal = db.getProducts();
      if (allLocal && allLocal.length > 0) {
        targetProduct = allLocal[0];
      } else {
        targetProduct = {
          id: incomingId || `prod-${Date.now()}`,
          title: 'Producto Zavela Store Colombia',
          slug: 'producto-zavela-store-colombia',
          description: 'Producto de alta calidad con garantía y Pago Contra Entrega en toda Colombia.',
          shortDescription: 'Garantía oficial y envío seguro a nivel nacional.',
          price: 89900,
          costPrice: 45000,
          compareAtPrice: 119900,
          discountPercentage: 25,
          marginAmount: 44900,
          marginPercentage: 50,
          stock: 15,
          active: true,
          featured: false,
          images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
          warrantyInfo: '30 días de garantía oficial Zavela Store.',
          tags: ['tendencia', 'calidad', 'contraentrega'],
          weightKg: 0.5,
          categoryId: 'cat-general',
          categoryName: 'General',
          warehouseCity: 'Bogotá D.C.',
          brand: 'Zavela Store',
          dropi_product_id: '',
          variants: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }

    const clientAccessToken = rawBody.accessToken || req.headers['x-facebook-access-token'];
    const clientPageId = rawBody.pageId;

    if (clientAccessToken && !isPlaceholderToken(clientAccessToken)) {
      try {
        await pool.setFacebookConfig({
          accessToken: String(clientAccessToken).trim(),
          pageId: clientPageId ? String(clientPageId).trim() : '1256955457511976',
          connected: true,
          status: 'connected',
          lastSyncAt: new Date().toISOString()
        } as any);
      } catch (err) {
        console.warn('Could not persist client facebook token in MySQL:', err);
      }
    }

    const result = await metaGraphService.publishProductToFacebook(targetProduct, {
      customCaption,
      accessToken: clientAccessToken,
      pageId: clientPageId
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/social/facebook/sync-all - Publicar catálogo completo o seleccionados en Facebook
router.post('/social/facebook/sync-all', async (req, res) => {
  try {
    const { productIds, products: productsPayload, accessToken: clientAccessToken, pageId: clientPageId } = req.body;

    if (clientAccessToken && !isPlaceholderToken(clientAccessToken)) {
      try {
        await pool.setFacebookConfig({
          accessToken: String(clientAccessToken).trim(),
          pageId: clientPageId ? String(clientPageId).trim() : '1256955457511976',
          connected: true,
          status: 'connected',
          lastSyncAt: new Date().toISOString()
        } as any);
      } catch (err) {
        console.warn('Could not persist client facebook token in sync-all to MySQL:', err);
      }
    }

    let targetProducts: Product[] = [];

    // 1. Si el cliente envió una lista de productos completos directamente (desde la tabla del catálogo)
    if (Array.isArray(productsPayload) && productsPayload.length > 0) {
      targetProducts = productsPayload.map((p: any) => ({
        id: String(p.id || `prod-${Date.now()}`),
        title: (p.title || p.nombre || p.name || 'Producto Zavela Store').trim(),
        slug: p.slug || (p.title ? p.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : `prod-${Date.now()}`),
        description: p.description || p.descripcion || '',
        shortDescription: p.shortDescription || p.descripcion_corta || '',
        price: Number(p.price !== undefined ? p.price : p.precio) || 89900,
        costPrice: Number(p.costPrice !== undefined ? p.costPrice : (p.costo || p.cost_price)) || 45000,
        compareAtPrice: Number(p.compareAtPrice !== undefined ? p.compareAtPrice : (p.compare_price || p.comparePrice)) || 119900,
        discountPercentage: Number(p.discountPercentage || p.discount_percentage) || 20,
        marginAmount: Number(p.marginAmount) || 44900,
        marginPercentage: Number(p.marginPercentage) || 50,
        stock: Number(p.stock !== undefined ? p.stock : (p.inventario !== undefined ? p.inventario : 10)),
        active: p.active !== false && p.activo !== false,
        featured: Boolean(p.featured || p.destacado),
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
        warrantyInfo: p.warrantyInfo || p.warranty_info || '30 días de garantía oficial.',
        tags: Array.isArray(p.tags) ? p.tags : ['tendencia', 'calidad'],
        weightKg: Number(p.weightKg || p.weight_kg) || 0.5,
        categoryId: p.categoryId || p.category_id || 'cat-general',
        categoryName: p.categoryName || p.category_name || 'General',
        warehouseCity: p.warehouseCity || p.warehouse_city || 'Bogotá D.C.',
        brand: p.brand || 'Zavela Store',
        dropi_product_id: p.dropi_product_id || p.dropiProductId || p.dropi_id || '',
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
      // 2. Si solo envió IDs o no envió lista, obtener del catálogo local y de cPanel MySQL
      let allProducts = db.getProducts();
      if (allProducts.length === 0) {
        try {
          const remote = await cpanelDbService.fetchProducts();
          if (remote && remote.length > 0) allProducts = remote;
        } catch {}
      }

      if (Array.isArray(productIds) && productIds.length > 0) {
        const idStrs = productIds.map(String);
        targetProducts = allProducts.filter(p => idStrs.includes(String(p.id)) || idStrs.includes(String(p.slug)));
      } else {
        targetProducts = allProducts.slice(0, 10);
      }
    }

    if (targetProducts.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay productos disponibles para sincronizar con Facebook' });
    }

    const results = [];
    for (const prod of targetProducts) {
      const resPub = await metaGraphService.publishProductToFacebook(prod, {
        accessToken: clientAccessToken,
        pageId: clientPageId
      });
      results.push({
        productId: prod.id,
        title: prod.title,
        ...resPub
      });
      // Breve pausa para respetar rate limit de Meta
      await new Promise(r => setTimeout(r, 600));
    }

    const successCount = results.filter(r => r.success).length;

    if (successCount === 0 && results.length > 0) {
      const firstError = results.find(r => !r.success);
      return res.json({
        success: false,
        syncedCount: 0,
        totalCount: targetProducts.length,
        message: firstError?.message || 'Error al publicar productos en Facebook',
        technicalDetails: firstError?.technicalDetails,
        results
      });
    }

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

router.delete('/social/posts/:id', async (req, res) => {
  try {
    const history = await readSocialHistory();
    const rest = history.filter(p => String(p.id) !== String(req.params.id));
    const deleted = rest.length !== history.length;
    if (deleted) await writeSocialHistory(rest);
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
          model: 'gemini-3.8-flash',
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
