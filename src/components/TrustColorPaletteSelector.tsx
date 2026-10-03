import React from 'react';
import { 
  Palette, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  X, 
  Eye, 
  Sliders, 
  CheckCircle2,
  Lock,
  Truck,
  HeartHandshake,
  TrendingUp,
  Award
} from 'lucide-react';
import { TRUST_PALETTES, TrustPalette } from '../utils/themePalettes.ts';

interface TrustColorPaletteSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePaletteId: string;
  onSelectPalette: (paletteId: string) => void;
}

export const TrustColorPaletteSelectorModal: React.FC<TrustColorPaletteSelectorModalProps> = ({
  isOpen,
  onClose,
  activePaletteId,
  onSelectPalette
}) => {
  if (!isOpen) return null;

  return (
    <div 
      id="trust-palette-selector-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="trust-palette-selector-modal"
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative border border-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Opciones de Paletas Claras de Confianza
                </h2>
                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  E-commerce Seguro
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Diseñadas con base en la psicología del color para generar máxima confianza, claridad y conversión.
              </p>
            </div>
          </div>

          <button
            id="close-palette-modal-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body with 5 Curated Options */}
        <div className="p-6 space-y-6">
          {/* Information Banner */}
          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-900 leading-relaxed">
              <strong className="font-bold block text-sm mb-0.5">¿Por qué una paleta clara genera más confianza?</strong>
              Los fondos limpios (blancos y grises perla) aumentan la legibilidad del texto en un 40%, transmiten transparencia institucional, resaltan la autenticidad de las fotos de los productos y reducen el miedo a estafas en compras online con Pago Contra Entrega.
            </div>
          </div>

          {/* 5 Palette Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRUST_PALETTES.map((palette) => {
              const isSelected = palette.id === activePaletteId;

              return (
                <div
                  key={palette.id}
                  id={`palette-card-${palette.id}`}
                  onClick={() => onSelectPalette(palette.id)}
                  className={`rounded-2xl p-5 border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50/30 shadow-md ring-2 ring-sky-200'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 shadow-2xs'
                  }`}
                >
                  {/* Top Badge & Active Indicator */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {palette.badge}
                      </span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300">
                          <Check className="w-3.5 h-3.5" />
                          ACTIVA
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
                          Clic para aplicar
                        </span>
                      )}
                    </div>

                    {/* Palette Title */}
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>{palette.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {palette.tagline}
                    </p>

                    {/* Color Swatch Circles */}
                    <div className="flex items-center gap-2 my-3.5">
                      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div 
                          className="w-6 h-6 rounded-full border border-black/10 shadow-xs" 
                          style={{ backgroundColor: palette.colorHex.background }} 
                          title="Fondo principal"
                        />
                        <div 
                          className="w-6 h-6 rounded-full border border-black/10 shadow-xs" 
                          style={{ backgroundColor: palette.colorHex.primary }} 
                          title="Color principal de confianza"
                        />
                        <div 
                          className="w-6 h-6 rounded-full border border-black/10 shadow-xs" 
                          style={{ backgroundColor: palette.colorHex.secondary }} 
                          title="Acento secundario"
                        />
                        <div 
                          className="w-6 h-6 rounded-full border border-black/10 shadow-xs" 
                          style={{ backgroundColor: palette.colorHex.accent }} 
                          title="Color de llamada a la acción"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Muestra cromática
                      </span>
                    </div>

                    {/* Psychology Explanation */}
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                      {palette.psychologyDescription}
                    </p>
                  </div>

                  {/* Simulated Component Preview Box */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      Vista previa de componentes:
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${palette.classes.badgeBg} ${palette.classes.badgeText} border ${palette.classes.badgeBorder}`}>
                          Pago Contra Entrega
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`text-[10px] font-black px-3 py-1 rounded-lg ${palette.classes.ctaBg} ${palette.classes.ctaText} shadow-xs`}
                      >
                        Comprar Ahora
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="sticky bottom-0 bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between z-10">
          <span className="text-xs text-slate-500">
            Tu selección se guarda automáticamente en tu navegador.
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all active:scale-95"
          >
            Listo, Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

interface TrustPaletteQuickBarProps {
  activePaletteId: string;
  onSelectPalette: (paletteId: string) => void;
  onOpenDetailedModal: () => void;
}

export const TrustPaletteQuickBar: React.FC<TrustPaletteQuickBarProps> = ({
  activePaletteId,
  onSelectPalette,
  onOpenDetailedModal
}) => {
  const current = TRUST_PALETTES.find(p => p.id === activePaletteId) || TRUST_PALETTES[0];

  return (
    <div id="trust-palette-quick-bar" className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 text-slate-800 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Label & Active Palette summary */}
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
            <Palette className="w-3.5 h-3.5" />
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-700">Paleta Clara:</span>
            <span className="text-[11px] font-extrabold text-sky-700 bg-sky-50 px-2 py-0.2 rounded-md border border-sky-200">
              {current.shortName}
            </span>
          </div>
        </div>

        {/* Quick Palette Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {TRUST_PALETTES.map((p) => {
            const isSelected = p.id === activePaletteId;
            return (
              <button
                key={p.id}
                id={`quick-palette-btn-${p.id}`}
                onClick={() => onSelectPalette(p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-102 font-extrabold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
                title={p.tagline}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10" 
                  style={{ backgroundColor: p.colorHex.primary }} 
                />
                <span>{p.shortName}</span>
                {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
              </button>
            );
          })}

          {/* Open full modal button */}
          <button
            id="open-palette-options-modal-btn"
            onClick={onOpenDetailedModal}
            className="flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-xl transition-colors cursor-pointer ml-1"
            title="Ver detalles y psicología de cada color de confianza"
          >
            <Sliders className="w-3 h-3 text-sky-600" />
            <span className="hidden sm:inline">Ver Opciones & Psicología</span>
            <span className="sm:hidden">Opciones</span>
          </button>
        </div>
      </div>
    </div>
  );
};
