import React, { useState, useEffect, useRef } from 'react';
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
  Gift,
  Home,
  Smartphone,
  Sparkle
} from 'lucide-react';
import { Category, CartItem, Product, CustomSubpage, StoreSettings } from '../types/index.ts';
import { CustomerUser } from '../utils/customerAuthManager.ts';
import { ZavelaLogo } from './ZavelaLogo.tsx';
import { SeasonalLogoWrapper } from './SeasonalThemeOrnaments.tsx';
import { resolveActiveSeasonalTheme } from '../utils/seasonalThemes.ts';

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

    // Scroll to catalog grid smoothly
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
    // Prioritize discount or featured sorting
    setTimeout(() => {
      document.getElementById('catalog-products-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleQuienesSomosClick = () => {
    setIsMegaMenuOpen(false);
    setIsMobileMenuOpen(false);

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

  // Active categories list
  const activeCategories = categories.filter(c => c.active !== false);

  // Active category selection identifier
  const activeCategoryId = selectedCategoryId !== 'all' 
    ? selectedCategoryId 
    : (selectedCategory === 'todos' ? 'all' : (categories.find(c => c.slug === selectedCategory)?.id || 'all'));

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. TOP BAR (Barra de Utilidad Superior) */}
      {/* ========================================================================= */}
      <div id="top-announcement-bar" className="w-full bg-slate-900 text-white text-xs py-1.5 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-4 text-center sm:text-left">
          
          {/* Izquierda: Mensaje de envíos y pago contra entrega */}
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
            <span className="text-[11px] font-medium text-slate-200">
              Envío Gratis Nacional y <strong className="text-emerald-400 font-bold uppercase">Pago Contra Entrega</strong> (Pagas al recibir en casa)
            </span>
          </div>

          {/* Derecha: Enlaces de confianza (Atención al Cliente, Rastrea tu pedido, Garantías) */}
          <div className="flex items-center gap-3 sm:gap-5 text-slate-300 text-[11px]">
            <button 
              id="top-bar-contact-btn"
              onClick={() => setIsContactModalOpen(true)}
              className="hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Atención al Cliente</span>
            </button>

            <button 
              id="top-bar-track-order-btn"
              onClick={onOpenTracking}
              className="hover:text-sky-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Rastrea tu pedido</span>
            </button>

            <button 
              id="top-bar-warranties-btn"
              onClick={() => setIsWarrantyModalOpen(true)}
              className="hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Garantías</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HEADER PRINCIPAL (Fondo blanco, sticky top-0 z-50 shadow-sm) */}
      {/* ========================================================================= */}
      <header 
        id="main-store-header" 
        ref={megaMenuContainerRef}
        className="sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-slate-200/90 shadow-xs text-slate-900 transition-all"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-4 lg:gap-8">
            
            {/* IZQUIERDA: Logotipo original animado con festividades */}
            <button 
              id="logo-brand-btn"
              onClick={handleHomeClick}
              className="flex items-center text-left cursor-pointer group focus:outline-none shrink-0"
              aria-label="Ir a la página principal de Zavela Store"
            >
              <SeasonalLogoWrapper
                themeId={activeSeasonalThemeId}
                size="md"
                glowEnabled={settings?.themeStyles?.neonGlowEnabled ?? (activeSeasonalThemeId !== 'standard-light')}
              >
                <ZavelaLogo 
                  size="md" 
                  showSlogan={true} 
                  showAnimatedCart={true}
                  theme="light" 
                  seasonalTheme={activeSeasonalThemeId} 
                  animated={true}
                />
              </SeasonalLogoWrapper>
            </button>

            {/* CENTRO: Mega Menú Horizontal */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs font-bold uppercase tracking-wider text-slate-800">
              
              {/* Inicio */}
              <button
                id="nav-link-inicio"
                onClick={handleHomeClick}
                className={`py-2 transition-colors cursor-pointer ${
                  activeCategoryId === 'all' && !searchQuery
                    ? 'text-sky-600 font-black'
                    : 'hover:text-sky-600'
                }`}
              >
                Inicio
              </button>

              {/* Catálogo con Mega Menú desplegable ancho */}
              <div 
                className="relative py-2"
                onMouseEnter={() => setIsMegaMenuOpen(true)}
              >
                <button
                  id="nav-link-catalogo"
                  onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeCategoryId !== 'all' || isMegaMenuOpen
                      ? 'text-sky-600 font-black'
                      : 'hover:text-sky-600'
                  }`}
                  aria-expanded={isMegaMenuOpen}
                >
                  <span>Catálogo</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180 text-sky-600' : 'text-slate-400'}`} />
                </button>
              </div>

              {/* Ofertas (Destacado en color rojo/naranja) */}
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

              {/* Quiénes Somos */}
              <button
                id="nav-link-quienes-somos"
                onClick={handleQuienesSomosClick}
                className="py-2 hover:text-sky-600 transition-colors cursor-pointer"
              >
                Quiénes Somos
              </button>
            </nav>

            {/* DERECHA: Iconos de Acción (Buscador, Usuario, Panel Admin, Carrito) */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Buscador integrado compacto */}
              <div className="relative">
                {isSearchInputOpen ? (
                  <div className="flex items-center bg-slate-100 rounded-full border border-slate-300 px-3 py-1 animate-in fade-in zoom-in-95 duration-150">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder="Buscar producto..."
                      className="bg-transparent text-xs text-slate-900 outline-hidden w-36 sm:w-48 placeholder:text-slate-400"
                      autoFocus
                    />
                    <button 
                      onClick={() => { setIsSearchInputOpen(false); onSearchChange(''); }}
                      className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
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
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                    title="Buscar productos"
                    aria-label="Abrir buscador"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Botón de Iniciar Sesión (Ícono de Usuario / Menú de Cuenta) */}
              {currentCustomer ? (
                <div className="relative" ref={customerMenuRef}>
                  <button
                    id="header-user-account-btn"
                    onClick={() => setIsCustomerMenuOpen(!isCustomerMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-sky-50 text-slate-800 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    title={`Mi Cuenta (${currentCustomer.firstName || currentCustomer.name})`}
                  >
                    <User className="w-3.5 h-3.5 text-sky-600" />
                    <span className="hidden sm:inline max-w-[90px] truncate">
                      {currentCustomer.firstName || currentCustomer.name}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {/* Menú de Usuario Logueado */}
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
                  className="w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-full bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                  title="Iniciar Sesión / Registrarse"
                  aria-label="Iniciar sesión o registrarse"
                >
                  <User className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Ingresar</span>
                </button>
              )}

              {/* Botón ⚙️ Panel Admin con fondo oscuro */}
              <a 
                href="/admin" 
                onClick={(e) => {
                  e.preventDefault();
                  if (onToggleAdmin) onToggleAdmin();
                  else window.location.href = '/admin';
                }}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
                title="Abrir Panel Administrativo"
              >
                <span>⚙️ Admin</span>
              </a>

              {/* Botón del Carrito de Compras */}
              <button
                id="header-open-cart-btn"
                onClick={onOpenCart}
                className="relative flex items-center gap-2 bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#E04826] hover:to-[#E02656] active:scale-95 text-white px-3.5 sm:px-4 py-2 rounded-full font-black text-xs shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider shrink-0"
                aria-label="Abrir carrito de compras"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span className="hidden xs:inline">Carrito</span>
                {totalCartCount > 0 && (
                  <span 
                    id="header-cart-badge-count" 
                    className="w-5 h-5 bg-white text-[#FF5A36] border border-orange-200 text-[11px] font-mono font-black rounded-full flex items-center justify-center -mr-1 shadow-sm"
                  >
                    {totalCartCount}
                  </span>
                )}
              </button>

              {/* Mobile Hamburger Toggle Button */}
              <button
                id="mobile-menu-toggle-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                aria-label="Abrir menú"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MEGA MENÚ DESPLEGABLE (Absolute ancho completo debajo de la barra) */}
        {/* ========================================================================= */}
        {isMegaMenuOpen && (
          <div 
            className="absolute left-0 w-full bg-white shadow-xl border-t border-b border-slate-200 p-6 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
            onMouseEnter={() => setIsMegaMenuOpen(true)}
            onMouseLeave={() => setIsMegaMenuOpen(false)}
          >
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Columna 1: Artículos de Temporada & Navidad */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-xs">
                    🎄
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                    Temporada & Navidad
                  </h4>
                </div>
                <ul className="space-y-2 text-xs font-semibold text-slate-600">
                  {activeCategories
                    .filter(c => c.slug.includes('navid') || c.slug.includes('halo') || c.slug.includes('amor') || c.id === 'cat-navidad')
                    .map(cat => (
                      <li key={cat.id}>
                        <button
                          onClick={() => handleCategorySelection(cat.id)}
                          className="hover:text-sky-600 transition-colors text-left w-full flex items-center justify-between"
                        >
                          <span>{cat.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {products.filter(p => p.categoryId === cat.id).length}
                          </span>
                        </button>
                      </li>
                    ))}
                  <li>
                    <button
                      onClick={handleOfertasClick}
                      className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 mt-1"
                    >
                      <Flame className="w-3 h-3 text-red-500" />
                      <span>Ver promociones flash</span>
                    </button>
                  </li>
                </ul>
              </div>

              {/* Columna 2: Hogar, Cocina & Herramientas */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">
                    <Home className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                    Hogar & Cocina
                  </h4>
                </div>
                <ul className="space-y-2 text-xs font-semibold text-slate-600">
                  {activeCategories
                    .filter(c => c.slug.includes('hogar') || c.slug.includes('cocina') || c.id === 'cat-2' || c.name.toLowerCase().includes('hogar'))
                    .map(cat => (
                      <li key={cat.id}>
                        <button
                          onClick={() => handleCategorySelection(cat.id)}
                          className="hover:text-sky-600 transition-colors text-left w-full flex items-center justify-between"
                        >
                          <span>{cat.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {products.filter(p => p.categoryId === cat.id).length}
                          </span>
                        </button>
                      </li>
                    ))}
                  <li>
                    <button
                      onClick={() => handleCategorySelection('all')}
                      className="text-slate-500 hover:text-slate-800 text-[11px] underline"
                    >
                      Organización y soluciones del hogar
                    </button>
                  </li>
                </ul>
              </div>

              {/* Columna 3: Tecnología & Belleza */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-xs">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                    Tecnología & Belleza
                  </h4>
                </div>
                <ul className="space-y-2 text-xs font-semibold text-slate-600">
                  {activeCategories
                    .filter(c => c.slug.includes('tecno') || c.slug.includes('belle') || c.slug.includes('salud') || c.id === 'cat-3' || c.id === 'cat-1')
                    .map(cat => (
                      <li key={cat.id}>
                        <button
                          onClick={() => handleCategorySelection(cat.id)}
                          className="hover:text-sky-600 transition-colors text-left w-full flex items-center justify-between"
                        >
                          <span>{cat.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {products.filter(p => p.categoryId === cat.id).length}
                          </span>
                        </button>
                      </li>
                    ))}
                  <li>
                    <button
                      onClick={() => handleCategorySelection('all')}
                      className="text-slate-500 hover:text-slate-800 text-[11px] underline"
                    >
                      Ver gadgets y smartwatches
                    </button>
                  </li>
                </ul>
              </div>

              {/* Columna 4: Banner Destacado / Todo el Catálogo */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white rounded-2xl p-5 flex flex-col justify-between shadow-md">
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
                  <button
                    onClick={() => handleCategorySelection('all')}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Ver Todo el Catálogo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MENÚ MÓVIL (Drawer Lateral / Panel Acordeón) */}
        {/* ========================================================================= */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 animate-in fade-in duration-200">
            {/* Enlaces de Navegación */}
            <div className="flex flex-col space-y-1 text-xs font-bold uppercase tracking-wider text-slate-800">
              <button
                onClick={handleHomeClick}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-slate-100 flex items-center justify-between"
              >
                <span>Inicio</span>
              </button>

              {/* Acordeón Catálogo */}
              <div>
                <button
                  onClick={() => setIsMobileCatalogOpen(!isMobileCatalogOpen)}
                  className="w-full text-left py-2 px-3 rounded-xl hover:bg-slate-100 flex items-center justify-between text-slate-900 font-black"
                >
                  <span>Catálogo de Productos</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isMobileCatalogOpen ? 'rotate-180 text-sky-600' : ''}`} />
                </button>

                {isMobileCatalogOpen && (
                  <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-sky-400 ml-3 mt-1">
                    <button
                      onClick={() => handleCategorySelection('all')}
                      className={`w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold ${
                        activeCategoryId === 'all' ? 'text-sky-600 font-black' : 'text-slate-600'
                      }`}
                    >
                      • Ver Todos los Productos
                    </button>
                    {activeCategories.map((cat) => (
                      <button
                        key={cat.id || cat.slug}
                        onClick={() => handleCategorySelection(cat.id)}
                        className={`w-full text-left py-1.5 px-2 rounded-lg text-xs font-bold truncate ${
                          activeCategoryId === cat.id ? 'text-sky-600 font-black' : 'text-slate-600'
                        }`}
                      >
                        • {cat.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ofertas */}
              <button
                onClick={handleOfertasClick}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-red-50 text-red-600 font-black flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Ofertas Flash</span>
              </button>

              {/* Quiénes Somos */}
              <button
                onClick={handleQuienesSomosClick}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-slate-100"
              >
                Quiénes Somos
              </button>
            </div>

            {/* Accesos rápidos de la Top Bar en móvil */}
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

            {/* Panel Admin en móvil */}
            <div className="pt-2 border-t border-slate-100">
              <a
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  if (onToggleAdmin) onToggleAdmin();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>⚙️ Panel Administrativo</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* MODALES INFORMATIVOS (Atención al Cliente, Garantías, Quiénes Somos) */}
      {/* ========================================================================= */}

      {/* Modal Atención al Cliente */}
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

            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <p>Nuestro equipo de soporte está disponible de lunes a sábado de 8:00 AM a 7:00 PM para resolver inquietudes sobre envíos, garantías y pagos contra entrega.</p>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 font-mono text-slate-800 text-[11px]">
                <p>💬 WhatsApp: +57 310 123 4567</p>
                <p>✉️ Correo: contacto@zavelastore.co</p>
                <p>📍 Bodega Principal: Bogotá D.C., Colombia</p>
              </div>
            </div>

            <button
              onClick={() => setIsContactModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal Garantías */}
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

      {/* Modal Quiénes Somos */}
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
