import React from 'react';
import { Product } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';
import { getStorefrontPalette, SeasonalThemeId } from '../utils/seasonalThemes.ts';

interface HomeHeroProps {
  themeId: SeasonalThemeId;
  style?: 'marca' | 'mercado-vivo';
  products: Product[];
  whatsappNumber: string;
  onExploreCatalog: () => void;
  onSelectProduct: (p: Product) => void;
}

const firstImage = (p: Product): string => {
  const anyP = p as any;
  return anyP.image || anyP.imagen || (Array.isArray(anyP.images) ? anyP.images[0] : '') || (Array.isArray(anyP.imagenes) ? anyP.imagenes[0] : '') || '';
};

export const HomeHero: React.FC<HomeHeroProps> = ({ themeId, style, products, whatsappNumber, onExploreCatalog, onSelectProduct }) => {
  const palette = getStorefrontPalette(themeId, style);
  const featured = products
    .filter(p => p.active !== false && Number(p.stock) !== 0 && firstImage(p))
    .filter(p => !/sex|adult/i.test(String(p.categoryName || '')))
    .slice(0, 2);
  const waHref = `https://wa.me/${String(whatsappNumber).replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero que me ayuden a elegir un producto')}`;

  return (
    <section id="home-hero" aria-label="Bienvenida" className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div
          className="relative flex-1 min-w-0 rounded-[28px] sm:rounded-[32px] px-6 py-8 sm:px-12 sm:py-12 overflow-hidden flex flex-col justify-center gap-4 sm:gap-5"
          style={{ background: palette.hero, color: palette.heroInk }}
        >
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full opacity-35 pointer-events-none" style={{ background: palette.glow }} />
          <span
            className="relative self-start text-[11px] sm:text-xs font-extrabold tracking-widest px-3.5 py-1.5 rounded-full"
            style={{ background: palette.badgeBg, color: palette.badgeInk }}
          >
            {palette.badge}
          </span>
          <h1 className="relative font-black tracking-tight leading-[1.02] text-4xl sm:text-5xl lg:text-6xl">
            Compra hoy.<br />Paga cuando<br />
            <span style={{ color: palette.p1 }}>te llegue.</span>
          </h1>
          <p className="relative text-base sm:text-lg leading-relaxed max-w-md opacity-90">
            Los productos que están pidiendo todos, enviados a tu puerta. Sin tarjeta y sin riesgo.
          </p>
          <div className="relative flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={onExploreCatalog}
              className="font-bold px-6 py-3.5 rounded-full text-sm sm:text-base cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-95"
              style={{ background: palette.cta, color: palette.ctaInk }}
            >
              Ver el catálogo
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold px-6 py-3.5 rounded-full text-sm sm:text-base bg-white/20 hover:bg-white/30 transition-colors"
              style={{ color: palette.heroInk }}
            >
              Hablar con un asesor
            </a>
          </div>
        </div>

        {featured.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 lg:w-[38%] shrink-0">
            {featured.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProduct(p)}
                className="relative min-h-[200px] sm:min-h-[240px] rounded-[24px] sm:rounded-[28px] overflow-hidden text-left cursor-pointer group border-0 p-0"
                style={{ background: i === 0 ? palette.p1 : palette.p2 }}
                aria-label={`Ver ${p.title}`}
              >
                <img
                  src={firstImage(p)}
                  alt={p.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/75 to-transparent text-white">
                  <span className="block font-extrabold leading-tight text-base sm:text-lg line-clamp-2">{p.title}</span>
                  <span className="block font-bold text-sm">{formatCOP(p.price)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="rounded-[24px] sm:rounded-[28px] p-5 sm:p-7 text-white grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6"
        style={{ background: palette.stripBg }}
      >
        {[
          { t: '1. Elige', d: 'Escoge tu producto y llena tus datos de envío.' },
          { t: '2. Recibe', d: 'Te lo llevamos a la puerta, con envío gratis.' },
          { t: '3. Paga', d: 'Pagas en efectivo al recibir. Sin adelantos.' }
        ].map(s => (
          <div key={s.t}>
            <div className="font-black text-xl sm:text-2xl" style={{ color: style === 'mercado-vivo' && palette.stripBg === '#0B1F4B' ? '#FFD23F' : palette.p1 }}>{s.t}</div>
            <div className="text-sm opacity-90 mt-1">{s.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
