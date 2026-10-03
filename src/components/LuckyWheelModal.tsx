import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Gift, 
  Trophy, 
  Flame, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Check, 
  ShoppingBag, 
  Zap, 
  Percent, 
  ShieldCheck, 
  Truck,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, TrackedProduct, WheelDiscountSegment, ActiveDiscountCoupon, LuckyWheelSettings } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';
import { getActiveLuckyWheelSettings } from '../utils/luckyWheelPresets.ts';

interface LuckyWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  favoriteProduct: Product | null;
  luckyWheelSettings?: LuckyWheelSettings | null;
  onApplyDiscountAndBuy: (product: Product, coupon: ActiveDiscountCoupon) => void;
  onApplyDiscountToCart?: (coupon: ActiveDiscountCoupon) => void;
}

export const LuckyWheelModal: React.FC<LuckyWheelModalProps> = ({
  isOpen,
  onClose,
  favoriteProduct,
  luckyWheelSettings,
  onApplyDiscountAndBuy,
  onApplyDiscountToCart
}) => {
  const config = useMemo(() => {
    return getActiveLuckyWheelSettings(luckyWheelSettings);
  }, [luckyWheelSettings]);

  const segments = useMemo(() => {
    return config.segments;
  }, [config.segments]);

  const numSegments = segments.length;
  const segmentAngle = 360 / Math.max(numSegments, 1);

  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [winningSegment, setWinningSegment] = useState<WheelDiscountSegment | null>(null);
  const [activeCoupon, setActiveCoupon] = useState<ActiveDiscountCoupon | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  
  // Dynamic countdown timer state based on admin config
  const [secondsRemaining, setSecondsRemaining] = useState(() => (config.couponExpiryMinutes || 15) * 60);

  // Wheel canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset secondsRemaining when config changes
  useEffect(() => {
    if (!hasSpun) {
      setSecondsRemaining((config.couponExpiryMinutes || 15) * 60);
    }
  }, [config.couponExpiryMinutes, hasSpun]);

  // Draw the wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 10;

    ctx.clearRect(0, 0, width, height);

    // Draw segment wedges
    segments.forEach((seg, i) => {
      const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color || '#0284c7';
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Draw segment text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + (segmentAngle / 2) * (Math.PI / 180));
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.textColor || '#ffffff';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 4;
      ctx.fillText(seg.label || `${seg.percentage}% OFF`, radius - 18, 5);
      ctx.restore();
    });

    // Draw outer metallic rim with glow dots
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = config.seasonAccentColor || '#fbbf24'; // Season accent or gold rim
    ctx.stroke();

    // Draw rim studs / LED lights
    const numStuds = Math.max(16, segments.length * 3);
    for (let i = 0; i < numStuds; i++) {
      const dotAngle = (i * (360 / numStuds)) * (Math.PI / 180);
      const dotX = centerX + (radius - 4) * Math.cos(dotAngle);
      const dotY = centerY + (radius - 4) * Math.sin(dotAngle);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : (config.seasonAccentColor || '#fde047');
      ctx.fill();
    }

    // Draw center circle hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = config.seasonAccentColor || '#fbbf24';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
    ctx.fillStyle = config.seasonAccentColor || '#f59e0b';
    ctx.fill();
  }, [isOpen, segments, segmentAngle, config.seasonAccentColor]);

  // Countdown timer once spun
  useEffect(() => {
    if (!hasSpun) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasSpun]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Spin the wheel with realistic deceleration
  const handleSpin = () => {
    if (isSpinning || hasSpun || segments.length === 0) return;

    setIsSpinning(true);

    // Pick a winning index
    const chosenIndex = Math.floor(Math.random() * segments.length);
    const targetSegment = segments[chosenIndex];

    const segmentCenterAngle = chosenIndex * segmentAngle + segmentAngle / 2;
    const baseRotations = 360 * 6; // 6 full turns
    const finalAngle = baseRotations + (360 - segmentCenterAngle);

    setRotationDegrees(finalAngle);

    const spinDurationMs = (config.spinDurationSeconds || 4.5) * 1000;

    // Animation completion
    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      setWinningSegment(targetSegment);

      const prefix = targetSegment.couponPrefix || 'RULETA';
      const generatedCode = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
      const coupon: ActiveDiscountCoupon = {
        code: generatedCode,
        percentage: targetSegment.percentage,
        expiresAt: Date.now() + (config.couponExpiryMinutes || 15) * 60 * 1000,
        productAffinityId: favoriteProduct?.id
      };

      setActiveCoupon(coupon);

      if (onApplyDiscountToCart) {
        onApplyDiscountToCart(coupon);
      }

      // Celebrate with confetti 🎉
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 300);
      } catch (e) {
        console.warn('Confetti launch error:', e);
      }
    }, spinDurationMs);
  };

  const handleCopyCoupon = () => {
    if (!activeCoupon) return;
    navigator.clipboard.writeText(activeCoupon.code);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2500);
  };

  const handleCheckoutWithDiscount = () => {
    if (!favoriteProduct || !activeCoupon) return;
    onApplyDiscountAndBuy(favoriteProduct, activeCoupon);
    onClose();
  };

  if (!isOpen) return null;

  // Calculation for discounted price
  const originalPrice = favoriteProduct?.price || 129900;
  const discountPercent = winningSegment?.percentage || 10;
  const savings = Math.round((originalPrice * discountPercent) / 100);
  const finalDiscountedPrice = originalPrice - savings;

  return (
    <div 
      id="lucky-wheel-modal-overlay" 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        id="lucky-wheel-modal-card" 
        className="relative w-full max-w-lg md:max-w-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl border border-amber-400/50 shadow-2xl shadow-amber-500/20 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Seasonal Accent Glow */}
        <div 
          className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" 
          style={{
            background: config.seasonAccentColor 
              ? `linear-gradient(90deg, ${config.seasonAccentColor}, #ffffff, ${config.seasonAccentColor})` 
              : undefined
          }}
        />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Cerrar ruleta"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* ========================================================= */}
          {/* STATE 1: WHEEL SPINNING SCREEN                            */}
          {/* ========================================================= */}
          {!hasSpun ? (
            <div className="text-center space-y-5">
              
              {/* Header Title */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black uppercase tracking-wider">
                  <span className="text-sm">{config.seasonBadgeEmoji || '🎁'}</span>
                  <span>{config.badgeText || 'Ruleta Exclusiva Zavela'}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {config.title || '¡Gira y Gana tu Descuento Especial!'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  {config.subtitle || 'Premios garantizados para tu pedido con Pago Contra Entrega.'}
                </p>
              </div>

              {/* The Wheel Visual Container */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center my-2">
                
                {/* Pointer / Flipper at Top */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
                  <div 
                    className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[22px] drop-shadow-md"
                    style={{ borderTopColor: config.seasonAccentColor || '#fbbf24' }} 
                  />
                </div>

                {/* Rotating Canvas Wheel */}
                <div 
                  className="w-full h-full rounded-full transition-all"
                  style={{
                    transform: `rotate(${rotationDegrees}deg)`,
                    transitionDuration: isSpinning ? `${(config.spinDurationSeconds || 4.5) * 1000}ms` : '0ms',
                    transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1.0)'
                  }}
                >
                  <canvas 
                    ref={canvasRef} 
                    width={288} 
                    height={288} 
                    className="w-full h-full rounded-full shadow-2xl"
                  />
                </div>

                {/* Center Hub Button */}
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="absolute z-20 w-16 h-16 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-black text-xs uppercase shadow-lg shadow-amber-400/40 flex flex-col items-center justify-center cursor-pointer active:scale-95 disabled:opacity-80 transition-all border-2 border-white"
                >
                  <Gift className="w-4 h-4 text-slate-950 animate-bounce" />
                  <span className="text-[10px] tracking-tighter">GIRAR</span>
                </button>
              </div>

              {/* Big CTA Button */}
              <div className="pt-2">
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
                >
                  {isSpinning ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>¡Girando la Ruleta de la Suerte...!</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4 text-slate-950" />
                      <span>{config.callToActionText || '¡Girar Ruleta por mi descuento especial!'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Garantía de Satisfacción
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  Pagas al Recibir en Efectivo
                </span>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* STATE 2: WINNING PRODUCT & DISCOUNT REVEAL SCREEN         */
            /* ========================================================= */
            <div className="space-y-5 animate-fadeIn">
              
              {/* Header Congratulations */}
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>¡PREMIO GANADO CON ÉXITO!</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  ¡Ganaste <span className="text-amber-400">{winningSegment?.percentage}% DE DESCUENTO</span>!
                </h2>

                <p className="text-xs text-slate-300">
                  Descuento exclusivo desbloqueado para tu pedido de hoy.
                </p>
              </div>

              {/* Favorite Product Card Showcase with Discount Comparison */}
              {favoriteProduct && (
                <div className="bg-slate-800/80 rounded-2xl border border-amber-400/40 p-4 flex flex-col sm:flex-row items-center gap-4 shadow-lg">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-700 flex items-center justify-center p-1">
                    <img 
                      src={favoriteProduct.images?.[0] || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400'} 
                      alt={favoriteProduct.title} 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] font-bold text-amber-400">
                      <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                      <span>Tu Producto de Mayor Interés</span>
                    </div>

                    <h3 className="font-black text-sm text-white truncate">
                      {favoriteProduct.title}
                    </h3>

                    {/* Price comparison */}
                    <div className="flex items-baseline justify-center sm:justify-start gap-2 pt-1">
                      <span className="text-xs text-slate-400 line-through font-mono">
                        {formatCOP(originalPrice)}
                      </span>
                      <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                        {formatCOP(finalDiscountedPrice)}
                      </span>
                    </div>

                    <div className="inline-block bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Ahorras {formatCOP(savings)} en tu compra
                    </div>
                  </div>
                </div>
              )}

              {/* Coupon Code Pill */}
              {activeCoupon && (
                <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-2 rounded-lg bg-amber-400/10 text-amber-400 shrink-0">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Cupón Generado</div>
                      <div className="font-mono font-black text-sm text-amber-300 tracking-wider">
                        {activeCoupon.code}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyCoupon}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer shrink-0 border border-slate-700"
                  >
                    {copiedCoupon ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Urgency Timer */}
              <div className="flex items-center justify-center gap-2 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl py-2 px-4 text-xs font-bold animate-pulse">
                <Clock className="w-4 h-4 text-red-400" />
                <span>Tu descuento especial expira en: </span>
                <span className="font-mono font-black text-sm text-red-200">
                  {formatTimer(secondsRemaining)}
                </span>
              </div>

              {/* Main Action Button */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleCheckoutWithDiscount}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <ShoppingBag className="w-4 h-4 text-slate-950" />
                  <span>Comprar ahora con mi descuento (-{winningSegment?.percentage}%)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onClose}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1.5 transition-colors cursor-pointer"
                >
                  Continuar explorando la tienda
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
