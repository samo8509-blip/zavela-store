import { pool } from '../mysqlPool.ts';
import { db } from '../db.ts';
import { resolveGuard, minPrice, ceil100, profitAt, marginAt, getUnitCosts } from '../../src/utils/pricingGuard.ts';
import { DEFAULT_HOME_PROMO } from '../../src/types/index.ts';
import type { Product } from '../../src/types/index.ts';

/**
 * Campaña con precios reales (Black Friday, etc.).
 * - Al activar, el precio de venta de cada producto elegido baja de verdad en la base de datos (así lo ven la tienda,
 *   el pago, WhatsApp y el catálogo) y el "antes" que se muestra es el precio que se cobraba, no uno inventado.
 * - Los precios originales quedan guardados aparte (tabla `configuraciones`, clave `campaign_state`).
 * - Al terminar (a mano o en la fecha de fin) cada precio vuelve a su valor original.
 */

export interface CampaignItem {
  id: string;
  title: string;
  originalPrice: number;
  campaignPrice: number;
  discountPercent: number;
  applied?: boolean;
}

export interface CampaignState {
  active: boolean;
  name: string;
  startedAt?: string;
  endsAt?: string; // AAAA-MM-DD (se termina ese día a las 11:59 p. m. hora Colombia)
  maxDiscount: number;
  minMarginPercent: number;
  marginBase?: 'costo' | 'venta';
  items: CampaignItem[];
  previousHomePromo?: any | null;
  endedAt?: string;
  endedReason?: 'manual' | 'automatica';
  restored?: number;
  skipped?: { id: string; title: string; reason: string }[];
}

const KEY = 'campaign_state';
const EMPTY: CampaignState = { active: false, name: '', maxDiscount: 0, minMarginPercent: 0, items: [] };

let state: CampaignState = { ...EMPTY };
let loaded = false;

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

async function persist(): Promise<void> {
  await pool.query(
    `INSERT INTO configuraciones (clave, valor, updated_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()`,
    [KEY, JSON.stringify(state)]
  );
}

export async function loadCampaign(): Promise<CampaignState> {
  if (loaded) return state;
  try {
    const [rows]: any = await pool.query('SELECT valor FROM configuraciones WHERE clave = ? LIMIT 1', [KEY]);
    if (Array.isArray(rows) && rows[0]?.valor) {
      const parsed = JSON.parse(rows[0].valor);
      if (parsed && typeof parsed === 'object') state = { ...EMPTY, ...parsed, items: Array.isArray(parsed.items) ? parsed.items : [] };
    }
    loaded = true;
  } catch (e: any) {
    console.warn('[campaign] no se pudo leer el estado:', e?.message || e);
  }
  return state;
}

export const getCampaign = () => state;

/** Para la tienda: el precio tachado de un producto en campaña es su precio original real. */
export function applyCampaignDisplay<T extends Record<string, any>>(p: T): T {
  if (!state.active) return p;
  const it = state.items.find(i => i.applied !== false && String(i.id) === String(p.id));
  if (!it) return p;
  const price = num(p.price ?? p.precio);
  if (price <= 0 || it.originalPrice <= price) return p;
  return {
    ...p,
    compareAtPrice: it.originalPrice,
    suggested_price: it.originalPrice,
    discountPercentage: Math.round((1 - price / it.originalPrice) * 100),
    campaignName: state.name
  };
}

const endMs = (endsAt?: string) => (endsAt && /^\d{4}-\d{2}-\d{2}$/.test(endsAt) ? Date.parse(`${endsAt}T23:59:59-05:00`) : NaN);

export interface PreviewRow {
  id: string;
  title: string;
  category: string;
  price: number;
  cost: number;
  marginNow: number;
  campaignPrice: number;
  discountPercent: number;
  profitAfter: number;
  marginAfter: number;
  status: 'ok' | 'pequeno' | 'sin_costo' | 'sin_margen' | 'variantes' | 'agotado' | 'inactivo';
  note: string;
  selectable: boolean;
}

const parseVariants = (row: any): any[] => {
  const raw = row.variants ?? row.variantes;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function listCategories(): Promise<string[]> {
  const [rows]: any = await pool.query('SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL AND categoria <> ""');
  return (Array.isArray(rows) ? rows : []).map((r: any) => String(r.categoria)).sort();
}

export async function previewCampaign(opts: { categoryContains: string; maxDiscount: number; minMarginPercent: number; marginBase?: 'costo' | 'venta' }): Promise<{ rows: PreviewRow[]; categoryId: string }> {
  // Varias categorías separadas por "|" (por ejemplo "cocina|automov").
  const terms = norm(opts.categoryContains).split('|').map(t => t.trim()).filter(Boolean);
  const maxDiscount = Math.min(60, Math.max(1, num(opts.maxDiscount)));
  const guard = {
    ...resolveGuard(db.getSettings()?.pricingGuard),
    minMarginPercent: Math.min(500, Math.max(0, num(opts.minMarginPercent))),
    marginBase: (opts.marginBase === 'costo' ? 'costo' : 'venta') as 'costo' | 'venta'
  };

  const [dbRows]: any = await pool.query('SELECT * FROM productos ORDER BY created_at DESC');
  const rows: PreviewRow[] = [];
  const catCount: Record<string, number> = {};

  for (const row of (Array.isArray(dbRows) ? dbRows : [])) {
    const cat = String(row.categoria || '');
    if (terms.length === 0 || !terms.some(t => norm(cat).includes(t))) continue;
    const price = num(row.precio ?? row.price);
    const product = {
      price,
      costPrice: num(row.supplier_cost),
      shippingCost: num(row.shipping_cost) || num(row.flete_envio) || num(row.flete),
      dropiFee: num(row.dropi_fee)
    } as unknown as Product;
    const costs = getUnitCosts(product);
    const base: Omit<PreviewRow, 'status' | 'note' | 'selectable' | 'campaignPrice' | 'discountPercent' | 'profitAfter' | 'marginAfter'> = {
      id: String(row.id),
      title: String(row.nombre || row.title || 'Producto'),
      category: cat,
      price,
      cost: costs.product,
      marginNow: costs.product > 0 ? Number(marginAt(product, guard, price).toFixed(1)) : 0
    };
    const none = { campaignPrice: price, discountPercent: 0, profitAfter: 0, marginAfter: 0 };

    const active = row.active === 1 || row.active === true || row.active === '1';
    if (!active) { rows.push({ ...base, ...none, status: 'inactivo', note: 'Producto inactivo', selectable: false }); continue; }
    if (num(row.stock) <= 0) { rows.push({ ...base, ...none, status: 'agotado', note: 'Sin stock', selectable: false }); continue; }
    if (costs.product <= 0 || price <= 0) { rows.push({ ...base, ...none, status: 'sin_costo', note: 'Falta el costo del proveedor: no se puede proteger tu ganancia', selectable: false }); continue; }
    const variants = parseVariants(row);
    if (variants.length > 1 || variants.some((v: any) => v?.price !== undefined && num(v.price) > 0 && num(v.price) !== price)) {
      rows.push({ ...base, ...none, status: 'variantes', note: 'Tiene variantes con precio propio: se ajusta a mano', selectable: false });
      continue;
    }

    const floorRaw = minPrice(product, guard);
    const floor = Number.isFinite(floorRaw) ? ceil100(floorRaw) : Infinity;
    const target = ceil100(Math.max(price * (1 - maxDiscount / 100), floor));
    const cid = String(row.category_id || '');
    if (cid && cid !== 'cat-general') catCount[cid] = (catCount[cid] || 0) + 1;

    if (!(target < price)) {
      rows.push({ ...base, ...none, status: 'sin_margen', note: 'Tu margen mínimo no deja bajar el precio', selectable: false });
      continue;
    }
    const discountPercent = Math.round((1 - target / price) * 100);
    const profitAfter = Math.round(profitAt(product, guard, target));
    const marginAfter = Number(marginAt(product, guard, target).toFixed(1));
    const small = discountPercent < 5;
    rows.push({
      ...base, campaignPrice: target, discountPercent, profitAfter, marginAfter,
      status: small ? 'pequeno' : 'ok',
      note: small ? 'Descuento menor a 5%: casi no se nota' : '',
      selectable: !small
    });
  }

  const categoryId = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  rows.sort((a, b) => Number(b.selectable) - Number(a.selectable) || b.discountPercent - a.discountPercent);
  return { rows, categoryId };
}

async function persistSettings(updated: any) {
  try {
    await pool.query(
      `INSERT INTO configuraciones (clave, valor, updated_at) VALUES ('general_settings', ?, NOW())
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()`,
      [JSON.stringify(updated)]
    );
  } catch (e: any) {
    console.warn('[campaign] no se pudo guardar settings en MySQL:', e?.message || e);
  }
}

export async function activateCampaign(input: {
  productIds: string[]; categoryContains: string; maxDiscount: number; minMarginPercent: number; marginBase?: 'costo' | 'venta';
  endsAt: string; name?: string; homeBlocks?: boolean;
}): Promise<CampaignState> {
  await loadCampaign();
  if (state.active) throw new Error('Ya hay una campaña activa. Termínala antes de crear otra.');
  const ids = new Set((input.productIds || []).map(String));
  if (ids.size === 0) throw new Error('Elige al menos un producto.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.endsAt || '') || !(endMs(input.endsAt) > Date.now())) throw new Error('La fecha de fin debe ser futura (AAAA-MM-DD).');

  // Los precios se recalculan aquí: no se confía en lo que envía el navegador.
  const { rows, categoryId } = await previewCampaign(input);
  const chosen = rows.filter(r => ids.has(r.id) && r.selectable);
  if (chosen.length === 0) throw new Error('Ninguno de los productos elegidos se puede poner en campaña.');

  const name = (input.name || 'Black Friday').slice(0, 60);
  const prevPromo = db.getSettings()?.homePromo ? JSON.parse(JSON.stringify(db.getSettings().homePromo)) : null;

  state = {
    active: true,
    name,
    startedAt: new Date().toISOString(),
    endsAt: input.endsAt,
    maxDiscount: Math.min(60, Math.max(1, num(input.maxDiscount))),
    minMarginPercent: num(input.minMarginPercent),
    marginBase: input.marginBase === 'costo' ? 'costo' : 'venta',
    items: chosen.map(r => ({ id: r.id, title: r.title, originalPrice: r.price, campaignPrice: r.campaignPrice, discountPercent: r.discountPercent, applied: false })),
    previousHomePromo: prevPromo
  };
  await persist(); // primero se guardan los precios originales, después se cambia nada

  for (const it of state.items) {
    try {
      const [r]: any = await pool.query('UPDATE productos SET precio = ?, updated_at = NOW() WHERE id = ? AND precio = ?', [it.campaignPrice, it.id, it.originalPrice]);
      it.applied = num(r?.affectedRows) > 0;
    } catch (e: any) {
      it.applied = false;
      console.warn('[campaign] no se pudo bajar el precio de', it.id, e?.message || e);
    }
  }
  state.items = state.items.filter(i => i.applied);
  if (state.items.length === 0) { state.active = false; await persist(); throw new Error('No se pudo cambiar ningún precio. No se activó la campaña.'); }

  if (input.homeBlocks !== false) {
    const best = Math.max(...state.items.map(i => i.discountPercent));
    const base = { ...DEFAULT_HOME_PROMO, ...(prevPromo || {}) };
    const next: any = {
      ...base,
      band: { ...DEFAULT_HOME_PROMO.band, ...(base.band || {}), enabled: true, eyebrow: name.toUpperCase(), title: `Hasta -{n}% en ${/juguet/i.test(input.categoryContains) ? 'juguetería' : 'productos seleccionados'}`, maxDiscount: best, buttonText: 'Ver ofertas', color: 'temporada', endsAt: input.endsAt },
      shelf: { ...DEFAULT_HOME_PROMO.shelf, ...(base.shelf || {}), enabled: true, title: `${name}: precios rebajados`, source: categoryId ? 'category' : 'offers', categoryId: categoryId || '', count: 8 },
      ribbon: categoryId ? { mode: 'categories', categoryIds: [categoryId], count: 8 } : (base.ribbon || DEFAULT_HOME_PROMO.ribbon)
    };
    const updated = db.saveSettings({ homePromo: next } as any);
    await persistSettings(updated);
  }
  await persist();
  return state;
}

// ───────────────────────── Plan por niveles ─────────────────────────
export interface PlanTier { label: string; terms: string; maxDiscount: number }

/** Niveles según el margen real de cada categoría (ver el análisis de Black Friday). Una categoría cuenta en el primer nivel que la nombra. */
export const DEFAULT_TIERS: PlanTier[] = [
  { label: 'Fuerte', terms: 'electronica para el hogar|automov|cocina', maxDiscount: 18 },
  { label: 'Medio', terms: 'calzado|navide|belleza|perfumeria|moda', maxDiscount: 10 },
  { label: 'Suave', terms: 'hogar|herramient|segurid|energia solar', maxDiscount: 5 }
];

const cleanTiers = (tiers: any): PlanTier[] => {
  const src = Array.isArray(tiers) && tiers.length ? tiers : DEFAULT_TIERS;
  return src.slice(0, 6).map((t: any, i: number) => ({
    label: String(t?.label || `Nivel ${i + 1}`).slice(0, 30),
    terms: String(t?.terms || ''),
    maxDiscount: Math.min(60, Math.max(1, num(t?.maxDiscount)))
  }));
};

export type PlanRow = PreviewRow & { tier: string };

export async function previewPlan(opts: { tiers?: PlanTier[]; minMarginPercent: number; marginBase?: 'costo' | 'venta' }): Promise<PlanRow[]> {
  await loadCampaign();
  // Lo que ya está en la campaña activa (p. ej. juguetería) no se vuelve a tocar.
  const taken = new Set<string>(state.active ? state.items.map(i => String(i.id)) : []);
  const out: PlanRow[] = [];
  for (const t of cleanTiers(opts.tiers)) {
    if (!t.terms.trim()) continue;
    const { rows } = await previewCampaign({ categoryContains: t.terms, maxDiscount: t.maxDiscount, minMarginPercent: opts.minMarginPercent, marginBase: opts.marginBase });
    for (const r of rows) {
      if (taken.has(r.id)) continue;
      taken.add(r.id);
      out.push({ ...r, tier: t.label });
    }
  }
  return out;
}

/** Activa varias categorías de una vez. Si ya hay una campaña activa, agrega estos productos a ella (misma fecha de fin). */
export async function activatePlan(input: {
  productIds: string[]; tiers?: PlanTier[]; minMarginPercent: number; marginBase?: 'costo' | 'venta';
  endsAt?: string; name?: string; homeBlocks?: boolean;
}): Promise<CampaignState> {
  await loadCampaign();
  const append = state.active;
  const ids = new Set((input.productIds || []).map(String));
  if (ids.size === 0) throw new Error('Elige al menos un producto.');
  if (!append && (!/^\d{4}-\d{2}-\d{2}$/.test(input.endsAt || '') || !(endMs(input.endsAt) > Date.now()))) throw new Error('La fecha de fin debe ser futura (AAAA-MM-DD).');

  // Se recalcula en el servidor: no se confía en los precios que envía el navegador.
  const rows = await previewPlan({ tiers: input.tiers, minMarginPercent: input.minMarginPercent, marginBase: input.marginBase });
  const chosen = rows.filter(r => ids.has(r.id) && r.selectable);
  if (chosen.length === 0) throw new Error('Ninguno de los productos elegidos se puede poner en campaña.');

  const newItems: CampaignItem[] = chosen.map(r => ({ id: r.id, title: r.title, originalPrice: r.price, campaignPrice: r.campaignPrice, discountPercent: r.discountPercent, applied: false }));
  const prevPromo = append ? (state.previousHomePromo ?? null) : (db.getSettings()?.homePromo ? JSON.parse(JSON.stringify(db.getSettings().homePromo)) : null);
  const name = append ? state.name : (input.name || 'Black Friday').slice(0, 60);

  if (append) {
    state = { ...state, items: [...state.items, ...newItems] };
  } else {
    state = {
      active: true, name, startedAt: new Date().toISOString(), endsAt: input.endsAt,
      maxDiscount: Math.max(...newItems.map(i => i.discountPercent)),
      minMarginPercent: num(input.minMarginPercent),
      marginBase: input.marginBase === 'costo' ? 'costo' : 'venta',
      items: newItems, previousHomePromo: prevPromo
    };
  }
  await persist(); // primero se guardan los precios originales

  for (const it of newItems) {
    try {
      const [r]: any = await pool.query('UPDATE productos SET precio = ?, updated_at = NOW() WHERE id = ? AND precio = ?', [it.campaignPrice, it.id, it.originalPrice]);
      it.applied = num(r?.affectedRows) > 0;
    } catch (e: any) {
      it.applied = false;
      console.warn('[campaign] no se pudo bajar el precio de', it.id, e?.message || e);
    }
  }
  state.items = state.items.filter(i => i.applied !== false);
  const appliedNew = newItems.filter(i => i.applied).length;
  if (appliedNew === 0) {
    if (!append) state.active = false;
    await persist();
    throw new Error('No se pudo cambiar ningún precio.');
  }

  if (input.homeBlocks !== false) {
    const best = Math.max(...state.items.map(i => i.discountPercent));
    const cur = db.getSettings()?.homePromo;
    const base = { ...DEFAULT_HOME_PROMO, ...((append ? cur : prevPromo) || {}) };
    const next: any = {
      ...base,
      band: { ...DEFAULT_HOME_PROMO.band, ...(base.band || {}), enabled: true, eyebrow: name.toUpperCase(), title: 'Hasta -{n}% en productos seleccionados', maxDiscount: best, buttonText: 'Ver ofertas', color: 'temporada', endsAt: state.endsAt },
      shelf: { ...DEFAULT_HOME_PROMO.shelf, ...(base.shelf || {}), enabled: true, title: `${name}: precios rebajados`, source: 'offers', categoryId: '', count: 8 },
      ribbon: append ? (base.ribbon || DEFAULT_HOME_PROMO.ribbon) : (DEFAULT_HOME_PROMO.ribbon)
    };
    const updated = db.saveSettings({ homePromo: next } as any);
    await persistSettings(updated);
  }
  await persist();
  return state;
}

export async function endCampaign(reason: 'manual' | 'automatica'): Promise<CampaignState> {
  await loadCampaign();
  if (!state.active) return state;
  let restored = 0;
  const skipped: { id: string; title: string; reason: string }[] = [];
  for (const it of state.items) {
    try {
      const [r]: any = await pool.query('UPDATE productos SET precio = ?, updated_at = NOW() WHERE id = ? AND precio = ?', [it.originalPrice, it.id, it.campaignPrice]);
      if (num(r?.affectedRows) > 0) restored++;
      else skipped.push({ id: it.id, title: it.title, reason: 'Su precio ya había cambiado a mano; no se tocó' });
    } catch (e: any) {
      skipped.push({ id: it.id, title: it.title, reason: `Error: ${String(e?.message || e).slice(0, 80)}` });
    }
  }
  try {
    const prev = state.previousHomePromo;
    const updated = db.saveSettings({ homePromo: prev || JSON.parse(JSON.stringify(DEFAULT_HOME_PROMO)) } as any);
    await persistSettings(updated);
  } catch (e: any) {
    console.warn('[campaign] no se pudo restaurar el inicio:', e?.message || e);
  }
  state = { ...state, active: false, endedAt: new Date().toISOString(), endedReason: reason, restored, skipped };
  await persist();
  return state;
}

/** Termina sola la campaña cuando pasa su fecha de fin. */
export async function autoEndIfDue(): Promise<void> {
  await loadCampaign();
  if (state.active && endMs(state.endsAt) < Date.now()) {
    console.info('[campaign] fecha de fin cumplida: restaurando precios');
    await endCampaign('automatica');
  }
}
