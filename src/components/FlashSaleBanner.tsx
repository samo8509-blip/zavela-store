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
    <div id="flash-sale-boom-banner" className="bg-gradient-to-r from-red-600 via-[#FF5A36] to-pink-600 text-white shadow-md relative overflow-hidden py-2 px-3 sm:px-6">
      {/* Subtle animated background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full animate-[shimmer_3s_infinite]" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
        
        {/* Left: Explosive Offer Badge & Headline */}
        <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap text-center md:text-left">
          <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-xs px-2.5 py-1 rounded-full border border-yellow-300/40 text-yellow-300 font-mono font-black uppercase text-[10px] sm:text-[11px] animate-pulse shadow-xs shrink-0">
            <Flame className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span>{isCampaign ? 'BLACK FRIDAY' : 'ENVÍO GRATIS'}</span>
          </div>

          <span className="font-extrabold text-white tracking-wide text-xs sm:text-sm drop-shadow-xs">
            {isCampaign && (
              <>
                <strong className="text-yellow-300 font-black text-sm sm:text-base">Precios especiales</strong> +{' '}
              </>
            )}
            Envío Gratis y Pago Contra Entrega en Toda Colombia 🇨🇴
          </span>
        </div>

        {/* Right: Live Countdown Timer & CTA */}
        <div className="flex items-center justify-center gap-2.5 shrink-0">
          {isCampaign && (
          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/20 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
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
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black text-[10px] sm:text-[11px] uppercase tracking-wider px-3 py-1 rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              <Zap className="w-3 h-3 fill-slate-900" />
              <span>Aprovechar</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
