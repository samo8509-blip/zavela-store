import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  ShieldAlert, 
  ShoppingBag, 
  AlertTriangle, 
  ExternalLink, 
  Check, 
  Save, 
  RefreshCw, 
  Zap, 
  Phone, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Sparkles, 
  Lock, 
  UserCheck, 
  Clock, 
  Copy,
  Info
} from 'lucide-react';
import { StoreSettings, WhatsAppAlertLog, WhatsAppAlertsSettings } from '../../types/index.ts';

interface AdminCopilotPrivateAlertsProps {
  settings: StoreSettings;
  onSaveSettings: (settings: StoreSettings) => void;
}

export const AdminCopilotPrivateAlerts: React.FC<AdminCopilotPrivateAlertsProps> = ({
  settings,
  onSaveSettings
}) => {
  // Current values
  const defaultNumber = '+573008784427';
  const initialAlerts = settings.whatsappAlerts || {
    enabled: true,
    adminPhoneNumber: defaultNumber,
    notifyNewSales: true,
    notifySecurityAlerts: true,
    notifyLowStock: true,
    lowStockThreshold: 5
  };

  const [adminPhone, setAdminPhone] = useState(initialAlerts.adminPhoneNumber || defaultNumber);
  const [enabled, setEnabled] = useState(initialAlerts.enabled !== false);
  const [notifyNewSales, setNotifyNewSales] = useState(initialAlerts.notifyNewSales !== false);
  const [notifySecurity, setNotifySecurity] = useState(initialAlerts.notifySecurityAlerts !== false);
  const [notifyLowStock, setNotifyLowStock] = useState(initialAlerts.notifyLowStock !== false);
  const [lowStockThreshold, setLowStockThreshold] = useState(initialAlerts.lowStockThreshold || 5);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingType, setTestingType] = useState<string | null>(null);
  const [logs, setLogs] = useState<WhatsAppAlertLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const cleanCurrentPhone = adminPhone.trim() || defaultNumber;

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/alerts/logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLogs(data.data);
      }
    } catch (e) {
      console.warn('Error fetching alert logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedAlerts: WhatsAppAlertsSettings = {
      enabled,
      adminPhoneNumber: adminPhone.trim() || defaultNumber,
      notifyNewSales,
      notifySecurityAlerts: notifySecurity,
      notifyLowStock,
      lowStockThreshold: Number(lowStockThreshold) || 5
    };

    try {
      // 1. Save to backend alerts route
      await fetch('/api/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAlerts)
      });

      // 2. Persist in global settings
      onSaveSettings({
        ...settings,
        whatsappAlerts: updatedAlerts
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving private alert config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerTest = async (testType: 'NEW_SALE' | 'SECURITY_ALERT' | 'LOW_STOCK' | 'VERIFY') => {
    setTestingType(testType);
    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType: testType === 'VERIFY' ? 'CUSTOM' : testType })
      });
      const data = await res.json();

      if (data.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zavela_whatsapp_alert_triggered', { detail: data }));
        }
        await fetchLogs();

        // If user wants to open directly
        if (data.waMeUrl) {
          window.open(data.waMeUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (e) {
      console.error('Error running alert test:', e);
    } finally {
      setTestingType(null);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Banner & Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Canal Privado Exclusivo del Administrador
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Canal Privado de Alertas del Copiloto
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold font-mono">
                {cleanCurrentPhone}
              </span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Despacho confidencial e inmediato hacia tu WhatsApp personal para <strong>aprobación de órdenes</strong>, <strong>alertas del centinela de seguridad</strong> y <strong>quiebres de inventario</strong>.
            </p>
          </div>

          {/* Estado de Conexión Copiloto */}
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-left md:text-right shadow-lg">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Copiloto conectado para reportes privados a {cleanCurrentPhone}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Modo Dual: Meta Cloud API + Respaldo Directo Web
              </div>
            </div>

            {/* Quick Test Direct Button (Requirement 4) */}
            <button
              type="button"
              onClick={() => handleTriggerTest('VERIFY')}
              disabled={Boolean(testingType)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Comprobar de inmediato que el mensaje llega directo a tu chat personal"
            >
              <Send className={`w-3.5 h-3.5 ${testingType === 'VERIFY' ? 'animate-bounce' : ''}`} />
              <span>{testingType === 'VERIFY' ? 'Despachando prueba...' : `Enviar Alerta de Prueba a mi WhatsApp (${cleanCurrentPhone})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Matriz de Separación de Canales (Comercial vs Privado) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Canal Público Comercial */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              Canal Comercial de Clientes (Público)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[10px] font-mono">
              Atención en Tienda
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Atiende a los visitantes y compradores con preguntas sobre productos, asesoría de compra y seguimiento de guías de entrega. Gestionado en el módulo "WhatsApp & Agente IA Ventas".
          </p>
        </div>

        {/* Canal Privado Copiloto */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-2 shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              Canal Privado de Alertas del Copiloto
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
              Solo Administrador
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>100% privado y confidencial.</strong> Recibe órdenes pendientes de aprobación, alertas de seguridad del centinela y quiebre de stock únicamente en <strong>{cleanCurrentPhone}</strong>.
          </p>
        </div>
      </div>

      {/* 3. Formulario Principal de Configuración */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Configuración del Canal Privado
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ajusta el número celular de destino y los eventos que activan el despacho inmediato.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" /> ¡Guardado!
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campo Fijo y Configurable: WhatsApp Personal del Administrador */}
          <div className="space-y-2">
            <label htmlFor="admin-phone-input" className="block text-xs font-bold text-slate-300">
              WhatsApp Personal del Administrador <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                🇨🇴
              </div>
              <input
                id="admin-phone-input"
                type="text"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="+573008784427"
                className="w-full pl-10 pr-24 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
              />
              <button
                type="button"
                onClick={() => setAdminPhone(defaultNumber)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] text-slate-400 hover:text-emerald-300 font-semibold bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Restablecer al número por defecto (+573008784427)"
              >
                Defecto
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Número por defecto: <strong className="text-emerald-400 font-mono">+573008784427</strong>. Los reportes y botones de aprobación se dirigirán a este chat.
            </p>
          </div>

          {/* Switch de Activación: Alertas Automáticas del Copiloto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Alertas Automáticas del Copiloto por WhatsApp
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
              }`}>
                {enabled ? 'ACTIVO' : 'PAUSADO'}
              </span>
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div className="pr-4">
                <div className="text-xs font-semibold text-white">Despacho Automático en Vivo</div>
                <div className="text-[11px] text-slate-400">
                  Emitir notificaciones ante ventas, alertas de seguridad o quiebres de stock.
                </div>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 cursor-pointer rounded"
              />
            </label>
          </div>
        </div>

        {/* Triggers Individuales */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Eventos Críticos que Disparan Notificación:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Nueva Orden por Aprobar */}
            <label className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-all">
              <input
                type="checkbox"
                checked={notifyNewSales}
                onChange={(e) => setNotifyNewSales(e.target.checked)}
                className="mt-1 w-4 h-4 accent-emerald-500 cursor-pointer rounded"
              />
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nuevas Ventas / Órdenes</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Detalle de cliente, teléfono, items, total COP y botón "Enviar reporte y aprobar en WhatsApp".
                </p>
              </div>
            </label>

            {/* 2. Ciberseguridad Centinela */}
            <label className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-all">
              <input
                type="checkbox"
                checked={notifySecurity}
                onChange={(e) => setNotifySecurity(e.target.checked)}
                className="mt-1 w-4 h-4 accent-rose-500 cursor-pointer rounded"
              />
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ciberseguridad y Centinela</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Aviso inmediato ante fuerza bruta, intentos de extracción de datos o bloqueos perimetrales.
                </p>
              </div>
            </label>

            {/* 3. Quiebre de Stock */}
            <label className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-all">
              <input
                type="checkbox"
                checked={notifyLowStock}
                onChange={(e) => setNotifyLowStock(e.target.checked)}
                className="mt-1 w-4 h-4 accent-amber-500 cursor-pointer rounded"
              />
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quiebre de Stock (≤ {lowStockThreshold} uds)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Aviso cuando un producto de alta demanda quede con pocas unidades para reabastecer en Dropi.
                </p>
              </div>
            </label>
          </div>
        </div>
      </form>

      {/* 4. Centro de Pruebas y Verificación Interactiva (Requirement 4) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Simulador y Verificador de Alertas en Tiempo Real
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pulsa cualquier botón para comprobar de inmediato que la plantilla se genera con el formato exacto y se envía a tu chat personal.
            </p>
          </div>

          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            Destino: {cleanCurrentPhone}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Test 1: Venta */}
          <button
            type="button"
            onClick={() => handleTriggerTest('NEW_SALE')}
            disabled={Boolean(testingType)}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all text-left flex flex-col justify-between cursor-pointer group active:scale-[0.98] disabled:opacity-50"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Formato Venta
                </span>
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Probar Alerta de Nueva Orden
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Genera la plantilla con ID de orden, cliente, items y llamado de aprobación con transportadora.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
              <span>{testingType === 'NEW_SALE' ? 'Enviando...' : 'Disparar Alerta'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Test 2: Ciberseguridad */}
          <button
            type="button"
            onClick={() => handleTriggerTest('SECURITY_ALERT')}
            disabled={Boolean(testingType)}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-900 transition-all text-left flex flex-col justify-between cursor-pointer group active:scale-[0.98] disabled:opacity-50"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Formato Centinela
                </span>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                Probar Alerta de Seguridad
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Simula detección de fuerza bruta o anomalías con bloqueo preventivo del copiloto.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-rose-400 font-semibold">
              <span>{testingType === 'SECURITY_ALERT' ? 'Enviando...' : 'Disparar Alerta'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Test 3: Stock */}
          <button
            type="button"
            onClick={() => handleTriggerTest('LOW_STOCK')}
            disabled={Boolean(testingType)}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all text-left flex flex-col justify-between cursor-pointer group active:scale-[0.98] disabled:opacity-50"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Formato Inventario
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Probar Quiebre de Stock
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Simula aviso de stock crítico (2 unidades) con sugerencia de reabastecimiento en Dropi.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-amber-400 font-semibold">
              <span>{testingType === 'LOW_STOCK' ? 'Enviando...' : 'Disparar Alerta'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* 5. Historial de Alertas Despachadas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Historial de Reportes Despachados</h3>
            <span className="text-xs font-mono text-slate-500">({logs.length})</span>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No hay alertas registradas en esta sesión. Realiza una prueba o procesa un pedido de compra.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {logs.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">{item.title}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                      item.status === 'sent_cloud_api' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {item.status === 'sent_cloud_api' ? '⚡ Meta API' : '📱 Respaldo Web'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(item.timestamp).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                    {item.message.split('\n')[0]}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyText(item.message, item.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === item.id ? 'Copiado' : 'Copiar'}</span>
                  </button>

                  <a
                    href={item.waMeUrl || `https://wa.me/573008784427?text=${encodeURIComponent(item.message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-white" />
                    <span>Abrir en WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
