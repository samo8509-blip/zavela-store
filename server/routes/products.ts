import { Router } from 'express';
import { db } from '../db.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';

const router = Router();

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
    });

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
    const id = body.id || `prod-${Date.now()}`;
    const price = Number(body.price) || 0;
    const costPrice = Number(body.costPrice) || 0;
    const compareAtPrice = Number(body.compareAtPrice) || (price > 0 ? Math.round(price * 1.35) : 0);
    const discountPercentage = Number(body.discountPercentage) || (compareAtPrice > price && compareAtPrice > 0 ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0);
    const marginAmount = price - costPrice;
    const marginPercentage = costPrice > 0 ? Math.round((marginAmount / costPrice) * 1000) / 10 : 0;

    const product = {
      id,
      title: body.title || 'Nuevo Producto',
      slug: body.slug || (body.title ? body.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : id),
      description: body.description || '',
      shortDescription: body.shortDescription || '',
      price,
      costPrice,
      compareAtPrice,
      discountPercentage,
      marginAmount,
      marginPercentage,
      stock: Number(body.stock) ?? 10,
      active: body.active !== false,
      featured: Boolean(body.featured),
      images: Array.isArray(body.images) && body.images.length > 0 ? body.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
      warrantyInfo: body.warrantyInfo || '30 días de garantía oficial Zavela Store.',
      tags: Array.isArray(body.tags) ? body.tags : ['tendencia', 'calidad'],
      weightKg: Number(body.weightKg) || 0.5,
      categoryId: body.categoryId || 'cat-general',
      categoryName: body.categoryName || 'General',
      warehouseCity: body.warehouseCity || 'Bogotá D.C.',
      brand: body.brand || 'Zavela Store',
      dropi_product_id: body.dropi_product_id || '',
      variants: Array.isArray(body.variants) ? body.variants : [],
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Guardar localmente
    const saved = db.saveProduct(product);

    // 2. Sincronizar de forma asíncrona con MySQL en cPanel
    cpanelDbService.saveProduct(saved).catch(err => {
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

    const updated = {
      ...existing,
      ...body,
      id,
      updatedAt: new Date().toISOString()
    };

    const saved = db.saveProduct(updated);

    cpanelDbService.saveProduct(saved).catch(err => {
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

// DELETE /api/products/:id - Eliminar producto
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = db.deleteProduct(id);

    cpanelDbService.deleteProduct(id).catch(err => {
      console.warn('[cPanel Sync] Advertencia al eliminar en cPanel MySQL:', err.message);
    });

    res.json({
      success: true,
      message: `Producto ${id} eliminado correctamente de MySQL`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
