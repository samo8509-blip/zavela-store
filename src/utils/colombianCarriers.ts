import React from 'react';

export type ColombianCarrierName = 'Inter Rapidísimo' | 'Servientrega' | 'Coordinadora' | 'Envía';

export interface ShipmentCheckpoint {
  id: string;
  date: string;
  time: string;
  location: string;
  city: string;
  status: string;
  description: string;
  isCompleted: boolean;
  isCurrent?: boolean;
}

export interface CarrierShipment {
  orderNumber: string;
  trackingNumber: string;
  carrier: ColombianCarrierName;
  originCity: string;
  originHub: string;
  destinationCity: string;
  destinationAddress: string;
  estimatedDelivery: string;
  statusStep: number; // 0: Pedido confirmado, 1: En preparación, 2: Despachado, 3: En ruta de entrega, 4: Entregado
  statusTitle: string;
  statusDetails: string;
  paymentMode: 'contra_entrega' | 'ya_pagado';
  paymentModeLabel: string;
  totalCOP: number;
  productTitle: string;
  productImage: string;
  carrierGuideFormat: string;
  checkpoints: ShipmentCheckpoint[];
}

export interface CarrierBrandInfo {
  name: ColombianCarrierName;
  shortName: string;
  tagline: string;
  guideFormatDescription: string;
  primaryColor: string;
  secondaryColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  buttonBg: string;
  buttonText: string;
  accentRing: string;
}

export const COLOMBIAN_CARRIERS_META: Record<ColombianCarrierName, CarrierBrandInfo> = {
  'Inter Rapidísimo': {
    name: 'Inter Rapidísimo',
    shortName: 'Inter Rapidísimo',
    tagline: 'Entrega segura en el 100% de Colombia',
    guideFormatDescription: '12 dígitos numéricos (ej. 240091842019)',
    primaryColor: '#003399',
    secondaryColor: '#FF6600',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-900',
    badgeBorder: 'border-orange-200',
    buttonBg: 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700',
    buttonText: 'text-white',
    accentRing: 'ring-orange-400/40'
  },
  'Servientrega': {
    name: 'Servientrega',
    shortName: 'Servientrega',
    tagline: 'Centro de Soluciones • Entrega Total',
    guideFormatDescription: '10 dígitos numéricos (ej. 2198402941)',
    primaryColor: '#00873E',
    secondaryColor: '#FFC600',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-200',
    buttonBg: 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800',
    buttonText: 'text-white',
    accentRing: 'ring-emerald-400/40'
  },
  'Coordinadora': {
    name: 'Coordinadora',
    shortName: 'Coordinadora',
    tagline: 'Llegamos a tiempo • Red Logística Nacional',
    guideFormatDescription: '11 dígitos numéricos (ej. 74920194821)',
    primaryColor: '#002F6C',
    secondaryColor: '#D00000',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-900',
    badgeBorder: 'border-blue-200',
    buttonBg: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 hover:from-blue-800 hover:to-indigo-900',
    buttonText: 'text-white',
    accentRing: 'ring-blue-400/40'
  },
  'Envía': {
    name: 'Envía',
    shortName: 'Envía Colvanes',
    tagline: 'Pasión por lo que hacemos • Cobertura COD',
    guideFormatDescription: '10 dígitos numéricos (ej. 0492817402)',
    primaryColor: '#FF5900',
    secondaryColor: '#002C6C',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-200',
    buttonBg: 'bg-gradient-to-r from-[#FF5900] to-red-600 hover:from-[#E04800] hover:to-red-700',
    buttonText: 'text-white',
    accentRing: 'ring-amber-400/40'
  }
};

export const COLOMBIAN_TEST_GUIDES: CarrierShipment[] = [
  // 1. Inter Rapidísimo: "En ruta de entrega hacia la dirección del cliente (Pago Contra Entrega pendiente de recaudo)"
  {
    orderNumber: 'ZAV-1002',
    trackingNumber: 'INT-240091842019',
    carrier: 'Inter Rapidísimo',
    originCity: 'Medellín, Antioquia',
    originHub: 'Centro Logístico Regional Itagüí',
    destinationCity: 'Bogotá D.C.',
    destinationAddress: 'Calle 127 # 45-22, Niza / Suba',
    estimatedDelivery: 'Hoy antes de las 5:30 PM',
    statusStep: 3, // En ruta de entrega (Paso 4 de 5)
    statusTitle: 'En ruta de entrega hacia tu dirección',
    statusDetails: 'En ruta de entrega hacia la dirección del cliente (Pago Contra Entrega pendiente de recaudo en efectivo o QR).',
    paymentMode: 'contra_entrega',
    paymentModeLabel: 'Pago Contra Entrega (Efectivo / Transferencia al recibir)',
    totalCOP: 145000,
    productTitle: 'Disfraz Inflable de T-Rex Jurassic Park con Ventilador Turbo',
    productImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500',
    carrierGuideFormat: 'Formato Inter Rapidísimo (12 Dígitos)',
    checkpoints: [
      {
        id: 'cp-int-5',
        date: '24/09/2026',
        time: '08:45 AM',
        location: 'Ruta Urbana Suba - Calle 127',
        city: 'Bogotá D.C.',
        status: 'En Reparto Final',
        description: 'El mensajero motorizado de Inter Rapidísimo lleva el paquete en su ruta matutina. Tiene asignado el recaudo de COP 145.000 en efectivo o transferencia.',
        isCompleted: true,
        isCurrent: true
      },
      {
        id: 'cp-int-4',
        date: '24/09/2026',
        time: '04:20 AM',
        location: 'Centro de Clasificación Montevideo',
        city: 'Bogotá D.C.',
        status: 'Llegada a Ciudad Destino',
        description: 'Descargue de tractocamión troncal y clasificación automatizada en banda hacia zona norte.',
        isCompleted: true
      },
      {
        id: 'cp-int-3',
        date: '23/09/2026',
        time: '09:15 PM',
        location: 'Troncal Alto de La Línea',
        city: 'En Tránsito Nacional',
        status: 'En Tránsito Terrestre',
        description: 'Vehículo troncal de Inter Rapidísimo en ruta segura con precinto electrónico satelital.',
        isCompleted: true
      },
      {
        id: 'cp-int-2',
        date: '23/09/2026',
        time: '03:30 PM',
        location: 'Hub Regional Itagüí',
        city: 'Medellín, Antioquia',
        status: 'Despachado de Origen',
        description: 'Paquete recibido, pesado (1.2 Kg) y despachado con destino a Bogotá D.C.',
        isCompleted: true
      },
      {
        id: 'cp-int-1',
        date: '23/09/2026',
        time: '10:30 AM',
        location: 'Bodega Principal Zavela Store',
        city: 'Medellín, Antioquia',
        status: 'Etiqueta Generada',
        description: 'Guía nacional #INT-240091842019 creada con Inter Rapidísimo bajo convenio Pago Contra Entrega.',
        isCompleted: true
      }
    ]
  },

  // 2. Servientrega: "En tránsito en centro de distribución principal"
  {
    orderNumber: 'ZAV-1003',
    trackingNumber: 'SER-2198402941',
    carrier: 'Servientrega',
    originCity: 'Bogotá D.C.',
    originHub: 'Centro de Logística Integral Siberia',
    destinationCity: 'Cali, Valle del Cauca',
    destinationAddress: 'Avenida 6N # 28-15, Barrio Granada',
    estimatedDelivery: 'Mañana en horas de la mañana',
    statusStep: 2, // Despachado con transportadora / En tránsito (Paso 3 de 5)
    statusTitle: 'En tránsito en centro de distribución principal',
    statusDetails: 'En tránsito en centro de distribución principal. Paquete consolidado en remesa nacional hacia Cali.',
    paymentMode: 'contra_entrega',
    paymentModeLabel: 'Pago Contra Entrega (Efectivo / Transferencia al recibir)',
    totalCOP: 189000,
    productTitle: 'Cámara de Seguridad Wifi 360° Exterior Solar con Visión Nocturna',
    productImage: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=500',
    carrierGuideFormat: 'Formato Servientrega (10 Dígitos)',
    checkpoints: [
      {
        id: 'cp-ser-3',
        date: '24/09/2026',
        time: '06:15 AM',
        location: 'Centro Logístico Siberia - Muelle 4',
        city: 'Cundinamarca / Bogotá',
        status: 'En Tránsito Principal',
        description: 'Paquete clasificado y cargado en el vehículo troncal de Servientrega con destino al Hub de Acopi - Yumbo (Cali).',
        isCompleted: true,
        isCurrent: true
      },
      {
        id: 'cp-ser-2',
        date: '23/09/2026',
        time: '07:50 PM',
        location: 'Centro de Recepción Carga Bogotá Norte',
        city: 'Bogotá D.C.',
        status: 'Recibido en Plataforma',
        description: 'Recolección exitosa en bodega Zavela Store. Paquete ingresado al sistema con guía #SER-2198402941.',
        isCompleted: true
      },
      {
        id: 'cp-ser-1',
        date: '23/09/2026',
        time: '02:00 PM',
        location: 'Bodega Zavela Store',
        city: 'Bogotá D.C.',
        status: 'Guía Generada',
        description: 'Orden confirmada y empaque verificado con precinto de seguridad Servientrega.',
        isCompleted: true
      }
    ]
  },

  // 3. Coordinadora: "Entregado con éxito a satisfacción"
  {
    orderNumber: 'ZAV-1001',
    trackingNumber: 'COO-74920194821',
    carrier: 'Coordinadora',
    originCity: 'Medellín, Antioquia',
    originHub: 'Centro Logístico Guayabal',
    destinationCity: 'Barranquilla, Atlántico',
    destinationAddress: 'Carrera 53 # 79-112, El Prado',
    estimatedDelivery: 'Entregado a Satisfacción',
    statusStep: 4, // Entregado (Paso 5 de 5)
    statusTitle: 'Entregado con éxito a satisfacción',
    statusDetails: 'Entregado con éxito a satisfacción en portería residencial. Pago en efectivo liquidado y comprobante firmado.',
    paymentMode: 'contra_entrega',
    paymentModeLabel: 'Pago Contra Entrega (Cobro Liquidado en Efectivo)',
    totalCOP: 135000,
    productTitle: 'Perfume Baccara Rouge 540 Extraît 70ml Concentrado',
    productImage: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=500',
    carrierGuideFormat: 'Formato Coordinadora (11 Dígitos)',
    checkpoints: [
      {
        id: 'cp-coo-5',
        date: '24/09/2026',
        time: '11:40 AM',
        location: 'Dirección del Destinatario (El Prado)',
        city: 'Barranquilla, Atlántico',
        status: 'Entregado a Satisfacción',
        description: 'Paquete entregado a satisfacción de la destinataria. Se recibió el pago contra entrega en efectivo por COP 135.000 con recibo electrónico #REC-98421.',
        isCompleted: true,
        isCurrent: true
      },
      {
        id: 'cp-coo-4',
        date: '24/09/2026',
        time: '07:25 AM',
        location: 'Terminal de Reparto Vía 40',
        city: 'Barranquilla, Atlántico',
        status: 'En Ruta de Reparto',
        description: 'Asignado al móvil de Coordinadora Mercantil para entrega en horario diurno.',
        isCompleted: true
      },
      {
        id: 'cp-coo-3',
        date: '23/09/2026',
        time: '08:30 PM',
        location: 'Centro de Clasificación Regional Caribe',
        city: 'Soledad / Barranquilla',
        status: 'Llegada a Terminal Regional',
        description: 'Descargue de remesa terrestre procedente de Medellín.',
        isCompleted: true
      },
      {
        id: 'cp-coo-2',
        date: '22/09/2026',
        time: '06:10 PM',
        location: 'Centro Logístico Guayabal',
        city: 'Medellín, Antioquia',
        status: 'Despacho Terrestre',
        description: 'Cargue en furgón troncal Coordinadora ruta Costa Atlántica.',
        isCompleted: true
      },
      {
        id: 'cp-coo-1',
        date: '22/09/2026',
        time: '11:15 AM',
        location: 'Bodega Zavela Store Medellín',
        city: 'Medellín, Antioquia',
        status: 'Recepción y Pesaje',
        description: 'Manifiesto de carga nacional generado con Coordinadora.',
        isCompleted: true
      }
    ]
  },

  // 4. Envía: "En preparación en bodega / Generación de etiqueta"
  {
    orderNumber: 'ZAV-1004',
    trackingNumber: 'ENV-0492817402',
    carrier: 'Envía',
    originCity: 'Bogotá D.C.',
    originHub: 'Bodega Central de Despachos Zavela',
    destinationCity: 'Bucaramanga, Santander',
    destinationAddress: 'Carrera 33 # 48-19, Cabecera del Llano',
    estimatedDelivery: 'Despacho programado para hoy',
    statusStep: 1, // En preparación (Paso 2 de 5)
    statusTitle: 'En preparación en bodega / Generación de etiqueta',
    statusDetails: 'En preparación en bodega / Generación de etiqueta de despacho nacional con Envía Colvanes.',
    paymentMode: 'contra_entrega',
    paymentModeLabel: 'Pago Contra Entrega (Efectivo / Transferencia al recibir)',
    totalCOP: 119000,
    productTitle: 'Reloj Inteligente Smartwatch Ultra Pro 49mm HD',
    productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    carrierGuideFormat: 'Formato Envía Colvanes (10 Dígitos)',
    checkpoints: [
      {
        id: 'cp-env-2',
        date: '24/09/2026',
        time: '09:10 AM',
        location: 'Bodega Central de Despachos Zavela',
        city: 'Bogotá D.C.',
        status: 'Generación de Etiqueta Nacional',
        description: 'Etiqueta de guía oficial #ENV-0492817402 impresa y adherida. El lote se encuentra en zona de recolección para el vehículo de Envía de las 2:00 PM.',
        isCompleted: true,
        isCurrent: true
      },
      {
        id: 'cp-env-1',
        date: '24/09/2026',
        time: '08:00 AM',
        location: 'Control de Calidad y Embalaje',
        city: 'Bogotá D.C.',
        status: 'Pedido Confirmado & Inspeccionado',
        description: 'Producto verificado al 100%, sincronizado y embalado con protección de burbuja de alta densidad.',
        isCompleted: true
      }
    ]
  }
];

export function findShipmentByQuery(query: string): CarrierShipment | null {
  const clean = query.trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) return null;

  // Exact match on trackingNumber or orderNumber
  const direct = COLOMBIAN_TEST_GUIDES.find(
    s => s.trackingNumber.toUpperCase() === clean || s.orderNumber.toUpperCase() === clean
  );
  if (direct) return direct;

  // Numeric search (without prefix like INT-, SER-, COO-, ENV-)
  const digitsOnly = clean.replace(/[^\d]/g, '');
  if (digitsOnly.length >= 4) {
    const byDigits = COLOMBIAN_TEST_GUIDES.find(s => {
      const sDigits = s.trackingNumber.replace(/[^\d]/g, '');
      return sDigits.includes(digitsOnly) || digitsOnly.includes(sDigits);
    });
    if (byDigits) return byDigits;
  }

  // Partial match on tracking or order number
  return COLOMBIAN_TEST_GUIDES.find(s => 
    s.trackingNumber.toUpperCase().includes(clean) || 
    clean.includes(s.trackingNumber.toUpperCase()) ||
    s.orderNumber.toUpperCase().includes(clean)
  ) || null;
}
