import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Gift, 
  Home, 
  Smartphone, 
  HeartPulse, 
  Heart,
  Ghost,
  Wrench, 
  Layers, 
  Flame,
  ShoppingBag,
  Grid
} from 'lucide-react';
import { Category, Product } from '../types/index.ts';

interface TopCategoryNavProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  selectedSubcategoryId?: string;
  onSelectSubcategory?: (subcategoryId: string) => void;
  products?: Product[];
  totalProductsCount?: number;
  className?: string;
}

export const TopCategoryNav: React.FC<TopCategoryNavProps> = ({
  categories = [],
  selectedCategoryId = 'all',
  onSelectCategory,
  selectedSubcategoryId = 'all',
  onSelectSubcategory,
  products = [],
  totalProductsCount,
  className = ''
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const activeCategories = categories.filter(c => c.active !== false);
  const totalCount = totalProductsCount ?? products.length;

  // Check scroll positions to update scroll arrows visibility and gradient indicators
  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    // Buffer of 3px for subpixel precision
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScrollability();

    const handleScroll = () => {
      checkScrollability();
    };

    el.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });
    resizeObserver.observe(el);

    // Also listen to window resize
    window.addEventListener('resize', checkScrollability);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkScrollability);
    };
  }, [checkScrollability, activeCategories.length]);

  // Support mouse wheel horizontal scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (el.scrollWidth > el.clientWidth) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY * 0.85;
      }
    }
  };

  // Smooth scroll button handlers
  const handleScrollLeft = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(180, el.clientWidth * 0.65);
    el.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.max(180, el.clientWidth * 0.65);
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Mouse Drag to Scroll
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Helper to get category icon and color theme
  const getCategoryMeta = (cat: Category) => {
    const slug = cat.slug?.toLowerCase() || '';
    const name = cat.name?.toLowerCase() || '';
    const iconName = cat.icon?.toLowerCase() || '';

    if (slug.includes('amor') || name.includes('amor') || name.includes('amistad') || iconName === 'heart') {
      return {
        icon: <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-500/30 animate-pulse" />,
        isAmor: true,
        badgeText: '💖 REGALOS',
        badgeBg: 'bg-pink-950 text-pink-300 border-pink-500/60'
      };
    }
    if (slug.includes('halo') || name.includes('halo') || slug.includes('disfraz') || name.includes('disfraces') || iconName === 'ghost') {
      return {
        icon: <Ghost className="w-3.5 h-3.5 text-orange-400 animate-bounce" />,
        isHalloween: true,
        badgeText: '🎃 VIRAL',
        badgeBg: 'bg-orange-950 text-amber-300 border-orange-500/60'
      };
    }
    if (slug.includes('navid') || name.includes('navid') || name.includes('diciem') || iconName === 'gift') {
      return {
        icon: <Gift className="w-3.5 h-3.5 text-amber-300 animate-pulse" />,
        isChristmas: true,
        badgeText: '🎄 50% OFF',
        badgeBg: 'bg-red-950 text-amber-300 border-red-500/60'
      };
    }
    if (slug.includes('belleza') || name.includes('belleza') || iconName === 'sparkles') {
      return {
        icon: <Sparkles className="w-3.5 h-3.5 text-pink-400" />,
        isChristmas: false
      };
    }
    if (slug.includes('hogar') || name.includes('hogar') || slug.includes('cocina') || iconName === 'home') {
      return {
        icon: <Home className="w-3.5 h-3.5 text-emerald-400" />,
        isChristmas: false
      };
    }
    if (slug.includes('tecno') || name.includes('tecno') || slug.includes('gadget') || iconName === 'smartphone') {
      return {
        icon: <Smartphone className="w-3.5 h-3.5 text-cyan-400" />,
        isChristmas: false
      };
    }
    if (slug.includes('salud') || name.includes('salud') || slug.includes('fitness') || iconName === 'heartpulse' || iconName === 'activity') {
      return {
        icon: <HeartPulse className="w-3.5 h-3.5 text-rose-400" />,
        isChristmas: false
      };
    }
    if (slug.includes('herramient') || name.includes('herramient') || iconName === 'wrench' || iconName === 'hammer') {
      return {
        icon: <Wrench className="w-3.5 h-3.5 text-amber-400" />,
        isChristmas: false
      };
    }

    return {
      icon: <Layers className="w-3.5 h-3.5 text-slate-300" />,
      isChristmas: false
    };
  };

  const getProductCountForCat = (catId: string) => {
    if (catId === 'all') return totalCount;
    return products.filter(p => p.categoryId === catId).length;
  };

  const handleCategoryClick = (catId: string, e: React.MouseEvent) => {
    onSelectCategory(catId);
    
    const target = e.currentTarget as HTMLElement;
    if (target && scrollContainerRef.current) {
      target.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }

    const catalogEl = document.getElementById('catalog-products-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div 
      id="top-category-nav-wrapper"
      className={`relative w-full bg-slate-50 border-b border-slate-200 select-none ${className}`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center relative">
        
        {/* Left Scroll Navigation Button */}
        <div 
          className={`absolute left-0 top-0 bottom-0 z-20 flex items-center pr-4 pl-1 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent transition-opacity duration-300 ${
            canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            id="top-cat-scroll-left-btn"
            type="button"
            onClick={handleScrollLeft}
            aria-label="Desplazar categorías hacia la izquierda"
            className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-700 hover:text-sky-600 border border-slate-300 shadow-sm flex items-center justify-center transition-all cursor-pointer group active:scale-95"
            title="Mover a la izquierda"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Scrollable Categories Track */}
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex items-center gap-2 overflow-x-auto py-2.5 px-2 sm:px-3 scrollbar-none scroll-smooth w-full ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab sm:cursor-default'
          }`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* "Todos" / All Category Button */}
          <button
            id="top-cat-pill-all"
            type="button"
            onClick={(e) => handleCategoryClick('all', e)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
              selectedCategoryId === 'all'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm scale-102'
                : 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-sky-400 hover:bg-slate-50'
            }`}
          >
            <Grid className={`w-3.5 h-3.5 ${selectedCategoryId === 'all' ? 'text-white' : 'text-sky-600'}`} />
            <span>Todos</span>
            {totalCount > 0 && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold ${
                selectedCategoryId === 'all' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {totalCount}
              </span>
            )}
          </button>

          {/* Individual Category Buttons */}
          {activeCategories.map((cat) => {
            const meta = getCategoryMeta(cat);
            const isSelected = selectedCategoryId === cat.id;
            const count = getProductCountForCat(cat.id);

            let buttonClass = 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-sky-400 hover:bg-slate-50';

            if (isSelected) {
              if (meta.isAmor) {
                buttonClass = 'bg-gradient-to-r from-pink-600 to-rose-500 text-white border-pink-500 shadow-sm scale-102 font-extrabold';
              } else if (meta.isHalloween) {
                buttonClass = 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-orange-500 shadow-sm scale-102 font-extrabold';
              } else if (meta.isChristmas) {
                buttonClass = 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-red-500 shadow-sm scale-102 font-extrabold';
              } else {
                buttonClass = 'bg-sky-600 text-white border-sky-600 shadow-sm scale-102 font-extrabold';
              }
            } else {
              if (meta.isAmor) {
                buttonClass = 'bg-pink-50 text-pink-700 hover:text-pink-900 border-pink-200 hover:border-pink-300 hover:bg-pink-100/70 shadow-2xs';
              } else if (meta.isHalloween) {
                buttonClass = 'bg-orange-50 text-orange-800 hover:text-orange-950 border-orange-200 hover:border-orange-300 hover:bg-orange-100/70 shadow-2xs';
              } else if (meta.isChristmas) {
                buttonClass = 'bg-red-50 text-red-700 hover:text-red-900 border-red-200 hover:border-red-300 hover:bg-red-100/70 shadow-2xs';
              }
            }

            return (
              <button
                key={cat.id}
                id={`top-cat-pill-${cat.id}`}
                type="button"
                onClick={(e) => handleCategoryClick(cat.id, e)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer border ${buttonClass}`}
              >
                {meta.icon}
                <span>{cat.name}</span>
                
                {meta.badgeText && (
                  <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded uppercase ${
                    meta.badgeBg || 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {meta.badgeText}
                  </span>
                )}

                {count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Navigation Button */}
        <div 
          className={`absolute right-0 top-0 bottom-0 z-20 flex items-center pl-4 pr-1 bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent transition-opacity duration-300 ${
            canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            id="top-cat-scroll-right-btn"
            type="button"
            onClick={handleScrollRight}
            aria-label="Desplazar categorías hacia la derecha"
            className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-700 hover:text-sky-600 border border-slate-300 shadow-sm flex items-center justify-center transition-all cursor-pointer group active:scale-95"
            title="Mover a la derecha"
          >
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

      </div>

      {/* Subcategories Secondary Bar (Sub-Menú dinámico para Perfumería y Belleza) */}
      {selectedCategoryId !== 'all' && (() => {
        const currentCat = categories.find(c => c.id === selectedCategoryId);
        if (!currentCat || !currentCat.subcategories || currentCat.subcategories.length === 0) return null;

        const subList = currentCat.subcategories.map(s => {
          if (typeof s === 'string') {
            return { id: s, name: s, slug: s };
          }
          return s;
        });

        return (
          <div className="bg-slate-100 border-t border-slate-200 px-2 sm:px-4 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="max-w-7xl mx-auto flex items-center gap-1.5 w-full">
              <span className="text-[10px] font-mono text-sky-700 uppercase tracking-wider font-extrabold flex items-center gap-1 shrink-0 mr-1 pl-1">
                <span>Sub-menú:</span>
              </span>

              <button
                type="button"
                id={`subcat-all-${currentCat.id}`}
                onClick={() => {
                  if (onSelectSubcategory) onSelectSubcategory('all');
                }}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                  selectedSubcategoryId === 'all'
                    ? 'bg-sky-600 text-white border-sky-600 font-black shadow-xs'
                    : 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-sky-400'
                }`}
              >
                Ver Todo ({getProductCountForCat(currentCat.id)})
              </button>

              {subList.map((sub) => {
                const subId = sub.id || sub.name;
                const isSelectedSub = selectedSubcategoryId === subId;
                const isPerfumeItem = sub.name.includes('Perfume') || sub.name.includes('💎') || sub.name.includes('Fragancia');

                let subStyle = isSelectedSub
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-500 font-black shadow-xs'
                  : 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-pink-400';

                if (isSelectedSub && !isPerfumeItem) {
                  subStyle = 'bg-sky-600 text-white border-sky-600 font-black shadow-xs';
                }

                return (
                  <button
                    key={subId}
                    id={`subcat-btn-${subId}`}
                    type="button"
                    onClick={() => {
                      if (onSelectSubcategory) onSelectSubcategory(subId);
                    }}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all cursor-pointer border ${subStyle}`}
                  >
                    <span>{sub.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
