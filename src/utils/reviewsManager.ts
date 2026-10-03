export interface ProductReview {
  id: string;
  productId?: string;
  productName: string;
  customerName: string;
  customerCity: string;
  customerDepartment: string;
  date: string;
  rating: number; // 1 to 5
  comment: string;
  verified: boolean;
  carrier?: string; // Coordinadora, Servientrega, Inter Rapidísimo, Envía
  customerPhotoUrl?: string;
  satisfactionBadges: string[];
  // Campos de gestión para el administrador:
  resolved?: boolean;
  adminResponse?: string;
  complaintCategory?: 'calidad' | 'tiempo_envio' | 'talla_tamano' | 'empaque' | 'atencion' | 'ninguna';
}

const STORAGE_KEY_REVIEWS = 'zavela_customer_reviews';

export const INITIAL_SEED_REVIEWS: ProductReview[] = [
  {
    id: 'rev-01',
    productName: 'Humidificador Ultrasónico Llama LED Pro',
    customerName: 'Carlos Andrés Mendoza',
    customerCity: 'Medellín',
    customerDepartment: 'Antioquia',
    date: 'Hace 2 días',
    rating: 5,
    carrier: 'Coordinadora',
    comment: 'Tenía desconfianza de comprar por internet, pero con el pago contra entrega todo fue súper transparente. El repartidor de Coordinadora llegó a mi casa en El Poblado, revisé el paquete y le pagué en efectivo. El humidificador funciona perfecto y huele increíble.',
    verified: true,
    customerPhotoUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500',
    satisfactionBadges: ['Pago Contra Entrega Verificado', '100% Satisfecho', 'Entrega en 48h'],
    complaintCategory: 'ninguna'
  },
  {
    id: 'rev-02',
    productName: 'Baccara Rouge 540 Extraît 70ml',
    customerName: 'Valentina Restrepo P.',
    customerCity: 'Bogotá D.C.',
    customerDepartment: 'Cundinamarca',
    date: 'Hace 3 días',
    rating: 5,
    carrier: 'Servientrega',
    comment: 'Llegó en solo 24 horas a Chapinero por Servientrega. El perfume es 100% original con su batch code y empaque sellado de fábrica. Excelente fijación y estela. Ya pedí otro para regalar.',
    verified: true,
    customerPhotoUrl: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=500',
    satisfactionBadges: ['Original Verificado', 'Empaque de Lujo', 'Envío Gratis'],
    complaintCategory: 'ninguna'
  },
  {
    id: 'rev-03',
    productName: 'AirPods Max High-Res Spatial Audio',
    customerName: 'Julián David Gómez',
    customerCity: 'Cali',
    customerDepartment: 'Valle del Cauca',
    date: 'Hace 5 días',
    rating: 5,
    carrier: 'Inter Rapidísimo',
    comment: 'Excelente sonido y cancelación de ruido. Me dio mucha tranquilidad que no me pidieran tarjeta de crédito ni adelanto. Pagué cuando el domiciliario me entregó la caja. 10/10 en atención por WhatsApp.',
    verified: true,
    customerPhotoUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    satisfactionBadges: ['Pago al Recibir', 'Calidad Premium', 'Garantía 30 Días'],
    complaintCategory: 'ninguna'
  },
  {
    id: 'rev-04',
    productName: 'Disfraz Inflable de T-Rex Jurassic Park',
    customerName: 'Mariana Duque Vélez',
    customerCity: 'Pereira',
    customerDepartment: 'Risaralda',
    date: 'Hace 6 días',
    rating: 5,
    carrier: 'Envía',
    comment: '¡El mejor disfraz de todos! El ventilador infla el t-rex en menos de un minuto. Mi hijo quedó encantado para el colegio y las fotos salieron brutales. Pagué contra entrega sin problema.',
    verified: true,
    customerPhotoUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500',
    satisfactionBadges: ['Entrega Rápida', 'Diversión Garantizada', 'Pago Contra Entrega'],
    complaintCategory: 'ninguna'
  },
  {
    id: 'rev-05',
    productName: 'Cámara de Seguridad Wifi 360° Exterior Solar',
    customerName: 'Álvaro Hernández',
    customerCity: 'Bucaramanga',
    customerDepartment: 'Santander',
    date: 'Hace 1 semana',
    rating: 4,
    carrier: 'Servientrega',
    comment: 'La calidad de video de noche y la alerta de movimiento funcionan muy bien en la finca. La instalación fue fácil con la app. Le doy 4 estrellas porque el manual venía en inglés, pero el asesor de WhatsApp me mandó el video en español.',
    verified: true,
    customerPhotoUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=500',
    satisfactionBadges: ['Soporte por WhatsApp', 'Cámara Verificada'],
    complaintCategory: 'ninguna'
  },
  // Reseñas de mejora / quejas para gestión del administrador:
  {
    id: 'rev-06',
    productName: 'Máscara LED La Purga Neón Halloween',
    customerName: 'Felipe Sandoval G.',
    customerCity: 'Ibagué',
    customerDepartment: 'Tolima',
    date: 'Hace 4 días',
    rating: 2,
    carrier: 'Inter Rapidísimo',
    comment: 'La transportadora se demoró 5 días en entregar en Ibagué y la caja llegó un poco aplastada en una esquina. La máscara prende bien, pero deberían embalar con plástico burbuja más grueso.',
    verified: true,
    satisfactionBadges: ['Pago Contra Entrega'],
    resolved: false,
    complaintCategory: 'tiempo_envio',
    adminResponse: ''
  },
  {
    id: 'rev-07',
    productName: 'Reloj Inteligente Smartwatch Ultra Pro 49mm',
    customerName: 'Carolina Muñoz',
    customerCity: 'Barranquilla',
    customerDepartment: 'Atlántico',
    date: 'Hace 1 semana',
    rating: 3,
    carrier: 'Envía',
    comment: 'El reloj es muy bonito y las notificaciones llegan bien, pero la manilla naranja me quedó un poco grande para mi muñeca delgada. Sugiero que incluyan una opción de manilla más pequeña o ajustable.',
    verified: true,
    satisfactionBadges: ['Cliente Verificado'],
    resolved: true,
    complaintCategory: 'talla_tamano',
    adminResponse: 'Hola Carolina, gracias por tu aporte. Te enviamos sin costo por WhatsApp un cupón y un extensor de manilla de silicona flexible.'
  },
  {
    id: 'rev-08',
    productName: 'Mini Impresora Térmica Portátil Bluetooth',
    customerName: 'Esteban Cuervo',
    customerCity: 'Manizales',
    customerDepartment: 'Caldas',
    date: 'Hace 3 días',
    rating: 2,
    carrier: 'Coordinadora',
    comment: 'Uno de los tres rollos de papel adhesivo venía arrugado dentro del empaque. La impresora funciona genial, pero el papel dañado no se pudo usar.',
    verified: true,
    satisfactionBadges: ['Pago al Recibir'],
    resolved: false,
    complaintCategory: 'empaque',
    adminResponse: ''
  }
];

export function getAllReviews(): ProductReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVIEWS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(INITIAL_SEED_REVIEWS));
      return INITIAL_SEED_REVIEWS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('Error reading customer reviews from localStorage:', e);
  }
  return INITIAL_SEED_REVIEWS;
}

export function saveReviews(reviews: ProductReview[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(reviews));
  } catch (e) {
    console.warn('Error saving reviews to localStorage:', e);
  }
}

/**
 * Returns only verified positive reviews (4 and 5 stars) for public confidence
 */
export function getVerifiedPositiveReviews(productNameOrId?: string): ProductReview[] {
  const all = getAllReviews();
  let filtered = all.filter(r => r.rating >= 4);

  if (productNameOrId && productNameOrId !== 'all') {
    const term = productNameOrId.toLowerCase();
    const specific = filtered.filter(r => 
      (r.productId && r.productId === productNameOrId) ||
      r.productName.toLowerCase().includes(term) ||
      term.includes(r.productName.toLowerCase())
    );
    if (specific.length > 0) return specific;
  }

  return filtered;
}

export function addCustomerReview(newRev: Omit<ProductReview, 'id' | 'date'>): ProductReview {
  const all = getAllReviews();
  const review: ProductReview = {
    ...newRev,
    id: `rev-${Date.now()}`,
    date: 'Hace unos momentos',
    resolved: newRev.rating >= 4 ? true : false
  };

  const updated = [review, ...all];
  saveReviews(updated);
  return review;
}

export function updateReviewAdmin(
  reviewId: string, 
  updates: { resolved?: boolean; adminResponse?: string; complaintCategory?: ProductReview['complaintCategory'] }
): ProductReview[] {
  const all = getAllReviews();
  const updated = all.map(r => {
    if (r.id === reviewId) {
      return {
        ...r,
        ...updates
      };
    }
    return r;
  });

  saveReviews(updated);
  return updated;
}
