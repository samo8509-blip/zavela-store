import React, { useState } from 'react';
import { AlertTriangle, Power, LayoutDashboard, Copy, Check, ExternalLink, KeyRound, ShieldAlert } from 'lucide-react';
import { StoreSettings } from '../types/index.ts';

interface AdminMaintenanceBannerProps {
  settings: StoreSettings | null;
  isAdmin: boolean;
  isBypass: boolean;
  onDisableMaintenance: () => Promise<void>;
  onGoToAdmin: () => void;
  onExitBypass?: () => void;
}

export const AdminMaintenanceBanner: React.FC<AdminMaintenanceBannerProps> = ({
  settings,
  isAdmin,
  isBypass,
  onDisableMaintenance,
  onGoToAdmin,
  onExitBypass
}) => {
  const [isDisabling, setIsDisabling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const bypassToken = settings?.maintenanceBypassToken || 'zavela_test';
  const bypassUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?preview_access=${encodeURIComponent(bypassToken)}` 
    : `/?preview_access=${bypassToken}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bypassUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleDisable = async () => {
    try {
      setIsDisabling(true);
      await onDisableMaintenance();
    } finally {
      setIsDisabling(false);
    }
  };

  if (!isAdmin && !isBypass) return null;

  return (
    <aside 
      aria-label="Aviso de Modo de Pruebas Privado"
      className="sticky top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 px-3 sm:px-6 py-2 shadow-lg border-b-2 border-amber-500 font-sans transition-all animate-in slide-in-from-top duration-200"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs">
        
        {/* Left Information Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-black text-amber-300 flex items-center justify-center shrink-0 shadow-xs animate-pulse">
            {isAdmin ? <AlertTriangle className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 leading-tight">
            <span className="font-black uppercase tracking-wider text-[11px] bg-black text-amber-300 px-2 py-0.5 rounded">
              {isAdmin ? '⚠️ MODO DE PRUEBAS PRIVADO' : '🔑 ACCESO CON BYPASS'}
            </span>
            <span className="font-bold text-slate-900 hidden sm:inline">
              {isAdmin 
                ? 'Estás navegando en MODO DE PRUEBAS PRIVADO (La tienda está oculta para el público general).' 
                : 'Estás previsualizando la tienda privada mediante un token de acceso seguro.'}
            </span>
            <span className="font-semibold text-slate-800 text-[11px] sm:hidden">
              Tienda oculta al público (Pruebas privadas)
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          
          {/* Copy Bypass Link Quick Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copiar URL con token de bypass para previsualizar en otros dispositivos"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/10 hover:bg-black/20 text-slate-900 font-bold text-[11px] transition-colors cursor-pointer border border-black/10"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace Bypass'}</span>
            </button>
          )}

          {/* Go to Admin Dashboard */}
          {isAdmin && (
            <button
              type="button"
              onClick={onGoToAdmin}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-300" />
              <span>Panel Admin</span>
            </button>
          )}

          {/* Disable Maintenance and Open to Public (1-click) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleDisable}
              disabled={isDisabling}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[11px] shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isDisabling ? 'Abriendo tienda...' : 'Desactivar Mantenimiento y Abrir al Público'}</span>
            </button>
          )}

          {/* Exit Bypass (For regular previewers) */}
          {!isAdmin && isBypass && onExitBypass && (
            <button
              type="button"
              onClick={onExitBypass}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition-colors cursor-pointer"
            >
              <span>Salir de Previsualización</span>
            </button>
          )}

        </div>

      </div>
    </aside>
  );
};
