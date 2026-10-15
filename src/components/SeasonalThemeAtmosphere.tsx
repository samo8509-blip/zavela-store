import React, { useMemo } from 'react';
import { SeasonalThemeId, SEASONAL_THEMES } from '../utils/seasonalThemes.ts';

interface SeasonalThemeAtmosphereProps {
  themeId: SeasonalThemeId;
  enabled?: boolean;
}

interface Particle {
  id: number;
  left: number; // percentage 0 - 100
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  opacity: number;
  content: string;
  type: 'emoji' | 'circle' | 'sparkle';
  color?: string;
}

export const SeasonalThemeAtmosphere: React.FC<SeasonalThemeAtmosphereProps> = ({
  themeId,
  enabled = true
}) => {
  // Generate stable particle configuration based on theme
  const particles = useMemo<Particle[]>(() => {
    if (!enabled || themeId === 'standard-light') return [];

    const list: Particle[] = [];
    const count = 18; // Balanced number for high aesthetics and zero lag

    for (let i = 0; i < count; i++) {
      const left = (i * 5.5 + (i % 3) * 3) % 96 + 2;
      const duration = 7 + (i % 5) * 2;
      const delay = (i * 0.8) % 6;
      const opacity = 0.35 + ((i % 4) * 0.15);

      if (themeId === 'navidad-fin-ano') {
        const snowflakeChars = ['❄', '❅', '•', '✨', '•'];
        const content = snowflakeChars[i % snowflakeChars.length];
        list.push({
          id: i,
          left,
          size: content === '•' ? 6 : 14 + (i % 3) * 4,
          duration: duration + 2,
          delay,
          opacity,
          content,
          type: content === '•' ? 'circle' : 'emoji',
          color: '#ffffff'
        });
      } else if (themeId === 'halloween') {
        const spookyChars = ['🦇', '🎃', '✨', '•', '🦇'];
        const content = spookyChars[i % spookyChars.length];
        list.push({
          id: i,
          left,
          size: content === '•' ? 5 : 13 + (i % 3) * 4,
          duration: duration + 1,
          delay,
          opacity: opacity * 0.9,
          content,
          type: content === '•' ? 'circle' : 'emoji',
          color: '#f97316'
        });
      } else if (themeId === 'san-valentin') {
        const heartChars = ['💖', '💕', '✨', '•', '🌸'];
        const content = heartChars[i % heartChars.length];
        list.push({
          id: i,
          left,
          size: content === '•' ? 5 : 13 + (i % 3) * 4,
          duration: duration + 1.5,
          delay,
          opacity,
          content,
          type: content === '•' ? 'circle' : 'emoji',
          color: '#f43f5e'
        });
      } else if (themeId === 'madre') {
        const motherChars = ['🌸', '🌺', '✨', '•', '🌷'];
        const content = motherChars[i % motherChars.length];
        list.push({
          id: i,
          left,
          size: content === '•' ? 5 : 14 + (i % 3) * 3,
          duration: duration + 2,
          delay,
          opacity,
          content,
          type: content === '•' ? 'circle' : 'emoji',
          color: '#f472b6'
        });
      } else if (themeId === 'amor-amistad') {
        const friendshipChars = ['❤️', '✨', '🌟', '•', '🎁'];
        const content = friendshipChars[i % friendshipChars.length];
        list.push({
          id: i,
          left,
          size: content === '•' ? 5 : 13 + (i % 3) * 4,
          duration: duration + 1.5,
          delay,
          opacity,
          content,
          type: content === '•' ? 'circle' : 'emoji',
          color: '#ef4444'
        });
      } else if (themeId === 'standard-cyber') {
        // High-tech subtle cyan glowing nodes
        list.push({
          id: i,
          left,
          size: (i % 3 === 0) ? 11 : 4,
          duration: duration - 1,
          delay,
          opacity: 0.35 + ((i % 3) * 0.15),
          content: (i % 3 === 0) ? '✨' : '',
          type: (i % 3 === 0) ? 'emoji' : 'circle',
          color: '#06b6d4'
        });
      }
    }

    return list;
  }, [themeId, enabled]);

  if (!enabled || particles.length === 0) {
    return null;
  }

  const isDriftingDown = themeId === 'navidad-fin-ano' || themeId === 'madre';

  return (
    <div 
      aria-hidden="true" 
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none"
    >
      <style>{`
        @keyframes seasonalFloatUp {
          0% {
            transform: translateY(105vh) translateX(0px) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: var(--p-opacity, 0.7);
          }
          85% {
            opacity: var(--p-opacity, 0.7);
          }
          100% {
            transform: translateY(-10vh) translateX(25px) rotate(45deg);
            opacity: 0;
          }
        }
        @keyframes seasonalFallDown {
          0% {
            transform: translateY(-10vh) translateX(0px) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: var(--p-opacity, 0.7);
          }
          85% {
            opacity: var(--p-opacity, 0.7);
          }
          100% {
            transform: translateY(105vh) translateX(-25px) rotate(70deg);
            opacity: 0;
          }
        }
      `}</style>

      {particles.map((p) => {
        const animName = isDriftingDown ? 'seasonalFallDown' : 'seasonalFloatUp';
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
              animation: `${animName} ${p.duration}s infinite linear`,
              animationDelay: `${p.delay}s`,
              ['--p-opacity' as any]: p.opacity,
              willChange: 'transform, opacity'
            }}
          >
            {p.type === 'circle' ? (
              <span 
                style={{ 
                  backgroundColor: p.color, 
                  width: `${p.size}px`, 
                  height: `${p.size}px`,
                  boxShadow: `0 0 8px ${p.color}` 
                }}
                className="block rounded-full" 
              />
            ) : (
              <span className="drop-shadow-xs">{p.content}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
