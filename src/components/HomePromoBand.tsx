import React from 'react';
import { HomePromoSettings } from '../types/index.ts';

const COLORS: Record<HomePromoSettings['band']['color'], { bg: string; ink: string; btnBg: string; btnInk: string }> = {
  temporada: { bg: 'var(--shop-violet)', ink: '#ffffff', btnBg: '#ffffff', btnInk: '#000000' },
  coral: { bg: '#ff5a4f', ink: '#ffffff', btnBg: '#ffffff', btnInk: '#000000' },
  violeta: { bg: '#5433eb', ink: '#ffffff', btnBg: '#ffffff', btnInk: '#000000' },
  verde: { bg: '#0f3d2e', ink: '#ffffff', btnBg: '#ffffff', btnInk: '#000000' },
  amarillo: { bg: '#ffd23f', ink: '#000000', btnBg: '#000000', btnInk: '#ffffff' }
};

/** ¿La franja debe mostrarse hoy? (activa y sin fecha de fin vencida) */
export const isPromoBandVisible = (band: HomePromoSettings['band']): boolean => {
  if (!band.enabled) return false;
  if (band.endsAt) {
    const end = new Date(`${band.endsAt}T23:59:59`);
    if (!isNaN(end.getTime()) && Date.now() > end.getTime()) return false;
  }
  return true;
};

interface Props {
  band: HomePromoSettings['band'];
  onClick: () => void;
}

export const HomePromoBand: React.FC<Props> = ({ band, onClick }) => {
  const c = COLORS[band.color] || COLORS.temporada;
  const title = String(band.title || '').replace(/\{n\}/g, String(Math.round(Number(band.maxDiscount) || 0)));
  return (
    <section
      id="home-promo-band"
      aria-label="Oferta destacada"
      className="zs-font rounded-[28px] px-5 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      style={{ background: c.bg, color: c.ink }}
    >
      <div className="min-w-0">
        {band.eyebrow && <div className="text-xs font-medium tracking-wider opacity-90">{band.eyebrow}</div>}
        <div className="font-semibold text-2xl sm:text-3xl leading-tight" style={{ letterSpacing: '-0.04em' }}>{title}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 self-start sm:self-auto rounded-full px-6 py-3 text-sm font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-95"
        style={{ background: c.btnBg, color: c.btnInk }}
      >
        {band.buttonText || 'Ver ofertas'}
      </button>
    </section>
  );
};
