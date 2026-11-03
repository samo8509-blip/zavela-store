import React, { useMemo, useState, useEffect } from 'react';
import { Sparkles, Moon, ShieldCheck, HeartHandshake, PackageCheck, Flame, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Product } from '../types/index.ts';
import { ProductCard } from './ProductCard.tsx';

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
  // Filtro estricto: renderizar ÚNICAMENTE los productos cuya categoría sea 'Sex Shop' o 'Adultos'
  const adultProducts = useMemo(() => {
    return products.filter((p) => {
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

  return (
    <InternalAgeGate onReject={onGoHome}>
      <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-600 selection:text-white pb-16">
        
        {/* Barra Superior con botón Volver */}
        <div className="bg-slate-900 border-b border-purple-900/40 px-4 sm:px-8 py-3 sticky top-0 z-40 flex items-center justify-between">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </button>
        </div>

        {/* Banner Hero / Cabecera Boutique Íntima */}
        <section className="relative overflow-hidden border-b border-purple-950/80 bg-gradient-to-b from-purple-950/40 via-slate-950 to-slate-950 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-800/10 blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Moon className="w-3.5 h-3.5 text-purple-400" />
              <span>ZavelaSex · Boutique Íntima & Bienestar</span>
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              Espacio Exclusivo{' '}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent">
                Sex Shop & Adultos
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-xs sm:text-base text-slate-300 leading-relaxed font-medium">
              Disfruta de una selección premium diseñada para tu bienestar personal y en pareja, con la total discreción y confianza que te ofrece Zavela Store.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-purple-500/20">
                <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">Empaque 100% Discreto</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-purple-500/20">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="font-bold">Pago Contra Entrega</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-purple-500/20">
                <HeartHandshake className="w-4 h-4 text-pink-400 shrink-0" />
                <span className="font-bold">Garantía Directa Zavela</span>
              </div>
            </div>
          </div>
        </section>

        {/* Catálogo de Productos para Adultos en Grid Clásico */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex items-center justify-between pb-6 border-b border-purple-950/60 mb-8">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-fuchsia-400" />
              <h2 className="text-lg sm:text-xl font-black text-white">
                Catálogo de Productos para Adultos
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-800/40">
              {adultProducts.length} producto{adultProducts.length === 1 ? '' : 's'} disponible{adultProducts.length === 1 ? '' : 's'}
            </span>
          </div>

          {adultProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {adultProducts.map((product) => (
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
            <div className="text-center py-16 px-4 max-w-md mx-auto space-y-4 bg-slate-900/60 rounded-3xl border border-purple-900/30">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <Moon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white">Próximamente más productos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Estamos actualizando el inventario exclusivo de nuestra boutique íntima con novedades y despachos nacionales directos.
              </p>
              {onGoHome && (
                <button
                  onClick={onGoHome}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer mt-2"
                >
                  Volver al Catálogo Principal
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </InternalAgeGate>
  );
};
