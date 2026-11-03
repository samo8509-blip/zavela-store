import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export const AgeVerificationGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    const verified = localStorage.getItem('zavela_adult_verified');
    if (verified === 'true') {
      setIsVerified(true);
    }
    setIsChecking(false);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('zavela_adult_verified', 'true');
    setIsVerified(true);
  };

  const handleDecline = () => {
    window.location.href = '/'; // Regresa al inicio
  };

  if (isChecking) return null;

  if (isVerified) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/50 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Contenido Exclusivo +18</h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Estás a punto de ingresar a la sección de Boutique Íntima de Zavela Store. Debes ser mayor de edad para continuar.
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <button 
            onClick={handleAccept}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-black transition-all shadow-lg cursor-pointer"
          >
            Sí, soy mayor de 18 años
          </button>
          <button 
            onClick={handleDecline}
            className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
          >
            No, volver a la tienda general
          </button>
        </div>
      </div>
    </div>
  );
};
