import React from 'react';
import { 
  ShieldCheck, 
  Truck, 
  Lock, 
  Building2, 
  LayoutDashboard,
  Sparkles
} from 'lucide-react';
import { ZavelaLogo } from './ZavelaLogo.tsx';
import { SergioMartinezSignature } from './SergioMartinezSignature.tsx';

interface FooterProps {
  onOpenTracking: () => void;
  onGoHome?: () => void;
  onToggleAdmin?: () => void;
  showSecretLogin?: boolean;
  onOpenAuthorCertificate?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenTracking,
  onGoHome,
  onToggleAdmin,
  showSecretLogin = false,
  onOpenAuthorCertificate
}) => {
  return (
    <footer id="main-store-footer" className="bg-white text-slate-700 border-t border-slate-200 text-xs">
      
      {/* Value Badges Banner */}
      <div className="border-b border-slate-200 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
          
          <div className="flex items-center sm:items-start gap-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Pago Contra Entrega</h4>
              <p className="text-slate-600 text-[11px] mt-0.5">Pagas en efectivo únicamente cuando recibes tu paquete en casa.</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Despachos Nacionales</h4>
              <p className="text-slate-600 text-[11px] mt-0.5">Envíos rápidos desde bodegas principales en Colombia.</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Garantía 30 Días</h4>
              <p className="text-slate-600 text-[11px] mt-0.5">Garantía oficial por cualquier defecto de fabricación.</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-[#FF5A36] flex items-center justify-center shrink-0 shadow-2xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Transportadoras Top</h4>
              <p className="text-slate-600 text-[11px] mt-0.5">Servientrega, Coordinadora, Envía, Interrapidísimo y TCC.</p>
            </div>
          </div>

        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-3">
            {onGoHome ? (
              <button 
                id="footer-logo-btn"
                onClick={onGoHome} 
                className="text-left cursor-pointer transition-opacity hover:opacity-85 focus:outline-none"
                aria-label="Ir al inicio de Zavela Store"
              >
                <ZavelaLogo size="sm" showSlogan={true} />
              </button>
            ) : (
              <ZavelaLogo size="sm" showSlogan={true} />
            )}

            <p className="text-slate-600 text-xs leading-relaxed mt-2">
              Tienda online de productos de tendencia con cobertura nacional y pago seguro contra entrega en Colombia.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-mono border border-emerald-200 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-xs" />
                TIENDA OFICIAL ZAVELA STORE
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 font-mono">
              Atención al Cliente
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={onOpenTracking} className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer flex items-center gap-1.5 font-medium">
                  <span className="text-sky-600 font-bold">›</span> Rastrear mi Pedido
                </button>
              </li>
              {showSecretLogin && onToggleAdmin && (
                <li>
                  <button onClick={onToggleAdmin} className="text-sky-600 hover:text-sky-700 transition-colors cursor-pointer flex items-center gap-1.5 font-semibold animate-in fade-in">
                    <span className="text-sky-600 font-bold">›</span> Ingreso / Panel de Control [↑↓↑↑ 1985]
                  </button>
                </li>
              )}
              <li>
                <span className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">›</span> Términos de Garantía y Devolución
                </span>
              </li>
              <li>
                <span className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5">
                  <span className="text-sky-600 font-bold">›</span> Preguntas Frecuentes (FAQ)
                </span>
              </li>
              <li>
                <span className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">›</span> Cobertura Nacional Contra Entrega
                </span>
              </li>
            </ul>
          </div>

          {/* Logistics Partners */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 font-mono">
              Transportadoras Aliadas
            </h4>
            <p className="text-slate-600 text-xs mb-2">
              Despachos seguros en todo el país con:
            </p>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono font-bold text-slate-700">
              <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-slate-800">Servientrega</span>
              <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-slate-800">Coordinadora</span>
              <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-slate-800">Interrapidísimo</span>
              <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-slate-800">Envía</span>
              <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-slate-800">TCC</span>
            </div>
          </div>

          {/* Seguridad y Pagos */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 font-mono">
              Compra Segura
            </h4>
            <p className="text-slate-600 text-xs mb-3 leading-relaxed">
              En ZAVELA STORE todos tus pedidos cuentan con verificación directa de guía y pago contra entrega en efectivo.
            </p>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-[11px] font-bold text-emerald-900">Garantía Directa en Colombia</span>
            </div>
          </div>

        </div>

        {/* Author Signature & Creative Authorship Section (SM Studio Bogotá) */}
        <div id="footer-author-signature-section" className="mt-10 pt-8 border-t-2 border-slate-300">
          <div className="bg-gradient-to-r from-[#070D1F] via-[#0E1838] to-[#070D1F] text-white rounded-3xl p-6 sm:p-7 border-2 border-cyan-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
            {/* Subtle atmospheric glow effects */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Left: Author Signature with High Contrast Monogram (SM DISEÑO Y ARTE - CREANDO VISIONES.) */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-start relative z-10">
              <SergioMartinezSignature 
                variant="minimal" 
                dark={true}
                onClickCertificate={onOpenAuthorCertificate} 
              />
            </div>

            {/* Center Label for Visual Balance */}
            <div className="hidden xl:flex flex-col items-center text-center px-6 border-x-2 border-cyan-500/30 relative z-10">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-mono font-black uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Autoría & Arquitectura Visual</span>
              </div>
              <span className="text-xs text-slate-200 font-bold mt-1 tracking-wide">
                Bogotá, Colombia • Colección Oficial Zavela Store
              </span>
            </div>

            {/* Right: Certificado de Autoría Card (SM Shield Seal - Bogotá, Colombia) */}
            <div className="w-full lg:w-auto max-w-sm relative z-10">
              <SergioMartinezSignature 
                variant="badge" 
                onClickCertificate={onOpenAuthorCertificate} 
              />
            </div>

          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[10px] uppercase tracking-wider font-mono">
          <span>© {new Date().getFullYear()} ZAVELA STORE • Descubre algo nuevo</span>
          <div className="flex items-center gap-2">
            <span>Tienda de Comercio Electrónico en Colombia</span>
            <span>•</span>
            <button 
              type="button" 
              onClick={onOpenAuthorCertificate}
              className="text-amber-700 hover:text-amber-900 transition-colors cursor-pointer font-bold"
            >
              Firma de Diseño: SM Studio (Bogotá)
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
