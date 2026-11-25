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

/**
 * "Compra por categoría" al estilo Shop: cada categoría es un bloque con su título y un mosaico
 * de 4 fotos de producto (2x2) con esquinas de 28px. La foto manda; no hay íconos ni tarjetas de texto.
 */
export const CategoryMosaic: React.FC<CategoryMosaicProps> = ({ sections, onSelectProduct }) => {
  const blocks = sections
    .filter(s => s.key.startsWith('cat-'))
    .map(s => ({
      ...s,
      tiles: s.products
        .map(p => ({ p, img: extractProductImages(p)[0] }))
        .filter(t => !!t.img)
        .slice(0, 4)
    }))
    .filter(b => b.tiles.length >= 2)
    .slice(0, 16);

  if (blocks.length === 0) return null;

  return (
    <section id="home-category-mosaic" aria-label="Compra por categoría" className="zs-font space-y-6">
      <h2 className="font-semibold text-black text-2xl sm:text-3xl" style={{ letterSpacing: '-0.05em' }}>
        Compra por categoría
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-10 sm:gap-x-5">
        {blocks.map(b => (
          <div key={b.key} className="min-w-0">
            <button
              type="button"
              onClick={b.onViewAll}
              className="flex items-center gap-1 mb-3 text-left cursor-pointer max-w-full"
            >
              <span className="font-semibold text-black text-base sm:text-xl truncate" style={{ letterSpacing: '-0.05em' }}>{b.title}</span>
              <ChevronRight className="w-4 h-4 text-black shrink-0" />
            </button>
            <div className="grid grid-cols-2 gap-[3px] rounded-[28px] overflow-hidden bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
              {b.tiles.map(({ p, img }) => (
                <button
                  key={String(p.id || p.slug)}
                  type="button"
                  onClick={() => onSelectProduct(p)}
                  className="relative aspect-[4/5] overflow-hidden cursor-pointer group border-0 p-0"
                  aria-label={`Ver ${p.title}`}
                >
                  <img
                    src={img}
                    alt={p.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute left-1.5 right-1.5 bottom-1.5 bg-white/85 backdrop-blur-sm rounded-xl px-2 py-1 text-[11px] sm:text-xs font-medium text-black line-clamp-1 text-left">
                    {String(p.title || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
