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

/**
 * Ya no existen reseñas de ejemplo. Antes el código traía 8 reseñas escritas de antemano (con nombres de clientes)
 * que se mostraban en todos los productos como "compras verificadas". Eso se considera publicidad engañosa,
 * así que se eliminaron y se borran también de los navegadores que ya las habían guardado.
 */
export const INITIAL_SEED_REVIEWS: ProductReview[] = [];
const REMOVED_SEED_IDS = new Set(['rev-01', 'rev-02', 'rev-03', 'rev-04', 'rev-05', 'rev-06', 'rev-07', 'rev-08']);

export function getAllReviews(): ProductReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVIEWS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = parsed.filter((r: any) => r && !REMOVED_SEED_IDS.has(String(r.id)));
      if (clean.length !== parsed.length) localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(clean));
      return clean;
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
  // Solo reseñas marcadas como verificadas, y solo las del producto consultado (nunca las de otros productos).
  const filtered = getAllReviews().filter(r => r.verified === true && r.rating >= 4);

  if (productNameOrId && productNameOrId !== 'all') {
    const term = productNameOrId.toLowerCase();
    return filtered.filter(r =>
      (r.productId && r.productId === productNameOrId) ||
      r.productName.toLowerCase().includes(term) ||
      term.includes(r.productName.toLowerCase())
    );
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
