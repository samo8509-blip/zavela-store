import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Truck, 
  ShoppingBag, 
  ArrowRight, 
  Star, 
  CheckCircle2, 
  Award, 
  Eye, 
  Layers,
  Zap,
  Lock,
  ChevronRight
} from 'lucide-react';
import { 
  StoreSettings, 
  Product, 
  CustomSubpage, 
  CartItem 
} from '../types/index.ts';
import { ZavelaLogo } from './ZavelaLogo.tsx';
import { SergioMartinezSignature } from './SergioMartinezSignature.tsx';

interface CustomSubpageViewProps {
  subpage: CustomSubpage;
  settings: StoreSettings;
  products: Product[];
  onAddToCart: (item: CartItem) => void;
  onDirectCheckout: (item: CartItem) => void;
  onNavigateHome: () => void;
  onNavigateCatalog: () => void;
  onNavigateTracking: () => void;
  onNavigateExclusivity: () => void;
  onNavigateSubpage: (slug: string) => void;
  onOpenCart: () => void;
  cartCount: number;
}

export const CustomSubpageView: React.FC<CustomSubpageViewProps> = ({
  subpage,
  settings,
  products,
  onAddToCart,
  onDirectCheckout,
  onNavigateHome,
  onNavigateCatalog,
  onNavigateTracking,
  onNavigateExclusivity,
  onNavigateSubpage,
  onOpenCart,
  cartCount
}) => {
  // Filter products based on subpage settings
  const filteredProducts = products.filter(p => {
    if (!p.active) return false;
    if (subpage.customProductIds && subpage.customProductIds.length > 0) {
      return subpage.customProductIds.includes(p.id);
    }
    if (subpage.categoryFilter && subpage.categoryFilter !== 'all') {
      return p.categoryId === subpage.categoryFilter;
    }
    return true;
  });

  const displayProducts = filteredProducts.length > 0 ? filteredProducts : products.slice(0, 8);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#0084FF]/20 selection:text-[#0084FF]">
      
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-gradient-to-r from-[#FF4757] via-[#FF6B81] to-[#FFA502] text-white py-2 px-4 shadow-sm text-xs font-bold flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center">
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-200 fill-yellow-200" />
              {subpage.tagline || 'Colección Especial'}
            </span>
            <span>⚡ Pago Contra Entrega y Envío Gratis a Toda Colombia</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-white/90">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Pagas al Recibir en Tu Puerta
            </span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Garantía Zavela Store
            </span>
          </div>
        </div>
      </div>

      {/* 2. OFFICIAL HEADER & NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="p-1 rounded-2xl bg-slate-50 border border-slate-100 group-hover:border-[#0084FF]/30 transition shadow-sm">
              <ZavelaLogo size="sm" />
            </div>
          </div>

          {/* Center Navigation Menu */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <button
              onClick={onNavigateHome}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-[#0084FF] hover:bg-white transition"
            >
              INICIO
            </button>
            <button
              onClick={onNavigateCatalog}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-[#0084FF] hover:bg-white transition"
            >
              CATÁLOGO
            </button>
            
            {/* Exclusivity link if enabled */}
            {settings.exclusivityPage?.enabled !== false && (
              <button
                onClick={onNavigateExclusivity}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#0084FF] hover:bg-white transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                EXCLUSIVIDAD (Bolsos & Placas)
              </button>
            )}

            {/* Current Active Subpage Link */}
            <button
              className="px-4 py-2 rounded-xl text-xs font-black bg-[#0084FF] text-white shadow-sm flex items-center gap-1.5"
            >
              {subpage.navLabel || subpage.title}
            </button>

            <button
              onClick={onNavigateTracking}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-[#0084FF] hover:bg-white transition"
            >
              RASTREO DE GUÍA
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenCart}
              className="bg-[#FF4757] hover:bg-[#ff3344] text-white px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-[#FF4757]/25 transition hover:scale-105"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>CARRITO</span>
              <span className="w-5 h-5 rounded-full bg-white text-[#FF4757] flex items-center justify-center text-[10px] font-black">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-white py-12 lg:py-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              {subpage.heroBadge && (
                <div className="inline-flex items-center gap-2 bg-[#0084FF]/10 border border-[#0084FF]/30 px-3.5 py-1.5 rounded-full text-xs font-black text-[#0084FF]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{subpage.heroBadge}</span>
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-[1.15]">
                {subpage.heroTitle}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-2xl">
                {subpage.heroSubtitle}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="#subpage-products"
                  className="px-7 py-4 rounded-2xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] hover:from-[#f59e0b] hover:to-[#d97706] text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{subpage.heroCtaText || 'Explorar Colección'}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <button
                  onClick={onNavigateCatalog}
                  className="px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 transition"
                >
                  Ver Catálogo Completo
                </button>
              </div>
            </div>

            {subpage.heroImageUrl && (
              <div className="lg:col-span-5">
                <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 aspect-[4/3] bg-slate-100">
                  <img
                    src={subpage.heroImageUrl}
                    alt={subpage.heroTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* 4. PRODUCTS LIST FOR SUBPAGE */}
      <section id="subpage-products" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#0084FF] bg-[#0084FF]/10 px-3 py-1 rounded-full">
                {subpage.navLabel || 'Artículos Seleccionados'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 mt-1">
                {subpage.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Pago Contra Entrega en Toda Colombia</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.map((p) => {
              const compareAt = p.compareAtPrice || Math.round(p.price * 1.25);
              const discount = Math.round(((compareAt - p.price) / compareAt) * 100);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-md hover:shadow-xl transition flex flex-col justify-between overflow-hidden group hover:border-[#0084FF]/50"
                >
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80'}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <span className="absolute top-3 left-3 bg-[#FF4757] text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow">
                      {discount}% OFF
                    </span>
                    <span className="absolute bottom-3 left-3 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                      ✓ Pago al Recibir
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{p.categoryName || 'Zavela Store'}</div>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#0084FF] transition line-clamp-2">
                        {p.title}
                      </h3>
                      {p.shortDescription && (
                        <p className="text-xs text-slate-500 line-clamp-2">{p.shortDescription}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-black text-slate-950">
                          ${p.price.toLocaleString('es-CO')} COP
                        </span>
                        <span className="text-xs text-slate-400 line-through">
                          ${compareAt.toLocaleString('es-CO')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onAddToCart({ product: p, quantity: 1 })}
                          className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Al Carrito</span>
                        </button>

                        <button
                          onClick={() => onDirectCheckout({ product: p, quantity: 1 })}
                          className="py-2.5 px-3 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-white text-xs font-black transition flex items-center justify-center gap-1 shadow-md"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Comprar COD</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 5. TRUST & SERGIO MARTINEZ SEAL */}
      {subpage.showTrustGuarantees !== false && (
        <section className="py-12 bg-[#F8FAFC] border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#0084FF] bg-[#0084FF]/10 px-3 py-1 rounded-full">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Garantía Oficial Zavela Store</span>
                </div>
                <h4 className="text-lg font-black text-slate-900">
                  Despachos Asegurados con Pago Contra Entrega
                </h4>
                <p className="text-xs text-slate-600 max-w-md">
                  Pagas únicamente cuando recibas tu pedido en tus manos. Garantía directa de 30 días con respaldo de bodega y soporte nacional.
                </p>
              </div>

              <div className="flex flex-col items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-100 shrink-0 text-center">
                <div className="w-full flex justify-center py-1">
                  <SergioMartinezSignature />
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">Certificación Oficial COD Colombia</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. OFFICIAL FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800 text-xs">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-1">
                  <ZavelaLogo size="xs" variant="icon-only" />
                </div>
                <span className="text-white font-black text-sm">Zavela Store</span>
              </div>
              <p className="text-slate-400 text-xs">
                {subpage.tagline || 'Tienda oficial con envíos y pagos contra entrega a nivel nacional.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-white font-bold uppercase tracking-wider text-xs">Enlaces Rápidos</div>
              <ul className="space-y-1.5 text-slate-400">
                <li><button onClick={onNavigateHome} className="hover:text-white transition">Inicio</button></li>
                <li><button onClick={onNavigateCatalog} className="hover:text-white transition">Catálogo Completo</button></li>
                <li><button onClick={onNavigateExclusivity} className="hover:text-white transition">Exclusividad (Bolsos & Placas)</button></li>
                <li><button onClick={onNavigateTracking} className="hover:text-white transition">Rastreo de Guía</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="text-white font-bold uppercase tracking-wider text-xs">Atención y Garantía</div>
              <div className="text-slate-400 space-y-1">
                <div>WhatsApp: {settings.whatsappNumber || '+57 315 789 4512'}</div>
                <div>Lunes a Sábado: 8:00 AM - 7:00 PM</div>
                <div className="text-emerald-400 font-bold pt-1">Pago Contra Entrega en todo el país</div>
              </div>
            </div>
          </div>

          <div className="pt-6 text-center text-[11px] text-slate-500">
            © {new Date().getFullYear()} Zavela Store Colombia. Todos los derechos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
};
