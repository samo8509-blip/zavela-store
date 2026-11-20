import React from 'react';
import { Home, Car, Gift, Sparkles, ShieldCheck, Wrench, Package, Smartphone, Utensils, Tv } from 'lucide-react';
import { Category } from '../types/index.ts';

interface CategoryTilesProps {
  categories: Category[];
  selectedCategoryId: string;
  getCount: (catId: string) => number;
  onSelect: (catId: string) => void;
}

const pickIcon = (name: string) => {
  const n = name.toLowerCase();
  if (/cocina|utensil|menaje/.test(n)) return Utensils;
  if (/segur|alarma|c[aá]mara/.test(n)) return ShieldCheck;
  if (/auto|moto|carro|veh/.test(n)) return Car;
  if (/navid|regalo|festiv/.test(n)) return Gift;
  if (/belleza|cuidado|salud|perfum/.test(n)) return Sparkles;
  if (/herramient|ferret/.test(n)) return Wrench;
  if (/electr[oó]nica.*hogar|hogar/.test(n)) return Home;
  if (/electr|tecnolog|celular|tv/.test(n)) return Tv;
  if (/m[oó]vil|phone/.test(n)) return Smartphone;
  return Package;
};

export const CategoryTiles: React.FC<CategoryTilesProps> = ({ categories, selectedCategoryId, getCount, onSelect }) => {
  const visible = categories
    .filter(c => c.active !== false)
    .filter(c => !/sex|adult|er[oó]tic|\+18/i.test(c.name || ''))
    .map(c => ({ cat: c, count: getCount(c.id) }))
    .filter(x => x.count > 0);

  if (visible.length === 0) return null;

  return (
    <section id="home-category-tiles" aria-label="Compra por categoría" className="space-y-3">
      <h2 className="font-black tracking-tight text-2xl sm:text-3xl text-slate-900">Compra por categoría</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {visible.map(({ cat, count }) => {
          const Icon = pickIcon(cat.name || '');
          const isSelected = selectedCategoryId === cat.id || selectedCategoryId === cat.slug;
          const label = (cat.name || '').replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
          return (
            <button
              key={cat.id || cat.slug}
              type="button"
              onClick={() => onSelect(cat.id)}
              aria-pressed={isSelected}
              className="text-left rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 flex flex-col gap-3 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg active:scale-95"
              style={{
                background: isSelected ? 'var(--zv-cta, #0284c7)' : '#FFFFFF',
                color: isSelected ? 'var(--zv-cta-ink, #fff)' : '#0f172a',
                border: '2px solid var(--zv-p1, #22D3EE)'
              }}
            >
              <span
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: isSelected ? 'rgba(255,255,255,.22)' : 'var(--zv-p1, #22D3EE)', color: isSelected ? 'inherit' : 'var(--zv-p1-ink, #0A192F)' }}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span>
                <span className="block font-extrabold text-sm sm:text-base leading-tight">{label}</span>
                <span className="block text-xs font-semibold opacity-70 mt-0.5">{count} {count === 1 ? 'producto' : 'productos'}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
