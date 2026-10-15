import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductVariant, CartItem } from '../types/index.ts';
import { Package, Plus, Check, Eye } from 'lucide-react';
import { formatCOP } from '../utils/formatters.ts';

interface SameWarehouseRecommendationsProps {
  currentProduct: Product;
  allProducts: Product[];
  onAddToCart: (product: Product, quantity: number, variant?: ProductVariant) => void;
  onSelectProduct?: (product: Product) => void;
  cartItems?: CartItem[];
}

export const SameWarehouseRecommendations: React.FC<SameWarehouseRecommendationsProps> = ({
  currentProduct,
  allProducts = [],
  onAddToCart,
  onSelectProduct,
  cartItems = []
}) => {
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [recentViewIds, setRecentViewIds] = useState<string[]>([]);

  // Track recently viewed products from localStorage
  useEffect(() => {
    try {
      const rawRecent = localStorage.getItem('zavela_recent_views');
      if (rawRecent) {
        const parsed = JSON.parse(rawRecent);
        if (Array.isArray(parsed)) {
          setRecentViewIds(parsed.map(item => typeof item === 'object' && item?.id ? String(item.id) : String(item)));
          return;
        }
      }

      // Fallback to zavela_product_views tracker
      const rawTracker = localStorage.getItem('zavela_product_views');
      if (rawTracker) {
        const parsedTracker = JSON.parse(rawTracker);
        if (Array.isArray(parsedTracker)) {
          setRecentViewIds(parsedTracker.map(t => String(t.id)));
        }
      }
    } catch {}
  }, [currentProduct.id]);

  // Normalize provider string for strict matching
  const currentProvider = (currentProduct.provider || currentProduct.supplier || '').trim().toLowerCase();

  // Filter ONLY real products from MySQL meeting strict criteria:
  // 1. item.id !== currentProduct.id
  // 2. item.provider === currentProduct.provider (same warehouse / dispatch center)
  // 3. active / is_active === 1 and stock > 0
  const sameWarehouseProducts = useMemo(() => {
    if (!currentProduct || !currentProvider) return [];

    return allProducts.filter(item => {
      // 1. Exclude current product
      if (String(item.id) === String(currentProduct.id)) return false;

      // 2. Must match the exact provider / warehouse
      const itemProvider = (item.provider || item.supplier || '').trim().toLowerCase();
      if (!itemProvider || itemProvider !== currentProvider) return false;

      // 3. Must be active and with real positive stock in MySQL
      const isActive = item.active !== false && (item as any).is_active !== 0 && (item as any).is_active !== false;
      const hasStock = Number(item.stock ?? 0) > 0;
      if (!isActive || !hasStock) return false;

      return true;
    });
  }, [currentProduct, allProducts, currentProvider]);

  // Prioritize recently viewed items from the same warehouse
  const prioritizedProducts = useMemo(() => {
    if (sameWarehouseProducts.length === 0) return [];

    return [...sameWarehouseProducts].sort((a, b) => {
      const aIsRecent = recentViewIds.includes(String(a.id));
      const bIsRecent = recentViewIds.includes(String(b.id));
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      return 0;
    }).slice(0, 6); // Limit to top 6 real items for elegant display
  }, [sameWarehouseProducts, recentViewIds]);

  // CRITICAL CONDITION: If resulting list has 0 items, DO NOT RENDER (return null)
  // STRICTLY PROHIBITED: No mock data, no fake items, no dummy records.
  if (prioritizedProducts.length === 0) {
    return null;
  }

  const handleAdd = (e: React.MouseEvent, item: Product) => {
    e.stopPropagation();
    const firstVariant = item.variants && item.variants.length > 0 ? item.variants[0] : undefined;
    onAddToCart(item, 1, firstVariant);
    
    setAddedIds(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [item.id]: false }));
    }, 2500);
  };

  return (
    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-50 border border-sky-100 shadow-xs">
      
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-3">
        <div className="p-2 rounded-xl bg-sky-100 text-sky-700 shrink-0 mt-0.5">
          <Package className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>📦 Para tu Paquete: Productos de la Misma Bodega</span>
          </h4>
          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
            Como viajan desde el mismo centro de despacho, llegarán juntos y más rápido. ¿Quieres complementar tu pedido?
          </p>
        </div>
      </div>

      {/* Real Products Carousel / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {prioritizedProducts.map((item) => {
          const isAdded = addedIds[item.id];
          const isAlreadyInCart = cartItems.some(c => String(c.product.id) === String(item.id));
          const isRecent = recentViewIds.includes(String(item.id));
          const imageUrl = (Array.isArray(item.images) && item.images.length > 0)
            ? item.images[0] 
            : (item.image || item.imagen || '');

          return (
            <div
              key={item.id}
              onClick={() => onSelectProduct?.(item)}
              className="group p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-sky-300 hover:shadow-sm transition-all flex items-center gap-3 cursor-pointer relative overflow-hidden"
            >
              {/* Product Thumbnail */}
              <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-100 shrink-0 overflow-hidden relative">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                    📦
                  </div>
                )}
              </div>

              {/* Information */}
              <div className="flex-1 min-w-0">
                {isRecent && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mb-1 leading-none">
                    <Eye className="w-2.5 h-2.5 text-amber-600" />
                    <span>Visto recientemente</span>
                  </span>
                )}

                <h5 className="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-sky-700 transition-colors">
                  {item.title}
                </h5>

                <div className="flex items-center justify-between gap-1 mt-1">
                  <span className="text-xs font-black text-slate-900">
                    {formatCOP(item.price)}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleAdd(e, item)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                      isAdded
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isAlreadyInCart
                          ? 'bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300'
                          : 'bg-slate-900 hover:bg-sky-600 text-white shadow-xs active:scale-95'
                    }`}
                    title="Agregar a este mismo paquete"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Agregado</span>
                      </>
                    ) : isAlreadyInCart ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>En paquete</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>+ Agregar al Paquete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
