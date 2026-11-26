import { Router } from 'express';
import { quotePackages, readSupplierMap, writeSupplierMap, SupplierMap } from '../services/shippingPackages.ts';
import { db } from '../db.ts';

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
  const products = (db.getProducts() as any[]).map(p => ({ id: String(p.id), title: p.title, supplier: p.supplier || '', provider: p.provider || '' }));
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
