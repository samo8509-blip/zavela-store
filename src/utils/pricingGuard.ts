import type { Product, PricingGuardSettings } from '../types/index.ts';

export const DEFAULT_PRICING_GUARD: PricingGuardSettings = {
  minMarginPercent: 25,
  marginBase: 'costo',
  includeShipping: true,
  includePlatformFee: true,
  codFeePercent: 0
};

export const resolveGuard = (g?: Partial<PricingGuardSettings>): PricingGuardSettings => ({ ...DEFAULT_PRICING_GUARD, ...(g || {}) });

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export interface UnitCosts { product: number; shipping: number; fee: number }

export const getUnitCosts = (p: Product): UnitCosts => {
  const a = p as any;
  return {
    product: num(a.costPrice ?? a.costoProveedor),
    shipping: num(a.shippingCost) || num(a.shipping_cost) || num(a.flete_envio) || num(a.flete) || num(a.estimatedShippingCost),
    fee: num(a.dropiFee) || num(a.dropi_fee)
  };
};

/** Costos fijos por unidad según lo que el usuario decidió incluir. */
export const fixedCost = (p: Product, g: PricingGuardSettings): number => {
  const c = getUnitCosts(p);
  return c.product + (g.includeShipping ? c.shipping : 0) + (g.includePlatformFee ? c.fee : 0);
};

/** Ganancia real en pesos para un precio de venta dado. */
export const profitAt = (p: Product, g: PricingGuardSettings, price: number): number =>
  price - fixedCost(p, g) - price * (g.codFeePercent / 100);

/** Margen % real según la base elegida (sobre el costo o sobre la venta). */
export const marginAt = (p: Product, g: PricingGuardSettings, price: number): number => {
  const fixed = fixedCost(p, g);
  const profit = profitAt(p, g, price);
  if (g.marginBase === 'venta') return price > 0 ? (profit / price) * 100 : 0;
  const totalCost = fixed + price * (g.codFeePercent / 100);
  return totalCost > 0 ? (profit / totalCost) * 100 : 0;
};

/** Precio mínimo para no bajar del margen protegido. */
export const minPrice = (p: Product, g: PricingGuardSettings): number => {
  const fixed = fixedCost(p, g);
  if (fixed <= 0) return 0;
  const m = g.minMarginPercent / 100;
  const f = g.codFeePercent / 100;
  const denom = g.marginBase === 'venta' ? 1 - f - m : 1 - f;
  if (denom <= 0) return Infinity;
  return g.marginBase === 'venta' ? fixed / denom : (fixed * (1 + m)) / denom;
};

/** Redondea hacia arriba a la centena (precios tipo $66.500). */
export const ceil100 = (n: number) => Math.ceil(n / 100) * 100;

export type GuardStatus = 'ok' | 'bajo' | 'perdida' | 'sin_costo';

export interface GuardRow {
  product: Product;
  price: number;
  compareAt: number;
  costs: UnitCosts;
  totalCost: number;
  profit: number;
  margin: number;
  minPrice: number;
  /** % máximo que se puede descontar del precio actual sin bajar del margen mínimo. */
  maxDiscountFromPrice: number;
  /** Descuento visible hoy (precio tachado → precio de venta). */
  shownDiscount: number;
  /** El descuento visible no coincide con el porcentaje guardado. */
  discountMismatch: boolean;
  status: GuardStatus;
}

export const analyzeProduct = (p: Product, g: PricingGuardSettings): GuardRow => {
  const price = num(p.price);
  const compareAt = num(p.compareAtPrice);
  const costs = getUnitCosts(p);
  const fixed = fixedCost(p, g);
  const min = minPrice(p, g);
  const profit = profitAt(p, g, price);
  const margin = marginAt(p, g, price);
  const shownDiscount = compareAt > price && price > 0 ? Math.round((1 - price / compareAt) * 100) : 0;
  const stored = Number(p.discountPercentage) || 0;
  let status: GuardStatus = 'ok';
  if (costs.product <= 0) status = 'sin_costo';
  else if (profit < 0) status = 'perdida';
  else if (margin + 1e-9 < g.minMarginPercent) status = 'bajo';
  return {
    product: p,
    price,
    compareAt,
    costs,
    totalCost: fixed + price * (g.codFeePercent / 100),
    profit,
    margin,
    minPrice: min,
    maxDiscountFromPrice: price > 0 && Number.isFinite(min) && min > 0 ? Math.max(0, Math.floor((1 - min / price) * 100)) : 0,
    shownDiscount,
    discountMismatch: (stored > 0 || shownDiscount > 0) && Math.abs(stored - shownDiscount) > 1,
    status
  };
};
