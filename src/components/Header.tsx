import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  Search, 
  Truck, 
  X, 
  User, 
  ChevronDown, 
  Menu,
  CheckCircle2,
  LogOut,
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  Flame,
  Headphones,
  ArrowRight,
  Home,
  Smartphone,
  Sparkle,
  Moon
} from 'lucide-react';
import { Category, CartItem, Product, CustomSubpage, StoreSettings } from '../types/index.ts';
import { CustomerUser } from '../utils/customerAuthManager.ts';
import { ZavelaLogo } from './ZavelaLogo.tsx';
import { SeasonalLogoWrapper } from './SeasonalThemeOrnaments.tsx';
import { resolveActiveSeasonalTheme } from '../utils/seasonalThemes.ts';
import { DEFAULT_CATEGORIES } from '../data/categories.ts';

interface HeaderProps {
  settings?: StoreSettings | null;
  categories?: Category[];
  selectedCategory?: string;
  selectedCategoryId?: string;
  onSelectCategory?: (slugOrId: string) => void;
  onSelectCategoryId?: (categoryId: string) => void;
  selectedSubcategoryId?: string;
  onSelectSubcategoryId?: (subcategoryId: string) => void;
  products?: Product[];
  totalProductsCount?: number;
  cartCount?: number;
  cartItems?: CartItem[];
  onOpenCart: () => void;
  onOpenTracking: () => void;
  onOpenCustomerOrders?: () => void;
  currentCustomer?: CustomerUser | null;
  onOpenCustomerAuth?: (tab?: 'login' | 'register') => void;
  onOpenCustomerProfile?: () => void;
  onCustomerLogout?: () => void;
  onGoHome?: () => void;
  onNavigateQuienesSomos?: () => void;
  onNavigateExclusivity?: () => void;
  onNavigateSubpage?: (slug: string) => void;
  isExclusivityActive?: boolean;
  exclusivityPageEnabled?: boolean;
  exclusivityNavTitle?: string;
  customSubpages?: CustomSubpage[];
  isAdminView?: boolean;
  onToggleAdmin: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSecretLogin?: boolean;
  showCategoryNav?: boolean;
  activePaletteId?: string;
  onOpenPaletteModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  categories = [],
  selectedCategory = 'todos',
  selectedCategoryId = 'all',
  onSelectCategory = (_slug: string) => {},
  onSelectCategoryId,
  selectedSubcategoryId = 'all',
  onSelectSubcategoryId,
  products = [],
  totalProductsCount,
  cartCount,
  cartItems = [],
  onOpenCart,
  onOpenTracking,
  onOpenCustomerOrders,
  currentCustomer = null,
  onOpenCustomerAuth,
  onOpenCustomerProfile,
  onCustomerLogout,
  onGoHome,
  onNavigateQuienesSomos,
  onNavigateSubpage,
  customSubpages = [],
  isAdminView = false,
  onToggleAdmin,
  searchQuery,
  onSearchChange
}) => {
  const seasonalInfo = resolveActiveSeasonalTheme(settings);
  const activeSeasonalThemeId = seasonalInfo.activeThemeId;

  // Dropdown & Modal states
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCatalogOpen, setIsMobileCatalogOpen] = useState(false);
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false);
  const [isQuienesSomosModalOpen, setIsQuienesSomosModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);

  const customerMenuRef = useRef<HTMLDivElement>(null);
  const megaMenuContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (customerMenuRef.current && !customerMenuRef.current.contains(target)) {
        setIsCustomerMenuOpen(false);
      }
      if (megaMenuContainerRef.current && !megaMenuContainerRef.current.contains(target)) {
        setIsMegaMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalCartCount = cartCount !== undefined 
    ? cartCount 
    : cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCategorySelection = (catId: string) => {
    if (onSelectCategoryId) {
      onSelectCategoryId(catId);
    } else {
      if (catId === 'all') {
        onSelectCategory('todos');
      } else {
        const found = categories.find(c => c.id === catId);
        onSelectCategory(found ? found.slug : catId);
      }
    }
    if (onSelectSubcategoryId) {
      onSelectSubcategoryId('all');
    }
    setIsMegaMenuOpen(false);
    setIsMobileMenuOpen(false);

    setTimeout(() => {
      document.getElementById('catalog-products-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleHomeClick = () => {
    if (onGoHome) onGoHome();
    handleCategorySelection('all');
    onSearchChange('');
    setIsMegaMenuOpen(false);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOfertasClick = () => {
    handleHomeClick();
    setTimeout(() => {
      document.getElementById('catalog-products-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleQuienesSomosClick = () => {
    setIsMegaMenuOpen(false);
    setIsMobileMenuOpen(false);

    if (onNavigateQuienesSomos) {
      onNavigateQuienesSomos();
      return;
    }

    const matchingSubpage = (customSubpages || []).find(
      sp => sp.slug.includes('quienes') || 
            sp.slug.includes('nosotros') || 
            sp.title.toLowerCase().includes('quiénes') || 
            sp.title.toLowerCase().includes('nosotros') ||
            sp.title.toLowerCase().includes('historia')
    );

    if (matchingSubpage && onNavigateSubpage) {
      onNavigateSubpage(matchingSubpage.slug);
    } else if (onNavigateSubpage) {
      onNavigateSubpage('quienes-somos');
    } else {
      setIsQuienesSomosModalOpen(true);
    }
  };

  // Función corregida para ir a la Zona +18 usando redirección nativa
  const handleAdultZoneClick = () => {
    setIsMegaMenuOpen(false);
    setIsMobileMenuOpen(false);
    window.location.href = '/zavelastoresex';
  };

  const baseCategories = (categories && categories.length > 0)
    ? categories
    : ((typeof window !== 'undefined' && Array.isArray((window as any).__INITIAL_CATEGORIES__) && (window as any).__INITIAL_CATEGORIES__.length > 0)
      ? (window as any).__INITIAL_CATEGORIES__
      : DEFAULT_CATEGORIES);

  const activeCategories = baseCategories.filter(
    (c: Category) => c.active !== false && c.name && !c.name.toLowerCase().includes('sexshop') && !c.name.toLowerCase().includes('adult') && !c.name.toLowerCase().includes('asesor') && !c.name.toLowerCase().includes('admin')
  );

  const activeCategoryId = selectedCategoryId !== 'all' 
    ? selectedCategoryId 
    : (selectedCategory === 'todos' ? 'all' : (categories.find(c => c.slug === selectedCategory)?.id || 'all'));

  return (
    <>
      <div id="top-announcement-bar" className="w-full max-w-[100vw] overflow-hidden bg-slate-900 text-white text-xs py-1.5 px-2.5 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981] shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-200 truncate">
              Envío Gratis Nacional y <strong className="text-emerald-400 font-bold uppercase">Pago Contra Entrega</strong> (Pagas al recibir)
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-5 text-slate-300 text-[10px] sm:text-[11px] flex-wrap sm:flex-nowrap">
            <button 
              id="top-bar-contact-btn"
              onClick={() => setIsContactModalOpen(true)}
              className="hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Atención</span>
            </button>

            <button 
              id="top-bar-track-order-btn"
              onClick={onOpenTracking}
              className="hover:text-sky-400 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Truck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Rastreo</span>
            </button>

            <button 
              id="top-bar-warranties-btn"
              onClick={() => setIsWarrantyModalOpen(true)}
              className="hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Garantías</span>
            </button>
          </div>
        </div>
      </div>

      <header 
        id="main-store-header" 
        ref={megaMenuContainerRef}
        className="sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-slate-200/90 shadow-xs text-slate-900 transition-all w-full max-w-[100vw] overflow-visible"
      >
        <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-1.5 sm:gap-4 lg:gap-8 w-full">
            <Link 
              to="/"
              id="logo-brand-btn"
              onClick={handleHomeClick}
              className="flex items-center text-left cursor-pointer group focus:outline-none shrink min-w-0 no-underline"
              aria-label="Ir a la página principal de Zavela Store"
            >
              <div className="transform scale-[0.80] xs:scale-90 sm:scale-100 origin-left shrink min-w-0">
                <SeasonalLogoWrapper
                  themeId={activeSeasonalThemeId}
                  size="md"
                  glowEnabled={settings?.themeStyles?.neonGlowEnabled ?? (activeSeasonalThemeId !== 'standard-light')}
                >
                  <ZavelaLogo 
                    size="md" 
                    showSlogan={false} 
                    showAnimatedCart={true}
                    theme="light" 
                    seasonalTheme={activeSeasonalThemeId} 
                    animated={true}
                  />
                </SeasonalLogoWrapper>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs font-bold uppercase tracking-wider text-slate-800 shrink-0">
              <Link
                to="/"
                id="nav-link-inicio"
                onClick={handleHomeClick}
                className={`py-2 transition-colors cursor-pointer no-underline ${
                  activeCategoryId === 'all' && !searchQuery && window.location.pathname === '/'
                    ? 'text-sky-600 font-black'
                    : 'hover:text-sky-600'
                }`}
              >
                Inicio
              </Link>

              <div 
                className="catalog-dropdown-container group/catalog relative py-2"
                onMouseEnter={() => setIsMegaMenuOpen(true)}
                onMouseLeave={() => setIsMegaMenuOpen(false)}
              >
                <a
                  href="/catalogo"
                  id="nav-link-catalogo"
                  onClick={(e) => {
                    if (window.innerWidth < 1024) {
                      e.preventDefault();
                      setIsMegaMenuOpen(!isMegaMenuOpen);
                    }
                  }}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer no-underline ${
                    activeCategoryId !== 'all' || isMegaMenuOpen
                      ? 'text-sky-600 font-black'
                      : 'text-slate-800 hover:text-sky-600'
                  }`}
                  aria-expanded={isMegaMenuOpen}
                  aria-haspopup="true"
                >
                  <span>Catálogo</span>
                  <ChevronDown className={`catalog-chevron w-3.5 h-3.5 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180 text-sky-600' : 'text-slate-400 group-hover/catalog:rotate-180 group-hover/catalog:text-sky-600'}`} />
                </a>

                {/* Pure CSS Dropdown: siempre en el DOM, visible con :hover y :focus-within por CSS o por isMegaMenuOpen */}
                <div 
                  className={`catalog-dropdown-menu ${isMegaMenuOpen ? 'is-open' : ''} absolute top-full left-1/2 -translate-x-1/4 sm:-translate-x-1/3 md:-translate-x-1/2 w-[840px] max-w-[92vw] bg-white shadow-2xl border border-slate-200/90 rounded-2xl p-6 z-50 animate-in fade-in slide-in-from-top-1 duration-150`}
                  role="menu"
                  aria-label="Categorías del Catálogo"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
                        <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-xs">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                          Nuestras Categorías
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {activeCategories.map(cat => {
                          const catSlug = cat.slug || cat.id;
                          const count = products.filter(p => p.categoryId === cat.id || p.categoryName === cat.name).length;
                          return (
                            <a
                              key={cat.id}
                              href={`/catalogo?categoria=${encodeURIComponent(catSlug)}`}
                              onClick={(e) => {
                                e.preventDefault();
                                handleCategorySelection(cat.id);
                              }}
                              className="group/item text-left p-3 rounded-xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50 transition-all flex items-center gap-3 cursor-pointer no-underline text-slate-800 min-h-[56px]"
                            >
                              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 group-hover/item:bg-white group-hover/item:border-sky-300 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-4 h-4 text-slate-400 group-hover/item:text-sky-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-slate-800 group-hover/item:text-sky-700 leading-snug break-words whitespace-normal">
                                  {cat.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {count > 0 ? `${count} productos` : 'Ver catálogo'}
                                </p>
                              </div>
                            </a>
                          );
                        })}
                        
                        {activeCategories.length === 0 && (
                          <p className="text-xs text-slate-400 col-span-full">No hay categorías configuradas.</p>
                        )}
                      </div>
                    </div>

                    <div className="md:w-72 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white rounded-2xl p-5 flex flex-col justify-between shadow-md shrink-0">
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-black flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Pago Contra Entrega</span>
                        </span>
                        <h3 className="font-black text-sm text-white leading-tight">
                          Compra segura a nivel nacional
                        </h3>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          Revisa los productos en casa antes de pagar en efectivo al domiciliario.
                        </p>
                      </div>

                      <div className="pt-4">
                        <a
                          href="/catalogo"
                          onClick={(e) => {
                            e.preventDefault();
                            handleCategorySelection('all');
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer no-underline"
                        >
                          <span>Ver Todo el Catálogo</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                id="nav-link-ofertas"
                onClick={handleOfertasClick}
                className="py-2 text-[#FF5A36] hover:text-[#E02656] font-black transition-colors cursor-pointer flex items-center gap-1.5 group"
              >
                <Flame className="w-3.5 h-3.5 text-[#FF5A36] group-hover:scale-110 transition-transform" />
                <span>Ofertas</span>
                <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider shadow-2xs">
                  Hot
                </span>
              </button>

              <button
                id="nav-link-quienes-somos"
                onClick={handleQuienesSomosClick}
                className="py-2 hover:text-sky-600 transition-colors cursor-pointer"
              >
                Quiénes Somos
              </button>

              <button
                id="nav-link-adults"
                onClick={handleAdultZoneClick}
                className="py-2 px-3 rounded-full bg-slate-900 text-purple-300 hover:text-white hover:bg-purple-900 font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Zona +18</span>
              </button>
            </nav>

            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
              <div className="relative shrink-0">
                {isSearchInputOpen ? (
                  <div className="flex items-center bg-slate-100 rounded-full border border-slate-300 px-2 sm:px-3 py-1 animate-in fade-in zoom-in-95 duration-150">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder="Buscar..."
                      className="bg-transparent text-xs text-slate-900 outline-hidden w-28 xs:w-36 sm:w-48 placeholder:text-slate-400"
                      autoFocus
                    />
                    <button 
                      onClick={() => { setIsSearchInputOpen(false); onSearchChange(''); }}
                      className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    id="header-search-icon-btn"
                    onClick={() => {
                      setIsSearchInputOpen(true);
                      setTimeout(() => searchInputRef.current?.focus(), 100);
                    }}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Buscar productos"
                    aria-label="Abrir buscador"
                  >
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>

              {currentCustomer ? (
                <div className="relative shrink-0" ref={customerMenuRef}>
                  <button
                    id="header-user-account-btn"
                    onClick={() => setIsCustomerMenuOpen(!isCustomerMenuOpen)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-100 hover:bg-sky-50 text-slate-800 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                    title={`Mi Cuenta (${currentCustomer.firstName || currentCustomer.name})`}
                  >
                    <User className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="hidden md:inline max-w-[90px] truncate">
                      {currentCustomer.firstName || currentCustomer.name}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>

                  {isCustomerMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in duration-150">
                      <div className="px-3.5 py-2 border-b border-slate-100">
                        <p className="text-xs font-black text-slate-900 truncate">{currentCustomer.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{currentCustomer.email}</p>
                      </div>
                      <div className="py-1 text-xs">
                        {onOpenCustomerProfile && (
                          <button
                            onClick={() => { setIsCustomerMenuOpen(false); onOpenCustomerProfile(); }}
                            className="w-full px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2 cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5 text-sky-600" />
                            <span>Mi Perfil</span>
                          </button>
                        )}
                        {onOpenCustomerOrders && (
                          <button
                            onClick={() => { setIsCustomerMenuOpen(false); onOpenCustomerOrders(); }}
                            className="w-full px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                            <span>Mis Pedidos</span>
                          </button>
                        )}
                        <button
                          onClick={() => { setIsCustomerMenuOpen(false); onOpenTracking(); }}
                          className="w-full px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5 text-slate-500" />
                          <span>Rastrear Guía</span>
                        </button>
                      </div>
                      {onCustomerLogout && (
                        <div className="border-t border-slate-100 pt-1 px-2">
                          <button
                            onClick={() => { setIsCustomerMenuOpen(false); onCustomerLogout(); }}
                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Cerrar Sesión</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  id="header-login-btn"
                  onClick={() => onOpenCustomerAuth?.('login')}
                  className="w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-full bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
                  title="Iniciar Sesión / Registrarse"
                  aria-label="Iniciar sesión o registrarse"
                >
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 shrink-0" />
                  <span className="hidden md:inline">Ingresar</span>
                </button>
              )}

              <Link 
                to="/admin" 
                onClick={() => {
                  if (onToggleAdmin) onToggleAdmin();
                }}
                className="hidden sm:flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0 no-underline"
                title="Abrir Panel Administrativo"
              >
                <span>⚙️ Admin</span>
              </Link>

              <button
                id="header-open-cart-btn"
                onClick={onOpenCart}
                className="relative flex items-center justify-center gap-1 sm:gap-2 bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#E04826] hover:to-[#E02656] active:scale-95 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-xs shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider shrink-0"
                aria-label="Abrir carrito de compras"
              >
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                <span className="hidden sm:inline">Carrito</span>
                {totalCartCount > 0 && (
                  <span 
                    id="header-cart-badge-count" 
                    className="w-4 h-4 sm:w-5 sm:h-5 bg-white text-[#FF5A36] border border-orange-200 text-[10px] sm:text-[11px] font-mono font-black rounded-full flex items-center justify-center -mr-0.5 sm:-mr-1 shadow-xs"
                  >
                    {totalCartCount}
                  </span>
                )}
              </button>

              <button
                id="mobile-menu-toggle-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-1.5 sm:p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Abrir menú"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 animate-in fade-in duration-200 w-full max-h-[85vh] overflow-y-auto">
            <div className="flex flex-col space-y-1 text-xs font-bold uppercase tracking-wider text-slate-800">
              <Link
                to="/"
                onClick={handleHomeClick}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-slate-100 flex items-center justify-between no-underline text-slate-800"
              >
                <span>Inicio</span>
              </Link>

              <div>
                <button
                  onClick={() => setIsMobileCatalogOpen(!isMobileCatalogOpen)}
                  className="w-full text-left py-2 px-3 rounded-xl hover:bg-slate-100 flex items-center justify-between text-slate-900 font-black cursor-pointer"
                >
                  <span>Catálogo de Productos</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isMobileCatalogOpen ? 'rotate-180 text-sky-600' : ''}`} />
                </button>

                {isMobileCatalogOpen && (
                  <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-sky-400 ml-3 mt-1">
                    <a
                      href="/catalogo"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCategorySelection('all');
                      }}
                      className={`w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold block no-underline ${
                        activeCategoryId === 'all' ? 'text-sky-600 font-black' : 'text-slate-600'
                      }`}
                    >
                      • Ver Todos los Productos
                    </a>
                    {activeCategories.map((cat) => {
                      const catSlug = cat.slug || cat.id;
                      return (
                        <a
                          key={cat.id || cat.slug}
                          href={`/catalogo?categoria=${encodeURIComponent(catSlug)}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleCategorySelection(cat.id);
                          }}
                          className={`w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold break-words whitespace-normal leading-snug block no-underline ${
                            activeCategoryId === cat.id ? 'text-sky-600 font-black' : 'text-slate-600'
                          }`}
                        >
                          • {cat.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={handleOfertasClick}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-red-50 text-red-600 font-black flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Ofertas Flash</span>
              </button>

              <button
                onClick={handleQuienesSomosClick}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-slate-100"
              >
                Quiénes Somos
              </button>

              <button
                onClick={handleAdultZoneClick}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-purple-900 bg-slate-900 text-purple-300 flex items-center gap-1.5 shadow-sm mt-2"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Zona +18</span>
              </button>

            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <button
                onClick={() => { setIsMobileMenuOpen(false); setIsContactModalOpen(true); }}
                className="w-full flex items-center gap-2 py-1.5 text-slate-600 font-semibold"
              >
                <Headphones className="w-4 h-4 text-emerald-600" />
                <span>Atención al Cliente</span>
              </button>

              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenTracking(); }}
                className="w-full flex items-center gap-2 py-1.5 text-slate-600 font-semibold"
              >
                <Truck className="w-4 h-4 text-sky-600" />
                <span>Rastrea tu pedido</span>
              </button>

              <button
                onClick={() => { setIsMobileMenuOpen(false); setIsWarrantyModalOpen(true); }}
                className="w-full flex items-center gap-2 py-1.5 text-slate-600 font-semibold"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Garantías y Devoluciones</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Link
                to="/admin"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onToggleAdmin) onToggleAdmin();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm no-underline"
              >
                <span>⚙️ Panel Administrativo</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {isContactModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsContactModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Headphones className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                  Atención al Cliente Zavela
                </h3>
              </div>
              <button 
                onClick={() => setIsContactModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>Nuestro equipo de soporte está disponible de lunes a sábado de 8:00 AM a 7:00 PM para resolver inquietudes sobre envíos, garantías y pagos contra entrega.</p>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-800 text-[11px] font-mono">
                <p className="flex items-center gap-2">
                  <span>💬 WhatsApp:</span>
                  <a 
                    href="https://wa.me/573133595427?text=%C2%A1Hola%20Zavela%20Store!%20Necesito%20atenci%C3%B3n%20al%20cliente." 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    +57 313 359 5427
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <span>✉️ Correo electrónico:</span>
                  <a 
                    href="mailto:contacto@zavelastore.com.co" 
                    className="text-slate-700 hover:text-slate-900 hover:underline font-semibold"
                  >
                    contacto@zavelastore.com.co
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <span>📍 Bodega Principal:</span>
                  <span className="font-semibold text-slate-900">Cartagena, Bolívar, Colombia</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <a
                href="https://wa.me/573133595427?text=%C2%A1Hola%20Zavela%20Store!%20Necesito%20atenci%C3%B3n%20al%20cliente."
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span>💬 Abrir WhatsApp (+57 313 359 5427)</span>
              </a>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {isWarrantyModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsWarrantyModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                  Garantía y Confianza Zavela
                </h3>
              </div>
              <button 
                onClick={() => setIsWarrantyModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <p>Todos nuestros productos cuentan con garantía oficial de 30 días contra defectos de fábrica.</p>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-amber-950 text-[11px]">
                <p className="font-bold">✓ Cobertura 100% en caso de daño en transporte</p>
                <p className="font-bold">✓ Pago Contra Entrega: pagas al recibir</p>
                <p className="font-bold">✓ Proceso ágil de cambio y reemplazo de piezas</p>
              </div>
            </div>

            <button
              onClick={() => setIsWarrantyModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {isQuienesSomosModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsQuienesSomosModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                    Quiénes Somos • Zavela Store
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Tu tienda de confianza en Colombia
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsQuienesSomosModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                En <strong>Zavela Store</strong> seleccionamos lo mejor en artículos de temporada, tecnología, cuidado personal y soluciones para el hogar, garantizando productos certificados y entregas rápidas en todo el territorio colombiano.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-950 text-xs">Pago Contra Entrega</h4>
                    <p className="text-[11px] text-emerald-800">Pagas en efectivo únicamente al recibir tu producto en casa.</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-2">
                  <Truck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sky-950 text-xs">Cobertura 32 Deptos</h4>
                    <p className="text-[11px] text-sky-800">Alianzas con Servientrega, Coordinadora e Interrapidísimo.</p>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Esta sección está conectada al panel de administración para editar contenido institucional.</span>
              </div>
            </div>

            <button
              onClick={() => setIsQuienesSomosModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer transition-all shadow-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
