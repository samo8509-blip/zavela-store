/**
 * Envío por paquetes. En Dropi un pedido solo admite productos de UN mismo proveedor y se despacha con UN solo flete.
 * Por eso el carrito se agrupa por proveedor:
 *   - mismo proveedor = un paquete, con el flete más alto de sus productos;
 *   - proveedor distinto = otro paquete con su propio flete.
 * El paquete de mayor valor va con envío gratis; los demás pagan su flete, salvo que lleguen al monto de envío gratis.
 * Quién es el proveedor de cada producto se guarda en MySQL (configuraciones, clave product_suppliers), sin tocar la tabla de productos.
 */
import { pool } from '../mysqlPool.ts';
import { db } from '../db.ts';
import { getShippingZoneForLocation } from '../../src/data/shippingRates.ts';

const KEY = 'product_suppliers';
const UNKNOWN = 'sin-proveedor';

export interface SupplierInfo { id?: string; name?: string }
export type SupplierMap = Record<string, SupplierInfo>;

export interface QuoteItemIn { productId: string; quantity: number }
export interface QuotePackage {
  key: string;
  supplierName: string;
  items: { productId: string; title: string; quantity: number }[];
  subtotal: number;
  fee: number;          // lo que paga el cliente por este paquete
  baseFee: number;      // flete de referencia del paquete
  free: boolean;
  reason: 'primer_paquete' | 'monto_alcanzado' | 'cobrado';
  missingForFree: number; // cuánto falta para que este paquete sea gratis (0 si ya lo es)
}
export interface Quote { packages: QuotePackage[]; totalShipping: number; threshold: number; hasUnknownSupplier: boolean }

export async function readSupplierMap(): Promise<SupplierMap> {
  try {
    const [rows]: any = await pool.query('SELECT valor FROM configuraciones WHERE clave = ?', [KEY]);
    return rows?.[0]?.valor ? JSON.parse(rows[0].valor) : {};
  } catch { return {}; }
}

export async function writeSupplierMap(map: SupplierMap): Promise<void> {
  await pool.query(
    `INSERT INTO configuraciones (clave, valor, updated_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()`,
    [KEY, JSON.stringify(map)]
  );
}

const n = (v: any) => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;
const cleanId = (id: string) => String(id || '').replace(/^proc-/, '').trim();

async function loadProduct(rawId: string): Promise<{ id: string; title: string; price: number; flete: number } | null> {
  const id = cleanId(rawId);
  const p: any = db.getProductById(rawId) || db.getProductById(id);
  if (p) return { id: String(p.id), title: p.title || 'Producto', price: n(p.price), flete: n(p.shippingCost ?? p.shipping_cost ?? p.flete_envio ?? p.flete ?? p.estimatedShippingCost) };
  try {
    const [rows]: any = await pool.query('SELECT * FROM productos WHERE id = ? LIMIT 1', [id]);
    const r = rows?.[0];
    if (r) return { id: String(r.id), title: r.nombre || 'Producto', price: n(r.precio), flete: n(r.shipping_cost ?? r.flete_envio ?? r.flete) };
  } catch { /* se ignora */ }
  return null;
}

export async function quotePackages(items: QuoteItemIn[], department: string, city: string): Promise<Quote> {
  const settings: any = db.getSettings() || {};
  const threshold = n(settings.freeShippingThreshold) || 120000;
  const zoneRate = getShippingZoneForLocation(department || '', city || '').rateCOP || n(settings.defaultShippingCost) || 12000;
  const map = await readSupplierMap();

  const groups = new Map<string, QuotePackage>();
  for (const it of items || []) {
    const qty = Math.max(1, Math.floor(n(it.quantity)) || 1);
    const p = await loadProduct(String(it.productId || ''));
    if (!p) continue;
    const info = map[p.id] || {};
    const key = (info.id || info.name || '').toString().trim().toLowerCase() || UNKNOWN;
    let g = groups.get(key);
    if (!g) {
      g = { key, supplierName: info.name || (key === UNKNOWN ? 'Proveedor sin definir' : key), items: [], subtotal: 0, fee: 0, baseFee: 0, free: false, reason: 'cobrado', missingForFree: 0 };
      groups.set(key, g);
    }
    g.items.push({ productId: p.id, title: p.title, quantity: qty });
    g.subtotal += p.price * qty;
    g.baseFee = Math.max(g.baseFee, p.flete > 0 ? p.flete : zoneRate); // tarifa más alta del grupo
  }

  const packages = Array.from(groups.values()).sort((a, b) => b.subtotal - a.subtotal);
  packages.forEach((g, i) => {
    if (i === 0) { g.free = true; g.reason = 'primer_paquete'; }
    else if (g.subtotal >= threshold) { g.free = true; g.reason = 'monto_alcanzado'; }
    g.fee = g.free ? 0 : g.baseFee;
    g.missingForFree = g.free ? 0 : Math.max(0, threshold - g.subtotal);
  });

  return {
    packages,
    totalShipping: packages.reduce((s, g) => s + g.fee, 0),
    threshold,
    hasUnknownSupplier: groups.has(UNKNOWN)
  };
}
