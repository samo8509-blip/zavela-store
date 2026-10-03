import { LuckyWheelSettings, LuckyWheelSeasonPreset, WheelDiscountSegment } from '../types/index.ts';

export const DEFAULT_WHEEL_SEGMENTS: WheelDiscountSegment[] = [
  { id: 'seg-1', label: '10% OFF', percentage: 10, color: '#0284c7', textColor: '#ffffff', couponPrefix: 'RULETA10' },
  { id: 'seg-2', label: '5% OFF',  percentage: 5,  color: '#0f172a', textColor: '#f8fafc', couponPrefix: 'SUERTE5' },
  { id: 'seg-3', label: '15% OFF', percentage: 15, color: '#f59e0b', textColor: '#0f172a', couponPrefix: 'PREMIO15' },
  { id: 'seg-4', label: '8% OFF',  percentage: 8,  color: '#10b981', textColor: '#ffffff', couponPrefix: 'LUCKY8' },
  { id: 'seg-5', label: '12% OFF', percentage: 12, color: '#6366f1', textColor: '#ffffff', couponPrefix: 'ZAVELA12' },
  { id: 'seg-6', label: '10% EXTRA', percentage: 10, color: '#ec4899', textColor: '#ffffff', couponPrefix: 'SUPER10' }
];

export const DEFAULT_LUCKY_WHEEL_SETTINGS: LuckyWheelSettings = {
  enabled: false,
  title: '🎉 ¡Gira la Ruleta y Gana tu Descuento!',
  subtitle: 'Desbloquea entre 5% y 15% OFF de regalo en tu producto favorito con Pago Contra Entrega.',
  badgeText: '🎁 Premio Exclusivo Zavela',
  callToActionText: '🎯 Girar Ruleta de Descuentos',
  
  // Tiempos
  inactivitySeconds: 40,
  minVisitedProducts: 2,
  couponExpiryMinutes: 15,
  spinDurationSeconds: 4.5,
  
  // Disparadores
  enableExitIntent: true,
  enableInactivityTrigger: true,
  enableVisitedThresholdTrigger: true,
  enableFloatingBadge: true,
  
  // Temporada
  activeSeason: 'default',
  seasonName: 'Estándar / Todo el Año',
  seasonTagline: 'Descuentos exclusivos y sorpresas todo el año',
  seasonAccentColor: '#f59e0b',
  seasonBadgeEmoji: '🎁',
  
  segments: DEFAULT_WHEEL_SEGMENTS
};

export interface SeasonPresetDefinition {
  key: LuckyWheelSeasonPreset;
  name: string;
  emoji: string;
  tagline: string;
  accentColor: string;
  secondaryColor: string;
  title: string;
  subtitle: string;
  badgeText: string;
  segments: WheelDiscountSegment[];
}

export const SEASONAL_PRESETS: Record<LuckyWheelSeasonPreset, SeasonPresetDefinition> = {
  default: {
    key: 'default',
    name: 'Estándar (Todo el Año)',
    emoji: '🎁',
    tagline: 'Descuentos exclusivos en tu compra contra entrega',
    accentColor: '#f59e0b',
    secondaryColor: '#0284c7',
    title: '🎉 ¡Gira la Ruleta y Gana tu Descuento!',
    subtitle: 'Desbloquea entre 5% y 15% OFF de regalo en tu producto favorito con Pago Contra Entrega.',
    badgeText: '🎁 Premio Exclusivo Zavela',
    segments: [
      { id: 'seg-1', label: '10% OFF', percentage: 10, color: '#0284c7', textColor: '#ffffff', couponPrefix: 'RULETA10' },
      { id: 'seg-2', label: '5% OFF',  percentage: 5,  color: '#0f172a', textColor: '#f8fafc', couponPrefix: 'SUERTE5' },
      { id: 'seg-3', label: '15% OFF', percentage: 15, color: '#f59e0b', textColor: '#0f172a', couponPrefix: 'PREMIO15' },
      { id: 'seg-4', label: '8% OFF',  percentage: 8,  color: '#10b981', textColor: '#ffffff', couponPrefix: 'LUCKY8' },
      { id: 'seg-5', label: '12% OFF', percentage: 12, color: '#6366f1', textColor: '#ffffff', couponPrefix: 'ZAVELA12' },
      { id: 'seg-6', label: '10% EXTRA', percentage: 10, color: '#ec4899', textColor: '#ffffff', couponPrefix: 'SUPER10' }
    ]
  },
  navidad: {
    key: 'navidad',
    name: 'Navidad & Fin de Año',
    emoji: '🎄',
    tagline: 'Aguinaldos y regalos navideños contra entrega en Colombia',
    accentColor: '#dc2626',
    secondaryColor: '#15803d',
    title: '🎄 ¡Ruleta Navideña Zavela Store!',
    subtitle: '🎅 ¡Gana tu regalo de Navidad! Hasta 15% OFF exclusivo con Pago Contra Entrega en la puerta de tu casa.',
    badgeText: '🎄 Especial Navidad & Reyes',
    segments: [
      { id: 'seg-nav-1', label: '10% NAVIDAD', percentage: 10, color: '#dc2626', textColor: '#ffffff', couponPrefix: 'NAVIDAD10' },
      { id: 'seg-nav-2', label: '5% AGUINALDO', percentage: 5,  color: '#15803d', textColor: '#f8fafc', couponPrefix: 'AGUINALDO5' },
      { id: 'seg-nav-3', label: '15% REYES',    percentage: 15, color: '#eab308', textColor: '#0f172a', couponPrefix: 'REYES15' },
      { id: 'seg-nav-4', label: '8% PESEBRE',   percentage: 8,  color: '#166534', textColor: '#ffffff', couponPrefix: 'NOEL8' },
      { id: 'seg-nav-5', label: '12% FIESTAS',  percentage: 12, color: '#991b1b', textColor: '#ffffff', couponPrefix: 'FIESTAS12' },
      { id: 'seg-nav-6', label: '10% REGALO',   percentage: 10, color: '#d97706', textColor: '#ffffff', couponPrefix: 'REGALO10' }
    ]
  },
  black_friday: {
    key: 'black_friday',
    name: 'Black Friday / Black Days',
    emoji: '🖤',
    tagline: 'Precios de remate y urgencia de stock limitado',
    accentColor: '#f59e0b',
    secondaryColor: '#09090b',
    title: '🖤 Black Friday Zavela: ¡Ruleta VIP!',
    subtitle: '⚡ ¡Asegura tu mayor descuento del año! Paga seguro al recibir tu paquete con envío nacional.',
    badgeText: '🖤 Oferta Black Days',
    segments: [
      { id: 'seg-bf-1', label: '15% BLACK VIP', percentage: 15, color: '#09090b', textColor: '#fbbf24', couponPrefix: 'BLACKVIP15' },
      { id: 'seg-bf-2', label: '10% FLASH',     percentage: 10, color: '#e11d48', textColor: '#ffffff', couponPrefix: 'FLASH10' },
      { id: 'seg-bf-3', label: '12% CYBER',     percentage: 12, color: '#7c3aed', textColor: '#ffffff', couponPrefix: 'CYBER12' },
      { id: 'seg-bf-4', label: '8% REMATE',     percentage: 8,  color: '#2563eb', textColor: '#ffffff', couponPrefix: 'REMATE8' },
      { id: 'seg-bf-5', label: '10% OBSIDIAN',  percentage: 10, color: '#18181b', textColor: '#f8fafc', couponPrefix: 'OBSIDIAN10' },
      { id: 'seg-bf-6', label: '15% GOLDEN',    percentage: 15, color: '#d97706', textColor: '#0f172a', couponPrefix: 'GOLDEN15' }
    ]
  },
  madres: {
    key: 'madres',
    name: 'Día de la Madre',
    emoji: '🌸',
    tagline: 'El mejor homenaje para Mamá con envío garantizado',
    accentColor: '#db2777',
    secondaryColor: '#9333ea',
    title: '🌸 ¡Ruleta Especial Día de la Madre!',
    subtitle: '💝 Sorprende a Mamá con su regalo ideal. Gira y desbloquea hasta 15% OFF de regalo inmediato.',
    badgeText: '🌸 Edición Especial Mamá',
    segments: [
      { id: 'seg-mom-1', label: '10% MAMÁ',     percentage: 10, color: '#db2777', textColor: '#ffffff', couponPrefix: 'MAMA10' },
      { id: 'seg-mom-2', label: '15% REINA',    percentage: 15, color: '#ec4899', textColor: '#ffffff', couponPrefix: 'REINA15' },
      { id: 'seg-mom-3', label: '8% AMOR',      percentage: 8,  color: '#be185d', textColor: '#ffffff', couponPrefix: 'AMORMAMA8' },
      { id: 'seg-mom-4', label: '12% DETALLE',  percentage: 12, color: '#9333ea', textColor: '#ffffff', couponPrefix: 'DETALLEMAMA12' },
      { id: 'seg-mom-5', label: '5% CARIÑO',    percentage: 5,  color: '#f43f5e', textColor: '#ffffff', couponPrefix: 'CARINO5' },
      { id: 'seg-mom-6', label: '10% ORO MAMÁ', percentage: 10, color: '#d97706', textColor: '#ffffff', couponPrefix: 'OROMAMA10' }
    ]
  },
  padres: {
    key: 'padres',
    name: 'Día del Padre',
    emoji: '👔',
    tagline: 'Premios y sorpresas para consentir a Papá',
    accentColor: '#0284c7',
    secondaryColor: '#1e293b',
    title: '👔 ¡Ruleta Especial Día del Padre!',
    subtitle: '🏆 ¡El regalo que Papá se merece con súper descuento! Paga seguro en efectivo contra entrega.',
    badgeText: '👔 Edición Especial Papá',
    segments: [
      { id: 'seg-dad-1', label: '10% PAPÁ',    percentage: 10, color: '#0284c7', textColor: '#ffffff', couponPrefix: 'PAPA10' },
      { id: 'seg-dad-2', label: '15% CAMPEÓN', percentage: 15, color: '#0369a1', textColor: '#ffffff', couponPrefix: 'CAMPEON15' },
      { id: 'seg-dad-3', label: '12% PAPÁ VIP', percentage: 12, color: '#d97706', textColor: '#0f172a', couponPrefix: 'PAPAVIP12' },
      { id: 'seg-dad-4', label: '8% HÉROE',    percentage: 8,  color: '#1e293b', textColor: '#ffffff', couponPrefix: 'HEROE8' },
      { id: 'seg-dad-5', label: '10% EXTRA',   percentage: 10, color: '#0d9488', textColor: '#ffffff', couponPrefix: 'PAPAEXTRA10' },
      { id: 'seg-dad-6', label: '5% SUERTE',   percentage: 5,  color: '#334155', textColor: '#f8fafc', couponPrefix: 'PAPA5' }
    ]
  },
  amor_amistad: {
    key: 'amor_amistad',
    name: 'Amor y Amistad (Septiembre)',
    emoji: '❤️',
    tagline: 'Celebra el amor y la amistad con detalles inolvidables',
    accentColor: '#e11d48',
    secondaryColor: '#be123c',
    title: '❤️ ¡Ruleta de Amor y Amistad!',
    subtitle: '🎁 ¡El detalle perfecto para esa persona especial con descuento inmediato y pago al recibir!',
    badgeText: '❤️ Amor & Amistad Zavela',
    segments: [
      { id: 'seg-love-1', label: '10% AMOR',     percentage: 10, color: '#e11d48', textColor: '#ffffff', couponPrefix: 'AMOR10' },
      { id: 'seg-love-2', label: '15% PAREJA',   percentage: 15, color: '#be123c', textColor: '#ffffff', couponPrefix: 'PAREJA15' },
      { id: 'seg-love-3', label: '12% AMISTAD',  percentage: 12, color: '#9333ea', textColor: '#ffffff', couponPrefix: 'AMISTAD12' },
      { id: 'seg-love-4', label: '8% DETALLE',   percentage: 8,  color: '#f43f5e', textColor: '#ffffff', couponPrefix: 'DETALLE8' },
      { id: 'seg-love-5', label: '10% REGALO',   percentage: 10, color: '#d97706', textColor: '#ffffff', couponPrefix: 'REGALO10' },
      { id: 'seg-love-6', label: '5% CARIÑO',    percentage: 5,  color: '#ec4899', textColor: '#ffffff', couponPrefix: 'LOVE5' }
    ]
  },
  cyber_lunes: {
    key: 'cyber_lunes',
    name: 'CyberLunes & HotSale',
    emoji: '⚡',
    tagline: 'Ofertas relámpago y mega descuentos digitales',
    accentColor: '#06b6d4',
    secondaryColor: '#4f46e5',
    title: '⚡ ¡Ruleta CyberLunes Zavela!',
    subtitle: '🚀 ¡Descuentos de alta velocidad! Gira ahora y activa tu cupón para comprar con pago contra entrega.',
    badgeText: '⚡ CyberLunes Oficial',
    segments: [
      { id: 'seg-cyb-1', label: '15% CYBER',  percentage: 15, color: '#06b6d4', textColor: '#0f172a', couponPrefix: 'CYBER15' },
      { id: 'seg-cyb-2', label: '10% HOT',    percentage: 10, color: '#f97316', textColor: '#ffffff', couponPrefix: 'HOT10' },
      { id: 'seg-cyb-3', label: '12% FLASH',  percentage: 12, color: '#6366f1', textColor: '#ffffff', couponPrefix: 'FLASH12' },
      { id: 'seg-cyb-4', label: '8% SUPER',   percentage: 8,  color: '#10b981', textColor: '#ffffff', couponPrefix: 'SUPER8' },
      { id: 'seg-cyb-5', label: '10% MEGA',   percentage: 10, color: '#ec4899', textColor: '#ffffff', couponPrefix: 'MEGA10' },
      { id: 'seg-cyb-6', label: '5% PROMO',   percentage: 5,  color: '#0f172a', textColor: '#f8fafc', couponPrefix: 'PROMO5' }
    ]
  },
  custom: {
    key: 'custom',
    name: 'Personalizado',
    emoji: '🎨',
    tagline: 'Configuración personalizada por el administrador',
    accentColor: '#f59e0b',
    secondaryColor: '#4f46e5',
    title: '🎉 ¡Ruleta de Descuentos Especial!',
    subtitle: 'Desbloquea tu descuento exclusivo con Pago Contra Entrega.',
    badgeText: '🎁 Promoción Especial',
    segments: DEFAULT_WHEEL_SEGMENTS
  }
};

/**
 * Merge and fallback utility for lucky wheel settings
 */
export function getActiveLuckyWheelSettings(customSettings?: LuckyWheelSettings | null): LuckyWheelSettings {
  if (!customSettings) {
    return DEFAULT_LUCKY_WHEEL_SETTINGS;
  }

  const segments = Array.isArray(customSettings.segments) && customSettings.segments.length >= 3
    ? customSettings.segments
    : DEFAULT_WHEEL_SEGMENTS;

  return {
    enabled: customSettings.enabled === true,
    title: customSettings.title || DEFAULT_LUCKY_WHEEL_SETTINGS.title,
    subtitle: customSettings.subtitle || DEFAULT_LUCKY_WHEEL_SETTINGS.subtitle,
    badgeText: customSettings.badgeText || DEFAULT_LUCKY_WHEEL_SETTINGS.badgeText,
    callToActionText: customSettings.callToActionText || DEFAULT_LUCKY_WHEEL_SETTINGS.callToActionText,
    
    inactivitySeconds: customSettings.inactivitySeconds || 40,
    minVisitedProducts: customSettings.minVisitedProducts || 2,
    couponExpiryMinutes: customSettings.couponExpiryMinutes || 15,
    spinDurationSeconds: customSettings.spinDurationSeconds || 4.5,
    
    enableExitIntent: customSettings.enableExitIntent ?? true,
    enableInactivityTrigger: customSettings.enableInactivityTrigger ?? true,
    enableVisitedThresholdTrigger: customSettings.enableVisitedThresholdTrigger ?? true,
    enableFloatingBadge: customSettings.enableFloatingBadge ?? true,
    
    activeSeason: customSettings.activeSeason || 'default',
    seasonName: customSettings.seasonName || 'Estándar',
    seasonTagline: customSettings.seasonTagline || '',
    seasonAccentColor: customSettings.seasonAccentColor || '#f59e0b',
    seasonBadgeEmoji: customSettings.seasonBadgeEmoji || '🎁',
    
    segments
  };
}
