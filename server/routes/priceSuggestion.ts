import { Router } from 'express';
import { db } from '../db.ts';
import { analyzeProduct, resolveGuard, minPrice, ceil100, profitAt, marginAt } from '../../src/utils/pricingGuard.ts';
import type { Product } from '../../src/types/index.ts';

/**
 * Precio sugerido: el administrador escribe los precios que encontró en otras tiendas y el servidor
 * calcula —con las reglas de ganancia del panel— tres precios posibles. No usa IA ni tiene costo.
 * Solo administradores (regla en apiGuard).
 */
const router = Router();

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

router.post('/', (req, res) => {
  try {
    let prices: number[] = (Array.isArray(req.body?.manualPrices) ? req.body.manualPrices : [])
      .map((v: any) => Math.round(num(v))).filter((v: number) => v >= 1000).slice(0, 12);
    if (prices.length === 0) return res.status(400).json({ success: false, message: 'Escribe al menos un precio en pesos (mínimo 1.000).' });

    // Fuera valores absurdos (mucho más baratos o caros que la mediana)
    if (prices.length >= 3) {
      const med = median(prices);
      prices = prices.filter(p => p >= med * 0.3 && p <= med * 3);
    }
    const mk = { low: Math.min(...prices), median: Math.round(median(prices)), high: Math.max(...prices), count: prices.length };

    const guard = resolveGuard(db.getSettings()?.pricingGuard);
    const product = {
      price: num(req.body?.currentPrice),
      costPrice: num(req.body?.costProduct),
      shippingCost: num(req.body?.shipping),
      dropiFee: num(req.body?.platformFee)
    } as unknown as Product;

    const analyzed = analyzeProduct(product, guard);
    const hasCost = analyzed.costs.product > 0;
    const floorRaw = hasCost ? minPrice(product, guard) : 0;
    const floor = hasCost && Number.isFinite(floorRaw) ? ceil100(floorRaw) : 0;

    const warnings: string[] = [];
    if (!hasCost) warnings.push('Falta el costo del proveedor: sin él no se puede calcular tu ganancia real.');
    if (floor && floor > mk.high) warnings.push(`Tu precio mínimo (${floor.toLocaleString('es-CO')}) está por encima del precio más alto que anotaste: con estos costos será difícil competir.`);

    const build = (label: string, desc: string, raw: number) => {
      const price = ceil100(Math.max(raw, floor));
      return { label, desc, price, profit: hasCost ? Math.round(profitAt(product, guard, price)) : 0, margin: hasCost ? Number(marginAt(product, guard, price).toFixed(1)) : 0, atFloor: floor > 0 && price <= floor };
    };
    const suggestions = [
      build('Entrada', 'Cerca del precio más bajo: vende rápido, margen justo', mk.low),
      build('Recomendado', 'Alrededor de la mediana: equilibrio entre venta y ganancia', mk.median),
      build('Alto', 'Cerca del más alto: más ganancia, menos ventas', mk.high * 0.95)
    ].filter((s, i, a) => a.findIndex(x => x.price === s.price) === i);

    return res.json({
      success: true,
      guard: { minMarginPercent: guard.minMarginPercent, marginBase: guard.marginBase },
      floor,
      market: mk,
      suggestions,
      warnings
    });
  } catch (err: any) {
    console.error('[price-suggestion]', err?.message || err);
    return res.status(500).json({ success: false, message: 'No se pudo calcular. Intenta de nuevo.' });
  }
});

export default router;
