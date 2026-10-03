import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  Power, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Sparkles, 
  Save, 
  Users, 
  MessageCircle, 
  Lock, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { StoreSettings } from '../../types/index.ts';

interface AdminMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings | null;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  onRefreshData?: () => void;
}

export const AdminMaintenanceModal: React.FC<AdminMaintenanceModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onRefreshData
}) => {
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(() => Boolean(settings?.maintenanceMode));
  const [maintenanceTitle, setMaintenanceTitle] = useState<string>(() => settings?.maintenanceTitle || 'Estamos realizando mejoras en nuestra tienda');
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(() => settings?.maintenanceMessage || 'Estamos mejorando tu experiencia de compra. Volvemos muy pronto con nuevas ofertas exclusivas.');
  const [bypassToken, setBypassToken] = useState<string>(() => settings?.maintenanceBypassToken || 'zavela_test');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync when modal opens or settings change
  React.useEffect(() => {
    if (isOpen && settings) {
      setMaintenanceMode(Boolean(settings.maintenanceMode));
      setMaintenanceTitle(settings.maintenanceTitle || 'Estamos realizando mejoras en nuestra tienda');
      setMaintenanceMessage(settings.maintenanceMessage || 'Estamos mejorando tu experiencia de compra. Volvemos muy pronto con nuevas ofertas exclusivas.');
      setBypassToken(settings.maintenanceBypassToken || 'zavela_test');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const fullBypassUrl = `${currentOrigin}/?preview_access=${encodeURIComponent(bypassToken.trim() || 'zavela_test')}`;

  const handleCopyBypassLink = async () => {
    try {
      await navigator.clipboard.writeText(fullBypassUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleGenerateRandomToken = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    setBypassToken(`zavela_test_${randomSuffix}`);
  };

  const handleSave = async (explicitMode?: boolean) => {
    try {
      setIsSaving(true);
      const activeMode = explicitMode !== undefined ? explicitMode : maintenanceMode;

      await onSaveSettings({
        maintenanceMode: activeMode,
        maintenanceTitle: maintenanceTitle.trim(),
        maintenanceMessage: maintenanceMessage.trim(),
        maintenanceBypassToken: bypassToken.trim() || 'zavela_test'
      });

      setSaveSuccess(true);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickToggle = async () => {
    const nextMode = !maintenanceMode;
    setMaintenanceMode(nextMode);
    await handleSave(nextMode);
  };

  const leads = Array.isArray(settings?.maintenanceNotifyLeads) ? settings.maintenanceNotifyLeads : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm ${
              maintenanceMode ? 'bg-rose-600' : 'bg-emerald-600'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  Modo Mantenimiento y Pruebas Privadas
                </h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  maintenanceMode 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${maintenanceMode ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                  {maintenanceMode ? 'Cerrada al público' : 'Tienda Abierta'}
                </span>
              </div>
              <p className="text-slate-500 text-xs">
                Controla la visibilidad pública de Zavela Store y genera enlaces de previsualización
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Main Switch Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            maintenanceMode 
              ? 'bg-rose-50/70 border-rose-200' 
              : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500 block mb-0.5">
                  Estado de la Tienda
                </span>
                <span className={`text-base font-black ${maintenanceMode ? 'text-rose-900' : 'text-emerald-900'}`}>
                  {maintenanceMode ? '🔴 Modo Mantenimiento: ACTIVO' : '🟢 Modo Mantenimiento: INACTIVO'}
                </span>
                <p className="text-slate-600 text-xs mt-1 max-w-md">
                  {maintenanceMode 
                    ? 'La tienda está oculta para el público general. Solo tú (como Administrador) y las personas con el enlace bypass pueden navegar.'
                    : 'La tienda está abierta a todo el público. Todos los clientes pueden comprar con Pago Contra Entrega normalmente.'}
                </p>
              </div>

              {/* Master Toggle Switch */}
              <button
                type="button"
                onClick={handleQuickToggle}
                disabled={isSaving}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-sm ${
                  maintenanceMode ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    maintenanceMode ? 'translate-x-8' : 'translate-x-0'
                  }`}
                >
                  <Power className={`w-3.5 h-3.5 ${maintenanceMode ? 'text-rose-600' : 'text-emerald-600'}`} />
                </span>
              </button>
            </div>
          </div>

          {/* Bypass Token Generator Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                  Generador de Enlace de Acceso Privado (Bypass Token)
                </h4>
              </div>
              <button
                type="button"
                onClick={handleGenerateRandomToken}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Generar Nuevo Token</span>
              </button>
            </div>

            <p className="text-slate-500 text-[11px]">
              Comparte este enlace con tus socios, diseñadores o clientes VIP para que puedan explorar la tienda completa sin necesidad de iniciar sesión de administrador.
            </p>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 shrink-0">Token:</span>
              <input
                type="text"
                value={bypassToken}
                onChange={(e) => setBypassToken(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                placeholder="ej. zavela_test"
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-indigo-700 w-40 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Generated URL Box */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 overflow-hidden">
              <span className="font-mono text-[11px] text-slate-600 truncate">
                {fullBypassUrl}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyBypassLink}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors cursor-pointer border border-indigo-200"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar Enlace'}</span>
                </button>
                <a
                  href={fullBypassUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Custom Public Message Settings */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-900 text-xs sm:text-sm">
              Personalización del Mensaje Público
            </h4>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Título principal en pantalla
              </label>
              <input
                type="text"
                value={maintenanceTitle}
                onChange={(e) => setMaintenanceTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mensaje explicativo para los visitantes
              </label>
              <textarea
                rows={3}
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs font-medium resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Este mensaje se mostrará debajo del logo oficial de Zavela Store junto al botón directo de WhatsApp.
              </p>
            </div>
          </div>

          {/* Leads captured during maintenance */}
          {leads.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span>Clientes en Lista de Espera ({leads.length})</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Registrados para ser notificados al abrir
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {leads.map((lead) => (
                  <div key={lead.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                        lead.type === 'whatsapp' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                      }`}>
                        {lead.type}
                      </span>
                      <span className="font-bold text-slate-800">{lead.contact}</span>
                      {lead.name && <span className="text-slate-400">({lead.name})</span>}
                    </div>
                    {lead.type === 'whatsapp' && (
                      <a
                        href={`https://wa.me/${lead.contact.replace(/\D/g, '')}?text=${encodeURIComponent('¡Hola! Te escribimos de Zavela Store Colombia para avisarte que nuestra tienda ya está abierta.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Contactar</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ¡Ajustes de mantenimiento guardados!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 font-bold text-xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
