import React, { useEffect, useRef } from 'react';
import { ShoppingBag, Sparkles, Check, Lock, Unlock, Package, Home, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCOP } from '../utils/formatters.ts';

interface CartDeliveryDoorTrackProps {
  progress: number; // 0 to 100
  subtotal: number;
  freeShippingThreshold: number;
  amountNeeded: number;
  itemCount: number;
}

export const CartDeliveryDoorTrack: React.FC<CartDeliveryDoorTrackProps> = ({
  progress,
  subtotal,
  freeShippingThreshold,
  amountNeeded,
  itemCount,
}) => {
  // Goal is reached if monetary progress >= 100 OR if user has 2+ items in cart
  const isGoalReached = progress >= 100 || itemCount >= 2;
  const previousReachedRef = useRef(false);

  // Trigger celebratory confetti when reaching 100% or 2+ items
  useEffect(() => {
    if (isGoalReached && !previousReachedRef.current && (subtotal > 0 || itemCount > 0)) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.3, x: 0.8 },
        colors: ['#00E5FF', '#A855F7', '#EC4899', '#22C55E', '#FBBF24']
      });
    }
    previousReachedRef.current = isGoalReached;
  }, [isGoalReached, subtotal, itemCount]);

  // Visual track progress: 100% if 2+ items or reached monetary threshold, otherwise based on progress or 1 item (50%)
  const visualProgress = isGoalReached 
    ? 100 
    : (itemCount === 1 ? Math.max(progress, 50) : progress);

  // Position of the cart along the track (0% to ~82% to park right at the doorway)
  const cartPositionPercent = Math.min(visualProgress * 0.82, 82);

  return (
    <div 
      id="cart-door-delivery-track"
      className="bg-slate-100 p-4 sm:p-5 border-b border-slate-200 relative overflow-hidden select-none"
    >
      {/* Background Ambient Glows */}
      <div 
        className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          isGoalReached 
            ? 'bg-emerald-200/50' 
            : 'bg-orange-100/40'
        }`} 
      />

      {/* Header Status Text */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div 
            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
              isGoalReached 
                ? 'bg-emerald-500 animate-pulse shadow-xs' 
                : 'bg-sky-600'
            }`} 
          />
          <span className="font-extrabold text-xs uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
            {isGoalReached ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
                ¡PUERTA ABIERTA! ENVÍO 100% GRATIS
              </span>
            ) : (
              <span className="text-sky-700">
                LLEVA 2+ PRODUCTOS Y EL ENVÍO ES GRATIS
              </span>
            )}
          </span>
        </div>

        <span className={`font-mono font-black text-xs px-2.5 py-0.5 rounded-lg border shadow-xs ${
          isGoalReached 
            ? 'bg-emerald-600 text-white border-emerald-600' 
            : 'bg-white border-slate-200 text-sky-700'
        }`}>
          {isGoalReached ? '¡ENVÍO $0!' : `${itemCount}/2 Productos`}
        </span>
      </div>

      {/* Interactive Delivery Track Stage */}
      <div className="relative h-28 sm:h-32 bg-white rounded-2xl border border-slate-200 p-3 flex items-center shadow-xs overflow-visible">
        
        {/* Track Line / Road */}
        <div className="absolute left-6 right-20 top-1/2 -translate-y-1/2 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          {/* Active Glowing Road Fill */}
          <div 
            className="h-full bg-gradient-to-r from-sky-400 via-sky-500 to-emerald-500 rounded-full transition-all duration-500 ease-out relative shadow-xs"
            style={{ width: `${visualProgress}%` }}
          >
            {/* Speed Dash lines animation */}
            <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(90deg,transparent,transparent_6px,#fff_6px,#fff_12px)] animate-pulse" />
          </div>
        </div>

        {/* Milestones on the road */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 -mt-4 text-[9px] font-mono text-slate-500 font-bold">
          1 prod (Con Flete)
        </div>
        <div className="absolute right-24 top-1/2 -translate-y-1/2 -mt-4 text-[9px] font-mono text-emerald-700 font-black">
          🔥 2+ prod (ENVÍO GRATIS)
        </div>

        {/* Moving Shopping Cart / Delivery Vehicle */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-700 ease-out"
          style={{ 
            left: `calc(18px + ${cartPositionPercent} * (100% - 110px) / 100)` 
          }}
        >
          <div className="relative group cursor-pointer">
            
            {/* Headlight Beam when moving */}
            <div 
              className={`absolute -right-8 top-2 w-10 h-6 bg-gradient-to-r from-sky-400/40 to-transparent blur-[3px] rounded-r-full pointer-events-none transition-opacity duration-300 ${
                subtotal > 0 ? 'opacity-100' : 'opacity-30'
              }`} 
            />

            {/* Cart Body */}
            <div 
              className={`w-12 h-12 rounded-2xl flex items-center justify-center relative transition-all duration-300 ${
                isGoalReached 
                  ? 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-md scale-110' 
                  : 'bg-white text-sky-600 border border-sky-300 shadow-sm'
              }`}
            >
              {/* Package inside cart */}
              {itemCount > 0 && (
                <div className={`absolute -top-1.5 -right-1.5 text-white rounded-md text-[9px] font-black w-4 h-4 flex items-center justify-center shadow-xs border ${
                  isGoalReached 
                    ? 'bg-amber-500 border-amber-300 animate-bounce' 
                    : 'bg-[#FF5A36] border-orange-200'
                }`}>
                  {itemCount}
                </div>
              )}

              <ShoppingBag className={`w-6 h-6 ${isGoalReached ? 'text-white font-black' : 'text-sky-600'}`} />

              {/* Cart Wheels */}
              <div className="absolute -bottom-1 left-2 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-sky-400 animate-spin" style={{ animationDuration: '2s' }} />
              <div className="absolute -bottom-1 right-2 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-sky-400 animate-spin" style={{ animationDuration: '2s' }} />
            </div>

            {/* Floating Price Tag above Cart */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white border border-sky-400 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold text-sky-800 shadow-xs">
              {formatCOP(subtotal)}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3D INTERACTIVE DOOR AT THE END OF THE TRACK (CASA / PUERTA DE ENTREGA) */}
        {/* ========================================================================= */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
          
          {/* House Roof / Lintel Arch */}
          <div className="w-16 h-3 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-t-lg border-t border-x border-slate-300 flex items-center justify-center shadow-2xs relative">
            <Home className="w-2.5 h-2.5 text-slate-600" />
            <div className="absolute -top-2.5 px-1.5 py-0.2 rounded-full bg-white border border-sky-300 text-[8px] font-black text-sky-700 uppercase tracking-tighter shadow-2xs">
              Zavela
            </div>
          </div>

          {/* Doorway Frame with 3D Perspective */}
          <div 
            className={`w-16 h-20 bg-slate-100 rounded-b-md border-x-2 border-b-2 relative overflow-visible transition-all duration-700 ${
              isGoalReached 
                ? 'border-emerald-500 shadow-sm ring-2 ring-emerald-400/30' 
                : 'border-slate-300 shadow-2xs'
            }`}
            style={{ perspective: '700px' }}
          >
            {/* Interior Room (Visible when doors open) */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${
              isGoalReached 
                ? 'bg-emerald-50 opacity-100' 
                : 'bg-slate-100 opacity-40'
            }`}>
              {/* Warm Light Burst when door is open */}
              {isGoalReached && (
                <div className="relative z-10 flex flex-col items-center animate-in zoom-in-50 duration-500">
                  <Package className="w-5 h-5 text-emerald-600 drop-shadow-xs" />
                  <span className="text-[7px] font-black text-white uppercase tracking-tight mt-0.5 bg-emerald-600 px-1 rounded">
                    ¡ENVÍO $0!
                  </span>
                </div>
              )}
            </div>

            {/* LEFT DOOR LEAF */}
            <div 
              className={`absolute top-0 left-0 w-1/2 h-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 border-r border-slate-300 transition-transform duration-700 ease-out origin-left flex items-center justify-end pr-0.5 shadow-2xs ${
                isGoalReached ? 'opacity-90' : 'opacity-100'
              }`}
              style={{
                transform: isGoalReached ? 'rotateY(-115deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="w-full h-full p-0.5 flex flex-col justify-between pointer-events-none">
                <div className="w-full h-1/3 rounded-2xs border border-slate-300/80 bg-white/60" />
                <div className="w-full h-1/3 rounded-2xs border border-slate-300/80 bg-white/60" />
              </div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-sky-600" />
            </div>

            {/* RIGHT DOOR LEAF */}
            <div 
              className={`absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-slate-200 via-slate-100 to-slate-200 border-l border-slate-300 transition-transform duration-700 ease-out origin-right flex items-center justify-start pl-0.5 shadow-2xs ${
                isGoalReached ? 'opacity-90' : 'opacity-100'
              }`}
              style={{
                transform: isGoalReached ? 'rotateY(115deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="w-full h-full p-0.5 flex flex-col justify-between pointer-events-none">
                <div className="w-full h-1/3 rounded-2xs border border-slate-300/80 bg-white/60" />
                <div className="w-full h-1/3 rounded-2xs border border-slate-300/80 bg-white/60" />
              </div>
              <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-sky-600" />
            </div>

            {/* Central Door Lock / Unlock Badge */}
            <div 
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-500 pointer-events-none ${
                isGoalReached 
                  ? 'opacity-0 scale-50' 
                  : 'opacity-100 scale-100'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white border border-sky-500 flex items-center justify-center text-sky-600 shadow-2xs">
                <Lock className="w-2.5 h-2.5" />
              </div>
            </div>

          </div>

          {/* Welcome Mat below door */}
          <div className={`w-14 h-1.5 rounded-full mt-0.5 transition-all duration-500 ${
            isGoalReached 
              ? 'bg-emerald-500' 
              : 'bg-slate-200 border border-slate-300'
          }`} />
        </div>

      </div>

      {/* Bottom Incentive Message Banner */}
      <div className="mt-3 flex items-center justify-between text-xs">
        {isGoalReached ? (
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <Check className="w-4 h-4 bg-emerald-100 rounded-full p-0.5 border border-emerald-500 text-emerald-800 shrink-0" />
            <span>
              ¡Felicidades! Tienes <strong className="text-slate-900 font-black">ENVÍO 100% GRATIS</strong> a tu puerta (Ahorras hasta $28.000 COP).
            </span>
          </div>
        ) : itemCount === 1 ? (
          <div className="flex items-center gap-1.5 text-slate-800 bg-amber-50 p-2 rounded-xl border border-amber-200 w-full">
            <Gift className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
            <span className="text-[11px] leading-tight">
              ⚡ <strong>¡Lleva 1 producto más y tu ENVÍO SERÁ GRATIS!</strong> (1 producto paga flete, 2 o más = ¡Flete $0!).
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-700">
            <Unlock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>
              Compra <strong>2 o más productos</strong> o suma <strong className="text-sky-700 font-mono font-black">{formatCOP(amountNeeded)}</strong> para desbloquear <strong className="text-slate-900">Envío Gratis</strong>.
            </span>
          </div>
        )}
      </div>

    </div>
  );
};
