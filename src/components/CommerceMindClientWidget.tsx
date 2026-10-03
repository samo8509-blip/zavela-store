import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Brain, 
  ShoppingBag, 
  Eye, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Zap,
  Layers,
  HeartHandshake,
  TrendingUp,
  Truck
} from 'lucide-react';
import { Product, CartItem } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';
import { 
  requestClientRecommendations, 
  CommerceMindClientRecommendation,
  registerProductObservation 
} from '../services/commerceMindClient.ts';

interface CommerceMindClientWidgetProps {
  products: Product[];
  currentProduct?: Product | null;
  cartItems?: CartItem[];
  onSelectProduct: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export const CommerceMindClientWidget: React.FC<CommerceMindClientWidgetProps> = ({
  products,
  currentProduct,
  cartItems = [],
  onSelectProduct,
  onAddToCart
}) => {
  const [intention, setIntention] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<CommerceMindClientRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;

    if (currentProduct) {
      registerProductObservation(currentProduct);
    }

    async function loadRecommendations() {
      setIsLoading(true);
      try {
        const result = await requestClientRecommendations({
          currentProduct,
          cartItems,
          allProducts: products
        });

        if (!isCancelled && result) {
          setIntention(result.intencion_detectada);
          setRecommendations(result.recomendaciones);
        }
      } catch (err) {
        console.warn('Error loading CommerceMind recommendations:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      isCancelled = true;
    };
  }, [currentProduct?.id, cartItems.length, products.length]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const result = await requestClientRecommendations({
        currentProduct,
        cartItems,
        allProducts: products
      });
      if (result) {
        setIntention(result.intencion_detectada);
        setRecommendations(result.recomendaciones);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  if (recommendations.length === 0 && !isLoading) {
    return null;
  }

  const getTipoBadge = (tipo: string) => {
    const t = (tipo || '').toLowerCase();
    if (t.includes('cruzada')) {
      return {
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: <Zap className="w-3 h-3 text-amber-400" />
      };
    }
    if (t.includes('complemento')) {
      return {
        bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: <Layers className="w-3 h-3 text-emerald-400" />
      };
    }
    if (t.includes('alternativa')) {
      return {
        bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        icon: <HeartHandshake className="w-3 h-3 text-sky-400" />
      };
    }
    return {
      bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: <TrendingUp className="w-3 h-3 text-purple-400" />
    };
  };

  return (
    <div className="my-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black tracking-widest uppercase text-indigo-300">
                CommerceMind AI
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase tracking-wide">
                Motor de Personalización en Vivo
              </span>
              {cartItems.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  {cartItems.length} en carrito
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Recomendaciones Inteligentes Para Tu Sesión
            </h2>
          </div>
        </div>

        {/* Intention Card & Refresh */}
        <div className="flex items-center gap-2">
          {intention && (
            <div className="text-xs text-indigo-200/90 bg-slate-950/70 border border-indigo-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2.5 max-w-md shadow-inner">
              <Brain className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="leading-tight">
                <span className="font-bold text-indigo-300">Intención de compra: </span>
                <span className="text-slate-300 text-[11px]">{intention}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/30 text-indigo-300 hover:text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
            title="Actualizar recomendaciones"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Carousel Track with Arrow Navigation */}
      <div className="relative group/carousel z-10">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={scrollLeft}
          className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white shadow-xl border border-indigo-500/40 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="Ver anteriores"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Horizontal Carousel Track */}
        <div
          ref={carouselRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 pt-1 px-1 scroll-smooth scrollbar-thin"
        >
          {recommendations.map((rec, idx) => {
            const matchedProduct = products.find(p => p.id === rec.id_producto || p.title === rec.nombre) || products[idx % products.length];
            if (!matchedProduct) return null;

            const img = matchedProduct.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
            const badge = getTipoBadge(rec.tipo_sugerencia);

            return (
              <div
                key={`${matchedProduct.id}-${idx}`}
                className="w-72 sm:w-80 shrink-0 bg-slate-950/90 border border-indigo-500/30 hover:border-indigo-400 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xl hover:shadow-indigo-500/10 transition-all group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider flex items-center gap-1 ${badge.bg}`}>
                      {badge.icon}
                      <span>{rec.tipo_sugerencia}</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <Truck className="w-3 h-3 text-emerald-400" /> Contra Entrega
                    </span>
                  </div>

                  {/* Product Visual & Title */}
                  <div className="flex gap-3 items-center">
                    <div 
                      onClick={() => onSelectProduct(matchedProduct)}
                      className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 cursor-pointer p-1 flex items-center justify-center group-hover:border-indigo-500/50 transition-colors"
                    >
                      <img
                        src={img}
                        alt={rec.nombre}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono text-indigo-300/70 uppercase">
                        {matchedProduct.categoryName || 'Catálogo Zavela'}
                      </div>
                      <h3
                        onClick={() => onSelectProduct(matchedProduct)}
                        className="text-sm font-bold text-white leading-snug line-clamp-2 cursor-pointer hover:text-indigo-300 transition-colors mt-0.5"
                        title={rec.nombre}
                      >
                        {rec.nombre}
                      </h3>
                      <div className="text-sm font-black text-emerald-400 mt-1 font-mono">
                        {formatCOP(matchedProduct.price)}
                      </div>
                    </div>
                  </div>

                  {/* Persuasive Message */}
                  <div className="mt-3.5 p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed italic flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-3">"{rec.mensaje_persuasivo}"</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectProduct(matchedProduct)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ver Producto</span>
                  </button>

                  {onAddToCart && (
                    <button
                      type="button"
                      onClick={() => onAddToCart(matchedProduct)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Añadir</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={scrollRight}
          className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white shadow-xl border border-indigo-500/40 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="Ver siguientes"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
