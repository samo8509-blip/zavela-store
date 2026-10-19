import { Router } from 'express';
import { db, isTestProduct } from '../db.ts';
import { pool, nativePool } from '../mysqlPool.ts';
import { dropiBackupService } from '../services/dropiBackupService.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';

const router = Router();

function mapSqlRowToProduct(row: any): any {
  let images: string[] = [];
  if (typeof row.imagenes === 'string' && row.imagenes.trim()) {
    try { images = JSON.parse(row.imagenes); } catch { images = [row.imagenes]; }
  } else if (row.imagen) { images = [row.imagen]; }
  
  let variants: any[] = [];
  if (typeof row.variants === 'string' && row.variants.trim()) {
    try { variants = JSON.parse(row.variants); } catch { variants = []; }
  } else if (typeof row.variantes === 'string' && row.variantes.trim()) {
    try { variants = JSON.parse(row.variantes); } catch { variants = []; }
  }

  // EXTRACCIÓN BLINDADA DIRECTA DE LA BASE DE DATOS
  let rawShipping = row.shipping_cost ?? row.flete_envio ?? row.flete ?? row.estimatedShippingCost;
  let parsedShipping = (rawShipping !== undefined && rawShipping !== null && rawShipping !== '') ? Number(rawShipping) : 0;
  
  let rawFee = row.dropi_fee ?? row.dropiFee;
  let parsedDropiFee = (rawFee !== undefined && rawFee !== null && rawFee !== '') ? Number(rawFee) : 0;
  const dropiCode = row.dropi_product_id || row.dropiProductId || '';

  return {
    id: String(row.id),
    title: row.nombre || row.title || 'Producto Zavela',
    slug: row.slug || String(row.id),
    price: Number(row.precio || row.price) || 0,
    costPrice: Number(row.supplier_cost) || 0,
    compareAtPrice: Number(row.suggested_price) || 0,
    shippingCost: isNaN(parsedShipping) ? 0 : parsedShipping,
    shipping_cost: isNaN(parsedShipping) ? 0 : parsedShipping,
    flete_envio: isNaN(parsedShipping) ? 0 : parsedShipping,
    flete: isNaN(parsedShipping) ? 0 : parsedShipping,
    estimatedShippingCost: isNaN(parsedShipping) ? 0 : parsedShipping,
    dropiFee: isNaN(parsedDropiFee) ? 0 : parsedDropiFee,
    dropi_fee: isNaN(parsedDropiFee) ? 0 : parsedDropiFee,
    stock: Number(row.stock) || 0,
    description: row.descripcion || '',
    categoryId: row.category_id || 'cat-general',
    categoryName: row.categoria || 'General',
    dropiProductId: dropiCode,
    dropi_product_id: dropiCode,
    provider: row.provider || (dropiCode ? 'dropi' : 'derocha'),
    supplier: row.supplier || (row.provider === 'dropi' ? 'Dropi Colombia' : 'DeRocha'),
    supplierSku: row.supplier_sku || '',
    image: images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    variants: variants,
    active: row.active === 1,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

router.get('/', async (req, res) => {
  try {
    let products: any[] = [];
    if (nativePool) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM productos ORDER BY created_at DESC');
        if (Array.isArray(rows)) products = rows.map(mapSqlRowToProduct);
      } catch (e) {
        console.error("Error GET MySQL:", e);
      }
    }
    res.json({ success: true, count: products.length, data: products });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

const handleProductUpsert = async (req: any, res: any) => {
  try {
    const b = req.body;
    const targetId = req.params?.id || req.query?.id || b.id || `prod-${Date.now()}`;
    const activeInt = (b.active === false || b.activo === false) ? 0 : 1;
    
    const shipping = Number(b.shipping_cost ?? b.flete_envio ?? b.flete ?? b.shippingCost ?? b.estimatedShippingCost ?? 0);
    const dropiFee = Number(b.dropi_fee ?? b.dropiFee ?? 0);
    const dropiCode = String(b.dropi_product_id || b.dropiProductId || '').trim();
    const provider = String(b.provider || (dropiCode ? 'dropi' : 'derocha')).trim();
    const supplier = b.supplier || (provider === 'dropi' ? 'Dropi Colombia' : (provider === 'derocha' ? 'DeRocha' : 'Bodega Propia'));
    
    let variantsStr = '[]';
    if (b.variants) variantsStr = typeof b.variants === 'string' ? b.variants : JSON.stringify(b.variants);
    else if (b.variantes) variantsStr = typeof b.variantes === 'string' ? b.variantes : JSON.stringify(b.variantes);

    let imagesStr = '[]';
    if (b.images) imagesStr = typeof b.images === 'string' ? b.images : JSON.stringify(b.images);
    else if (b.imagenes) imagesStr = typeof b.imagenes === 'string' ? b.imagenes : JSON.stringify(b.imagenes);

    const title = b.nombre || b.title || b.name || '';
    const price = Number(b.precio ?? b.price ?? 0);
    const cost = Number(b.costo ?? b.costPrice ?? b.supplier_cost ?? 0);
    const comparePrice = Number(b.compare_price ?? b.compareAtPrice ?? b.suggested_price ?? 0);
    const stock = Number(b.stock ?? b.inventario ?? 0);
    const description = b.descripcion || b.description || '';
    const categoryName = b.categoria || b.categoryName || 'General';
    const categoryId = b.category_id || b.categoryId || 'cat-general';
    const image = b.imagen || b.image || '';

    await pool.query(`
      INSERT INTO productos (
        id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, categoria, category_id,
        dropi_product_id, provider, supplier, supplier_sku, shipping_cost, flete_envio, flete, dropi_fee,
        imagen, imagenes, variants, variantes, active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        nombre=VALUES(nombre), precio=VALUES(precio), supplier_cost=VALUES(supplier_cost), suggested_price=VALUES(suggested_price), 
        stock=VALUES(stock), descripcion=VALUES(descripcion), categoria=VALUES(categoria), category_id=VALUES(category_id), 
        dropi_product_id=VALUES(dropi_product_id), provider=VALUES(provider), supplier=VALUES(supplier), supplier_sku=VALUES(supplier_sku), 
        shipping_cost=VALUES(shipping_cost), flete_envio=VALUES(flete_envio), flete=VALUES(flete), dropi_fee=VALUES(dropi_fee), 
        imagen=VALUES(imagen), imagenes=VALUES(imagenes), variants=VALUES(variants), variantes=VALUES(variantes), active=VALUES(active), updated_at=NOW()
    `, [
      targetId, title, price, cost, comparePrice, 
      stock, description, categoryName, categoryId, 
      dropiCode || null, provider, supplier, b.supplierSku || b.supplier_sku || '', 
      shipping, shipping, shipping, dropiFee, image, imagesStr, variantsStr, variantsStr, activeInt
    ]);

    const savedProduct = {
      ...b,
      id: targetId,
      provider,
      supplier,
      dropiProductId: dropiCode,
      dropi_product_id: dropiCode,
      shippingCost: shipping,
      shipping_cost: shipping,
      flete_envio: shipping,
      flete: shipping,
      estimatedShippingCost: shipping,
      dropiFee,
      dropi_fee: dropiFee
    };

    res.status(200).json({ success: true, message: 'Producto guardado en MySQL', data: savedProduct });
  } catch (error: any) { 
    console.error('Error guardando producto en MySQL:', error);
    res.status(500).json({ success: false, error: error.message }); 
  }
};

router.post('/', handleProductUpsert);
router.put('/', handleProductUpsert);
router.put('/:id', handleProductUpsert);

router.delete('/:id?', async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    await pool.query('DELETE FROM productos WHERE id = ?', [id]);
    res.json({ success: true, message: `Eliminado` });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/bulk-import', async (req, res) => {
  try {
    for (const item of req.body.products) {
      const id = item.id || `prod-${Date.now()}`;
      const shipping = item.shippingCost !== undefined && item.shippingCost !== null && item.shippingCost !== '' ? Number(item.shippingCost) : (item.flete !== undefined ? Number(item.flete) : 0);
      const dropiFee = item.dropiFee !== undefined && item.dropiFee !== null && item.dropiFee !== '' ? Number(item.dropiFee) : 0;
      
      await pool.query(`
        INSERT INTO productos (
          id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, dropi_product_id, provider, supplier, shipping_cost, flete_envio, flete, dropi_fee, imagen, imagenes, active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dropi', 'Dropi Colombia', ?, ?, ?, ?, ?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE
          nombre=VALUES(nombre), precio=VALUES(precio), supplier_cost=VALUES(supplier_cost), suggested_price=VALUES(suggested_price), stock=VALUES(stock), dropi_product_id=VALUES(dropi_product_id), shipping_cost=VALUES(shipping_cost), flete_envio=VALUES(flete_envio), flete=VALUES(flete), dropi_fee=VALUES(dropi_fee), imagen=VALUES(imagen), imagenes=VALUES(imagenes), updated_at=NOW()
      `, [id, item.name||'', Number(item.price)||0, Number(item.cost_price)||0, Number(item.suggested_price)||0, Number(item.stock)||0, item.description||'', item.dropi_product_id||null, shipping, shipping, shipping, dropiFee, item.images?.[0]||'', JSON.stringify(item.images||[])]);
    }
    res.status(201).json({ success: true, message: 'Importación exitosa' });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

export default router;
