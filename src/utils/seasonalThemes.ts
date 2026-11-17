import { SeasonalThemeId, SeasonalThemeConfig, StoreSettings } from '../types/index.ts';

export type { SeasonalThemeId, SeasonalThemeConfig };

export interface SeasonalThemeDefinition {
  id: SeasonalThemeId;
  name: string;
  shortName: string;
  monthLabel: string;
  targetMonth?: number; // 0-indexed (1=Feb, 4=May, 8=Sep, 9=Oct, 11=Dec)
  icon: string;
  badgeColor: string;
  tagline: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  accentColor: string;
  previewBgClass: string;
  previewBorderColor: string;
  ornamentType: 'none' | 'santa-hat' | 'witch-hat' | 'hearts' | 'mother-flower' | 'friendship-ribbon' | 'cyber-hud' | 'price-tag';
  particleTypes: ('snow' | 'bat' | 'pumpkin' | 'heart' | 'rose-petal' | 'gold-sparkle' | 'cyan-spark' | 'percent')[];
}

export const SEASONAL_THEMES: SeasonalThemeDefinition[] = [
  {
    id: 'standard-light',
    name: 'Estándar Claro (Original)',
    shortName: 'Claro Original',
    monthLabel: 'Todo el Año',
    icon: '☀️',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    tagline: 'Limpio, nítido y minimalista',
    description: 'Fondo claro y diseño visual sobrio, enfocado en claridad absoluta y legibilidad comercial.',
    primaryColor: '#0284c7', // Sky-600
    secondaryColor: '#3b82f6',
    glowColor: '#38bdf8',
    accentColor: '#0ea5e9',
    previewBgClass: 'bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900 border-slate-300',
    previewBorderColor: '#cbd5e1',
    ornamentType: 'none',
    particleTypes: []
  },
  {
    id: 'standard-cyber',
    name: 'Estándar Cyber (Azul Neón)',
    shortName: 'Cyber Neón',
    monthLabel: 'Predeterminado',
    icon: '⚡',
    badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50',
    tagline: 'Firma futurista oficial Zavela',
    description: 'Atmósfera nocturna de alta gama con resplandor neón cian (#06b6d4) y contrastes modernos.',
    primaryColor: '#06b6d4',
    secondaryColor: '#4f46e5',
    glowColor: '#06b6d4',
    accentColor: '#3b82f6',
    previewBgClass: 'bg-gradient-to-br from-slate-950 via-[#071328] to-[#040914] text-white border-cyan-500/40',
    previewBorderColor: '#06b6d4',
    ornamentType: 'cyber-hud',
    particleTypes: ['cyan-spark']
  },
  {
    id: 'san-valentin',
    name: 'San Valentín (Febrero)',
    shortName: 'San Valentín',
    monthLabel: 'Febrero',
    targetMonth: 1,
    icon: '💘',
    badgeColor: 'bg-pink-950/80 text-pink-300 border-pink-500/50',
    tagline: 'Temporada de amor y regalos especiales',
    description: 'Dúo de corazones y resplandor rosado/fucsia para conectar emocionalmente con parejas y regalos.',
    primaryColor: '#ec4899',
    secondaryColor: '#f43f5e',
    glowColor: '#f43f5e',
    accentColor: '#fb7185',
    previewBgClass: 'bg-gradient-to-br from-[#1a0815] via-[#2d0a20] to-[#12040d] text-white border-pink-500/50',
    previewBorderColor: '#f43f5e',
    ornamentType: 'hearts',
    particleTypes: ['heart', 'gold-sparkle']
  },
  {
    id: 'madre',
    name: 'Mes de la Madre (Mayo)',
    shortName: 'Mes de la Madre',
    monthLabel: 'Mayo',
    targetMonth: 4,
    icon: '🌸',
    badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
    tagline: 'Homenaje a la mujer más especial',
    description: 'Estética delicada con orquídeas/rosas doradas, resplandor oro rosado y elegancia sublime.',
    primaryColor: '#f472b6',
    secondaryColor: '#f59e0b',
    glowColor: '#fb7185',
    accentColor: '#fde047',
    previewBgClass: 'bg-gradient-to-br from-[#1c0818] via-[#250d22] to-[#140612] text-white border-rose-400/40',
    previewBorderColor: '#f472b6',
    ornamentType: 'mother-flower',
    particleTypes: ['rose-petal', 'gold-sparkle']
  },
  {
    id: 'amor-amistad',
    name: 'Amor y Amistad (Septiembre)',
    shortName: 'Amor & Amistad',
    monthLabel: 'Septiembre',
    targetMonth: 8,
    icon: '🎁',
    badgeColor: 'bg-red-950/80 text-red-300 border-red-500/50',
    tagline: 'Celebración colombiana de amigos y parejas',
    description: 'Corazones en armonía con lazos dorados, destellos rubí y dinamismo festivo de amistad.',
    primaryColor: '#ef4444',
    secondaryColor: '#fbbf24',
    glowColor: '#f43f5e',
    accentColor: '#f59e0b',
    previewBgClass: 'bg-gradient-to-br from-[#200910] via-[#2e0e18] to-[#13050a] text-white border-red-500/40',
    previewBorderColor: '#ef4444',
    ornamentType: 'friendship-ribbon',
    particleTypes: ['heart', 'gold-sparkle']
  },
  {
    id: 'halloween',
    name: 'Halloween (Octubre)',
    shortName: 'Halloween Spooky',
    monthLabel: 'Octubre',
    targetMonth: 9,
    icon: '🎃',
    badgeColor: 'bg-amber-950/80 text-orange-400 border-orange-500/50',
    tagline: 'Noche de misterio, ofertas y magia',
    description: 'Sombrero de bruja sobre el logo, borde púrpura/calabaza y murciélagos flotantes.',
    primaryColor: '#f97316',
    secondaryColor: '#9333ea',
    glowColor: '#ea580c',
    accentColor: '#a855f7',
    previewBgClass: 'bg-gradient-to-br from-[#12081f] via-[#1c0b29] to-[#0e0514] text-white border-orange-500/50',
    previewBorderColor: '#f97316',
    ornamentType: 'witch-hat',
    particleTypes: ['bat', 'pumpkin', 'gold-sparkle']
  },
  {
    id: 'black-friday',
    name: 'Black Friday y Cyber Monday (Noviembre)',
    shortName: 'Black Friday',
    monthLabel: 'Noviembre',
    targetMonth: 10,
    icon: '🏷️',
    badgeColor: 'bg-black/80 text-yellow-300 border-yellow-400/60',
    tagline: 'Las mejores ofertas del año',
    description: 'Etiqueta de oferta negra y dorada sobre el logo, resplandor amarillo y símbolos de descuento cayendo. Se activa solo en la semana de Black Friday hasta Cyber Monday.',
    primaryColor: '#facc15',
    secondaryColor: '#ef4444',
    glowColor: '#facc15',
    accentColor: '#f97316',
    previewBgClass: 'bg-gradient-to-br from-black via-[#111111] to-[#1c1917] text-white border-yellow-400/60',
    previewBorderColor: '#facc15',
    ornamentType: 'price-tag',
    particleTypes: ['percent', 'gold-sparkle']
  },
  {
    id: 'navidad-fin-ano',
    name: 'Navidad y Fin de Año (Diciembre)',
    shortName: 'Navidad & Fin de Año',
    monthLabel: 'Diciembre',
    targetMonth: 11,
    icon: '🎄',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
    tagline: 'Magia, regalos, villancicos y año nuevo',
    description: 'Gorro de Santa Claus en el logo, guirnalda de luces titilantes multicolor y copos de nieve cayendo.',
    primaryColor: '#ef4444',
    secondaryColor: '#10b981',
    glowColor: '#22c55e',
    accentColor: '#eab308',
    previewBgClass: 'bg-gradient-to-br from-[#071912] via-[#0c2419] to-[#04100c] text-white border-emerald-500/50',
    previewBorderColor: '#10b981',
    ornamentType: 'santa-hat',
    particleTypes: ['snow', 'gold-sparkle']
  }
];

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Black Friday = cuarto viernes de noviembre del año dado.
 */
export function getBlackFridayDate(year: number): Date {
  const firstOfNovember = new Date(year, 10, 1);
  const offsetToFriday = (5 - firstOfNovember.getDay() + 7) % 7; // 5 = viernes
  return new Date(year, 10, 1 + offsetToFriday + 21);
}

/**
 * Semana de Black Friday: desde el lunes anterior hasta el Cyber Monday (lunes siguiente).
 * Fuera de esas fechas el calendario automático sigue con Navidad.
 */
export function isBlackFridayWindow(date: Date = new Date()): boolean {
  const bf = getBlackFridayDate(date.getFullYear());
  const start = new Date(bf.getFullYear(), bf.getMonth(), bf.getDate() - 4);
  const end = new Date(bf.getFullYear(), bf.getMonth(), bf.getDate() + 3, 23, 59, 59);
  return date >= start && date <= end;
}

/**
 * Detecta qué tema corresponde al mes actual del calendario
 */
export function detectCalendarSeasonalTheme(): SeasonalThemeId {
  if (isBlackFridayWindow()) return 'black-friday';
  const month = new Date().getMonth(); // 0 = Jan, 1 = Feb, ..., 11 = Dec
  if (month === 1) return 'san-valentin';
  if (month === 4) return 'madre';
  if (month === 8) return 'amor-amistad';
  if (month === 9) return 'halloween';
  if (month === 10 || month === 11 || month === 0) return 'navidad-fin-ano';
  return 'standard-cyber';
}

/**
 * Resuelve el tema activo considerando switch de calendario automático o selección manual
 */
export function resolveActiveSeasonalTheme(
  settings?: StoreSettings | null,
  overrideTheme?: SeasonalThemeId
): {
  activeThemeId: SeasonalThemeId;
  themeDef: SeasonalThemeDefinition;
  isAutoActive: boolean;
  autoThemeId: SeasonalThemeId;
  currentMonthName: string;
  particlesEnabled: boolean;
} {
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentMonthName = MONTH_NAMES_ES[currentMonthIndex];
  const autoThemeId = detectCalendarSeasonalTheme();

  if (overrideTheme) {
    const themeDef = SEASONAL_THEMES.find(t => t.id === overrideTheme) || SEASONAL_THEMES[1];
    return {
      activeThemeId: overrideTheme,
      themeDef,
      isAutoActive: false,
      autoThemeId,
      currentMonthName,
      particlesEnabled: true
    };
  }

  const isAutoCalendar = settings?.seasonalThemeConfig?.autoCalendar ?? false;
  const configuredTheme = settings?.seasonalThemeConfig?.activeTheme || settings?.seasonalTheme || 'standard-cyber';

  const activeThemeId: SeasonalThemeId = isAutoCalendar ? autoThemeId : configuredTheme;
  const themeDef = SEASONAL_THEMES.find(t => t.id === activeThemeId) || SEASONAL_THEMES[1];
  const particlesEnabled = settings?.seasonalThemeConfig?.particlesEnabled ?? true;

  return {
    activeThemeId,
    themeDef,
    isAutoActive: isAutoCalendar,
    autoThemeId,
    currentMonthName,
    particlesEnabled
  };
}

/**
 * Paleta de la vitrina (inicio, barra superior y botones) según la temporada activa.
 * Se publica como variables CSS (--zv-*) para que todos los componentes la usen igual.
 * El logo conserva sus propios colores.
 */
export interface StorefrontPalette {
  topbar: string;
  topbarInk: string;
  hero: string;
  glow: string;
  p1: string;
  p1Ink: string;
  p2: string;
  cta: string;
  ctaInk: string;
  badgeBg: string;
  badgeInk: string;
  badge: string;
  heroInk: string;
  stripBg: string;
}

const PALETTE_STANDARD: StorefrontPalette = {
  topbar: '#0A192F', topbarInk: '#22D3EE',
  hero: 'linear-gradient(135deg,#0A192F 0%,#1e3a8a 60%,#4f46e5 100%)', glow: '#06b6d4',
  p1: '#22D3EE', p1Ink: '#0A192F', p2: '#4F46E5',
  cta: 'linear-gradient(90deg,#06b6d4,#4f46e5)', ctaInk: '#FFFFFF',
  badgeBg: '#22D3EE', badgeInk: '#0A192F', badge: 'ENVÍO GRATIS · PAGO CONTRA ENTREGA',
  heroInk: '#FFFFFF',
  stripBg: 'linear-gradient(135deg,#0A192F 0%,#1e3a8a 60%,#4f46e5 100%)'
};

// Estilo "Mercado vivo": amarillo, azul oscuro y coral
const PALETTE_MERCADO_VIVO: StorefrontPalette = {
  topbar: '#0B1F4B', topbarInk: '#FFD23F',
  hero: '#FFD23F', glow: '#FFFFFF',
  p1: '#FF5A4E', p1Ink: '#FFFFFF', p2: '#0B1F4B',
  cta: '#0B1F4B', ctaInk: '#FFFFFF',
  badgeBg: '#0B1F4B', badgeInk: '#FFD23F', badge: 'ENVÍO GRATIS · PAGO CONTRA ENTREGA',
  heroInk: '#0B1F4B',
  stripBg: '#0B1F4B'
};

export function getStorefrontPalette(themeId: SeasonalThemeId, style: 'marca' | 'mercado-vivo' = 'marca'): StorefrontPalette {
  if (themeId === 'black-friday') {
    return {
      topbar: '#FACC15', topbarInk: '#0B0B0B',
      hero: 'linear-gradient(135deg,#000000 0%,#1c1917 70%,#3b2a05 100%)', glow: '#facc15',
      p1: '#FACC15', p1Ink: '#0B0B0B', p2: '#EF4444',
      cta: 'linear-gradient(90deg,#facc15,#f97316)', ctaInk: '#0B0B0B',
      badgeBg: '#FACC15', badgeInk: '#0B0B0B', badge: 'BLACK FRIDAY · PRECIOS ESPECIALES',
      heroInk: '#FFFFFF',
      stripBg: 'linear-gradient(135deg,#000000 0%,#1c1917 70%,#3b2a05 100%)'
    };
  }
  if (themeId === 'navidad-fin-ano') {
    return {
      topbar: '#0f5132', topbarInk: '#FDE68A',
      hero: 'linear-gradient(135deg,#071912 0%,#0f5132 65%,#7f1d1d 100%)', glow: '#22c55e',
      p1: '#EF4444', p1Ink: '#FFFFFF', p2: '#10B981',
      cta: 'linear-gradient(90deg,#dc2626,#ef4444)', ctaInk: '#FFFFFF',
      badgeBg: '#EAB308', badgeInk: '#1f1500', badge: 'NAVIDAD · REGALOS LISTOS PARA ENTREGAR',
      heroInk: '#FFFFFF',
      stripBg: 'linear-gradient(135deg,#071912 0%,#0f5132 65%,#7f1d1d 100%)'
    };
  }
  if (themeId === 'standard-light' || themeId === 'standard-cyber') {
    return style === 'mercado-vivo' ? PALETTE_MERCADO_VIVO : PALETTE_STANDARD;
  }
  // San Valentín, Madre, Amor y Amistad, Halloween: colores de la propia temporada
  const def = SEASONAL_THEMES.find(t => t.id === themeId);
  if (!def) return PALETTE_STANDARD;
  return {
    topbar: '#12081f', topbarInk: def.accentColor,
    hero: `linear-gradient(135deg,#0b0b14 0%,${def.secondaryColor}99 70%,${def.primaryColor}cc 100%)`, glow: def.glowColor,
    p1: def.primaryColor, p1Ink: '#FFFFFF', p2: def.secondaryColor,
    cta: `linear-gradient(90deg,${def.primaryColor},${def.secondaryColor})`, ctaInk: '#FFFFFF',
    badgeBg: def.accentColor, badgeInk: '#111827', badge: 'ENVÍO GRATIS · PAGO CONTRA ENTREGA',
    heroInk: '#FFFFFF',
    stripBg: `linear-gradient(135deg,#0b0b14 0%,${def.secondaryColor}99 70%,${def.primaryColor}cc 100%)`
  };
}

export function applyStorefrontPalette(themeId: SeasonalThemeId, style: 'marca' | 'mercado-vivo' = 'marca'): void {
  if (typeof document === 'undefined') return;
  const p = getStorefrontPalette(themeId, style);
  const s = document.documentElement.style;
  s.setProperty('--zv-topbar', p.topbar);
  s.setProperty('--zv-topbar-ink', p.topbarInk);
  s.setProperty('--zv-hero', p.hero);
  s.setProperty('--zv-glow', p.glow);
  s.setProperty('--zv-p1', p.p1);
  s.setProperty('--zv-p1-ink', p.p1Ink);
  s.setProperty('--zv-p2', p.p2);
  s.setProperty('--zv-cta', p.cta);
  s.setProperty('--zv-cta-ink', p.ctaInk);
  s.setProperty('--zv-badge-bg', p.badgeBg);
  s.setProperty('--zv-badge-ink', p.badgeInk);
}
