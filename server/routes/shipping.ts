import { Router } from 'express';
import { quotePackages, readSupplierMap, writeSupplierMap, SupplierMap } from '../services/shippingPackages.ts';
import { db } from '../db.ts';
import { pool, nativePool } from '../mysqlPool.ts';
import { mapSqlRowToProduct } from './products.ts';

const router = Router();

/** Público: el pago pregunta cuántos paquetes salen y cuánto cuesta cada envío. El servidor lo vuelve a calcular al crear el pedido. */
router.post('/api/shipping/quote', async (req, res) => {
  try {
    const b = req.body || {};
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map((i: any) => ({ productId: String(i.productId || i.id || ''), quantity: Number(i.quantity) || 1 }));
    const q = await quotePackages(items, String(b.department || ''), String(b.city || ''));
    res.json({ success: true, ...q });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'No se pudo calcular el envío.' });
  }
});

/** Solo administrador (apiGuard): proveedor de cada producto. */
router.get('/api/admin/product-suppliers', async (_req, res) => {
  const map = await readSupplierMap();
  let list: any[] = [];
  if (nativePool) {
    try {
      const [rows]: any = await pool.query('SELECT * FROM productos ORDER BY created_at DESC');
      if (Array.isArray(rows)) list = rows.map(mapSqlRowToProduct);
    } catch { /* si falla MySQL se usa la copia local */ }
  }
  if (!list.length) list = db.getProducts() as any[];
  const products = list.map(p => ({ id: String(p.id), title: p.title || p.name || p.nombre || '', supplier: p.supplier || '', provider: p.provider || '' }));
  res.json({ success: true, map, products });
});

router.put('/api/admin/product-suppliers', async (req, res) => {
  const incoming = (req.body?.map || {}) as SupplierMap;
  const clean: SupplierMap = {};
  for (const [pid, v] of Object.entries(incoming)) {
    const id = String((v as any)?.id || '').trim().slice(0, 30);
    const name = String((v as any)?.name || '').trim().slice(0, 80);
    if (id || name) clean[String(pid).slice(0, 80)] = { id, name };
  }
  await writeSupplierMap(clean);
  res.json({ success: true, saved: Object.keys(clean).length });
});

export default router;
