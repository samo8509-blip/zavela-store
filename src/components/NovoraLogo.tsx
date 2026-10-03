import React from 'react';

interface ZavelaLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon-only' | 'stacked';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSlogan?: boolean;
  showAnimatedCart?: boolean;
  theme?: 'dark' | 'light' | 'auto';
  animated?: boolean;
}

export const ZavelaLogo: React.FC<ZavelaLogoProps> = ({
  className = '',
  variant = 'compact',
  size = 'md',
  showSlogan = false,
  showAnimatedCart = true,
  theme = 'auto',
  animated = true
}) => {
  // Dimensions based on size scale
  const iconDimensions = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-12 h-12 sm:w-14 sm:h-14',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
    xl: 'w-24 h-24 sm:w-28 sm:h-28',
    '2xl': 'w-32 h-32 sm:w-40 sm:h-40'
  };

  const titleSizes = {
    xs: 'text-sm tracking-[0.14em]',
    sm: 'text-base sm:text-lg tracking-[0.16em]',
    md: 'text-lg sm:text-xl md:text-2xl tracking-[0.18em]',
    lg: 'text-2xl sm:text-3xl tracking-[0.2em]',
    xl: 'text-3xl sm:text-4xl tracking-[0.22em]',
    '2xl': 'text-4xl sm:text-5xl tracking-[0.24em]'
  };

  const sloganSizes = {
    xs: 'text-[7px] tracking-[0.22em]',
    sm: 'text-[8px] sm:text-[9px] tracking-[0.24em]',
    md: 'text-[9px] sm:text-[10px] tracking-[0.26em]',
    lg: 'text-[11px] sm:text-xs tracking-[0.28em]',
    xl: 'text-xs sm:text-sm tracking-[0.3em]',
    '2xl': 'text-sm sm:text-base tracking-[0.32em]'
  };

  // Cart travel distance based on size
  const cartTravelDistance = {
    xs: '95px',
    sm: '125px',
    md: '155px',
    lg: '200px',
    xl: '255px',
    '2xl': '320px'
  }[size] || '155px';

  // Shopping cart sizing scale
  const cartSizeClasses = {
    xs: 'w-5 h-5',
    sm: 'w-6 h-6 sm:w-6.5 sm:h-6.5',
    md: 'w-7 h-7 sm:w-8 sm:h-8',
    lg: 'w-9 h-9 sm:w-11 sm:h-11',
    xl: 'w-12 h-12 sm:w-14 sm:h-14',
    '2xl': 'w-16 h-16 sm:w-20 sm:h-20'
  }[size] || 'w-7 h-7 sm:w-8 sm:h-8';

  // Text color based on theme
  const textColorClass = 
    theme === 'light' 
      ? 'text-[#0A192F]' 
      : theme === 'dark' 
        ? 'text-white' 
        : 'text-white';

  const sloganColorClass = 
    theme === 'light' 
      ? 'text-slate-600' 
      : theme === 'dark' 
        ? 'text-slate-300' 
        : 'text-slate-300';

  /* 
   * High-Precision Vector Recreation of the Official ZAVELA Monogram
   * Matching the exact design in the brand image:
   * 1. Top-left speed bar with rounded corner
   * 2. Lower-left beveled speed bar
   * 3. Distinct Cyan top loop (`#00F2FE` -> `#00A3FF`)
   * 4. Central 3D diagonal tube with longitudinal lighting and bevels (`#00A3FF` -> `#3B82F6` -> `#7C3AED`)
   * 5. Lower-left purple loop curving along the bottom to the right with rounded tip (`#6366F1` -> `#9333EA` -> `#C084FC`)
   * 6. Inner angular chevron and forward logistics arrow pointing right (`#0077FF` -> `#2563EB`)
   */
  const LogoIcon = (
    <div 
      className={`relative ${iconDimensions[size]} shrink-0 flex items-center justify-center select-none group/logo ${
        animated ? 'transition-transform duration-300 group-hover:scale-105' : ''
      }`}
      title="Zavela Store Colombia - Descubre algo nuevo"
    >
      <svg 
        viewBox="0 0 280 240" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-[0_6px_20px_rgba(0,195,255,0.4)]"
      >
        <defs>
          {/* Cyan to Electric Sky Top Gradient */}
          <linearGradient id="zavelaGradTopCyan" x1="40" y1="30" x2="200" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F5FF" />
            <stop offset="40%" stopColor="#00D2FF" />
            <stop offset="80%" stopColor="#0099FF" />
            <stop offset="100%" stopColor="#0066FF" />
          </linearGradient>

          {/* Electric Blue to Indigo Diagonal Gradient */}
          <linearGradient id="zavelaGradDiag" x1="190" y1="50" x2="70" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="25%" stopColor="#0099FF" />
            <stop offset="55%" stopColor="#2563EB" />
            <stop offset="80%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          {/* Purple to Magenta Bottom Loop Gradient */}
          <linearGradient id="zavelaGradPurpleLoop" x1="60" y1="140" x2="210" y2="210" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="35%" stopColor="#7C3AED" />
            <stop offset="70%" stopColor="#9333EA" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>

          {/* Arrow Gradient */}
          <linearGradient id="zavelaGradArrow" x1="120" y1="120" x2="245" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0077FF" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>

          {/* Speed Bars Gradients */}
          <linearGradient id="zavelaSpeedTopGrad" x1="30" y1="50" x2="105" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F5FF" />
            <stop offset="100%" stopColor="#0099FF" />
          </linearGradient>
          
          <linearGradient id="zavelaSpeedBottomGrad" x1="15" y1="95" x2="75" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0088FF" />
            <stop offset="100%" stopColor="#0055FF" />
          </linearGradient>

          {/* Specular Bevel Overlay (White reflection streak) */}
          <linearGradient id="zavelaGleamTop" x1="70" y1="36" x2="200" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Specular Bevel for Lower Arm */}
          <linearGradient id="zavelaGleamBottom" x1="70" y1="180" x2="190" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* 3D Drop Shadow */}
          <filter id="zavelaDepthShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.35" />
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00F0FF" floodOpacity="0.25" />
          </filter>
        </defs>

        <g filter="url(#zavelaDepthShadow)">
          {/* ========================================================
              1. SPEED BARS ON THE LEFT
             ======================================================== */}
          {/* Upper Rounded Speed Bar */}
          <path
            d="M 62 46 C 50 46 42 54 42 66 L 42 66 C 42 78 50 86 62 86 L 100 86 C 96 74 96 58 100 46 Z"
            fill="url(#zavelaSpeedTopGrad)"
          />
          {/* Upper Speed Bar Specular */}
          <path
            d="M 62 49 C 52 49 45 56 45 66 C 45 58 52 51 62 51 L 96 51 L 98 49 Z"
            fill="#FFFFFF"
            opacity="0.6"
          />

          {/* Lower Speed Bar (Beveled Trapezoid) */}
          <polygon
            points="30,100 78,100 66,118 18,118"
            fill="url(#zavelaSpeedBottomGrad)"
          />
          <polygon
            points="31,102 76,102 73,105 28,105"
            fill="#FFFFFF"
            opacity="0.45"
          />

          {/* ========================================================
              2. TOP HORIZONTAL ARCH & OUTER UPPER-RIGHT CORNER OF 'Z'
             ======================================================== */}
          {/* Continuous Ribbon from Top-Left to Top-Right */}
          <path
            d="M 62 46 
               C 48 46 38 56 38 70 
               L 38 72 
               C 38 58 48 48 62 48 
               L 155 48 
               C 176 48 194 66 194 88 
               C 194 98 190 108 182 116 
               L 164 136 
               L 144 118 
               L 160 102 
               C 164 98 166 92 166 86 
               C 166 74 156 64 144 64 
               L 80 64 
               C 68 64 60 56 68 46 Z"
            fill="url(#zavelaGradTopCyan)"
          />

          {/* ========================================================
              3. MAIN 3D DIAGONAL RIBBON (DOWN-LEFT)
             ======================================================== */}
          <path
            d="M 194 84 
               C 194 96 188 108 178 118 
               L 92 204 
               C 80 216 60 216 48 202 
               C 36 188 38 168 52 154 
               L 138 68 
               C 146 60 156 56 166 56 
               L 182 56 
               C 190 64 194 74 194 84 Z"
            fill="url(#zavelaGradDiag)"
          />

          {/* Diagonal Central Ridge / Bevel Highlight */}
          <path
            d="M 180 72 
               L 98 154 
               C 92 160 88 168 84 176 
               L 82 170 
               C 86 162 92 154 98 148 
               L 174 72 Z"
            fill="#FFFFFF"
            opacity="0.3"
          />

          {/* ========================================================
              4. BOTTOM PURPLE-MAGENTA LOOP & TERMINATING CAP
             ======================================================== */}
          <path
            d="M 48 180 
               C 42 170 44 156 54 146 
               L 90 110 
               C 100 100 114 96 128 96 
               L 188 96 
               L 188 114 
               L 132 114 
               C 122 114 114 118 108 124 
               L 72 160 
               C 66 166 66 174 72 180 
               L 162 180 
               C 182 180 198 164 198 144 
               L 198 136 
               L 216 136 
               L 216 144 
               C 216 174 190 198 160 198 
               L 72 198 
               C 58 198 50 190 48 180 Z"
            fill="url(#zavelaGradPurpleLoop)"
          />

          {/* ========================================================
              5. INNER CHEVRON & FORWARD LOGISTICS ARROW (RIGHT)
             ======================================================== */}
          <g>
            {/* Inner Diagonal to Horizontal Arrow Shaft */}
            <path
              d="M 134 84 
                 L 86 142 
                 C 82 146 84 154 90 154 
                 L 196 154 
                 L 196 136 
                 L 118 136 
                 L 146 102 
                 L 134 84 Z"
              fill="url(#zavelaGradArrow)"
            />

            {/* 3D Arrow Head Pointing Right */}
            <path
              d="M 188 116 
                 L 236 145 
                 L 188 174 
                 L 198 145 Z"
              fill="url(#zavelaGradArrow)"
              stroke="#60A5FA"
              strokeWidth="1.5"
            />

            {/* Arrow Head Upper Facet Highlight */}
            <polygon
              points="188,116 236,145 198,145"
              fill="#93C5FD"
              opacity="0.6"
            />
          </g>

          {/* ========================================================
              6. SPECULAR BEVELS AND GLOSS STREAKS
             ======================================================== */}
          {/* Top arch gloss streak */}
          <path
            d="M 68 49 L 152 49 C 168 49 182 61 184 76 C 178 66 166 57 150 57 L 68 57 C 56 57 50 51 68 49 Z"
            fill="url(#zavelaGleamTop)"
          />
          {/* Bottom purple loop gloss */}
          <path
            d="M 72 196 L 160 196 C 182 196 196 182 198 164 C 194 176 180 188 158 188 L 72 188 Z"
            fill="url(#zavelaGleamBottom)"
          />
        </g>
      </svg>
    </div>
  );

  /*
   * 20-Second Animated Shopping Cart Component
   * Behavior:
   * 1. 0s - 7s (0% - 35%): Empty cart rests under the Z monogram.
   * 2. 7s - 10s (35% - 50%): Dynamic items (glowing neon packages) pop/drop into the cart.
   * 3. 10s - 15s (50% - 75%): Filled cart rolls smoothly across to the right towards the "O" of STORE.
   * 4. 15s - 18s (75% - 90%): Reaches the "O", delivers a celebratory sparkle pulse, and softly fades.
   * 5. 18s - 20s (90% - 100%): Seamlessly returns to start under the Z in empty state.
   */
  const AnimatedShoppingCart = (
    <div 
      className="absolute -bottom-3 sm:-bottom-3.5 left-0.5 sm:left-1 pointer-events-none select-none z-10"
      style={{
        // @ts-ignore
        '--cart-travel-dist': cartTravelDistance
      }}
    >
      <style>{`
        @keyframes cartMove20s {
          0%, 5% {
            transform: translateX(0px);
            opacity: 1;
          }
          35% {
            transform: translateX(0px);
            opacity: 1;
          }
          50% {
            transform: translateX(0px);
            opacity: 1;
          }
          75% {
            transform: translateX(var(--cart-travel-dist, 155px));
            opacity: 1;
          }
          85% {
            transform: translateX(var(--cart-travel-dist, 155px)) scale(1.12);
            opacity: 1;
          }
          92% {
            transform: translateX(calc(var(--cart-travel-dist, 155px) + 14px)) scale(0.85);
            opacity: 0;
          }
          98% {
            transform: translateX(0px);
            opacity: 0;
          }
          100% {
            transform: translateX(0px);
            opacity: 1;
          }
        }

        @keyframes cartItemsFill20s {
          0%, 34% {
            opacity: 0;
            transform: translateY(-8px) scale(0.3);
          }
          40% {
            opacity: 1;
            transform: translateY(0px) scale(1.18);
          }
          45% {
            transform: translateY(-2px) scale(0.95);
          }
          48%, 85% {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
          92%, 100% {
            opacity: 0;
            transform: scale(0.3);
          }
        }

        @keyframes cartWheelsSpin20s {
          0%, 50% {
            transform: rotate(0deg);
          }
          75% {
            transform: rotate(720deg);
          }
          85%, 100% {
            transform: rotate(720deg);
          }
        }

        @keyframes sparkPulse20s {
          0%, 74% {
            opacity: 0;
            transform: scale(0);
          }
          76%, 84% {
            opacity: 1;
            transform: scale(1.4);
          }
          90%, 100% {
            opacity: 0;
            transform: scale(0);
          }
        }
      `}</style>

      {/* Cart Container with 20s CSS animation loop */}
      <div 
        className="relative flex items-center"
        style={{
          animation: 'cartMove20s 20s cubic-bezier(0.4, 0, 0.2, 1) infinite'
        }}
      >
        <svg 
          viewBox="0 0 32 30" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className={`${cartSizeClasses} overflow-visible drop-shadow-[0_2px_10px_rgba(0,229,255,0.7)]`}
        >
          {/* Cart Wheels with 20s spin */}
          <g 
            style={{ 
              transformOrigin: '9px 24px',
              animation: 'cartWheelsSpin20s 20s linear infinite'
            }}
          >
            <circle cx="9" cy="24" r="3.2" fill="#00F0FF" />
            <circle cx="9" cy="24" r="1.4" fill="#0A1128" />
          </g>

          <g 
            style={{ 
              transformOrigin: '22px 24px',
              animation: 'cartWheelsSpin20s 20s linear infinite'
            }}
          >
            <circle cx="22" cy="24" r="3.2" fill="#C084FC" />
            <circle cx="22" cy="24" r="1.4" fill="#0A1128" />
          </g>

          {/* Cart Basket Mesh */}
          <path 
            d="M 2 4 L 6 4 L 9.5 17 L 24 17 L 27 7 L 8 7" 
            stroke="url(#zavelaCartGrad)" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M 12 7 L 14 17 M 17 7 L 18 17 M 22 7 L 22 17" 
            stroke="#00F5FF" 
            strokeWidth="1.2" 
            strokeOpacity="0.6"
          />

          {/* Cart Fill Items (Boxes & Parcels) appearing between 7s and 10s */}
          <g 
            style={{ 
              transformOrigin: '17px 11px',
              animation: 'cartItemsFill20s 20s cubic-bezier(0.34, 1.56, 0.64, 1) infinite'
            }}
          >
            {/* Box 1 (Cyan Neon Box) */}
            <rect x="9.5" y="7.5" width="6.5" height="6.5" rx="1.2" fill="#00F0FF" />
            <line x1="12.8" y1="7.5" x2="12.8" y2="14" stroke="#0066FF" strokeWidth="1" />
            
            {/* Box 2 (Violet Gift Box) */}
            <rect x="15.5" y="5.5" width="7.5" height="9" rx="1.4" fill="#A855F7" />
            <line x1="19.2" y1="5.5" x2="19.2" y2="14.5" stroke="#F472B6" strokeWidth="1" />

            {/* Sparkle top gift ribbon */}
            <circle cx="16" cy="3.5" r="1.8" fill="#FDE047" />
          </g>

          {/* Gradient definitions for cart */}
          <defs>
            <linearGradient id="zavelaCartGrad" x1="2" y1="4" x2="27" y2="17" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00F5FF" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
          </defs>
        </svg>

        {/* Celebration sparkle glow when reaching the 'O' */}
        <div 
          className="absolute -top-1.5 -right-2.5 w-3.5 h-3.5 text-yellow-300 pointer-events-none text-xs"
          style={{
            animation: 'sparkPulse20s 20s ease-out infinite'
          }}
        >
          ✨
        </div>
      </div>
    </div>
  );

  // 1. Icon Only variant
  if (variant === 'icon-only') {
    return (
      <div translate="no" className={`inline-flex items-center justify-center notranslate ${className}`}>
        {LogoIcon}
      </div>
    );
  }

  // 2. Stacked variant (Center hero, splash cards)
  if (variant === 'stacked') {
    return (
      <div translate="no" className={`inline-flex flex-col items-center text-center notranslate select-none relative ${className}`}>
        <div className="relative">
          {LogoIcon}
          {showAnimatedCart && AnimatedShoppingCart}
        </div>
        
        <div className="flex flex-col items-center mt-3 sm:mt-4 notranslate" translate="no">
          <span 
            translate="no" 
            className={`font-black font-sans leading-none tracking-[0.22em] ${textColorClass} ${titleSizes[size]} drop-shadow-sm`}
          >
            ZAVELA
          </span>
          <span 
            translate="no" 
            className={`font-extrabold font-sans leading-none tracking-[0.38em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 mt-1 sm:mt-1.5 ${sloganSizes[size]}`}
          >
            STORE
          </span>
          
          {(showSlogan) && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span translate="no" className={`font-bold tracking-[0.24em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-purple-300 ${sloganSizes[size]}`}>
                Descubre algo nuevo
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Compact / Full Horizontal variant (Header, Footer, Navbar)
  return (
    <div translate="no" className={`inline-flex items-center notranslate select-none relative ${className}`}>
      <div className="flex items-center gap-2.5 sm:gap-3.5 notranslate relative" translate="no">
        <div className="relative">
          {LogoIcon}
          {showAnimatedCart && AnimatedShoppingCart}
        </div>
        
        {/* Brand Text: ZAVELA STORE */}
        <div className="flex flex-col notranslate relative" translate="no">
          <div 
            translate="no" 
            className={`font-black font-sans leading-none flex items-center notranslate tracking-tight ${titleSizes[size]}`}
          >
            <span translate="no" className={`font-black tracking-[0.14em] ${textColorClass}`}>
              ZAVELA
            </span>
            <span 
              translate="no" 
              className="font-extrabold tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 ml-1.5 drop-shadow-[0_0_12px_rgba(0,240,255,0.45)]"
            >
              STORE
            </span>
          </div>

          {/* Slogan with matching Cyan & Indigo Palette */}
          {(showSlogan || variant === 'full') && (
            <div translate="no" className="flex items-center gap-1.5 mt-1 sm:mt-1.5 notranslate">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
              <span 
                translate="no" 
                className={`font-bold uppercase tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-purple-300 ${sloganSizes[size]}`}
              >
                Descubre algo nuevo
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Aliases for backwards compatibility
export const NovoraLogo = ZavelaLogo;
export const ZabelaLogo = ZavelaLogo;
export const MirixLogo = ZavelaLogo;
