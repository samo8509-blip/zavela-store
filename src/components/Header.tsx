import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Truck, 
  LayoutDashboard, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  User, 
  Lock,
  Palette,
  ChevronDown,
  LogOut,
  Sparkles,
  Gem
} from 'lucide-react';
import { Category, CartItem, Product, CustomSubpage } from '../types/index.ts';
import { ZavelaLogo } from './ZavelaLogo.tsx';
import { TopCategoryNav } from './TopCategoryNav.tsx';
import { TRUST_PALETTES } from '../utils/themePalettes.ts';
import { CustomerUser } from '../utils/customerAuthManager.ts';

interface HeaderProps {
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
  onNavigateExclusivity,
  onNavigateSubpage,
  isExclusivityActive = false,
  exclusivityPageEnabled = true,
  exclusivityNavTitle = 'EXCLUSIVIDAD (Bolsos & Placas)',
  customSubpages = [],
  isAdminView = false,
  onToggleAdmin,
  searchQuery,
  onSearchChange,
  showSecretLogin = false,
  showCategoryNav = true,
  activePaletteId = 'trust_sapphire',
  onOpenPaletteModal
}) => {
  const currentPalette = TRUST_PALETTES.find(p => p.id === activePaletteId) || TRUST_PALETTES[0];
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
  const customerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerMenuRef.current && !customerMenuRef.current.contains(e.target as Node)) {
        setIsCustomerMenuOpen(false);
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
  };

  // Derive current selected ID
  const activeCategoryId = selectedCategoryId !== 'all' 
    ? selectedCategoryId 
    : (selectedCategory === 'todos' ? 'all' : (categories.find(c => c.slug === selectedCategory)?.id || 'all'));

  return (
    <header id="main-store-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 shadow-sm transition-shadow">
      {/* Top Banner - Official Guarantee & Benefits */}
      <div id="top-announcement-bar" className="bg-[#0B1528] text-white text-xs py-2 px-4 sm:px-8 border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse" />
            <span className="text-[11px] font-medium tracking-wide text-slate-200">
              Envíos a toda Colombia • <strong className="text-emerald-400 font-bold uppercase">Pago Contra Entrega</strong> (Pagas al recibir en efectivo)
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-slate-300 text-[11px]">
            {/* Trust Palette Selector Trigger Button */}
            {onOpenPaletteModal && (
              <button
                id="header-open-palette-modal-btn"
                onClick={onOpenPaletteModal}
                className="hover:text-white font-medium transition-colors cursor-pointer flex items-center gap-1.5 text-slate-200 bg-slate-800/80 hover:bg-slate-700 px-2 py-0.5 rounded-lg border border-slate-700 text-[10px]"
                title="Explorar paletas claras de confianza"
              >
                <Palette className="w-3 h-3 text-sky-400" />
                <span className="hidden xs:inline">Paleta:</span>
                <span className="font-bold text-sky-300">{currentPalette.shortName}</span>
              </button>
            )}

            <button
              id="header-track-order-btn"
              onClick={onOpenTracking}
              className="hover:text-emerald-400 font-medium transition-colors cursor-pointer flex items-center gap-1.5 text-slate-200"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rastrear Pedido</span>
            </button>

            {onOpenCustomerOrders && (
              <button
                id="header-my-orders-btn"
                onClick={onOpenCustomerOrders}
                className="hover:text-amber-400 font-medium transition-colors cursor-pointer flex items-center gap-1.5 text-slate-200"
                title="Ver mi historial de compras y pedidos"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span>Mis Pedidos</span>
              </button>
            )}

            {/* Top bar Customer Account access */}
            {currentCustomer ? (
              <button
                id="header-top-my-account-btn"
                onClick={onOpenCustomerProfile}
                className="hover:text-emerald-300 font-medium transition-colors cursor-pointer flex items-center gap-1.5 text-slate-200"
                title="Ver mi perfil de cliente"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-black">
                  {(currentCustomer.firstName || currentCustomer.name || 'U')[0].toUpperCase()}
                </div>
                <span>Hola, {currentCustomer.firstName || currentCustomer.name}</span>
              </button>
            ) : (
              <button
                id="header-top-login-btn"
                onClick={() => onOpenCustomerAuth?.('login')}
                className="hover:text-sky-300 font-medium transition-colors cursor-pointer flex items-center gap-1 text-slate-200"
                title="Iniciar sesión o crear cuenta"
              >
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>Mi Cuenta</span>
              </button>
            )}

            {/* Quick Ingreso Button */}
            {showSecretLogin && (
              <>
                <div className="h-3 w-px bg-slate-700" />
                <button
                  id="header-top-ingreso-btn"
                  onClick={onToggleAdmin}
                  className="hover:text-white font-semibold transition-colors cursor-pointer flex items-center gap-1 text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-400/40 text-[10px] animate-in fade-in zoom-in-95 duration-200"
                  title="Acceso de administración"
                >
                  <User className="w-3 h-3 text-sky-400" />
                  <span>Ingreso Admin</span>
                </button>
              </>
            )}

            <div className="h-3 w-px bg-slate-700 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_6px_#10B981]" />
              <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-widest">Tienda Oficial Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar & Categories (Always visible and fixed on scroll) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-6">
          
          {/* Official Zavela Brand Logo */}
          <div className="flex items-center gap-6">
            <button 
              id="logo-brand-btn"
              onClick={() => {
                if (onGoHome) {
                  onGoHome();
                } else {
                  handleCategorySelection('all');
                }
                if (isAdminView && onToggleAdmin) onToggleAdmin();
              }}
              className="flex items-center gap-2 text-left cursor-pointer group focus:outline-none"
              aria-label="Ir a la página principal de Zavela Store"
            >
              <ZavelaLogo size="md" showSlogan={true} theme="light" />
            </button>

            {/* Desktop Nav Links */}
            {!isAdminView && (
              <div className="hidden lg:flex items-center gap-5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <button
                  onClick={() => {
                    if (onGoHome) onGoHome();
                    handleCategorySelection('all');
                  }}
                  className={`transition-colors cursor-pointer ${
                    !isExclusivityActive && activeCategoryId === 'all' ? 'text-sky-600 font-extrabold' : 'hover:text-slate-900'
                  }`}
                >
                  Inicio
                </button>
                <button
                  onClick={() => handleCategorySelection('all')}
                  className={`transition-colors cursor-pointer ${
                    !isExclusivityActive && activeCategoryId !== 'all' ? 'text-sky-600 font-extrabold' : 'hover:text-slate-900'
                  }`}
                >
                  Catálogo
                </button>
                
                {/* Exclusivity Page Button */}
                {exclusivityPageEnabled && onNavigateExclusivity && (
                  <button
                    onClick={onNavigateExclusivity}
                    className={`transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isExclusivityActive 
                        ? 'text-[#0084FF] font-black bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 shadow-xs' 
                        : 'hover:text-slate-900 text-slate-700'
                    }`}
                  >
                    <Gem className="w-3.5 h-3.5 text-amber-500" />
                    <span>{exclusivityNavTitle}</span>
                  </button>
                )}

                {/* Custom Subpages Links */}
                {customSubpages
                  .filter(sp => sp.active && sp.showInNav && sp.slug !== 'exclusividad-bolsos-placas' && sp.id !== 'subpage-exclusividad' && !sp.navLabel?.toUpperCase().includes('EXCLUSIVIDAD'))
                  .map(sp => (
                  <button
                    key={sp.id}
                    onClick={() => onNavigateSubpage && onNavigateSubpage(sp.slug)}
                    className="hover:text-sky-600 transition-colors cursor-pointer"
                  >
                    {sp.navLabel || sp.title}
                  </button>
                ))}

                <button
                  onClick={onOpenTracking}
                  className="hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Rastreo de Guía
                </button>

                {onOpenCustomerOrders && (
                  <button
                    onClick={onOpenCustomerOrders}
                    className="hover:text-sky-600 transition-colors cursor-pointer flex items-center gap-1 font-bold text-slate-700"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Mis Pedidos</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="hidden sm:flex flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <input
                id="header-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar en Zavela Store (tecnología, belleza, hogar)..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 hover:bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-hidden transition-all shadow-inner"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  id="header-clear-search-btn"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Mis Pedidos Quick Link */}
            {onOpenCustomerOrders && (
              <button
                id="header-orders-action-btn"
                onClick={onOpenCustomerOrders}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                title="Ver mi historial de compras y pedidos"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                <span>Mis Pedidos</span>
              </button>
            )}

            {/* Quick Track link */}
            <button
              onClick={onOpenTracking}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-sky-600" />
              <span>Rastreo</span>
            </button>

            {/* User Account / Iniciar Sesión / Registrarse Button (Directly next to CARRITO and Mis Pedidos) */}
            {currentCustomer ? (
              <div className="relative" ref={customerMenuRef}>
                <button
                  id="header-user-account-btn"
                  onClick={() => setIsCustomerMenuOpen(!isCustomerMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-900 border border-sky-300 text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                  title={`Mi Cuenta (Hola, ${currentCustomer.firstName || currentCustomer.name})`}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs">
                    {(currentCustomer.firstName || currentCustomer.name || 'U')[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[130px] truncate">
                    Mi Cuenta (Hola, {currentCustomer.firstName || currentCustomer.name})
                  </span>
                  <span className="sm:hidden text-[11px]">
                    {currentCustomer.firstName || 'Cuenta'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-sky-600 transition-transform duration-200 ${isCustomerMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isCustomerMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl">
                      <p className="text-xs font-black text-slate-900 truncate">
                        {currentCustomer.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentCustomer.email}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Cliente Verificado Zavela</span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        id="menu-my-profile-btn"
                        onClick={() => {
                          setIsCustomerMenuOpen(false);
                          onOpenCustomerProfile?.();
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-sky-600" />
                        <span>Mi Perfil y Direcciones</span>
                      </button>

                      <button
                        id="menu-my-orders-btn"
                        onClick={() => {
                          setIsCustomerMenuOpen(false);
                          onOpenCustomerOrders?.();
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4 text-amber-600" />
                        <span>Mis Pedidos y Guías de Entrega</span>
                      </button>

                      <button
                        id="menu-track-order-btn"
                        onClick={() => {
                          setIsCustomerMenuOpen(false);
                          onOpenTracking?.();
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Truck className="w-4 h-4 text-slate-500" />
                        <span>Rastrear Pedido</span>
                      </button>
                    </div>

                    <div className="my-1 border-t border-slate-100" />

                    <div className="px-2">
                      <button
                        id="menu-logout-btn"
                        onClick={() => {
                          setIsCustomerMenuOpen(false);
                          onCustomerLogout?.();
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="header-user-login-btn"
                onClick={() => onOpenCustomerAuth?.('login')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-800 hover:text-sky-700 border border-slate-200 hover:border-sky-300 text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                title="Iniciar Sesión o Registrarse en Zavela Store"
              >
                <div className="w-5 h-5 rounded-full bg-slate-200 group-hover:bg-sky-100 text-slate-700 group-hover:text-sky-700 flex items-center justify-center transition-colors">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="hidden sm:inline">Iniciar Sesión / Registrarse</span>
                <span className="sm:hidden text-[11px]">Ingresar</span>
              </button>
            )}

            {/* Ingreso Admin Button */}
            {showSecretLogin && (
              <button
                id="header-ingreso-action-btn"
                onClick={onToggleAdmin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-700 hover:text-sky-900 border border-sky-300 text-xs font-bold transition-all cursor-pointer shadow-sm animate-in fade-in zoom-in-95 duration-200"
                title="Acceso de administración"
              >
                <User className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden xs:inline font-mono">Ingreso Admin</span>
              </button>
            )}

            {/* Shopping Cart Drawer Trigger with Coral CTA */}
            <button
              id="header-open-cart-btn"
              onClick={onOpenCart}
              className="relative flex items-center gap-2 bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#E04826] hover:to-[#E02656] active:scale-95 text-white px-3 sm:px-4 py-2 rounded-xl font-black text-xs shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider"
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Carrito</span>
              {totalCartCount > 0 && (
                <span 
                  id="header-cart-badge-count" 
                  className="w-5 h-5 bg-white text-[#FF5A36] border border-orange-200 text-[11px] font-mono font-black rounded-full flex items-center justify-center -mr-1 shadow-sm"
                >
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden mt-2.5">
          <div className="relative w-full">
            <input
              id="mobile-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar productos en Zavela Store..."
              className="w-full pl-8 pr-8 py-2 text-xs bg-slate-100 text-slate-900 placeholder:text-slate-400 rounded-lg border border-slate-200 focus:border-sky-500 focus:bg-white outline-hidden"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Categories Horizontal Scroll Menu Bar */}
      {showCategoryNav && !isAdminView && categories.length > 0 && (
        <TopCategoryNav
          categories={categories}
          selectedCategoryId={activeCategoryId}
          onSelectCategory={handleCategorySelection}
          selectedSubcategoryId={selectedSubcategoryId}
          onSelectSubcategory={onSelectSubcategoryId}
          products={products}
          totalProductsCount={totalProductsCount}
        />
      )}
    </header>
  );
};
