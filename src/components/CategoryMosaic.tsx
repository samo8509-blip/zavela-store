import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Product } from '../types/index.ts';
import { extractProductImages } from '../utils/imageUtils.ts';

export interface MosaicSection {
  key: string;
  title: string;
  products: Product[];
  onViewAll?: () => void;
}

interface CategoryMosaicProps {
  sections: MosaicSection[];
  onSelectProduct: (p: Product) => void;
}

const SLOTS = 4;
const SWAP_EVERY_MS = 3600;
const MAX_POOL = 24;

type Tile = { p: Product; img: string };
const keyOf = (p: Product) => String(p.id || p.slug);

const shuffled = (n: number): number[] => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Un bloque de categoría: 4 casillas. Si la categoría tiene más productos, las casillas se van cambiando una a una por otros de la misma categoría. */
const MosaicBlock: React.FC<{
  title: string;
  onViewAll?: () => void;
  pool: Tile[];
  onSelectProduct: (p: Product) => void;
  offsetMs: number;
}> = ({ title, onViewAll, pool, onSelectProduct, offsetMs }) => {
  const sig = pool.map(t => keyOf(t.p)).join('|');
  const rotates = pool.length > SLOTS;

  // Orden aleatorio por visita: así cada vez que entran ven productos distintos primero.
  const [order, setOrder] = React.useState<number[]>(() => (rotates ? shuffled(pool.length) : pool.map((_, i) => i)));
  const [slots, setSlots] = React.useState<number[]>(() => order.slice(0, SLOTS));
  const [prevImg, setPrevImg] = React.useState<Record<number, string>>({});
  const [fresh, setFresh] = React.useState<Record<number, boolean>>({});
  const slotsRef = React.useRef(slots);
  slotsRef.current = slots;
  const firstRun = React.useRef(true);
  const nextRef = React.useRef(SLOTS);
  const tickRef = React.useRef(0);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inViewRef = React.useRef(false);
  const hoverRef = React.useRef(false);

  // Si cambian los productos de la categoría, se reinicia el orden.
  React.useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; } // la primera vez ya se armó con el estado inicial
    const o = rotates ? shuffled(pool.length) : pool.map((_, i) => i);
    setOrder(o);
    setSlots(o.slice(0, SLOTS));
    setPrevImg({});
    setFresh({});
    nextRef.current = SLOTS;
    tickRef.current = 0;
  }, [sig]);

  React.useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { inViewRef.current = e.isIntersecting; }, { threshold: 0.2 });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!rotates) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (!inViewRef.current || hoverRef.current || document.hidden) { timer = window.setTimeout(tick, 1200); return; }
      const slot = tickRef.current % SLOTS;
      tickRef.current += 1;
      const cur = slotsRef.current;
      // siguiente producto del orden que no esté ya a la vista
      let cand = -1;
      for (let k = 0; k < order.length; k++) {
        const c = order[(nextRef.current + k) % order.length];
        if (!cur.includes(c)) { cand = c; nextRef.current = (nextRef.current + k + 1) % order.length; break; }
      }
      if (cand >= 0 && pool[cand]) {
        // precarga la foto antes del cambio para que no aparezca un hueco
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          const old = pool[slotsRef.current[slot]]?.img;
          if (old) setPrevImg(pv => ({ ...pv, [slot]: old }));
          setFresh(f => ({ ...f, [slot]: true }));
          setSlots(c2 => c2.map((v, i) => (i === slot ? cand : v)));
          window.setTimeout(() => {
            if (cancelled) return;
            setPrevImg(pv => { const n = { ...pv }; delete n[slot]; return n; });
            setFresh(f => ({ ...f, [slot]: false }));
          }, 900);
        };
        img.referrerPolicy = 'no-referrer';
        img.src = pool[cand].img;
      }
      timer = window.setTimeout(tick, SWAP_EVERY_MS);
    };
    timer = window.setTimeout(tick, SWAP_EVERY_MS + offsetMs);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [rotates, order, offsetMs, sig]);

  return (
    <div className="min-w-0">
      <button type="button" onClick={onViewAll} className="flex items-center gap-1 mb-3 text-left cursor-pointer max-w-full">
        <span className="font-semibold text-black text-base sm:text-xl truncate" style={{ letterSpacing: '-0.05em' }}>{title}</span>
        <ChevronRight className="w-4 h-4 text-black shrink-0" />
      </button>
      <div
        ref={boxRef}
        onMouseEnter={() => { hoverRef.current = true; }}
        onMouseLeave={() => { hoverRef.current = false; }}
        className="grid grid-cols-2 gap-[3px] rounded-[28px] overflow-hidden bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]"
      >
        {slots.map((idx, slot) => {
          const t = pool[idx];
          if (!t) return null;
          const { p, img } = t;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSelectProduct(p)}
              className="relative aspect-[4/5] overflow-hidden cursor-pointer group border-0 p-0"
              aria-label={`Ver ${p.title}`}
            >
              {prevImg[slot] && (
                <img src={prevImg[slot]} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <img
                key={keyOf(p)}
                src={img}
                alt={p.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${fresh[slot] ? 'zs-tile-in' : ''}`}
              />
              <span className="absolute left-1.5 right-1.5 bottom-1.5 bg-white/85 backdrop-blur-sm rounded-xl px-2 py-1 text-[11px] sm:text-xs font-medium text-black line-clamp-1 text-left">
                {String(p.title || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * "Compra por categoría" al estilo Shop: cada categoría es un bloque con su título y un mosaico
 * de 4 fotos de producto (2x2) con esquinas de 28px. Si la categoría tiene más de 4 productos,
 * las fotos van alternando de a una con otros productos de la misma categoría.
 */
export const CategoryMosaic: React.FC<CategoryMosaicProps> = ({ sections, onSelectProduct }) => {
  const blocks = sections
    .filter(s => s.key.startsWith('cat-'))
    .map(s => ({
      ...s,
      pool: s.products
        .map(p => ({ p, img: extractProductImages(p)[0] }))
        .filter((t): t is Tile => !!t.img)
        .slice(0, MAX_POOL)
    }))
    .filter(b => b.pool.length >= 2)
    .slice(0, 16);

  if (blocks.length === 0) return null;

  return (
    <section id="home-category-mosaic" aria-label="Compra por categoría" className="zs-font space-y-6">
      <h2 className="font-semibold text-black text-2xl sm:text-3xl" style={{ letterSpacing: '-0.05em' }}>
        Compra por categoría
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-10 sm:gap-x-5">
        {blocks.map((b, i) => (
          <MosaicBlock
            key={b.key}
            title={b.title}
            onViewAll={b.onViewAll}
            pool={b.pool}
            onSelectProduct={onSelectProduct}
            offsetMs={(i % 4) * 900}
          />
        ))}
      </div>
    </section>
  );
};
