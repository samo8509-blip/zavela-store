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
  categories: { id?: string; slug?: string; name?: string }[];
  onSearch: (q: string) => void;
  onSelectCategory: (id: string) => void;
}

const firstImage = (p: Product): string => {
  const anyP = p as any;
  return anyP.image || anyP.imagen || (Array.isArray(anyP.images) ? anyP.images[0] : '') || (Array.isArray(anyP.imagenes) ? anyP.imagenes[0] : '') || '';
};

export const HomeHero: React.FC<HomeHeroProps> = ({ themeId, style, products, whatsappNumber, onExploreCatalog, onSelectProduct, categories, onSearch, onSelectCategory }) => {
  const featured = products
    .filter(p => p.active !== false && Number(p.stock) !== 0 && firstImage(p))
    .filter(p => !/sex|adult/i.test(String(p.categoryName || '')))
    .slice(0, 4);
  const waHref = `https://wa.me/${String(whatsappNumber).replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero que me ayuden a elegir un producto')}`;

  const [q, setQ] = React.useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
  };
  const pills = categories.slice(0, 8);

  return (
    <section id="home-hero" aria-label="Bienvenida" className="zs-font space-y-12 sm:space-y-16 pt-2 sm:pt-6">
      <div className="flex flex-col items-center text-center gap-6 sm:gap-8">
        {featured.length > 0 && (
          <div className="flex items-end justify-center gap-3 sm:gap-4">
            {featured.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProduct(p)}
                className={`zs-card text-left cursor-pointer border-0 p-2 w-36 sm:w-44 lg:w-48 ${i >= 2 ? 'hidden sm:block' : ''} ${['-rotate-3 -translate-y-2', 'rotate-2 translate-y-2', '-rotate-2 -translate-y-1', 'rotate-3 translate-y-1'][i]}`}
                aria-label={`Ver ${p.title}`}
              >
                <img
                  src={firstImage(p)}
                  alt={p.title}
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
        )}

        <h1 className="font-semibold text-black leading-[1.05] text-4xl sm:text-6xl" style={{ letterSpacing: '-0.05em' }}>
          Compra hoy. Paga cuando te llegue<span style={{ color: 'var(--shop-violet)' }}>.</span>
        </h1>
        <p className="text-base sm:text-lg max-w-xl text-[color:var(--shop-muted)]" style={{ letterSpacing: '-0.031em' }}>
          Los productos que están pidiendo todos, enviados a tu puerta. Sin tarjeta y sin riesgo.
        </p>

        <form onSubmit={submit} role="search" className="w-full max-w-2xl flex items-center bg-white rounded-full border border-black/10 pl-5 pr-1 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
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
          <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
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

        <div className="flex flex-wrap justify-center gap-3">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
