import { 
  GamificationGameSettings, 
  GamificationSeasonPreset, 
  GamificationTiersConfig 
} from '../types/index.ts';

export const DEFAULT_GAMIFICATION_TIERS: GamificationTiersConfig = {
  bronze: {
    minScore: 0,
    discountPercentage: 5,
    label: 'Nivel Bronce 🥉',
    couponPrefix: 'FLASH5'
  },
  silver: {
    minScore: 16,
    discountPercentage: 10,
    label: 'Nivel Plata 🥈',
    couponPrefix: 'SUPER10'
  },
  gold: {
    minScore: 30,
    discountPercentage: 15,
    label: 'Nivel Oro 🥇',
    couponPrefix: 'VIP15'
  }
};

export const DEFAULT_GAMIFICATION_SETTINGS: GamificationGameSettings = {
  enabled: false,
  activeSeason: 'standard',
  seasonName: 'Estándar (Todo el Año)',
  gameTitle: '🎯 ¡Desafío Flash: Atrapa tu Descuento!',
  gameSubtitle: 'Mueve la canasta, esquiva las ráfagas de viento y atrapa los cupones que caen para desbloquear hasta 15% OFF exclusivo.',
  badgeEmoji: '🌪️',
  accentColor: '#f59e0b',
  
  // Reglas de descuento
  minDiscountPercentage: 5,
  maxDiscountPercentage: 15,
  tiers: DEFAULT_GAMIFICATION_TIERS,

  // Mecánica y física
  gameDurationSeconds: 15,
  windEnabled: true,
  windChangeIntervalSeconds: 2.5,
  basketSpeed: 1.0,
  couponExpiryMinutes: 10,
  enableGyroscope: true,
  gyroSensitivity: 1.2,
  gyroDeadzone: 5,
  difficultyLevel: 'hard',
  missPenaltyPoints: 1,
  includeObstacles: true,

  // Disparadores
  inactivitySeconds: 35,
  minVisitedProducts: 2,
  enableExitIntent: true,
  enableInactivityTrigger: true,
  enableVisitedThresholdTrigger: true,
  enableFloatingBadge: true
};

export interface GamificationSeasonDefinition {
  key: GamificationSeasonPreset;
  name: string;
  emoji: string;
  themeTitle: string;
  themeSubtitle: string;
  accentColor: string;
  secondaryColor: string;
  tagline: string;
  bronzePrefix: string;
  silverPrefix: string;
  goldPrefix: string;
}

export const GAMIFICATION_SEASONS: Record<GamificationSeasonPreset, GamificationSeasonDefinition> = {
  standard: {
    key: 'standard',
    name: 'Estándar / Todo el Año',
    emoji: '🌪️',
    themeTitle: '⚡ ¡Desafío Flash: Atrapa tu Descuento!',
    themeSubtitle: 'Mueve la canasta, vence el viento y atrapa los regalos para desbloquear hasta 15% OFF en tu compra contra entrega.',
    accentColor: '#f59e0b',
    secondaryColor: '#0284c7',
    tagline: 'Desafíos interactivos con descuentos durante todo el año',
    bronzePrefix: 'FLASH5',
    silverPrefix: 'SUPER10',
    goldPrefix: 'VIP15'
  },
  black_friday: {
    key: 'black_friday',
    name: 'Black Friday / Black Days',
    emoji: '🖤',
    themeTitle: '🖤 ¡Desafío Flash de Black Friday!',
    themeSubtitle: '¡Alerta de precios de locura! Atrapa las gemas y paquetes oscuros antes de que se agote el tiempo.',
    accentColor: '#fbbf24',
    secondaryColor: '#18181b',
    tagline: 'Precios de remate con estética Black & Gold de alta conversión',
    bronzePrefix: 'BF5',
    silverPrefix: 'BLACK10',
    goldPrefix: 'BF15VIP'
  },
  amor_amistad: {
    key: 'amor_amistad',
    name: 'Amor y Amistad (Septiembre Colombia)',
    emoji: '❤️',
    themeTitle: '❤️ ¡Desafío Flash de Amor y Amistad!',
    themeSubtitle: '¡Atrapa los corazones y regalos de temporada para sorprender a tu persona especial con descuento!',
    accentColor: '#ec4899',
    secondaryColor: '#f43f5e',
    tagline: 'Campaña romántica para impulsar regalos y detalles en Colombia',
    bronzePrefix: 'AMOR5',
    silverPrefix: 'CORAZON10',
    goldPrefix: 'AMISTAD15'
  },
  navidad: {
    key: 'navidad',
    name: 'Navidad & Fin de Año',
    emoji: '🎄',
    themeTitle: '🎄 ¡Desafío Flash Navideño Zavela!',
    themeSubtitle: '🎅 ¡Aguinaldos de Navidad al instante! Atrapa las estrellas navideñas y asegura tu regalo contra entrega.',
    accentColor: '#dc2626',
    secondaryColor: '#15803d',
    tagline: 'Aguinaldos y festividades con alta emoción de compra',
    bronzePrefix: 'NOEL5',
    silverPrefix: 'NAVIDAD10',
    goldPrefix: 'REYES15'
  },
  liquidacion_verano: {
    key: 'liquidacion_verano',
    name: 'Liquidación de Verano / Vacaciones',
    emoji: '☀️',
    themeTitle: '☀️ ¡Desafío Flash: Liquidación de Verano!',
    themeSubtitle: '¡Lluvia de descuentos bajo el sol! Atrapa las ofertas de temporada antes de que vuele el inventario.',
    accentColor: '#06b6d4',
    secondaryColor: '#f97316',
    tagline: 'Remates veraniegos y liquidación de inventario',
    bronzePrefix: 'SOL5',
    silverPrefix: 'VERANO10',
    goldPrefix: 'PLAYA15'
  },
  cyber_days: {
    key: 'cyber_days',
    name: 'CyberLunes & Hot Sale Colombia',
    emoji: '⚡',
    themeTitle: '⚡ ¡Desafío Flash Cyber Days!',
    themeSubtitle: '¡Conexión de máxima velocidad! Captura los chips y cupones cibernéticos con Pago Contra Entrega.',
    accentColor: '#8b5cf6',
    secondaryColor: '#06b6d4',
    tagline: 'Eventos masivos de comercio electrónico de Colombia',
    bronzePrefix: 'CYBER5',
    silverPrefix: 'HOTSALE10',
    goldPrefix: 'CYBER15'
  },
  custom: {
    key: 'custom',
    name: 'Personalizado / Campaña a Medida',
    emoji: '🎮',
    themeTitle: '🎮 ¡Desafío Flash: Atrapa tu Descuento!',
    themeSubtitle: '¡Atrapa los cupones que caen y gana hasta 15% OFF de regalo!',
    accentColor: '#6366f1',
    secondaryColor: '#3b82f6',
    tagline: 'Diseña tu propio título, emoji y paleta de colores',
    bronzePrefix: 'FLASH5',
    silverPrefix: 'SUPER10',
    goldPrefix: 'VIP15'
  }
};

/**
 * Merges raw settings with safe defaults
 */
export function getActiveGamificationSettings(rawSettings?: Partial<GamificationGameSettings> | null): GamificationGameSettings {
  if (!rawSettings) return DEFAULT_GAMIFICATION_SETTINGS;

  const minDisc = typeof rawSettings.minDiscountPercentage === 'number' ? Math.max(3, Math.min(10, rawSettings.minDiscountPercentage)) : 5;
  const maxDisc = typeof rawSettings.maxDiscountPercentage === 'number' ? Math.max(minDisc, Math.min(25, rawSettings.maxDiscountPercentage)) : 15;

  const tiers: GamificationTiersConfig = {
    bronze: {
      minScore: rawSettings.tiers?.bronze?.minScore ?? DEFAULT_GAMIFICATION_TIERS.bronze.minScore,
      discountPercentage: Math.max(minDisc, Math.min(maxDisc, rawSettings.tiers?.bronze?.discountPercentage ?? DEFAULT_GAMIFICATION_TIERS.bronze.discountPercentage)),
      label: rawSettings.tiers?.bronze?.label || DEFAULT_GAMIFICATION_TIERS.bronze.label,
      couponPrefix: rawSettings.tiers?.bronze?.couponPrefix || DEFAULT_GAMIFICATION_TIERS.bronze.couponPrefix
    },
    silver: {
      minScore: rawSettings.tiers?.silver?.minScore ?? DEFAULT_GAMIFICATION_TIERS.silver.minScore,
      discountPercentage: Math.max(minDisc, Math.min(maxDisc, rawSettings.tiers?.silver?.discountPercentage ?? DEFAULT_GAMIFICATION_TIERS.silver.discountPercentage)),
      label: rawSettings.tiers?.silver?.label || DEFAULT_GAMIFICATION_TIERS.silver.label,
      couponPrefix: rawSettings.tiers?.silver?.couponPrefix || DEFAULT_GAMIFICATION_TIERS.silver.couponPrefix
    },
    gold: {
      minScore: rawSettings.tiers?.gold?.minScore ?? DEFAULT_GAMIFICATION_TIERS.gold.minScore,
      discountPercentage: Math.max(minDisc, Math.min(maxDisc, rawSettings.tiers?.gold?.discountPercentage ?? DEFAULT_GAMIFICATION_TIERS.gold.discountPercentage)),
      label: rawSettings.tiers?.gold?.label || DEFAULT_GAMIFICATION_TIERS.gold.label,
      couponPrefix: rawSettings.tiers?.gold?.couponPrefix || DEFAULT_GAMIFICATION_TIERS.gold.couponPrefix
    }
  };

  return {
    ...DEFAULT_GAMIFICATION_SETTINGS,
    ...rawSettings,
    enabled: rawSettings?.enabled === true,
    minDiscountPercentage: minDisc,
    maxDiscountPercentage: maxDisc,
    tiers
  };
}

/**
 * Calculates reward tier and granular dynamic discount based on captured score
 */
export function calculateGameRewardTier(score: number, config: GamificationGameSettings) {
  const minDisc = config.minDiscountPercentage ?? 5;
  const maxDisc = config.maxDiscountPercentage ?? 15;
  const silverScore = config.tiers?.silver?.minScore ?? 16;
  const goldScore = config.tiers?.gold?.minScore ?? 30;

  // Granular dynamic percentage from minDisc to maxDisc based on score
  let dynamicPct = minDisc;
  if (score <= 0) {
    dynamicPct = minDisc;
  } else if (score < silverScore) {
    // 0 to silverScore (e.g. 16) scales from minDisc (5%) to 9%
    const progress = Math.max(0, score / silverScore);
    dynamicPct = minDisc + Math.floor(progress * (10 - minDisc)); // e.g. 5 to 9%
  } else if (score < goldScore) {
    // silverScore (16) to goldScore (30) scales from 10% to 14%
    const progress = Math.max(0, (score - silverScore) / (goldScore - silverScore));
    dynamicPct = 10 + Math.floor(progress * (maxDisc - 10)); // e.g. 10 to 14%
  } else {
    // goldScore and above
    dynamicPct = maxDisc; // 15%
  }

  // Ensure bounds
  dynamicPct = Math.max(minDisc, Math.min(maxDisc, dynamicPct));

  let tier: 'bronze' | 'silver' | 'gold' = 'bronze';
  let badge = '🥉 Bronce';
  let label = config.tiers.bronze.label;
  let prefix = config.tiers.bronze.couponPrefix;
  let color = '#d97706';

  if (dynamicPct >= maxDisc || score >= goldScore) {
    tier = 'gold';
    badge = '🥇 Oro Élite';
    label = config.tiers.gold.label;
    prefix = config.tiers.gold.couponPrefix;
    color = '#f59e0b';
  } else if (dynamicPct >= 10 || score >= silverScore) {
    tier = 'silver';
    badge = '🥈 Plata';
    label = config.tiers.silver.label;
    prefix = config.tiers.silver.couponPrefix;
    color = '#94a3b8';
  }

  return {
    tier,
    label,
    discountPercentage: dynamicPct,
    prefix,
    badge: `${badge} (${dynamicPct}% OFF)`,
    color
  };
}
