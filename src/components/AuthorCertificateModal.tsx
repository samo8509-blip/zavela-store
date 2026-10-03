import React, { useState } from 'react';
import { 
  X, 
  Award, 
  CheckCircle2, 
  Star, 
  Sparkles, 
  ShieldCheck, 
  Copy, 
  Check, 
  Palette, 
  MapPin
} from 'lucide-react';
import { SergioMartinezLogoIcon, SMShieldSealIcon } from './SergioMartinezSignature.tsx';

interface AuthorCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthorCertificateModal: React.FC<AuthorCertificateModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const certificateId = "AUTH-SM-2026-BOG-99824";
  const issueLocation = "Bogotá, Colombia";
  const studioName = "SM STUDIO";
  const authorName = "Sergio Martínez (SM)";
  const slogan = "DISEÑO Y ARTE • CREANDO VISIONES.";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(certificateId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      id="author-certificate-modal-backdrop" 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="author-certificate-modal-dialog" 
        className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col relative border border-amber-300 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-amber-900 uppercase tracking-widest flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              Certificado Oficial de Autoría • SM Studio
            </span>
          </div>

          <button
            id="btn-close-cert-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Parchment Document Layout */}
        <div className="p-6 sm:p-10 bg-gradient-to-b from-amber-50/30 via-white to-slate-50 relative overflow-hidden">
          
          {/* Subtle decorative security watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none text-amber-900">
            <SMShieldSealIcon size={360} />
          </div>

          {/* Certificate Inner Frame */}
          <div className="border-2 border-dashed border-amber-300 rounded-2xl p-6 sm:p-8 bg-white/90 backdrop-blur-xs relative shadow-sm">
            
            {/* Top Certificate Brand Crest */}
            <div className="text-center flex flex-col items-center justify-center">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="p-3 bg-amber-50 rounded-2xl shadow-sm border border-amber-200">
                  <SMShieldSealIcon size={64} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-serif font-black text-3xl sm:text-4xl text-slate-950 tracking-tight">
                  SM
                </span>
                <div className="text-left border-l-2 border-slate-400 pl-2.5">
                  <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-widest font-sans block">
                    DISEÑO
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-widest font-sans block -mt-0.5">
                    Y ARTE
                  </span>
                </div>
              </div>

              <span className="text-xs sm:text-sm font-black text-amber-700 tracking-[0.25em] uppercase mt-1">
                CREANDO VISIONES.
              </span>
              
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>CERTIFICADO DE AUTORÍA • DISEÑO ORIGINAL</span>
              </div>
            </div>

            {/* Declaration Text */}
            <div className="my-6 space-y-3 text-center sm:text-left border-y border-slate-200 py-5">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                Se certifica y hace constar formalmente que el diseño visual, la arquitectura de interfaces, identidad y experiencia de usuario (UI/UX) de esta plataforma digital ha sido conceptualizado, diseñado y firmado de manera original por:
              </p>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-sans flex items-center gap-2">
                    <Palette className="w-5 h-5 text-amber-600" />
                    {studioName} / {authorName}
                  </h3>
                  <p className="text-xs text-sky-700 font-medium mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {issueLocation}
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-[11px] font-mono font-bold text-emerald-800">AUTORÍA CERTIFICADA</span>
                </div>
              </div>
            </div>

            {/* Certificate Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Código de Registro:</span>
                <span className="font-mono font-bold text-amber-800 text-[11px] truncate block mt-0.5">
                  {certificateId}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Estudio & Origen:</span>
                <span className="font-sans font-bold text-slate-900 text-[11px] block mt-0.5">
                  SM STUDIO ({issueLocation})
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Sello de Calidad:</span>
                <span className="font-sans font-bold text-sky-700 text-[11px] block mt-0.5">
                  Diseño y Arte Oficial
                </span>
              </div>
            </div>

            {/* Bottom Signature Seals */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-[11px] text-slate-600 font-sans">
                  Diseño original protegido • SM Studio Bogotá
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 border border-slate-200 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CÓDIGO COPIADO</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-600" />
                    <span>COPIAR IDENTIFICADOR</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

        {/* Modal Bottom CTA */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            SM Studio Bogotá • Diseño y Arte • Creando Visiones.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-all"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
