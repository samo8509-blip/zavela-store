import React, { useState } from 'react';
import { 
  Sliders, 
  Save, 
  Check, 
  Store, 
  DollarSign, 
  Truck, 
  MessageSquare,
  Loader2,
  ShieldAlert,
  Power,
  Copy,
  ExternalLink,
  Lock,
  RefreshCw,
  MessageCircle,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StoreSettings } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { FacebookPageConnectModal } from './FacebookPageConnectModal.tsx';

interface AdminSettingsProps {
  settings: StoreSettings;
  onRefresh: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings: initialSettings,
  onRefresh
}) => {
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedBypassLink, setCopiedBypassLink] = useState(false);

  // Estado persistente de Facebook leído directamente de MySQL
  const [fbConfig, setFbConfig] = useState<{
    connected: boolean;
    pageId: string;
    accountName: string;
    autoPostEnabled: boolean;
    pixelId?: string;
    lastSyncAt?: string;
  } | null>(null);
  const [isFbModalOpen, setIsFbModalOpen] = useState(false);
  const [isLoadingFb, setIsLoadingFb] = useState(false);

  const fetchFbStatus = async () => {
    setIsLoadingFb(true);
    try {
      const res = await fetch('/api/admin/social/facebook/status');
      const data = await res.json();
      if (data.success && data.data) {
        setFbConfig(data.data);
      }
    } catch (e) {
      console.warn('Error fetching Facebook status in AdminSettings:', e);
    } finally {
      setIsLoadingFb(false);
    }
  };

  React.useEffect(() => {
    fetchFbStatus();
  }, []);

  // Sync if initialSettings updates from parent
  React.useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const bypassToken = settings.maintenanceBypassToken || 'zavela_test';
  const fullBypassUrl = `${currentOrigin}/?preview_access=${encodeURIComponent(bypassToken)}`;

  const handleCopyBypass = async () => {
    try {
      await navigator.clipboard.writeText(fullBypassUrl);
      setCopiedBypassLink(true);
      setTimeout(() => setCopiedBypassLink(false), 2500);
    } catch {}
  };

  const handleGenerateRandomToken = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newToken = `zavela_test_${randomSuffix}`;
    setSettings(prev => ({ ...prev, maintenanceBypassToken: newToken }));
  };

  const handleToggleMaintenance = () => {
    setSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!res.ok) throw new Error('Error al guardar ajustes');

      setSaveSuccess(true);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const maintenanceModeActive = Boolean(settings.maintenanceMode);
  const leads = Array.isArray(settings.maintenanceNotifyLeads) ? settings.maintenanceNotifyLeads : [];

  return (
    <div className="space-y-6">
      
      {/* Top Store Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-slate-900">Configuración General de Zavela Store</h3>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                maintenanceModeActive
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${maintenanceModeActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                {maintenanceModeActive ? 'Tienda en Mantenimiento' : 'Tienda Activa'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Moneda: <strong>Pesos Colombianos (COP)</strong> • Cobertura: <strong>Nacional (Colombia)</strong>
            </p>
          </div>
        </div>
      </div>

      {/* FEATURED: Módulo de Modo Mantenimiento y Pruebas Privadas */}
      <div className={`rounded-2xl border shadow-xs p-6 transition-all space-y-5 text-xs ${
        maintenanceModeActive 
          ? 'bg-gradient-to-br from-rose-50/80 via-white to-amber-50/50 border-rose-300' 
          : 'bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 border-emerald-300'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${
              maintenanceModeActive ? 'bg-rose-600' : 'bg-emerald-600'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  Modo Mantenimiento y Pruebas Privadas
                </h3>
                {/* Real-time Indicator Badge */}
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                  maintenanceModeActive
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${maintenanceModeActive ? 'bg-rose-600 animate-ping' : 'bg-emerald-600'}`} />
                  {maintenanceModeActive ? 'Rojo: Tienda cerrada al público' : 'Verde: Tienda abierta'}
                </span>
              </div>
              <p className="text-slate-600 text-xs mt-0.5">
                Oculta la tienda a visitantes públicos para realizar cambios o pruebas, permitiendo acceso exclusivo a administradores y enlaces con token de bypass.
              </p>
            </div>
          </div>

          {/* Prominent Master Switch */}
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs shrink-0">
            <div className="text-right">
              <span className="block text-[10px] font-mono uppercase font-bold text-slate-400">
                Estado del Modo
              </span>
              <span className={`text-xs font-black ${maintenanceModeActive ? 'text-rose-700' : 'text-emerald-700'}`}>
                {maintenanceModeActive ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleMaintenance}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-sm ${
                maintenanceModeActive ? 'bg-rose-600' : 'bg-slate-300'
              }`}
              title="Alternar Modo Mantenimiento"
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                  maintenanceModeActive ? 'translate-x-7' : 'translate-x-0'
                }`}
              >
                <Power className={`w-3.5 h-3.5 ${maintenanceModeActive ? 'text-rose-600' : 'text-slate-400'}`} />
              </span>
            </button>
          </div>
        </div>

        {/* Maintenance Configuration Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Left: Custom Public Message & Title */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider text-slate-500">
              Mensaje Público para Clientes
            </h4>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Título principal en pantalla de mantenimiento:
              </label>
              <input
                type="text"
                value={settings.maintenanceTitle || ''}
                placeholder="Estamos realizando mejoras en nuestra tienda"
                onChange={(e) => setSettings({ ...settings, maintenanceTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 font-bold text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mensaje personalizado que verán los clientes mientras esté cerrado:
              </label>
              <textarea
                rows={3}
                value={settings.maintenanceMessage || ''}
                placeholder="Estamos mejorando tu experiencia de compra. Volvemos muy pronto con nuevas ofertas exclusivas."
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 font-medium text-xs resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Se mostrará con el logo oficial de Zavela Store y el botón de contacto directo a WhatsApp oficial.
              </p>
            </div>
          </div>

          {/* Right: Bypass Token Generator */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Enlace de Acceso Privado (Bypass Token)</span>
                </h4>
                <button
                  type="button"
                  onClick={handleGenerateRandomToken}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Nuevo Token</span>
                </button>
              </div>

              <p className="text-slate-500 text-[11px] mb-2.5">
                Genera una URL especial para poder previsualizar y probar la tienda desde cualquier dispositivo sin iniciar sesión de admin.
              </p>

              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-slate-700 shrink-0">Bypass Token:</span>
                <input
                  type="text"
                  value={bypassToken}
                  onChange={(e) => setSettings({ ...settings, maintenanceBypassToken: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-indigo-700 w-44 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Full URL Box */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 overflow-hidden">
                <span className="font-mono text-[11px] text-slate-600 truncate">
                  {fullBypassUrl}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyBypass}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 cursor-pointer"
                  >
                    {copiedBypassLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBypassLink ? 'Copiado' : 'Copiar URL'}</span>
                  </button>
                  <a
                    href={fullBypassUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Leads info */}
            {leads.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  <span>{leads.length} clientes suscritos para reapertura</span>
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  Último: {leads[0].contact}
                </span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* PERSISTENCIA MYSQL: Tarjeta de Vinculación de Facebook Business Page */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
              f
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  Página Oficial de Facebook (Meta Graph API v26.0)
                </h3>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                  fbConfig?.connected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${fbConfig?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {fbConfig?.connected ? 'Conectado a MySQL' : 'Sesión Desconectada'}
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Almacenamiento persistente en tabla <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-600">configuraciones</code> de MySQL. No depende de la memoria volátil ni se desconecta al reiniciar el servidor.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFbModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1877F2] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <span>{fbConfig?.connected ? 'Gestionar Conexión' : 'Conectar Facebook'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Página de Facebook:</span>
            <span className="font-black text-slate-800 text-xs mt-0.5 block truncate">
              {fbConfig?.accountName || 'Zavela Store Colombia (Página Oficial)'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fanpage ID Oficial:</span>
            <span className="font-mono font-bold text-indigo-600 text-xs mt-0.5 block">
              {fbConfig?.pageId || '1256955457511976'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auto-Publicación en Muro:</span>
            <span className="font-bold text-emerald-700 text-xs mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{fbConfig?.autoPostEnabled !== false ? 'Activa al guardar producto' : 'Pausada'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 font-black text-sm text-slate-900">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Precios, Márgenes y Políticas de Envío</span>
          </div>

          {saveSuccess && (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <Check className="w-4 h-4" />
              ¡Ajustes guardados con éxito!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nombre de la Tienda
            </label>
            <input
              type="text"
              value={settings.storeName || 'Zavela Store Colombia'}
              onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Nombre oficial mostrado en cabecera, recibos y notificaciones.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Margen de Ganancia por Defecto (%)
            </label>
            <input
              type="number"
              min={0}
              step={5}
              value={settings.defaultProfitMarginPercentage || 80}
              onChange={(e) => setSettings({ ...settings, defaultProfitMarginPercentage: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Porcentaje de rentabilidad objetivo sugerido para nuevos productos.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Umbral para Envío Gratis ($ COP)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={settings.freeShippingThreshold || 120000}
              onChange={(e) => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Compras iguales o superiores a {formatCOP(settings.freeShippingThreshold || 120000)} tendrán envío gratuito.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Costo Estándar de Envío ($ COP)
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={settings.defaultShippingCost || 12000}
              onChange={(e) => setSettings({ ...settings, defaultShippingCost: Number(e.target.value), flatShippingRate: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Valor aplicado a pedidos por debajo del umbral de envío gratis.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Email de Contacto / Soporte
            </label>
            <input
              type="email"
              value={settings.contactEmail || 'soporte@zavela.co'}
              onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 font-medium"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Correo oficial para atención al cliente.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Teléfono / WhatsApp de Atención
            </label>
            <input
              type="text"
              value={settings.contactPhone || '+57 300 123 4567'}
              onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 font-medium"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Número para canal directo de WhatsApp.
            </p>
          </div>

        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          
          <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.colombiaCodEnabled !== false}
              onChange={(e) => setSettings({ ...settings, colombiaCodEnabled: e.target.checked })}
              className="mt-1 accent-indigo-600 rounded"
            />
            <div>
              <span className="font-bold text-slate-900 block">
                Habilitar Pago Contra Entrega en Colombia
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Permite a los clientes pagar en efectivo una vez reciban el producto en su puerta.
              </p>
            </div>
          </label>

          <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableWhatsappNotifications !== false}
              onChange={(e) => setSettings({ ...settings, enableWhatsappNotifications: e.target.checked })}
              className="mt-1 accent-indigo-600 rounded"
            />
            <div>
              <span className="font-bold text-slate-900 block">
                Confirmación Inmediata por WhatsApp
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Genera botón y enlace con mensaje prellenado de confirmación al cliente tras comprar.
              </p>
            </div>
          </label>

        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            id="btn-save-settings"
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Guardar Configuración</span>
          </button>
        </div>

      </form>

      {/* Modal de Conexión y Gestión de Facebook Business Page */}
      <FacebookPageConnectModal
        isOpen={isFbModalOpen}
        onClose={() => setIsFbModalOpen(false)}
        onConnected={() => {
          fetchFbStatus();
          onRefresh();
        }}
      />

    </div>
  );
};
