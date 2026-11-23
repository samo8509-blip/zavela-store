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
  /** Máximo de productos por fila rotativa. El resto se ve en "Ver todo". */
  maxPerSection?: number;
}

/** Velocidad del giro automático (píxeles por segundo). Bajo = movimiento lento y suave. */
const AUTO_SPEED_PX_PER_SEC = 28;
/** Tiempo de espera antes de reanudar el giro cuando el cliente tocó o movió la fila. */
const RESUME_DELAY_MS = 2500;

const columnsForWidth = (w: number) => (w >= 1024 ? 4 : w >= 768 ? 3 : 2);

const Row: React.FC<{ section: CategoryRowSection; renderProduct: (p: Product) => React.ReactNode; max: number }> = ({
  section,
  renderProduct,
  max,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const inViewRef = useRef(true);
  const resumeTimer = useRef<number | undefined>(undefined);

  const shown = section.products.slice(0, max);
  const total = section.products.length;

  const [cols, setCols] = useState(() => (typeof window === 'undefined' ? 4 : columnsForWidth(window.innerWidth)));
  const needsLoop = shown.length > cols;

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const onResize = () => setCols(columnsForWidth(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** Ancho de una vuelta completa (la lista va duplicada para que el giro nunca se corte). */
  const halfWidth = useCallback(() => {
    const el = trackRef.current;
    if (!el || !needsLoop) return 0;
    const first = el.children[0] as HTMLElement | undefined;
    const second = el.children[shown.length] as HTMLElement | undefined;
    if (!first || !second) return 0;
    return second.offsetLeft - first.offsetLeft;
  }, [needsLoop, shown.length]);

  const pauseFor = useCallback((ms: number) => {
    pausedRef.current = true;
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      const el = trackRef.current;
      if (el) posRef.current = el.scrollLeft;
      pausedRef.current = false;
    }, ms);
  }, []);

  const holdWhileInteracting = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    pausedRef.current = true;
    // Si está pegado al inicio, lo pasamos a la copia para que se pueda deslizar hacia atrás sin topar.
    const el = trackRef.current;
    if (el && needsLoop && el.scrollLeft < 2) el.scrollLeft = halfWidth();
  }, [needsLoop, halfWidth]);

  const releaseAfterInteraction = useCallback(() => pauseFor(RESUME_DELAY_MS), [pauseFor]);

  // Giro automático de derecha a izquierda, lento y continuo.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !needsLoop || reduceMotion) return;
    posRef.current = el.scrollLeft;
    let raf = 0;
    let last = 0;

    const step = (t: number) => {
      if (last && !pausedRef.current && inViewRef.current) {
        const dt = Math.min(t - last, 100);
        const half = halfWidth();
        posRef.current += (AUTO_SPEED_PX_PER_SEC * dt) / 1000;
        if (half > 0 && posRef.current >= half) posRef.current -= half;
        el.scrollLeft = posRef.current;
      }
      last = t;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // Si el cliente desliza a mano, mantenemos el bucle sin saltos.
    const onScroll = () => {
      const half = halfWidth();
      if (!half) return;
      if (el.scrollLeft >= half) el.scrollLeft -= half;
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
      window.clearTimeout(resumeTimer.current);
    };
  }, [needsLoop, reduceMotion, halfWidth]);

  // Solo gira mientras la fila está a la vista.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => { inViewRef.current = entry.isIntersecting; }, { threshold: 0.05 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const move = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    pauseFor(RESUME_DELAY_MS + 1200);
    if (needsLoop) {
      const half = halfWidth();
      if (dir === -1 && el.scrollLeft < el.clientWidth * 0.9 && half) el.scrollLeft += half;
    }
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const items = needsLoop ? [...shown, ...shown] : shown;

  return (
    <section
      ref={sectionRef}
      aria-label={section.title}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 380px' }}
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
          {needsLoop && (
            <>
              <button
                type="button"
                aria-label={`Anterior en ${section.title}`}
                onClick={() => move(-1)}
                className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={`Siguiente en ${section.title}`}
                onClick={() => move(1)}
                className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        onMouseEnter={holdWhileInteracting}
        onMouseLeave={releaseAfterInteraction}
        onTouchStart={holdWhileInteracting}
        onTouchEnd={releaseAfterInteraction}
        onTouchCancel={releaseAfterInteraction}
        onFocusCapture={holdWhileInteracting}
        onBlurCapture={releaseAfterInteraction}
        className="grid grid-rows-1 grid-flow-col gap-3 sm:gap-4 overflow-x-auto scrollbar-none pb-1 auto-cols-[calc((100%_-_12px)_/_2)] sm:auto-cols-[calc((100%_-_16px)_/_2)] md:auto-cols-[calc((100%_-_32px)_/_3)] lg:auto-cols-[calc((100%_-_48px)_/_4)]"
      >
        {items.map((p, i) => (
          <div
            key={`${p.id || p.slug}-${i}`}
            className="min-w-0"
            aria-hidden={needsLoop && i >= shown.length ? true : undefined}
          >
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
