import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Zap, ShieldCheck, Truck, Sparkles, ChevronRight, CheckCircle2, Eye, Star, Share2 } from 'lucide-react';
import { Product } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';
import { ProductShareModal } from './ProductShareModal.tsx';
import { extractProductImages } from '../utils/imageUtils.ts';

interface ProductCardProps {
  product: Product;
  onSelectProduct?: (product: Product) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  onBuyNow: (product: Product, e?: React.MouseEvent) => void;
}

const getCategoryBadgeStyle = (category?: string) => {
  const norm = (category || '').toLowerCase();
  if (norm.includes('juguet') || norm.includes('niñ') || norm.includes('infant') || norm.includes('juego')) {
    return { bg: 'bg-purple-100 text-purple-900 border-purple-300', emoji: '🧸' };
  }
  if (norm.includes('belleza') || norm.includes('cosmet') || norm.includes('cuidado') || norm.includes('facial') || norm.includes('maquill') || norm.includes('capilar')) {
    return { bg: 'bg-pink-100 text-pink-900 border-pink-300', emoji: '✨' };
  }
  if (norm.includes('hogar') || norm.includes('cocina') || norm.includes('casa') || norm.includes('decor')) {
    return { bg: 'bg-amber-100 text-amber-900 border-amber-300', emoji: '🏠' };
  }
  if (norm.includes('tecno') || norm.includes('gadget') || norm.includes('audio') || norm.includes('reloj') || norm.includes('electr') || norm.includes('smart')) {
    return { bg: 'bg-blue-100 text-blue-900 border-blue-300', emoji: '⚡' };
  }
  if (norm.includes('moda') || norm.includes('calzad') || norm.includes('ropa') || norm.includes('bolso') || norm.includes('faja') || norm.includes('vestid')) {
    return { bg: 'bg-emerald-100 text-emerald-900 border-emerald-300', emoji: '👗' };
  }
  return { bg: 'bg-slate-100 text-slate-800 border-slate-300', emoji: '🏷️' };
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onAddToCart,
  onBuyNow
}) => {
  const navigate = useNavigate();
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleNavigateToProduct = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const identifier = product.slug || product.id;
    navigate(`/producto/${encodeURIComponent(identifier)}`);
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  const productImages = extractProductImages(product);
  const mainImage = productImages[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';

  const categoryLabel = product.categoryName || (product as any).category || (product as any).categoria || 'Catálogo General';
  const categoryStyle = getCategoryBadgeStyle(categoryLabel);

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

  const stripEmoji = (t: string) => String(t || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/[?!¡¿]{2,}/g, '').replace(/\s{2,}/g, ' ').trim();
  const price = Number(product.price) || 0;
  const compareAt = Number(product.compareAtPrice) || 0;
  const hasDiscount = compareAt > price && price > 0;
  const stock = Number(product.stock);

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={handleNavigateToProduct}
      className="group zs-card zs-font flex flex-col overflow-visible cursor-pointer relative"
    >
      {/* Imagen: la foto manda, con marco blanco de 12px y esquinas de 20px */}
      <div className="relative aspect-square w-full overflow-hidden p-3">
        <img
          src={mainImage}
          alt={product.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-[20px] group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {hasDiscount && product.discountPercentage > 0 && (
          <span className="absolute top-5 right-5 bg-white text-[color:var(--shop-violet)] text-xs font-semibold px-2.5 py-1 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            -{product.discountPercentage}%
          </span>
        )}
        {stock <= 0 ? (
          <span className="absolute top-5 left-5 bg-black/80 text-white text-xs font-medium px-2.5 py-1 rounded-full">Agotado</span>
        ) : stock <= 5 ? (
          <span className="absolute top-5 left-5 bg-white text-black text-xs font-medium px-2.5 py-1 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)]">Quedan {stock}</span>
        ) : null}
      </div>

      {/* Contenido: nombre, estrellas, precio y un solo botón de compra */}
      <div className="px-4 pb-4 pt-1 flex-1 flex flex-col gap-3">
        <div className="space-y-1.5">
          <h3
            className="font-semibold text-sm sm:text-base text-black line-clamp-2 leading-snug group-hover:text-[color:var(--shop-violet)] transition-colors"
            style={{ letterSpacing: '-0.031em' }}
          >
            {stripEmoji(product.title)}
          </h3>
          <div className="flex items-center gap-0.5 text-black" aria-label="Calificación 5 de 5">
            {[0, 1, 2, 3, 4].map(i => <Star key={i} className="w-3 h-3 fill-black" />)}
            <span className="text-[11px] text-[color:var(--shop-muted)] ml-1">5.0</span>
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl sm:text-2xl font-semibold text-black" style={{ letterSpacing: '-0.04em' }}>
              {formatCOP(price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[color:var(--shop-muted)] line-through">{formatCOP(compareAt)}</span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-[color:var(--shop-muted)] mt-0.5">Envío gratis · Pago contra entrega</p>
        </div>

        <div className="flex items-center gap-2 mt-auto pt-1">
          <button
            id={`btn-buy-now-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onBuyNow(product, e);
            }}
            className="flex-1 h-11 rounded-full text-sm font-semibold flex items-center justify-center hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            style={{ background: 'var(--zv-cta, #ff5a4f)', color: 'var(--zv-cta-ink, #fff)' }}
          >
            Pedir y pagar en casa
          </button>
          <button
            id={`btn-add-cart-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product, e);
            }}
            className="zs-pill w-11 h-11 rounded-full flex items-center justify-center cursor-pointer shrink-0"
            title="Agregar al carrito"
            aria-label="Agregar al carrito"
          >
            <ShoppingBag className="w-4 h-4 text-black" />
          </button>
          <button
            id={`btn-share-${product.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsShareOpen(true);
            }}
            className="zs-pill w-11 h-11 rounded-full hidden sm:flex items-center justify-center cursor-pointer shrink-0"
            title="Compartir"
            aria-label="Compartir producto"
          >
            <Share2 className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>

      <ProductShareModal
        product={product}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
};
