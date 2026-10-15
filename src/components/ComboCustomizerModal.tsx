import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ShoppingBag, 
  Check, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck, 
  Truck,
  Copy,
  ArrowRight
} from 'lucide-react';
import { Product, ProductVariant } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';
import { 
  extractVariantColor, 
  extractVariantSize, 
  getColorSwatchInfo, 
  normalizeProductVariants 
} from '../utils/variantHelpers.ts';

export interface ComboGarmentSelection {
  slotIndex: number;
  label: string; // e.g. "Prenda 1 de 2"
  selectedSize: string;
  selectedColor: string;
  selectedVariant: ProductVariant | null;
}

interface ComboCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  quantity: number;
  discountedTotal: number;
  savings?: number;
  unitEffectivePrice: number;
  actionType?: 'cart' | 'buy_now';
  initialSelectedSize?: string;
  initialSelectedColor?: string;
  onConfirmCombo: (
    items: {
      variant?: ProductVariant;
      quantity: number;
      unitPrice: number;
      garmentLabel: string;
      comboInfo: string;
    }[],
    actionType: 'cart' | 'buy_now'
  ) => void;
}

export const ComboCustomizerModal: React.FC<ComboCustomizerModalProps> = ({
  isOpen,
  onClose,
  product,
  quantity,
  discountedTotal,
  savings = 0,
  unitEffectivePrice,
  actionType = 'cart',
  initialSelectedSize = '',
  initialSelectedColor = '',
  onConfirmCombo
}) => {
  // Normalizar todas las variantes del producto
  const allVariants = useMemo<ProductVariant[]>(() => {
    return normalizeProductVariants(product);
  }, [product]);

  // Extraer tallas únicas presentes en el catálogo
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
    if (list.length === 0) {
      allVariants.forEach(v => {
        const sz = extractVariantSize(v);
        if (sz && !seen.has(sz.toUpperCase())) {
          seen.add(sz.toUpperCase());
          list.push(sz);
        }
      });
    }
    return list;
  }, [allVariants]);

  // Extraer colores únicos presentes en el catálogo
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
    if (list.length === 0) {
      allVariants.forEach(v => {
        const col = extractVariantColor(v);
        if (col && !seen.has(col.toLowerCase())) {
          seen.add(col.toLowerCase());
          list.push(col);
        }
      });
    }
    return list;
  }, [allVariants]);

  const hasSizes = distinctSizes.length > 0;
  const hasColors = distinctColors.length > 0;

  // Estado de las selecciones de cada prenda del combo
  const [slots, setSlots] = useState<ComboGarmentSelection[]>(() => {
    return Array.from({ length: Math.max(2, quantity) }, (_, i) => ({
      slotIndex: i,
      label: `Prenda ${i + 1} de ${quantity}`,
      selectedSize: '',
      selectedColor: '',
      selectedVariant: null
    }));
  });

  // Re-inicializar cuando cambie el producto o la cantidad
  useEffect(() => {
    if (!isOpen) return;

    const newSlots: ComboGarmentSelection[] = Array.from({ length: Math.max(2, quantity) }, (_, i) => {
      let initialSize = '';
      let initialColor = '';
      let initialVariant: ProductVariant | null = null;

      // Si es la Prenda 1 y se pasó una talla/color previo válida en stock
      if (i === 0 && initialSelectedSize) {
        const variantsForSize = allVariants.filter(
          v => extractVariantSize(v).toUpperCase() === initialSelectedSize.toUpperCase()
        );
        if (variantsForSize.length > 0) {
          initialSize = initialSelectedSize;
          if (initialSelectedColor) {
            const matched = variantsForSize.find(
              v => extractVariantColor(v).toLowerCase() === initialSelectedColor.toLowerCase() &&
                   (v.stock === undefined || Number(v.stock) > 0)
            );
            if (matched) {
              initialColor = initialSelectedColor;
              initialVariant = matched;
            }
          }
        }
      }

      // Si no tiene tallas pero sí colores
      if (!hasSizes && hasColors && initialSelectedColor) {
        const matched = allVariants.find(
          v => extractVariantColor(v).toLowerCase() === initialSelectedColor.toLowerCase() &&
               (v.stock === undefined || Number(v.stock) > 0)
        );
        if (matched) {
          initialColor = initialSelectedColor;
          initialVariant = matched;
        }
      }

      return {
        slotIndex: i,
        label: `Prenda ${i + 1} de ${quantity}`,
        selectedSize: initialSize,
        selectedColor: initialColor,
        selectedVariant: initialVariant
      };
    });

    setSlots(newSlots);
  }, [isOpen, product.id, quantity, initialSelectedSize, initialSelectedColor, allVariants, hasSizes, hasColors]);

  // Manejador de selección de Talla para una prenda
  const handleSelectSize = (slotIndex: number, sizeName: string) => {
    setSlots(prev => prev.map(slot => {
      if (slot.slotIndex !== slotIndex) return slot;

      const variantsForSize = allVariants.filter(
        v => extractVariantSize(v).toUpperCase() === sizeName.toUpperCase()
      );

      // Si no hay colores (producto solo con tallas), asignar variante directa
      if (!hasColors) {
        const matched = variantsForSize.find(v => (v.stock === undefined || Number(v.stock) > 0)) || variantsForSize[0];
        return {
          ...slot,
          selectedSize: sizeName,
          selectedColor: 'Único',
          selectedVariant: matched || null
        };
      }

      // Si ya tenía un color seleccionado, evaluar si ese color tiene stock > 0 para esta nueva talla
      let newColor = slot.selectedColor;
      let newVariant: ProductVariant | null = null;

      if (newColor) {
        const match = variantsForSize.find(
          v => extractVariantColor(v).toLowerCase() === newColor.toLowerCase() &&
               (v.stock === undefined || Number(v.stock) > 0)
        );
        if (match) {
          newVariant = match;
        } else {
          // El color anterior NO tiene stock para esta nueva talla -> deseleccionar color
          newColor = '';
          newVariant = null;
        }
      }

      return {
        ...slot,
        selectedSize: sizeName,
        selectedColor: newColor,
        selectedVariant: newVariant
      };
    }));
  };

  // Manejador de selección de Color para una prenda
  const handleSelectColor = (slotIndex: number, colorName: string) => {
    setSlots(prev => prev.map(slot => {
      if (slot.slotIndex !== slotIndex) return slot;

      // Filtrar variantes según la talla elegida (o todas si no tiene tallas)
      let candidateVariants = allVariants;
      if (hasSizes && slot.selectedSize) {
        candidateVariants = allVariants.filter(
          v => extractVariantSize(v).toUpperCase() === slot.selectedSize.toUpperCase()
        );
      }

      const match = candidateVariants.find(
        v => extractVariantColor(v).toLowerCase() === colorName.toLowerCase()
      );

      return {
        ...slot,
        selectedColor: colorName,
        selectedVariant: match || null
      };
    }));
  };

  // Atajo: Replicar la selección de la Prenda 1 a todas las demás prendas
  const handleReplicateSlot0 = () => {
    const source = slots[0];
    if (!source || (!source.selectedSize && !source.selectedColor)) return;

    setSlots(prev => prev.map((slot, idx) => {
      if (idx === 0) return slot;
      return {
        ...slot,
        selectedSize: source.selectedSize,
        selectedColor: source.selectedColor,
        selectedVariant: source.selectedVariant
      };
    }));
  };

  // Validación: ¿Están todas las prendas del combo completamente configuradas y válidas?
  const isComboComplete = useMemo(() => {
    return slots.every(slot => {
      if (hasSizes && hasColors) {
        return Boolean(slot.selectedSize && slot.selectedColor && slot.selectedVariant);
      }
      if (hasSizes) {
        return Boolean(slot.selectedSize && slot.selectedVariant);
      }
      if (hasColors) {
        return Boolean(slot.selectedColor && slot.selectedVariant);
      }
      return true;
    });
  }, [slots, hasSizes, hasColors]);

  // Conteo de prendas completadas
  const completedCount = useMemo(() => {
    return slots.filter(slot => {
      if (hasSizes && hasColors) {
        return Boolean(slot.selectedSize && slot.selectedColor && slot.selectedVariant);
      }
      if (hasSizes) return Boolean(slot.selectedSize);
      if (hasColors) return Boolean(slot.selectedColor);
      return true;
    }).length;
  }, [slots, hasSizes, hasColors]);

  // Al confirmar el combo
  const handleConfirm = () => {
    if (!isComboComplete) return;

    const itemsToCart = slots.map(slot => {
      const displayDesc = [
        slot.selectedSize ? `Talla ${slot.selectedSize}` : null,
        slot.selectedColor && slot.selectedColor !== 'Color Único' ? `Color ${slot.selectedColor}` : null
      ].filter(Boolean).join(' / ');

      return {
        variant: slot.selectedVariant || (allVariants[0] ?? undefined),
        quantity: 1,
        unitPrice: unitEffectivePrice,
        garmentLabel: slot.label,
        comboInfo: `Combo (${slot.label}: ${displayDesc})`
      };
    });

    onConfirmCombo(itemsToCart, actionType);
    onClose();
  };

  if (!isOpen) return null;

  const productImage = product.images?.[0] || product.imagen || (product as any).image || '';

  return (
    <div 
      id="combo-customizer-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="combo-customizer-panel"
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-slate-100 flex flex-col max-w-2xl w-full max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Elegante Modo Oscuro Zavela Store */}
        <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-base sm:text-lg uppercase tracking-tight text-white">
                  🛍️ Personaliza tu Combo ({quantity} Unidades)
                </h2>
                <span className="bg-red-500/20 text-red-400 font-mono font-bold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border border-red-500/40">
                  {quantity === 2 ? '10% OFF' : '14% OFF + ENVÍO'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Configura talla y color de cada prenda con inventario en tiempo real.
              </p>
            </div>
          </div>

          <button
            id="btn-close-combo-modal"
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700 shadow-2xs shrink-0"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra Informativa del Producto y Progreso */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {productImage && (
              <img 
                src={productImage} 
                alt={product.title} 
                className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="min-w-0">
              <span className="font-bold text-slate-200 truncate block text-xs">
                {product.title}
              </span>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono text-emerald-400 font-bold">
                  {formatCOP(unitEffectivePrice)} / unidad
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-300 font-medium">Pago Contra Entrega</span>
              </div>
            </div>
          </div>

          {/* Progreso de Selección */}
          <div className="text-right shrink-0">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              isComboComplete 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {completedCount} de {quantity} completadas
            </span>
          </div>
        </div>

        {/* Botón rápido para replicar elección de Prenda 1 si ya tiene selección */}
        {slots[0]?.selectedSize && (
          <div className="px-4 sm:px-6 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              ¿Quieres las mismas opciones en todas las prendas?
            </span>
            <button
              type="button"
              onClick={handleReplicateSlot0}
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-lg bg-sky-950/50 hover:bg-sky-900/50 border border-sky-800/60"
            >
              <Copy className="w-3 h-3" />
              <span>Copiar Prenda 1 a todas</span>
            </button>
          </div>
        )}

        {/* Cuerpo del Modal: Lista de Prendas a Personalizar */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 bg-slate-900/95">
          {slots.map((slot, index) => {
            const isSlotComplete = (hasSizes && hasColors)
              ? Boolean(slot.selectedSize && slot.selectedColor && slot.selectedVariant)
              : hasSizes ? Boolean(slot.selectedSize) : Boolean(slot.selectedColor);

            // Variantes para la talla seleccionada en esta prenda
            const variantsForThisSize = (hasSizes && slot.selectedSize)
              ? allVariants.filter(v => extractVariantSize(v).toUpperCase() === slot.selectedSize.toUpperCase())
              : allVariants;

            return (
              <div 
                key={slot.slotIndex}
                id={`combo-slot-card-${index}`}
                className={`rounded-2xl p-4 sm:p-5 border transition-all relative ${
                  isSlotComplete
                    ? 'bg-slate-950/80 border-emerald-500/40 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header de la Prenda */}
                <div className="flex items-center justify-between gap-2 mb-4 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      {index + 1}
                    </span>
                    <h3 className="font-extrabold text-sm sm:text-base text-white uppercase tracking-tight">
                      {slot.label}
                    </h3>
                  </div>

                  {isSlotComplete ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Lista: {slot.selectedSize ? `${slot.selectedSize}` : ''}{slot.selectedColor && slot.selectedColor !== 'Color Único' ? ` / ${slot.selectedColor}` : ''}</span>
                    </span>
                  ) : (
                    <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      ⏳ Paso {!slot.selectedSize && hasSizes ? '1: Talla' : '2: Color'}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* PASO 1: SELECCIÓN DE TALLA */}
                  {hasSizes && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-200 text-[10px] flex items-center justify-center font-bold">1</span>
                          <span>Selecciona la Talla:</span>
                          <span className="text-rose-400 text-[11px] font-bold">* Obligatorio</span>
                        </label>
                        {slot.selectedSize && (
                          <span className="text-[11px] font-extrabold text-emerald-400 font-mono">
                            Talla elegida: {slot.selectedSize}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {distinctSizes.map((sz) => {
                          const isSelected = slot.selectedSize.toUpperCase() === sz.toUpperCase();
                          
                          // Evaluar si esta talla tiene stock > 0 en alguna variante
                          const variantsForSz = allVariants.filter(
                            v => extractVariantSize(v).toUpperCase() === sz.toUpperCase()
                          );
                          const isSizeOutOfStock = variantsForSz.length > 0 && variantsForSz.every(
                            v => (v.stock !== undefined && Number(v.stock) <= 0)
                          );

                          return (
                            <button
                              key={sz}
                              type="button"
                              id={`slot-${index}-size-${sz.replace(/\s+/g, '-').toLowerCase()}`}
                              disabled={isSizeOutOfStock}
                              onClick={() => handleSelectSize(slot.slotIndex, sz)}
                              className={`px-4 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                isSizeOutOfStock
                                  ? 'border-slate-800/80 bg-slate-900/40 text-slate-600 line-through cursor-not-allowed opacity-40'
                                  : isSelected
                                    ? 'border-red-500 bg-red-600 text-white font-black shadow-md ring-2 ring-red-500/40 scale-102'
                                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-750'
                              }`}
                              title={isSizeOutOfStock ? 'Talla sin existencias en bodega' : `Elegir talla ${sz}`}
                            >
                              <span>{sz}</span>
                              {isSizeOutOfStock && (
                                <span className="ml-1 text-[9px] uppercase font-bold text-rose-400 no-underline">
                                  (Agotada)
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PASO 2: SELECCIÓN DE COLOR (CON VALIDACIÓN DE INVENTARIO EN TIEMPO REAL) */}
                  {hasColors && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-200 text-[10px] flex items-center justify-center font-bold">
                            {hasSizes ? '2' : '1'}
                          </span>
                          <span>
                            {hasSizes && slot.selectedSize
                              ? `Selecciona el Color (para Talla ${slot.selectedSize}):`
                              : 'Selecciona el Color:'}
                          </span>
                          <span className="text-rose-400 text-[11px] font-bold">* Obligatorio</span>
                        </label>
                        {slot.selectedColor && (
                          <span className="text-[11px] font-extrabold text-emerald-400">
                            Color: {slot.selectedColor}
                          </span>
                        )}
                      </div>

                      {/* Si el producto tiene tallas y aún no elige talla, mostrar guía interactiva */}
                      {hasSizes && !slot.selectedSize ? (
                        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Primero selecciona la talla arriba para evaluar los colores disponibles en bodega.</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {distinctColors.map((colorName) => {
                            const isSelected = slot.selectedColor.toLowerCase() === colorName.toLowerCase();
                            const swatch = getColorSwatchInfo(colorName);

                            // Buscar la variante exacta para esta talla y este color
                            const matchVariant = variantsForThisSize.find(
                              v => extractVariantColor(v).toLowerCase() === colorName.toLowerCase()
                            );

                            // CRÍTICO: Validación de inventario en tiempo real
                            const hasStock = matchVariant !== undefined && (matchVariant.stock === undefined || Number(matchVariant.stock) > 0);

                            return (
                              <button
                                key={colorName}
                                type="button"
                                id={`slot-${index}-color-${colorName.replace(/\s+/g, '-').toLowerCase()}`}
                                disabled={!hasStock}
                                onClick={() => handleSelectColor(slot.slotIndex, colorName)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                                  !hasStock
                                    ? 'border-slate-800/60 bg-slate-950/60 text-slate-600 line-through cursor-not-allowed opacity-35'
                                    : isSelected
                                      ? 'border-red-500 bg-slate-800 text-white font-extrabold shadow-md ring-2 ring-red-500/40'
                                      : 'border-slate-700 bg-slate-900/90 text-slate-200 hover:border-slate-500 hover:bg-slate-800 cursor-pointer'
                                }`}
                                title={!hasStock ? `Color ${colorName} agotado para esta talla` : `Color ${colorName}`}
                              >
                                <span 
                                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                                  style={{
                                    backgroundColor: swatch.bg,
                                    border: swatch.border ? `1px solid ${swatch.border}` : '1px solid rgba(255,255,255,0.2)'
                                  }}
                                />
                                <span className="font-semibold">
                                  {colorName}
                                  {hasStock && matchVariant?.stock !== undefined && (
                                    <span className="text-[11px] font-mono text-emerald-400 font-normal ml-1">
                                      ({matchVariant.stock} un.)
                                    </span>
                                  )}
                                </span>

                                {isSelected && hasStock && (
                                  <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                )}

                                {!hasStock && (
                                  <span className="text-[9px] uppercase font-bold text-rose-400 bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-800/80 no-underline ml-1">
                                    Agotado
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resumen de la variante asignada para esta prenda */}
                  {slot.selectedVariant && (
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-medium">
                          Variante lista para despacho: <strong>{slot.selectedSize} / {slot.selectedColor}</strong>
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        Stock OK ({slot.selectedVariant.stock ?? 10} un.)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer / Barra de Acción Destacada */}
        <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">
              Total Combo ({quantity} Unidades):
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-mono font-black text-red-500 tracking-tight">
                {formatCOP(discountedTotal)}
              </span>
              {savings > 0 && (
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  ¡Ahorras {formatCOP(savings)}!
                </span>
              )}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Envío Gratis Incluido + Pago Contra Entrega Nacional</span>
            </div>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-1.5">
            {/* BOTÓN FINAL DE ACCIÓN DESTACADO EN ROJO */}
            <button
              id="btn-confirm-combo"
              type="button"
              disabled={!isComboComplete}
              onClick={handleConfirm}
              className={`py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                isComboComplete
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xl shadow-red-600/30 hover:shadow-red-600/50 cursor-pointer active:scale-98 border-red-500/40'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>🤝 CONFIRMAR Y AGREGAR ({formatCOP(discountedTotal)})</span>
            </button>

            {!isComboComplete && (
              <span className="text-[11px] text-amber-400 font-medium text-center sm:text-right">
                ⚠️ Selecciona talla y color para las {quantity} prendas para habilitar
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
