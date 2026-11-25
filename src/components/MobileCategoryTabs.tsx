import React, { useEffect, useRef } from 'react';
import { Category } from '../types/index.ts';

interface MobileCategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (id: string) => void;
}

const stripEmoji = (s: string) =>
  (s || '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim();

/** Pestañas de texto con línea inferior en la activa (solo celular, < md). */
export const MobileCategoryTabs: React.FC<MobileCategoryTabsProps> = ({ categories, selectedCategoryId, onSelect }) => {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selectedCategoryId]);

  const tabs = [{ id: 'all', name: 'Todo' }, ...categories.map((c) => ({ id: c.id, name: stripEmoji(c.name) }))];

  return (
    <div className="md:hidden -mx-4 sm:-mx-6 border-b border-[var(--shop-border)] bg-white zs-font">
      <div className="flex gap-6 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const on = selectedCategoryId === t.id;
          return (
            <button
              key={t.id}
              ref={on ? activeRef : undefined}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`shrink-0 py-3 text-sm whitespace-nowrap border-b-2 ${
                on ? 'text-black font-semibold border-black' : 'text-[var(--shop-muted)] border-transparent'
              }`}
            >
              {t.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
