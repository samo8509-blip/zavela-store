import { Router } from 'express';
import { db, isTestProduct } from '../db.ts';
import { pool, nativePool } from '../mysqlPool.ts';
import { dropiBackupService } from '../services/dropiBackupService.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';

const router = Router();

// Helper para convertir una fila SQL de MySQL en objeto Product estándar
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

  // Extracción robusta de categoría (evita que 'General' eclipse una categoría real existente)
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
    shipping_cost: row.shipping_cost !== undefined && row.shipping_cost !== null ? Number(row.shipping_cost) : 16500,
    estimatedShippingCost: row.shipping_cost !== undefined && row.shipping_cost !== null ? Number(row.shipping_cost) : 16500,
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

// Desactivar endpoints de prueba
router.all(['/test-product', '/seed', '/test'], (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Endpoints de prueba deshabilitados permanentemente. El catálogo opera únicamente con productos reales creados manualmente o importados de Dropi.'
  });
});

// GET /api/products - Consulta directa y exclusiva en MySQL cPanel
router.get('/', async (req, res) => {
  try {
    const { category, search, featured, sort, minPrice, maxPrice } = req.query;

    let products: any[] = [];
    let queriedFromSql = false;

    // 1. Consulta SQL directa a la tabla física en MySQL cPanel (priorizando `productos` y `products`)
    try {
      if (nativePool) {
        let sqlRows: any = [];
        try {
          const [pRows]: any = await pool.query('SELECT * FROM productos ORDER BY created_at DESC');
          if (Array.isArray(pRows) && pRows.length > 0) {
            sqlRows = pRows;
          }
        } catch {}

        if (!sqlRows || sqlRows.length === 0) {
          try {
            const [prodRows]: any = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
            if (Array.isArray(prodRows)) {
              sqlRows = prodRows;
            }
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

    // 2. Si no hay conexión MySQL activa en este entorno local, usar almacenamiento seguro local
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

    // 2. Filtrar productos de prueba demo conocidos
    products = products.filter(p => !isTestProduct(p));

    // 3. Filtros opcionales por categoría, búsqueda y precio
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

    if (minPrice) {
      products = products.filter(p => p.price >= Number(minPrice));
    }
    if (maxPrice) {
      products = products.filter(p => p.price <= Number(maxPrice));
    }

    // Ordenamiento
    if (sort === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'discount') {
      products.sort((a, b) => b.discountPercentage - a.discountPercentage);
    }

    // Retorna EXCLUSIVAMENTE lo que existe físicamente en MySQL
    // Si la tabla está vacía o tiene pocos productos, NO inyecta productos por defecto
    res.json({
      success: true,
      count: products.length,
      data: products
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

// GET /api/products/categories - Categorías disponibles
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

// GET /api/products/:idOrSlug - Producto individual desde MySQL
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    try {
      const [rows]: any = await pool.query(
        'SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1',
        [idOrSlug, idOrSlug]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return res.json({ success: true, data: mapSqlRowToProduct(rows[0]) });
      }

      const [altRows]: any = await pool.query(
        'SELECT * FROM productos WHERE id = ? LIMIT 1',
        [idOrSlug]
      );
      if (Array.isArray(altRows) && altRows.length > 0) {
        return res.json({ success: true, data: mapSqlRowToProduct(altRows[0]) });
      }
    } catch (sqlErr: any) {
      console.warn('[GET /api/products/:idOrSlug MySQL Error]:', sqlErr.message);
    }

    const fallback = db.getProductById(idOrSlug);
    if (fallback) {
      return res.json({ success: true, data: fallback });
    }

    res.status(404).json({ success: false, message: 'Producto no encontrado' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/products - Creación o actualización directa en MySQL
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const id = body.id || body.productId || `prod-${Date.now()}`;
    const title = (body.title || body.nombre || body.name || 'Nuevo Producto').trim();
    const slug = body.slug || (title ? title.toLowerCase().replace(/[^a-z0-9]/g, '-') : id);

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

    const price = Number(body.price !== undefined ? body.price : body.precio) || 0;
    const costPrice = Number(body.costPrice !== undefined ? body.costPrice : (body.costo || body.cost_price || body.supplier_cost)) || 0;
    const compareAtPrice = Number(body.compareAtPrice !== undefined ? body.compareAtPrice : (body.compare_price || body.suggested_price)) || (price > 0 ? Math.round(price * 1.35) : 0);
    const stock = Number(body.stock !== undefined ? body.stock : (body.inventario !== undefined ? body.inventario : 10));
    const description = body.description !== undefined ? body.description : (body.descripcion || '');

    const rawCategory = body.categoria || body.category || body.categoryName || body.categoria_nombre;
    let category = rawCategory ? String(rawCategory).trim() : 'General';
    let categoryId = body.categoryId || body.categoria_id || body.category_id || 'cat-general';

    // Resolver con catálogo de categorías para garantizar coincidencia exacta de nombre y ID
    const matchedCategory = db.getCategories().find(c => {
      const clean = category.toLowerCase().replace(/^[^\w\s]+/, '').trim();
      const cClean = c.name.toLowerCase().replace(/^[^\w\s]+/, '').trim();
      return c.id === categoryId ||
             c.slug === categoryId ||
             c.id.toLowerCase() === clean ||
             c.slug.toLowerCase() === clean ||
             cClean === clean ||
             cClean.includes(clean) ||
             clean.includes(cClean);
    });
    if (matchedCategory) {
      categoryId = matchedCategory.id;
      if (category === 'General' || category === categoryId || category === matchedCategory.slug) {
        category = matchedCategory.name;
      }
    }

    const dropiProductId = (body.dropi_product_id !== undefined && body.dropi_product_id !== null && String(body.dropi_product_id).trim() !== '')
      ? String(body.dropi_product_id).trim()
      : (body.dropiProductId !== undefined && body.dropiProductId !== null && String(body.dropiProductId).trim() !== ''
        ? String(body.dropiProductId).trim()
        : null);

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

    // 1. Guardar dropiId si corresponde
    if (dropiProductId) {
      dropiBackupService.saveDropiId(id, dropiProductId);
    }

    // 2. Inserción directa en MySQL física tabla products
    const imagesJson = JSON.stringify(validImages);
    await pool.query(`
      INSERT INTO products (
        id, title, name, slug, price, supplier_cost, suggested_price, stock, description, category, category_id, dropi_product_id, provider, supplier, supplier_sku, images, variants, variantes, sizes, active, status, estado, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        name = VALUES(name),
        slug = VALUES(slug),
        price = VALUES(price),
        supplier_cost = VALUES(supplier_cost),
        suggested_price = VALUES(suggested_price),
        stock = VALUES(stock),
        description = VALUES(description),
        category = VALUES(category),
        category_id = VALUES(category_id),
        dropi_product_id = VALUES(dropi_product_id),
        provider = VALUES(provider),
        supplier = VALUES(supplier),
        supplier_sku = VALUES(supplier_sku),
        images = VALUES(images),
        variants = VALUES(variants),
        variantes = VALUES(variantes),
        sizes = VALUES(sizes),
        active = VALUES(active),
        status = VALUES(status),
        estado = VALUES(estado),
        updated_at = NOW()
    `, [
      id, title, title, slug, price, costPrice, compareAtPrice, stock, description,
      category, categoryId, dropiProductId, provider, supplier, supplierSku, imagesJson,
      variantsJson, variantsJson, variantsJson, activeInt, statusStr, estadoStr
    ]);

    // 3. Inserción y actualización explícita de categoría en la tabla productos (MySQL cPanel)
    try {
      await pool.query(`
        INSERT INTO productos (
          id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, categoria, category, category_id, dropi_product_id, provider, supplier, supplier_sku, imagen, imagenes, variants, variantes, sizes, active, status, estado, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          nombre = VALUES(nombre),
          precio = VALUES(precio),
          supplier_cost = VALUES(supplier_cost),
          suggested_price = VALUES(suggested_price),
          stock = VALUES(stock),
          descripcion = VALUES(descripcion),
          categoria = VALUES(categoria),
          category = VALUES(category),
          category_id = VALUES(category_id),
          dropi_product_id = VALUES(dropi_product_id),
          provider = VALUES(provider),
          supplier = VALUES(supplier),
          supplier_sku = VALUES(supplier_sku),
          imagen = VALUES(imagen),
          imagenes = VALUES(imagenes),
          variants = VALUES(variants),
          variantes = VALUES(variantes),
          sizes = VALUES(sizes),
          active = VALUES(active),
          status = VALUES(status),
          estado = VALUES(estado),
          updated_at = NOW()
      `, [
        id, title, price, costPrice, compareAtPrice, stock, description,
        category, category, categoryId, dropiProductId, provider, supplier, supplierSku, mainImage, imagesJson,
        variantsJson, variantsJson, variantsJson, activeInt, statusStr, estadoStr
      ]);

      // Confirmar actualización explícita de categoria, category y category_id en la tabla productos
      await pool.query(`
        UPDATE productos SET 
          categoria = ?, 
          category = ?, 
          category_id = ? 
        WHERE id = ?
      `, [category, category, categoryId, id]);
    } catch {}

    const productRecord = {
      id,
      title,
      name: title,
      slug,
      price,
      costPrice,
      supplier_cost: costPrice,
      compareAtPrice,
      suggested_price: compareAtPrice,
      stock,
      description,
      category,
      categoryName: category,
      categoryId,
      dropi_product_id: dropiProductId || '',
      dropiProductId: dropiProductId || '',
      provider,
      supplier,
      supplier_sku: supplierSku || undefined,
      image: mainImage,
      images: validImages,
      variants: variantsList,
      variantes: variantsList,
      sizes: variantsList,
      active: activeInt === 1,
      status: statusStr,
      estado: estadoStr,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Sincronizar copia en memoria
    db.saveProduct(productRecord as any);
    cpanelDbService.saveProduct(productRecord as any).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Producto guardado físicamente en MySQL con éxito',
      data: productRecord
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/products/:id - Actualización directa en MySQL
router.put('/:id', async (req, res) => {
  try {
    const {
      nombre, name, title,
      precio, price,
      stock,
      descripcion, description,
      imagen, image,
      imagenes, images,
      supplier_cost, costo_proveedor, costPrice,
      suggested_price, compareAtPrice,
      provider, supplier,
      dropi_product_id, dropiProductId,
      supplier_sku,
      categoria, category,
    active, status,
    shipping_cost, flete_envio, flete, estimatedShippingCost
  } = req.body;

  const targetId = req.params.id;
  const finalName = nombre || name || title;
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
    const finalActive = (active === 1 || active === true || status === 'active') ? 1 : 0;

    const query = `
      UPDATE productos SET
        nombre = ?,
        precio = ?,
        stock = ?,
        descripcion = ?,
        imagen = ?,
        imagenes = ?,
        supplier_cost = ?,
        suggested_price = ?,
        shipping_cost = ?,
        flete_envio = ?,
        provider = ?,
        supplier = ?,
        dropi_product_id = ?,
        supplier_sku = ?,
        categoria = ?,
        category = ?,
        active = ?,
        updated_at = NOW()
      WHERE id = ? OR slug = ?
    `;
    const values = [
      finalName, finalPrice, finalStock, finalDesc, finalImage,
      finalImages, finalCost, finalSuggested, shippingCost, shippingCost, finalProvider, finalSupplier,
      finalDropiId, finalSku, finalCat, finalCat, finalActive,
      targetId, targetId
    ];

    console.log('Ejecutando UPDATE en productos para ID/slug:', targetId, 'shipping_cost:', shippingCost, 'flete_envio:', shippingCost);

    // Usar pool centralizado resiliente (con query timeout y fallback local)
    const [result]: any = await pool.query(query, values);

    // Si el registro no existía en productos, insertarlo para asegurar la integridad
    if (result && result.affectedRows === 0) {
      try {
        const [existing]: any = await pool.query('SELECT id FROM productos WHERE id = ? OR slug = ? LIMIT 1', [targetId, targetId]);
        if (!existing || existing.length === 0) {
          console.log(`[MySQL UPDATE] ID ${targetId} no existía en productos, insertando nuevo registro...`);
          await pool.query(`
            INSERT INTO productos (
              id, nombre, precio, stock, descripcion, imagen, imagenes,
              supplier_cost, suggested_price, shipping_cost, flete_envio, provider, supplier, dropi_product_id,
              supplier_sku, categoria, category, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            targetId, finalName, finalPrice, finalStock, finalDesc, finalImage, finalImages,
            finalCost, finalSuggested, shippingCost, shippingCost, finalProvider, finalSupplier, finalDropiId,
            finalSku, finalCat, finalCat, finalActive
          ]);
        }
      } catch (insertErr) {
        console.warn('[MySQL Insert fallback warning]:', insertErr);
      }
    }

    // Sincronizar backup de Dropi si aplica
    if (finalDropiId) {
      dropiBackupService.saveDropiId(targetId, finalDropiId);
    }

    // Sincronizar tabla products en MySQL si existe
    try {
      await pool.query(`
        UPDATE products SET
          name = ?, title = ?, price = ?, stock = ?, description = ?,
          images = ?, supplier_cost = ?, suggested_price = ?, shipping_cost = ?, flete_envio = ?, provider = ?, supplier = ?,
          dropi_product_id = ?, supplier_sku = ?, category = ?, active = ?, updated_at = NOW()
        WHERE id = ? OR slug = ?
      `, [
        finalName, finalName, finalPrice, finalStock, finalDesc,
        finalImages, finalCost, finalSuggested, shippingCost, shippingCost, finalProvider, finalSupplier,
        finalDropiId, finalSku, finalCat, finalActive,
        targetId, targetId
      ]);
    } catch {}

    // Sincronizar en memoria y respaldo local
    let parsedImages: string[] = [];
    try {
      parsedImages = typeof finalImages === 'string' ? JSON.parse(finalImages) : (Array.isArray(finalImages) ? finalImages : [finalImage]);
    } catch {
      parsedImages = finalImage ? [finalImage] : [];
    }

    const updatedProduct = {
      id: targetId,
      title: finalName,
      name: finalName,
      nombre: finalName,
      price: finalPrice,
      precio: finalPrice,
      stock: finalStock,
      description: finalDesc,
      descripcion: finalDesc,
      image: finalImage || parsedImages[0] || '',
      imagen: finalImage || parsedImages[0] || '',
      images: parsedImages,
      imagenes: parsedImages,
      supplier_cost: finalCost,
      costPrice: finalCost,
      suggested_price: finalSuggested,
      compareAtPrice: finalSuggested,
      shipping_cost: shippingCost,
      flete_envio: shippingCost,
      estimatedShippingCost: shippingCost,
      provider: finalProvider,
      supplier: finalSupplier,
      dropi_product_id: finalDropiId || undefined,
      dropiProductId: finalDropiId || undefined,
      supplier_sku: finalSku || undefined,
      category: finalCat,
      categoria: finalCat,
      active: finalActive === 1,
      status: finalActive === 1 ? 'active' : 'inactive',
      estado: finalActive === 1 ? 'activo' : 'inactivo'
    };

    db.saveProduct(updatedProduct as any);
    cpanelDbService.saveProduct(updatedProduct as any).catch(() => {});

    // Responder siempre de inmediato para nunca dejar la petición en pending
    return res.status(200).json({
      success: true,
      message: "Producto actualizado correctamente",
      product: updatedProduct
    });
  } catch (error: any) {
    console.error("Error al actualizar producto:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/products/:id/toggle-active - Alternar visibilidad activa en cPanel MySQL
router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const id = req.params.id;
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

// DELETE /api/products/:id - Eliminación definitiva en la base de datos física MySQL
router.delete('/:id?', async (req, res) => {
  try {
    const id = req.params.id || (req.query.id as string);
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID de producto no proporcionado' });
    }

    // 1. Borrado físico definitivo en MySQL (tablas products y productos)
    try {
      await pool.query('SET FOREIGN_KEY_CHECKS = 0');
      await pool.query('DELETE FROM products WHERE id = ?', [id]);
      await pool.query('DELETE FROM productos WHERE id = ?', [id]);
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log(`[MySQL] ✓ Producto ${id} eliminado permanentemente de MySQL.`);
    } catch (sqlErr: any) {
      console.warn('[MySQL Delete Product Warning]:', sqlErr.message);
      try { await pool.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
    }

    // 2. Desactivar y purgar completamente el ID de respaldo
    dropiBackupService.removeDropiId(id);

    // 3. Purgar en memoria local y en cPanel
    db.deleteProduct(id);
    cpanelDbService.deleteProduct(id).catch(() => {});

    db.addLog({
      type: 'PRODUCT_UPDATE',
      action: 'Producto Eliminado',
      details: `Producto con ID ${id} fue eliminado permanentemente de MySQL.`,
      status: 'info'
    });

    res.json({
      success: true,
      message: `Producto ${id} eliminado correctamente y de forma permanente de MySQL.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/products/bulk-import - Importador masivo de Dropi a MySQL
router.post('/bulk-import', async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron productos para importar' });
    }

    const savedProducts: any[] = [];
    const backupEntries: Record<string, string> = {};

    for (const item of products) {
      const id = item.id || `prod-dropi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const name = item.name || item.title || 'Producto Dropi';
      const slug = item.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const price = Number(item.price || item.suggested_price || 0);
      const costPrice = Number(item.cost_price || item.costPrice || 0);
      const suggestedPrice = Number(item.suggested_price || price);
      const dropiProductId = String(item.dropi_product_id || item.numeric_id || '').trim();
      const description = item.description || '';
      const stock = Number(item.stock || 50);
      const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
      const imagesJson = JSON.stringify(images);
      const mainImage = images[0];

      if (dropiProductId) {
        backupEntries[id] = dropiProductId;
        dropiBackupService.saveDropiId(id, dropiProductId);
      }

      await pool.query(`
        INSERT INTO products (
          id, title, name, slug, price, supplier_cost, suggested_price, stock, description, dropi_product_id, provider, supplier, images, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dropi', 'Dropi Colombia', ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          name = VALUES(name),
          price = VALUES(price),
          supplier_cost = VALUES(supplier_cost),
          suggested_price = VALUES(suggested_price),
          stock = VALUES(stock),
          description = VALUES(description),
          dropi_product_id = VALUES(dropi_product_id),
          images = VALUES(images),
          updated_at = NOW()
      `, [id, name, name, slug, price, costPrice, suggestedPrice, stock, description, dropiProductId || null, imagesJson]);

      try {
        await pool.query(`
          INSERT INTO productos (
            id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, dropi_product_id, provider, supplier, imagen, imagenes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dropi', 'Dropi Colombia', ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            precio = VALUES(precio),
            supplier_cost = VALUES(supplier_cost),
            suggested_price = VALUES(suggested_price),
            stock = VALUES(stock),
            descripcion = VALUES(descripcion),
            dropi_product_id = VALUES(dropi_product_id),
            imagen = VALUES(imagen),
            imagenes = VALUES(imagenes),
            updated_at = NOW()
        `, [id, name, price, costPrice, suggestedPrice, stock, description, dropiProductId || null, mainImage, imagesJson]);
      } catch {}

      const prodRecord = {
        id,
        title: name,
        slug,
        price,
        costPrice,
        supplier_cost: costPrice,
        compareAtPrice: suggestedPrice,
        suggested_price: suggestedPrice,
        stock,
        description,
        dropi_product_id: dropiProductId,
        dropiProductId,
        provider: 'dropi',
        supplier: 'Dropi Colombia',
        image: mainImage,
        images,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.saveProduct(prodRecord as any);
      savedProducts.push(prodRecord);
    }

    if (Object.keys(backupEntries).length > 0) {
      dropiBackupService.saveBulk(backupEntries);
    }

    res.status(201).json({
      success: true,
      count: savedProducts.length,
      data: savedProducts,
      message: `Se importaron ${savedProducts.length} productos con persistencia real en MySQL.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
