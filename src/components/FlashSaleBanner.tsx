import React, { useState, useEffect } from 'react';
import { Flame, Clock, Zap, Sparkles, ShieldCheck, Truck } from 'lucide-react';

interface FlashSaleBannerProps {
  onExploreOffers?: () => void;
}

export const FlashSaleBanner: React.FC<FlashSaleBannerProps> = ({ onExploreOffers }) => {
  // 3h 42m 18s countdown timer loop for urgency
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 3,
    minutes: 42,
    seconds: 18
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 3, minutes: 59, seconds: 59 }; // reset cycle
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
            <span>¡OFERTA EXPLOSIVA BOOM!</span>
          </div>

          <span className="font-extrabold text-white tracking-wide text-xs sm:text-sm drop-shadow-xs">
            Hasta <strong className="text-yellow-300 font-black text-sm sm:text-base">50% OFF</strong> + Envío Gratis y Pago Contra Entrega en Toda Colombia 🇨🇴
          </span>
        </div>

        {/* Right: Live Countdown Timer & CTA */}
        <div className="flex items-center justify-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/20 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-white/80 text-[10px] hidden xs:inline">Termina en:</span>
            <div className="flex items-center gap-1 font-black text-yellow-300 text-xs sm:text-sm tracking-wider">
              <span className="bg-white/15 px-1 rounded">{formatDigits(timeLeft.hours)}</span>:
              <span className="bg-white/15 px-1 rounded">{formatDigits(timeLeft.minutes)}</span>:
              <span className="bg-white/15 px-1 rounded">{formatDigits(timeLeft.seconds)}</span>
            </div>
          </div>

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
