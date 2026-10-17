import { Router } from 'express';
import { db, isTestProduct } from '../db.ts';
import { pool, nativePool } from '../mysqlPool.ts';
import { dropiBackupService } from '../services/dropiBackupService.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';

const router = Router();

function mapSqlRowToProduct(row: any): any {
  let images: string[] = [];
  if (Array.isArray(row.images)) {
    images = row.images;
  } else if (typeof row.images === 'string' && row.images.trim()) {
    try {
      const parsed = JSON.parse(row.images);
      images = Array.isArray(parsed) ? parsed : [row.images];
    } catch {
      images = row.images.includes(',') ? row.images.split(',').map((s: string) => s.trim()) : [row.images];
    }
  } else if (row.imagen) {
    images = [row.imagen];
  } else if (row.imagenes) {
    try {
      const parsed = JSON.parse(row.imagenes);
      images = Array.isArray(parsed) ? parsed : [row.imagenes];
    } catch {
      images = [row.imagenes];
    }
  }

  if (images.length === 0) {
    images = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
  }

  const price = Number(row.price !== undefined ? row.price : row.precio) || 0;
  const supplierCost = Number(row.supplier_cost !== undefined ? row.supplier_cost : (row.costPrice || 0)) || 0;
  const suggestedPrice = Number(row.suggested_price !== undefined ? row.suggested_price : (row.compareAtPrice || 0)) || (price > 0 ? Math.round(price * 1.35) : 0);
  const dropiId = row.dropi_product_id ? String(row.dropi_product_id).trim() : '';

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

  const parsedShipping = (() => {
    const val = row.shipping_cost ?? row.flete_envio ?? row.flete ?? row.estimatedShippingCost;
    const num = Number(val);
    return (!isNaN(num) && num >= 0) ? num : 16500;
  })();

  return {
    id: String(row.id),
    title: row.title || row.name || row.nombre || 'Producto Zavela',
    name: row.title || row.name || row.nombre || 'Producto Zavela',
    nombre: row.title || row.name || row.nombre || 'Producto Zavela',
    slug: row.slug || String(row.id),
    price,
    precio: price,
    costPrice: supplierCost,
    supplier_cost: supplierCost,
    compareAtPrice: suggestedPrice,
    suggested_price: suggestedPrice,
    shipping_cost: parsedShipping,
    shippingCost: parsedShipping,
    flete_envio: parsedShipping,
    flete: parsedShipping,
    estimatedShippingCost: parsedShipping,
    discountPercentage: (suggestedPrice > price && suggestedPrice > 0) ? Math.round(((suggestedPrice - price) / suggestedPrice) * 100) : 0,
    stock: Number(row.stock !== undefined ? row.stock : 10),
    description: row.description || row.descripcion || '',
    descripcion: row.description || row.descripcion || '',
    category: resolvedCategory,
    categoria: resolvedCategory,
    categoryName: resolvedCategory,
    categoryId: resolvedCategoryId,
    category_id: resolvedCategoryId,
    categoria_id: resolvedCategoryId,
    dropi_product_id: dropiId,
    dropiProductId: dropiId,
    provider: row.provider || (dropiId ? 'dropi' : 'direct'),
    supplier: row.supplier || (row.provider === 'derocha' ? 'DeRocha' : (dropiId ? 'Dropi Colombia' : 'Bodega Directa')),
    supplier_sku: row.supplier_sku || undefined,
    image: images[0],
    imagen: images[0],
    images,
    imagenes: images,
    active: row.active !== undefined 
      ? Boolean(row.active === 1 || row.active === true || row.active === '1' || row.status === 'active' || row.estado === 'activo')
      : (row.status === 'inactive' || row.estado === 'inactivo' ? false : true),
    status: (row.active === 0 || row.active === false || row.active === '0' || row.status === 'inactive' || row.estado === 'inactivo') ? 'inactive' : 'active',
    estado: (row.active === 0 || row.active === false || row.active === '0' || row.status === 'inactive' || row.estado === 'inactivo') ? 'inactivo' : 'activo',
    featured: Boolean(row.featured === 1 || row.featured === true || row.featured === '1'),
    variants: (() => {
      let vList: any[] = [];
      const rawV = row.variants || row.variantes || row.sizes;
      if (Array.isArray(rawV)) {
        vList = rawV;
      } else if (typeof rawV === 'string' && rawV.trim()) {
        try {
          const parsed = JSON.parse(rawV);
          if (Array.isArray(parsed)) vList = parsed;
        } catch {
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
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

router.all(['/test-product', '/seed', '/test'], (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Endpoints de prueba deshabilitados permanentemente. El catálogo opera únicamente con productos reales creados manualmente o importados de Dropi.'
  });
});

router.get('/', async (req, res) => {
  try {
    const { category, search, sort, minPrice, maxPrice } = req.query;

    let products: any[] = [];
    let queriedFromSql = false;

    try {
      if (nativePool) {
        let sqlRows: any = [];
        try {
          const [pRows]: any = await pool.query('SELECT * FROM productos ORDER BY created_at DESC');
          if (Array.isArray(pRows) && pRows.length > 0) sqlRows = pRows;
        } catch {}

        if (!sqlRows || sqlRows.length === 0) {
          try {
            const [prodRows]: any = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
            if (Array.isArray(prodRows)) sqlRows = prodRows;
          } catch {}
        }

        if (Array.isArray(sqlRows)) {
          products = sqlRows.map(mapSqlRowToProduct);
          queriedFromSql = true;
        }
      }
    } catch (sqlErr: any) {
      console.warn('[GET /api/products MySQL Error]:', sqlErr.message);
    }

    if (!queriedFromSql) {
      products = db.getProducts().map((p: any) => ({
        ...p,
        id: String(p.id),
        title: p.title || p.nombre || p.name,
        name: p.title || p.nombre || p.name,
        price: Number(p.price || p.precio) || 0,
        stock: Number(p.stock !== undefined ? p.stock : 10),
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800']),
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'),
        dropi_product_id: p.dropi_product_id || p.dropiProductId || ''
      }));
    }

    products = products.filter(p => !isTestProduct(p));

    if (category && typeof category === 'string' && category !== 'all' && category !== 'todas') {
      const catLower = category.toLowerCase().trim();
      products = products.filter(p => 
        (p.category && p.category.toLowerCase().includes(catLower)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(catLower)) ||
        (p.categoryId && p.categoryId.toLowerCase() === catLower)
      );
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase().trim();
      products = products.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.dropi_product_id && p.dropi_product_id.toLowerCase().includes(q))
      );
    }

    if (minPrice) products = products.filter(p => p.price >= Number(minPrice));
    if (maxPrice) products = products.filter(p => p.price <= Number(maxPrice));

    if (sort === 'price_asc') products.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') products.sort((a, b) => b.price - a.price);
    else if (sort === 'discount') products.sort((a, b) => b.discountPercentage - a.discountPercentage);

    res.json({ success: true, count: products.length, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/proxy-image', async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) return res.status(400).send('Image URL required');
    const response = await fetch(imageUrl);
    if (!response.ok) return res.status(response.status).send('Failed to fetch image');
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

router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    try {
      const [rows]: any = await pool.query('SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1', [idOrSlug, idOrSlug]);
      if (Array.isArray(rows) && rows.length > 0) return res.json({ success: true, data: mapSqlRowToProduct(rows[0]) });

      const [altRows]: any = await pool.query('SELECT * FROM productos WHERE id = ? LIMIT 1', [idOrSlug]);
      if (Array.isArray(altRows) && altRows.length > 0) return res.json({ success: true, data: mapSqlRowToProduct(altRows[0]) });
    } catch (sqlErr: any) {
      console.warn('[GET /api/products/:idOrSlug MySQL Error]:', sqlErr.message);
    }

    const fallback = db.getProductById(idOrSlug);
    if (fallback) return res.json({ success: true, data: fallback });

    res.status(404).json({ success: false, message: 'Producto no encontrado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const id = body.id || body.productId || `prod-${Date.now()}`;
    const title = (body.title || body.nombre || body.name || 'Nuevo Producto').trim();
    const slug = body.slug || (title ? title.toLowerCase().replace(/[^a-z0-9]/g, '-') : id);

    let rawImages: string[] = [];
    if (Array.isArray(body.images) && body.images.length > 0) rawImages = body.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    else if (Array.isArray(body.imagenes) && body.imagenes.length > 0) rawImages = body.imagenes.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    else if (typeof body.imagenes === 'string' && body.imagenes.trim()) {
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

    const price = Number(body.price !== undefined ? body.price : body.precio) || 0;
    const costPrice = Number(body.costPrice !== undefined ? body.costPrice : (body.costo || body.cost_price || body.supplier_cost)) || 0;
    const compareAtPrice = Number(body.compareAtPrice !== undefined ? body.compareAtPrice : (body.compare_price || body.suggested_price)) || (price > 0 ? Math.round(price * 1.35) : 0);
    const stock = Number(body.stock !== undefined ? body.stock : (body.inventario !== undefined ? body.inventario : 10));
    const description = body.description !== undefined ? body.description : (body.descripcion || '');

    const rawShipping = body.shippingCost ?? body.shipping_cost ?? body.flete ?? body.flete_envio ?? body.estimatedShippingCost;
    const parsedShipping = typeof rawShipping === 'string' ? parseFloat(rawShipping.replace(/[^0-9.]/g, '')) : Number(rawShipping);
    const shippingCost = (!isNaN(parsedShipping) && parsedShipping >= 0) ? parsedShipping : 16500;

    const rawCategory = body.categoria || body.category || body.categoryName || body.categoria_nombre;
    let category = rawCategory ? String(rawCategory).trim() : 'General';
    let categoryId = body.categoryId || body.categoria_id || body.category_id || 'cat-general';

    const dropiProductId = (body.dropi_product_id !== undefined && body.dropi_product_id !== null && String(body.dropi_product_id).trim() !== '')
      ? String(body.dropi_product_id).trim() : (body.dropiProductId !== undefined && body.dropiProductId !== null && String(body.dropiProductId).trim() !== '' ? String(body.dropiProductId).trim() : null);

    const provider = String(body.provider || body.supplier_type || (dropiProductId ? 'dropi' : 'direct')).toLowerCase();
    const supplier = String(body.supplier || body.supplier_name || (provider === 'derocha' ? 'DeRocha' : (dropiProductId ? 'Dropi Colombia' : 'Bodega Directa')));
    const supplierSku = body.supplier_sku || body.supplierSku || body.sku || null;

    const activeInt = (body.active === 0 || body.active === false || body.active === '0' || body.active === 'inactive' || body.active === 'inactivo' || body.status === 'inactive' || body.estado === 'inactivo') ? 0 : 1;
    const statusStr = activeInt === 1 ? 'active' : 'inactive';
    const estadoStr = activeInt === 1 ? 'activo' : 'inactivo';

    let rawVariants = body.variants || body.variantes || body.sizes || [];
    if (typeof rawVariants === 'string') {
      try { rawVariants = JSON.parse(rawVariants); } catch { rawVariants = [rawVariants]; }
    }
    const variantsList = Array.isArray(rawVariants) ? rawVariants : [];
    const variantsJson = JSON.stringify(variantsList);

    if (dropiProductId) dropiBackupService.saveDropiId(id, dropiProductId);

    const imagesJson = JSON.stringify(validImages);
    
    // Inserción forzada
    try {
      await pool.query(`
        INSERT INTO productos (
          id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, categoria, category, category_id, dropi_product_id, provider, supplier, supplier_sku, shipping_cost, flete_envio, flete, imagen, imagenes, variants, variantes, sizes, active, status, estado, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          nombre = VALUES(nombre), precio = VALUES(precio), supplier_cost = VALUES(supplier_cost), suggested_price = VALUES(suggested_price), stock = VALUES(stock), descripcion = VALUES(descripcion), categoria = VALUES(categoria), category = VALUES(category), category_id = VALUES(category_id), dropi_product_id = VALUES(dropi_product_id), provider = VALUES(provider), supplier = VALUES(supplier), supplier_sku = VALUES(supplier_sku), shipping_cost = VALUES(shipping_cost), flete_envio = VALUES(flete_envio), flete = VALUES(flete), imagen = VALUES(imagen), imagenes = VALUES(imagenes), variants = VALUES(variants), variantes = VALUES(variantes), sizes = VALUES(sizes), active = VALUES(active), status = VALUES(status), estado = VALUES(estado), updated_at = NOW()
      `, [id, title, price, costPrice, compareAtPrice, stock, description, category, category, categoryId, dropiProductId, provider, supplier, supplierSku, shippingCost, shippingCost, shippingCost, mainImage, imagesJson, variantsJson, variantsJson, variantsJson, activeInt, statusStr, estadoStr]);
    } catch (e) { console.error('Error insertando en productos:', e); }

    const productRecord = {
      id, title, name: title, slug, price, costPrice, supplier_cost: costPrice, compareAtPrice, suggested_price: compareAtPrice, stock, description, category, categoryName: category, categoryId, shippingCost, shipping_cost: shippingCost, flete_envio: shippingCost, flete: shippingCost, estimatedShippingCost: shippingCost, dropi_product_id: dropiProductId || '', dropiProductId: dropiProductId || '', provider, supplier, supplier_sku: supplierSku || undefined, image: mainImage, images: validImages, variants: variantsList, variantes: variantsList, sizes: variantsList, active: activeInt === 1, status: statusStr, estado: estadoStr, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };

    db.saveProduct(productRecord as any);
    cpanelDbService.saveProduct(productRecord as any).catch(() => {});

    res.status(201).json({ success: true, message: 'Producto guardado', data: productRecord });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/products/:id - ACTUALIZACIÓN FORZADA
router.put('/:id', async (req, res) => {
  try {
    const {
      nombre, name, title, precio, price, stock, descripcion, description,
      imagen, image, imagenes, images, supplier_cost, costo_proveedor, costPrice,
      suggested_price, compareAtPrice, provider, supplier, dropi_product_id, dropiProductId,
      supplier_sku, categoria, category, active, status, shipping_cost, flete_envio, flete, estimatedShippingCost
    } = req.body;

    const targetId = req.params.id;
    const finalName = nombre || name || title || 'Producto Zavela';
    const finalPrice = Number(precio ?? price ?? 0);
    const finalStock = Number(stock ?? 0);
    const finalDesc = descripcion || description || '';
    const finalImage = imagen || image || '';
    const finalImages = typeof imagenes === 'string' ? imagenes : JSON.stringify(images || (finalImage ? [finalImage] : []));
    const finalCost = Number(supplier_cost ?? costo_proveedor ?? costPrice ?? 0);
    const finalSuggested = Number(suggested_price ?? compareAtPrice ?? finalPrice);

    const rawShipping = req.body.shippingCost ?? shipping_cost ?? flete ?? flete_envio ?? req.body.costo_envio ?? estimatedShippingCost;
    const parsedShipping = typeof rawShipping === 'string' ? parseFloat(rawShipping.replace(/[^0-9.]/g, '')) : Number(rawShipping);
    const shippingCost = (!isNaN(parsedShipping) && parsedShipping >= 0) ? parsedShipping : 16500;

    const finalProvider = provider || supplier || 'DeRocha';
    const finalSupplier = finalProvider;
    const effectiveDropiId = dropi_product_id || dropiProductId;
    const finalDropiId = (finalProvider === 'dropi' && effectiveDropiId) ? String(effectiveDropiId).trim() : null;
    const finalSku = supplier_sku || null;
    const finalCat = categoria || category || 'General';
    const finalActive = (active === 1 || active === true || status === 'active') ? 1 : 0;
    const statusStr = finalActive === 1 ? 'active' : 'inactive';
    const estadoStr = finalActive === 1 ? 'activo' : 'inactivo';

    console.log('Forzando UPSERT en productos. ID:', targetId, 'shippingCost:', shippingCost);

    // UPSERT FORZADO EN MYSQL
    try {
      await pool.query(`
        INSERT INTO productos (
          id, nombre, precio, stock, descripcion, imagen, imagenes,
          supplier_cost, suggested_price, shipping_cost, flete_envio, flete, 
          provider, supplier, dropi_product_id, supplier_sku, categoria, category, active, status, estado, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          nombre = VALUES(nombre), precio = VALUES(precio), stock = VALUES(stock), descripcion = VALUES(descripcion), imagen = VALUES(imagen), imagenes = VALUES(imagenes), supplier_cost = VALUES(supplier_cost), suggested_price = VALUES(suggested_price), shipping_cost = VALUES(shipping_cost), flete_envio = VALUES(flete_envio), flete = VALUES(flete), provider = VALUES(provider), supplier = VALUES(supplier), dropi_product_id = VALUES(dropi_product_id), supplier_sku = VALUES(supplier_sku), categoria = VALUES(categoria), category = VALUES(category), active = VALUES(active), status = VALUES(status), estado = VALUES(estado), updated_at = NOW()
      `, [
        targetId, finalName, finalPrice, finalStock, finalDesc, finalImage, finalImages,
        finalCost, finalSuggested, shippingCost, shippingCost, shippingCost,
        finalProvider, finalSupplier, finalDropiId, finalSku, finalCat, finalCat, finalActive, statusStr, estadoStr
      ]);
    } catch (e) {
      console.error('Error en UPSERT a productos:', e);
    }

    if (finalDropiId) dropiBackupService.saveDropiId(targetId, finalDropiId);

    let parsedImages: string[] = [];
    try { parsedImages = typeof finalImages === 'string' ? JSON.parse(finalImages) : (Array.isArray(finalImages) ? finalImages : [finalImage]); } catch { parsedImages = finalImage ? [finalImage] : []; }

    const updatedProduct = {
      id: targetId, title: finalName, name: finalName, nombre: finalName, price: finalPrice, precio: finalPrice, stock: finalStock, description: finalDesc, descripcion: finalDesc, image: finalImage || parsedImages[0] || '', imagen: finalImage || parsedImages[0] || '', images: parsedImages, imagenes: parsedImages, supplier_cost: finalCost, costPrice: finalCost, suggested_price: finalSuggested, compareAtPrice: finalSuggested, shippingCost: shippingCost, shipping_cost: shippingCost, flete_envio: shippingCost, flete: shippingCost, estimatedShippingCost: shippingCost, provider: finalProvider, supplier: finalSupplier, dropi_product_id: finalDropiId || undefined, dropiProductId: finalDropiId || undefined, supplier_sku: finalSku || undefined, category: finalCat, categoria: finalCat, active: finalActive === 1, status: statusStr, estado: estadoStr
    };

    db.saveProduct(updatedProduct as any);
    cpanelDbService.saveProduct(updatedProduct as any).catch(() => {});

    return res.status(200).json({ success: true, message: "Producto actualizado", product: updatedProduct });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'ID requerido' });

    let newActive = req.body?.active;
    if (newActive === undefined) {
      const [rows]: any = await pool.query('SELECT active FROM productos WHERE id = ? LIMIT 1', [id]);
      const current = rows && rows.length > 0 ? rows[0].active : 1;
      newActive = (current === 1 || current === true || current === '1') ? 0 : 1;
    } else {
      newActive = (newActive === 1 || newActive === true || newActive === '1' || newActive === 'active' || newActive === 'activo') ? 1 : 0;
    }

    const statusVal = newActive === 1 ? 'active' : 'inactive';
    const estadoVal = newActive === 1 ? 'activo' : 'inactivo';

    await pool.query('UPDATE productos SET active = ?, status = ?, estado = ?, updated_at = NOW() WHERE id = ?', [newActive, statusVal, estadoVal, id]);

    const prod = db.getProductById(id);
    if (prod) db.saveProduct({ ...prod, active: newActive === 1, status: statusVal, estado: estadoVal } as any);

    res.json({ success: true, id, active: newActive === 1, status: statusVal, estado: estadoVal });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id?', async (req, res) => {
  try {
    const id = req.params.id || (req.query.id as string);
    if (!id) return res.status(400).json({ success: false, message: 'ID no proporcionado' });

    try {
      await pool.query('SET FOREIGN_KEY_CHECKS = 0');
      await pool.query('DELETE FROM products WHERE id = ?', [id]);
      await pool.query('DELETE FROM productos WHERE id = ?', [id]);
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (sqlErr: any) {
      try { await pool.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
    }

    dropiBackupService.removeDropiId(id);
    db.deleteProduct(id);
    cpanelDbService.deleteProduct(id).catch(() => {});

    res.json({ success: true, message: `Producto ${id} eliminado.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
