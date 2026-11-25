import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from '../db.ts';
import { analyzeProduct, resolveGuard, minPrice, ceil100, profitAt, marginAt } from '../../src/utils/pricingGuard.ts';
import type { Product } from '../../src/types/index.ts';

/**
 * Precio sugerido con IA: Gemini busca en la web (Google Search) lo que cuesta el mismo producto en Colombia
 * y el servidor calcula —con las reglas de ganancia del panel— tres precios posibles.
 * Solo administradores (regla en apiGuard). Con límite de uso y memoria de 24 h para cuidar la cuota.
 */
const router = Router();
const MODEL = 'gemini-3.8-flash';

let client: GoogleGenAI | null = null;
const getClient = () => {
  if (!client && process.env.GEMINI_API_KEY) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
};

const cache = new Map<string, { at: number; data: any }>();
const hits: number[] = [];
const CACHE_MS = 24 * 3600 * 1000;
const LIMIT_PER_HOUR = 30;

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function extractJson(text: string): any | null {
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}

router.post('/', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim().slice(0, 160);
    if (title.length < 4) return res.status(400).json({ success: false, message: 'Escribe primero el título del producto (sección 3) para poder buscarlo.' });

    const ai = getClient();
    if (!ai) return res.status(503).json({ success: false, message: 'Falta la clave GEMINI_API_KEY en el servidor.' });

    const now = Date.now();
    while (hits.length && now - hits[0] > 3600 * 1000) hits.shift();
    if (hits.length >= LIMIT_PER_HOUR) return res.status(429).json({ success: false, message: 'Muchas consultas seguidas. Intenta de nuevo en unos minutos.' });

    const categoryName = String(req.body?.categoryName || '').trim().slice(0, 80);
    const guard = resolveGuard(db.getSettings()?.pricingGuard);
    const product = {
      price: num(req.body?.currentPrice),
      costPrice: num(req.body?.costProduct),
      shippingCost: num(req.body?.shipping),
      dropiFee: num(req.body?.platformFee)
    } as unknown as Product;

    // 1) Mercado (con memoria de 24 h por título)
    const key = title.toLowerCase().replace(/\s+/g, ' ');
    let market = cache.get(key);
    if (!market || now - market.at > CACHE_MS) {
      hits.push(now);
      const prompt = `Eres analista de precios para una tienda online en Colombia. Busca en la web cuánto cuesta HOY, en pesos colombianos (COP), este producto o uno equivalente en tiendas que vendan en Colombia (Mercado Libre Colombia, Amazon, Falabella, Éxito, Alkosto, Temu, tiendas de dropshipping y otras).

Producto: "${title}"${categoryName ? `\nCategoría: ${categoryName}` : ''}

Reglas estrictas:
- Usa SOLO precios que encuentres de verdad en la búsqueda. Nunca inventes precios ni enlaces. Si no encuentras nada confiable, devuelve la lista vacía.
- Precio por una unidad, en COP, sin envío. Descarta combos, lotes y repuestos.
- Máximo 8 resultados, de tiendas distintas cuando se pueda.
- Responde ÚNICAMENTE con JSON (sin texto antes ni después) con esta forma:
{"resumen":"qué producto entendiste, en una frase","confianza":"alta|media|baja","competidores":[{"tienda":"","precio":0,"url":"","nota":"diferencias importantes con el producto (marca, tamaño, cantidad)"}]}`;
      const r = await ai.models.generateContent({ model: MODEL, contents: prompt, config: { tools: [{ googleSearch: {} }] } });
      const parsed = extractJson(String(r.text || ''));
      const sources = ((r as any).candidates?.[0]?.groundingMetadata?.groundingChunks || [])
        .map((c: any) => c?.web).filter((w: any) => w?.uri).slice(0, 8).map((w: any) => ({ title: String(w.title || w.uri), uri: String(w.uri) }));
      market = { at: now, data: { parsed, sources } };
      cache.set(key, market);
      if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    }

    const parsed = market.data.parsed || {};
    let comps: { store: string; price: number; url: string; note: string }[] = (Array.isArray(parsed.competidores) ? parsed.competidores : [])
      .map((c: any) => ({ store: String(c?.tienda || '').slice(0, 60), price: Math.round(num(c?.precio)), url: String(c?.url || '').slice(0, 400), note: String(c?.nota || '').slice(0, 200) }))
      .filter((c: any) => c.price >= 1000 && c.store);
    // Fuera valores absurdos (mucho más baratos o caros que la mediana)
    if (comps.length >= 3) {
      const med = median(comps.map(c => c.price));
      comps = comps.filter(c => c.price >= med * 0.3 && c.price <= med * 3);
    }
    comps = comps.filter(c => /^https?:\/\//i.test(c.url) || !c.url).map(c => ({ ...c, url: /^https?:\/\//i.test(c.url) ? c.url : '' }));

    const prices = comps.map(c => c.price);
    const mk = prices.length ? { low: Math.min(...prices), median: Math.round(median(prices)), high: Math.max(...prices), count: prices.length } : null;

    // 2) Precios según tus reglas de ganancia
    const analyzed = analyzeProduct(product, guard);
    const hasCost = analyzed.costs.product > 0;
    const floorRaw = hasCost ? minPrice(product, guard) : 0;
    const floor = hasCost && Number.isFinite(floorRaw) ? ceil100(floorRaw) : 0;

    const warnings: string[] = [];
    if (!hasCost) warnings.push('Falta el costo del proveedor: sin él no se puede calcular tu ganancia real.');
    if (!mk) warnings.push('No se encontraron precios confiables en la web. Revisa el título o usa tu margen mínimo como guía.');
    if (mk && (parsed.confianza === 'baja')) warnings.push('La IA tiene poca certeza de que sean el mismo producto. Revisa los enlaces antes de decidir.');
    if (mk && floor && floor > mk.high) warnings.push(`Tu precio mínimo (${floor.toLocaleString('es-CO')}) está por encima del precio más alto del mercado: con estos costos será difícil competir.`);

    const build = (label: string, desc: string, raw: number) => {
      const price = ceil100(Math.max(raw, floor));
      return { label, desc, price, profit: hasCost ? Math.round(profitAt(product, guard, price)) : 0, margin: hasCost ? Number(marginAt(product, guard, price).toFixed(1)) : 0, atFloor: floor > 0 && price <= floor };
    };
    let suggestions: any[] = [];
    if (mk) {
      suggestions = [
        build('Entrada', 'Cerca del precio más bajo del mercado: vende rápido, margen justo', mk.low),
        build('Recomendado', 'Alrededor de la mediana del mercado: equilibrio entre venta y ganancia', mk.median),
        build('Alto', 'Cerca de lo más alto del mercado: más ganancia, menos ventas', mk.high * 0.95)
      ];
    } else if (floor) {
      suggestions = [build('Mínimo seguro', 'Protege tu margen mínimo; no hay datos del mercado', floor)];
    }
    // Quita sugerencias repetidas
    suggestions = suggestions.filter((s, i, a) => a.findIndex(x => x.price === s.price) === i);

    return res.json({
      success: true,
      provider: 'gemini',
      model: MODEL,
      summary: String(parsed.resumen || '').slice(0, 240),
      confidence: parsed.confianza || null,
      guard: { minMarginPercent: guard.minMarginPercent, marginBase: guard.marginBase },
      floor,
      market: mk,
      competitors: comps,
      sources: market.data.sources,
      suggestions,
      warnings,
      cached: market.at !== now
    });
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) return res.status(429).json({ success: false, message: 'Se agotó la cuota de Gemini por ahora. Intenta más tarde.' });
    console.error('[price-suggestion]', msg);
    return res.status(500).json({ success: false, message: 'No se pudo consultar el mercado. Intenta de nuevo.' });
  }
});

export default router;
