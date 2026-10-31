import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface AgeGateProps {
  children: React.ReactNode;
  storageKey?: string;
  redirectTo?: string;
  onReject?: () => void;
}

export const AgeGate: React.FC<AgeGateProps> = ({
  children,
  storageKey = 'zavela_adult_verified',
  redirectTo = '/',
  onReject
}) => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'true' || stored === '1') {
        setIsVerified(true);
      } else {
        setIsVerified(false);
      }
    } catch {
      setIsVerified(false);
    }
  }, [storageKey]);

  const handleConfirm = () => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (e) {
      console.warn('No se pudo guardar la verificación de edad en localStorage:', e);
    }
    setIsVerified(true);
  };

  const handleReject = () => {
    if (onReject) {
      onReject();
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  };

  // Mientras lee localStorage, evita parpadeos manteniendo el fondo oscuro
  if (isVerified === null) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  // Si ya está verificado, muestra el contenido directamente
  if (isVerified) {
    return <>{children}</>;
  }

  // Modal a pantalla completa con fondo oscuro y desenfoque (blur) que bloquea el contenido
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
      {/* Resplandores ambientales morados y magenta */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-purple-950/60 border border-purple-500/30 rounded-3xl p-6 sm:p-8 text-center text-white shadow-[0_0_50px_rgba(168,85,247,0.25)] space-y-6">
        
        {/* Ícono de seguridad / +18 */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(192,132,252,0.3)]">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 text-xs font-black tracking-wider uppercase">
            <ShieldAlert className="w-3.5 h-3.5 text-pink-400" />
            <span>Contenido Exclusivo Para Adultos (+18)</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ¿Eres mayor de 18 años?
          </h2>
          
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            Esta sección contiene productos íntimos y bienestar para adultos. 
            Debes tener la mayoría de edad legal para ingresar.
          </p>
        </div>

        {/* Botones de confirmación y rechazo */}
        <div className="space-y-3 pt-2">
          <button
            id="agegate-confirm-btn"
            onClick={handleConfirm}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm uppercase tracking-wider transition-all duration-300 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sí, soy mayor de 18 años</span>
          </button>

          <button
            id="agegate-reject-btn"
            onClick={handleReject}
            className="w-full py-3 px-5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>No, salir a la página principal</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Envíos 100% discretos en empaque opaco sin etiquetas explícitas y pago contra entrega en toda Colombia.
        </p>
      </div>
    </div>
  );
};
