import React from 'react';
import { 
  ShieldCheck, 
  Truck, 
  CheckCircle2, 
  Lock, 
  MapPin, 
  Scale, 
  PhoneCall, 
  FileText, 
  RotateCcw,
  Sparkles,
  Award
} from 'lucide-react';

export const ColombiaTrustGuaranteesBar: React.FC = () => {
  return (
    <section id="colombia-trust-guarantees-bar" className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Garantía de Confianza & Cero Riesgo en Colombia
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Compre con total tranquilidad: <strong>no paga nada por anticipado</strong>. Verificas al recibir con transportadora oficial.
          </p>
        </div>

        {/* Legal & NIT Badge */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 shrink-0">
          <Scale className="w-4 h-4 text-sky-600" />
          <div className="text-[10px] font-mono leading-tight">
            <span className="text-slate-500 block">Comercio Legal • Colombia</span>
            <span className="text-slate-800 font-bold">NIT 901.482.193-4 • Vigilado SIC</span>
          </div>
        </div>
      </div>

      {/* 4 Pillars of Guaranteed Trust */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
        
        {/* 1. Pago Contra Entrega */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
              100% Pago Contra Entrega
            </h4>
            <p className="text-[11px] text-emerald-900 leading-snug">
              Pagas en <strong>efectivo al cartero</strong> únicamente cuando el paquete llega a la puerta de tu casa o trabajo.
            </p>
          </div>
        </div>

        {/* 2. Transportadoras Oficiales */}
        <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-300 text-sky-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-sky-950 uppercase tracking-wider">
              Transportadoras Aliadas
            </h4>
            <p className="text-[11px] text-sky-900 leading-snug">
              Despachos asegurados con <strong>Servientrega, Coordinadora, Inter Rapidísimo, Envía y TCC</strong> con número de guía en vivo.
            </p>
          </div>
        </div>

        {/* 3. Garantía Directa de 30 Días */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
              Garantía de 30 Días
            </h4>
            <p className="text-[11px] text-amber-900 leading-snug">
              Cambio inmediato por defectos de fábrica o satisfacción garantizada con soporte directo por WhatsApp.
            </p>
          </div>
        </div>

        {/* 4. Productos Originales y Verificados */}
        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-300 text-purple-800 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
              Calidad Comprobada
            </h4>
            <p className="text-[11px] text-purple-900 leading-snug">
              Cada unidad es inspeccionada y probada antes del empaque para asegurar su óptimo funcionamiento.
            </p>
          </div>
        </div>

      </div>

      {/* Transport Carrier Badges Row */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-[11px] font-bold text-slate-500 font-mono">
          🚚 Envíos diarios a los 32 departamentos de Colombia mediante:
        </span>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold text-slate-700">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">📦 SERVIENTREGA</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">📦 COORDINADORA</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">📦 INTER RAPIDÍSIMO</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">📦 ENVÍA</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">📦 TCC</span>
        </div>
      </div>
    </section>
  );
};
