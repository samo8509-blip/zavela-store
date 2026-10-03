import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Trophy,
  Timer,
  Wind,
  ShoppingBag,
  ArrowRight,
  Copy,
  Check,
  X,
  Zap,
  Tag,
  ShieldCheck,
  Truck,
  Smartphone,
  Hand,
  AlertTriangle,
  Flame,
  Bomb,
  Skull,
  Snowflake
} from 'lucide-react';
import {
  GamificationGameSettings,
  Product,
  ActiveDiscountCoupon
} from '../types/index.ts';
import {
  getActiveGamificationSettings,
  calculateGameRewardTier,
  GAMIFICATION_SEASONS
} from '../utils/gamificationPresets.ts';

interface CatchDiscountGameProps {
  isOpen: boolean;
  onClose: () => void;
  favoriteProduct: Product | null;
  gamificationSettings?: GamificationGameSettings | null;
  onApplyDiscountAndBuy?: (product: Product, coupon: ActiveDiscountCoupon) => void;
  onApplyDiscountToCart?: (coupon: ActiveDiscountCoupon) => void;
}

interface FallingItem {
  id: number;
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  type: 'coin' | 'gift' | 'star' | 'special' | 'bomb' | 'skull' | 'ice' | 'tornado' | 'lightning' | 'cactus' | 'rock' | 'fire' | 'vortex';
  value: number; // positive for collectibles, negative for hazards
  color: string;
  emoji: string;
  rotation: number;
  rotationSpeed: number;
}

interface WindParticle {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
  vy: number;
  life: number;
}

export const CatchDiscountGame: React.FC<CatchDiscountGameProps> = ({
  isOpen,
  onClose,
  favoriteProduct,
  gamificationSettings,
  onApplyDiscountAndBuy,
  onApplyDiscountToCart
}) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'reward'>('intro');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [windForce, setWindForce] = useState(0); // -1.8 to +1.8
  const [windLabel, setWindLabel] = useState('Viento: ⏸️ Calma');
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [wonCoupon, setWonCoupon] = useState<ActiveDiscountCoupon | null>(null);
  const [rewardTier, setRewardTier] = useState<ReturnType<typeof calculateGameRewardTier> | null>(null);
  const [penaltyAlert, setPenaltyAlert] = useState<{ text: string; isHazard: boolean } | null>(null);
  const [isBasketFrozen, setIsBasketFrozen] = useState(false);
  const [isControlsInverted, setIsControlsInverted] = useState(false);
  const [isBasketShrunk, setIsBasketShrunk] = useState(false);
  const [isBasketBurning, setIsBasketBurning] = useState(false);

  // Control mode: 'gyroscope' (DeviceOrientation) or 'touch' (touch drag / mouse)
  const [controlMode, setControlMode] = useState<'gyroscope' | 'touch'>('touch');
  const [currentTiltGamma, setCurrentTiltGamma] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [sensorStatusMessage, setSensorStatusMessage] = useState<string>('');

  // Urgency coupon timer (10 mins countdown)
  const [couponSecondsLeft, setCouponSecondsLeft] = useState(600);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const basketXRef = useRef<number>(200);
  const targetBasketXRef = useRef<number>(200);
  const rawGammaRef = useRef<number>(0);
  const controlModeRef = useRef<'gyroscope' | 'touch'>('touch');
  const animationFrameRef = useRef<number | null>(null);
  const itemsRef = useRef<FallingItem[]>([]);
  const windParticlesRef = useRef<WindParticle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const penaltyFlashRef = useRef<number>(0);
  const screenShakeFramesRef = useRef<number>(0);
  const frozenUntilRef = useRef<number>(0);
  const invertedUntilRef = useRef<number>(0);
  const shrunkUntilRef = useRef<number>(0);
  const burningUntilRef = useRef<number>(0);
  const lastItemSpawnRef = useRef<number>(0);
  const lastWindChangeRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const gameStartTimestampRef = useRef<number>(0);

  const config = useMemo(() => {
    return getActiveGamificationSettings(gamificationSettings);
  }, [gamificationSettings]);

  const seasonInfo = useMemo(() => {
    return GAMIFICATION_SEASONS[config.activeSeason] || GAMIFICATION_SEASONS.standard;
  }, [config.activeSeason]);

  // Real-time live tier calculation during gameplay
  const liveTier = useMemo(() => {
    return calculateGameRewardTier(score, config);
  }, [score, config]);

  // Check if device is mobile / handheld
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mobileCheck = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
      setIsMobile(mobileCheck);
      if (mobileCheck && config.enableGyroscope !== false) {
        setControlMode('gyroscope');
        controlModeRef.current = 'gyroscope';
      } else {
        setControlMode('touch');
        controlModeRef.current = 'touch';
      }
    }
  }, [config.enableGyroscope]);

  // Keep controlModeRef in sync
  useEffect(() => {
    controlModeRef.current = controlMode;
  }, [controlMode]);

  // DeviceOrientation event listener with smooth deadzone calibration & inverted control support
  const handleDeviceOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.gamma === undefined) return;
    
    // gamma: left-to-right tilt in degrees (-90 to +90)
    const gamma = e.gamma;
    rawGammaRef.current = gamma;
    setCurrentTiltGamma(Math.round(gamma));

    if (controlModeRef.current !== 'gyroscope') return;

    // Apply Deadzone
    const deadzone = config.gyroDeadzone || 5;
    let effectiveGamma = 0;
    if (gamma > deadzone) {
      effectiveGamma = gamma - deadzone;
    } else if (gamma < -deadzone) {
      effectiveGamma = gamma + deadzone;
    }

    // Check if lightning shocked and controls are inverted
    const isInverted = Date.now() < invertedUntilRef.current;
    if (isInverted) {
      effectiveGamma = -effectiveGamma; // Reverse tilt!
    }

    // Sensitivity factor
    const sensitivity = (config.gyroSensitivity || 1.2) * 1.6;
    
    // Max tilt range for full screen span (around 28 degrees)
    const maxTilt = 28;
    const normalizedTilt = Math.max(-1, Math.min(1, (effectiveGamma * sensitivity) / maxTilt));

    // Calculate target X position in Canvas coordinate space (0 to 400)
    const canvasWidth = 400;
    const centerX = canvasWidth / 2;
    const maxOffset = (canvasWidth / 2) - 44; // keep inside margin

    const targetX = centerX + (normalizedTilt * maxOffset);
    targetBasketXRef.current = Math.max(44, Math.min(356, targetX));
  }, [config.gyroDeadzone, config.gyroSensitivity]);

  // Setup / teardown DeviceOrientation listener
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, [isOpen, handleDeviceOrientation]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setGameState('intro');
      setScore(0);
      scoreRef.current = 0;
      setTimeLeft(config.gameDurationSeconds || 15);
      setWindForce(0);
      setWindLabel('Viento: ⏸️ Calma');
      setWonCoupon(null);
      setRewardTier(null);
      setCouponSecondsLeft((config.couponExpiryMinutes || 10) * 60);
      itemsRef.current = [];
      windParticlesRef.current = [];
      floatingTextsRef.current = [];
      penaltyFlashRef.current = 0;
      screenShakeFramesRef.current = 0;
      frozenUntilRef.current = 0;
      invertedUntilRef.current = 0;
      shrunkUntilRef.current = 0;
      burningUntilRef.current = 0;
      setIsBasketFrozen(false);
      setIsControlsInverted(false);
      setIsBasketShrunk(false);
      setIsBasketBurning(false);
      basketXRef.current = 200;
      targetBasketXRef.current = 200;
      setSensorStatusMessage('');
      setPenaltyAlert(null);
    }
  }, [isOpen, config]);

  // Urgency Timer for reward phase
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (gameState === 'reward' && couponSecondsLeft > 0) {
      interval = setInterval(() => {
        setCouponSecondsLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, couponSecondsLeft]);

  // Wind description text generator
  const getWindDescription = useCallback((force: number) => {
    if (force < -1.2) return 'Viento: ⬅️⬅️ Fuerte Izquierda';
    if (force < -0.2) return 'Viento: 🍃 Brisa Izquierda';
    if (force > 1.2) return 'Viento: ➡️➡️ Fuerte Derecha';
    if (force > 0.2) return 'Viento: 🍃 Brisa Derecha';
    return 'Viento: ⏸️ Calma';
  }, []);

  // Format currency
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Request iOS / Mobile Permission for DeviceOrientation
  const requestMotionPermissionAndStart = async (chosenMode: 'gyroscope' | 'touch') => {
    if (chosenMode === 'gyroscope' && typeof window !== 'undefined') {
      const DeviceOrientationEventAny = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };

      if (typeof DeviceOrientationEventAny !== 'undefined' && typeof DeviceOrientationEventAny.requestPermission === 'function') {
        try {
          const permissionState = await DeviceOrientationEventAny.requestPermission();
          if (permissionState === 'granted') {
            setControlMode('gyroscope');
            controlModeRef.current = 'gyroscope';
            setSensorStatusMessage('✅ Sensores de giroscopio activos');
          } else {
            setControlMode('touch');
            controlModeRef.current = 'touch';
            setSensorStatusMessage('ℹ️ Permiso denegado. Modo táctil activado automáticamente.');
          }
        } catch (err) {
          console.warn('Gyroscope permission request error:', err);
          setControlMode('touch');
          controlModeRef.current = 'touch';
          setSensorStatusMessage('ℹ️ Usando modo táctil.');
        }
      } else {
        setControlMode('gyroscope');
        controlModeRef.current = 'gyroscope';
      }
    } else {
      setControlMode('touch');
      controlModeRef.current = 'touch';
    }

    startGame();
  };

  // Start the minigame loop
  const startGame = () => {
    setGameState('playing');
    isPlayingRef.current = true;
    setScore(0);
    scoreRef.current = 0;
    const duration = config.gameDurationSeconds || 15;
    setTimeLeft(duration);
    itemsRef.current = [];
    windParticlesRef.current = [];
    floatingTextsRef.current = [];
    penaltyFlashRef.current = 0;
    screenShakeFramesRef.current = 0;
    frozenUntilRef.current = 0;
    invertedUntilRef.current = 0;
    shrunkUntilRef.current = 0;
    burningUntilRef.current = 0;
    setIsBasketFrozen(false);
    setIsControlsInverted(false);
    setIsBasketShrunk(false);
    setIsBasketBurning(false);
    lastItemSpawnRef.current = Date.now();
    lastWindChangeRef.current = Date.now();
    gameStartTimestampRef.current = Date.now();
    setWindForce(0);
    setWindLabel('Viento: ⏸️ Calma');
    basketXRef.current = 200;
    targetBasketXRef.current = 200;
    setPenaltyAlert(null);

    // Initialize atmospheric wind particles
    const particles: WindParticle[] = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * 400,
        y: Math.random() * 460,
        length: Math.random() * 25 + 10,
        speed: Math.random() * 2.8 + 1.6,
        opacity: Math.random() * 0.45 + 0.1
      });
    }
    windParticlesRef.current = particles;
  };

  // End minigame & calculate final tier reward
  const finishGame = useCallback(() => {
    isPlayingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const finalScore = scoreRef.current;
    const calculatedTier = calculateGameRewardTier(finalScore, config);
    setRewardTier(calculatedTier);

    // Generate unique seasonal coupon code
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `${calculatedTier.prefix}-${randomSuffix}`;
    const coupon: ActiveDiscountCoupon = {
      code,
      percentage: calculatedTier.discountPercentage,
      expiresAt: Date.now() + (config.couponExpiryMinutes || 10) * 60 * 1000,
      productAffinityId: favoriteProduct?.id
    };

    setWonCoupon(coupon);
    setGameState('reward');

    // Confetti celebration
    try {
      confetti({
        particleCount: 130,
        spread: 85,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.warn(e);
    }
  }, [config, favoriteProduct]);

  // Main countdown timer during gameplay
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState, timeLeft, finishGame]);

  // Touch & Pointer basket handler (Fallback mode or Desktop)
  const handlePointerMove = useCallback((clientX: number, targetRect: DOMRect) => {
    if (!isPlayingRef.current) return;
    if (controlModeRef.current === 'gyroscope') return;

    const relativeX = clientX - targetRect.left;
    const scale = 400 / targetRect.width;
    let scaledX = relativeX * scale;

    // Check if lightning shock active -> Invert left & right controls
    if (Date.now() < invertedUntilRef.current) {
      scaledX = 400 - scaledX;
    }

    targetBasketXRef.current = Math.max(44, Math.min(356, scaledX));
  }, []);

  // Main Canvas Game Loop with Dynamic Wind, Physics, Multi-Hazards & Granular Penalties
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentWind = 0;
    const canvasWidth = 400;
    const canvasHeight = 460;

    // Difficulty settings
    const difficulty = config.difficultyLevel || 'hard';
    const baseSpeedFactor = difficulty === 'expert' ? 1.35 : difficulty === 'hard' ? 1.18 : 1.0;
    const spawnInterval = difficulty === 'expert' ? 470 : difficulty === 'hard' ? 520 : 600;
    const missPenalty = config.missPenaltyPoints ?? 1;

    const gameLoop = () => {
      const now = Date.now();
      const elapsedSeconds = (now - gameStartTimestampRef.current) / 1000;
      // Progressive speed acceleration over the round
      const speedRamp = 1.0 + (elapsedSeconds / 28);

      // 1. DYNAMIC WIND UPDATE (sudden gusts and direction flips)
      if (config.windEnabled && now - lastWindChangeRef.current > (config.windChangeIntervalSeconds || 2.4) * 1000) {
        const possibleWinds = [-1.8, -1.3, -0.6, 0, 0.6, 1.3, 1.8];
        currentWind = possibleWinds[Math.floor(Math.random() * possibleWinds.length)];
        setWindForce(currentWind);
        setWindLabel(getWindDescription(currentWind));
        lastWindChangeRef.current = now;
      }

      // Check obstacle active statuses
      const isFrozen = now < frozenUntilRef.current;
      setIsBasketFrozen(isFrozen);

      const isInverted = now < invertedUntilRef.current;
      setIsControlsInverted(isInverted);

      const isShrunk = now < shrunkUntilRef.current;
      setIsBasketShrunk(isShrunk);

      const isBurning = now < burningUntilRef.current;
      setIsBasketBurning(isBurning);

      // Dynamic basket dimensions (shrinks to 44px when cactus pricked!)
      const basketWidth = isShrunk ? 44 : 82;
      const basketHeight = 34;

      // 2. SMOOTH LERP INTERPOLATION FOR BASKET POSITION
      let baseLerp = controlModeRef.current === 'gyroscope' ? 0.24 : 0.42;
      if (isFrozen) baseLerp *= 0.30; // Frost drag slowdown

      basketXRef.current += (targetBasketXRef.current - basketXRef.current) * baseLerp;

      // Keep basket inside canvas boundaries
      const halfBasket = basketWidth / 2;
      basketXRef.current = Math.max(halfBasket + 6, Math.min(canvasWidth - halfBasket - 6, basketXRef.current));

      // 3. SPAWN NEW FALLING ITEMS (Collectibles + Rich Multi-Hazard Obstacles)
      if (now - lastItemSpawnRef.current > spawnInterval) {
        const itemPool: ('coin' | 'gift' | 'star' | 'special' | 'bomb' | 'skull' | 'ice' | 'tornado' | 'lightning' | 'cactus' | 'rock' | 'fire' | 'vortex')[] = [
          'coin', 'coin', 'gift', 'star', 'special'
        ];

        // Include obstacles & traps if configured
        if (config.includeObstacles !== false) {
          itemPool.push('bomb', 'skull', 'ice', 'tornado', 'lightning', 'cactus', 'rock', 'fire', 'vortex');
          if (difficulty === 'expert') {
            itemPool.push('bomb', 'rock', 'lightning', 'fire');
          }
        }

        const chosenType = itemPool[Math.floor(Math.random() * itemPool.length)];

        let emoji = '🪙';
        let value = 1;
        let color = '#fbbf24';
        let radius = 17;
        let baseSpeed = 3.6;

        if (chosenType === 'gift') {
          emoji = '🎁';
          value = 2;
          color = '#ec4899';
          radius = 19;
          baseSpeed = 3.8;
        } else if (chosenType === 'star') {
          emoji = '⭐';
          value = 3;
          color = '#f59e0b';
          radius = 21;
          baseSpeed = 4.2;
        } else if (chosenType === 'special') {
          emoji = seasonInfo.emoji || '⚡';
          value = 4;
          color = config.accentColor || '#6366f1';
          radius = 22;
          baseSpeed = 4.5;
        } else if (chosenType === 'bomb') {
          emoji = '💣';
          value = -3;
          color = '#ef4444';
          radius = 20;
          baseSpeed = 4.0;
        } else if (chosenType === 'skull') {
          emoji = '☠️';
          value = -2;
          color = '#a855f7';
          radius = 19;
          baseSpeed = 3.9;
        } else if (chosenType === 'ice') {
          emoji = '🧊';
          value = -1;
          color = '#38bdf8';
          radius = 18;
          baseSpeed = 4.1;
        } else if (chosenType === 'tornado') {
          emoji = '🌪️';
          value = -2;
          color = '#94a3b8';
          radius = 21;
          baseSpeed = 4.3;
        } else if (chosenType === 'lightning') {
          emoji = '⚡';
          value = -3;
          color = '#facc15';
          radius = 20;
          baseSpeed = 4.6;
        } else if (chosenType === 'cactus') {
          emoji = '🌵';
          value = -2;
          color = '#22c55e';
          radius = 19;
          baseSpeed = 3.9;
        } else if (chosenType === 'rock') {
          emoji = '🪨';
          value = -3;
          color = '#78716c';
          radius = 23;
          baseSpeed = 5.6; // Very fast heavy plummet!
        } else if (chosenType === 'fire') {
          emoji = '🔥';
          value = -3;
          color = '#f97316';
          radius = 20;
          baseSpeed = 4.2;
        } else if (chosenType === 'vortex') {
          emoji = '🕳️';
          value = -2;
          color = '#818cf8';
          radius = 22;
          baseSpeed = 3.8;
        }

        const spawnX = Math.random() * (canvasWidth - 90) + 45;
        itemsRef.current.push({
          id: now + Math.random(),
          x: spawnX,
          y: -20,
          radius,
          speedY: (Math.random() * 1.6 + baseSpeed) * baseSpeedFactor * speedRamp,
          speedX: (Math.random() - 0.5) * 1.1,
          type: chosenType,
          value,
          color,
          emoji,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.12
        });

        lastItemSpawnRef.current = now;
      }

      // 4. CLEAR CANVAS & APPLY SCREEN SHAKE IF BOMB / ROCK EXPLODED
      ctx.save();
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      if (screenShakeFramesRef.current > 0) {
        const shakeMag = screenShakeFramesRef.current * 1.3;
        const offsetX = (Math.random() - 0.5) * shakeMag;
        const offsetY = (Math.random() - 0.5) * shakeMag;
        ctx.translate(offsetX, offsetY);
        screenShakeFramesRef.current -= 1;
      }

      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      skyGrad.addColorStop(0, '#050811');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // 5. DRAW ATMOSPHERIC WIND PARTICLES
      ctx.strokeStyle = '#ffffff';
      windParticlesRef.current.forEach(p => {
        p.x += (currentWind * 4.0) + (currentWind === 0 ? 0.2 : 0);
        p.y += p.speed;

        if (p.x > canvasWidth + 20) p.x = -20;
        if (p.x < -20) p.x = canvasWidth + 20;
        if (p.y > canvasHeight) p.y = -10;

        ctx.beginPath();
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = p.opacity;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + currentWind * 11, p.y + 4);
        ctx.stroke();
      });
      ctx.globalAlpha = 1.0;

      // 6. UPDATE AND DRAW FALLING ITEMS
      const basketX = basketXRef.current;
      const basketY = canvasHeight - 48;

      for (let i = itemsRef.current.length - 1; i >= 0; i--) {
        const item = itemsRef.current[i];

        // Dynamic wind curve physics
        item.x += item.speedX + (currentWind * 1.8);
        item.y += item.speedY;
        item.rotation += item.rotationSpeed;

        // Bounce horizontally inside side walls
        if (item.x < item.radius) {
          item.x = item.radius;
          item.speedX = Math.abs(item.speedX);
        } else if (item.x > canvasWidth - item.radius) {
          item.x = canvasWidth - item.radius;
          item.speedX = -Math.abs(item.speedX);
        }

        // Draw item circular background & glow
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation);

        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        
        const isHazard = ['bomb', 'skull', 'ice', 'tornado', 'lightning', 'cactus', 'rock', 'fire', 'vortex'].includes(item.type);
        ctx.fillStyle = isHazard ? 'rgba(239, 68, 68, 0.25)' : 'rgba(15, 23, 42, 0.85)';
        ctx.fill();
        ctx.lineWidth = isHazard ? 2.5 : 2.0;
        ctx.strokeStyle = item.color;
        ctx.stroke();

        ctx.font = `${item.radius * 1.3}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, 0, 1);
        ctx.restore();

        // Catch collision detection with basket
        const inBasketX = item.x >= (basketX - basketWidth / 2 - 10) && item.x <= (basketX + basketWidth / 2 + 10);
        const inBasketY = item.y >= (basketY - 14) && item.y <= (basketY + basketHeight);

        if (inBasketX && inBasketY) {
          if (item.type === 'bomb') {
            // 💣 BOMB HAZARD: -3 Points + Screen Shake
            scoreRef.current = Math.max(0, scoreRef.current - 3);
            setScore(scoreRef.current);
            penaltyFlashRef.current = 16;
            screenShakeFramesRef.current = 12;
            setPenaltyAlert({ text: '💥 ¡BOMBA! -3 Pts (Descuento Reducido)', isHazard: true });
            setTimeout(() => setPenaltyAlert(null), 1400);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: basketX,
              y: basketY - 12,
              text: '-3 💣💥',
              color: '#ef4444',
              opacity: 1.0,
              vy: -2.0,
              life: 45
            });
          } else if (item.type === 'skull') {
            // ☠️ SKULL HAZARD: -2 Points + Poison
            scoreRef.current = Math.max(0, scoreRef.current - 2);
            setScore(scoreRef.current);
            penaltyFlashRef.current = 12;
            setPenaltyAlert({ text: '☠️ ¡Trampa Venenosa! -2 Puntos', isHazard: true });
            setTimeout(() => setPenaltyAlert(null), 1300);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: basketX,
              y: basketY - 12,
              text: '-2 ☠️',
              color: '#a855f7',
              opacity: 1.0,
              vy: -2.0,
              life: 40
            });
          } else if (item.type === 'ice') {
            // 🧊 ICE HAZARD: -1 Point + Freeze Basket Speed
            scoreRef.current = Math.max(0, scoreRef.current - 1);
            setScore(scoreRef.current);
            frozenUntilRef.current = Date.now() + 1800; // 1.8s frost freeze
            setPenaltyAlert({ text: '🧊 ¡Hielo! Canasta Congelada (-1 Pt)', isHazard: true });
            setTimeout(() => setPenaltyAlert(null), 1400);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: basketX,
              y: basketY - 12,
              text: '❄️ Congelado!',
              color: '#38bdf8',
              opacity: 1.0,
              vy: -1.8,
              life: 40
            });
          } else if (item.type === 'tornado') {
            // 🌪️ TORNADO HAZARD: -2 Points + Sudden Wind Spike
            scoreRef.current = Math.max(0, scoreRef.current - 2);
            setScore(scoreRef.current);
            currentWind = (Math.random() > 0.5 ? 1.8 : -1.8);
            setWindForce(currentWind);
            setWindLabel(getWindDescription(currentWind));
            setPenaltyAlert({ text: '🌪️ ¡Remolino! -2 Pts & Turbulencia', isHazard: true });
            setTimeout(() => setPenaltyAlert(null), 1300);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: basketX,
              y: basketY - 12,
              text: '-2 🌪️',
              color: '#94a3b8',
              opacity: 1.0,
              vy: -2.0,
              life: 40
            });
          } else if (item.type === 'lightning') {
            // ⚡ LIGHTNING HAZARD: -3 Points + Shock Inverted Controls (Left ⇄ Right)
            scoreRef.current = Math.max(0, scoreRef.current - 3);
            setScore(scoreRef.current);
            invertedUntilRef.current = Date.now() + 2200; // 2.2s inverted controls
            penaltyFlashRef.current = 14;
            setPenaltyAlert({ text: '⚡ ¡ELECTROCUTADO! Controles Invertidos (-3 Pts)', isHazard: true });
            setTimeout(() => setPenaltyAlert(null), 1500);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: basketX,
              y: basketY - 12,
              text: '⚡ -3 Pts (Invertido!)',
              color: '#facc15',
              opacity: 1.0,
              vy: -2.2,
              life: 45
            });
          } else if (item.type === 'cactus') {
            // 🌵 CACTUS HAZARD: -2 Points + Shrink Basket 50%
            scoreRef.current = Math.max(0, scoreRef.current - 2);
            setScore(scoreRef.current);
            shrunkUntilRef.current = Date.now() + 2500; // 2.5s shrunk basket
            setPenaltyAlert({ text: '🌵 ¡PINCHAZO! Canasta Reducida 50% (-2 Pts)', isHazard: true });
            setTimeout(() => setPenaltyAlert(null), 1400);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: basketX,
              y: basketY - 12,
              text: '🌵 -2 Pts (Encogida!)',
              color: '#22c55e',
              opacity: 1.0,
              vy: -2.0,
              life: 40
            });
          } else if (item.type === 'rock') {
            // 🪨 HEAVY ROCK HAZARD: -3 Points + Big Screen Shake
            scoreRef.current = Math.max(0, scoreRef.current - 3);
            setScore(scoreRef.current);
            screenShakeFramesRef.current = 15;
            penaltyFlashRef.current = 14;
            setPenaltyAlert({ text: '🪨 ¡IMPACTO PESADO! -3 Puntos', isHazard: true });
            setTimeout(() => setPenaltyAlert(null), 1400);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: basketX,
              y: basketY - 12,
              text: '-3 🪨💥',
              color: '#a8a29e',
              opacity: 1.0,
              vy: -2.2,
              life: 45
            });
          } else if (item.type === 'fire') {
            // 🔥 FIRE HAZARD: -3 Points + Burning Net
            scoreRef.current = Math.max(0, scoreRef.current - 3);
            setScore(scoreRef.current);
            burningUntilRef.current = Date.now() + 2000; // 2.0s burning
            penaltyFlashRef.current = 15;
            setPenaltyAlert({ text: '🔥 ¡LLAMARADA! Canasta en Llamas (-3 Pts)', isHazard: true });
            setTimeout(() => setPenaltyAlert(null), 1400);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: basketX,
              y: basketY - 12,
              text: '-3 🔥 Quemado!',
              color: '#f97316',
              opacity: 1.0,
              vy: -2.2,
              life: 45
            });
          } else if (item.type === 'vortex') {
            // 🕳️ VORTEX HAZARD: -2 Points + Gravity Distortion
            scoreRef.current = Math.max(0, scoreRef.current - 2);
            setScore(scoreRef.current);
            screenShakeFramesRef.current = 7;
            setPenaltyAlert({ text: '🕳️ ¡VÓRTICE! -2 Pts & Distorsión', isHazard: true });
            setTimeout(() => setPenaltyAlert(null), 1300);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: basketX,
              y: basketY - 12,
              text: '-2 🕳️ Vórtice',
              color: '#818cf8',
              opacity: 1.0,
              vy: -2.0,
              life: 40
            });
          } else {
            // 🌟 SUCCESSFUL POSITIVE COLLECTION
            scoreRef.current += item.value;
            setScore(scoreRef.current);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: item.x,
              y: basketY - 12,
              text: `+${item.value}`,
              color: '#fbbf24',
              opacity: 1.0,
              vy: -2.2,
              life: 35
            });

            // Catch spark flare
            ctx.beginPath();
            ctx.arc(item.x, basketY, 28, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
            ctx.fill();
          }

          itemsRef.current.splice(i, 1);
          continue;
        }

        // ==========================================
        // MISSED ITEM HANDLER (CRITICAL REQUIREMENT)
        // Collectible dropped past bottom -> Deduct points and reduce discount!
        // Hazards dodged past bottom -> 0 penalty (Esquiva exitosa)
        // ==========================================
        if (item.y > canvasHeight + 10) {
          const isHazardItem = ['bomb', 'skull', 'ice', 'tornado', 'lightning', 'cactus', 'rock', 'fire', 'vortex'].includes(item.type);

          if (!isHazardItem) {
            // Penalty for letting a collectible drop!
            const penalty = item.value >= 3 ? 2 : missPenalty;
            scoreRef.current = Math.max(0, scoreRef.current - penalty);
            setScore(scoreRef.current);
            penaltyFlashRef.current = 10;
            
            setPenaltyAlert({ text: `⚠️ ¡Se escapó! -${penalty} Pts (Descuento Baja)`, isHazard: false });
            setTimeout(() => setPenaltyAlert(null), 1100);

            floatingTextsRef.current.push({
              id: Math.random(),
              x: Math.max(40, Math.min(360, item.x)),
              y: canvasHeight - 20,
              text: `-${penalty} ❌`,
              color: '#f87171',
              opacity: 1.0,
              vy: -1.6,
              life: 35
            });
          }

          itemsRef.current.splice(i, 1);
        }
      }

      // 7. DRAW BASKET / NET RECEPTOR (With Multi-State Effects: Frost, Spikes, Lightning, Burning)
      ctx.save();
      const basketLeft = basketX - basketWidth / 2;
      const basketTop = basketY;

      // Basket Glow based on active status effect
      if (isFrozen) {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 20;
      } else if (isInverted) {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 22;
      } else if (isBurning) {
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 22;
      } else if (isShrunk) {
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 18;
      } else {
        ctx.shadowColor = config.accentColor || '#f59e0b';
        ctx.shadowBlur = 12;
      }

      // Rim
      ctx.beginPath();
      ctx.roundRect(basketLeft, basketTop, basketWidth, 9, 4);
      if (isFrozen) {
        ctx.fillStyle = '#38bdf8';
      } else if (isInverted) {
        ctx.fillStyle = '#facc15';
      } else if (isBurning) {
        ctx.fillStyle = '#f97316';
      } else if (isShrunk) {
        ctx.fillStyle = '#22c55e';
      } else {
        ctx.fillStyle = config.accentColor || '#f59e0b';
      }
      ctx.fill();

      // Net Body
      ctx.shadowBlur = 0;
      ctx.beginPath();
      const inset = isShrunk ? 6 : 14;
      ctx.moveTo(basketLeft + 4, basketTop + 7);
      ctx.lineTo(basketLeft + inset, basketTop + basketHeight);
      ctx.lineTo(basketLeft + basketWidth - inset, basketTop + basketHeight);
      ctx.lineTo(basketLeft + basketWidth - 4, basketTop + 7);
      ctx.closePath();

      const netGrad = ctx.createLinearGradient(basketLeft, basketTop, basketLeft, basketTop + basketHeight);
      if (isFrozen) {
        netGrad.addColorStop(0, 'rgba(186, 230, 253, 0.8)');
        netGrad.addColorStop(1, 'rgba(56, 189, 248, 0.85)');
      } else if (isInverted) {
        netGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
        netGrad.addColorStop(1, 'rgba(234, 179, 8, 0.85)');
      } else if (isBurning) {
        netGrad.addColorStop(0, 'rgba(254, 215, 170, 0.85)');
        netGrad.addColorStop(1, 'rgba(239, 68, 68, 0.88)');
      } else if (isShrunk) {
        netGrad.addColorStop(0, 'rgba(187, 247, 208, 0.85)');
        netGrad.addColorStop(1, 'rgba(34, 197, 94, 0.85)');
      } else {
        netGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        netGrad.addColorStop(1, 'rgba(245, 158, 11, 0.75)');
      }
      ctx.fillStyle = netGrad;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isFrozen ? '#e0f2fe' : isInverted ? '#fef08a' : isBurning ? '#fecaca' : isShrunk ? '#bbf7d0' : '#ffffff';
      ctx.stroke();

      // Net grid mesh lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = isFrozen 
        ? 'rgba(224, 242, 254, 0.7)' 
        : isInverted 
        ? 'rgba(254, 240, 138, 0.7)' 
        : isBurning 
        ? 'rgba(254, 215, 170, 0.7)' 
        : 'rgba(255, 255, 255, 0.4)';

      const step = isShrunk ? 8 : 11;
      for (let x = basketLeft + (isShrunk ? 7 : 14); x < basketLeft + basketWidth - (isShrunk ? 5 : 10); x += step) {
        ctx.beginPath();
        ctx.moveTo(x, basketTop + 7);
        ctx.lineTo(x - (currentWind * 3.5), basketTop + basketHeight);
        ctx.stroke();
      }

      ctx.restore();

      // 8. UPDATE AND DRAW FLOATING TEXTS (+1, -3 💣, -1 ❌)
      for (let f = floatingTextsRef.current.length - 1; f >= 0; f--) {
        const ft = floatingTextsRef.current[f];
        ft.y += ft.vy;
        ft.life -= 1;
        ft.opacity = Math.max(0, ft.life / 35);

        ctx.save();
        ctx.globalAlpha = ft.opacity;
        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        if (ft.life <= 0) {
          floatingTextsRef.current.splice(f, 1);
        }
      }

      // 9. PENALTY FLASH BORDER EFFECT
      if (penaltyFlashRef.current > 0) {
        ctx.save();
        const flashAlpha = Math.min(0.65, penaltyFlashRef.current / 16);
        ctx.strokeStyle = `rgba(239, 68, 68, ${flashAlpha})`;
        ctx.lineWidth = 9;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
        ctx.restore();
        penaltyFlashRef.current -= 1;
      }

      ctx.restore(); // Restore shake transform

      if (isPlayingRef.current) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, config, seasonInfo, getWindDescription]);

  // Copy coupon handler
  const handleCopyCoupon = () => {
    if (!wonCoupon) return;
    navigator.clipboard.writeText(wonCoupon.code);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2500);
  };

  // Direct checkout action
  const handleDirectCheckout = () => {
    if (!wonCoupon || !favoriteProduct) return;
    if (onApplyDiscountAndBuy) {
      onApplyDiscountAndBuy(favoriteProduct, wonCoupon);
    }
    onClose();
  };

  // Apply to cart action
  const handleApplyToCart = () => {
    if (!wonCoupon) return;
    if (onApplyDiscountToCart) {
      onApplyDiscountToCart(wonCoupon);
    }
    onClose();
  };

  if (!isOpen) return null;

  // Discounted price calculations
  const originalPrice = favoriteProduct?.price || 120000;
  const discountPercent = wonCoupon?.percentage || config.minDiscountPercentage || 5;
  const discountAmount = (originalPrice * discountPercent) / 100;
  const finalDiscountedPrice = Math.round(originalPrice - discountAmount);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-white my-auto"
        style={{
          boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 40px ${config.accentColor}25`
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-700"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Campaign Badge */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.badgeEmoji || '🌪️'}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              {config.seasonName || seasonInfo.name}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mr-7 sm:mr-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pago Contra Entrega</span>
          </div>
        </div>

        {/* SCREEN 1: INTRO SCREEN */}
        {gameState === 'intro' && (
          <div className="p-6 sm:p-8 text-center space-y-5">
            <div className="relative inline-block">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl mx-auto border-2"
                style={{
                  backgroundColor: `${config.accentColor}20`,
                  borderColor: config.accentColor
                }}
              >
                {config.badgeEmoji || '🌪️'}
              </div>
              <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow">
                DE {config.minDiscountPercentage}% HASTA {config.maxDiscountPercentage}% OFF
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {config.gameTitle || '¡Desafío Flash: Atrapa tu Descuento!'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                {isMobile && config.enableGyroscope !== false
                  ? '¡Empiezas con 5% de descuento base! Inclina tu celular para acumular puntos y escalar hasta el 15% OFF.'
                  : '¡Empiezas con 5% de descuento base! Mueve la canasta para acumular puntos y escalar hasta el 15% OFF.'}
              </p>
            </div>

            {/* Dynamic Hazard and Miss Penalty Rules Banner */}
            <div className="bg-slate-950/80 border border-red-500/40 rounded-xl p-3 text-left space-y-2.5 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>¡Reglas de Dificultad Dinámica ({config.minDiscountPercentage}% - {config.maxDiscountPercentage}%)!</span>
                </div>
                <span className="text-[10px] bg-red-950 text-red-300 font-extrabold px-2 py-0.5 rounded border border-red-800">
                  9 Obstáculos
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-400 block">🌟 Atrapa Premios (+Pts)</span>
                  <p className="text-[10px] text-slate-300 leading-snug">
                    🪙 Moneda (+1) | 🎁 Regalo (+2)<br />
                    ⭐ Estrella (+3) | ⚡ Especial (+4)<br />
                    <strong className="text-emerald-400">Sube tu % de descuento hasta el 15%</strong>
                  </p>
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-red-900/50 space-y-1">
                  <span className="font-bold text-red-400 block">💥 Esquiva Trampas y Daño</span>
                  <p className="text-[10px] text-slate-300 leading-snug">
                    💣 Bomba / 🪨 Roca (-3)<br />
                    ⚡ Rayo (Invertido) | 🔥 Fuego (-3)<br />
                    🌵 Cactus (Encoge 50%) | ☠️ Veneno (-2)<br />
                    🧊 Hielo (Frena) | 🌪️ Tornado | 🕳️ Vórtice<br />
                    <strong className="text-red-400">Baja tus puntos y % de descuento</strong>
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Si dejas caer objetos al vacío sin recogerlos, también se descontarán puntos reduciendo tu porcentaje final.
              </p>
            </div>

            {/* Target Favorite Product Teaser */}
            {favoriteProduct && (
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3 text-left max-w-sm mx-auto">
                <img
                  src={favoriteProduct.images?.[0] || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200'}
                  alt={favoriteProduct.title}
                  className="w-12 h-12 rounded-lg object-cover bg-slate-900 border border-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    Tu producto de interés
                  </span>
                  <h4 className="text-xs font-semibold text-slate-200 truncate">
                    {favoriteProduct.title}
                  </h4>
                  <span className="text-xs font-black text-white">
                    {formatCOP(favoriteProduct.price)}
                  </span>
                </div>
              </div>
            )}

            {/* Tier Rules Legend */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                <div className="text-base mb-0.5">🥉</div>
                <div className="font-bold text-slate-200">Bronce</div>
                <div className="text-amber-400 font-extrabold text-[11px]">
                  5% - 9% OFF
                </div>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                <div className="text-base mb-0.5">🥈</div>
                <div className="font-bold text-slate-200">Plata</div>
                <div className="text-amber-400 font-extrabold text-[11px]">
                  10% - 14% OFF
                </div>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                <div className="text-base mb-0.5">🥇</div>
                <div className="font-bold text-slate-200">Oro Élite</div>
                <div className="text-amber-400 font-extrabold text-[11px]">
                  15% OFF Máximo
                </div>
              </div>
            </div>

            {/* Mobile Sensor Info Banner */}
            {isMobile && config.enableGyroscope !== false && (
              <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-xl p-2.5 text-xs text-indigo-200 flex items-center justify-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-400 animate-bounce" />
                <span>Control por movimiento físico (Giroscopio) activado</span>
              </div>
            )}

            {sensorStatusMessage && (
              <p className="text-[11px] text-amber-300 font-medium">
                {sensorStatusMessage}
              </p>
            )}

            {/* Interactive Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {isMobile && config.enableGyroscope !== false ? (
                <>
                  <button
                    onClick={() => requestMotionPermissionAndStart('gyroscope')}
                    className="w-full py-3.5 px-6 rounded-xl font-black text-slate-950 flex items-center justify-center gap-2 text-base transition-all transform active:scale-95 shadow-lg"
                    style={{
                      backgroundColor: config.accentColor || '#f59e0b',
                      boxShadow: `0 8px 25px ${config.accentColor}50`
                    }}
                  >
                    <Smartphone className="w-5 h-5 fill-slate-950 animate-pulse" />
                    <span>🎮 Jugar con Giroscopio (Inclina tu celular)</span>
                  </button>

                  <button
                    onClick={() => requestMotionPermissionAndStart('touch')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <Hand className="w-3.5 h-3.5 text-slate-400" />
                    <span>O jugar con pantalla táctil (Deslizar dedo)</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startGame()}
                  className="w-full py-3.5 px-6 rounded-xl font-black text-slate-950 flex items-center justify-center gap-2 text-base transition-all transform active:scale-95 shadow-lg"
                  style={{
                    backgroundColor: config.accentColor || '#f59e0b',
                    boxShadow: `0 8px 25px ${config.accentColor}50`
                  }}
                >
                  <Zap className="w-5 h-5 fill-slate-950" />
                  <span>¡Comenzar Desafío ({config.gameDurationSeconds || 15}s)!</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 2: ACTIVE GAMEPLAY CANVAS SCREEN */}
        {gameState === 'playing' && (
          <div className="p-3 sm:p-5 flex flex-col items-center">
            {/* Top Game HUD with Real-Time Discount Tier */}
            <div className="w-full space-y-2 mb-2">
              <div className="flex items-center justify-between px-1 gap-1.5">
                {/* Score Indicator */}
                <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2.5 sm:px-3 py-1.5 rounded-lg shadow">
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-300">Puntos:</span>
                  <span className="text-xs sm:text-sm font-black text-amber-400">{score}</span>
                </div>

                {/* Wind Dynamic Indicator */}
                <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border transition-colors ${
                  windForce === 0 
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300' 
                    : windForce < 0 
                    ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300 animate-pulse' 
                    : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300 animate-pulse'
                }`}>
                  <Wind className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[110px] sm:max-w-[180px]">{windLabel}</span>
                </div>

                {/* Time Countdown */}
                <div className="flex items-center gap-1 sm:gap-1.5 bg-red-950/80 border border-red-500/40 px-2.5 sm:px-3 py-1.5 rounded-lg text-red-300">
                  <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 animate-pulse" />
                  <span className="text-xs sm:text-sm font-black">{timeLeft}s</span>
                </div>
              </div>

              {/* LIVE DISCOUNT ACCUMULATED PERCENTAGE HUD (Dynamically updates & drops with hazards) */}
              <div className="flex items-center justify-between bg-slate-800/95 border border-slate-700 px-3 py-1.5 rounded-xl text-xs shadow-md">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span className="text-[11px] font-bold text-slate-300">Descuento Ganado:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="font-black text-sm px-2.5 py-0.5 rounded-lg transition-all duration-300 shadow-sm"
                    style={{
                      backgroundColor: `${liveTier.color}25`,
                      color: liveTier.color,
                      border: `1.5px solid ${liveTier.color}70`
                    }}
                  >
                    {liveTier.discountPercentage}% OFF ({liveTier.badge.split(' ')[0]})
                  </span>
                </div>
              </div>
            </div>

            {/* Penalty / Floating Alert */}
            {penaltyAlert && (
              <div className={`w-full text-white font-bold text-[11px] py-1 px-3 rounded-lg mb-1.5 text-center animate-bounce shadow-lg flex items-center justify-center gap-1.5 border ${
                penaltyAlert.isHazard ? 'bg-red-900/95 border-red-500' : 'bg-amber-900/95 border-amber-500'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                <span>{penaltyAlert.text}</span>
              </div>
            )}

            {/* Active Hazard Status Banners */}
            <div className="w-full space-y-1 mb-1.5">
              {isControlsInverted && (
                <div className="w-full bg-yellow-950/95 border border-yellow-400 text-yellow-200 font-extrabold text-[10.5px] py-1 px-2 rounded-md text-center animate-pulse flex items-center justify-center gap-1.5 shadow">
                  <Zap className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
                  <span>⚡ ¡ELECTROCUTADO! Controles Invertidos (Izquierda ⇄ Derecha)</span>
                </div>
              )}

              {isBasketShrunk && (
                <div className="w-full bg-emerald-950/95 border border-emerald-400 text-emerald-200 font-extrabold text-[10.5px] py-1 px-2 rounded-md text-center animate-pulse flex items-center justify-center gap-1.5 shadow">
                  <span>🌵</span>
                  <span>¡CANASTA ENCOGIDA 50%! Puntería reducida</span>
                </div>
              )}

              {isBasketBurning && (
                <div className="w-full bg-orange-950/95 border border-orange-400 text-orange-200 font-extrabold text-[10.5px] py-1 px-2 rounded-md text-center animate-pulse flex items-center justify-center gap-1.5 shadow">
                  <Flame className="w-3.5 h-3.5 text-orange-400 animate-bounce" />
                  <span>🔥 ¡RED EN LLAMAS! Daño por fuego activo</span>
                </div>
              )}

              {isBasketFrozen && (
                <div className="w-full bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-bold text-[10px] py-0.5 px-2 rounded-md text-center animate-pulse flex items-center justify-center gap-1">
                  <Snowflake className="w-3 h-3 text-cyan-300 animate-spin" />
                  <span>🧊 ¡Canasta Congelada! Movimiento ralentizado</span>
                </div>
              )}
            </div>

            {/* Canvas Interactive Container */}
            <div 
              className="relative w-full max-w-[400px] h-[390px] sm:h-[430px] rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 shadow-inner select-none touch-none"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handlePointerMove(e.clientX, rect);
              }}
              onTouchMove={(e) => {
                if (e.touches[0]) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  handlePointerMove(e.touches[0].clientX, rect);
                }
              }}
            >
              <canvas
                ref={canvasRef}
                width={400}
                height={460}
                className="w-full h-full block"
              />

              {/* Sensor Indicator HUD (Real-time Gyroscope feedback) */}
              {controlMode === 'gyroscope' ? (
                <div className="absolute top-2.5 inset-x-0 flex justify-center pointer-events-none">
                  <div className="bg-slate-950/80 border border-indigo-500/40 text-indigo-200 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                    <Smartphone className="w-3 h-3 text-indigo-400" />
                    <span>Inclinación: {currentTiltGamma > 0 ? `+${currentTiltGamma}°` : `${currentTiltGamma}°`}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                </div>
              ) : null}

              {/* In-Game Mode Switcher */}
              <div className="absolute bottom-2 inset-x-0 flex justify-center items-center gap-2 pointer-events-auto px-2">
                <div className="bg-slate-950/85 text-[10px] font-semibold text-slate-300 px-3 py-1 rounded-full border border-slate-700/60 backdrop-blur-sm flex items-center gap-1.5 shadow">
                  {controlMode === 'gyroscope' ? (
                    <>
                      <span>📲 Inclina tu teléfono a los lados</span>
                      <button
                        onClick={() => {
                          setControlMode('touch');
                          controlModeRef.current = 'touch';
                        }}
                        className="text-amber-400 hover:underline font-bold ml-1"
                      >
                        (Cambiar a Táctil)
                      </button>
                    </>
                  ) : (
                    <>
                      <span>👈 Desliza el dedo o mouse 👉</span>
                      {isMobile && (
                        <button
                          onClick={() => requestMotionPermissionAndStart('gyroscope')}
                          className="text-indigo-400 hover:underline font-bold ml-1"
                        >
                          (Activar Giroscopio)
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: REWARD & CHECKOUT OFFER */}
        {gameState === 'reward' && wonCoupon && rewardTier && (
          <div className="p-6 sm:p-7 space-y-5 text-center">
            {/* Victory Badge */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>¡Desafío Finalizado! • {rewardTier.badge}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                ¡Ganaste {wonCoupon.percentage}% OFF!
              </h3>
              <p className="text-xs text-slate-300">
                Puntuación alcanzada: <strong className="text-amber-400">{score} puntos</strong>. Tu descuento dinámico ha sido calculado y desbloqueado.
              </p>
            </div>

            {/* Urgency Countdown Bar */}
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs text-amber-200">
              <Timer className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Esta oferta expira en: </span>
              <span className="font-mono font-black text-amber-300 text-sm">
                {formatTimer(couponSecondsLeft)}
              </span>
            </div>

            {/* Target Product Price Card */}
            {favoriteProduct && (
              <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 text-left space-y-3">
                <div className="flex gap-3">
                  <img
                    src={favoriteProduct.images?.[0] || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=300'}
                    alt={favoriteProduct.title}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-900 border border-slate-700 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Tu Producto Seleccionado
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                      {favoriteProduct.title}
                    </h4>
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-base sm:text-lg font-black text-emerald-400">
                        {formatCOP(finalDiscountedPrice)}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        {formatCOP(originalPrice)}
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                        -{wonCoupon.percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-700/70 pt-2.5 flex items-center justify-between text-[11px] text-slate-300">
                  <div className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Envío a toda Colombia</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-amber-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pagas al recibir en casa</span>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Coupon Box */}
            <div className="bg-slate-950/70 border border-dashed border-amber-400/50 rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-left">
                <Tag className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Cupón generado:</span>
                  <span className="font-mono font-black text-amber-300 text-sm tracking-wider">
                    {wonCoupon.code}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCopyCoupon}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                {copiedCoupon ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-300" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Direct Checkout CTA Button */}
            <div className="space-y-2.5">
              <button
                onClick={handleDirectCheckout}
                className="w-full py-3.5 px-6 rounded-xl font-black text-slate-950 flex items-center justify-center gap-2 text-base transition-all transform active:scale-95 shadow-xl"
                style={{
                  backgroundColor: config.accentColor || '#f59e0b',
                  boxShadow: `0 10px 25px ${config.accentColor}40`
                }}
              >
                <ShoppingBag className="w-5 h-5 fill-slate-950" />
                <span>Pedir Contra Entrega con {wonCoupon.percentage}% OFF</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleApplyToCart}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                Guardar cupón en el carrito y seguir viendo la tienda
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
