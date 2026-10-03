export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  city?: string;
  createdAt: string;
  interests: string[];
  discountCodeGenerated: string;
  status: 'activo' | 'desuscrito';
}

export interface GeneratedAIEmailTemplate {
  subject: string;
  preheader: string;
  greeting: string;
  headline: string;
  bodyText: string;
  recommendedProducts: Array<{
    name: string;
    reason: string;
    offerBadge: string;
    priceCOP: string;
  }>;
  couponCode: string;
  callToAction: string;
  guaranteeText: string;
}

const STORAGE_KEY_SUBSCRIBERS = 'zavela_newsletter_subscribers';

export const INITIAL_SUBSCRIBERS: NewsletterSubscriber[] = [
  {
    id: 'sub-1',
    email: 'camilo.torres@gmail.com',
    name: 'Camilo Torres',
    city: 'Bogotá D.C.',
    createdAt: '2026-09-20',
    interests: ['Tecnología', 'Seguridad', 'Hogar'],
    discountCodeGenerated: 'BIENVENIDO10',
    status: 'activo'
  },
  {
    id: 'sub-2',
    email: 'andrea.zapata@hotmail.com',
    name: 'Andrea Zapata',
    city: 'Medellín',
    createdAt: '2026-09-22',
    interests: ['Halloween', 'Temporada', 'Accesorios'],
    discountCodeGenerated: 'ZAVELA10',
    status: 'activo'
  }
];

export function getSubscribers(): NewsletterSubscriber[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIBERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify(INITIAL_SUBSCRIBERS));
      return INITIAL_SUBSCRIBERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('Error reading newsletter subscribers from localStorage:', e);
  }
  return INITIAL_SUBSCRIBERS;
}

export function subscribeNewsletter(email: string, userInterests: string[] = []): { subscriber: NewsletterSubscriber; isNew: boolean } {
  const current = getSubscribers();
  const cleanEmail = email.trim().toLowerCase();

  const existing = current.find(s => s.email.toLowerCase() === cleanEmail);
  if (existing) {
    // Merge new interests
    const mergedInterests = Array.from(new Set([...existing.interests, ...userInterests]));
    const updated = current.map(s => s.id === existing.id ? { ...s, interests: mergedInterests } : s);
    localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify(updated));
    return { subscriber: { ...existing, interests: mergedInterests }, isNew: false };
  }

  const newSub: NewsletterSubscriber = {
    id: `sub-${Date.now()}`,
    email: cleanEmail,
    createdAt: new Date().toISOString().split('T')[0],
    interests: userInterests.length > 0 ? userInterests : ['Tendencias Zavela', 'Ofertas Semanales'],
    discountCodeGenerated: 'BIENVENIDO10',
    status: 'activo'
  };

  const updated = [newSub, ...current];
  localStorage.setItem(STORAGE_KEY_SUBSCRIBERS, JSON.stringify(updated));
  return { subscriber: newSub, isNew: true };
}

/**
 * Generates an AI-driven personalized email template taking into account customer interests or trending products
 */
export function generateAIEmailCampaign(subscriber: NewsletterSubscriber): GeneratedAIEmailTemplate {
  const interestsStr = subscriber.interests.length > 0 ? subscriber.interests.join(', ') : 'Tendencias y Ofertas';

  const isHalloween = subscriber.interests.some(i => i.toLowerCase().includes('halloween') || i.toLowerCase().includes('temporada'));
  const isTech = subscriber.interests.some(i => i.toLowerCase().includes('tecno') || i.toLowerCase().includes('seguridad'));

  if (isHalloween) {
    return {
      subject: '🎃 ¡Tu cupón del 10% para la temporada más esperada de Colombia!',
      preheader: 'Disfraces inflables, máscaras LED y novedades con Pago Contra Entrega.',
      greeting: subscriber.name ? `¡Hola ${subscriber.name}!` : '¡Hola!',
      headline: 'Selección Exclusiva de Temporada y Diversión',
      bodyText: `Analizamos tus preferencias e intereses en ${interestsStr}. Por haberte suscrito, activamos un 10% de descuento inmediato para que te prepares antes de que se agoten las unidades en bodega.`,
      recommendedProducts: [
        {
          name: 'Disfraz Inflable de T-Rex Jurassic Park',
          reason: 'Tendencia #1 en Colombia esta semana con alta demanda',
          offerBadge: '10% OFF + Envío Prioritario',
          priceCOP: 'COP 145.000'
        },
        {
          name: 'Máscara LED La Purga Neón Halloween',
          reason: 'Favorito para fiestas y eventos nocturnos',
          offerBadge: 'Lleva 2 por COP 98.000',
          priceCOP: 'COP 58.000'
        }
      ],
      couponCode: subscriber.discountCodeGenerated || 'BIENVENIDO10',
      callToAction: 'Canjear mi 10% OFF con Pago Contra Entrega',
      guaranteeText: 'Pagas en efectivo únicamente cuando el repartidor de Servientrega o Coordinadora entregue en tu puerta.'
    };
  }

  if (isTech) {
    return {
      subject: '⚡ Lanzamientos Tecnológicos con Pago al Recibir en tu Puerta',
      preheader: 'Seguridad para tu hogar, audio de alta fidelidad y gadgets.',
      greeting: subscriber.name ? `¡Hola ${subscriber.name}!` : '¡Hola!',
      headline: 'Tecnología Inteligente Seleccionada por CommerceMind AI',
      bodyText: `Diseñamos este boletín enfocado en tus búsquedas recientes de ${interestsStr}. Te compartimos los dispositivos con mejores calificaciones de clientes en Colombia.`,
      recommendedProducts: [
        {
          name: 'Cámara de Seguridad Wifi 360° Exterior Solar',
          reason: 'La más vendida para hogares y fincas en Colombia',
          offerBadge: 'Envío Gratis + 10% OFF',
          priceCOP: 'COP 189.000'
        },
        {
          name: 'Reloj Inteligente Smartwatch Ultra Pro 49mm',
          reason: 'Llamadas Bluetooth, monitoreo cardíaco y pantalla HD',
          offerBadge: 'Garantía 30 Días',
          priceCOP: 'COP 119.000'
        }
      ],
      couponCode: subscriber.discountCodeGenerated || 'BIENVENIDO10',
      callToAction: 'Ver Selección Tecnológica & Usar Cupón',
      guaranteeText: 'Recibe en 48 horas en ciudades principales con garantía de satisfacción 100% Zavela Store.'
    };
  }

  return {
    subject: '✨ Bienvenido a Zavela Store: Tus favoritos seleccionados con 10% OFF',
    preheader: 'Aprovecha tu cupón exclusivo en todo nuestro catálogo nacional.',
    greeting: subscriber.name ? `¡Hola ${subscriber.name}!` : '¡Hola!',
    headline: 'Descubre las Mejores Oportunidades del Catálogo',
    bodyText: `Gracias por unirte a nuestra comunidad exclusiva. Hemos seleccionado los productos con mayor satisfacción y calificaciones de 5 estrellas en Colombia para inspirar tu próxima compra.`,
    recommendedProducts: [
      {
        name: 'Perfume Baccara Rouge 540 Extraît 70ml',
        reason: 'El más solicitado con sello de originalidad garantizado',
        offerBadge: '10% OFF Especial',
        priceCOP: 'COP 135.000'
      },
      {
        name: 'Proyector Galaxia Láser Astronauta 3D',
        reason: 'Transforma cualquier habitación en un planetario mágico',
        offerBadge: 'Envío Contra Entrega',
        priceCOP: 'COP 98.000'
      }
    ],
    couponCode: subscriber.discountCodeGenerated || 'BIENVENIDO10',
    callToAction: 'Explorar Catálogo y Aplicar Descuento',
    guaranteeText: 'Comprar en Zavela Store es 100% seguro: revisas el producto al recibir y pagas en efectivo en tu casa.'
  };
}
