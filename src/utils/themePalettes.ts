export interface TrustPalette {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  badge: string;
  psychologyDescription: string;
  colorHex: {
    primary: string;
    primaryHover: string;
    secondary: string;
    accent: string;
    background: string;
    cardBg: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    ctaGradient: string;
    ctaHoverGradient: string;
  };
  classes: {
    // Backgrounds
    pageBg: string;
    cardBg: string;
    cardBorder: string;
    headerBg: string;
    topBarBg: string;
    
    // Primary accents
    primaryText: string;
    primaryBg: string;
    primaryBorder: string;
    primaryLightBg: string;
    primaryLightText: string;
    
    // Secondary / Badges
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    
    // CTA Buttons
    ctaBg: string;
    ctaText: string;
    ctaHover: string;
    
    // Active tabs / pills
    activePillBg: string;
    activePillText: string;
  };
}

export const TRUST_PALETTES: TrustPalette[] = [
  {
    id: 'trust_sapphire',
    name: 'Azul Zafiro Confianza (Recomendada)',
    shortName: 'Zafiro Confianza',
    tagline: 'Seguridad bancaria e institucional',
    badge: 'Máxima Confianza E-commerce',
    psychologyDescription: 'El azul zafiro es el estándar global de seguridad institucional y bancaria (PayPal, Visa, MercadoLibre). Transmite solidez, protección de datos, puntualidad y respaldo oficial en cada entrega.',
    colorHex: {
      primary: '#0284C7', // Sky 600
      primaryHover: '#0369A1',
      secondary: '#059669', // Emerald 600
      accent: '#FF5A36', // Coral
      background: '#F8FAFC',
      cardBg: '#FFFFFF',
      border: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#64748B',
      ctaGradient: 'from-[#0284C7] to-[#0369A1]',
      ctaHoverGradient: 'from-[#0369A1] to-[#075985]'
    },
    classes: {
      pageBg: 'bg-slate-50',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-200',
      headerBg: 'bg-white/95',
      topBarBg: 'bg-[#0B1528]',
      primaryText: 'text-sky-700',
      primaryBg: 'bg-sky-600',
      primaryBorder: 'border-sky-300',
      primaryLightBg: 'bg-sky-50',
      primaryLightText: 'text-sky-800',
      badgeBg: 'bg-sky-50',
      badgeText: 'text-sky-800',
      badgeBorder: 'border-sky-200',
      ctaBg: 'bg-gradient-to-r from-sky-600 to-blue-600',
      ctaText: 'text-white',
      ctaHover: 'hover:from-sky-700 hover:to-blue-700',
      activePillBg: 'bg-sky-600',
      activePillText: 'text-white'
    }
  },
  {
    id: 'emerald_security',
    name: 'Verde Esmeralda Pago Seguro',
    shortName: 'Esmeralda Seguro',
    tagline: 'Garantía de entrega & pago contra entrega',
    badge: '100% Contra Entrega',
    psychologyDescription: 'El verde esmeralda activa en la mente del consumidor la certeza del "pago seguro al recibir", la garantía de 30 días y la validación de envío aprobado. Reduce la fricción al comprar.',
    colorHex: {
      primary: '#059669', // Emerald 600
      primaryHover: '#047857',
      secondary: '#0284C7',
      accent: '#D97706',
      background: '#F0FDF4',
      cardBg: '#FFFFFF',
      border: '#DCFCE7',
      textPrimary: '#064E3B',
      textSecondary: '#374151',
      ctaGradient: 'from-[#059669] to-[#047857]',
      ctaHoverGradient: 'from-[#047857] to-[#064E3B]'
    },
    classes: {
      pageBg: 'bg-emerald-50/40',
      cardBg: 'bg-white',
      cardBorder: 'border-emerald-100',
      headerBg: 'bg-white/95',
      topBarBg: 'bg-[#064E3B]',
      primaryText: 'text-emerald-800',
      primaryBg: 'bg-emerald-600',
      primaryBorder: 'border-emerald-300',
      primaryLightBg: 'bg-emerald-50',
      primaryLightText: 'text-emerald-900',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-200',
      ctaBg: 'bg-gradient-to-r from-emerald-600 to-teal-700',
      ctaText: 'text-white',
      ctaHover: 'hover:from-emerald-700 hover:to-teal-800',
      activePillBg: 'bg-emerald-700',
      activePillText: 'text-white'
    }
  },
  {
    id: 'minimal_nordic',
    name: 'Platino Nórdico & Blanco Puro',
    shortName: 'Platino Nórdico',
    tagline: 'Claridad total, elegancia y transparencia',
    badge: 'Estética Minimalista',
    psychologyDescription: 'Inspirado en la pulcritud de Apple y las tiendas nórdicas. Con fondos blancos luminosos y contrastes en gris carbón y cobalto, genera una percepción de alta calidad, honestidad y cero distracciones.',
    colorHex: {
      primary: '#2563EB', // Blue 600
      primaryHover: '#1D4ED8',
      secondary: '#0F172A',
      accent: '#059669',
      background: '#F8FAFC',
      cardBg: '#FFFFFF',
      border: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      ctaGradient: 'from-[#0F172A] to-[#1E293B]',
      ctaHoverGradient: 'from-[#1E293B] to-[#334155]'
    },
    classes: {
      pageBg: 'bg-slate-50',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-200',
      headerBg: 'bg-white/95',
      topBarBg: 'bg-[#0F172A]',
      primaryText: 'text-slate-900',
      primaryBg: 'bg-blue-600',
      primaryBorder: 'border-slate-300',
      primaryLightBg: 'bg-slate-100',
      primaryLightText: 'text-slate-900',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-800',
      badgeBorder: 'border-slate-200',
      ctaBg: 'bg-gradient-to-r from-slate-900 to-slate-800',
      ctaText: 'text-white',
      ctaHover: 'hover:from-slate-800 hover:to-slate-700',
      activePillBg: 'bg-slate-900',
      activePillText: 'text-white'
    }
  },
  {
    id: 'warm_coral_trust',
    name: 'Coral Vital & Confianza Dinámica',
    shortName: 'Coral Cálido',
    tagline: 'Cercanía colombiana, dinamismo y alta conversión',
    badge: 'Alta Conversión',
    psychologyDescription: 'Combina la calidez y amabilidad del servicio al cliente colombiano con el poder de acción del coral vibrante. Despierta entusiasmo en ofertas manteniendo una base blanca limpia y estructurada.',
    colorHex: {
      primary: '#EA580C', // Orange 600
      primaryHover: '#C2410C',
      secondary: '#0284C7',
      accent: '#059669',
      background: '#FFF7ED',
      cardBg: '#FFFFFF',
      border: '#FED7AA',
      textPrimary: '#7C2D12',
      textSecondary: '#57534E',
      ctaGradient: 'from-[#FF5A36] to-[#FF3366]',
      ctaHoverGradient: 'from-[#E04826] to-[#E02656]'
    },
    classes: {
      pageBg: 'bg-orange-50/30',
      cardBg: 'bg-white',
      cardBorder: 'border-orange-100',
      headerBg: 'bg-white/95',
      topBarBg: 'bg-[#1C1917]',
      primaryText: 'text-orange-800',
      primaryBg: 'bg-orange-600',
      primaryBorder: 'border-orange-200',
      primaryLightBg: 'bg-orange-50',
      primaryLightText: 'text-orange-900',
      badgeBg: 'bg-orange-50',
      badgeText: 'text-orange-900',
      badgeBorder: 'border-orange-200',
      ctaBg: 'bg-gradient-to-r from-[#FF5A36] to-[#FF3366]',
      ctaText: 'text-white',
      ctaHover: 'hover:from-[#E04826] hover:to-[#E02656]',
      activePillBg: 'bg-orange-600',
      activePillText: 'text-white'
    }
  },
  {
    id: 'royal_indigo',
    name: 'Índigo Real & Alta Distinción',
    shortName: 'Índigo Real',
    tagline: 'Autenticidad certificada, perfumería y prestigio',
    badge: 'Gama Alta & Originalidad',
    psychologyDescription: 'El índigo profundo con blanco seda y detalles dorados suaves evoca autenticidad 100% original en perfumería importada y tecnología de alta gama. Genera percepción de lujo confiable.',
    colorHex: {
      primary: '#4338CA', // Indigo 700
      primaryHover: '#3730A3',
      secondary: '#0284C7',
      accent: '#CA8A04',
      background: '#F5F3FF',
      cardBg: '#FFFFFF',
      border: '#E0E7FF',
      textPrimary: '#1E1B4B',
      textSecondary: '#4B5563',
      ctaGradient: 'from-[#4338CA] to-[#6366F1]',
      ctaHoverGradient: 'from-[#3730A3] to-[#4F46E5]'
    },
    classes: {
      pageBg: 'bg-indigo-50/30',
      cardBg: 'bg-white',
      cardBorder: 'border-indigo-100',
      headerBg: 'bg-white/95',
      topBarBg: 'bg-[#1E1B4B]',
      primaryText: 'text-indigo-800',
      primaryBg: 'bg-indigo-600',
      primaryBorder: 'border-indigo-200',
      primaryLightBg: 'bg-indigo-50',
      primaryLightText: 'text-indigo-900',
      badgeBg: 'bg-indigo-50',
      badgeText: 'text-indigo-900',
      badgeBorder: 'border-indigo-200',
      ctaBg: 'bg-gradient-to-r from-indigo-600 to-violet-600',
      ctaText: 'text-white',
      ctaHover: 'hover:from-indigo-700 hover:to-violet-700',
      activePillBg: 'bg-indigo-700',
      activePillText: 'text-white'
    }
  }
];

export function getStoredPaletteId(): string {
  try {
    const saved = localStorage.getItem('zavela_trust_palette');
    if (saved && TRUST_PALETTES.some(p => p.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.error(e);
  }
  return 'trust_sapphire';
}

export function saveStoredPaletteId(paletteId: string): void {
  try {
    localStorage.setItem('zavela_trust_palette', paletteId);
  } catch (e) {
    console.error(e);
  }
}
