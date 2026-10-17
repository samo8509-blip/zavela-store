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
  
  // AQUÍ ERRADICAMOS EL 16500: AHORA ES 0 POR DEFECTO
  const parsedShipping = Number(row.shipping_cost ?? row.flete_envio ?? row.flete ?? 0);
  const parsedDropiFee = Number(row.dropi_fee ?? 0);

  return {
    id: String(row.id),
    title: row.nombre || row.title || 'Producto Zavela',
    slug: row.slug || String(row.id),
    price: Number(row.precio || row.price) || 0,
    costPrice: Number(row.supplier_cost) || 0,
    compareAtPrice: Number(row.suggested_price) || 0,
    shippingCost: parsedShipping,
    dropiFee: parsedDropiFee,
    stock: Number(row.stock) || 0,
    description: row.descripcion || '',
    categoryId: row.category_id || 'cat-general',
    categoryName: row.categoria || 'General',
    dropiProductId: row.dropi_product_id || '',
    provider: row.provider || 'derocha',
    supplier: row.supplier || 'DeRocha',
    supplierSku: row.supplier_sku || '',
    image: images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
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
      } catch (e) {}
    }
   // if (products.length === 0) products = db.getProducts();
    res.json({ success: true, count: products.length, data: products });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `prod-${Date.now()}`;
    const activeInt = b.active === false ? 0 : 1;
    const shipping = Number(b.shippingCost ?? 0); // FLETE EN 0
    const dropiFee = Number(b.dropiFee ?? 0);     // DROPI FEE EN 0
    
    await pool.query(`
      INSERT INTO productos (
        id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, categoria, category_id,
        dropi_product_id, provider, supplier, supplier_sku, shipping_cost, flete_envio, flete, dropi_fee,
        imagen, imagenes, active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        nombre=VALUES(nombre), precio=VALUES(precio), supplier_cost=VALUES(supplier_cost), suggested_price=VALUES(suggested_price), stock=VALUES(stock), descripcion=VALUES(descripcion), categoria=VALUES(categoria), category_id=VALUES(category_id), dropi_product_id=VALUES(dropi_product_id), provider=VALUES(provider), supplier=VALUES(supplier), supplier_sku=VALUES(supplier_sku), shipping_cost=VALUES(shipping_cost), flete_envio=VALUES(flete_envio), flete=VALUES(flete), dropi_fee=VALUES(dropi_fee), imagen=VALUES(imagen), imagenes=VALUES(imagenes), active=VALUES(active), updated_at=NOW()
    `, [id, b.title||'', Number(b.price)||0, Number(b.costPrice)||0, Number(b.compareAtPrice)||0, Number(b.stock)||0, b.description||'', b.categoryName||'General', b.categoryId||'cat-general', b.dropiProductId||null, b.provider||'derocha', b.supplier||'', b.supplierSku||'', shipping, shipping, shipping, dropiFee, b.image||'', JSON.stringify(b.images||[]), activeInt]);

    res.status(201).json({ success: true, message: 'Producto Creado' });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body;
    const targetId = req.params.id;
    const shipping = Number(b.shippingCost ?? 0); // FLETE EN 0
    const dropiFee = Number(b.dropiFee ?? 0);     // DROPI FEE EN 0
    const activeInt = b.active === false ? 0 : 1;

    await pool.query(`
      INSERT INTO productos (
        id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, categoria, category_id,
        dropi_product_id, provider, supplier, supplier_sku, shipping_cost, flete_envio, flete, dropi_fee,
        imagen, imagenes, active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        nombre=VALUES(nombre), precio=VALUES(precio), supplier_cost=VALUES(supplier_cost), suggested_price=VALUES(suggested_price), stock=VALUES(stock), descripcion=VALUES(descripcion), categoria=VALUES(categoria), category_id=VALUES(category_id), dropi_product_id=VALUES(dropi_product_id), provider=VALUES(provider), supplier=VALUES(supplier), supplier_sku=VALUES(supplier_sku), shipping_cost=VALUES(shipping_cost), flete_envio=VALUES(flete_envio), flete=VALUES(flete), dropi_fee=VALUES(dropi_fee), imagen=VALUES(imagen), imagenes=VALUES(imagenes), active=VALUES(active), updated_at=NOW()
    `, [targetId, b.title||'', Number(b.price)||0, Number(b.costPrice)||0, Number(b.compareAtPrice)||0, Number(b.stock)||0, b.description||'', b.categoryName||'General', b.categoryId||'cat-general', b.dropiProductId||null, b.provider||'derocha', b.supplier||'', b.supplierSku||'', shipping, shipping, shipping, dropiFee, b.image||'', JSON.stringify(b.images||[]), activeInt]);

    res.status(200).json({ success: true, message: "Actualizado" });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

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
      const shipping = Number(item.shippingCost ?? 0); // FLETE EN 0
      const dropiFee = Number(item.dropiFee ?? 4000); 
      
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
