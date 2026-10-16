import React from 'react';
import { 
  PackageX, 
  ArrowLeft, 
  ShoppingBag, 
  Search, 
  Sparkles, 
  Truck, 
  PhoneCall,
  CheckCircle2,
  X
} from 'lucide-react';
import { Product } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';

interface ProductNotFoundModalProps {
  searchTerm: string;
  isOpen: boolean;
  onClose: () => void;
  featuredProducts?: Product[];
  onSelectProduct?: (product: Product) => void;
  onSearchCatalog?: (query: string) => void;
}

export const ProductNotFoundModal: React.FC<ProductNotFoundModalProps> = ({
  searchTerm,
  isOpen,
  onClose,
  featuredProducts = [],
  onSelectProduct,
  onSearchCatalog
}) => {
  if (!isOpen) return null;

  // Formato legible del término buscado (de "lamparas-unas-48-w" a "Lamparas Unas 48 W")
  const humanSearchTerm = (searchTerm || 'Producto solicitado')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div 
      id="product-not-found-backdrop" 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="product-not-found-dialog"
        className="bg-white text-slate-900 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col relative border border-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
              <PackageX className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
                Enlace de Redes Sociales
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                Producto No Disponible o Agotado
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            title="Cerrar y volver a la tienda"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-white">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-sm text-slate-700 space-y-2">
            <p className="leading-relaxed">
              El producto solicitado <strong className="text-slate-950 font-bold">"{humanSearchTerm}"</strong> no se encuentra activo actualmente en el catálogo de Zavela Store o la publicación en redes sociales corresponde a una edición temporal agotada.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-amber-900 font-semibold pt-1 border-t border-amber-200/60">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>¡Pero tenemos excelentes alternativas disponibles con <strong>Envío Gratis ($0 COP)</strong> y Pago Contra Entrega!</span>
            </div>
          </div>

          {/* Quick Search Action */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              ¿Deseas buscar otro producto en el catálogo?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                defaultValue={humanSearchTerm}
                id="input-not-found-search"
                placeholder="Ej: Taladro, Reloj, Bolso..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (onSearchCatalog) onSearchCatalog(val);
                    onClose();
                  }
                }}
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 text-slate-900 border border-slate-300 focus:border-sky-500 outline-hidden focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('input-not-found-search') as HTMLInputElement;
                  if (input && onSearchCatalog) {
                    onSearchCatalog(input.value);
                  }
                  onClose();
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar</span>
              </button>
            </div>
          </div>

          {/* Suggested Alternative Products */}
          {featuredProducts.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                  <span>Productos Más Populares Hoy:</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700 font-mono">
                  Envío Gratis Nacional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {featuredProducts.slice(0, 4).map((prod) => {
                  const img = prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';
                  return (
                    <div
                      key={prod.id || prod.slug}
                      onClick={() => {
                        if (onSelectProduct) onSelectProduct(prod);
                        onClose();
                      }}
                      className="p-2.5 rounded-2xl border border-slate-200 hover:border-sky-300 bg-slate-50 hover:bg-sky-50/30 flex items-center gap-2.5 cursor-pointer transition-all text-left shadow-2xs group"
                    >
                      <img
                        src={img}
                        alt={prod.title}
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-sky-700 transition-colors">
                          {prod.title}
                        </h4>
                        <div className="text-xs font-mono font-black text-slate-900 mt-0.5">
                          {formatCOP(prod.price)}
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Contra Entrega $0</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              id="btn-return-to-catalog"
              onClick={onClose}
              className="w-full bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#E04826] hover:to-[#E02656] text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>Explorar Todo el Catálogo Zavela</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
