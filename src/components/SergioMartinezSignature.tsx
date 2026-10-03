import React from 'react';
import { Star, Award, CheckCircle2, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';

interface SignatureProps {
  variant?: 'full' | 'compact' | 'badge' | 'banner' | 'stamp' | 'minimal';
  className?: string;
  onClickCertificate?: () => void;
  dark?: boolean;
}

/**
 * High-fidelity Vector Icon of the Creative Sergio Martinez Pen-Nib 'M' Monogram
 */
export const SergioMartinezLogoIcon: React.FC<{ className?: string; size?: number }> = ({ 
  className = '', 
  size = 36 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="SM Logo Creativo"
    >
      <defs>
        {/* Teal gradient for the left stem */}
        <linearGradient id="smNewTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>
        {/* Magenta / Pink gradient for the right stem */}
        <linearGradient id="smNewMagentaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E11D48" />
          <stop offset="50%" stopColor="#BE185D" />
          <stop offset="100%" stopColor="#9D174D" />
        </linearGradient>
      </defs>

      {/* Stylized Pen Nib on top */}
      <path 
        d="M50 8 L65 30 L59 40 L41 40 L35 30 Z" 
        stroke="#0F172A" 
        strokeWidth="4" 
        strokeLinejoin="round" 
        fill="#FFFFFF"
      />
      {/* Pen nib slit & center breather hole */}
      <line x1="50" y1="8" x2="50" y2="28" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="50" cy="30" r="3.5" fill="#0F172A" />

      {/* Stylized 'M' Left Branch (Teal / Dark Cyan) */}
      <path 
        d="M26 82 C22 82 20 78 20 72 L20 48 C20 42 24 38 30 38 C35 38 38 41 42 47 L50 60 L50 68 L42 54 L32 50 L32 72 C32 78 30 82 26 82 Z" 
        fill="url(#smNewTealGrad)"
      />

      {/* Stylized 'M' Right Branch (Magenta / Ruby Pink) */}
      <path 
        d="M74 82 C78 82 80 78 80 72 L80 48 C80 42 76 38 70 38 C65 38 62 41 58 47 L50 60 L50 68 L58 54 L68 50 L68 72 C68 78 70 82 74 82 Z" 
        fill="url(#smNewMagentaGrad)"
      />

      {/* Central stylized connection bridge */}
      <path 
        d="M38 52 L50 68 L62 52 L56 46 L50 54 L44 46 Z" 
        fill="#BE185D" 
        opacity="0.9"
      />
    </svg>
  );
};

/**
 * SM Shield Seal Crest Vector Icon (As shown in mockup: Shield with SM and 4 sparkles)
 */
export const SMShieldSealIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 40
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 60 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="SM Shield Seal"
    >
      {/* Outer Golden/Slate Shield */}
      <path 
        d="M30 6 C42 6 48 10 48 20 C48 37 36 49 30 54 C24 49 12 37 12 20 C12 10 18 6 30 6 Z" 
        stroke="#1E293B" 
        strokeWidth="2.5" 
        fill="#FFFFFF"
      />
      {/* Inner Decorative Double Border */}
      <path 
        d="M30 10 C39 10 44 13 44 21 C44 34 35 44 30 48 C25 44 16 34 16 21 C16 13 21 10 30 10 Z" 
        stroke="#D97706" 
        strokeWidth="1.2" 
        strokeDasharray="2 1.5"
        fill="none"
      />
      {/* Serif "SM" in Center */}
      <text 
        x="30" 
        y="33" 
        fontFamily="Georgia, serif" 
        fontSize="17" 
        fontWeight="bold" 
        fill="#0F172A" 
        textAnchor="middle"
        letterSpacing="0.5"
      >
        SM
      </text>

      {/* Sparkle Stars around the Shield */}
      {/* Top right orange star */}
      <path d="M49 6 L50.5 10 L54.5 11.5 L50.5 13 L49 17 L47.5 13 L43.5 11.5 L47.5 10 Z" fill="#F59E0B" />
      {/* Top left mini star */}
      <path d="M10 14 L11 16.5 L13.5 17.5 L11 18.5 L10 21 L9 18.5 L6.5 17.5 L9 16.5 Z" fill="#D97706" />
      {/* Bottom right mini star */}
      <path d="M48 42 L49 44 L51 45 L49 46 L48 48 L47 46 L45 45 L47 44 Z" fill="#F59E0B" />
      {/* Bottom center star */}
      <path d="M30 52 L31 54 L33 55 L31 56 L30 58 L29 56 L27 55 L29 54 Z" fill="#D97706" />
    </svg>
  );
};

export const SergioMartinezSignature: React.FC<SignatureProps> = ({
  variant = 'full',
  className = '',
  onClickCertificate,
  dark = true
}) => {
  // 1. Badge Variant (White card shown in mockup: "CERTIFICADO DE AUTORÍA - DISEÑO ORIGINAL POR SM STUDIO - BOGOTÁ, COLOMBIA")
  if (variant === 'badge') {
    return (
      <div 
        id="sm-author-certificate-badge"
        onClick={onClickCertificate}
        className={`group bg-white text-slate-950 rounded-2xl p-3.5 sm:p-4 border-2 border-slate-300 shadow-xl hover:shadow-2xl hover:border-amber-500 transition-all duration-300 flex items-center gap-3.5 cursor-pointer relative overflow-hidden ${className}`}
        title="Ver Certificado de Autoría Original - SM Studio (Bogotá, Colombia)"
      >
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-200/50 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

        {/* Shield Crest Monogram Logo */}
        <div className="relative shrink-0 flex items-center justify-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-xs group-hover:scale-105 transition-transform">
          <SMShieldSealIcon size={46} />
        </div>

        {/* Text Details Matching the Mockup Exact Format with High Contrast */}
        <div className="min-w-0 flex flex-col justify-center">
          <span className="text-xs font-black uppercase tracking-wider text-slate-950 font-sans leading-tight">
            CERTIFICADO DE AUTORÍA
          </span>
          <span className="text-[10px] text-slate-700 font-extrabold uppercase tracking-tight mt-0.5">
            DISEÑO ORIGINAL
          </span>
          <span className="text-[11px] text-slate-950 font-black uppercase tracking-tight">
            POR SM STUDIO
          </span>
          <span className="text-[10px] text-amber-700 font-black uppercase tracking-wider mt-0.5 font-mono">
            BOGOTÁ, COLOMBIA
          </span>
        </div>

        {/* Action badge */}
        <div className="ml-auto pl-1 shrink-0">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center transition-colors shadow-md">
            <Award className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Minimalist / Footer Left Variant (As shown in mockup: "SM DISEÑO Y ARTE / CREANDO VISIONES.")
  if (variant === 'minimal') {
    const isDark = dark !== false;
    return (
      <div 
        id="sm-author-minimal-signature"
        onClick={onClickCertificate}
        className={`group flex items-center gap-3.5 cursor-pointer select-none transition-all p-2 rounded-2xl ${
          isDark 
            ? 'bg-slate-900/90 border border-slate-700/90 hover:border-amber-400 shadow-md' 
            : 'bg-white border-2 border-slate-300 hover:border-amber-500 shadow-sm'
        } ${className}`}
        title="SM DISEÑO Y ARTE • Creando Visiones. Hacer clic para ver Certificado"
      >
        {/* Left Monogram Logo */}
        <div className="relative shrink-0 p-1.5 bg-slate-950 rounded-xl border border-slate-700 shadow-md group-hover:border-cyan-400 transition-all group-hover:scale-105">
          <SergioMartinezLogoIcon size={38} />
        </div>

        {/* Brand Text */}
        <div className="flex flex-col items-start text-left pr-2">
          <div className="flex items-center gap-2.5">
            <span className={`font-serif font-black text-2xl sm:text-3xl tracking-tight leading-none transition-colors ${
              isDark 
                ? 'text-white group-hover:text-cyan-400' 
                : 'text-slate-950 group-hover:text-cyan-600'
            }`}>
              SM
            </span>
            <div className={`flex flex-col justify-center text-left leading-tight border-l-2 pl-2.5 ${
              isDark ? 'border-amber-500/80' : 'border-slate-800'
            }`}>
              <span className={`text-xs font-black uppercase tracking-widest font-sans ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}>
                DISEÑO
              </span>
              <span className={`text-xs font-black uppercase tracking-widest font-sans -mt-0.5 ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}>
                Y ARTE
              </span>
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-black tracking-[0.25em] uppercase mt-1 font-sans flex items-center gap-1.5 text-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            <span>CREANDO VISIONES.</span>
          </span>
        </div>
      </div>
    );
  }

  // 3. Pattern Banner Variant (High-contrast artistic showcase with centered "SM" Monogram)
  if (variant === 'banner') {
    return (
      <div 
        id="author-creative-pattern-banner"
        onClick={onClickCertificate}
        className={`relative w-full rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 flex items-center justify-center cursor-pointer group ${className}`}
        title="Firma Creativa • SM Diseño y Arte"
      >
        {/* Artistic Memphis / Pop-Art Decorative Geometric Shapes Background */}
        <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
          <svg className="w-full h-full object-cover" viewBox="0 0 800 280" fill="none" preserveAspectRatio="xMidYMid slice">
            {/* Colorful organic shapes */}
            <circle cx="80" cy="60" r="45" fill="#E11D48" opacity="0.8" />
            <rect x="40" y="160" width="70" height="70" rx="20" fill="#0284C7" transform="rotate(25 40 160)" opacity="0.8" />
            <path d="M180 30 Q220 80 180 130 T180 230" stroke="#10B981" strokeWidth="24" strokeLinecap="round" opacity="0.7" fill="none" />
            
            <circle cx="700" cy="80" r="55" fill="#F59E0B" opacity="0.85" />
            <rect x="620" y="180" width="80" height="80" rx="24" fill="#8B5CF6" transform="rotate(-15 620 180)" opacity="0.75" />
            <path d="M720 140 Q760 190 720 240" stroke="#EC4899" strokeWidth="20" strokeLinecap="round" opacity="0.8" fill="none" />

            {/* Pattern Dots & Sprinkles */}
            <circle cx="300" cy="40" r="10" fill="#F43F5E" />
            <circle cx="500" cy="30" r="12" fill="#06B6D4" />
            <circle cx="280" cy="240" r="14" fill="#EAB308" />
            <circle cx="520" cy="250" r="11" fill="#10B981" />
          </svg>
        </div>

        {/* Central High-Contrast Clean Serif "SM" Overlay */}
        <div className="relative z-10 bg-slate-900/95 backdrop-blur-md rounded-2xl px-6 py-5 sm:px-10 sm:py-6 shadow-2xl border-2 border-slate-700 flex flex-col items-center justify-center text-center group-hover:scale-[1.02] group-hover:border-cyan-400 transition-all duration-300 max-w-lg w-full">
          <div className="flex items-center gap-3.5">
            <div className="p-1.5 bg-slate-950 rounded-xl border border-slate-800">
              <SergioMartinezLogoIcon size={38} />
            </div>
            <span className="font-serif font-black text-4xl sm:text-5xl text-white tracking-tight leading-none group-hover:text-cyan-400 transition-colors">
              SM
            </span>
            <div className="text-left border-l-2 border-slate-600 pl-3">
              <div className="font-sans font-black text-sm sm:text-base text-white tracking-widest">
                DISEÑO
              </div>
              <div className="font-sans font-black text-sm sm:text-base text-white tracking-widest -mt-1">
                Y ARTE
              </div>
            </div>
          </div>
          
          <div className="text-xs sm:text-sm font-black text-amber-400 tracking-[0.25em] uppercase mt-2.5 font-sans border-t border-slate-800 pt-2 w-full text-center drop-shadow-xs">
            CREANDO VISIONES.
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold text-cyan-300 bg-slate-950 border border-cyan-500/30 px-3.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>FIRMA CREATIVA DE AUTORÍA • SM STUDIO BOGOTÁ</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Stamp / Product Details Variant (Widget de Producto)
  if (variant === 'stamp') {
    return (
      <div 
        onClick={onClickCertificate}
        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0E1838] border border-[#2A3A60] hover:border-amber-400 shadow-sm transition-all cursor-pointer group ${className}`}
        title="Diseño original verificado por SM Studio (Bogotá, Colombia)"
      >
        <SMShieldSealIcon size={26} />
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-xs text-white group-hover:text-[#48CAE4] transition-colors">
              SM
            </span>
            <span className="text-[9px] font-sans font-bold text-slate-300 uppercase tracking-wider">
              DISEÑO Y ARTE
            </span>
          </div>
          <p className="text-[8.5px] text-amber-300 font-mono font-bold tracking-tight">
            CREANDO VISIONES • CERTIFICADO
          </p>
        </div>
      </div>
    );
  }

  // 5. Compact Variant
  if (variant === 'compact') {
    return (
      <div 
        onClick={onClickCertificate}
        className={`inline-flex items-center gap-2.5 cursor-pointer group ${className}`}
        title="SM DISEÑO Y ARTE - Creando Visiones"
      >
        <span className={`font-serif font-black text-xl leading-none ${dark ? 'text-white' : 'text-slate-950'} group-hover:text-cyan-400 transition-colors`}>
          SM
        </span>
        <div className="flex flex-col">
          <span className={`text-[10px] font-black uppercase tracking-wider ${dark ? 'text-slate-100' : 'text-slate-950'} font-sans leading-tight`}>
            DISEÑO Y ARTE
          </span>
          <span className={`text-[8.5px] font-extrabold ${dark ? 'text-amber-400' : 'text-amber-700'} uppercase tracking-widest font-mono`}>
            CREANDO VISIONES.
          </span>
        </div>
      </div>
    );
  }

  // 6. Default 'full' variant (TU FIRMA DE DISEÑO - As shown in top left of mockup)
  return (
    <div 
      id="author-full-signature-block"
      onClick={onClickCertificate}
      className={`group bg-slate-950 hover:bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl border-2 border-slate-800 shadow-xl transition-all duration-200 cursor-pointer flex items-center gap-4 ${className}`}
      title="Hacer clic para ver el Certificado Oficial de Autoría (SM Studio)"
    >
      {/* Stylized Pen-Nib + Monogram Icon */}
      <div className="relative shrink-0 p-1 bg-slate-900 rounded-xl border border-slate-700 shadow-sm">
        <SergioMartinezLogoIcon size={42} />
      </div>

      {/* Vertical Divider */}
      <div className="h-10 w-px bg-slate-700" />

      {/* SM Text & DISEÑO Y ARTE + CREANDO VISIONES */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-2">
          <span className="font-serif font-black text-2xl sm:text-3xl text-white tracking-tight leading-none group-hover:text-cyan-400 transition-colors">
            SM
          </span>
          <div className="flex flex-col justify-center leading-none">
            <span className="text-xs font-sans font-black text-white tracking-wider uppercase">
              DISEÑO
            </span>
            <span className="text-xs font-sans font-black text-white tracking-wider mt-0.5 uppercase">
              Y ARTE
            </span>
          </div>
        </div>
        <span className="text-[10px] sm:text-[11px] font-sans font-black text-amber-400 tracking-[0.25em] uppercase mt-1">
          CREANDO VISIONES.
        </span>
      </div>
    </div>
  );
};
