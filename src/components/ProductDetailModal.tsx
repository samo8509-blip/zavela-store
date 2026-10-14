import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  ShoppingBag, 
  Zap, 
  ShieldCheck, 
  Truck, 
  Check, 
  Plus, 
  Minus, 
  Sparkles, 
  Share2, 
  FileText, 
  BadgeCheck, 
  ChevronLeft, 
  ChevronRight,
  CreditCard,
  Building2,
  CheckCircle2,
  Sliders,
  Flame,
  Award,
  Star,
  ThumbsUp,
  Camera
} from 'lucide-react';
import { Product, ProductVariant, CartItem } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';
import { SergioMartinezSignature } from './SergioMartinezSignature.tsx';
import { ProductShareModal } from './ProductShareModal.tsx';
import { useProductTracker } from '../hooks/useProductTracker.ts';
import { CommerceMindRecommendationsCarousel } from './CommerceMindRecommendationsCarousel.tsx';
import { registerProductObservation } from '../services/commerceMindClient.ts';
import { getVerifiedPositiveReviews, ProductReview } from '../utils/reviewsManager.ts';
import { extractProductImages } from '../utils/imageUtils.ts';

interface ProductDetailModalProps {
  product: Product | null;
  allProducts?: Product[];
  cartItems?: CartItem[];
  onSelectProduct?: (product: Product) => void;
  onClose: () => void;
  onAddToCart: (product: Product, variant?: ProductVariant, quantity?: number, unitPrice?: number) => void;
  onBuyNow: (product: Product, variant?: ProductVariant, quantity?: number, unitPrice?: number) => void;
  onOpenAuthorCertificate?: () => void;
  isSocialClosing?: boolean;
  onOpenLuckyWheel?: () => void;
  isLuckyWheelEnabled?: boolean;
}

const extractVariantColor = (v: ProductVariant): string => {
  if (v.color?.trim()) return v.color.trim();
  if (v.name?.includes(' / ')) return v.name.split(' / ')[0].trim();
  if (v.name?.includes(' - ')) return v.name.split(' - ')[0].trim();
  return v.name?.trim() || 'Color Único';
};

const extractVariantSize = (v: ProductVariant): string => {
  if (v.size?.trim()) return v.size.trim();
  if (v.talla?.trim()) return v.talla.trim();
  if (v.name?.includes(' / ')) return v.name.split(' / ')[1].trim();
  if (v.name?.includes(' - ')) return v.name.split(' - ')[1].trim();
  return 'Única';
};

const getColorSwatchInfo = (colorName: string): { bg: string; border?: string } => {
  const norm = colorName.toLowerCase().trim();
  if (norm.includes('negro') || norm.includes('black')) return { bg: '#111827' };
  if (norm.includes('blanco') || norm.includes('white')) return { bg: '#ffffff', border: '#cbd5e1' };
  if (norm.includes('gris claro') || norm.includes('light gray')) return { bg: '#94a3b8' };
  if (norm.includes('gris oscuro') || norm.includes('dark gray')) return { bg: '#334155' };
  if (norm.includes('gris') || norm.includes('gray')) return { bg: '#64748b' };
  if (norm.includes('rojo') || norm.includes('red')) return { bg: '#ef4444' };
  if (norm.includes('azul oscuro') || norm.includes('navy')) return { bg: '#1e3a8a' };
  if (norm.includes('azul claro') || norm.includes('sky')) return { bg: '#38bdf8' };
  if (norm.includes('azul') || norm.includes('blue')) return { bg: '#2563eb' };
  if (norm.includes('verde') || norm.includes('green')) return { bg: '#16a34a' };
  if (norm.includes('amarillo') || norm.includes('yellow')) return { bg: '#eab308' };
  if (norm.includes('naranja') || norm.includes('orange')) return { bg: '#f97316' };
  if (norm.includes('rosado') || norm.includes('rosa') || norm.includes('pink')) return { bg: '#ec4899' };
  if (norm.includes('morado') || norm.includes('purple')) return { bg: '#9333ea' };
  if (norm.includes('cafe') || norm.includes('café') || norm.includes('marron') || norm.includes('marrón') || norm.includes('brown')) return { bg: '#78350f' };
  if (norm.includes('beige')) return { bg: '#f5f5dc', border: '#d1d5db' };
  if (norm.includes('dorado') || norm.includes('gold')) return { bg: '#eab308' };
  if (norm.includes('plateado') || norm.includes('silver')) return { bg: '#cbd5e1' };
  return { bg: '#475569' };
};

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  allProducts = [],
  cartItems = [],
  onSelectProduct,
  onClose,
  onAddToCart,
  onBuyNow,
  onOpenAuthorCertificate,
  isSocialClosing = false,
  onOpenLuckyWheel,
  isLuckyWheelEnabled = true
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [sizeError, setSizeError] = useState<boolean>(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'especificaciones' | 'resenas' | 'garantia' | 'envios' | 'autoria'>('desc');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareInitialMode, setShareInitialMode] = useState<'recommend' | 'gift' | 'deal' | 'ruleta_closing'>('recommend');
  
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const relatedSliderRef = useRef<HTMLDivElement>(null);
  const { trackProductVisit, recordTimeSpent } = useProductTracker();

  // Robust image extraction from product (reads images, imagenes, JSON strings, single image fields, variants)
  const imagesList = useMemo(() => {
    return extractProductImages(product);
  }, [product]);

  // Reset active image when product changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  // Touch swipe support for smooth mobile photo navigation
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;
    if (distance > minSwipeDistance) {
      setActiveImageIndex(prev => (prev < imagesList.length - 1 ? prev + 1 : 0));
    } else if (distance < -minSwipeDistance) {
      setActiveImageIndex(prev => (prev > 0 ? prev - 1 : imagesList.length - 1));
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveImageIndex(prev => (prev > 0 ? prev - 1 : imagesList.length - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveImageIndex(prev => (prev < imagesList.length - 1 ? prev + 1 : 0));
  };

  // Normalización exhaustiva de variantes y tallas (ropa, calzado, enterizos, fajas)
  const allVariants = useMemo<ProductVariant[]>(() => {
    if (!product) return [];

    let raw: any[] = [];
    const source = product.variants || (product as any).variantes || (product as any).sizes || (product as any).tallas;
    
    if (Array.isArray(source) && source.length > 0) {
      raw = source;
    } else if (typeof source === 'string' && source.trim()) {
      try {
        const parsed = JSON.parse(source);
        if (Array.isArray(parsed) && parsed.length > 0) raw = parsed;
      } catch {
        if (source.includes(',')) {
          raw = source.split(',').map((s: string) => s.trim());
        }
      }
    }

    // Inferencia de tallas para moda/fajas/enterizos si la lista aún está vacía
    const titleLower = (product.title || '').toLowerCase();
    const isFashion = titleLower.includes('enterizo') || titleLower.includes('short') || titleLower.includes('realce') || 
                      titleLower.includes('faja') || titleLower.includes('zapato') || titleLower.includes('calzado') || 
                      titleLower.includes('vestido') || titleLower.includes('pantalon') || titleLower.includes('body');

    if (raw.length === 0 && isFashion) {
      raw = ['S', 'M', 'L', 'XL'];
    }

    return raw.map((item: any, idx: number) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return {
          id: `var-${product.id}-${idx}`,
          name: `${product.title} - Talla ${trimmed}`,
          size: trimmed,
          talla: trimmed,
          color: 'Color Único',
          stock: Number(product.stock) || 10,
          price: product.price,
          dropi_variation_id: (product as any).dropi_product_id
        };
      }
      
      const sName = item.size || item.talla || (item.name?.includes(' / ') ? item.name.split(' / ')[1]?.trim() : (item.name?.includes(' - ') ? item.name.split(' - ')[1]?.trim() : (['S','M','L','XL','XXL','28','30','32','34','36','38','39','40','41','42'].includes(item.name?.trim()) ? item.name.trim() : 'Única')));
      const cName = item.color || (item.name?.includes(' / ') ? item.name.split(' / ')[0]?.trim() : (item.name?.includes(' - ') && !['S','M','L','XL','XXL'].includes(item.name.split(' - ')[0]?.trim()) ? item.name.split(' - ')[0]?.trim() : 'Color Único'));
      
      return {
        ...item,
        id: String(item.id || `var-${product.id}-${idx}`),
        name: item.name || `${cName} / ${sName}`,
        color: cName,
        size: sName,
        talla: sName,
        stock: item.stock !== undefined ? Number(item.stock) : (Number(product.stock) || 10),
        price: item.price !== undefined ? Number(item.price) : product.price,
        dropi_variation_id: item.dropi_variation_id || item.dropiVariationId
      };
    });
  }, [product]);

  // Colores únicos reales
  const distinctColors = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    allVariants.forEach(v => {
      const col = extractVariantColor(v);
      if (col && col.toLowerCase() !== 'color único' && col.toLowerCase() !== 'único' && !seen.has(col.toLowerCase())) {
        seen.add(col.toLowerCase());
        list.push(col);
      }
    });
    return list;
  }, [allVariants]);

  // Tallas únicas reales
  const distinctSizes = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    allVariants.forEach(v => {
      const sz = extractVariantSize(v);
      if (sz && sz.toLowerCase() !== 'única' && sz.toLowerCase() !== 'general' && !seen.has(sz.toUpperCase())) {
        seen.add(sz.toUpperCase());
        list.push(sz);
      }
    });
    return list;
  }, [allVariants]);

  const hasDistinctColors = distinctColors.length > 0;
  const hasDistinctSizes = distinctSizes.length > 0;

  // Initialize variants on product open
  useEffect(() => {
    setSizeError(false);
    if (allVariants.length > 0) {
      if (hasDistinctColors) {
        const initialColor = distinctColors[0] || extractVariantColor(allVariants[0]);
        setSelectedColor(initialColor);
      } else {
        setSelectedColor('');
      }

      // Si tiene tallas, dejar deseleccionado para selección obligatoria interactiva
      if (hasDistinctSizes) {
        setSelectedSize('');
        setSelectedVariant(undefined);
      } else {
        const initialVariant = allVariants[0];
        setSelectedVariant(initialVariant);
        setSelectedSize(extractVariantSize(initialVariant));
      }

      // Sincronizar foto inicial
      const initPhoto = allVariants[0]?.image || (allVariants[0] as any)?.imagen || (allVariants[0] as any)?.foto;
      if (initPhoto) {
        const foundIdx = imagesList.findIndex(img => img === initPhoto);
        if (foundIdx !== -1) {
          setActiveImageIndex(foundIdx);
        }
      }
    } else {
      setSelectedVariant(undefined);
      setSelectedColor('');
      setSelectedSize('');
    }
    setQuantity(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, allVariants.length, hasDistinctSizes]);

  // Track product visit once per product id
  useEffect(() => {
    if (product?.id) {
      trackProductVisit(product);
      registerProductObservation(product);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Keep activeImageIndex within valid range if images list changes
  useEffect(() => {
    if (imagesList.length > 0 && activeImageIndex >= imagesList.length) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, imagesList.length]);

  // Track active time spent inspecting this product
  useEffect(() => {
    if (!product?.id) return;
    const interval = setInterval(() => {
      recordTimeSpent(product.id, 2);
    }, 2000);
    return () => clearInterval(interval);
  }, [product?.id, recordTimeSpent]);

  // Prevent background page scrolling when viewing a product
  useEffect(() => {
    if (!product) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [product]);

  if (!product) return null;

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;

  const handleIncrement = () => setQuantity(q => q + 1);
  const handleDecrement = () => setQuantity(q => (q > 1 ? q - 1 : 1));

  // Tallas disponibles para el color activo (o todas si no hay filtro de color)
  const availableSizes = useMemo(() => {
    if (allVariants.length === 0) return [];
    
    let candidateVariants = allVariants;
    if (hasDistinctColors && selectedColor) {
      candidateVariants = allVariants.filter(v => extractVariantColor(v).toLowerCase() === selectedColor.toLowerCase());
      if (candidateVariants.length === 0) candidateVariants = allVariants;
    }

    return candidateVariants.map(v => ({
      variant: v,
      size: extractVariantSize(v),
      stock: v.stock !== undefined ? v.stock : 10,
      dropiVariationId: v.dropi_variation_id || v.dropiVariationId
    }));
  }, [allVariants, hasDistinctColors, selectedColor]);

  const handleSelectColor = (colorName: string) => {
    setSelectedColor(colorName);
    const variantsForColor = allVariants.filter(
      v => extractVariantColor(v).toLowerCase() === colorName.toLowerCase()
    );
    if (variantsForColor.length === 0) return;

    if (selectedSize) {
      const match = variantsForColor.find(
        v => extractVariantSize(v).toUpperCase() === selectedSize.toUpperCase()
      );
      if (match) {
        setSelectedVariant(match);
      }
    }

    // Actualizar foto según color
    const colorPhoto = variantsForColor.find(v => v.image || (v as any)?.imagen)?.image;
    if (colorPhoto) {
      const targetIdx = imagesList.findIndex(img => img === colorPhoto);
      if (targetIdx !== -1) setActiveImageIndex(targetIdx);
    }
  };

  const handleSelectSize = (sizeOpt: { variant: ProductVariant; size: string; stock: number }) => {
    if (sizeOpt.stock <= 0) return;
    setSizeError(false);
    setSelectedSize(sizeOpt.size);
    setSelectedVariant(sizeOpt.variant);
  };

  const currentStock = selectedVariant ? (selectedVariant.stock ?? 10) : product.stock;
  const isOutOfStock = currentStock <= 0;

  // CRO: Precios dinámicos por cantidad y ofertas tipo combo/bundle
  const baseUnitPrice = selectedVariant?.price || product.price;

  const currentPricing = useMemo(() => {
    let discountRate = 0;
    if (quantity === 2) {
      discountRate = 0.10; // 10% OFF
    } else if (quantity >= 3) {
      discountRate = 0.14; // 14% OFF + Envío Gratis
    }

    const regularTotal = baseUnitPrice * quantity;
    const discountedTotal = Math.round(regularTotal * (1 - discountRate));
    const savings = regularTotal - discountedTotal;
    const unitEffectivePrice = Math.round(discountedTotal / quantity);

    return {
      regularTotal,
      discountedTotal,
      savings,
      discountRate,
      unitEffectivePrice
    };
  }, [baseUnitPrice, quantity]);

  // Validaciones antes de añadir al carrito o comprar
  const handleValidateAndAddToCart = () => {
    if (isOutOfStock) return;
    if (hasDistinctSizes && !selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    onAddToCart(product, selectedVariant, quantity, currentPricing.unitEffectivePrice);
    onClose();
  };

  const handleValidateAndBuyNow = () => {
    if (isOutOfStock) return;
    if (hasDistinctSizes && !selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    onBuyNow(product, selectedVariant, quantity, currentPricing.unitEffectivePrice);
    onClose();
  };

  // Compute related & recommended products ("OTROS CLIENTES TAMBIÉN VIERON")
  const relatedProducts = allProducts.filter(p => p.id !== product.id && p.active !== false);
  const sameCategoryProducts = relatedProducts.filter(p => p.categoryId === product.categoryId || p.categoryName === product.categoryName);
  const recommendedItems = (sameCategoryProducts.length >= 3 ? sameCategoryProducts : relatedProducts).slice(0, 10);

  const scrollRelatedLeft = () => {
    if (relatedSliderRef.current) {
      relatedSliderRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const scrollRelatedRight = () => {
    if (relatedSliderRef.current) {
      relatedSliderRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  const handleSelectRelated = (relatedProd: Product) => {
    if (onSelectProduct) {
      onSelectProduct(relatedProd);
    }
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // SKU generation for clean catalog look
  const skuNumber = (product.dropi_product_id || (product as any).dropiProductId || (product as any).dropi_id)
    ? String(product.dropi_product_id || (product as any).dropiProductId || (product as any).dropi_id)
    : (product.id ? product.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7).toUpperCase() : '1123768');

  return (
    <>
      <div 
        id="product-detail-modal-backdrop" 
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto overscroll-contain"
        onClick={onClose}
      >
        <div 
          id="product-detail-modal-dialog" 
          className="bg-white text-slate-900 rounded-3xl max-w-6xl xl:max-w-7xl w-full max-h-[96vh] overflow-hidden shadow-2xl flex flex-col relative border border-slate-200 animate-in fade-in zoom-in-95 duration-200 overscroll-contain my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Window Top Navigation & Breadcrumb Header Bar */}
          <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
            {/* Breadcrumb links */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-hidden truncate">
              <span className="font-semibold text-slate-800 uppercase tracking-wider shrink-0">
                {product.brand || 'Zavela Store'}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600 uppercase tracking-wider shrink-0 truncate">
                {product.categoryName || (product as any).category || (product as any).categoria || 'Catálogo General'}
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-sky-700 font-bold uppercase tracking-wider hidden sm:inline truncate max-w-xs md:max-w-md">
                {product.title}
              </span>
            </div>

            {/* Actions: Share & Close */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                id="btn-top-share-product"
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Compartir por WhatsApp, Facebook, Instagram..."
              >
                <Share2 className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Compartir</span>
              </button>

              <button
                id="btn-close-product-modal"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div 
            ref={modalScrollRef} 
            className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-6 md:p-8 bg-slate-50/50 space-y-8"
          >
            
            {/* 1. TOP HERO SECTION: GALLERY & MODERN E-COMMERCE PURCHASE LAYOUT (INSPIRED BY ILKO) */}
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
              
              {/* Left Column (5 of 12 cols on desktop): Vertical Thumbnails + Large Main Image */}
              <div className="lg:col-span-6 flex flex-col sm:flex-row gap-4">
                
                {/* Vertical Thumbnails List (Desktop left sidebar / Mobile bottom) */}
                {imagesList.length > 1 && (
                  <div 
                    id="product-gallery-thumbnails"
                    className="order-2 sm:order-1 flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto sm:max-h-[500px] shrink-0 p-1 sm:pr-2 scrollbar-thin select-none z-10"
                    aria-label="Miniaturas de fotos del producto"
                  >
                    {imagesList.map((img, index) => (
                      <button
                        key={index}
                        type="button"
                        id={`btn-thumbnail-${index}`}
                        onClick={() => setActiveImageIndex(index)}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-white p-1 relative group/thumb ${
                          activeImageIndex === index 
                            ? 'border-red-600 ring-4 ring-red-500/25 shadow-md scale-105 z-10' 
                            : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100 hover:scale-102'
                        }`}
                        title={`Ver foto ${index + 1}`}
                        aria-label={`Ver foto ${index + 1}`}
                      >
                        <img 
                          src={img} 
                          alt={`Miniatura ${index + 1}`} 
                          className="w-full h-full object-cover rounded-xl pointer-events-none select-none" 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        {activeImageIndex === index && (
                          <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Large Product Photo with interactive controls and swipe */}
                <div className="order-1 sm:order-2 flex-1 flex flex-col items-center w-full">
                  <div 
                    id="product-gallery-main-view"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="aspect-square w-full rounded-2xl bg-white overflow-hidden relative border border-slate-200 p-3 sm:p-5 flex items-center justify-center shadow-xs group select-none touch-pan-y"
                  >
                    <img
                      src={imagesList[activeImageIndex] || product.imagen || (product as any).image}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                    />

                    {/* Counter Badge */}
                    <div className="absolute top-3 left-3 bg-slate-900/75 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md z-10 pointer-events-none">
                      <Camera className="w-3.5 h-3.5 text-slate-200" />
                      <span>📷 {activeImageIndex + 1} / {imagesList.length}</span>
                    </div>

                    {/* Discount Badge */}
                    {product.discountPercentage > 0 && (
                      <span className="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-[11px] sm:text-xs px-3 py-1 rounded-lg uppercase tracking-wider shadow-md z-10 pointer-events-none">
                        -{product.discountPercentage}% OFF
                      </span>
                    )}

                    {/* Warehouse Tag */}
                    <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs text-slate-800 text-[10px] font-mono px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs z-10 pointer-events-none">
                      <Truck className="w-3.5 h-3.5 text-sky-600" />
                      <span>Despacho: {product.warehouseCity || 'Bogotá D.C.'}</span>
                    </div>

                    {/* Flechas de navegación interactivas (< y >) sobre la imagen principal */}
                    {imagesList.length > 1 && (
                      <>
                        <button
                          id="btn-gallery-prev"
                          type="button"
                          onClick={handlePrevImage}
                          aria-label="Foto anterior"
                          title="Foto anterior"
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md border border-slate-200 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer z-20 hover:scale-110 active:scale-95"
                        >
                          <ChevronLeft className="w-5 h-5 text-slate-800" />
                        </button>
                        <button
                          id="btn-gallery-next"
                          type="button"
                          onClick={handleNextImage}
                          aria-label="Foto siguiente"
                          title="Foto siguiente"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md border border-slate-200 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer z-20 hover:scale-110 active:scale-95"
                        >
                          <ChevronRight className="w-5 h-5 text-slate-800" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Puntos indicadores inferiores interactivos (dots rojo/gris) */}
                  {imagesList.length > 1 && (
                    <div 
                      id="product-gallery-dots"
                      className="flex items-center justify-center gap-2 mt-3"
                      aria-label="Indicadores de fotos"
                    >
                      {imagesList.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          id={`btn-gallery-dot-${index}`}
                          onClick={() => setActiveImageIndex(index)}
                          className={`h-2.5 rounded-full transition-all cursor-pointer ${
                            activeImageIndex === index 
                              ? 'w-7 bg-red-600 ring-2 ring-red-400/30' 
                              : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                          }`}
                          aria-label={`Ver foto ${index + 1}`}
                          title={`Foto ${index + 1} de ${imagesList.length}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Quick Trust Bar under photo */}
                  <div className="w-full mt-4 flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">Garantía Oficial Zavela</div>
                        <div className="text-[11px] text-emerald-700 font-medium">Revisión física previa a despacho</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                      100% ORIGINAL
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column (7 of 12 cols on desktop): Product Info, Pricing, Actions (Ilko Structure) */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  
                  {/* Title & SKU (Identical to Ilko reference layout) */}
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-950 uppercase tracking-tight leading-tight">
                      {product.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                        SKU: {skuNumber}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('resenas')}
                        className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-bold hover:underline cursor-pointer transition-colors"
                        title="Ver reseñas positivas y testimonios verificados"
                      >
                        <div className="flex items-center text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="font-mono text-slate-900 font-black">4.9</span>
                        <span className="text-slate-500 font-medium underline">(Opiniones Verificadas)</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          ✓ Pago al Recibir
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Short excerpt description */}
                  <div className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {product.shortDescription || (
                      product.description 
                        ? product.description.split('.').slice(0, 2).join('. ') + '.' 
                        : 'Producto de alta gama con garantía oficial y pago seguro contra entrega en toda Colombia.'
                    )}
                  </div>

                  {/* Pricing Block */}
                  <div className="pt-2 pb-1 border-y border-slate-100">
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl sm:text-3xl lg:text-4xl font-mono font-black text-red-600 tracking-tight">
                        {formatCOP(currentPrice)}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > currentPrice && (
                        <span className="text-base sm:text-lg text-slate-400 line-through font-mono font-semibold">
                          {formatCOP(product.compareAtPrice)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>¡Pagas en efectivo al recibir en tus manos! (Pago Contra Entrega)</span>
                    </p>
                  </div>

                  {/* Urgency Stock Alert (if stock <= 5) */}
                  {currentStock <= 5 && currentStock > 0 && (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-slate-900 flex items-center gap-2.5">
                      <Zap className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                      <div className="text-xs font-bold text-amber-950">
                        ¡Solo quedan {currentStock} unidades en bodega para esta opción! Despachamos hoy mismo.
                      </div>
                    </div>
                  )}

                  {/* Selector de Variantes y Tallas (Ropa, Calzado, Fajas, Accesorios) */}
                  {(hasDistinctColors || hasDistinctSizes) && (
                    <div className="space-y-3 pt-1 pb-1">
                      {/* Paso 1: Seleccionar Color (si el producto tiene colores reales) */}
                      {hasDistinctColors && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                              <span>Paso 1: Seleccionar Color</span>
                            </label>
                            {selectedColor && (
                              <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                {selectedColor}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {distinctColors.map((colorName) => {
                              const isSelected = selectedColor.toLowerCase() === colorName.toLowerCase();
                              const swatch = getColorSwatchInfo(colorName);
                              const colorVariants = allVariants.filter(
                                v => extractVariantColor(v).toLowerCase() === colorName.toLowerCase()
                              );
                              const hasAnyStock = colorVariants.some(v => (v.stock ?? 1) > 0);

                              return (
                                <button
                                  key={colorName}
                                  type="button"
                                  id={`color-btn-${colorName.replace(/\s+/g, '-').toLowerCase()}`}
                                  onClick={() => handleSelectColor(colorName)}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                                    isSelected
                                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                  }`}
                                >
                                  <span 
                                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                                    style={{
                                      backgroundColor: swatch.bg,
                                      border: swatch.border ? `1px solid ${swatch.border}` : '1px solid rgba(0,0,0,0.15)'
                                    }}
                                  />
                                  <span>{colorName}</span>
                                  {!hasAnyStock && (
                                    <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-slate-800 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>
                                      Agotado
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Paso 2: Selector Interactivo de Tallas / Medidas (Obligatorio con Borde Resaltado) */}
                      {hasDistinctSizes && availableSizes.length > 0 && (
                        <div className={`p-3 rounded-2xl transition-all ${
                          sizeError 
                            ? 'border-2 border-rose-500 bg-rose-50/60 ring-2 ring-rose-400/40' 
                            : 'border border-slate-200 bg-slate-50/50'
                        }`}>
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                            <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                                {hasDistinctColors ? '2' : '1'}
                              </span>
                              <span>Selecciona tu Talla:</span>
                              <span className="text-rose-500 text-[11px] font-bold">* Obligatorio</span>
                            </label>
                            {selectedSize ? (
                              <span className="text-xs font-extrabold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                Talla elegida: {selectedSize}
                              </span>
                            ) : (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                sizeError ? 'bg-rose-600 text-white font-black animate-pulse' : 'text-slate-500'
                              }`}>
                                {sizeError ? '⚠️ Selecciona una talla para continuar' : 'Elige tu talla'}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {availableSizes.map((opt) => {
                              const isSelected = selectedSize.toUpperCase() === opt.size.toUpperCase();
                              const isOut = opt.stock <= 0;

                              return (
                                <button
                                  key={opt.variant.id || opt.size}
                                  type="button"
                                  id={`talla-btn-${opt.size.replace(/\s+/g, '-').toLowerCase()}`}
                                  disabled={isOut}
                                  onClick={() => handleSelectSize(opt)}
                                  className={`px-4 py-2.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                                    isOut
                                      ? 'border-slate-200 bg-slate-100 text-slate-400 line-through cursor-not-allowed opacity-60'
                                      : isSelected
                                        ? 'border-red-600 bg-red-600 text-white font-black shadow-md ring-2 ring-red-500/25 scale-102'
                                        : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                                  }`}
                                  title={isOut ? 'Variante agotada en bodega' : `Talla ${opt.size}`}
                                >
                                  <span>{opt.size}</span>
                                  {isOut ? (
                                    <span className="ml-1.5 text-[9px] uppercase font-bold text-rose-500 no-underline inline-block">
                                      (Agotada)
                                    </span>
                                  ) : opt.stock <= 5 ? (
                                    <span className={`ml-1 text-[10px] font-mono ${isSelected ? 'text-red-100' : 'text-amber-700 font-bold'}`}>
                                      ({opt.stock} un.)
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>

                          {sizeError && (
                            <p className="text-rose-600 text-xs font-bold mt-2 flex items-center gap-1">
                              <span>⚠️ Debes seleccionar una talla antes de agregar al carrito o comprar contra entrega.</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Active Selection Summary Card */}
                      {selectedVariant && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-slate-900">
                              ✓ Opción activa: {selectedColor ? `${selectedColor} / ` : ''}{selectedSize || 'Estándar'}
                            </span>
                            {(selectedVariant.dropi_variation_id || selectedVariant.dropiVariationId) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 text-[10px]">
                                📦 Dropi ID: #{selectedVariant.dropi_variation_id || selectedVariant.dropiVariationId}
                              </span>
                            )}
                          </div>
                          <span className={`font-bold text-[11px] ${
                            currentStock > 0 ? 'text-emerald-700' : 'text-rose-600 font-black'
                          }`}>
                            {currentStock > 0 ? `Stock disponible: ${currentStock} un.` : 'Agotado'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🛒 CRO Bundles / Ofertas por Volumen (Motivador Multi-Unidad) */}
                  <div className="space-y-2 pt-1 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔥 Ofertas Especiales por Cantidad:</span>
                      </span>
                      {quantity >= 2 && (
                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                          ¡Ahorras {formatCOP(currentPricing.savings)}!
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Opción 1: 1 Unidad */}
                      <button
                        type="button"
                        onClick={() => setQuantity(1)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          quantity === 1
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-[10px] font-bold opacity-80 uppercase">Opción 1</div>
                        <div className="text-xs font-black">1 Unidad</div>
                        <div className="text-sm font-black mt-1 font-mono">
                          {formatCOP(baseUnitPrice)}
                        </div>
                        <div className="text-[10px] opacity-70 mt-0.5">Precio estándar</div>
                      </button>

                      {/* Opción 2: 2 Unidades - MÁS POPULAR */}
                      <button
                        type="button"
                        onClick={() => setQuantity(2)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          quantity === 2
                            ? 'border-emerald-600 bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30'
                            : 'border-emerald-300 bg-emerald-50/50 text-slate-900 hover:border-emerald-400'
                        }`}
                      >
                        <span className={`absolute -top-2.5 right-2 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs ${
                          quantity === 2 ? 'bg-amber-400 text-slate-950 font-black' : 'bg-emerald-600 text-white'
                        }`}>
                          MÁS POPULAR
                        </span>
                        <div className="text-[10px] font-bold opacity-85 uppercase">Opción 2</div>
                        <div className="text-xs font-black">2 Unidades (10% OFF)</div>
                        <div className="text-sm font-black mt-1 font-mono">
                          {formatCOP(Math.round(baseUnitPrice * 2 * 0.90))}
                        </div>
                        <div className={`text-[10px] font-bold mt-0.5 ${quantity === 2 ? 'text-amber-200' : 'text-emerald-700'}`}>
                          Ahorras {formatCOP(Math.round(baseUnitPrice * 2 * 0.10))}
                        </div>
                      </button>

                      {/* Opción 3: 3 Unidades - MEJOR OFERTA */}
                      <button
                        type="button"
                        onClick={() => setQuantity(3)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          quantity === 3
                            ? 'border-red-600 bg-red-600 text-white shadow-md ring-2 ring-red-500/30'
                            : 'border-red-300 bg-red-50/50 text-slate-900 hover:border-red-400'
                        }`}
                      >
                        <span className={`absolute -top-2.5 right-2 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs ${
                          quantity === 3 ? 'bg-yellow-300 text-slate-950 font-black' : 'bg-red-600 text-white'
                        }`}>
                          14% OFF + ENVÍO
                        </span>
                        <div className="text-[10px] font-bold opacity-85 uppercase">Opción 3</div>
                        <div className="text-xs font-black">3 Unidades (14% OFF)</div>
                        <div className="text-sm font-black mt-1 font-mono">
                          {formatCOP(Math.round(baseUnitPrice * 3 * 0.86))}
                        </div>
                        <div className={`text-[10px] font-bold mt-0.5 ${quantity === 3 ? 'text-yellow-200' : 'text-red-700'}`}>
                          Ahorras {formatCOP(Math.round(baseUnitPrice * 3 * 0.14))}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Social Closing Link Ruleta Banner - ONLY IF ENABLED */}
                  {isSocialClosing && isLuckyWheelEnabled && (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-2 border-amber-400 text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl shrink-0">🎁</span>
                        <div>
                          <div className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                            <span>¡Enlace con Ruleta de Cierre Activado!</span>
                            <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                              5%-15% OFF
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-700 font-medium">
                            Tienes 1 giro de regalo para asegurar tu descuento en este producto contra entrega.
                          </div>
                        </div>
                      </div>
                      {onOpenLuckyWheel && (
                        <button
                          type="button"
                          onClick={onOpenLuckyWheel}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>🎰 Girar Ruleta Ahora</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Quantity Stepper + Direct "AGREGAR" Button Row (Exact Ilko Reference Pattern) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    
                    {/* Stepper (- 1 +) */}
                    <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50 h-12 w-full sm:w-36 justify-between px-2 shrink-0">
                      <button
                        id="btn-qty-minus"
                        onClick={handleDecrement}
                        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span id="qty-counter-display" className="font-mono font-black text-base text-slate-900">
                        {quantity}
                      </span>
                      <button
                        id="btn-qty-plus"
                        onClick={handleIncrement}
                        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Primary Button: AGREGAR AL CARRITO (Red / Ilko style) */}
                    <button
                      id="btn-modal-add-cart"
                      disabled={isOutOfStock}
                      onClick={handleValidateAndAddToCart}
                      className={`flex-1 h-12 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all uppercase tracking-wider shadow-md hover:shadow-lg ${
                        isOutOfStock 
                          ? 'bg-slate-300 cursor-not-allowed opacity-60' 
                          : 'bg-red-600 hover:bg-red-700 active:scale-98 cursor-pointer'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4 text-white" />
                      <span>{isOutOfStock ? 'AGOTADO' : 'AGREGAR AL CARRITO'}</span>
                    </button>
                  </div>

                  {/* 💰 CRO Tarjeta Promocional Dinámica por Cantidad (quantity >= 2) */}
                  {quantity >= 2 && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">🎉</span>
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                              <span>¡Oferta de {quantity} Unidades Aplicada!</span>
                              <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded">
                                {quantity === 2 ? '10% OFF' : '14% OFF + ENVÍO'}
                              </span>
                            </div>
                            <div className="text-sm sm:text-base font-black font-mono mt-0.5">
                              Total a pagar: {formatCOP(currentPricing.discountedTotal)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-1 rounded-xl shadow-xs">
                            ¡Estás ahorrando {formatCOP(currentPricing.savings)}!
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-100 mt-1.5 pt-1.5 border-t border-emerald-500/40">
                        {quantity === 2 
                          ? '10% de descuento en la segunda unidad y flete unificado para todo el pedido.' 
                          : '14% de descuento total en tu combo y despacho prioritario contra entrega.'}
                      </div>
                    </div>
                  )}

                  {/* Fast Buy Now (Pago Contra Entrega) Button */}
                  <button
                    id="btn-modal-buy-now"
                    disabled={isOutOfStock}
                    onClick={handleValidateAndBuyNow}
                    className={`w-full h-12 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all uppercase tracking-wider shadow-md hover:shadow-lg ${
                      isOutOfStock
                        ? 'bg-slate-300 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#E04826] hover:to-[#E02656] active:scale-98 cursor-pointer'
                    }`}
                  >
                    <Zap className="w-4 h-4 fill-white text-white" />
                    <span>{isOutOfStock ? 'PRODUCTO AGOTADO' : 'COMPRAR AHORA (PAGO CONTRA ENTREGA)'}</span>
                  </button>

                  {/* Share & Ruleta Options */}
                  <div className={`grid ${isLuckyWheelEnabled ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2 pt-1`}>
                    {/* Cierre con Ruleta - STRICTLY HIDDEN IF RULETA IS DISABLED */}
                    {isLuckyWheelEnabled && (
                      <button
                        id="btn-modal-share-ruleta"
                        type="button"
                        onClick={() => {
                          setShareInitialMode('ruleta_closing');
                          setIsShareOpen(true);
                        }}
                        className="h-10 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 hover:from-amber-500/25 hover:to-amber-500/20 text-amber-950 border border-amber-400/60 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer shadow-2xs"
                        title="Enviar enlace con Ruleta para cerrar la venta"
                      >
                        <span className="text-sm">🎯</span>
                        <span>Cierre con Ruleta (5%-15%)</span>
                      </button>
                    )}

                    <button
                      id="btn-modal-share-product"
                      type="button"
                      onClick={() => {
                        setShareInitialMode('recommend');
                        setIsShareOpen(true);
                      }}
                      className="h-10 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider cursor-pointer shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Compartir Producto</span>
                    </button>
                  </div>

                  {/* Payment & Logistics Badges (Ilko Reference Footer Style) */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-center gap-2.5 text-xs text-sky-950">
                      <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        ✓
                      </div>
                      <div>
                        <strong>Paga Seguro Contra Entrega</strong> en efectivo al recibir tu paquete en casa u oficina.
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-600">
                      <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <Truck className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-700">Envío Gratis Nacional</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <ShieldCheck className="w-4 h-4 text-slate-500" />
                        <span className="font-semibold">Garantía Oficial 30 Días</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <span className="font-semibold">Pago Seguro al Recibir</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* 2. FULL-WIDTH PRODUCT INFORMATION, SPECIFICATIONS & DETAILS */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden w-full">
              
              {/* Full-Width Navigation Tabs */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 pt-3 gap-2">
                <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto w-full sm:w-auto scrollbar-none">
                  <button
                    onClick={() => setActiveTab('desc')}
                    className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
                      activeTab === 'desc'
                        ? 'border-red-600 text-red-600 font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    <span>Descripción Completa</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('especificaciones')}
                    className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
                      activeTab === 'especificaciones'
                        ? 'border-red-600 text-red-600 font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-slate-600" />
                    <span>Ficha Técnica</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('resenas')}
                    className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
                      activeTab === 'resenas'
                        ? 'border-amber-500 text-amber-800 font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <span>Reseñas Verificadas (4.9 ★)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('garantia')}
                    className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
                      activeTab === 'garantia'
                        ? 'border-red-600 text-red-600 font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Garantía Oficial Zavela</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('envios')}
                    className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
                      activeTab === 'envios'
                        ? 'border-red-600 text-red-600 font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-amber-600" />
                    <span>Envíos Nacionales</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('autoria')}
                    className={`pb-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
                      activeTab === 'autoria'
                        ? 'border-amber-500 text-amber-800 font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Certificado de Autoría</span>
                  </button>
                </div>

                {/* Quick Certificate CTA on large screens */}
                <div className="hidden lg:flex items-center pb-3 shrink-0">
                  <button
                    type="button"
                    onClick={onOpenAuthorCertificate}
                    className="flex items-center gap-1.5 text-xs font-mono text-amber-800 hover:text-amber-950 font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Ver Certificado SM Studio</span>
                  </button>
                </div>
              </div>

              {/* Tab Content Box */}
              <div className="p-5 sm:p-8 w-full">
                
                {/* Tab 1: Descripción Completa */}
                {activeTab === 'desc' && (
                  <div className="space-y-6 w-full animate-in fade-in duration-200">
                    <div className="w-full space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                          Detalles & Descripción Oficial del Producto
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">
                          SKU: #{skuNumber}
                        </span>
                      </div>

                      <div className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal w-full bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200">
                        {product.description || 'Producto con altos estándares de calidad, despachado con garantía oficial y pago contra entrega en toda Colombia.'}
                      </div>
                    </div>

                    {/* Quality Assurance Box */}
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 text-emerald-600">
                          <BadgeCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900">
                            Garantía Oficial Zavela Store & Autoría Verificada
                          </div>
                          <div className="text-xs text-slate-500">
                            Producto 100% inspeccionado antes de despacho. Pago seguro contra entrega al recibir.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <SergioMartinezSignature 
                          variant="stamp" 
                          onClickCertificate={onOpenAuthorCertificate} 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Ficha Técnica */}
                {activeTab === 'especificaciones' && (
                  <div className="space-y-4 w-full animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-xs font-mono font-bold text-slate-500 uppercase">Marca / Fabricante</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">{product.brand || 'Zavela Store'}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-xs font-mono font-bold text-slate-500 uppercase">Categoría</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">{product.categoryName || (product as any).category || (product as any).categoria || 'Catálogo Oficial'}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-xs font-mono font-bold text-slate-500 uppercase">Código SKU</div>
                        <div className="text-sm font-bold text-slate-900 mt-1 font-mono">{skuNumber}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-xs font-mono font-bold text-slate-500 uppercase">Disponibilidad / Stock</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                          {product.stock > 0 ? `${product.stock} unidades en bodega` : 'Bajo pedido'}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-xs font-mono font-bold text-slate-500 uppercase">Tipo de Despacho</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">Nacional Contra Entrega</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-xs font-mono font-bold text-slate-500 uppercase">Garantía de Fábrica</div>
                        <div className="text-sm font-bold text-slate-900 mt-1">{product.warrantyInfo || '30 Días Oficial'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Reseñas y Calificaciones Verificadas */}
                {activeTab === 'resenas' && (
                  <div className="space-y-6 w-full animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-slate-900 font-mono">4.9</span>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-xs text-slate-500 font-mono font-bold">• 100% Clientes Satisfechos</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Testimonios reales con fotos de clientes que recibieron este producto en su domicilio en Colombia.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Pago Contra Entrega Comprobado</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {getVerifiedPositiveReviews(product.title).map(rev => (
                        <div key={rev.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">{rev.customerName} ({rev.customerCity})</span>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {[...Array(rev.rating)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          </div>

                          {rev.customerPhotoUrl && (
                            <div className="rounded-xl overflow-hidden h-28 bg-slate-200 border border-slate-200">
                              <img src={rev.customerPhotoUrl} alt="Foto cliente" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}

                          <p className="text-xs text-slate-700 leading-relaxed italic">
                            "{rev.comment}"
                          </p>

                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200">
                            <span>Transportadora: {rev.carrier || 'Coordinadora'}</span>
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Verificado
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: Garantía Oficial */}
                {activeTab === 'garantia' && (
                  <div className="space-y-6 w-full animate-in fade-in duration-200">
                    <div className="w-full bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center gap-3 text-sky-800">
                        <ShieldCheck className="w-6 h-6 text-sky-600" />
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {product.warrantyInfo || 'Garantía Oficial Zavela: 30 Días por Defectos de Fábrica'}
                        </h3>
                      </div>
                      
                      <p className="text-sm text-slate-700 leading-relaxed">
                        En Zavela Store cuidamos cada detalle. Todos nuestros productos pasan por un riguroso control de calidad antes de salir de bodega y cuentan con respaldo total.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <div className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-600" />
                            100% Inspeccionado
                          </div>
                          <p className="text-xs text-slate-500">
                            Revisión manual de piezas, costuras, mecanismos y accesorios antes de empacar.
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <div className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Cambio Inmediato
                          </div>
                          <p className="text-xs text-slate-500">
                            Si el producto llega con avería o fallo de fábrica, tramitamos tu cambio sin complicaciones.
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <div className="font-bold text-xs text-slate-900 mb-1 flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Soporte Directo
                          </div>
                          <p className="text-xs text-slate-500">
                            Atención personalizada a través de nuestra línea oficial de WhatsApp.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Envíos Nacionales */}
                {activeTab === 'envios' && (
                  <div className="space-y-6 w-full animate-in fade-in duration-200">
                    <div className="w-full bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center gap-3 text-sky-800">
                        <Truck className="w-6 h-6 text-sky-600" />
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          Despachos a los 32 Departamentos de Colombia con Pago Contra Entrega
                        </h3>
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed">
                        Despachamos desde nuestras bodegas principales con las transportadoras más confiables del país: <strong>Servientrega, Interrapidísimo, Coordinadora y Envía</strong>.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <div className="text-xs font-mono font-bold text-sky-700 uppercase mb-1">
                            Tiempo de Entrega
                          </div>
                          <div className="text-sm font-bold text-slate-900">2 a 4 días hábiles</div>
                          <div className="text-xs text-slate-500 mt-1">Ciudades principales y municipios intermedios.</div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <div className="text-xs font-mono font-bold text-emerald-700 uppercase mb-1">
                            Método de Pago
                          </div>
                          <div className="text-sm font-bold text-slate-900">Efectivo al Recibir</div>
                          <div className="text-xs text-slate-500 mt-1">No necesitas tarjetas, pagas en tu puerta.</div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <div className="text-xs font-mono font-bold text-amber-700 uppercase mb-1">
                            Rastreo en Vivo
                          </div>
                          <div className="text-sm font-bold text-slate-900">Guía y Notificaciones</div>
                          <div className="text-xs text-slate-500 mt-1">Seguimiento en línea desde la sección de rastreo.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 5: Certificado de Autoría */}
                {activeTab === 'autoria' && (
                  <div className="space-y-6 w-full animate-in fade-in duration-200">
                    <div className="w-full bg-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden shadow-xl">
                      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-xl">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            CERTIFICADO DE AUTORÍA Y DIRECCIÓN DE ARTE
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-white">
                            Sergio Martínez • SM Diseño y Arte
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            Plataforma de comercio electrónico diseñada y desarrollada bajo estándares de alta fidelidad estética, arquitectura moderna y dirección de diseño exclusivo en Bogotá, Colombia.
                          </p>
                        </div>

                        <div className="shrink-0 flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
                          <SergioMartinezSignature 
                            variant="badge" 
                            onClickCertificate={onOpenAuthorCertificate} 
                          />
                          <button
                            type="button"
                            onClick={onOpenAuthorCertificate}
                            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                          >
                            Abrir Certificado Oficial
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* 3. COMMERCEMIND AI: RECOMENDACIONES PERSONALIZADAS DEBAJO DEL PRODUCTO ACTUAL */}
            <div className="w-full">
              <CommerceMindRecommendationsCarousel
                currentProduct={product}
                allProducts={allProducts}
                cartItems={cartItems}
                variant="modal"
                title="RECOMENDACIONES INTELIGENTES DE COMMERCEMIND AI"
                onSelectProduct={(p) => {
                  handleSelectRelated(p);
                }}
                onAddToCart={(p) => {
                  onAddToCart(p, p.variants?.[0], 1);
                }}
              />
            </div>

          </div>
        </div>
      </div>

      {/* Share Modal Portal */}
      <ProductShareModal
        product={product}
        isOpen={isShareOpen}
        initialMode={shareInitialMode}
        onClose={() => setIsShareOpen(false)}
        isLuckyWheelEnabled={isLuckyWheelEnabled}
      />
    </>
  );
};
