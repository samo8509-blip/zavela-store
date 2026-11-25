import React, { useState } from 'react';
import { Home, LayoutGrid, Tag, ShoppingBag, User, X, ChevronRight } from 'lucide-react';
import { Category } from '../types/index.ts';

interface MobileBottomNavProps {
  active: 'home' | 'categories' | 'offers' | 'cart' | 'account' | null;
  categories: Category[];
  cartCount: number;
  isLoggedIn: boolean;
  onHome: () => void;
  onOffers: () => void;
  onOpenCart: () => void;
  onAccount: () => void;
  onSelectCategory: (id: string) => void;
}

const stripEmoji = (s: string) =>
  (s || '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim();

/**
 * Barra inferior fija estilo app (solo celular, < md).
 * Inicio · Categorías · Ofertas · Carrito · Cuenta
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  active, categories, cartCount, isLoggedIn,
  onHome, onOffers, onOpenCart, onAccount, onSelectCategory,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  const items: Array<{
    key: NonNullable<MobileBottomNavProps['active']>;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  }> = [
    { key: 'home', label: 'Inicio', Icon: Home, onClick: () => { setSheetOpen(false); onHome(); } },
    { key: 'categories', label: 'Categorías', Icon: LayoutGrid, onClick: () => setSheetOpen(true) },
    { key: 'offers', label: 'Ofertas', Icon: Tag, onClick: () => { setSheetOpen(false); onOffers(); } },
    { key: 'cart', label: 'Carrito', Icon: ShoppingBag, onClick: () => { setSheetOpen(false); onOpenCart(); } },
    { key: 'account', label: isLoggedIn ? 'Mi cuenta' : 'Cuenta', Icon: User, onClick: () => { setSheetOpen(false); onAccount(); } },
  ];

  return (
    <>
      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-[45] flex flex-col justify-end zs-font" role="dialog" aria-label="Categorías">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative bg-white rounded-t-[28px] max-h-[75vh] overflow-y-auto pb-24 shadow-2xl">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--shop-border)]">
              <h2 className="text-base font-semibold text-black">Categorías</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f2f4f5] flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="px-2 py-1">
              <li>
                <button
                  type="button"
                  onClick={() => { setSheetOpen(false); onSelectCategory('all'); }}
                  className="w-full flex items-center justify-between px-3 py-3.5 text-left text-[15px] text-black"
                >
                  Todos los productos <ChevronRight className="w-4 h-4 text-[var(--shop-muted)]" />
                </button>
              </li>
              {categories.map((c) => (
                <li key={c.id} className="border-t border-[var(--shop-border)]">
                  <button
                    type="button"
                    onClick={() => { setSheetOpen(false); onSelectCategory(c.id); }}
                    className="w-full flex items-center justify-between px-3 py-3.5 text-left text-[15px] text-black"
                  >
                    {stripEmoji(c.name)} <ChevronRight className="w-4 h-4 text-[var(--shop-muted)]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[46] bg-white border-t border-[var(--shop-border)] zs-font"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegación principal"
      >
        <ul className="flex items-stretch justify-around">
          {items.map(({ key, label, Icon, onClick }) => {
            const on = (sheetOpen ? 'categories' : active) === key;
            return (
              <li key={key} className="flex-1">
                <button
                  type="button"
                  onClick={onClick}
                  className={`relative w-full flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] ${on ? 'text-black font-semibold' : 'text-[var(--shop-muted)]'}`}
                >
                  <span className="relative">
                    <Icon className="w-[22px] h-[22px]" />
                    {key === 'cart' && cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--zv-cta,#ff5a4f)] text-white text-[9px] font-bold flex items-center justify-center">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};
