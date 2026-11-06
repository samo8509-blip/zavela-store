import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, 
  Zap, 
  ShieldCheck, 
  Truck, 
  Check, 
  Plus, 
  Minus, 
  Sparkles, 
  Share2, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Building2, 
  Flame, 
  Star, 
  ThumbsUp, 
  Camera,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  Heart,
  MessageCircle
} from 'lucide-react';
import { Product, ProductVariant, CartItem } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';
import { extractProductImages } from '../utils/imageUtils.ts';
import { parseProductDescription } from '../utils/descriptionParser.ts';
import { getVerifiedPositiveReviews, ProductReview } from '../utils/reviewsManager.ts';
import { parseNumCOP } from '../services/cpanelProducts.ts';
import { 
  extractProductIdentifierFromUrl, 
  resolveProductMatch, 
  fetchProductDirectlyFromApi 
} from '../utils/productUrlResolver.ts';
import { SergioMartinezSignature } from '../components/SergioMartinezSignature.tsx';
import { ProductShareModal } from '../components/ProductShareModal.tsx';

/**
 * Hook universal useParams para compatibilidad total:
 * Permite usar el componente tanto con React Router (<Route path="/producto/:slug" element={<ProductDetailPage />} />)
 * como con enrutamiento nativo por History API / Pathname.
 */
export function useProductParams(): { slug?: string; id?: string } {
  if (typeof window === 'undefined') return {};
  const routeInfo = extractProductIdentifierFromUrl();
  return { slug: routeInfo.identifier || undefined, id: routeInfo.identifier || undefined };
}

export interface ProductDetailPageProps {
  product?: Product | null;
  slug?: string;
  allProducts?: Product[];
  cartItems?: CartItem[];
  onBack?: () => void;
  onSelectProduct?: (product: Product) => void;
  onAddToCart: (product: Product, variant?: ProductVariant, quantity?: number, unitPrice?: number) => void;
  onBuyNow: (product: Product, variant?: ProductVariant, quantity?: number, unitPrice?: number) => void;
  onAddComboToCart?: (
    product: Product,
    items: {
      variant?: ProductVariant;
      quantity: number;
      unitPrice: number;
      garmentLabel: string;
      comboInfo: string;
    }[],
    actionType: 'cart' | 'buy_now'
  ) => void;
  onOpenAuthorCertificate?: () => void;
  isSocialClosing?: boolean;
  onOpenLuckyWheel?: () => void;
  isLuckyWheelEnabled?: boolean;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product: initialProduct,
  slug: propSlug,
  allProducts = [],
  cartItems = [],
  onBack,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onOpenAuthorCertificate,
  isSocialClosing = false,
  onOpenLuckyWheel,
  isLuckyWheelEnabled = false
}) => {
  const params = useProductParams();
  const targetIdentifier = propSlug || params.slug || params.id || '';

  // Estado del producto resuelto
  const [activeProduct, setActiveProduct] = useState<Product | null>(initialProduct || null);
  const [isLoadingProduct, setIsLoadingProduct] = useState<boolean>(!initialProduct && Boolean(targetIdentifier));
  const [notFound, setNotFound] = useState<boolean>(false);

  // Sincronizar producto con props o resolver por URL
  useEffect(() => {
    if (initialProduct) {
      setActiveProduct(initialProduct);
      setNotFound(false);
      setIsLoadingProduct(false);
      return;
    }

    if (!targetIdentifier) {
      setIsLoadingProduct(false);
      return;
    }

    // 1. Buscar en el catálogo en memoria
    let matched = resolveProductMatch(targetIdentifier, allProducts);
    if (matched) {
      setActiveProduct(matched);
      setNotFound(false);
      setIsLoadingProduct(false);
      return;
    }

    // 2. Si no está en el catálogo inicial, consultar la API directamente
    let isCancelled = false;
    setIsLoadingProduct(true);
    fetchProductDirectlyFromApi(targetIdentifier).then((fetched) => {
      if (isCancelled) return;
      if (fetched) {
        setActiveProduct(fetched);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setIsLoadingProduct(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [initialProduct, targetIdentifier, allProducts]);

  // Manejo de títulos SEO y Meta
  useEffect(() => {
    if (activeProduct) {
      const title = activeProduct.title || activeProduct.name || 'Detalle del Producto';
      document.title = `${title} | Zavela Store Colombia`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeProduct]);

  // Galería de imágenes
  const imagesList = useMemo(() => {
    if (!activeProduct) return [];
    return extractProductImages(activeProduct);
  }, [activeProduct]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Selector de variantes (Color, Talla, Tamaño)
  const variants = useMemo(() => activeProduct?.variants || [], [activeProduct]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(() => {
    return variants[0];
  });

  // Cuando cambia el producto activo, reiniciar la variante seleccionada
  useEffect(() => {
    if (activeProduct?.variants && activeProduct.variants.length > 0) {
      setSelectedVariant(activeProduct.variants[0]);
    } else {
      setSelectedVariant(undefined);
    }
    setActiveImageIndex(0);
  }, [activeProduct]);

  // 💰 LÓGICA DE PRECIOS POR TALLA / VARIANTE DINÁMICA:
  // Si la variante seleccionada tiene un precio específico configurado (> 0), el precio principal cambia automáticamente.
  const activeUnitPrice = useMemo(() => {
    if (!activeProduct) return 0;
    if (selectedVariant && typeof selectedVariant.price === 'number' && selectedVariant.price > 0) {
      return selectedVariant.price;
    }
    return activeProduct.price || 0;
  }, [activeProduct, selectedVariant]);

  // Precio de referencia o comparación
  const activeCompareAtPrice = useMemo(() => {
    if (!activeProduct) return 0;
    const baseCompare = activeProduct.compareAtPrice || (activeProduct as any).compare_price || (activeProduct as any).suggested_price || 0;
    if (baseCompare > activeUnitPrice) return baseCompare;
    return Math.round(activeUnitPrice * 1.35);
  }, [activeProduct, activeUnitPrice]);

  const discountPercentage = useMemo(() => {
    if (!activeCompareAtPrice || activeCompareAtPrice <= activeUnitPrice) return 0;
    return Math.round(((activeCompareAtPrice - activeUnitPrice) / activeCompareAtPrice) * 100);
  }, [activeCompareAtPrice, activeUnitPrice]);

  // Cantidad
  const [quantity, setQuantity] = useState(1);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);
  const [comboAddedSuccess, setComboAddedSuccess] = useState(false);

  // Descripción parsed
  const parsedDesc = useMemo(() => {
    return parseProductDescription(activeProduct?.description || '');
  }, [activeProduct]);

  // Reseñas verificadas
  const reviews: ProductReview[] = useMemo(() => {
    if (!activeProduct) return [];
    return getVerifiedPositiveReviews(activeProduct.title || activeProduct.id);
  }, [activeProduct]);

  // 🛒 LÓGICA DINÁMICA DE COMBOS SUGERIDOS (LECTURA DESDE LOCALSTORAGE 'zavela_suggested_combos_v1')
  const suggestedComboProducts = useMemo<Product[]>(() => {
    if (!allProducts || allProducts.length <= 1 || !activeProduct) return [];
    const currentId = String(activeProduct.id || (activeProduct as any).productId || '');
    const currentSlug = String(activeProduct.slug || '');

    let comboIds: string[] = [];

    // 1. Leer del localStorage la clave 'zavela_suggested_combos_v1'
    try {
      const rawMap = localStorage.getItem('zavela_suggested_combos_v1');
      if (rawMap) {
        const map = JSON.parse(rawMap);
        const saved = map[currentId] || (currentSlug ? map[currentSlug] : null);
        if (Array.isArray(saved) && saved.length > 0) {
          comboIds = saved.map(String);
        }
      }
    } catch (e) {
      console.warn('Error leyendo zavela_suggested_combos_v1:', e);
    }

    // 2. Si no se encuentra en localStorage, verificar en la propiedad suggestedComboIds del producto
    if (comboIds.length === 0 && Array.isArray(activeProduct.suggestedComboIds) && activeProduct.suggestedComboIds.length > 0) {
      comboIds = activeProduct.suggestedComboIds.map(String);
    }

    // Si encontramos IDs vinculados, mapear todos los productos correspondientes del catálogo general
    if (comboIds.length > 0) {
      const linkedList = comboIds
        .map(id => allProducts.find(p => String(p.id || (p as any).productId || '') === id && id !== currentId && p.active !== false))
        .filter((p): p is Product => Boolean(p));

      if (linkedList.length > 0) {
        return linkedList;
      }
    }

    // 3. Fallback inteligente (mismo proveedor/categoría)
    const candidates = allProducts.filter(p => {
      const pid = String(p.id || (p as any).productId || '');
      if (pid === currentId || p.active === false) return false;
      const cat = String(p.categoryName || (p as any).category || (p as any).categoria || '').toLowerCase();
      const currentCat = String(activeProduct.categoryName || (activeProduct as any).category || (activeProduct as any).categoria || '').toLowerCase();
      const isAdultCurrent = currentCat.includes('sex') || currentCat.includes('adult');
      const isAdultCandidate = cat.includes('sex') || cat.includes('adult');
      if (!isAdultCurrent && isAdultCandidate) return false;
      return true;
    });

    if (candidates.length === 0) return [];
    const currentCat = String(activeProduct.categoryName || (activeProduct as any).category || '').toLowerCase();
    const sameCat = candidates.filter(p => {
      const cat = String(p.categoryName || (p as any).category || '').toLowerCase();
      return currentCat && cat && cat === currentCat;
    });

    const pool = sameCat.length > 0 ? sameCat : candidates;
    const seed = currentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const fallbackItem = pool[seed % pool.length];
    return fallbackItem ? [fallbackItem] : [];
  }, [allProducts, activeProduct]);

  // Cálculos dinámicos del combo
  const linkedProductsTotalPrice = useMemo(() => {
    return suggestedComboProducts.reduce((sum, p) => sum + (p.price || (p as any).salePrice || 0), 0);
  }, [suggestedComboProducts]);

  const comboOriginalTotal = activeUnitPrice + linkedProductsTotalPrice;

  // Ahorro dinámico por combo sumando el flete exacto de cada producto extra con parseNumCOP
  const comboConsolidatedSavings = useMemo(() => {
    return suggestedComboProducts.reduce((sum, p) => {
      const flete = parseNumCOP(
        p.shippingCost ??
        (p as any).shipping_cost ??
        (p as any).flete ??
        (p as any).fleteEnvio ??
        (p as any).flete_envio ??
        p.estimatedShippingCost
      );
      const fleteVal = flete > 0 ? flete : 15000;
      return sum + fleteVal;
    }, 0);
  }, [suggestedComboProducts]);

  const comboDiscountedTotal = Math.max(0, comboOriginalTotal - comboConsolidatedSavings);

  // Enlace dinámico de WhatsApp para consultas del producto actual
  const product = activeProduct;
  const whatsappUrl = product
    ? `https://wa.me/573008784427?text=${encodeURIComponent('Hola, estoy interesado en el producto ' + product.title + ' que vi en Zavela Store y quisiera más información.')}`
    : 'https://wa.me/573008784427';

  // Manejadores de compra
  const handleAddToCartClick = () => {
    if (!activeProduct) return;
    onAddToCart(activeProduct, selectedVariant, quantity, activeUnitPrice);
    setIsAddedSuccess(true);
    setTimeout(() => setIsAddedSuccess(false), 2500);
  };

  const handleBuyNowClick = () => {
    if (!activeProduct) return;
    onBuyNow(activeProduct, selectedVariant, quantity, activeUnitPrice);
  };

  const handleAddCrossSellCombo = () => {
    if (!activeProduct || suggestedComboProducts.length === 0) return;
    // 1. Agregar producto actual con su precio de variante activa
    onAddToCart(activeProduct, selectedVariant, 1, activeUnitPrice);

    // 2. Agregar cada producto vinculado del combo
    suggestedComboProducts.forEach(linkedProd => {
      const price = linkedProd.price || (linkedProd as any).salePrice || 0;
      onAddToCart(linkedProd, undefined, 1, price);
    });

    setComboAddedSuccess(true);
    setTimeout(() => {
      setComboAddedSuccess(false);
    }, 2500);
  };

  // Navegación de regreso
  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Estado de carga
  if (isLoadingProduct) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-900">Cargando producto oficial...</h2>
        <p className="text-xs text-slate-500 mt-1">Conectando con la bodega nacional y verificando inventario en tiempo real.</p>
      </div>
    );
  }

  // Estado si no se encuentra
  if (notFound || !activeProduct) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-800">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 shadow-sm">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Producto no disponible</h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
          No pudimos localizar el producto solicitado. Es posible que el enlace haya cambiado o que se encuentre temporalmente agotado.
        </p>
        <button
          onClick={handleGoBack}
          className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo de Zavela</span>
        </button>
      </div>
    );
  }

  return (
    <div id="product-detail-page-container" className="w-full bg-slate-50 min-h-screen text-slate-800 py-6 sm:py-8 lg:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Barra superior de navegación y migas de pan */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-1 font-bold text-slate-700 hover:text-sky-600 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Catálogo</span>
            </button>
            <span>/</span>
            <span className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] truncate max-w-[120px] sm:max-w-none">
              {activeProduct.categoryName || (activeProduct as any).category || 'General'}
            </span>
            <span>/</span>
            <span className="font-black text-sky-700 uppercase tracking-wider text-[11px] truncate max-w-[150px] sm:max-w-xs md:max-w-md">
              {activeProduct.title}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Compartir producto"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Compartir</span>
          </button>
        </div>

        {/* 🌟 GRID DE 2 COLUMNAS EN ESCRITORIO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ================= COLUMNA IZQUIERDA: GALERÍA DE IMÁGENES (MITAD IZQUIERDA) ================= */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Imagen Principal Grande con Badges */}
            <div className="relative aspect-square sm:aspect-4/3 rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-md group">
              <img
                src={imagesList[activeImageIndex] || (activeProduct as any).image || '/placeholder.png'}
                alt={activeProduct.title}
                className="w-full h-full object-contain p-2 sm:p-4 transition-transform duration-300 group-hover:scale-105"
              />

              {/* Badges Flotantes de Confianza */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Envío Gratis Colombia</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-xs text-amber-300 font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 border border-amber-400/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pago Contra Entrega</span>
                </span>
                {discountPercentage > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1 w-fit">
                    <Flame className="w-3 h-3 text-yellow-300" />
                    <span>{discountPercentage}% OFF</span>
                  </span>
                )}
              </div>

              {/* Flechas de Navegación del Carrusel */}
              {imagesList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex(prev => (prev === 0 ? imagesList.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer border border-slate-200"
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex(prev => (prev === imagesList.length - 1 ? 0 : prev + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer border border-slate-200"
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Tira de Miniaturas */}
            {imagesList.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 bg-white shrink-0 transition-all cursor-pointer ${
                      activeImageIndex === idx 
                        ? 'border-sky-600 ring-2 ring-sky-300 shadow-md scale-95' 
                        : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover p-1" />
                  </button>
                ))}
              </div>
            )}

            {/* Garantías y Beneficios en Colombia */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Garantía 30 Días</h4>
                  <p className="text-[10px] text-slate-500">Inspección física al recibir</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Envío Gratis</h4>
                  <p className="text-[10px] text-slate-500">A los 32 departamentos</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Bodega Oficial</h4>
                  <p className="text-[10px] text-slate-500">Cartagena, Bolívar</p>
                </div>
              </div>
            </div>

          </div>

          {/* ================= COLUMNA DERECHA: INFORMACIÓN, SELECTOR DE PRECIOS Y ACCIONES (STICKY) ================= */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-lg space-y-5">
              
              {/* Marca & Calificaciones */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {activeProduct.brand || 'Zavela Store Oficial'}
                </span>
                
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="font-bold text-slate-800 text-xs">4.9</span>
                  <span className="text-slate-400 text-[11px]">({reviews.length || 28} reseñas)</span>
                </div>
              </div>

              {/* Título Principal */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 leading-tight">
                {activeProduct.title}
              </h1>

              {/* Resumen corto o subtítulo */}
              {activeProduct.shortDescription && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeProduct.shortDescription}
                </p>
              )}

              {/* 💵 BLOQUE DE PRECIO DINÁMICO GRANDE */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200 space-y-1.5">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-mono font-black text-slate-950">
                    {formatCOP(activeUnitPrice)}
                  </span>

                  {activeCompareAtPrice > activeUnitPrice && (
                    <span className="text-base sm:text-lg font-mono text-slate-400 line-through">
                      {formatCOP(activeCompareAtPrice)}
                    </span>
                  )}

                  {discountPercentage > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white font-black text-[11px] uppercase tracking-wider shadow-2xs">
                      Ahorras {discountPercentage}%
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Envío Gratis a Nivel Nacional + Pago Contra Entrega en Efectivo</span>
                </div>
              </div>

              {/* 🏷️ SELECTOR DE VARIANTES (COLOR, TALLA, PRECIO ESPECÍFICO) */}
              {variants.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Selecciona tu Variante / Talla:
                    </label>
                    {selectedVariant && (
                      <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                        {selectedVariant.name || selectedVariant.color || selectedVariant.size}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      const hasCustomPrice = typeof v.price === 'number' && v.price > 0 && v.price !== activeProduct.price;

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-400 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {v.name || v.color || v.size || 'Opción'}
                          </div>
                          
                          <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                            <span className={isSelected ? 'text-sky-800 font-black' : 'text-slate-600 font-bold'}>
                              {formatCOP(v.price || activeProduct.price)}
                            </span>
                            {v.stock !== undefined && (
                              <span className="text-[9px] text-slate-400 font-sans">
                                {v.stock > 0 ? `${v.stock} disp.` : 'Agotado'}
                              </span>
                            )}
                          </div>

                          {hasCustomPrice && (
                            <span className="absolute -top-1.5 -right-1 text-[8px] font-black uppercase bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                              Precio Talla
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selector de Cantidad */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cantidad a pedir:
                </span>
                <div className="flex items-center border border-slate-300 rounded-2xl bg-slate-50 p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer shadow-2xs"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono font-black text-sm text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* BOTONES DE COMPRA Y ACCIÓN */}
              <div className="space-y-3 pt-2">
                {/* Botón Principal: Pagar Contra Entrega */}
                <button
                  type="button"
                  id="btn-page-buy-now-cod"
                  onClick={handleBuyNowClick}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-200" />
                  <span>PAGAR CONTRA ENTREGA (Pagas en Casa)</span>
                </button>

                {/* Botón Secundario: Agregar al Carrito */}
                <button
                  type="button"
                  id="btn-page-add-to-cart"
                  onClick={handleAddToCartClick}
                  className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all uppercase tracking-wider cursor-pointer border-2 ${
                    isAddedSuccess
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-inner'
                      : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-900 active:scale-98 shadow-sm'
                  }`}
                >
                  {isAddedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>¡Producto Agregado con Éxito!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 text-slate-800" />
                      <span>Agregar al Carrito de Compras</span>
                    </>
                  )}
                </button>

                {/* 💬 Botón Directo: Asesor WhatsApp / Preguntar por WhatsApp */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="btn-product-whatsapp-advisor"
                  className="w-full py-3 px-6 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-500/40 hover:border-emerald-500 active:scale-98 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                  <span>Preguntar por WhatsApp / Asesor</span>
                </a>
              </div>

              {/* Promesa de Entrega */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>Despacho en 24-48 horas hábiles</span>
                </span>
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Stock 100% Verificado</span>
                </span>
              </div>

            </div>

          </div>

        </div>

        {/* ================= SECCIÓN INFERIOR: ANCHO COMPLETO (100% WIDTH) ================= */}
        <div className="w-full mt-12 sm:mt-16 space-y-12 border-t border-slate-200 pt-10">
          
          {/* 🛒 1. BLOQUE UI: COMPRADOS JUNTOS HABITUALMENTE / LLEVA EL COMBO */}
          {suggestedComboProducts.length > 0 && (
            <div 
              id="full-page-cross-selling-box"
              className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 border-2 border-emerald-300 shadow-md space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-wide">
                      Comprados Juntos Habitualmente
                    </h3>
                    <p className="text-xs text-slate-500">
                      Aprovecha el despacho unificado y ahorra el costo de envío de los productos adicionales.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black uppercase tracking-wider bg-emerald-600 text-white px-3 py-1 rounded-full shadow-xs self-start sm:self-auto">
                  {suggestedComboProducts.length > 1 ? `Combo de ${suggestedComboProducts.length + 1} Productos` : 'Lleva el Combo'}
                </span>
              </div>

              {/* Tarjetas del Combo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                
                {/* Producto Principal */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <img
                    src={imagesList[0] || (activeProduct as any).image || '/placeholder.png'}
                    alt={activeProduct.title}
                    className="w-16 h-16 object-cover rounded-xl border border-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Este producto ({selectedVariant?.name || 'Base'})
                    </span>
                    <div className="text-xs font-bold text-slate-800 truncate" title={activeProduct.title}>
                      {activeProduct.title}
                    </div>
                    <div className="text-sm font-mono font-black text-slate-950 mt-0.5">
                      {formatCOP(activeUnitPrice)}
                    </div>
                  </div>
                </div>

                {/* Productos Vinculados */}
                {suggestedComboProducts.map((linkedItem, idx) => {
                  const linkedImgs = extractProductImages(linkedItem);
                  const linkedImg = linkedImgs[0] || (linkedItem as any).image || '/placeholder.png';
                  const linkedPrice = linkedItem.price || (linkedItem as any).salePrice || 0;

                  return (
                    <div key={linkedItem.id || idx} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs relative">
                      <div className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        +
                      </div>
                      <img
                        src={linkedImg}
                        alt={linkedItem.title}
                        className="w-16 h-16 object-cover rounded-xl border border-slate-100 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                          Producto del Combo
                        </span>
                        <div className="text-xs font-bold text-slate-800 truncate" title={linkedItem.title}>
                          {linkedItem.title}
                        </div>
                        <div className="text-sm font-mono font-black text-slate-950 mt-0.5">
                          {formatCOP(linkedPrice)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Resumen & Botón de Combo */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col justify-between space-y-3 md:col-span-2 lg:col-span-1 shadow-md">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total por los {suggestedComboProducts.length + 1} productos:
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 line-through font-mono">
                        {formatCOP(comboOriginalTotal)}
                      </span>
                      <span className="text-xl font-mono font-black text-emerald-400">
                        {formatCOP(comboDiscountedTotal)}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-300 font-bold mt-1">
                      ¡Ahorro de {formatCOP(comboConsolidatedSavings)} por envío consolidado!
                    </p>
                  </div>

                  <button
                    type="button"
                    id="btn-add-combo-full-page"
                    onClick={handleAddCrossSellCombo}
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      comboAddedSuccess
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    }`}
                  >
                    {comboAddedSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>¡Combo Agregado!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Agregar Combo al Carrito</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* 📄 2. DESCRIPCIÓN COMPLETA DEL PRODUCTO */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide">
                Descripción Completa y Características
              </h2>
            </div>

            <div className="prose max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-line space-y-4">
              {parsedDesc.fullCleanDescription || activeProduct.description || 'Sin descripción detallada.'}
            </div>

            {/* Bullets o puntos clave de garantía */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-900 block mb-1">📦 ¿Cómo recibo mi pedido?</span>
                <p className="text-slate-600">Enviamos con Servientrega, Coordinadora o Interrapidísimo. Pagas únicamente al recibir en tu domicilio.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-900 block mb-1">🛡️ ¿Qué garantía tengo?</span>
                <p className="text-slate-600">Garantía oficial por defectos de fábrica. Reemplazo inmediato sin trámites engorrosos.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-900 block mb-1">💬 Soporte y Asesoría</span>
                <p className="text-slate-600">Atención personalizada vía WhatsApp para ayudarte con cualquier duda antes o después de la entrega.</p>
              </div>
            </div>
          </div>

          {/* ⭐ 3. RESEÑAS VERIFICADAS DE CLIENTES */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                  Experiencias de Clientes en Colombia
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                100% Compras Verificadas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.slice(0, 6).map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{rev.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{rev.customerCity || 'Colombia'}</span>
                  </div>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{rev.comment}"
                  </p>
                  <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 pt-1 border-t border-slate-200/60">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Compra verificada con pago contra entrega</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 🏷️ 4. PRODUCTOS RECOMENDADOS DE LA MISMA CATEGORÍA */}
          {allProducts.length > 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                  También te podría interesar
                </h3>
                <span className="text-xs text-slate-500 font-bold">Misma Bodega y Envío Unificado</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {allProducts
                  .filter(p => p.id !== activeProduct.id && p.active !== false)
                  .slice(0, 6)
                  .map((relProduct) => {
                    const relImgs = extractProductImages(relProduct);
                    const relImg = relImgs[0] || (relProduct as any).image || '/placeholder.png';
                    const relPrice = relProduct.price || 0;

                    return (
                      <div
                        key={relProduct.id}
                        onClick={() => {
                          if (onSelectProduct) {
                            onSelectProduct(relProduct);
                          } else {
                            window.history.pushState(null, '', `/producto/${encodeURIComponent(relProduct.slug || relProduct.id)}`);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }
                        }}
                        className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                      >
                        <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2">
                          <img
                            src={relImg}
                            alt={relProduct.title}
                            className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors">
                            {relProduct.title}
                          </h4>
                          <span className="text-xs font-mono font-black text-slate-950 mt-1 block">
                            {formatCOP(relPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 🏛️ 5. SELLO OFICIAL DE AUTORÍA Y CERTIFICADO DE ARQUITECTURA */}
          <div className="pt-4">
            <SergioMartinezSignature
              variant="banner"
              onClickCertificate={onOpenAuthorCertificate}
            />
          </div>

        </div>

      </div>

      {/* Modal para compartir producto */}
      {isShareOpen && (
        <ProductShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          product={activeProduct}
        />
      )}

      {/* 💬 Botón Flotante de Asesor WhatsApp */}
      {product && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="btn-floating-whatsapp-product"
          aria-label="Preguntar por WhatsApp al Asesor"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm rounded-full shadow-2xl shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 fill-white text-emerald-800" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-ping" />
          </div>
          <span className="hidden sm:inline">Preguntar por WhatsApp</span>
          <span className="sm:hidden">Asesor WhatsApp</span>
        </a>
      )}
    </div>
  );
};
