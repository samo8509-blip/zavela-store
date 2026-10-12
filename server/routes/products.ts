import { Router } from 'express';
import { db, isTestProduct } from '../db.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';
import { pool } from '../mysqlPool.ts';
import { dropiBackupService } from '../services/dropiBackupService.ts';

const router = Router();

// Desactivar endpoints de prueba
router.all(['/test-product', '/seed', '/test'], (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Endpoints de prueba deshabilitados permanentemente. El catálogo opera únicamente con productos reales creados manualmente o importados de Dropi.'
  });
});

// GET /api/products - Get catalog with search, category, sort
router.get('/', async (req, res) => {
  try {
    const { category, search, featured, sort, minPrice, maxPrice } = req.query;

    // 1. Intento de sincronización con la API PHP de cPanel (MySQL)
    const remoteProducts = await cpanelDbService.fetchProducts();
    if (remoteProducts && remoteProducts.length > 0) {
      db.mergeRemoteProducts(remoteProducts);
    }

    // 2. Carga y filtrado con fallback transparente a la base de datos local
    let products = db.getProducts({
      categorySlug: category as string,
      search: search as string,
      onlyActive: true,
      featured: featured === 'true'
    }).filter(p => !isTestProduct(p));

    if (minPrice) {
      products = products.filter(p => p.price >= Number(minPrice));
    }
    if (maxPrice) {
      products = products.filter(p => p.price <= Number(maxPrice));
    }

    // Sorting
    if (sort === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'discount') {
      products.sort((a, b) => b.discountPercentage - a.discountPercentage);
    } else {
      // Default: newest first
      products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const dropiMap = dropiBackupService.getBackupMap();
    const mappedProducts = products.map(p => {
      const dId = p.dropi_product_id ? String(p.dropi_product_id).trim() : (p.dropiProductId ? String(p.dropiProductId).trim() : (dropiMap[String(p.id)] || ''));
      return {
        ...p,
        dropi_product_id: dId,
        dropiProductId: dId
      };
    });

    res.json({
      success: true,
      count: mappedProducts.length,
      data: mappedProducts
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/products/proxy-image - Proxy external image for CORS-safe rendering in PDF
router.get('/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('Image URL required');
    }
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch image');
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send('Error proxying image');
  }
});

// GET /api/products/categories (and /api/products/meta/categories)
router.get('/categories', (req, res) => {
  try {
    const categories = db.getCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/meta/categories', (req, res) => {
  try {
    const categories = db.getCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/products/:id - Single product by ID or Slug
router.get('/:idOrSlug', (req, res) => {
  try {
    const product = db.getProductById(req.params.idOrSlug);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/products (o /api/products.php) - Crear o actualizar producto en MySQL
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const targetId = body.id || body.productId;
    const existing = targetId ? (db.getProductById(targetId) || db.getProducts().find(p => p.id === targetId || p.slug === targetId)) : null;

    if (targetId && existing) {
      // Si el producto ya existe, actualizarlo para evitar duplicación
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
      const finalImages = rawImages.length > 0 ? rawImages : (existing.images?.length > 0 ? existing.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800']);
      const mainImage = finalImages[0];

      const dropiProductId = body.dropi_product_id !== undefined && body.dropi_product_id !== null
        ? String(body.dropi_product_id).trim()
        : (body.dropiProductId !== undefined && body.dropiProductId !== null
          ? String(body.dropiProductId).trim()
          : (existing.dropi_product_id !== undefined ? String(existing.dropi_product_id) : ''));

      if (dropiProductId) {
        dropiBackupService.saveDropiId(targetId, dropiProductId);
        try {
          await pool.query('UPDATE products SET dropi_product_id = ? WHERE id = ?', [dropiProductId, targetId]);
        } catch {}
        try {
          await pool.query('UPDATE productos SET dropi_product_id = ? WHERE id = ?', [dropiProductId, targetId]);
        } catch {}
      }

      const updated = {
        ...existing,
        ...body,
        id: targetId,
        title: body.title || body.nombre || existing.title || 'Producto',
        description: body.description !== undefined ? body.description : (body.descripcion !== undefined ? body.descripcion : (existing.description || '')),
        price: body.price !== undefined ? Number(body.price) : (body.precio !== undefined ? Number(body.precio) : (existing.price || 0)),
        stock: body.stock !== undefined ? Number(body.stock) : (body.inventario !== undefined ? Number(body.inventario) : (existing.stock ?? 10)),
        images: finalImages,
        dropi_product_id: dropiProductId,
        dropiProductId: dropiProductId,
        updatedAt: new Date().toISOString()
      };

      const saved = db.saveProduct(updated);
      cpanelDbService.saveProduct({
        ...saved,
        imagen: mainImage,
        imagenes: finalImages,
        dropi_product_id: dropiProductId,
        dropiProductId: dropiProductId
      } as any).catch(() => {});

      return res.status(200).json({ success: true, message: 'Producto actualizado en MySQL (cPanel)', data: saved });
    }

    const id = targetId || `prod-${Date.now()}`;
    const price = Number(body.price !== undefined ? body.price : body.precio) || 0;
    const costPrice = Number(body.costPrice !== undefined ? body.costPrice : (body.costo || body.cost_price)) || 0;
    const compareAtPrice = Number(body.compareAtPrice !== undefined ? body.compareAtPrice : body.compare_price) || (price > 0 ? Math.round(price * 1.35) : 0);
    const discountPercentage = Number(body.discountPercentage) || (compareAtPrice > price && compareAtPrice > 0 ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0);
    const marginAmount = price - costPrice;
    const marginPercentage = costPrice > 0 ? Math.round((marginAmount / costPrice) * 1000) / 10 : 0;

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

    const validImages = rawImages.length > 0 ? rawImages : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
    const mainImage = validImages[0];

    const dropiProductId = body.dropi_product_id !== undefined && body.dropi_product_id !== null
      ? String(body.dropi_product_id).trim()
      : (body.dropiProductId !== undefined && body.dropiProductId !== null
        ? String(body.dropiProductId).trim()
        : (body.dropi_id !== undefined && body.dropi_id !== null ? String(body.dropi_id).trim() : ''));

    const title = (body.title || body.nombre || body.name || 'Nuevo Producto').trim();
    const slug = body.slug || (title ? title.toLowerCase().replace(/[^a-z0-9]/g, '-') : id);

    const product = {
      id,
      title,
      slug,
      description: body.description !== undefined ? body.description : (body.descripcion || ''),
      shortDescription: body.shortDescription || body.descripcion_corta || '',
      price,
      costPrice,
      compareAtPrice,
      discountPercentage,
      marginAmount,
      marginPercentage,
      stock: Number(body.stock !== undefined ? body.stock : (body.inventario !== undefined ? body.inventario : 10)),
      active: body.active !== false && body.activo !== false,
      featured: Boolean(body.featured || body.destacado),
      images: validImages,
      warrantyInfo: body.warrantyInfo || '30 días de garantía oficial Zavela Store.',
      tags: Array.isArray(body.tags) ? body.tags : ['tendencia', 'calidad'],
      weightKg: Number(body.weightKg || body.peso) || 0.5,
      categoryId: body.categoryId || body.categoria_id || 'cat-general',
      categoryName: body.categoryName || body.categoria || 'General',
      warehouseCity: body.warehouseCity || 'Bogotá D.C.',
      brand: body.brand || 'Zavela Store',
      dropi_product_id: dropiProductId,
      variants: Array.isArray(body.variants) ? body.variants : [],
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Guardar copia en respaldo persistente y en MySQL física
    if (dropiProductId) {
      dropiBackupService.saveDropiId(id, dropiProductId);
      try {
        await pool.query('UPDATE products SET dropi_product_id = ? WHERE id = ?', [dropiProductId, id]);
      } catch {}
      try {
        await pool.query('UPDATE productos SET dropi_product_id = ? WHERE id = ?', [dropiProductId, id]);
      } catch {}
    }

    // 2. Guardar localmente
    const saved = db.saveProduct({
      ...product,
      dropi_product_id: dropiProductId,
      dropiProductId: dropiProductId
    });

    // 3. Sincronizar de forma asíncrona con MySQL en cPanel
    cpanelDbService.saveProduct({
      ...saved,
      imagen: mainImage,
      imagenes: validImages,
      dropi_product_id: dropiProductId,
      dropiProductId: dropiProductId
    } as any).catch(err => {
      console.warn('[cPanel Sync] Advertencia al sincronizar producto en MySQL cPanel:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Producto guardado en MySQL (cPanel)',
      data: saved
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/products/bulk-import - Importación y Cotización Masiva desde Dropi
router.post(['/bulk-import', '/bulk_import'], async (req, res) => {
  try {
    const rawItems = req.body.items || req.body.products || req.body;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere una lista de productos para importar' });
    }

    const savedProducts: any[] = [];
    const backupEntries: Record<string, string> = {};

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const name = (item.name || item.title || item.nombre || 'Producto Importado Dropi').trim();
      
      // Normalizar slug (minúsculas, sin tildes ni caracteres especiales, con guiones)
      const rawSlug = (item.slug || name)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      
      const id = item.id || `prod-dropi-${Date.now()}-${i}`;
      const slug = rawSlug || id;
      const description = item.description || item.descripcion || '';
      
      let images = Array.isArray(item.images) && item.images.length > 0 
        ? item.images.filter((img: any) => typeof img === 'string' && img.trim())
        : (item.image ? [item.image] : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800']);
      if (images.length === 0) {
        images = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
      }
      const mainImage = images[0];

      const price = Number(item.price !== undefined ? item.price : item.precio) || 0;
      const costPrice = Number(item.cost_price !== undefined ? item.cost_price : (item.costPrice !== undefined ? item.costPrice : item.costo)) || 0;
      const dropiProductId = String(item.dropi_product_id || item.dropiProductId || item.dropi_id || item.id || '').trim();
      const estimatedShipping = Number(item.estimated_shipping !== undefined ? item.estimated_shipping : (item.estimatedShippingCost !== undefined ? item.estimatedShippingCost : 21730)) || 21730;
      const totalOperatingCost = costPrice + estimatedShipping;
      const realNetProfit = price - totalOperatingCost;
      const realNetMarginPercentage = totalOperatingCost > 0 ? Math.round((realNetProfit / totalOperatingCost) * 1000) / 10 : 0;
      const compareAtPrice = Number(item.compareAtPrice) || (price > 0 ? Math.round(price * 1.35) : 0);
      const discountPercentage = compareAtPrice > price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

      const product = {
        id,
        title: name,
        name,
        nombre: name,
        slug,
        description,
        shortDescription: item.shortDescription || description.slice(0, 160),
        price,
        costPrice,
        cost_price: costPrice,
        compareAtPrice,
        discountPercentage,
        marginAmount: realNetProfit,
        marginPercentage: realNetMarginPercentage,
        realNetProfit,
        realNetMarginPercentage,
        estimatedShippingCost: estimatedShipping,
        shipping_cost: 0, // Envío gratis al cliente
        shippingCost: 0,
        totalOperatingCost,
        stock: Number(item.stock) || 25,
        active: true,
        status: 'active',
        featured: Boolean(item.featured),
        images,
        warrantyInfo: item.warrantyInfo || '30 días de garantía oficial Zavela Store.',
        tags: Array.isArray(item.tags) ? item.tags : ['dropi', 'tendencia', 'calidad'],
        weightKg: Number(item.weightKg) || 0.5,
        categoryId: item.categoryId || item.category_id || 'cat-general',
        categoryName: item.categoryName || item.category_name || item.category || 'General',
        warehouseCity: item.warehouseCity || item.warehouse || 'Bogotá D.C.',
        brand: item.brand || 'Zavela Store',
        dropi_product_id: dropiProductId,
        dropiProductId,
        variants: Array.isArray(item.variants) ? item.variants : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Guardar en mapa de respaldo persistente
      if (dropiProductId) {
        backupEntries[id] = dropiProductId;
        dropiBackupService.saveDropiId(id, dropiProductId);
      }

      // 2. Guardar en base de datos local
      const saved = db.saveProduct(product);
      savedProducts.push(saved);

      // 3. Guardar físicamente en MySQL en ambas tablas
      try {
        const imagesJson = JSON.stringify(images);
        await pool.query(`
          INSERT INTO products (id, title, name, slug, price, cost_price, dropi_product_id, description, images, shipping_cost, stock)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            name = VALUES(name),
            price = VALUES(price),
            cost_price = VALUES(cost_price),
            dropi_product_id = COALESCE(NULLIF(VALUES(dropi_product_id), ''), products.dropi_product_id),
            images = VALUES(images),
            stock = VALUES(stock)
        `, [id, name, name, slug, price, costPrice, dropiProductId, description, imagesJson, product.stock]);
      } catch (err: any) {
        console.warn('[MySQL products bulk-import warning]:', err.message);
      }

      try {
        const imagesJson = JSON.stringify(images);
        await pool.query(`
          INSERT INTO productos (id, nombre, precio, dropi_product_id, descripcion, imagen, imagenes, stock)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            precio = VALUES(precio),
            dropi_product_id = COALESCE(NULLIF(VALUES(dropi_product_id), ''), productos.dropi_product_id),
            imagen = VALUES(imagen),
            imagenes = VALUES(imagenes),
            stock = VALUES(stock)
        `, [id, name, price, dropiProductId, description, mainImage, imagesJson, product.stock]);
      } catch (err: any) {
        console.warn('[MySQL productos bulk-import warning]:', err.message);
      }

      // 4. Sincronizar asíncronamente con cPanel
      cpanelDbService.saveProduct({
        ...saved,
        imagen: mainImage,
        imagenes: images,
        dropi_product_id: dropiProductId,
        dropiProductId
      } as any).catch(() => {});
    }

    // Guardado en lote en archivo de respaldo persistente
    if (Object.keys(backupEntries).length > 0) {
      dropiBackupService.saveBulk(backupEntries);
    }

    res.status(201).json({
      success: true,
      count: savedProducts.length,
      data: savedProducts,
      message: `Se importaron ${savedProducts.length} productos de Dropi exitosamente con persistencia en MySQL y respaldo local.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/products/:id - Actualizar producto
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    let existing = db.getProductById(id);
    const body = req.body;

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
      finalImages = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
    }
    const mainImage = finalImages[0];

    const rawIncomingDropi = body.dropi_product_id !== undefined && body.dropi_product_id !== null && String(body.dropi_product_id).trim() !== ''
      ? String(body.dropi_product_id).trim()
      : (body.dropiProductId !== undefined && body.dropiProductId !== null && String(body.dropiProductId).trim() !== ''
        ? String(body.dropiProductId).trim()
        : (body.dropi_id !== undefined && body.dropi_id !== null && String(body.dropi_id).trim() !== ''
          ? String(body.dropi_id).trim()
          : ''));

    const dropiMap = dropiBackupService.getBackupMap();
    const existingDropi = existing?.dropi_product_id ? String(existing.dropi_product_id).trim() : (dropiMap[id] || '');
    const dropiProductId = rawIncomingDropi !== '' ? rawIncomingDropi : existingDropi;

    // 1. Guardar de emergencia en respaldo persistente server/data/dropi_backup.json
    if (dropiProductId) {
      dropiBackupService.saveDropiId(id, dropiProductId);
    }

    // 2. Guardar directamente con consulta SQL en la base de datos física (UPDATE products SET dropi_product_id = ?)
    try {
      await pool.query('UPDATE products SET dropi_product_id = ? WHERE id = ?', [dropiProductId, id]);
    } catch (e: any) {
      console.warn('[MySQL products UPDATE dropi_product_id]:', e.message);
    }
    try {
      await pool.query('UPDATE productos SET dropi_product_id = ? WHERE id = ?', [dropiProductId, id]);
    } catch (e: any) {
      console.warn('[MySQL productos UPDATE dropi_product_id]:', e.message);
    }

    const updated = {
      ...existing,
      ...body,
      id,
      title: body.title || body.nombre || existing?.title || 'Producto',
      description: body.description !== undefined ? body.description : (body.descripcion !== undefined ? body.descripcion : (existing?.description || '')),
      price: body.price !== undefined ? Number(body.price) : (body.precio !== undefined ? Number(body.precio) : (existing?.price || 0)),
      stock: body.stock !== undefined ? Number(body.stock) : (body.inventario !== undefined ? Number(body.inventario) : (existing?.stock ?? 10)),
      images: finalImages,
      dropi_product_id: dropiProductId,
      dropiProductId: dropiProductId,
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveProduct(updated);

    cpanelDbService.saveProduct({
      ...saved,
      imagen: mainImage,
      imagenes: finalImages,
      dropi_product_id: dropiProductId,
      dropiProductId: dropiProductId
    } as any).catch(err => {
      console.warn('[cPanel Sync] Advertencia al actualizar en cPanel MySQL:', err.message);
    });

    res.json({
      success: true,
      message: 'Producto actualizado en MySQL (cPanel)',
      data: saved
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/products/:id o /api/products.php?id=... - Eliminar producto
router.delete('/:id?', async (req, res) => {
  try {
    const id = req.params.id || req.query.id as string;
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID de producto no proporcionado' });
    }

    const [result]: any = await pool.query('DELETE FROM productos WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Producto ${id} eliminado correctamente de MySQL`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
