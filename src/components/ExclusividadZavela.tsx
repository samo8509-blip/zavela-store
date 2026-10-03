import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Award, 
  QrCode, 
  CheckCircle2, 
  Truck, 
  ShoppingBag, 
  ArrowRight, 
  Star, 
  Eye, 
  Layers, 
  Sliders, 
  Check, 
  Share2, 
  Clock, 
  Lock,
  Heart,
  ChevronRight,
  ChevronLeft,
  Package,
  Info,
  ExternalLink,
  Zap,
  HelpCircle,
  Gem,
  Compass,
  UserCheck,
  ArrowDown
} from 'lucide-react';
import { 
  StoreSettings, 
  Product, 
  Category,
  ExclusivityBagProduct, 
  PlateOption, 
  PlateShape, 
  PlateFinish,
  CustomPlateSelection,
  CartItem 
} from '../types/index.ts';
import { ZavelaLogo } from './ZavelaLogo.tsx';
import { SergioMartinezSignature } from './SergioMartinezSignature.tsx';
import { TopCategoryNav } from './TopCategoryNav.tsx';
import { DEFAULT_EXCLUSIVITY_SETTINGS, getResolvedExclusivitySettings } from '../utils/exclusivityPresets.ts';

interface ExclusividadZavelaProps {
  settings: StoreSettings;
  products?: Product[];
  categories?: Category[];
  selectedCategoryId?: string;
  onSelectCategory?: (categoryId: string) => void;
  selectedSubcategoryId?: string;
  onSelectSubcategory?: (subcategoryId: string) => void;
  onAddToCart: (item: CartItem) => void;
  onDirectCheckout: (item: CartItem) => void;
  onNavigateHome: () => void;
  onNavigateCatalog: () => void;
  onNavigateTracking: () => void;
  onNavigateExclusivity?: () => void;
  onNavigateSubpage?: (slug: string) => void;
  onOpenCart: () => void;
  cartCount: number;
}

export const ExclusividadZavela: React.FC<ExclusividadZavelaProps> = ({
  settings,
  products = [],
  categories = [],
  selectedCategoryId = 'all',
  onSelectCategory,
  selectedSubcategoryId = 'all',
  onSelectSubcategory,
  onAddToCart,
  onDirectCheckout,
  onNavigateHome,
  onNavigateCatalog,
  onNavigateTracking,
  onOpenCart,
  cartCount
}) => {
  const pageSettings = getResolvedExclusivitySettings(settings.exclusivityPage);
  const bags = pageSettings.curatedProducts || [];
  const plates = pageSettings.plates || [];

  // Scroll detection: When scrolling down, hide the white category bar; when at top, show both
  const [isScrolledDown, setIsScrolledDown] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolledDown(scrolled);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Selected Bag for Customizer / Showcase
  const [selectedBag, setSelectedBag] = useState<ExclusivityBagProduct>(
    bags[0] || DEFAULT_EXCLUSIVITY_SETTINGS.curatedProducts[0]
  );
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Plate Customizer State
  const [selectedShape, setSelectedShape] = useState<PlateShape>(selectedBag?.defaultPlateShape || 'round');
  const [selectedFinish, setSelectedFinish] = useState<PlateFinish>(selectedBag?.defaultPlateFinish || 'gold_engraved');
  const [customEngraving, setCustomEngraving] = useState<string>('');
  const [customQrUrl, setCustomQrUrl] = useState<string>('');
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [selectedModalBag, setSelectedModalBag] = useState<ExclusivityBagProduct | null>(null);
  const [selectedDesignFilter, setSelectedDesignFilter] = useState<string>('all');

  // Finish Color Presets Metadata matching Zavela's high-contrast luxury styling
  const finishOptions: { id: PlateFinish; label: string; desc: string; bgGradient: string; textClass: string; borderClass: string }[] = [
    {
      id: 'gold_engraved',
      label: 'Dorado Grabado 24K',
      desc: 'Latón pulido de alto brillo con relieve profundo',
      bgGradient: 'from-[#FFF3C4] via-[#F59E0B] to-[#92400E]',
      textClass: 'text-[#451A03]',
      borderClass: 'border-[#FBBF24]'
    },
    {
      id: 'black_matte',
      label: 'Negro Mate Obsidiana',
      desc: 'Aluminio anodizado antirreflejo con láser blanco',
      bgGradient: 'from-[#2A2D34] via-[#1A1C20] to-[#0D0E11]',
      textClass: 'text-slate-100',
      borderClass: 'border-slate-700'
    },
    {
      id: 'silver_chrome',
      label: 'Plata Platino Espejo',
      desc: 'Acero quirúrgico con pulido espejo de alta refracción',
      bgGradient: 'from-[#FFFFFF] via-[#E2E8F0] to-[#94A3B8]',
      textClass: 'text-slate-900',
      borderClass: 'border-slate-300'
    },
    {
      id: 'rose_gold',
      label: 'Oro Rosa Romántico',
      desc: 'Aleación cobriza satín con destellos rosados',
      bgGradient: 'from-[#FDE8E8] via-[#FBCFE8] to-[#DB2777]',
      textClass: 'text-[#831843]',
      borderClass: 'border-pink-300'
    }
  ];

  const currentFinishObj = finishOptions.find(f => f.id === selectedFinish) || finishOptions[0];

  // Helper to convert ExclusivityBagProduct into full Product for Cart
  const getProductObject = (bag: ExclusivityBagProduct): Product => {
    return {
      id: bag.id,
      title: `${bag.title} (Edición Rochy 2026)`,
      slug: bag.slug,
      description: bag.description,
      shortDescription: bag.subtitle,
      price: bag.priceCOP,
      compareAtPrice: bag.compareAtPriceCOP,
      discountPercentage: Math.round(((bag.compareAtPriceCOP - bag.priceCOP) / bag.compareAtPriceCOP) * 100),
      stock: bag.stock,
      active: bag.active,
      featured: bag.featured,
      images: bag.images,
      tags: bag.tags,
      categoryId: 'cat-exclusividad',
      categoryName: 'Exclusividad (Bolsos & Placas)',
      variants: [],
      brand: 'Rochy x Zavela Store',
      warehouseCity: 'Bogotá D.C.',
      warrantyInfo: '30 días de garantía directa por defectos de fabricación y certificado de autenticidad Rochy.'
    };
  };

  const handleAddToCartWithPlate = (bag: ExclusivityBagProduct, shape?: PlateShape, finish?: PlateFinish) => {
    const product = getProductObject(bag);
    const chosenShape = shape || selectedShape;
    const chosenFinish = finish || selectedFinish;
    const finishMeta = finishOptions.find(f => f.id === chosenFinish) || currentFinishObj;

    const customPlate: CustomPlateSelection = {
      shape: chosenShape,
      finish: chosenFinish,
      finishLabel: finishMeta.label,
      engravingName: customEngraving.trim() || 'Rochy Identidad Visual',
      brandText: 'Rochy',
      qrDestinationUrl: customQrUrl.trim() || `https://zavelastore.com/autenticidad/${bag.slug}`
    };

    onAddToCart({
      product,
      quantity: 1,
      customPlate
    });

    setAddedToast(`¡${bag.title} con placa ${finishMeta.label} añadido al carrito!`);
    setTimeout(() => setAddedToast(null), 3500);
  };

  const handleDirectCheckoutWithPlate = (bag: ExclusivityBagProduct, shape?: PlateShape, finish?: PlateFinish) => {
    const product = getProductObject(bag);
    const chosenShape = shape || selectedShape;
    const chosenFinish = finish || selectedFinish;
    const finishMeta = finishOptions.find(f => f.id === chosenFinish) || currentFinishObj;

    const customPlate: CustomPlateSelection = {
      shape: chosenShape,
      finish: chosenFinish,
      finishLabel: finishMeta.label,
      engravingName: customEngraving.trim() || 'Rochy Identidad Visual',
      brandText: 'Rochy',
      qrDestinationUrl: customQrUrl.trim() || `https://zavelastore.com/autenticidad/${bag.slug}`
    };

    onDirectCheckout({
      product,
      quantity: 1,
      customPlate
    });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Default pearl and black bag references for lookbook
  const pearlBag = bags.find(b => b.id.includes('pearl') || b.color.toLowerCase().includes('blanco')) || bags[0] || DEFAULT_EXCLUSIVITY_SETTINGS.curatedProducts[0];
  const blackBag = bags.find(b => b.id.includes('black') || b.id.includes('obsidian') || b.color.toLowerCase().includes('negro')) || bags[1] || bags[0] || DEFAULT_EXCLUSIVITY_SETTINGS.curatedProducts[1];

  return (
    <div id="exclusividad-zavela-page" className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#0084FF]/20 selection:text-[#0084FF]">
      
      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed bottom-24 right-6 z-50 bg-[#0084FF] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 animate-bounce">
          <div className="w-7 h-7 rounded-full bg-white text-[#0084FF] flex items-center justify-center font-black text-sm">
            ✓
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider">Añadido con Éxito</div>
            <div className="text-xs text-white/90">{addedToast}</div>
          </div>
          <button 
            onClick={onOpenCart} 
            className="ml-2 bg-[#FF4757] hover:bg-[#ff3042] text-white text-xs font-black px-3 py-1.5 rounded-xl transition shadow-sm"
          >
            Ver Carrito
          </button>
        </div>
      )}

      {/* 1. TOP ANNOUNCEMENT TICKER (VIBRANT ZAVELA GRADIENT) */}
      <div className="bg-gradient-to-r from-[#FF4757] via-[#FF6B81] to-[#FFA502] text-white py-2 px-4 shadow-sm text-xs font-bold flex items-center justify-between overflow-hidden relative">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center">
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-200 fill-yellow-200" />
              Colección Exclusiva 2026
            </span>
            <span>⚡ Envío Gratis y Pago Contra Entrega en Toda Colombia • Grabado Láser y QR Incluidos</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-white/90">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Pago en Puerta al Recibir
            </span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Certificado de Autenticidad Rochy
            </span>
          </div>
        </div>
      </div>

      {/* 2. LUXURY TOP NAVIGATION BAR (Fixed/Sticky Black Bar + Dynamic Collapsible White Category Bar) */}
      <header className="sticky top-0 z-40 shadow-2xl transition-all">
        
        {/* PARTE NEGRA: Official Luxury Dark Bar (Always visible and sticky) */}
        <div className="bg-[#0A0D14]/95 backdrop-blur-md border-b border-white/10 text-white transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
            
            {/* Left Navigation Links */}
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={onNavigateHome}
                className="text-xs sm:text-sm font-bold tracking-widest text-slate-300 hover:text-amber-400 transition uppercase cursor-pointer"
              >
                INICIO
              </button>
              <button
                onClick={() => scrollToSection('stacked-catalog-section')}
                className="text-xs sm:text-sm font-bold tracking-widest text-slate-300 hover:text-amber-400 transition uppercase flex items-center gap-1 cursor-pointer"
              >
                <span>COLECCIÓN</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full font-mono font-black">{bags.length}</span>
              </button>
            </div>

            {/* Center Brand Logo: Official Zavela Store */}
            <div className="flex items-center justify-center">
              <button 
                onClick={onNavigateHome}
                className="flex items-center gap-2 cursor-pointer group focus:outline-none"
                aria-label="Ir a la página principal de Zavela Store"
              >
                <ZavelaLogo size="md" showSlogan={true} theme="dark" />
              </button>
            </div>

            {/* Right Navigation & Cart */}
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={() => scrollToSection('stacked-catalog-section')}
                className="text-xs sm:text-sm font-black tracking-widest text-[#00C4FF] hover:text-white transition uppercase flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>EXCLUSIVIDAD</span>
              </button>

              <button
                onClick={onNavigateTracking}
                className="hidden md:inline-block text-xs sm:text-sm font-bold tracking-widest text-slate-300 hover:text-amber-400 transition uppercase cursor-pointer"
              >
                PERFIL
              </button>

              {/* Shopping Cart Button */}
              <button
                onClick={onOpenCart}
                className="bg-[#FF4757] hover:bg-[#ff3042] text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-[#FF4757]/30 transition hover:scale-105 active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">CARRITO</span>
                <span className="w-5 h-5 rounded-full bg-white text-[#FF4757] flex items-center justify-center text-[10px] font-black">
                  {cartCount}
                </span>
              </button>
            </div>

          </div>
        </div>

        {/* PARTE BLANCA: White Category Navigation Bar (Visible when at top, smoothly hides when scrolling down, reappears when scrolling back up) */}
        <div 
          className={`bg-white/95 backdrop-blur-md transition-all duration-300 ease-in-out ${
            isScrolledDown 
              ? 'max-h-0 opacity-0 border-transparent overflow-hidden pointer-events-none -translate-y-2' 
              : 'max-h-24 opacity-100 border-b border-slate-200 shadow-sm pointer-events-auto translate-y-0'
          }`}
        >
          {categories && categories.length > 0 && (
            <TopCategoryNav
              categories={categories}
              selectedCategoryId={selectedCategoryId || 'all'}
              onSelectCategory={(catId) => {
                if (onSelectCategory) {
                  onSelectCategory(catId);
                } else {
                  onNavigateCatalog();
                }
              }}
              selectedSubcategoryId={selectedSubcategoryId}
              onSelectSubcategory={onSelectSubcategory}
              products={products}
              totalProductsCount={products?.length}
            />
          )}
        </div>
      </header>

      {/* 3. HERO EDITORIAL LOOKBOOK CANVAS */}
      <section id="canva-lookbook-hero" className="relative py-10 lg:py-16 bg-gradient-to-b from-[#0A0D14] via-[#111622] to-[#1E2538] text-white overflow-hidden border-b border-slate-800">
        
        {/* Subtle Background Elements */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-[#0084FF]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Section Introduction Banner */}
          <div className="text-center max-w-3xl mx-auto mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400/20 to-[#0084FF]/20 border border-amber-400/30 px-4 py-1.5 rounded-full text-xs font-black text-amber-300 tracking-wider">
              <Gem className="w-3.5 h-3.5 text-amber-300" />
              <span>{pageSettings.heroBadge}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Colección Exclusiva de Bolsos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto font-light">
              Piezas artesanales únicas con placa metálica grabada en láser y código QR personalizado.
            </p>
          </div>

          {/* MAIN LOOKBOOK STACKED STAGE */}
          <div className="relative rounded-3xl bg-gradient-to-br from-[#ECEFE6] via-[#F4F6F0] to-[#E5E9E1] p-4 sm:p-8 lg:p-10 shadow-2xl border border-white/20 text-slate-900 overflow-hidden">
            
            {/* Background Texture Overlay */}
            <div className="absolute top-0 right-0 w-80 h-80 opacity-10 bg-no-repeat bg-contain pointer-events-none"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
              
              {/* LEFT COLUMN: THE 2026 CATÁLOGO LOOKBOOK CARD */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
                
                {/* Lookbook Poster Container */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-200/90 flex flex-col relative overflow-hidden group h-full">
                  
                  {/* Header: Catálogo 2026 */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Edición</span>
                      <h3 className="text-xl font-serif font-black tracking-tight text-slate-900">CATÁLOGO</h3>
                    </div>
                    <span className="text-sm font-serif italic text-slate-500 font-bold">2026</span>
                  </div>

                  {/* Top Image: Pearl Bag */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 mt-3 shadow-inner">
                    <img 
                      src={pearlBag.images[0]} 
                      alt={pearlBag.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      {pearlBag.color}
                    </div>
                  </div>

                  {/* Bottom Image: Black Bag Held by Hand */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 mt-3 shadow-inner">
                    <img 
                      src={blackBag.images[0]} 
                      alt={blackBag.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                    <div className="absolute bottom-2 left-2 bg-[#0084FF] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                      Tejido en Cuentas Facetadas
                    </div>
                  </div>

                  {/* Floating Mini Action Cards Stacked Below */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {/* Mini Card 1: Identificadora de Marca */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <div className="text-[9px] font-black text-slate-800 uppercase">Catálogo</div>
                      <div className="text-[8px] text-slate-500 line-clamp-1">Identificadora de Marca</div>
                      <button
                        onClick={() => handleDirectCheckoutWithPlate(pearlBag)}
                        className="mt-2 w-full py-2 bg-slate-950 hover:bg-slate-800 text-white text-[9px] font-black rounded-lg transition"
                      >
                        COMPRAR
                      </button>
                    </div>

                    {/* Mini Card 2: Diseñadora de Marca */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <div className="text-[9px] font-black text-slate-800 uppercase">Catálogo</div>
                      <div className="text-[8px] text-slate-500 line-clamp-1">Diseñadora de Marca</div>
                      <button
                        onClick={() => handleDirectCheckoutWithPlate(blackBag)}
                        className="mt-2 w-full py-2 bg-slate-950 hover:bg-slate-800 text-white text-[9px] font-black rounded-lg transition"
                      >
                        COMPRAR
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              {/* RIGHT COLUMN: MACRO BAG & DETAILS */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
                
                {/* Macro Bag Crystal Weave Shot */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-200/90 flex flex-col justify-between h-full space-y-4">
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-200">
                    <img 
                      src={blackBag.images[0]} 
                      alt="Macro Cuentas Rochy" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-5">
                      <div className="text-white space-y-1.5">
                        <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded uppercase">
                          Hecho a Mano en Colombia
                        </span>
                        <h4 className="text-base sm:text-lg font-black">Cuentas Facetadas de Alta Densidad</h4>
                        <p className="text-xs text-slate-200">
                          Más de 1.400 cuentas engarzadas una a una con hilo de alta resistencia y acabados de lujo.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-left">
                      <div className="text-xs font-black text-slate-900 uppercase">Personalización Exclusiva</div>
                      <div className="text-[11px] text-slate-600">Elige el color, forma de placa metálica y grabado láser con código QR.</div>
                    </div>
                    <button
                      onClick={() => scrollToSection('plate-customizer-section')}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#0084FF] hover:bg-[#0070db] text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Personalizar Ahora</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 4. INTERACTIVE 3D CUSTOMIZER STACK (Select bag + plate shape + finish + custom text + QR) */}
      <section id="plate-customizer-section" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
            <span className="text-xs font-black uppercase tracking-wider text-[#0084FF] bg-[#0084FF]/10 px-3.5 py-1 rounded-full">
              Personalizador en Vivo
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950">
              Personaliza tu Bolso con su Placa de Identidad
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Elige el modelo de bolso artesanal, la geometría de la placa, el acabado metálico y tu grabado láser o enlace QR personalizado.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-[#F8FAFC] p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl">
            
            {/* Left Column: Live 3D Plate & Bag Preview */}
            <div className="lg:col-span-5 flex flex-col items-center space-y-5">
              
              {/* Bag Base Preview */}
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 relative shadow-md">
                <img
                  src={selectedBag.images[activeImageIndex] || selectedBag.images[0]}
                  alt={selectedBag.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Modelo Base: {selectedBag.title}</span>
                </div>

                {/* Thumbnails */}
                {selectedBag.images.length > 1 && (
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    {selectedBag.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-9 h-9 rounded-lg overflow-hidden border-2 transition ${
                          activeImageIndex === idx ? 'border-[#0084FF] scale-105' : 'border-white/80 opacity-70'
                        }`}
                      >
                        <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Live Realistic Metallic Plate Preview Card */}
              <div className="w-full p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white border border-slate-800 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
                <div className="text-[10px] uppercase font-black tracking-widest text-[#00C4FF] mb-2">
                  Vista Previa en Tiempo Real de tu Placa
                </div>

                {/* Render Selected Shape & Finish */}
                {selectedShape === 'round' ? (
                  <div className={`w-36 h-36 rounded-full bg-gradient-to-br ${currentFinishObj.bgGradient} p-1.5 shadow-2xl flex items-center justify-center border-4 ${currentFinishObj.borderClass} my-2 transform hover:scale-105 transition duration-300`}>
                    <div className="w-full h-full rounded-full bg-black/10 p-2 flex flex-col items-center justify-center text-center shadow-inner relative">
                      <div className={`text-[11px] font-serif font-black tracking-widest ${currentFinishObj.textClass}`}>
                        ROCHY
                      </div>
                      <div className={`text-[7px] font-bold tracking-wider opacity-90 ${currentFinishObj.textClass}`}>
                        IDENTIDAD VISUAL
                      </div>
                      
                      <div className="my-1 p-0.5 bg-white rounded shadow-sm">
                        <QrCode className="w-7 h-7 text-slate-950" />
                      </div>

                      <div className={`text-[6.5px] font-mono font-bold truncate max-w-[95px] ${currentFinishObj.textClass}`}>
                        {customEngraving || 'Edición 2026'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`w-52 h-26 rounded-xl bg-gradient-to-br ${currentFinishObj.bgGradient} p-1.5 shadow-2xl flex items-center justify-center border-4 ${currentFinishObj.borderClass} my-3 transform hover:scale-105 transition duration-300`}>
                    <div className="w-full h-full rounded-lg bg-black/10 px-3 py-1 flex items-center justify-between gap-2 shadow-inner">
                      <div className="text-left space-y-0.5">
                        <div className={`text-[12px] font-serif font-black tracking-widest ${currentFinishObj.textClass}`}>
                          ROCHY
                        </div>
                        <div className={`text-[7px] font-bold tracking-wider ${currentFinishObj.textClass}`}>
                          IDENTIDAD VISUAL
                        </div>
                        <div className={`text-[6.5px] font-mono font-bold truncate max-w-[85px] ${currentFinishObj.textClass}`}>
                          {customEngraving || 'Edición 2026'}
                        </div>
                      </div>

                      <div className="p-1 bg-white rounded shadow-sm shrink-0">
                        <QrCode className="w-7 h-7 text-slate-950" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-300 mt-1 font-mono">
                  Acabado: <span className="text-amber-300 font-bold">{currentFinishObj.label}</span>
                </div>
              </div>

            </div>

            {/* Right Column: Customizer Controls */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* 1. Seleccionar Bolso */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-between mb-2">
                  <span>1. Selecciona el Modelo de Bolso:</span>
                  <span className="text-[#0084FF] font-black text-sm">${selectedBag.priceCOP.toLocaleString('es-CO')} COP</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {bags.map(bag => (
                    <button
                      key={bag.id}
                      onClick={() => {
                        setSelectedBag(bag);
                        setActiveImageIndex(0);
                      }}
                      className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                        selectedBag.id === bag.id
                          ? 'border-[#0084FF] bg-white ring-2 ring-[#0084FF]/20 shadow-md'
                          : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={bag.images[0]}
                        alt={bag.title}
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-slate-900 truncate">{bag.title}</div>
                        <div className="text-[10px] text-emerald-600 font-bold font-mono">
                          ${bag.priceCOP.toLocaleString('es-CO')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Seleccionar Forma de la Placa */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-800 block mb-2">
                  2. Geometría de la Placa Metálica:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedShape('round')}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                      selectedShape === 'round'
                        ? 'border-[#0084FF] bg-white ring-2 ring-[#0084FF]/20 shadow-md font-bold'
                        : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full border-2 border-amber-400 bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">Placa Circular (3 cm Ø)</div>
                      <div className="text-[10px] text-slate-500">QR en el centro</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedShape('rectangular')}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                      selectedShape === 'rectangular'
                        ? 'border-[#0084FF] bg-white ring-2 ring-[#0084FF]/20 shadow-md font-bold'
                        : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-9 h-6 rounded-lg border-2 border-cyan-400 bg-slate-900 text-cyan-400 flex items-center justify-center shrink-0">
                      <QrCode className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">Placa Rectangular (3x1.5 cm)</div>
                      <div className="text-[10px] text-slate-500">QR lateral</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. Seleccionar Acabado Metálico */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-800 block mb-2">
                  3. Acabado Metálico Premium:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {finishOptions.map(finish => (
                    <button
                      key={finish.id}
                      onClick={() => setSelectedFinish(finish.id)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                        selectedFinish === finish.id
                          ? 'border-[#0084FF] bg-white ring-2 ring-[#0084FF]/20 shadow-md'
                          : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${finish.bgGradient} border border-slate-400/40 shadow-sm shrink-0`}></div>
                      <div>
                        <div className="text-xs font-black text-slate-900">{finish.label}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{finish.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Dedicatoria o Grabado Láser Personalizado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Grabado Personalizado en Láser:
                  </label>
                  <input
                    type="text"
                    value={customEngraving}
                    onChange={(e) => setCustomEngraving(e.target.value)}
                    placeholder="Ej. Sofia Gomez o Edición VIP"
                    maxLength={24}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-[#0084FF] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Enlace QR Personalizado:
                  </label>
                  <input
                    type="url"
                    value={customQrUrl}
                    onChange={(e) => setCustomQrUrl(e.target.value)}
                    placeholder="https://instagram.com/tu_perfil"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-[#0084FF] outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons for Customizer */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleAddToCartWithPlate(selectedBag)}
                  className="flex-1 py-4 px-6 rounded-2xl bg-[#0084FF] hover:bg-[#0070db] text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-[#0084FF]/25 transition flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Añadir al Carrito con Placa {currentFinishObj.label}</span>
                </button>

                <button
                  onClick={() => handleDirectCheckoutWithPlate(selectedBag)}
                  className="flex-1 py-4 px-6 rounded-2xl bg-[#FF4757] hover:bg-[#ff3042] text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-[#FF4757]/25 transition flex items-center justify-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  <span>Comprar Ahora • Pago Contra Entrega</span>
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 5. ALL DESIGNS STACKED SECTION (Catálogo de Bolsos y Placas Todo en Una Sola Página Apilada) */}
      <section id="stacked-catalog-section" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#0084FF] bg-[#0084FF]/10 px-3 py-1 rounded-full">
                Colección Exclusiva de Bolsos 2026
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950 mt-1">
                Diferentes Diseños y Modelos de Bolsos
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Explora cada diseño artesanal con sus acabados de cuentas, colores únicos y placa grabada en láser con código QR.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-100 shadow-sm">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Envío Gratis a Toda Colombia • Pagas al Recibir</span>
            </div>
          </div>

          {/* Design Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedDesignFilter('all')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                selectedDesignFilter === 'all'
                  ? 'bg-slate-950 text-white shadow-lg ring-2 ring-slate-950/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos los Diseños ({bags.length})
            </button>
            {bags.map(bag => (
              <button
                key={bag.id}
                onClick={() => setSelectedDesignFilter(bag.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2.5 transition cursor-pointer ${
                  selectedDesignFilter === bag.id
                    ? 'bg-[#0084FF] text-white shadow-lg shadow-[#0084FF]/30 ring-2 ring-[#0084FF]/30 font-black'
                    : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span 
                  className="w-3 h-3 rounded-full border border-black/20 shrink-0" 
                  style={{
                    backgroundColor: bag.color.toLowerCase().includes('blanco') ? '#F8FAFC' :
                                    bag.color.toLowerCase().includes('negro') || bag.color.toLowerCase().includes('obsidiana') ? '#0F172A' :
                                    bag.color.toLowerCase().includes('oro') || bag.color.toLowerCase().includes('champ') ? '#D97706' :
                                    bag.color.toLowerCase().includes('rub') || bag.color.toLowerCase().includes('rojo') ? '#DC2626' :
                                    bag.color.toLowerCase().includes('esmeralda') || bag.color.toLowerCase().includes('verde') ? '#059669' :
                                    bag.color.toLowerCase().includes('zafiro') || bag.color.toLowerCase().includes('azul') ? '#2563EB' : '#64748B'
                  }} 
                />
                <span>{bag.color}</span>
              </button>
            ))}
          </div>

          {/* STACKED BAGS LIST */}
          <div className="space-y-8">
            {bags
              .filter(bag => selectedDesignFilter === 'all' || bag.id === selectedDesignFilter)
              .map((bag, index) => {
              const discount = Math.round(((bag.compareAtPriceCOP - bag.priceCOP) / bag.compareAtPriceCOP) * 100);
              const isEven = index % 2 === 0;

              return (
                <div 
                  key={bag.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden group hover:border-[#0084FF]/40"
                >
                  <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center ${
                    isEven ? '' : 'lg:flex-row-reverse'
                  }`}>
                    
                    {/* Left/Right Product Imagery */}
                    <div className="lg:col-span-5 relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
                      <img
                        src={bag.images[0]}
                        alt={bag.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />

                      {/* Floating Discount & Availability */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        <span className="bg-[#FF4757] text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-md">
                          {discount}% DE DESCUENTO
                        </span>
                        <span className="bg-emerald-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-xl shadow-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Stock Disponible
                        </span>
                      </div>

                      {/* Designer Stamp on Image */}
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-amber-300 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-400/30">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Diseño Rochy 2026</span>
                      </div>
                    </div>

                    {/* Product Details & Purchase Stack */}
                    <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>{bag.rating}</span>
                            <span className="text-slate-400 text-[11px]">({bag.reviewCount} valoraciones de clientas)</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            ID: #{bag.id}
                          </span>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-black text-slate-950 group-hover:text-[#0084FF] transition leading-snug">
                          {bag.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {bag.description}
                        </p>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-2">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Material:</span>
                            <span className="font-bold text-slate-800">{bag.material}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Medidas:</span>
                            <span className="font-bold text-slate-800">{bag.dimensions}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] col-span-2 sm:col-span-1">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Color:</span>
                            <span className="font-bold text-slate-800">{bag.color}</span>
                          </div>
                        </div>

                        {/* Plate Included Callout */}
                        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-amber-700 shrink-0" />
                            <span><strong>Incluye:</strong> Placa metálica maciza grabada en láser con código QR de autor</span>
                          </div>
                          <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                            Sin Costo Extra
                          </span>
                        </div>
                      </div>

                      {/* Pricing & CTA Controls */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl sm:text-3xl font-black text-slate-950">
                              ${bag.priceCOP.toLocaleString('es-CO')} COP
                            </span>
                            <span className="text-sm text-slate-400 line-through">
                              ${bag.compareAtPriceCOP.toLocaleString('es-CO')}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Pago Contra Entrega en Toda Colombia
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                          <button
                            onClick={() => {
                              setSelectedBag(bag);
                              scrollToSection('plate-customizer-section');
                            }}
                            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <Sliders className="w-4 h-4 text-[#0084FF]" />
                            <span>Personalizar Placa</span>
                          </button>

                          <button
                            onClick={() => handleDirectCheckoutWithPlate(bag)}
                            className="flex-1 sm:flex-none py-3 px-6 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                          >
                            <Truck className="w-4 h-4" />
                            <span>Comprar COD</span>
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 6. OFFICIAL QUALITY CERTIFICATE & SERGIO MARTINEZ GUARANTEE */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-gradient-to-br from-[#F8FAFC] to-white rounded-3xl border-2 border-[#0084FF]/20 p-6 sm:p-10 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#0084FF]/5 rounded-bl-full pointer-events-none"></div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              
              <div className="md:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#0084FF] bg-[#0084FF]/10 px-3 py-1 rounded-full uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Certificado Oficial de Origen y Autoría</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-950">
                  Garantía de Excelencia Artesanal Rochy & Zavela Store
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {pageSettings.craftsmanshipGuaranteeText} Cada bolso es inspeccionado meticulosamente antes del despacho para certificar la tensión del tejido, la nitidez del grabado láser en la placa y la lectura impecable del código QR.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Placa Metálica Maciza</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Caja de Regalo de Lujo</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Funda Antipolvo</span>
                  </div>
                </div>
              </div>

              {/* Signature Endorsement */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-5 bg-white rounded-2xl border border-slate-200 text-center shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2 shadow-sm">
                  <Award className="w-6 h-6" />
                </div>
                <div className="text-xs font-black text-slate-900">Sello de Aprobación</div>
                <div className="text-[10px] text-slate-500 mb-3">Dirección Creativa Zavela Store</div>
                
                <div className="w-full flex justify-center py-1">
                  <SergioMartinezSignature />
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">Certificación COD Colombia</div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 8. LUXURY BLACK FOOTER (Exclusividad & Rochy Diseñadora de Marca) */}
      <footer className="bg-[#07090E] text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800/80 items-start">
            
            {/* Column 1: Zavela Store + Rochy Black Circular Emblem */}
            <div className="md:col-span-5 space-y-4">
              {/* Zavela Store Dark Logo */}
              <button 
                onClick={onNavigateHome}
                className="text-left cursor-pointer transition-opacity hover:opacity-90 focus:outline-none"
                aria-label="Ir al inicio de Zavela Store"
              >
                <ZavelaLogo size="sm" showSlogan={true} theme="dark" />
              </button>

              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                Subpágina oficial de la línea de bolsos de mano de cuentas con placas de autenticidad Rochy. Cobertura con Pago Contra Entrega en toda Colombia.
              </p>
            </div>

            {/* Column 2: Navigation Links */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Navegación
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={onNavigateHome} className="text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer">
                    <span className="text-amber-400 font-bold">›</span> Inicio Principal
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateCatalog} className="text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer">
                    <span className="text-amber-400 font-bold">›</span> Catálogo General
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('stacked-catalog-section')} className="text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer">
                    <span className="text-amber-400 font-bold">›</span> Modelos de Bolsos
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('plate-customizer-section')} className="text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer">
                    <span className="text-amber-400 font-bold">›</span> Personalizar Placa QR
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateTracking} className="text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer">
                    <span className="text-amber-400 font-bold">›</span> Rastrear mi Pedido
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Attention & Guarantees */}
            <div className="md:col-span-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Garantía y Despachos
              </h4>
              <div className="space-y-2.5 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Pago Contra Entrega disponible en toda Colombia</span>
                </div>
                <div>WhatsApp Directo: <strong className="text-slate-200">{settings.whatsappNumber || '+57 315 789 4512'}</strong></div>
                <div>Horario: Lunes a Sábado: 8:00 AM - 7:00 PM</div>
                <div className="pt-1 flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-300">
                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Servientrega</span>
                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Coordinadora</span>
                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Interrapidísimo</span>
                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Envía</span>
                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">TCC</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>© {new Date().getFullYear()} ZAVELA STORE Colombia. Todos los derechos reservados.</div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-amber-400/90 font-medium">Diseño Exclusivo por Rochy</span>
              <span>•</span>
              <span>Pago Contra Entrega</span>
              <span>•</span>
              <span>Envíos Nacionales</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
