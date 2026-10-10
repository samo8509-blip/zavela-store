import { Router } from 'express';
import { db, isTestProduct } from '../db.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';
import { pool } from '../mysqlPool.ts';

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
        updatedAt: new Date().toISOString()
      };

      const saved = db.saveProduct(updated);
      cpanelDbService.saveProduct({
        ...saved,
        imagen: mainImage,
        imagenes: finalImages,
        dropi_product_id: dropiProductId
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

    // 1. Guardar localmente
    const saved = db.saveProduct(product);

    // 2. Sincronizar de forma asíncrona con MySQL en cPanel
    cpanelDbService.saveProduct({
      ...saved,
      imagen: mainImage,
      imagenes: validImages,
      dropi_product_id: dropiProductId
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

    const dropiProductId = body.dropi_product_id !== undefined && body.dropi_product_id !== null
      ? String(body.dropi_product_id).trim()
      : (body.dropiProductId !== undefined && body.dropiProductId !== null
        ? String(body.dropiProductId).trim()
        : (body.dropi_id !== undefined && body.dropi_id !== null
          ? String(body.dropi_id).trim()
          : (existing?.dropi_product_id !== undefined ? String(existing.dropi_product_id) : '')));

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
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveProduct(updated);

    cpanelDbService.saveProduct({
      ...saved,
      imagen: mainImage,
      imagenes: finalImages,
      dropi_product_id: dropiProductId
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
