import React from 'react';
import { ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  onViewAll?: () => void;
  children: React.ReactNode;
}

/** Estante de temporada: título con flecha y una fila de tarjetas (la foto manda, texto mínimo). */
export const HomeShelf: React.FC<Props> = ({ title, onViewAll, children }) => (
  <section id="home-shelf" aria-label={title} className="zs-font space-y-4">
    <button type="button" onClick={onViewAll} className="flex items-center gap-1 cursor-pointer text-left">
      <h2 className="zs-display text-black text-xl sm:text-2xl">{title}</h2>
      <ChevronRight className="w-5 h-5 text-black" />
    </button>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">{children}</div>
  </section>
);
