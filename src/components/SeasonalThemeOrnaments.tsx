import React from 'react';
import { SeasonalThemeId, SEASONAL_THEMES } from '../utils/seasonalThemes.ts';

interface SeasonalLogoOrnamentProps {
  themeId: SeasonalThemeId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Gorro de Santa Claus 3D Vectorial
 */
export const SantaHatOrnament: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const scale = size === 'sm' ? 'w-6 h-6 -top-3 -right-2' : size === 'lg' ? 'w-12 h-12 -top-6 -right-4' : 'w-8 h-8 -top-4 -right-3';
  return (
    <div className={`absolute ${scale} pointer-events-none select-none z-20 transform rotate-12 drop-shadow-md`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="santaRed" x1="10" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <linearGradient id="santaBrim" x1="10" y1="70" x2="90" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <filter id="pompomShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Hat Cone with playful curve */}
        <path
          d="M 18 70 Q 30 15 82 22 Q 62 45 76 70 Z"
          fill="url(#santaRed)"
        />

        {/* Folded tip shadow */}
        <path
          d="M 68 20 C 78 18 88 22 88 32 C 86 42 74 38 68 20 Z"
          fill="#b91c1c"
          opacity="0.8"
        />

        {/* White Fur Brim */}
        <path
          d="M 12 68 C 12 62 82 62 82 68 C 82 77 12 77 12 68 Z"
          fill="url(#santaBrim)"
          filter="url(#pompomShadow)"
        />

        {/* Fluffy brim bumps */}
        <circle cx="20" cy="71" r="5" fill="#ffffff" />
        <circle cx="34" cy="71" r="5.5" fill="#f8fafc" />
        <circle cx="48" cy="71" r="5.5" fill="#ffffff" />
        <circle cx="62" cy="71" r="5.5" fill="#f8fafc" />
        <circle cx="75" cy="71" r="5" fill="#ffffff" />

        {/* White Pompom Ball */}
        <g filter="url(#pompomShadow)">
          <circle cx="86" cy="36" r="7.5" fill="#ffffff" />
          <circle cx="84" cy="34" r="5" fill="#f8fafc" opacity="0.9" />
        </g>
      </svg>
    </div>
  );
};

/**
 * Sombrero de Bruja Vectorial para Halloween
 */
export const WitchHatOrnament: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const scale = size === 'sm' ? 'w-7 h-7 -top-3.5 -right-2' : size === 'lg' ? 'w-14 h-14 -top-7 -right-4' : 'w-9 h-9 -top-4.5 -right-3';
  return (
    <div className={`absolute ${scale} pointer-events-none select-none z-20 transform rotate-15 drop-shadow-md`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="witchHatGrad" x1="10" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="40%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="orangeRibbon" x1="20" y1="65" x2="80" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* Cone with crooked spooky tip */}
        <path
          d="M 28 66 Q 42 28 58 12 Q 62 10 65 14 Q 60 25 54 35 Q 50 48 68 66 Z"
          fill="url(#witchHatGrad)"
        />

        {/* Orange Silk Ribbon */}
        <path
          d="M 28 64 C 36 60 58 60 68 64 L 69 70 C 58 66 36 66 28 70 Z"
          fill="url(#orangeRibbon)"
        />

        {/* Gold Buckle */}
        <rect x="44" y="62" width="8" height="7" rx="1.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
        <rect x="46.5" y="64" width="3" height="3" fill="#1e1b4b" />

        {/* Wide Brim */}
        <path
          d="M 10 74 C 18 67 78 67 88 74 C 76 79 22 79 10 74 Z"
          fill="#1e1b4b"
          stroke="#090d16"
          strokeWidth="1"
        />

        {/* Spooky gold star glint */}
        <path d="M 62 14 L 63.5 18 L 67 19 L 64 21 L 64.5 25 L 62 22 L 59 25 L 60 21 L 57 19 L 60.5 18 Z" fill="#facc15" opacity="0.8" />
      </svg>
    </div>
  );
};

/**
 * Corazones 3D para San Valentín
 */
export const HeartsOrnament: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const scale = size === 'sm' ? 'w-6 h-6 -top-2.5 -right-1.5' : size === 'lg' ? 'w-12 h-12 -top-5 -right-3' : 'w-8 h-8 -top-3.5 -right-2';
  return (
    <div className={`absolute ${scale} pointer-events-none select-none z-20 transform rotate-12 drop-shadow-md`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="heartPinkGrad" x1="10" y1="10" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="40%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>
          <linearGradient id="heartSmallGrad" x1="20" y1="20" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
        </defs>

        {/* Secondary smaller heart */}
        <path
          d="M 68 25 C 64 16 50 18 46 28 C 42 18 28 16 24 25 C 18 38 46 54 46 54 C 46 54 74 38 68 25 Z"
          fill="url(#heartSmallGrad)"
          transform="translate(18, -6) scale(0.65)"
          opacity="0.9"
        />

        {/* Main 3D Heart */}
        <path
          d="M 78 40 C 72 26 50 28 44 42 C 38 28 16 26 10 40 C 2 60 44 85 44 85 C 44 85 86 60 78 40 Z"
          fill="url(#heartPinkGrad)"
        />

        {/* Heart Gloss highlight */}
        <path
          d="M 22 36 C 26 30 36 32 38 38"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Sparkle */}
        <circle cx="82" cy="22" r="2" fill="#ffffff" />
        <circle cx="28" cy="20" r="1.5" fill="#fef08a" />
      </svg>
    </div>
  );
};

/**
 * Flores y Rosas para el Mes de la Madre
 */
export const MotherFlowerOrnament: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const scale = size === 'sm' ? 'w-6 h-6 -top-2.5 -right-2' : size === 'lg' ? 'w-12 h-12 -top-5 -right-3' : 'w-8 h-8 -top-3.5 -right-2';
  return (
    <div className={`absolute ${scale} pointer-events-none select-none z-20 drop-shadow-md`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="roseGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fbcfe8" />
            <stop offset="50%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="10" y1="60" x2="40" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>

        {/* Green Leaf */}
        <path
          d="M 28 65 Q 12 75 14 88 Q 30 84 36 72 Z"
          fill="url(#leafGrad)"
        />

        {/* Golden Sparkle Leaf */}
        <path
          d="M 70 70 Q 86 78 88 88 Q 72 86 64 74 Z"
          fill="#facc15"
          opacity="0.75"
        />

        {/* Petals */}
        <circle cx="50" cy="36" r="14" fill="url(#roseGrad)" opacity="0.9" />
        <circle cx="36" cy="48" r="14" fill="url(#roseGrad)" opacity="0.9" />
        <circle cx="64" cy="48" r="14" fill="url(#roseGrad)" opacity="0.9" />
        <circle cx="42" cy="62" r="14" fill="url(#roseGrad)" opacity="0.9" />
        <circle cx="58" cy="62" r="14" fill="url(#roseGrad)" opacity="0.9" />

        {/* Flower Center Golden Core */}
        <circle cx="50" cy="50" r="10" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
        <circle cx="50" cy="50" r="5" fill="#f59e0b" />
        
        {/* Sparkle */}
        <circle cx="75" cy="25" r="2.5" fill="#ffffff" />
      </svg>
    </div>
  );
};

/**
 * Lazo de Amistad y Corazones para Amor y Amistad
 */
export const FriendshipRibbonOrnament: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const scale = size === 'sm' ? 'w-6 h-6 -top-2.5 -right-2' : size === 'lg' ? 'w-12 h-12 -top-5 -right-3' : 'w-8 h-8 -top-3.5 -right-2';
  return (
    <div className={`absolute ${scale} pointer-events-none select-none z-20 drop-shadow-md`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="goldRibbon" x1="10" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id="redGiftGrad" x1="10" y1="10" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* Intertwined Heart */}
        <path
          d="M 65 35 C 60 22 42 24 38 35 C 34 24 16 22 11 35 C 4 52 38 72 38 72 C 38 72 72 52 65 35 Z"
          fill="url(#redGiftGrad)"
        />

        {/* Golden Ribbon loops */}
        <path
          d="M 38 34 C 48 20 62 16 66 26 C 70 36 52 42 38 42 Z"
          fill="url(#goldRibbon)"
        />
        <path
          d="M 38 34 C 28 20 14 16 10 26 C 6 36 24 42 38 42 Z"
          fill="url(#goldRibbon)"
        />

        {/* Center knot */}
        <circle cx="38" cy="38" r="4.5" fill="#facc15" stroke="#a16207" strokeWidth="1" />
        <circle cx="75" cy="18" r="2" fill="#ffffff" />
      </svg>
    </div>
  );
};

/**
 * Cyber HUD Brackets para Estándar Cyber
 */
export const CyberHudOrnament: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const scale = size === 'sm' ? 'w-5 h-5 -top-1.5 -right-1.5' : size === 'lg' ? 'w-9 h-9 -top-3 -right-3' : 'w-6 h-6 -top-2 -right-2';
  return (
    <div className={`absolute ${scale} pointer-events-none select-none z-20`}>
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible">
        {/* Holographic corner angle */}
        <path d="M 10 4 L 34 4 L 34 28" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="34" cy="4" r="2.5" fill="#22d3ee" className="animate-ping" style={{ animationDuration: '2s' }} />
        <circle cx="34" cy="4" r="2" fill="#a5f3fc" />
      </svg>
    </div>
  );
};

/**
 * Guirnalda de luces navideñas titilantes
 */
export const ChristmasFairyLightsGarland: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute -top-2 inset-x-0 h-4 pointer-events-none select-none overflow-hidden z-25 flex items-center justify-between px-2 ${className}`}>
      {/* Cable */}
      <div className="absolute inset-x-1 top-1.5 h-[1.5px] bg-emerald-900/60 rounded-full" />
      
      {/* Luces de colores alternados con pulsación independiente */}
      <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse relative z-10" style={{ animationDuration: '1.2s' }} />
      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse relative z-10" style={{ animationDuration: '0.9s', animationDelay: '0.2s' }} />
      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse relative z-10" style={{ animationDuration: '1.5s', animationDelay: '0.4s' }} />
      <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#3b82f6] animate-pulse relative z-10" style={{ animationDuration: '1.1s', animationDelay: '0.1s' }} />
      <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_#ec4899] animate-pulse relative z-10" style={{ animationDuration: '1.3s', animationDelay: '0.5s' }} />
      <span className="w-2 h-2 rounded-full bg-yellow-300 shadow-[0_0_8px_#eab308] animate-pulse relative z-10" style={{ animationDuration: '0.8s', animationDelay: '0.3s' }} />
    </div>
  );
};

/**
 * Contenedor inteligente que envuelve el logotipo y le adhiere la vestimenta temática
 */
export const SeasonalLogoWrapper: React.FC<{
  themeId: SeasonalThemeId;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showGarland?: boolean;
  className?: string;
  glowEnabled?: boolean;
}> = ({
  themeId,
  children,
  size = 'md',
  showGarland = true,
  className = '',
  glowEnabled = true
}) => {
  const currentDef = SEASONAL_THEMES.find(t => t.id === themeId) || SEASONAL_THEMES[1];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Festive Garland for Christmas */}
      {themeId === 'navidad-fin-ano' && showGarland && (
        <ChristmasFairyLightsGarland />
      )}

      {/* Main Logo Container */}
      <div 
        style={{
          boxShadow: glowEnabled && themeId !== 'standard-light' 
            ? `0 0 18px ${currentDef.glowColor}55, 0 0 35px ${currentDef.glowColor}22` 
            : 'none'
        }}
        className="relative transition-all duration-300 rounded-2xl"
      >
        {children}

        {/* Holiday Ornaments on Top of Logo */}
        {themeId === 'navidad-fin-ano' && <SantaHatOrnament size={size} />}
        {themeId === 'halloween' && <WitchHatOrnament size={size} />}
        {themeId === 'san-valentin' && <HeartsOrnament size={size} />}
        {themeId === 'madre' && <MotherFlowerOrnament size={size} />}
        {themeId === 'amor-amistad' && <FriendshipRibbonOrnament size={size} />}
        {themeId === 'standard-cyber' && <CyberHudOrnament size={size} />}
      </div>
    </div>
  );
};
