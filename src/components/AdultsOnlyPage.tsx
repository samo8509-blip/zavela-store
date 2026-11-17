import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Moon, ShieldCheck, HeartHandshake, PackageCheck, Flame, ShieldAlert, ArrowLeft, Droplets, Shirt, Dices, Heart, Sparkles } from 'lucide-react';
import { Product } from '../types/index.ts';
import { ProductCard } from './ProductCard.tsx';
import { formatCOP } from '../utils/formatters.ts';

// --- Guardia de Seguridad Embebido ---
const InternalAgeGate: React.FC<{ children: React.ReactNode; onReject?: () => void }> = ({ children, onReject }) => {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    const verified = localStorage.getItem('zavela_adult_verified');
    if (verified === 'true') {
      setIsVerified(true);
    }
    setIsChecking(false);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('zavela_adult_verified', 'true');
    setIsVerified(true);
  };

  const handleDecline = () => {
    if (onReject) {
      onReject();
    } else {
      window.location.href = '/';
    }
  };

  if (isChecking) return null;
  if (isVerified) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/50 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Contenido Exclusivo +18</h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Estás a punto de ingresar a la sección de Boutique Íntima de Zavela Store. Debes ser mayor de edad para continuar.
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <button 
            onClick={handleAccept}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-black transition-all shadow-lg cursor-pointer"
          >
            Sí, soy mayor de 18 años
          </button>
          <button 
            onClick={handleDecline}
            className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
          >
            No, volver a la tienda general
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Tipos de producto de la boutique (se calculan por el nombre del producto) ---
type AdultKind = 'bienestar' | 'lubricantes' | 'lenceria' | 'juegos' | 'otros';

const KIND_META: { id: AdultKind; label: string; hint: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'bienestar', label: 'Bienestar y placer', hint: 'Para ti y en pareja', Icon: Heart },
  { id: 'lubricantes', label: 'Lubricantes y cuidado', hint: 'Geles, aceites y más', Icon: Droplets },
  { id: 'lenceria', label: 'Lencería', hint: 'Prendas y accesorios', Icon: Shirt },
  { id: 'juegos', label: 'Juegos de pareja', hint: 'Ideas para sorprender', Icon: Dices },
  { id: 'otros', label: 'Más productos', hint: 'Otras novedades', Icon: Sparkles }
];

const detectKind = (p: Product): AdultKind => {
  const t = String(p.title || (p as any).nombre || '').toLowerCase();
  if (/lubric|gel\b|aceite|jalea|retardante|crema/.test(t)) return 'lubricantes';
  if (/lencer|ropa interior|media|malla|pantimedia|body|corset/.test(t)) return 'lenceria';
  if (/dado|juego|collar|bondage|fetich|pezonera|antifaz|esposa/.test(t)) return 'juegos';
  if (/vibrador|anillo|estimulador|masajeador|consolador|succion/.test(t)) return 'bienestar';
  return 'otros';
};

// --- Componente Principal ---
interface AdultsOnlyPageProps {
  products: Product[];
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product, e?: React.MouseEvent) => void;
  onBuyNow?: (product: Product, e?: React.MouseEvent) => void;
  onGoHome?: () => void;
}

export const AdultsOnlyPage: React.FC<AdultsOnlyPageProps> = ({
  products = [],
  onSelectProduct = () => {},
  onAddToCart = () => {},
  onBuyNow = () => {},
  onGoHome
}) => {
  const [activeKind, setActiveKind] = useState<AdultKind | 'all'>('all');

  // Filtro estricto: renderizar ÚNICAMENTE los productos cuya categoría sea 'Sex Shop' o 'Adultos'
  const adultProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.active === false) return false;
      const catName = (p.categoryName || (p as any).category || (p as any).categoria || '').toLowerCase().trim();
      const catId = (p.categoryId || (p as any).category_id || '').toLowerCase().trim();
      const tags = Array.isArray(p.tags) ? p.tags.map(t => String(t).toLowerCase()) : [];

      return (
        catName === 'sex shop' ||
        catName === 'adultos' ||
        catName === 'sexshop' ||
        catName.includes('sex shop') ||
        catName.includes('adulto') ||
        catId.includes('sexshop') ||
        catId.includes('adult') ||
        tags.includes('sex shop') ||
        tags.includes('adultos')
      );
    });
  }, [products]);

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    adultProducts.forEach(p => {
      const k = detectKind(p);
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [adultProducts]);

  const visibleKinds = KIND_META.filter(k => (kindCounts[k.id] || 0) > 0);
  const shownProducts = activeKind === 'all' ? adultProducts : adultProducts.filter(p => detectKind(p) === activeKind);

  const scrollToCatalog = () => document.getElementById('adult-catalog')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <InternalAgeGate onReject={onGoHome}>
      <div className="min-h-screen bg-[#0d0714] text-slate-100 selection:bg-fuchsia-600 selection:text-white pb-16">

        {/* Barra superior con botón Volver */}
        <div className="bg-[#140a20] border-b border-fuchsia-950/60 px-4 sm:px-8 py-3 sticky top-0 z-40 flex items-center justify-between">
          <Link
            to="/"
            onClick={() => {
              if (onGoHome) onGoHome();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-100 text-xs font-bold transition-all cursor-pointer no-underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-fuchsia-300">
            <Moon className="w-3.5 h-3.5" /> Solo mayores de 18
          </span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">

          {/* Hero */}
          <section className="flex flex-col lg:flex-row gap-4 items-stretch" aria-label="Boutique íntima">
            <div className="relative flex-1 min-w-0 rounded-[28px] sm:rounded-[32px] px-6 py-9 sm:px-12 sm:py-14 overflow-hidden flex flex-col justify-center gap-5 bg-gradient-to-br from-[#2a0f45] via-[#4a1368] to-[#8a1b6d]">
              <div className="absolute -right-12 -top-12 w-60 h-60 rounded-full bg-fuchsia-400/30 blur-2xl pointer-events-none" />
              <span className="relative self-start inline-flex items-center gap-2 text-[11px] sm:text-xs font-extrabold tracking-widest px-3.5 py-1.5 rounded-full bg-fuchsia-300 text-[#2a0f45] uppercase">
                <Moon className="w-3.5 h-3.5" /> ZavelaSex · Boutique íntima
              </span>
              <h1 className="relative font-black tracking-tight leading-[1.02] text-4xl sm:text-5xl lg:text-6xl text-white">
                Tu bienestar,<br />
                <span className="text-fuchsia-300">en total privacidad.</span>
              </h1>
              <p className="relative text-base sm:text-lg leading-relaxed max-w-md text-white/90">
                Productos para ti y en pareja, con envío discreto y pago contra entrega en toda Colombia.
              </p>
              <div className="relative flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={scrollToCatalog}
                  className="font-bold px-6 py-3.5 rounded-full text-sm sm:text-base cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-95 bg-white text-[#2a0f45]"
                >
                  Ver los productos
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:w-[34%] shrink-0">
              {[
                { Icon: PackageCheck, t: 'Empaque 100% discreto', d: 'Tu pedido llega sin señales por fuera.' },
                { Icon: ShieldCheck, t: 'Pago contra entrega', d: 'Pagas en efectivo al recibir.' },
                { Icon: HeartHandshake, t: 'Garantía directa Zavela', d: 'Soporte por WhatsApp si algo falla.' }
              ].map(({ Icon, t, d }) => (
                <div key={t} className="rounded-[22px] sm:rounded-[26px] bg-[#1c0f2d] border border-fuchsia-900/40 p-5 flex flex-col gap-2">
                  <span className="w-11 h-11 rounded-2xl bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="font-extrabold text-white text-base leading-tight">{t}</span>
                  <span className="text-sm text-slate-300">{d}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Tipos de producto (filtros) */}
          {visibleKinds.length > 0 && (
            <section aria-label="Compra por tipo de producto" className="space-y-3">
              <h2 className="font-black tracking-tight text-2xl sm:text-3xl text-white">Elige lo que buscas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {visibleKinds.map(({ id, label, hint, Icon }) => {
                  const isActive = activeKind === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        setActiveKind(isActive ? 'all' : id);
                        setTimeout(scrollToCatalog, 50);
                      }}
                      className={`text-left rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 flex flex-col gap-3 cursor-pointer transition-all hover:-translate-y-1 active:scale-95 border-2 ${
                        isActive
                          ? 'bg-gradient-to-br from-fuchsia-600 to-purple-700 border-fuchsia-300 text-white'
                          : 'bg-[#1c0f2d] border-fuchsia-800/60 hover:border-fuchsia-400 text-white'
                      }`}
                    >
                      <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isActive ? 'bg-white/25' : 'bg-fuchsia-500/20 text-fuchsia-300'}`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <span>
                        <span className="block font-extrabold text-sm sm:text-base leading-tight">{label}</span>
                        <span className="block text-xs opacity-75 mt-0.5">{hint} · {kindCounts[id]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Catálogo */}
          <section id="adult-catalog" className="scroll-mt-24" aria-label="Catálogo para adultos">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-fuchsia-950/60 mb-7">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-fuchsia-400" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {activeKind === 'all' ? 'Catálogo para adultos' : KIND_META.find(k => k.id === activeKind)?.label}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {activeKind !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setActiveKind('all')}
                    className="text-xs font-bold text-fuchsia-300 hover:text-white px-3 py-1.5 rounded-full bg-fuchsia-950/60 cursor-pointer"
                  >
                    ✕ Ver todos
                  </button>
                )}
                <span className="text-xs font-mono font-bold text-fuchsia-200 bg-fuchsia-950/60 px-3 py-1.5 rounded-full border border-fuchsia-800/40">
                  {shownProducts.length} producto{shownProducts.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {shownProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {shownProducts.map((product) => (
                  <div key={product.id} className="rounded-2xl transition-transform duration-300 hover:-translate-y-1">
                    <ProductCard
                      product={product}
                      onSelectProduct={onSelectProduct}
                      onAddToCart={onAddToCart}
                      onBuyNow={onBuyNow}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 max-w-md mx-auto space-y-4 bg-[#1c0f2d] rounded-3xl border border-fuchsia-900/30">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-fuchsia-950/60 border border-fuchsia-800/40 flex items-center justify-center text-fuchsia-400">
                  <Moon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white">Próximamente más productos</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Estamos actualizando el inventario de nuestra boutique íntima con novedades y despachos nacionales directos.
                </p>
                <Link
                  to="/"
                  onClick={() => {
                    if (onGoHome) onGoHome();
                  }}
                  className="inline-block px-5 py-2.5 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs transition-colors cursor-pointer mt-2 no-underline"
                >
                  Volver al Catálogo Principal
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </InternalAgeGate>
  );
};
