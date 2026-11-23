import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types/index.ts';

export interface CategoryRowSection {
  key: string;
  title: string;
  products: Product[];
  /** Si existe, se muestra el enlace "Ver todo" que abre la página de esa categoría. */
  onViewAll?: () => void;
}

interface CategoryRowsProps {
  sections: CategoryRowSection[];
  renderProduct: (product: Product) => React.ReactNode;
  /** Máximo de productos por fila deslizable (2 renglones). El resto se ve en "Ver todo". */
  maxPerSection?: number;
}

const Row: React.FC<{ section: CategoryRowSection; renderProduct: (p: Product) => React.ReactNode; max: number }> = ({
  section,
  renderProduct,
  max,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, section.products.length]);

  const move = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const shown = section.products.slice(0, max);
  const total = section.products.length;

  return (
    <section
      aria-label={section.title}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 620px' }}
    >
      <div className="flex items-center justify-between gap-3 px-1 mb-2.5">
        <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-wide truncate">
          {section.title}
          <span className="ml-2 text-[11px] font-mono font-bold text-slate-400">{total}</span>
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {section.onViewAll && (
            <button
              type="button"
              onClick={section.onViewAll}
              className="text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer mr-1"
            >
              Ver todo
            </button>
          )}
          <button
            type="button"
            aria-label={`Anterior en ${section.title}`}
            onClick={() => move(-1)}
            disabled={!canPrev}
            className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-default cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label={`Siguiente en ${section.title}`}
            onClick={() => move(1)}
            disabled={!canNext}
            className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-default cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="grid grid-rows-2 grid-flow-col gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none pb-1 auto-cols-[calc((100%_-_12px)_/_2)] sm:auto-cols-[calc((100%_-_16px)_/_2)] md:auto-cols-[calc((100%_-_32px)_/_3)] lg:auto-cols-[calc((100%_-_48px)_/_4)]"
      >
        {shown.map((p) => (
          <div key={p.id || p.slug} className="snap-start min-w-0">
            {renderProduct(p)}
          </div>
        ))}
      </div>
    </section>
  );
};

export const CategoryRows: React.FC<CategoryRowsProps> = ({ sections, renderProduct, maxPerSection = 16 }) => (
  <div className="space-y-8">
    {sections.map((s) => (
      <Row key={s.key} section={s} renderProduct={renderProduct} max={maxPerSection} />
    ))}
  </div>
);
