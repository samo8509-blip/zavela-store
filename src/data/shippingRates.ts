// Colombia Dynamic Shipping Rates & Tariff Zones Configuration
// Clasificación de 32 departamentos y municipios en 3 Zonas Logísticas
// REGLA DE CONVERSIÓN: 1 producto = Flete según Zona | 2 productos en adelante = ¡ENVÍO TOTALMENTE GRATIS!

import { CartItem } from '../types/index.ts';
import { COLOMBIA_DEPARTMENTS, getDaneCode } from './colombiaGeo.ts';

export type ShippingZoneId = 'zona_1' | 'zona_2' | 'zona_3';

export interface ShippingZoneConfig {
  id: ShippingZoneId;
  name: string;
  shortName: string;
  badgeLabel: string;
  rateCOP: number;
  estimatedDays: string;
  description: string;
  departments: string[];
  // Specific main cities/metropolitan areas that qualify for Zone 1
  mainCities?: string[];
}

export interface ShippingCalculationResult {
  zoneId: ShippingZoneId;
  zoneName: string;
  zoneShortName: string;
  zoneDescription: string;
  baseRate: number;
  finalRate: number;
  isFreeShipping: boolean;
  freeShippingReason?: 'multi_item_bundle' | 'cart_threshold' | 'product_free_shipping' | null;
  totalQuantity: number;
  itemsNeededForFreeShipping: number;
  estimatedDays: string;
  badgeText: string;
  badgeColor: 'emerald' | 'sky' | 'amber' | 'indigo' | 'orange';
  daneCode: string;
  freeShippingThreshold: number;
  amountNeededForFreeShipping: number;
  savingsCOP: number;
}

// 1. ZONAS LOGÍSTICAS DE COLOMBIA
export const SHIPPING_ZONES: Record<ShippingZoneId, ShippingZoneConfig> = {
  zona_1: {
    id: 'zona_1',
    name: 'Zona 1 (Local / Principales)',
    shortName: 'Local / Principales',
    badgeLabel: 'Envío Local / Principal',
    rateCOP: 11000,
    estimatedDays: '24 a 48 Horas Hábiles',
    description: 'Bogotá D.C., Medellín y Área Metropolitana, Cali, Barranquilla y Bucaramanga',
    departments: ['Bogotá D.C.', 'Antioquia', 'Valle del Cauca', 'Atlántico', 'Santander'],
    mainCities: [
      // Bogotá D.C.
      'bogotá d.c.', 'bogota', 'bogotá',
      // Antioquia - Valle de Aburrá y Oriente cercano
      'medellín', 'medellin', 'bello', 'itagüí', 'itagui', 'envigado', 'sabaneta', 'caldas', 
      'la estrella', 'copacabana', 'girardota', 'barbosa', 'rionegro', 'marinilla', 'guarne', 'la ceja',
      // Valle del Cauca - Cali y AM
      'cali', 'palmira', 'yumbo', 'jamundí', 'jamundi', 'candelaria', 'buga', 'tuluá', 'tulua', 'cartago',
      // Atlántico - Barranquilla y AM
      'barranquilla', 'soledad', 'malambo', 'puerto colombia', 'galapa', 'sabanalarga', 'baranoa',
      // Santander - Bucaramanga y AM
      'bucaramanga', 'floridablanca', 'girón', 'giron', 'piedecuesta', 'lebrija'
    ]
  },
  zona_2: {
    id: 'zona_2',
    name: 'Zona 2 (Nacional Estándar)',
    shortName: 'Nacional Estándar',
    badgeLabel: 'Envío Nacional Estándar',
    rateCOP: 16500,
    estimatedDays: '2 a 4 Días Hábiles',
    description: 'Cundinamarca, Boyacá, Tolima, Huila, Caldas, Risaralda, Quindío, Bolívar, Córdoba, Cesar, Magdalena, Sucre, Norte de Santander, Meta, Casanare, Cauca, Nariño',
    departments: [
      'Cundinamarca',
      'Boyacá',
      'Tolima',
      'Huila',
      'Caldas',
      'Risaralda',
      'Quindío',
      'Bolívar',
      'Córdoba',
      'Cesar',
      'Magdalena',
      'Sucre',
      'Norte de Santander',
      'Meta',
      'Casanare',
      'Cauca',
      'Nariño'
    ]
  },
  zona_3: {
    id: 'zona_3',
    name: 'Zona 3 (Especiales / Reexpedición)',
    shortName: 'Zona Especial',
    badgeLabel: 'Envío Zona Especial / Reexpedición',
    rateCOP: 28000,
    estimatedDays: '4 a 7 Días Hábiles',
    description: 'Amazonía, Orinoquía, Fronteras, Chocó, La Guajira e Islas de San Andrés y Providencia',
    departments: [
      'Arauca',
      'Chocó',
      'La Guajira',
      'Putumayo',
      'Caquetá',
      'Amazonas',
      'Guainía',
      'Guaviare',
      'Vaupés',
      'Vichada',
      'San Andrés y Providencia'
    ]
  }
};

/**
 * Determina la zona tarifaria según el departamento y ciudad seleccionados
 */
export function getShippingZoneForLocation(
  departmentName?: string, 
  cityName?: string
): ShippingZoneConfig {
  if (!departmentName) {
    return SHIPPING_ZONES.zona_1; // Por defecto Bogotá D.C.
  }

  const cleanDept = departmentName.trim();
  const cleanCity = (cityName || '').trim().toLowerCase();

  // Caso 1: Verificar si es Zona 3 (Especiales / Reexpedición)
  const isZone3 = SHIPPING_ZONES.zona_3.departments.some(
    d => d.toLowerCase() === cleanDept.toLowerCase()
  );
  if (isZone3) {
    return SHIPPING_ZONES.zona_3;
  }

  // Caso 2: Verificar si es Zona 1 (Local / Principales)
  if (cleanDept.toLowerCase() === 'bogotá d.c.' || cleanDept.toLowerCase() === 'bogota') {
    return SHIPPING_ZONES.zona_1;
  }

  const isZone1Dept = SHIPPING_ZONES.zona_1.departments.some(
    d => d.toLowerCase() === cleanDept.toLowerCase()
  );

  if (isZone1Dept) {
    // Si la ciudad está explícitamente en la lista metropolitana de Zona 1
    if (cleanCity && SHIPPING_ZONES.zona_1.mainCities?.includes(cleanCity)) {
      return SHIPPING_ZONES.zona_1;
    }
    // Si no se especificó ciudad aún o es la capital del departamento
    if (!cleanCity) {
      return SHIPPING_ZONES.zona_1;
    }
    // Si es un municipio apartado del departamento de Zona 1, pasa a tarifa nacional estándar
    return SHIPPING_ZONES.zona_2;
  }

  // Caso 3: Por defecto Zona 2 (Nacional estándar)
  return SHIPPING_ZONES.zona_2;
}

/**
 * Opciones para el cálculo de flete dinámico
 */
export interface CalculateShippingOptions {
  department: string;
  city: string;
  cartItems?: CartItem[];
  subtotal: number;
  totalQuantity?: number;
  freeShippingThreshold?: number;
  customRates?: Partial<Record<ShippingZoneId, number>>;
}

/**
 * Calcula el costo de envío dinámico con la regla clave:
 * - 1 producto individual: Paga el flete de su zona logística ($11.000 / $16.500 / $28.000 COP)
 * - 2 o más productos: ¡ENVÍO 100% GRATIS A TODO EL PAÍS! (Incentivo de alto impacto comercial)
 * - También aplica si un producto individual tiene envío gratis activado o supera el monto mínimo.
 */
export function calculateShippingCost({
  department,
  city,
  cartItems = [],
  subtotal,
  totalQuantity,
  freeShippingThreshold = 120000,
  customRates
}: CalculateShippingOptions): ShippingCalculationResult {
  const zone = getShippingZoneForLocation(department, city);
  const baseRate = customRates?.[zone.id] ?? zone.rateCOP;
  const daneCode = getDaneCode(city, department);

  // Calcular cantidad total de productos
  const actualTotalQuantity = totalQuantity !== undefined 
    ? totalQuantity 
    : cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

  // 1. REGLA PRINCIPAL DE CONVERSIÓN: 2 o más productos en el carrito = ENVÍO GRATIS
  const isMultiItemFreeShipping = actualTotalQuantity >= 2;

  // 2. Validar si algún producto en el carrito tiene envío gratis activado de fábrica
  const hasProductWithFreeShipping = cartItems.some(item => {
    const p = item.product as any;
    return p?.freeShipping === true || p?.envioGratis === true;
  });

  // 3. Validar si se superó el umbral de compra mínima por monto ($120.000 COP)
  const isThresholdMet = subtotal >= freeShippingThreshold && subtotal > 0;

  let isFreeShipping = false;
  let freeShippingReason: 'multi_item_bundle' | 'cart_threshold' | 'product_free_shipping' | null = null;
  let finalRate = baseRate;

  if (isMultiItemFreeShipping) {
    isFreeShipping = true;
    freeShippingReason = 'multi_item_bundle';
    finalRate = 0;
  } else if (isThresholdMet) {
    isFreeShipping = true;
    freeShippingReason = 'cart_threshold';
    finalRate = 0;
  } else if (hasProductWithFreeShipping) {
    isFreeShipping = true;
    freeShippingReason = 'product_free_shipping';
    finalRate = 0;
  }

  // Generar etiqueta descriptiva
  let badgeText = '';
  let badgeColor: 'emerald' | 'sky' | 'amber' | 'indigo' | 'orange' = 'sky';

  if (isFreeShipping) {
    if (freeShippingReason === 'multi_item_bundle') {
      badgeText = `¡Envío GRATIS por llevar 2+ productos! (Ahorras $${baseRate.toLocaleString('es-CO')} COP)`;
    } else {
      badgeText = `¡Envío GRATIS aplicado! (Ahorras $${baseRate.toLocaleString('es-CO')} COP)`;
    }
    badgeColor = 'emerald';
  } else if (zone.id === 'zona_1') {
    badgeText = `Envío 1 Producto (Local / Principal): $${baseRate.toLocaleString('es-CO')} COP`;
    badgeColor = 'sky';
  } else if (zone.id === 'zona_2') {
    badgeText = `Envío 1 Producto (Nacional Estándar): $${baseRate.toLocaleString('es-CO')} COP`;
    badgeColor = 'indigo';
  } else {
    badgeText = `Envío 1 Producto (Zona Especial): $${baseRate.toLocaleString('es-CO')} COP`;
    badgeColor = 'amber';
  }

  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const itemsNeededForFreeShipping = Math.max(0, 2 - actualTotalQuantity);
  const savingsCOP = isFreeShipping ? baseRate : 0;

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    zoneShortName: zone.shortName,
    zoneDescription: zone.description,
    baseRate,
    finalRate,
    isFreeShipping,
    freeShippingReason,
    totalQuantity: actualTotalQuantity,
    itemsNeededForFreeShipping,
    estimatedDays: zone.estimatedDays,
    badgeText,
    badgeColor,
    daneCode,
    freeShippingThreshold,
    amountNeededForFreeShipping,
    savingsCOP
  };
}
