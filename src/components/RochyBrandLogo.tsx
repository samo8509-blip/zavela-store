import React from 'react';

interface RochyBrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
}

export const RochyBrandLogo: React.FC<RochyBrandLogoProps> = ({
  size = 'md',
  className = '',
  showSubtitle = true,
}) => {
  const sizeDimensions = {
    xs: { outer: 'w-10 h-10', rhText: 'text-[14px]', rochyText: 'text-[9px]', subText: 'text-[5.5px]', py: 'p-1' },
    sm: { outer: 'w-14 h-14', rhText: 'text-[18px]', rochyText: 'text-[11px]', subText: 'text-[6.5px]', py: 'p-1.5' },
    md: { outer: 'w-20 h-20', rhText: 'text-[26px]', rochyText: 'text-[14px]', subText: 'text-[8px]', py: 'p-2' },
    lg: { outer: 'w-28 h-28', rhText: 'text-[36px]', rochyText: 'text-[18px]', subText: 'text-[9px]', py: 'p-3' },
    xl: { outer: 'w-36 h-36', rhText: 'text-[44px]', rochyText: 'text-[22px]', subText: 'text-[10px]', py: 'p-4' },
  };

  const currentSize = sizeDimensions[size];

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      {/* Outer Circular Emblem with Metallic Gold/Bronze Rim and Luxury Dark Radial Background */}
      <div 
        className={`${currentSize.outer} rounded-full relative p-[2px] shadow-2xl flex items-center justify-center transition-transform hover:scale-105`}
        style={{
          background: 'linear-gradient(145deg, #ECC880 0%, #A67C33 35%, #594017 65%, #ECC880 100%)',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 235, 180, 0.4)'
        }}
      >
        {/* Inner Dark Matte Circle with Subtle Satin Sheen */}
        <div 
          className={`w-full h-full rounded-full flex flex-col items-center justify-center text-center relative overflow-hidden ${currentSize.py}`}
          style={{
            background: 'radial-gradient(circle at 40% 30%, #2A2621 0%, #151310 50%, #0A0907 100%)',
          }}
        >
          {/* Subtle Metallic Highlight Arc */}
          <div 
            className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,230,170,0.8) 0%, transparent 60%)'
            }}
          />

          {/* Script / Calligraphic Monogram: Rh */}
          <div 
            className={`font-serif italic font-normal tracking-tight leading-none text-transparent bg-clip-text drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] ${currentSize.rhText}`}
            style={{
              fontFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
              backgroundImage: 'linear-gradient(180deg, #FDF4DE 0%, #E8CA85 45%, #C29648 100%)',
              letterSpacing: '-0.03em',
              transform: 'scaleY(1.05)'
            }}
          >
            <span className="relative">
              <span className="font-serif">R</span>
              <span className="italic -ml-0.5" style={{ fontFamily: 'Georgia, serif' }}>h</span>
            </span>
          </div>

          {/* Serif Brand Name: Rochy */}
          <div 
            className={`font-serif font-medium tracking-wide mt-0.5 text-transparent bg-clip-text ${currentSize.rochyText}`}
            style={{
              fontFamily: '"Playfair Display", "Cinzel", "Cormorant Garamond", serif',
              backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #E7CCA0 60%, #B88B42 100%)',
              letterSpacing: '0.04em'
            }}
          >
            Rochy
          </div>

          {/* Subtitle: DISEÑADORA DE MARCA */}
          {showSubtitle && (
            <div 
              className={`font-sans font-semibold tracking-[0.18em] uppercase mt-0.5 text-transparent bg-clip-text opacity-90 ${currentSize.subText}`}
              style={{
                backgroundImage: 'linear-gradient(180deg, #EAD6B8 0%, #C4A575 100%)',
                fontSize: size === 'xs' ? '5px' : undefined
              }}
            >
              DISEÑADORA DE MARCA
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
