import React from 'react';
import { Product } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';
import { SeasonalThemeId } from '../utils/seasonalThemes.ts';

interface HomeHeroProps {
  themeId: SeasonalThemeId;
  style?: 'marca' | 'mercado-vivo';
  products: Product[];
  whatsappNumber: string;
  onExploreCatalog: () => void;
  onSelectProduct: (p: Product) => void;
  /** true = la cinta muestra solo categorías elegidas: sin tope de 2 por categoría */
  ribbonOnlySelected?: boolean;
  ribbonCount?: number;
  categories: { id?: string; slug?: string; name?: string }[];
  onSearch: (q: string) => void;
  onSelectCategory: (id: string) => void;
}

const firstImage = (p: Product): string => {
  const anyP = p as any;
  return anyP.image || anyP.imagen || (Array.isArray(anyP.images) ? anyP.images[0] : '') || (Array.isArray(anyP.imagenes) ? anyP.imagenes[0] : '') || '';
};

export const HomeHero: React.FC<HomeHeroProps> = ({ themeId, style, products, whatsappNumber, onExploreCatalog, onSelectProduct, categories, onSearch, onSelectCategory, ribbonOnlySelected, ribbonCount = 14 }) => {
  // Cinta de productos: destacados y con descuento primero, y como máximo 2 por categoría para que haya variedad
  const eligible = products
    .filter(p => p.active !== false && Number(p.stock) !== 0 && firstImage(p))
    .filter(p => !/sex|adult/i.test(String(p.categoryName || '')));
  const ranked = [
    ...eligible.filter(p => p.featured),
    ...eligible.filter(p => !p.featured && (p.discountPercentage || 0) > 0).sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0)),
    ...eligible.filter(p => !p.featured && !((p.discountPercentage || 0) > 0))
  ];
  const perCat: Record<string, number> = {};
  const featured: Product[] = [];
  for (const p of ranked) {
    const k = String(p.categoryName || p.categoryId || 'x');
    if (!ribbonOnlySelected && (perCat[k] || 0) >= 2) continue;
    perCat[k] = (perCat[k] || 0) + 1;
    featured.push(p);
    if (featured.length >= ribbonCount) break;
  }
  const waHref = `https://wa.me/${String(whatsappNumber).replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero que me ayuden a elegir un producto')}`;

  const [q, setQ] = React.useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
  };
  const pills = categories.slice(0, 8);

  // Cinta arrastrable: gira sola muy despacio hacia la izquierda y el cliente la puede mover con el dedo o el mouse, rápido o despacio.
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ x: number; t: number; moved: boolean; id: number } | null>(null);
  const movedRef = React.useRef(false);
  const offsetRef = React.useRef(0);
  const velRef = React.useRef(0); // px por segundo (inercia)
  const hoverRef = React.useRef(false);
  const pauseUntil = React.useRef(0);
  const inViewRef = React.useRef(true);
  const [reduceMotion] = React.useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const jsMarquee = featured.length >= 5 && !reduceMotion;

  React.useEffect(() => {
    const track = trackRef.current;
    const wrap = wrapRef.current;
    if (!track || !wrap || !jsMarquee) return;
    let raf = 0;
    let last = 0;
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([e]) => { inViewRef.current = e.isIntersecting; }, { threshold: 0.01 })
      : null;
    io?.observe(wrap);
    const apply = () => {
      const half = track.offsetWidth / 2;
      if (half > 0) {
        while (offsetRef.current <= -half) offsetRef.current += half;
        while (offsetRef.current > 0) offsetRef.current -= half;
      }
      track.style.transform = `translate3d(${offsetRef.current.toFixed(1)}px,0,0)`;
    };
    const step = (t: number) => {
      const dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
      last = t;
      if (inViewRef.current && dt > 0) {
        const half = track.offsetWidth / 2;
        if (!dragRef.current) {
          if (Math.abs(velRef.current) > 4) {
            offsetRef.current += velRef.current * dt;
            velRef.current *= Math.pow(0.04, dt); // se frena en ~1 segundo
          } else if (!hoverRef.current && performance.now() > pauseUntil.current && half > 0) {
            offsetRef.current -= (half / 70) * dt; // una vuelta completa cada 70 s, igual que antes
          }
        }
        apply();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); io?.disconnect(); };
  }, [jsMarquee, featured.length]);

  const onDown = (e: React.PointerEvent) => {
    if (!jsMarquee || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragRef.current = { x: e.clientX, t: performance.now(), moved: false, id: e.pointerId };
    movedRef.current = false;
    velRef.current = 0;
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      movedRef.current = true;
      try { (e.currentTarget as HTMLElement).setPointerCapture(d.id); } catch {}
    }
    if (d.moved) {
      const now = performance.now();
      const dtMs = Math.max(1, now - d.t);
      offsetRef.current += dx;
      // velocidad suavizada: así un arrastre rápido sigue con inercia y uno lento se queda donde lo soltaste
      velRef.current = velRef.current * 0.6 + ((dx / dtMs) * 1000) * 0.4;
      d.x = e.clientX;
      d.t = now;
    }
  };
  const onUp = () => {
    const d = dragRef.current;
    if (!d) return;
    if (performance.now() - d.t > 90) velRef.current = 0; // si se detuvo antes de soltar, no hay inercia
    dragRef.current = null;
    pauseUntil.current = performance.now() + 2500;
  };

  return (
    <section id="home-hero" aria-label="Bienvenida" className="zs-font overflow-x-clip space-y-12 sm:space-y-16 max-md:space-y-4 pt-2 sm:pt-6">
      <div className="flex flex-col items-center text-center gap-6 sm:gap-8 max-md:gap-3">
        {featured.length > 0 && (
          <div
            ref={wrapRef}
            className="zs-marquee-wrap w-screen relative left-1/2 -translate-x-1/2 overflow-hidden py-4 select-none"
            style={jsMarquee ? { touchAction: 'pan-y', cursor: 'grab' } : undefined}
            aria-label="Productos de la tienda"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onMouseEnter={() => { hoverRef.current = true; }}
            onMouseLeave={() => { hoverRef.current = false; }}
            onClickCapture={(e) => { if (movedRef.current) { e.stopPropagation(); e.preventDefault(); movedRef.current = false; } }}
          >
            <div ref={trackRef} className={`zs-marquee flex items-end gap-4 sm:gap-5 w-max ${featured.length < 5 ? 'zs-marquee-still' : ''} ${jsMarquee ? 'zs-marquee-js' : ''}`}>
              {[...featured, ...(featured.length >= 5 ? featured : [])].map((p, i) => (
                <button
                  key={`${p.id}-${i}`}
                  type="button"
                  onClick={() => onSelectProduct(p)}
                  className={`zs-card text-left cursor-pointer border-0 p-2 w-36 max-md:w-28 sm:w-44 lg:w-48 shrink-0 ${['-rotate-2', 'rotate-1 translate-y-3', 'rotate-2', '-rotate-1 translate-y-2'][i % 4]}`}
                  aria-label={`Ver ${p.title}`}
                  aria-hidden={i >= featured.length ? true : undefined}
                  tabIndex={i >= featured.length ? -1 : 0}
                >
                  <img
                    src={firstImage(p)}
                    alt={i >= featured.length ? '' : p.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full aspect-square object-cover rounded-[20px]"
                  />
                  <span className="block px-2 pt-2 pb-1">
                    <span className="block font-semibold text-xs sm:text-sm leading-tight line-clamp-1 text-black">{p.title}</span>
                    <span className="block text-xs text-[color:var(--shop-muted)]">{formatCOP(p.price)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <h1 className="font-semibold text-black leading-[1.05] text-4xl max-md:text-2xl sm:text-6xl" style={{ letterSpacing: '-0.05em' }}>
          Compra hoy. Paga cuando te llegue<span style={{ color: 'var(--shop-violet)' }}>.</span>
        </h1>
        <p className="max-md:hidden text-base sm:text-lg max-w-xl text-[color:var(--shop-muted)]" style={{ letterSpacing: '-0.031em' }}>
          Los productos que están pidiendo todos, enviados a tu puerta. Sin tarjeta y sin riesgo.
        </p>

        <form onSubmit={submit} role="search" className="max-md:order-first w-full max-w-2xl flex items-center bg-white rounded-full border border-black/10 pl-5 pr-1 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="¿Qué estás buscando hoy?"
            aria-label="Buscar productos"
            className="flex-1 min-w-0 bg-transparent outline-hidden text-base text-black placeholder:text-[color:var(--shop-muted)]"
          />
          <button type="submit" aria-label="Buscar" className="zs-search-btn w-12 h-12 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </form>

        {pills.length > 0 && (
          <div className="hidden md:flex flex-wrap justify-center gap-2 max-w-3xl">
            {pills.map(c => (
              <button
                key={c.id || c.slug}
                type="button"
                onClick={() => onSelectCategory(c.id)}
                className="zs-pill rounded-full px-4 py-1.5 text-sm text-black cursor-pointer transition-colors"
              >
                {(c.name || '').replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}
              </button>
            ))}
          </div>
        )}

        <div className="max-md:hidden flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onExploreCatalog}
            className="font-semibold px-6 py-3 rounded-full text-sm sm:text-base cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-95"
            style={{ background: 'var(--zv-cta, #ff5a4f)', color: 'var(--zv-cta-ink, #fff)' }}
          >
            Ver el catálogo
          </button>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="zs-pill rounded-full font-semibold px-6 py-3 text-sm sm:text-base text-black"
          >
            Hablar con un asesor
          </a>
        </div>
      </div>

      <div className="max-md:hidden grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { t: '1. Elige', d: 'Escoge tu producto y llena tus datos de envío.' },
          { t: '2. Recibe', d: 'Te lo llevamos a la puerta, con envío gratis.' },
          { t: '3. Paga', d: 'Pagas en efectivo al recibir. Sin adelantos.' }
        ].map(st => (
          <div key={st.t} className="zs-card p-5 sm:p-6" style={{ transform: 'none' }}>
            <div className="font-semibold text-xl text-black" style={{ letterSpacing: '-0.05em' }}>{st.t}</div>
            <div className="text-sm text-[color:var(--shop-muted)] mt-1">{st.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
