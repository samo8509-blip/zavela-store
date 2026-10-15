import { Product, ProductVariant } from '../types/index.ts';

export const extractVariantColor = (v: ProductVariant): string => {
  if (v.color?.trim()) return v.color.trim();
  if (v.name?.includes(' / ')) return v.name.split(' / ')[0].trim();
  if (v.name?.includes(' - ')) return v.name.split(' - ')[0].trim();
  return v.name?.trim() || 'Color Único';
};

export const extractVariantSize = (v: ProductVariant): string => {
  if (v.size?.trim()) return v.size.trim();
  if (v.talla?.trim()) return v.talla.trim();
  if (v.name?.includes(' / ')) return v.name.split(' / ')[1].trim();
  if (v.name?.includes(' - ')) return v.name.split(' - ')[1].trim();
  return 'Única';
};

export const getColorSwatchInfo = (colorName: string): { bg: string; border?: string } => {
  const norm = colorName.toLowerCase().trim();
  if (norm.includes('negro') || norm.includes('black')) return { bg: '#111827' };
  if (norm.includes('blanco') || norm.includes('white')) return { bg: '#ffffff', border: '#cbd5e1' };
  if (norm.includes('gris claro') || norm.includes('light gray')) return { bg: '#94a3b8' };
  if (norm.includes('gris oscuro') || norm.includes('dark gray')) return { bg: '#334155' };
  if (norm.includes('gris') || norm.includes('gray')) return { bg: '#64748b' };
  if (norm.includes('rojo') || norm.includes('red')) return { bg: '#ef4444' };
  if (norm.includes('azul oscuro') || norm.includes('navy')) return { bg: '#1e3a8a' };
  if (norm.includes('azul claro') || norm.includes('sky')) return { bg: '#38bdf8' };
  if (norm.includes('azul') || norm.includes('blue')) return { bg: '#2563eb' };
  if (norm.includes('verde militar') || norm.includes('olive')) return { bg: '#4d7c0f' };
  if (norm.includes('verde') || norm.includes('green')) return { bg: '#16a34a' };
  if (norm.includes('amarillo') || norm.includes('yellow')) return { bg: '#eab308' };
  if (norm.includes('naranja') || norm.includes('orange')) return { bg: '#f97316' };
  if (norm.includes('rosado') || norm.includes('rosa') || norm.includes('pink')) return { bg: '#ec4899' };
  if (norm.includes('morado') || norm.includes('purple')) return { bg: '#9333ea' };
  if (norm.includes('vino') || norm.includes('vinotinto') || norm.includes('burgundy')) return { bg: '#831843' };
  if (norm.includes('cafe') || norm.includes('café') || norm.includes('marron') || norm.includes('marrón') || norm.includes('brown')) return { bg: '#78350f' };
  if (norm.includes('beige') || norm.includes('crema') || norm.includes('arena')) return { bg: '#f5f5dc', border: '#d1d5db' };
  if (norm.includes('dorado') || norm.includes('gold')) return { bg: '#eab308' };
  if (norm.includes('plateado') || norm.includes('silver')) return { bg: '#cbd5e1' };
  return { bg: '#475569' };
};

export const normalizeProductVariants = (product: Product | null): ProductVariant[] => {
  if (!product) return [];

  let raw: any[] = [];
  const source = product.variants || (product as any).variantes || (product as any).sizes || (product as any).tallas;

  if (Array.isArray(source) && source.length > 0) {
    raw = source;
  } else if (typeof source === 'string' && source.trim()) {
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed) && parsed.length > 0) raw = parsed;
    } catch {
      if (source.includes(',')) {
        raw = source.split(',').map((s: string) => s.trim());
      }
    }
  }

  // Inferencia de tallas para moda/fajas/enterizos/calzado si la lista aún está vacía
  const titleLower = (product.title || '').toLowerCase();
  const isFashion = titleLower.includes('enterizo') || titleLower.includes('short') || titleLower.includes('realce') || 
                    titleLower.includes('faja') || titleLower.includes('zapato') || titleLower.includes('calzado') || 
                    titleLower.includes('vestido') || titleLower.includes('pantalon') || titleLower.includes('body') ||
                    titleLower.includes('conjunto') || titleLower.includes('chaqueta') || titleLower.includes('camiseta');

  if (raw.length === 0 && isFashion) {
    raw = ['S', 'M', 'L', 'XL'];
  }

  return raw.map((item: any, idx: number) => {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      return {
        id: `var-${product.id}-${idx}`,
        productId: product.id,
        name: `${product.title} - Talla ${trimmed}`,
        size: trimmed,
        talla: trimmed,
        color: 'Color Único',
        stock: Number(product.stock) || 10,
        price: product.price,
        dropi_variation_id: (product as any).dropi_product_id
      };
    }

    const sName = item.size || item.talla || (item.name?.includes(' / ') ? item.name.split(' / ')[1]?.trim() : (item.name?.includes(' - ') ? item.name.split(' - ')[1]?.trim() : (['S','M','L','XL','XXL','28','30','32','34','36','38','39','40','41','42'].includes(item.name?.trim()) ? item.name.trim() : 'Única')));
    const cName = item.color || (item.name?.includes(' / ') ? item.name.split(' / ')[0]?.trim() : (item.name?.includes(' - ') && !['S','M','L','XL','XXL'].includes(item.name.split(' - ')[0]?.trim()) ? item.name.split(' - ')[0]?.trim() : 'Color Único'));

    return {
      ...item,
      id: String(item.id || `var-${product.id}-${idx}`),
      productId: product.id,
      name: item.name || `${cName} / ${sName}`,
      color: cName,
      size: sName,
      talla: sName,
      stock: item.stock !== undefined ? Number(item.stock) : (Number(product.stock) || 10),
      price: item.price !== undefined ? Number(item.price) : product.price,
      dropi_variation_id: item.dropi_variation_id || item.dropiVariationId
    };
  });
};
