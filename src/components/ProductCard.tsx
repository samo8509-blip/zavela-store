import React, { useState, useRef } from 'react';
import { ShoppingBag, Zap, ShieldCheck, Truck, Sparkles, ChevronRight, CheckCircle2, Eye, Star, Share2 } from 'lucide-react';
import { Product } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';
import { ProductShareModal } from './ProductShareModal.tsx';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  onBuyNow: (product: Product, e?: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onAddToCart,
  onBuyNow
}) => {
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mainImage = product.images && product.images.length > 0
    ? product.images[0]
    : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';

  // Helper to extract clean bullet points or key features from description
  const cleanSummary = product.shortDescription || (() => {
    if (!product.description) return 'Producto exclusivo con garantía oficial y pago contra entrega en toda Colombia.';
    const sentences = product.description.split('.').map(s => s.trim()).filter(s => s.length > 10);
    return sentences.slice(0, 2).join('. ') + (sentences.length > 0 ? '.' : '');
  })();

  // Extract up to 2 key highlights or tags
  const keyHighlights = (product.tags && product.tags.length > 0)
    ? product.tags.slice(0, 2)
    : ['Alta Calidad', 'Garantía 30 Días'];

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsSummaryOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsSummaryOpen(false);
    }, 150);
  };

  return (
    <div 
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      className="group bg-white rounded-2xl border border-slate-200 hover:border-sky-400 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-visible cursor-pointer relative"
    >
      {/* Window-like Header bar */}
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between rounded-t-2xl">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-sky-600 animate-pulse" />
          {product.categoryName || 'Zavela CO'}
        </span>
        <div className="flex gap-1.5 items-center">
          <span className="text-[10px] font-mono text-slate-500 font-semibold">
            {product.brand || 'Zavela'}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
        </div>
      </div>

      {/* Image & Badges Container */}
      <div className="relative aspect-square w-full bg-slate-100/70 overflow-hidden flex items-center justify-center p-2.5">
        <img
          src={mainImage}
          alt={product.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Discount Badge with Fire Gradient BOOM style */}
        {product.discountPercentage > 0 ? (
          <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-md flex items-center gap-1 border border-yellow-300/40 animate-pulse">
            <Zap className="w-3 h-3 fill-yellow-300 text-yellow-300" />
            <span>-{product.discountPercentage}% BOOM</span>
          </div>
        ) : (
          <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
            🔥 BOOM OFERTA
          </div>
        )}

        {/* Warehouse Tag */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs text-slate-700 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-slate-200 shadow-2xs flex items-center gap-1">
          <Truck className="w-3 h-3 text-sky-600" />
          <span>{product.warehouseCity || 'Bogotá D.C.'}</span>
        </div>

        {/* Commercial Low Stock Alert / Badges */}
        {product.stock <= 5 && product.stock > 0 ? (
          <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-red-600 to-amber-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-md flex items-center gap-1 border border-yellow-300/40 animate-pulse z-10">
            <Zap className="w-3 h-3 fill-yellow-300 text-yellow-300" />
            <span>¡ÚLTIMAS {product.stock} UNIDADES!</span>
          </div>
        ) : product.stock <= 0 ? (
          <div className="absolute top-2.5 left-2.5 bg-slate-900/90 text-slate-200 text-[10px] font-mono font-bold px-2 py-1 rounded-lg uppercase tracking-wider shadow-md border border-slate-700 z-10">
            Agotado temporalmente
          </div>
        ) : product.stock <= 10 ? (
          <div className="absolute top-2.5 left-2.5 bg-amber-500 text-slate-950 text-[10px] font-mono font-black px-2 py-0.5 rounded-md shadow-xs border border-amber-300 z-10">
            Quedan {product.stock} un.
          </div>
        ) : null}

        {/* Quick View Button on Image Hover */}
        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
          <span className="bg-white text-slate-900 border border-slate-200 font-black text-xs px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 uppercase tracking-wider transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            Ver Ficha Completa
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white rounded-b-2xl relative">
        <div className="space-y-2">
          {/* Top Status & Review stars */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-slate-600 font-bold ml-0.5">5.0</span>
            </div>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">Verificado</span>
          </div>

          {/* Title with stronger hierarchy */}
          <h3 className="font-extrabold text-base text-slate-900 line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors">
            {product.title}
          </h3>

          {/* INTERACTIVE FEATURES HOVER TRIGGER & QUICK RESUME */}
          <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Interactive Feature Pill Button */}
            <div 
              id={`features-trigger-${product.id}`}
              className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-sky-50/70 border border-slate-200 hover:border-sky-300 transition-all cursor-pointer group/feat"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="text-[11px] font-extrabold text-slate-700 group-hover/feat:text-sky-700 truncate">
                  ⚡ Características & Beneficios
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-sky-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                Pasa el cursor 💡
              </span>
            </div>

            {/* Quick highlight tags */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {keyHighlights.map((hl, idx) => (
                <span 
                  key={idx}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                >
                  ✓ {hl}
                </span>
              ))}
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                🚚 Paga al recibir
              </span>
            </div>

            {/* PERSUASIVE HOVER SUMMARY POPOVER / TOOLTIP (Alto Interés para Concluir la Venta) */}
            {isSummaryOpen && (
              <div 
                id={`summary-popover-${product.id}`}
                className="absolute bottom-full left-0 right-0 sm:left-[-12px] sm:right-[-12px] mb-2 z-40 bg-white rounded-2xl p-4 border-2 border-sky-400 shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto text-slate-900"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProduct(product);
                }}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    ¿POR QUÉ TE ENCANTARÁ?
                  </span>
                  <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 font-bold">
                    Pago Contra Entrega
                  </span>
                </div>

                {/* Brief & Engaging Summary Text */}
                <p className="text-xs text-slate-700 font-medium leading-relaxed mb-3">
                  {cleanSummary}
                </p>

                {/* 3 High-Value Sales Arguments */}
                <div className="space-y-1.5 mb-3.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-900">Cero Riesgo:</strong> No pagas nada por anticipado. Pagas en efectivo al cartero.</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-900">Despacho Inmediato:</strong> Envío express desde {product.warehouseCity || 'Bogotá D.C.'}.</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-900">Garantía Total:</strong> 30 días de cobertura y soporte directo por WhatsApp.</span>
                  </div>
                </div>

                {/* Action to finalize interest & open detail */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProduct(product);
                  }}
                  className="w-full py-2 px-3 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-black text-[11px] rounded-xl flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-sm transition-all cursor-pointer group/btn"
                >
                  <span>Ver más información y pedir</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                </button>

                <div className="text-center mt-1.5">
                  <span className="text-[9px] text-slate-500 font-mono">
                    👆 Haz clic aquí para ver fotos, videos y hacer tu pedido
                  </span>
                </div>

                {/* Triangle Arrow pointer */}
                <div className="absolute top-full left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-sky-400" />
              </div>
            )}
          </div>

          {/* Pricing Monospace & Savings Indicator */}
          <div className="pt-1 space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-mono font-black text-slate-900 tracking-tight">
                {formatCOP(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-xs text-slate-400 line-through font-mono">
                  {formatCOP(product.compareAtPrice)}
                </span>
              )}
            </div>

            {/* Savings indicator in Colombian Pesos */}
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200 text-[10px] font-mono font-extrabold">
                <span>🔥 ¡Ahorras {formatCOP(product.compareAtPrice - product.price)} hoy!</span>
              </div>
            )}

            {/* Commercial Low Stock Urgency Banner (<= 5 units) */}
            {product.stock <= 5 && product.stock > 0 ? (
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-400/40 text-amber-950 flex items-center justify-between gap-1 text-[10px]">
                <span className="font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                  <span>¡Ya quedan pocas unidades!</span>
                </span>
                <span className="font-mono font-black text-red-700 bg-white px-1.5 py-0.5 rounded border border-amber-300">
                  Solo {product.stock} disp.
                </span>
              </div>
            ) : null}

            {/* 2+ items free shipping perk pill */}
            <div className="flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
              <Truck className="w-3 h-3 text-sky-600 shrink-0" />
              <span>Lleva 2+ productos y el <strong>Envío es GRATIS</strong></span>
            </div>

            <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Pago Contra Entrega en Efectivo</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2.5 border-t border-slate-100">
          {/* Primary CTA: High energy ¡PEDIR Y PAGAR EN CASA! */}
          <button
            id={`btn-buy-now-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onBuyNow(product, e);
            }}
            className="w-full h-11 bg-gradient-to-r from-red-600 via-[#FF5A36] to-pink-600 hover:from-red-700 hover:via-[#E04826] hover:to-pink-700 active:scale-98 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-xl transition-all uppercase tracking-wider cursor-pointer border border-yellow-300/30"
          >
            <Zap className="w-4 h-4 fill-yellow-300 text-yellow-300 animate-pulse" />
            <span className="font-extrabold tracking-wide">¡PEDIR Y PAGAR EN CASA!</span>
          </button>

          {/* Secondary CTA & Share */}
          <div className="flex gap-1.5">
            <button
              id={`btn-add-cart-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product, e);
              }}
              className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 hover:border-slate-300 transition-all uppercase tracking-wider cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-700" />
              <span>AGREGAR AL CARRITO</span>
            </button>

            <button
              id={`btn-share-${product.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsShareOpen(true);
              }}
              className="h-9 px-3 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 hover:border-purple-300 rounded-xl border border-slate-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
              title="Compartir por WhatsApp, Facebook o Redes"
            >
              <Share2 className="w-4 h-4 text-purple-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal Portal */}
      <ProductShareModal
        product={product}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
};

