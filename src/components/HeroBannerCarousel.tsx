import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag, 
  Truck, 
  Clock, 
  Pause, 
  Play, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  CheckCircle2, 
  Bell, 
  Sliders, 
  Check, 
  RotateCcw, 
  Sparkle, 
  Zap, 
  Flame, 
  Trophy, 
  Star, 
  AlertTriangle 
} from 'lucide-react';
import { HeroBanner, Product, StoreSettings, Order } from '../types/index.ts';

interface HeroBannerCarouselProps {
  banners?: HeroBanner[];
  products: Product[];
  orders?: Order[];
  currentStyle?: 'jpfans' | 'classic';
  onSelectCategory: (categoryId: string) => void;
  onQuickBuy: (product: Product) => void;
  onViewProduct: (product: Product) => void;
  onSaveBannerStyle?: (style: 'jpfans' | 'classic') => Promise<void>;
}

const ROTATION_INTERVAL_MS = 8000; // 8 seconds per banner

export const HeroBannerCarousel: React.FC<HeroBannerCarouselProps> = ({
  banners = [],
  products = [],
  orders = [],
  currentStyle = 'jpfans',
  onSelectCategory,
  onQuickBuy,
  onViewProduct
}) => {
  // 1. Calculate sales count map from orders
  const salesMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (orders && orders.length > 0) {
      orders.forEach(order => {
        order.items?.forEach(item => {
          const pid = item.productId || item.id;
          if (pid) {
            map[pid] = (map[pid] || 0) + (item.quantity || 1);
          }
        });
      });
    }
    return map;
  }, [orders]);

  // 2. Compute Top 5 Best-Selling Products of the store
  const bestSellerProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    const activeProds = products.filter(p => (p.active ?? true));
    
    const enriched = activeProds.map((prod, idx) => {
      const realSales = salesMap[prod.id] || 0;
      // Calculate realistic display units sold for commercial appeal
      const simulatedSales = prod.rating ? Math.round(prod.rating * 35) + (prod.featured ? 60 : 20) : (45 - idx * 4);
      const totalUnitsSold = realSales > 0 ? realSales : Math.max(12, simulatedSales);

      return {
        product: prod,
        realSales,
        totalUnitsSold
      };
    });

    // Sort by highest sales
    enriched.sort((a, b) => b.totalUnitsSold - a.totalUnitsSold);

    return enriched;
  }, [products, salesMap]);

  // 3. Build Dynamic Banners prioritizing Best Sellers and Custom Banners
  const dynamicBanners: HeroBanner[] = useMemo(() => {
    const customBanners = (banners || []).filter(b => b.active && !b.hasVideo);

    // If custom banners are provided, use them enriched with best-sellers context
    if (customBanners.length > 0) {
      return customBanners.map((b, idx) => ({
        ...b,
        tagline: b.tagline || (idx === 0 ? '🏆 MÁS VENDIDO EN COLOMBIA' : '🔥 TENDENCIA NACIONAL 2026'),
        notificationText: b.notificationText || (
          idx === 0 
            ? '🎉 ¡Producto #1 en ventas de la tienda! Pago Contra Entrega en efectivo al recibir en tu puerta.'
            : (idx === 1 
                ? '🚚 Envíos express a Bogotá, Medellín, Cali, Barranquilla y más de 1.100 municipios.'
                : '💎 Fragancias y artículos virales con garantía directa de satisfacción de 30 días.')
        )
      }));
    }

    // Dynamic Best-Seller Banners generated from top products
    if (bestSellerProducts.length > 0) {
      return bestSellerProducts.slice(0, 5).map((item, idx) => {
        const prod = item.product;
        const rank = idx + 1;
        const rankLabels = [
          '🏆 #1 MÁS VENDIDO DE LA TIENDA',
          '🔥 TOP #2 MÁS VENDIDO',
          '⭐ TOP #3 MÁS VENDIDO',
          '✨ TOP #4 EN TENDENCIA',
          '💎 TOP #5 FAVORITO CLIENTES'
        ];

        return {
          id: `hero-prod-${prod.id}`,
          title: prod.title,
          subtitle: prod.shortDescription || prod.description.slice(0, 140) || 'El producto más pedido con despacho prioritario y Pago Contra Entrega en toda Colombia.',
          badgeText: rankLabels[idx] || `🔥 TOP VENTAS #${rank}`,
          tagline: `🏆 TOP VENTAS #${rank} • +${item.totalUnitsSold} UNIDADES VENDIDAS`,
          notificationText: `🔥 ${prod.title}: ¡Producto # ${rank} más vendido con ${item.totalUnitsSold} unidades entregadas! Paga en efectivo al recibir.`,
          ctaText: 'Pedir Contra Entrega',
          ctaLink: `#product-${prod.id}`,
          imageUrl: prod.images?.[0] || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&auto=format&fit=crop&q=80',
          active: true,
          order: rank
        };
      });
    }

    // Default Fallback
    return [
      {
        id: 'ban-fallback-1',
        title: 'Los Productos Más Vendidos de Colombia',
        subtitle: 'Perfumes exclusivos de alta duración, estuches de lujo y Pago Contra Entrega en todo el país.',
        badgeText: '🏆 #1 EN VENTAS',
        tagline: 'TOP MÁS VENDIDOS • ZAVELA STORE',
        notificationText: '🎉 Descubre los productos más vendidos con despacho express y pago contra entrega en toda Colombia.',
        ctaText: 'Ver Catálogo',
        ctaLink: '#productos',
        imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&auto=format&fit=crop&q=80',
        active: true,
        order: 1
      }
    ];
  }, [banners, bestSellerProducts]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const safeIndex = currentIndex >= dynamicBanners.length ? 0 : currentIndex;
  const currentBanner = dynamicBanners[safeIndex] || dynamicBanners[0];

  // Match current active product
  const currentProduct = useMemo(() => {
    if (!products || products.length === 0) return null;
    if (currentBanner.id.startsWith('hero-prod-')) {
      const prodId = currentBanner.id.replace('hero-prod-', '');
      const found = products.find(p => p.id === prodId);
      if (found) return found;
    }
    return bestSellerProducts[safeIndex]?.product || products[safeIndex % products.length] || products[0];
  }, [products, currentBanner, safeIndex, bestSellerProducts]);

  // Active product's sales statistics
  const currentSalesStats = useMemo(() => {
    if (!currentProduct) return null;
    return bestSellerProducts.find(b => b.product.id === currentProduct.id) || null;
  }, [currentProduct, bestSellerProducts]);

  // Auto rotation loop
  useEffect(() => {
    if (isPaused || dynamicBanners.length <= 1) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const stepMs = 100;
    const increment = (stepMs / ROTATION_INTERVAL_MS) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrentIndex(curr => (curr + 1) % dynamicBanners.length);
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPaused, dynamicBanners.length]);

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % dynamicBanners.length);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + dynamicBanners.length) % dynamicBanners.length);
    setProgress(0);
  };

  const handleSelectBanner = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  };

  const handleBannerAction = () => {
    if (currentProduct) {
      onQuickBuy(currentProduct);
    } else {
      onSelectCategory('all');
      const catalogEl = document.getElementById('catalog-products-section');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const formatCOP = (val: number) => `$ ${val.toLocaleString('es-CO')}`;

  return (
    <div id="hero-banner-carousel-container" className="flex-1 flex flex-col space-y-3">
      {/* ========================================================================= */}
      {/* 1. JPFANS MODERN STYLE (WITH BEST-SELLERS BADGES & SELECTOR)              */}
      {/* ========================================================================= */}
      {currentStyle === 'jpfans' ? (
        <div 
          className="space-y-3 select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Main JPFans Banner Card */}
          <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#e0e7ff] border border-blue-200/80 shadow-md min-h-[380px] sm:min-h-[420px] flex flex-col justify-between p-5 sm:p-8 md:p-10 transition-all">
            
            {/* Background 3D subtle spheres / light reflections */}
            <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-cyan-300/30 blur-2xl pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 right-10 w-52 h-52 rounded-full bg-amber-300/20 blur-2xl pointer-events-none" />

            {/* Top Quick Bar: Best Seller Rank Indicator & Fast Shipping */}
            <div className="relative z-10 flex items-center justify-between gap-2 pb-2 border-b border-blue-200/60 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] sm:text-xs shadow-xs uppercase tracking-wider">
                  <Trophy className="w-3.5 h-3.5 text-slate-950" />
                  <span>{currentBanner.badgeText || '🏆 TOP MÁS VENDIDO'}</span>
                </span>

                {currentSalesStats && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 text-blue-950 font-bold text-[11px] border border-blue-200">
                    <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                    <span>+{currentSalesStats.totalUnitsSold} unidades vendidas</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <Truck className="w-3 h-3 text-emerald-600" />
                  <span>Pago Contra Entrega</span>
                </span>
              </div>
            </div>

            {/* Content Flex Layout */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 my-auto py-2">
              
              {/* Left Column: Tagline, Title, Subtitle, Price, CTA */}
              <div className="w-full md:w-1/2 text-left space-y-3.5 md:space-y-4">
                
                {/* Collection Tag */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-blue-900 tracking-tight italic font-serif">
                    {currentBanner.tagline || 'Only On Zavela Store • Más Vendidos de Colombia'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                </div>

                {/* Main Hero Big Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-tight drop-shadow-xs line-clamp-2">
                  {currentBanner.title}
                </h1>

                {/* Subtitle / Commercial Description */}
                <p className="text-sm sm:text-base font-medium text-slate-700 leading-snug line-clamp-2">
                  {currentBanner.subtitle}
                </p>

                {/* Price and Stock Urgency Container */}
                {currentProduct && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="bg-white/90 backdrop-blur-xs px-3.5 py-1.5 rounded-2xl border border-blue-200 shadow-xs">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Precio Especial</div>
                      <div className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                        {formatCOP(currentProduct.price)}
                      </div>
                    </div>

                    {/* Stock Alert in Banner */}
                    {Number(currentProduct.stock) <= 5 ? (
                      <div className="bg-gradient-to-r from-red-500 to-amber-500 text-white px-3 py-1.5 rounded-2xl text-[11px] font-black flex items-center gap-1.5 shadow-xs animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-white" />
                        <span>¡ÚLTIMAS {currentProduct.stock} UNIDADES!</span>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-2xl text-[11px] font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Disponible para entrega inmediata</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Signature JPFans "Pedir Contra Entrega" Button */}
                <div className="pt-2 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleBannerAction}
                    className="relative group/btn inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-3.5 rounded-full bg-gradient-to-b from-[#fef08a] via-[#facc15] to-[#eab308] hover:from-[#fef9c3] hover:via-[#fde047] hover:to-[#eab308] text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-400/40 hover:shadow-xl hover:shadow-amber-400/60 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-amber-300 uppercase tracking-wider"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{currentBanner.ctaText || 'Pedir Contra Entrega'}</span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>

                  {currentProduct && (
                    <button
                      onClick={() => onViewProduct(currentProduct)}
                      className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full bg-white/90 hover:bg-white text-slate-800 font-bold text-xs border border-slate-200 shadow-xs transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ver Detalles</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: 3D Product Showcase with Rank Ribbon */}
              <div className="w-full md:w-1/2 flex items-center justify-center relative">
                <div 
                  className="relative w-56 sm:w-72 md:w-80 lg:w-96 aspect-square rounded-3xl overflow-hidden cursor-pointer group/showcase transition-transform duration-500 hover:scale-102 flex items-center justify-center bg-white/40 backdrop-blur-xs p-4 border border-white/60 shadow-inner"
                  onClick={() => currentProduct && onViewProduct(currentProduct)}
                >
                  <img
                    src={currentProduct?.images?.[0] || currentBanner.imageUrl}
                    alt={currentBanner.title}
                    key={currentBanner.id}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain drop-shadow-2xl transition-all duration-700 group-hover/showcase:scale-105"
                  />

                  {/* Floating Best-Seller Gold Badge */}
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 text-[10px] sm:text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-lg border border-amber-200 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-slate-950" />
                    <span>MÁS VENDIDO #{safeIndex + 1}</span>
                  </div>

                  {/* Free Delivery Tag */}
                  <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs text-slate-900 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 shadow-md flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Envío Gratis y Seguro</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Top Best-Sellers Mini Quick-Selector Tabs */}
            {bestSellerProducts.length > 1 && (
              <div className="pt-3 border-t border-blue-200/60 relative z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-[11px] font-black text-blue-950 flex items-center gap-1.5 shrink-0 uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span>Top Más Vendidos:</span>
                </div>

                {/* Thumbnails list */}
                <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
                  {bestSellerProducts.slice(0, 5).map((item, idx) => {
                    const isSelected = idx === safeIndex;
                    return (
                      <button
                        key={item.product.id}
                        onClick={() => handleSelectBanner(idx)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0 border ${
                          isSelected 
                            ? 'bg-slate-950 text-white border-slate-900 shadow-xs scale-102' 
                            : 'bg-white/80 hover:bg-white text-slate-700 border-blue-200/80 hover:border-blue-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="truncate max-w-[100px] sm:max-w-[120px]">
                          {item.product.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Left & Right Subtle Navigation Buttons */}
            {dynamicBanners.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  aria-label="Anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-md border border-slate-200 transition-all cursor-pointer opacity-70 hover:opacity-100 z-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  aria-label="Siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-md border border-slate-200 transition-all cursor-pointer opacity-70 hover:opacity-100 z-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* ========================================================================= */}
          {/* NOTIFICACIÓN / CAMPAÑA BAR (Directly Underneath the Banner as in JPFans) */}
          {/* ========================================================================= */}
          <div className="bg-white/95 rounded-2xl px-4 sm:px-6 py-3 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all hover:border-slate-300">
            
            {/* Left: Distinct Pill Badge with Bell Icon */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 bg-amber-100/90 text-amber-900 border border-amber-200 font-extrabold px-3 py-1.5 rounded-full shrink-0 shadow-2xs">
                <Bell className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                <span className="tracking-tight text-[11px] sm:text-xs">Más Vendido</span>
              </div>

              {/* Dynamic Text Sincronizado con el Banner Activo */}
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <span 
                  key={currentBanner.id} 
                  className="text-slate-800 font-medium truncate sm:whitespace-normal line-clamp-1 sm:line-clamp-none animate-fadeIn text-[11px] sm:text-xs"
                >
                  {currentBanner.notificationText || '🎉 Los productos más vendidos de Zavela Store con despacho express y pago contra entrega en toda Colombia.'}
                </span>
              </div>
            </div>

            {/* Right: "Ver Todos los Más Vendidos" Action */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
              <button
                onClick={handleBannerAction}
                className="flex items-center gap-1 font-bold text-slate-800 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 px-3 py-1 rounded-xl transition-all cursor-pointer"
              >
                <span>Ver Más</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. CLASSIC HERO BANNER STYLE (With Best Sellers Indicators)                */
        /* ========================================================================= */
        <div 
          className="bg-white rounded-3xl shadow-sm hover:shadow-md border border-slate-200 overflow-hidden relative group transition-all duration-300 select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Progress Bar Header */}
          {dynamicBanners.length > 1 && (
            <div className="relative w-full h-1 bg-slate-100 overflow-hidden z-20">
              <div 
                className="h-full transition-all duration-100 ease-linear bg-gradient-to-r from-amber-500 via-sky-500 to-indigo-600 shadow-xs"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}

          {/* Top Banner Control Bar */}
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/90 backdrop-blur-xs flex justify-between items-center relative z-20">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest flex items-center gap-1.5 text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>PRODUCTOS MÁS VENDIDOS • ZAVELA STORE</span>
              </span>

              <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                <Truck className="w-3 h-3 text-emerald-600" />
                PAGO CONTRA ENTREGA
              </span>
            </div>

            {/* Navigation & Rotation Controls */}
            {dynamicBanners.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Main Banner Content Area */}
          <div className="p-6 sm:p-8 flex flex-col lg:flex-row gap-6 items-center">
            <div className="w-full lg:w-1/2 aspect-4/3 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-100">
              <img
                src={currentProduct?.images?.[0] || currentBanner.imageUrl}
                alt={currentBanner.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded-full shadow-md">
                🏆 #{safeIndex + 1} Más Vendido
              </div>
            </div>

            <div className="w-full lg:w-1/2 space-y-4">
              <span className="text-xs font-black text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 uppercase tracking-wider">
                {currentBanner.badgeText || 'ZAVELA STORE MÁS VENDIDO'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                {currentBanner.title}
              </h2>
              <p className="text-sm text-slate-600">
                {currentBanner.subtitle}
              </p>

              {currentProduct && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {formatCOP(currentProduct.price)}
                  </span>
                  {Number(currentProduct.stock) <= 5 && (
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded-md">
                      ⚠️ ¡Últimas {currentProduct.stock} unidades!
                    </span>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleBannerAction}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>{currentBanner.ctaText || 'Pedir Ahora'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
