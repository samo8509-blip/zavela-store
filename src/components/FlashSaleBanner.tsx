import React, { useState, useEffect } from 'react';
import { Flame, Clock, Zap } from 'lucide-react';
import { getBlackFridayDate, isBlackFridayWindow } from '../utils/seasonalThemes.ts';

interface FlashSaleBannerProps {
  onExploreOffers?: () => void;
}

// Fin real de la campaña: Cyber Monday a las 11:59:59 p.m. (hora local del visitante)
const getCampaignEnd = (now: Date): Date => {
  const bf = getBlackFridayDate(now.getFullYear());
  return new Date(bf.getFullYear(), bf.getMonth(), bf.getDate() + 3, 23, 59, 59);
};

export const FlashSaleBanner: React.FC<FlashSaleBannerProps> = ({ onExploreOffers }) => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // El contador y el mensaje de Black Friday solo aparecen en la semana real de la campaña.
  // Fuera de esas fechas no se muestra ningún contador (antes era un ciclo falso que se reiniciaba solo).
  const isCampaign = isBlackFridayWindow(now);
  const remainingMs = isCampaign ? Math.max(0, getCampaignEnd(now).getTime() - now.getTime()) : 0;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const timeLeft = {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };

  const formatDigits = (n: number) => n.toString().padStart(2, '0');

  return (
    <div id="flash-sale-boom-banner" className="relative overflow-hidden py-1.5 px-3 sm:px-6" style={{ background: 'var(--zv-topbar, #0A192F)', color: 'var(--zv-topbar-ink, #22D3EE)' }}>
      {/* Subtle animated background shimmer */}

      <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-2 text-xs">
        
        {/* Left: Explosive Offer Badge & Headline */}
        <div className="flex items-center justify-start gap-2 md:flex-wrap text-left">
          <div className="flex items-center gap-1.5 bg-black/25 px-2.5 py-1 rounded-full text-yellow-300 font-medium uppercase text-[10px] sm:text-[11px] shrink-0">
            <Flame className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span>{isCampaign ? 'BLACK FRIDAY' : 'ENVÍO GRATIS'}</span>
          </div>

          <span className="hidden md:inline font-medium text-xs sm:text-sm" style={{ letterSpacing: '-0.01em' }}>
            {isCampaign && (
              <>
                <strong className="font-semibold text-sm sm:text-base">Precios especiales</strong> +{' '}
              </>
            )}
            Envío Gratis y Pago Contra Entrega en Toda Colombia 🇨🇴
          </span>
        </div>

        {/* Right: Live Countdown Timer & CTA */}
        <div className="flex items-center justify-end gap-2 md:gap-2.5 shrink-0">
          {isCampaign && (
          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/20 font-mono text-[11px]">
            <Clock className="hidden md:block w-3.5 h-3.5 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-white/80 text-[10px] hidden xs:inline">Termina en:</span>
            <div className="flex items-center gap-1 font-black text-yellow-300 text-xs sm:text-sm tracking-wider">
              {timeLeft.days > 0 && <span className="bg-white/15 px-1 rounded">{timeLeft.days}d</span>}
              <span className="bg-white/15 px-1 rounded">{formatDigits(timeLeft.hours)}</span>:
              <span className="bg-white/15 px-1 rounded">{formatDigits(timeLeft.minutes)}</span>:
              <span className="bg-white/15 px-1 rounded">{formatDigits(timeLeft.seconds)}</span>
            </div>
          </div>
          )}

          {onExploreOffers && (
            <button
              onClick={onExploreOffers}
              className="font-black text-[10px] sm:text-[11px] uppercase tracking-wider px-3 py-1 rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1" style={{ background: 'var(--zv-cta, linear-gradient(90deg,#06b6d4,#4f46e5))', color: 'var(--zv-cta-ink, #fff)' }}
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>Aprovechar</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
