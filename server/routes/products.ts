import { Router } from 'express';
import { db, isTestProduct } from '../db.ts';
import { pool, nativePool } from '../mysqlPool.ts';
import { dropiBackupService } from '../services/dropiBackupService.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';

const router = Router();

function mapSqlRowToProduct(row: any): any {
  let images: string[] = [];
  if (Array.isArray(row.images)) images = row.images;
  else if (typeof row.imagenes === 'string' && row.imagenes.trim()) {
    try { images = JSON.parse(row.imagenes); if (!Array.isArray(images)) images = [row.imagenes]; } catch { images = [row.imagenes]; }
  } else if (row.imagen) images = [row.imagen];
  if (images.length === 0) images = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];

  const price = Number(row.precio ?? row.price) || 0;
  const supplierCost = Number(row.supplier_cost ?? row.costPrice) || 0;
  const suggestedPrice = Number(row.suggested_price ?? row.compareAtPrice) || 0;
  const dropiId = row.dropi_product_id ? String(row.dropi_product_id).trim() : '';
  const parsedShipping = Number(row.shipping_cost ?? row.flete_envio ?? row.flete) || 0;
  const parsedDropiFee = Number(row.dropi_fee) || 0;
  const resolvedCategory = row.categoria || row.category || 'General';
  const resolvedCategoryId = row.category_id || 'cat-general';

  let vList: any[] = [];
  try { vList = JSON.parse(row.variants || row.variantes || '[]'); } catch {}

  return {
    id: String(row.id),
    title: row.nombre || row.title || 'Producto Zavela',
    slug: row.slug || String(row.id),
    price, precio: price, costPrice: supplierCost, supplier_cost: supplierCost,
    compareAtPrice: suggestedPrice, suggested_price: suggestedPrice,
    shippingCost: parsedShipping, shipping_cost: parsedShipping, flete: parsedShipping,
    dropiFee: parsedDropiFee, dropi_fee: parsedDropiFee,
    stock: Number(row.stock) || 0,
    description: row.descripcion || row.description || '',
    category: resolvedCategory, categoryName: resolvedCategory, categoryId: resolvedCategoryId,
    dropi_product_id: dropiId, dropiProductId: dropiId,
    provider: row.provider || 'derocha', supplier: row.supplier || 'DeRocha', supplier_sku: row.supplier_sku || '',
    image: images[0], images, active: Boolean(row.active === 1 || row.status === 'active'),
    status: row.status || 'active', estado: row.estado || 'activo',
    variants: vList, createdAt: row.created_at || new Date().toISOString(), updatedAt: row.updated_at || new Date().toISOString()
  };
}

router.get('/', async (req, res) => {
  try {
    let products: any[] = [];
    if (nativePool) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM productos ORDER BY created_at DESC');
        if (Array.isArray(rows)) products = rows.map(mapSqlRowToProduct);
      } catch {}
    }
    if (products.length === 0) products = db.getProducts();
    res.json({ success: true, count: products.length, data: products.filter(p => !isTestProduct(p)) });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `prod-${Date.now()}`;
    const title = (b.title || b.nombre || '').trim();
    const price = Number(b.price) || 0;
    const costPrice = Number(b.costPrice) || 0;
    const compareAtPrice = Number(b.compareAtPrice) || 0;
    const stock = Number(b.stock) || 0;
    const dropiId = b.dropiProductId || null;
    const provider = b.provider || 'derocha';
    const supplier = b.supplier || 'DeRocha';
    const shippingCost = Number(b.shippingCost) || 0;
    const dropiFee = Number(b.dropiFee) || 0;
    const activeInt = b.active === false ? 0 : 1;
    const imagesJson = JSON.stringify(b.images || []);
    const variantsJson = JSON.stringify(b.variants || []);

    if (dropiId) dropiBackupService.saveDropiId(id, dropiId);

    await pool.query(`
      INSERT INTO productos (
        id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, categoria, category, category_id,
        dropi_product_id, provider, supplier, supplier_sku, shipping_cost, flete_envio, flete, dropi_fee,
        imagen, imagenes, variants, variantes, sizes, active, status, estado, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active','activo',NOW())
      ON DUPLICATE KEY UPDATE
        nombre=VALUES(nombre), precio=VALUES(precio), supplier_cost=VALUES(supplier_cost), suggested_price=VALUES(suggested_price), stock=VALUES(stock), descripcion=VALUES(descripcion), categoria=VALUES(categoria), category=VALUES(category), category_id=VALUES(category_id), dropi_product_id=VALUES(dropi_product_id), provider=VALUES(provider), supplier=VALUES(supplier), supplier_sku=VALUES(supplier_sku), shipping_cost=VALUES(shipping_cost), flete_envio=VALUES(flete_envio), flete=VALUES(flete), dropi_fee=VALUES(dropi_fee), imagen=VALUES(imagen), imagenes=VALUES(imagenes), variants=VALUES(variants), variantes=VALUES(variantes), sizes=VALUES(sizes), active=VALUES(active), updated_at=NOW()
    `, [id, title, price, costPrice, compareAtPrice, stock, b.description||'', b.categoryName||'General', b.categoryName||'General', b.categoryId||'cat-general', dropiId, provider, supplier, b.supplierSku||'', shippingCost, shippingCost, shippingCost, dropiFee, b.image||'', imagesJson, variantsJson, variantsJson, variantsJson, activeInt]);

    res.status(201).json({ success: true, message: 'Creado', data: { id } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body;
    const targetId = req.params.id;
    const title = (b.title || b.nombre || '').trim();
    const price = Number(b.price) || 0;
    const costPrice = Number(b.costPrice) || 0;
    const compareAtPrice = Number(b.compareAtPrice) || 0;
    const stock = Number(b.stock) || 0;
    const dropiId = b.dropiProductId || null;
    const provider = b.provider || 'derocha';
    const supplier = b.supplier || 'DeRocha';
    const shippingCost = Number(b.shippingCost) || 0;
    const dropiFee = Number(b.dropiFee) || 0;
    const activeInt = b.active === false ? 0 : 1;
    const imagesJson = JSON.stringify(b.images || []);
    const variantsJson = JSON.stringify(b.variants || []);

    if (dropiId) dropiBackupService.saveDropiId(targetId, dropiId);

    await pool.query(`
      INSERT INTO productos (
        id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, categoria, category, category_id,
        dropi_product_id, provider, supplier, supplier_sku, shipping_cost, flete_envio, flete, dropi_fee,
        imagen, imagenes, variants, variantes, sizes, active, status, estado, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active','activo',NOW())
      ON DUPLICATE KEY UPDATE
        nombre=VALUES(nombre), precio=VALUES(precio), supplier_cost=VALUES(supplier_cost), suggested_price=VALUES(suggested_price), stock=VALUES(stock), descripcion=VALUES(descripcion), categoria=VALUES(categoria), category=VALUES(category), category_id=VALUES(category_id), dropi_product_id=VALUES(dropi_product_id), provider=VALUES(provider), supplier=VALUES(supplier), supplier_sku=VALUES(supplier_sku), shipping_cost=VALUES(shipping_cost), flete_envio=VALUES(flete_envio), flete=VALUES(flete), dropi_fee=VALUES(dropi_fee), imagen=VALUES(imagen), imagenes=VALUES(imagenes), variants=VALUES(variants), variantes=VALUES(variantes), sizes=VALUES(sizes), active=VALUES(active), updated_at=NOW()
    `, [targetId, title, price, costPrice, compareAtPrice, stock, b.description||'', b.categoryName||'General', b.categoryName||'General', b.categoryId||'cat-general', dropiId, provider, supplier, b.supplierSku||'', shippingCost, shippingCost, shippingCost, dropiFee, b.image||'', imagesJson, variantsJson, variantsJson, variantsJson, activeInt]);

    res.status(200).json({ success: true, message: "Actualizado" });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.delete('/:id?', async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    await pool.query('DELETE FROM products WHERE id = ?', [id]).catch(()=>{});
    await pool.query('DELETE FROM productos WHERE id = ?', [id]).catch(()=>{});
    res.json({ success: true, message: `Eliminado` });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/bulk-import', async (req, res) => {
  try {
    for (const item of req.body.products) {
      const id = item.id || `prod-${Date.now()}`;
      const shipping = Number(item.shippingCost) || 0;
      const dropiFee = Number(item.dropiFee) || 4000;
      const imagesJson = JSON.stringify(item.images || []);
      
      await pool.query(`
        INSERT INTO productos (
          id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, dropi_product_id, provider, supplier, shipping_cost, flete_envio, flete, dropi_fee, imagen, imagenes, active, status, estado, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dropi', 'Dropi Colombia', ?, ?, ?, ?, ?, ?, 1, 'active', 'activo', NOW())
        ON DUPLICATE KEY UPDATE
          nombre=VALUES(nombre), precio=VALUES(precio), supplier_cost=VALUES(supplier_cost), suggested_price=VALUES(suggested_price), stock=VALUES(stock), dropi_product_id=VALUES(dropi_product_id), shipping_cost=VALUES(shipping_cost), flete_envio=VALUES(flete_envio), flete=VALUES(flete), dropi_fee=VALUES(dropi_fee), imagen=VALUES(imagen), imagenes=VALUES(imagenes), updated_at=NOW()
      `, [id, item.name||'', Number(item.price)||0, Number(item.cost_price)||0, Number(item.suggested_price)||0, Number(item.stock)||0, item.description||'', item.dropi_product_id||null, shipping, shipping, shipping, dropiFee, item.images?.[0]||'', imagesJson]);
    }
    res.status(201).json({ success: true, message: 'Importación exitosa' });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
