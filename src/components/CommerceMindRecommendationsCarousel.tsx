import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Brain, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag, 
  Eye, 
  CheckCircle2, 
  Truck, 
  RefreshCw,
  Zap,
  TrendingUp,
  Layers,
  HeartHandshake
} from 'lucide-react';
import { Product, CartItem } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';
import { 
  requestClientRecommendations, 
  CommerceMindClientRecommendation,
  registerProductObservation 
} from '../services/commerceMindClient.ts';

interface CommerceMindRecommendationsCarouselProps {
  currentProduct?: Product | null;
  allProducts: Product[];
  cartItems?: CartItem[];
  onSelectProduct: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  title?: string;
  variant?: 'modal' | 'section';
}

export const CommerceMindRecommendationsCarousel: React.FC<CommerceMindRecommendationsCarouselProps> = ({
  currentProduct,
  allProducts,
  cartItems = [],
  onSelectProduct,
  onAddToCart,
  title = "RECOMENDACIONES PERSONALIZADAS POR COMMERCEMIND AI",
  variant = 'modal'
}) => {
  const [intention, setIntention] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<CommerceMindClientRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Fetch recommendations whenever current product or cart count changes
  useEffect(() => {
    let isMounted = true;

    async function loadAIRecommendations() {
      setIsLoading(true);

      // Track the current product view
      if (currentProduct) {
        registerProductObservation(currentProduct);
      }

      try {
        const response = await requestClientRecommendations({
          currentProduct,
          cartItems,
          allProducts
        });

        if (isMounted && response) {
          setIntention(response.intencion_detectada);
          setRecommendations(response.recomendaciones);
        }
      } catch (err) {
        console.warn('Failed to fetch CommerceMind recommendations:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAIRecommendations();

    return () => {
      isMounted = false;
    };
  }, [currentProduct?.id, cartItems.length, allProducts.length]);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await requestClientRecommendations({
        currentProduct,
        cartItems,
        allProducts
      });
      if (response) {
        setIntention(response.intencion_detectada);
        setRecommendations(response.recomendaciones);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const getTipoBadgeStyle = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes('cruzada')) {
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
        icon: <Zap className="w-3 h-3 text-amber-500" />
      };
    }
    if (t.includes('complemento')) {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
        icon: <Layers className="w-3 h-3 text-emerald-500" />
      };
    }
    if (t.includes('alternativa')) {
      return {
        bg: 'bg-sky-500/10 border-sky-500/30 text-sky-600',
        icon: <HeartHandshake className="w-3 h-3 text-sky-500" />
      };
    }
    return {
      bg: 'bg-purple-500/10 border-purple-500/30 text-purple-600',
      icon: <TrendingUp className="w-3 h-3 text-purple-500" />
    };
  };

  // Resolve matching product from allProducts catalog
  const resolveProduct = (rec: CommerceMindClientRecommendation, idx: number): Product | undefined => {
    const byId = allProducts.find(p => p.id === rec.id_producto || p.dropi_product_id === Number(rec.id_producto));
    if (byId) return byId;

    const byName = allProducts.find(p => p.title.toLowerCase() === rec.nombre.toLowerCase());
    if (byName) return byName;

    // Fallback: pick another product from active inventory excluding current
    const pool = allProducts.filter(p => p.id !== currentProduct?.id && p.active !== false);
    return pool[idx % Math.max(1, pool.length)];
  };

  if (allProducts.length === 0) return null;

  return (
    <div 
      className={`rounded-3xl border transition-all duration-300 ${
        variant === 'modal'
          ? 'bg-slate-50/90 border-slate-200/90 p-5 sm:p-7 shadow-xs'
          : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 p-6 sm:p-8 shadow-sm my-6'
      }`}
    >
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          {/* Badge & Mode Indicator */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-black tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>CommerceMind AI</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Modo Cliente Activo</span>
            </span>
            {cartItems.length > 0 && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {cartItems.length} {cartItems.length === 1 ? 'ítem en carrito' : 'ítems en carrito'}
              </span>
            )}
          </div>

          <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight uppercase">
            {title}
          </h3>
        </div>

        {/* Intention & Refresh Trigger */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-indigo-600 font-medium shadow-2xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span className="text-[11px]">Analizando catálogo con IA...</span>
            </div>
          ) : intention ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 shadow-2xs max-w-md">
              <Brain className="w-4 h-4 text-indigo-600 shrink-0" />
              <p className="text-[11px] leading-tight line-clamp-2">
                <span className="font-bold text-indigo-950">Intención detectada:</span> {intention}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Actualizar recomendaciones de IA"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Carousel Track & Controls */}
      <div className="relative group/carousel">
        {/* Navigation Arrow Left */}
        <button
          type="button"
          onClick={scrollLeft}
          className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-indigo-50 text-indigo-600 shadow-md border border-slate-200 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Ver anteriores"
          aria-label="Anteriores recomendaciones"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={sliderRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 px-1 scroll-smooth scrollbar-thin"
        >
          {isLoading && recommendations.length === 0 ? (
            // Skeleton Loader
            [1, 2, 3].map((n) => (
              <div
                key={n}
                className="w-64 sm:w-72 shrink-0 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse"
              >
                <div className="aspect-square bg-slate-100 rounded-xl w-full" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-12 bg-slate-100 rounded-lg" />
              </div>
            ))
          ) : (
            recommendations.map((rec, idx) => {
              const product = resolveProduct(rec, idx);
              if (!product) return null;

              const badgeStyle = getTipoBadgeStyle(rec.tipo_sugerencia || 'Tendencia');
              const mainImg = product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';

              return (
                <div
                  key={`${product.id}-${idx}`}
                  className="w-64 sm:w-72 shrink-0 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group/card"
                >
                  {/* Top Image Container */}
                  <div 
                    onClick={() => onSelectProduct(product)}
                    className="relative aspect-square w-full bg-slate-50 overflow-hidden flex items-center justify-center p-3 cursor-pointer"
                  >
                    <img
                      src={mainImg}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-contain group-hover/card:scale-105 transition-transform duration-300"
                    />

                    {/* AI Suggestion Type Badge */}
                    <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs backdrop-blur-xs ${badgeStyle.bg}`}>
                      {badgeStyle.icon}
                      <span>{rec.tipo_sugerencia}</span>
                    </div>

                    {/* Delivery Guarantee Tag */}
                    <div className="absolute bottom-2.5 right-2.5 bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                      <Truck className="w-3 h-3 text-emerald-400" />
                      <span>Contra Entrega</span>
                    </div>
                  </div>

                  {/* Card Content & Persuasive Reason */}
                  <div className="p-4 flex flex-col justify-between flex-1 border-t border-slate-100 space-y-3 bg-white">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        {product.categoryName || 'Catálogo'}
                      </div>
                      <h4 
                        onClick={() => onSelectProduct(product)}
                        className="text-xs sm:text-sm font-bold text-slate-900 uppercase line-clamp-2 leading-tight group-hover/card:text-indigo-600 transition-colors cursor-pointer mt-0.5"
                        title={product.title}
                      >
                        {product.title}
                      </h4>
                    </div>

                    {/* Price Block */}
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-sm sm:text-base font-mono font-black text-indigo-700">
                        {formatCOP(product.price)}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-xs text-slate-400 line-through font-mono">
                          {formatCOP(product.compareAtPrice)}
                        </span>
                      )}
                    </div>

                    {/* Persuasive Message Bubble from CommerceMind AI */}
                    <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100/90 text-slate-700 text-xs leading-relaxed italic flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-3">"{rec.mensaje_persuasivo}"</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Ver detalles completos del producto"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Ver</span>
                      </button>

                      {onAddToCart && (
                        <button
                          type="button"
                          onClick={() => onAddToCart(product)}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md hover:shadow-indigo-500/25 active:scale-95"
                          title="Añadir este producto al carrito"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Añadir</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Navigation Arrow Right */}
        <button
          type="button"
          onClick={scrollRight}
          className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-indigo-50 text-indigo-600 shadow-md border border-slate-200 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Ver siguientes"
          aria-label="Siguientes recomendaciones"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
