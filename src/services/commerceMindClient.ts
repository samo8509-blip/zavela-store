import { Product, CartItem } from '../types/index.ts';

export interface CommerceMindClientRecommendation {
  id_producto: string;
  nombre: string;
  tipo_sugerencia: string; // "Venta cruzada" | "Complemento" | "Alternativa similar" | "Tendencia"
  mensaje_persuasivo: string;
}

export interface CommerceMindClientResponse {
  intencion_detectada: string;
  recomendaciones: CommerceMindClientRecommendation[];
  provider?: string;
}

const STORAGE_KEY_VIEWED = 'cm_viewed_history';
const STORAGE_KEY_ACTIONS = 'cm_session_actions';

/**
 * Registers an observed product into visitor session history.
 */
export function registerProductObservation(product: Product): void {
  if (!product || !product.id) return;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_VIEWED);
    const list: Array<{
      id: string;
      id_producto: string;
      nombre: string;
      title: string;
      category: string;
      price: number;
      viewedAt: number;
    }> = raw ? JSON.parse(raw) : [];

    // Filter out if already top of list to avoid duplicates
    const filtered = list.filter(item => item.id !== product.id && item.id_producto !== product.id);

    filtered.unshift({
      id: product.id,
      id_producto: product.id,
      nombre: product.title,
      title: product.title,
      category: product.categoryName || 'General',
      price: product.price,
      viewedAt: Date.now()
    });

    sessionStorage.setItem(STORAGE_KEY_VIEWED, JSON.stringify(filtered.slice(0, 15)));

    // Increment click/view counter
    incrementSessionClicks();
  } catch (err) {
    console.warn('Error recording product view for CommerceMind:', err);
  }
}

/**
 * Increments visitor interaction clicks
 */
export function incrementSessionClicks(): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_ACTIONS);
    const count = raw ? parseInt(raw, 10) : 0;
    sessionStorage.setItem(STORAGE_KEY_ACTIONS, String(count + 1));
  } catch {
    // Ignore storage issues
  }
}

/**
 * Retrieves the visitor's browsing history formatted for CommerceMind AI
 */
export function getNavigationHistory(currentProduct?: Product | null, cartItems: CartItem[] = []) {
  let viewedList: any[] = [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_VIEWED);
    if (raw) viewedList = JSON.parse(raw);
  } catch {
    viewedList = [];
  }

  // Ensure current product is included if provided
  if (currentProduct && !viewedList.some(item => item.id === currentProduct.id || item.id_producto === currentProduct.id)) {
    viewedList.unshift({
      id: currentProduct.id,
      id_producto: currentProduct.id,
      nombre: currentProduct.title,
      title: currentProduct.title,
      category: currentProduct.categoryName || 'General',
      price: currentProduct.price,
      viewedAt: Date.now()
    });
  }

  // Formatted cart items
  const formattedCart = cartItems.map(item => ({
    id: item.product.id,
    id_producto: item.product.id,
    nombre: item.product.title,
    title: item.product.title,
    precio: item.product.price,
    cantidad: item.quantity,
    categoria: item.product.categoryName || 'General'
  }));

  // Unique categories explored
  const categories = Array.from(new Set([
    ...viewedList.map(v => v.category || v.categoria).filter(Boolean),
    ...formattedCart.map(c => c.categoria).filter(Boolean)
  ]));

  let clicks = 5;
  try {
    const rawClicks = sessionStorage.getItem(STORAGE_KEY_ACTIONS);
    if (rawClicks) clicks = Math.max(5, parseInt(rawClicks, 10));
  } catch {}

  return {
    productos_visualizados: viewedList.map(v => ({
      id_producto: v.id_producto || v.id,
      nombre: v.nombre || v.title,
      precio: v.price || v.precio,
      categoria: v.category || v.categoria || 'General'
    })),
    categorias: categories.length > 0 ? categories : ['General'],
    tiempo_permanencia_segundos: Math.max(60, viewedList.length * 35),
    clics: clicks,
    items_carrito: formattedCart
  };
}

/**
 * Requests AI recommendations in "modo": "cliente" from server/routes/ai.ts
 */
export async function requestClientRecommendations(params: {
  currentProduct?: Product | null;
  cartItems?: CartItem[];
  allProducts: Product[];
}): Promise<CommerceMindClientResponse> {
  const { currentProduct, cartItems = [], allProducts = [] } = params;

  // Track product view first
  if (currentProduct) {
    registerProductObservation(currentProduct);
  }

  const history = getNavigationHistory(currentProduct, cartItems);

  // Filter candidate inventory (exclude current product and already carted products when possible)
  const excludeIds = new Set([
    ...(currentProduct ? [currentProduct.id] : []),
    ...cartItems.map(c => c.product.id)
  ]);

  const candidatePool = allProducts.filter(p => p.active !== false && !excludeIds.has(p.id));
  const finalPool = candidatePool.length >= 3 ? candidatePool : allProducts.filter(p => p.active !== false);

  const inventarioPayload = finalPool.slice(0, 25).map(p => ({
    id_producto: p.id,
    sku: p.id,
    nombre: p.title,
    precio: p.price,
    categoria: p.categoryName || 'General',
    descripcion: p.shortDescription || p.description?.slice(0, 100) || '',
    tags: p.tags || []
  }));

  const requestBody = {
    modo: 'cliente',
    historial_navegacion: history,
    inventario: inventarioPayload
  };

  try {
    const response = await fetch('/api/ai/commercemind', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.intencion_detectada && Array.isArray(data.recomendaciones)) {
      return {
        intencion_detectada: data.intencion_detectada,
        recomendaciones: data.recomendaciones,
        provider: data.provider || 'CommerceMind AI'
      };
    }
  } catch (error) {
    console.warn('CommerceMind API request error, computing instant client recommendation fallback:', error);
  }

  // Graceful client fallback aligned with CommerceMind spec
  let fallbackIntention = 'Interés en productos destacados y novedades del catálogo.';
  if (cartItems.length > 0) {
    fallbackIntention = 'Comprador decidido en fase activa; evaluando complementos con pago contra entrega.';
  } else if (currentProduct?.categoryName) {
    fallbackIntention = `Interés en la categoría ${currentProduct.categoryName}; buscando la mejor opción de compra.`;
  }

  const tipos = ['Venta cruzada', 'Complemento', 'Alternativa similar', 'Tendencia'];
  const fallbackRecs: CommerceMindClientRecommendation[] = finalPool.slice(0, 3).map((item, idx) => ({
    id_producto: item.id,
    nombre: item.title,
    tipo_sugerencia: tipos[idx % tipos.length],
    mensaje_persuasivo: idx === 0 
      ? 'Ideal para combinar con tu selección actual y aprovechar el mismo envío gratis.'
      : idx === 1
      ? 'Excelente alternativa con alta valoración y pago contra entrega en toda Colombia.'
      : 'Top en ventas esta semana recomendado por compradores de tu región.'
  }));

  return {
    intencion_detectada: fallbackIntention,
    recomendaciones: fallbackRecs
  };
}
