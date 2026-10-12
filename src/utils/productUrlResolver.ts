import { Product } from '../types/index.ts';

/**
 * Normaliza cualquier texto para comparación de slugs:
 * - Pasa a minúsculas
 * - Remueve acentos y diacríticos (á -> a, ñ -> n)
 * - Convierte caracteres no alfanuméricos a guiones
 * - Elimina guiones sobrantes al inicio y final
 */
export function normalizeSlugText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ExtractedProductRoute {
  identifier: string | null;
  isProductRoute: boolean;
  isRuletaClosing: boolean;
  rawPath: string;
}

/**
 * Extrae limpiamente el slug o ID del producto desde la URL actual del navegador:
 * Soporta:
 * - /producto/:slug o /producto/:id
 * - /product/:slug o /product/:id
 * - /productos/:slug o /products/:slug
 * - /p/:slug o /p/:id
 * - Parámetros de consulta ?product=... o ?p=... o ?id=...
 *
 * Filtra e ignora completamente parámetros de Facebook y redes sociales (?fbclid=..., ?utm_source=...)
 */
export function extractProductIdentifierFromUrl(): ExtractedProductRoute {
  if (typeof window === 'undefined') {
    return { identifier: null, isProductRoute: false, isRuletaClosing: false, rawPath: '' };
  }

  const pathname = window.location.pathname || '';
  const searchParams = new URLSearchParams(window.location.search);

  // Parámetro de cierre o ruleta promocional
  const ruletaParam = searchParams.get('ruleta') || searchParams.get('cierre') || searchParams.get('descuento');
  const isRuletaClosing = ruletaParam === 'true' || ruletaParam === '1';

  // 1. Detección en la ruta PATH (rutas limpias /producto/:slug o /product/:slug)
  const pathRegex = /^\/(?:producto|product|productos|products|p)\/([^/?#]+)/i;
  const match = pathname.match(pathRegex);

  if (match && match[1]) {
    try {
      const decoded = decodeURIComponent(match[1]).trim().replace(/\/+$/, '');
      if (decoded) {
        return {
          identifier: decoded,
          isProductRoute: true,
          isRuletaClosing,
          rawPath: pathname
        };
      }
    } catch {
      return {
        identifier: match[1].trim(),
        isProductRoute: true,
        isRuletaClosing,
        rawPath: pathname
      };
    }
  }

  // 2. Detección en parámetros de búsqueda (?product=... o ?p=... o ?id=...)
  const queryParam = searchParams.get('product') || searchParams.get('p') || searchParams.get('id');
  if (queryParam) {
    try {
      const decoded = decodeURIComponent(queryParam).trim();
      if (decoded) {
        return {
          identifier: decoded,
          isProductRoute: true,
          isRuletaClosing,
          rawPath: pathname
        };
      }
    } catch {
      return {
        identifier: queryParam.trim(),
        isProductRoute: true,
        isRuletaClosing,
        rawPath: pathname
      };
    }
  }

  return {
    identifier: null,
    isProductRoute: false,
    isRuletaClosing,
    rawPath: pathname
  };
}

/**
 * Resuelve y encuentra un producto en el catálogo mediante búsqueda multi-criterio:
 * 1. Coincidencia exacta por ID o Slug
 * 2. Coincidencia exacta por Slug o ID normalizado
 * 3. Coincidencia por título normalizado
 * 4. Búsqueda semántica por palabras clave (transformando guiones a palabras normales: "lamparas-unas-48-w")
 */
export function resolveProductMatch(rawTarget: string, catalog: Product[]): Product | null {
  if (!rawTarget || !catalog || catalog.length === 0) return null;

  const target = rawTarget.trim();
  const lowerTarget = target.toLowerCase();
  const normTarget = normalizeSlugText(target);

  // 1. Coincidencia directa por ID o Slug exacto
  const exact = catalog.find(p => 
    p.id === target || 
    p.slug === target || 
    p.id.toLowerCase() === lowerTarget || 
    (p.slug && p.slug.toLowerCase() === lowerTarget) ||
    String((p as any).productId || '') === target
  );
  if (exact) return exact;

  // 2. Coincidencia por Slug o ID normalizado (sin tildes, con guiones)
  const normMatch = catalog.find(p => {
    if (p.slug && normalizeSlugText(p.slug) === normTarget) return true;
    if (normalizeSlugText(p.id) === normTarget) return true;
    if (p.title && normalizeSlugText(p.title) === normTarget) return true;
    return false;
  });
  if (normMatch) return normMatch;

  // 3. Transformación de guiones a palabras y búsqueda por coincidencia léxica
  // Ejemplo: "lamparas-unas-48-w" -> ["lamparas", "unas", "48", "w"]
  const searchWords = normTarget
    .split('-')
    .map(w => w.trim())
    .filter(w => w.length > 1);

  if (searchWords.length > 0) {
    let bestProduct: Product | null = null;
    let maxMatches = 0;

    for (const p of catalog) {
      const normTitle = normalizeSlugText(p.title || '');
      const normSlug = normalizeSlugText(p.slug || '');
      const normDesc = normalizeSlugText(p.shortDescription || p.description || '');

      let score = 0;
      for (const word of searchWords) {
        if (normSlug.includes(word)) score += 3;
        else if (normTitle.includes(word)) score += 2;
        else if (normDesc.includes(word)) score += 1;
      }

      // Si coincide la mayoría de las palabras del slug
      if (score > maxMatches && score >= Math.min(searchWords.length * 2, 4)) {
        maxMatches = score;
        bestProduct = p;
      }
    }

    if (bestProduct) {
      return bestProduct;
    }
  }

  // 4. Coincidencia parcial de prefijo / sufijo en ID
  const partialId = catalog.find(p => 
    p.id.toLowerCase().includes(lowerTarget) || 
    lowerTarget.includes(p.id.toLowerCase())
  );
  if (partialId) return partialId;

  return null;
}

/**
 * Consulta la API backend de Zavela Store para resolver un producto si no está en memoria local
 */
export async function fetchProductDirectlyFromApi(identifier: string): Promise<Product | null> {
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(identifier)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      return json.data as Product;
    }
  } catch (e) {
    console.warn('[fetchProductDirectlyFromApi Error]:', e);
  }
  return null;
}
