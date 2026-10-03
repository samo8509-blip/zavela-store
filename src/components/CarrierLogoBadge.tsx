import React from 'react';
import { ColombianCarrierName, COLOMBIAN_CARRIERS_META } from '../utils/colombianCarriers.ts';

interface CarrierLogoBadgeProps {
  carrier: ColombianCarrierName | string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const CarrierLogoBadge: React.FC<CarrierLogoBadgeProps> = ({
  carrier,
  size = 'md',
  showTagline = true
}) => {
  const normCarrier = (carrier || '').toLowerCase();
  
  // 1. SERVIENTREGA
  if (normCarrier.includes('servientrega')) {
    return (
      <div className="inline-flex items-center gap-2.5">
        <div className={`rounded-xl bg-[#00873E] text-white flex items-center justify-center font-black shadow-xs border border-[#006A30] shrink-0 ${
          size === 'sm' ? 'w-8 h-8 text-[10px]' : size === 'lg' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs'
        }`}>
          <div className="text-center leading-none">
            <span className="block font-black text-amber-300 tracking-tighter text-[11px]">S</span>
            <span className="block text-[7px] text-white font-mono">24H</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-[#00873E] uppercase font-sans ${
              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
            }`}>
              SERVIENTREGA
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-300">
              Oficial COD
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] text-slate-500 font-medium block">
              Centro de Soluciones • Entrega Total
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. COORDINADORA
  if (normCarrier.includes('coordinadora')) {
    return (
      <div className="inline-flex items-center gap-2.5">
        <div className={`rounded-xl bg-[#002F6C] text-white flex items-center justify-center font-black shadow-xs border border-[#001D45] shrink-0 ${
          size === 'sm' ? 'w-8 h-8 text-[10px]' : size === 'lg' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs'
        }`}>
          <div className="flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#D00000] rotate-45 border border-white/80" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-[#002F6C] uppercase font-sans ${
              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
            }`}>
              COORDINADORA
            </span>
            <span className="bg-blue-100 text-blue-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-blue-300">
              Red Nacional
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] text-slate-500 font-medium block">
              Llegamos a tiempo • Mercantil
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. INTER RAPIDÍSIMO
  if (normCarrier.includes('inter') || normCarrier.includes('rapidisimo')) {
    return (
      <div className="inline-flex items-center gap-2.5">
        <div className={`rounded-xl bg-gradient-to-br from-[#FF6600] to-[#E55500] text-white flex items-center justify-center font-black shadow-xs border border-orange-600 shrink-0 ${
          size === 'sm' ? 'w-8 h-8 text-[10px]' : size === 'lg' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs'
        }`}>
          <span className="text-white font-black text-xs font-mono tracking-tighter">⚡IR</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-[#003399] uppercase font-sans ${
              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
            }`}>
              INTER RAPIDÍSIMO
            </span>
            <span className="bg-orange-100 text-orange-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-orange-300">
              100% Colombia
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] text-slate-500 font-medium block">
              Entrega segura en todo el país
            </span>
          )}
        </div>
      </div>
    );
  }

  // 4. ENVÍA (COLVANES)
  if (normCarrier.includes('envia') || normCarrier.includes('colvanes')) {
    return (
      <div className="inline-flex items-center gap-2.5">
        <div className={`rounded-xl bg-[#FF5900] text-white flex items-center justify-center font-black shadow-xs border border-orange-700 shrink-0 ${
          size === 'sm' ? 'w-8 h-8 text-[10px]' : size === 'lg' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs'
        }`}>
          <span className="text-white font-black italic text-xs font-sans">envía</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-[#FF5900] uppercase font-sans ${
              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
            }`}>
              ENVÍA
            </span>
            <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-300">
              Colvanes
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] text-slate-500 font-medium block">
              Pasión por lo que hacemos
            </span>
          )}
        </div>
      </div>
    );
  }

  // Fallback genérico
  return (
    <div className="inline-flex items-center gap-2 text-slate-800 font-bold text-xs">
      <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
      <span>{carrier || 'Transportadora Nacional'}</span>
    </div>
  );
};
