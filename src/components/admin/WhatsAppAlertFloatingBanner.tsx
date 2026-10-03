import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  ExternalLink, 
  X, 
  Copy, 
  Check, 
  ShieldAlert, 
  ShoppingBag, 
  AlertTriangle, 
  Zap, 
  Bell, 
  ChevronUp, 
  ChevronDown,
  Phone,
  Sparkles
} from 'lucide-react';
import { WhatsAppAlertLog, WhatsAppAlertType } from '../../types/index.ts';

interface WhatsAppAlertFloatingBannerProps {
  initialAlert?: WhatsAppAlertLog | null;
  onDismiss?: () => void;
}

export const WhatsAppAlertFloatingBanner: React.FC<WhatsAppAlertFloatingBannerProps> = ({
  initialAlert,
  onDismiss
}) => {
  const [currentAlert, setCurrentAlert] = useState<WhatsAppAlertLog | null>(initialAlert || null);
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [alertHistory, setAlertHistory] = useState<WhatsAppAlertLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Poll or fetch latest alerts from backend
  const fetchRecentLogs = async () => {
    try {
      const res = await fetch('/api/alerts/logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setAlertHistory(data.data);
        if (!currentAlert) {
          setCurrentAlert(data.data[0]);
        }
      }
    } catch (e) {
      console.warn('Could not fetch WhatsApp alert logs:', e);
    }
  };

  useEffect(() => {
    fetchRecentLogs();

    // Listen for custom trigger events across the app (order creation, security lockout, low stock)
    const handleAlertEvent = (e: any) => {
      const detail = e.detail;
      if (detail) {
        const newLog: WhatsAppAlertLog = {
          id: detail.alertId || `ev-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: detail.type || 'NEW_SALE',
          title: detail.title || 'Alerta Inmediata Zavela Store',
          recipientPhone: detail.recipientPhone || '573008784427',
          message: detail.formattedMessage || detail.message || '',
          status: detail.sentViaApi ? 'sent_cloud_api' : 'pending_direct_backup',
          waMeUrl: detail.waMeUrl || `https://wa.me/573008784427?text=${encodeURIComponent(detail.formattedMessage || '')}`,
          details: detail.details || detail.order
        };
        setCurrentAlert(newLog);
        setIsOpen(true);
        setAlertHistory(prev => [newLog, ...prev.slice(0, 19)]);
      }
    };

    window.addEventListener('zavela_whatsapp_alert_triggered', handleAlertEvent);
    return () => {
      window.removeEventListener('zavela_whatsapp_alert_triggered', handleAlertEvent);
    };
  }, []);

  if (!currentAlert) return null;

  const handleCopy = () => {
    if (currentAlert?.message) {
      navigator.clipboard.writeText(currentAlert.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleOpenWhatsAppWeb = () => {
    if (currentAlert?.waMeUrl) {
      window.open(currentAlert.waMeUrl, '_blank', 'noopener,noreferrer');
    } else {
      const fallbackUrl = `https://wa.me/573008784427?text=${encodeURIComponent(currentAlert?.message || '')}`;
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isSale = currentAlert.type === 'NEW_SALE';
  const isSecurity = currentAlert.type === 'SECURITY_ALERT';
  const isLowStock = currentAlert.type === 'LOW_STOCK';

  const typeConfig = {
    icon: isSecurity ? ShieldAlert : isSale ? ShoppingBag : AlertTriangle,
    badgeBg: isSecurity 
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
      : isSale 
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
      : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accentBorder: isSecurity ? 'border-rose-500/40' : isSale ? 'border-emerald-500/40' : 'border-amber-500/40',
    title: isSecurity 
      ? '🛡️ Alerta de Seguridad' 
      : isSale 
      ? '🚨 Nueva Venta Confirmada' 
      : '⚠️ Quiebre de Stock'
  };

  const Icon = typeConfig.icon;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-full px-2 sm:px-0">
      {/* Minimized Bubble */}
      {!isOpen && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-emerald-500/40 text-white shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-2.5 group cursor-pointer animate-bounce"
            title="Ver alerta de WhatsApp"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 fill-emerald-400/20" />
            </div>
            <div className="text-left text-xs">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>Alerta WhatsApp Activa</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono">+57 300 878 4427</div>
            </div>
            <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white" />
          </button>
        </div>
      )}

      {/* Expanded Floating Notification Card */}
      {isOpen && (
        <div className={`bg-slate-950 border ${typeConfig.accentBorder} rounded-2xl shadow-2xl shadow-black/80 overflow-hidden transition-all duration-200 animate-slideUp`}>
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${typeConfig.badgeBg}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>{typeConfig.title}</span>
                  {currentAlert.status === 'sent_cloud_api' ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" /> Meta API
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                      Respaldo Directo
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <Phone className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Destino: <strong>+57 300 878 4427</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Minimizar notificación"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentAlert(null);
                  if (onDismiss) onDismiss();
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body: Formatted Text Preview */}
          <div className="p-3.5 space-y-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/90 text-slate-200 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-emerald-900/50">
              {currentAlert.message}
            </div>

            {/* Direct WhatsApp Web Action Button (Main CTA) */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOpenWhatsAppWeb}
                className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Abrir chat en WhatsApp Web con el reporte listo para enviar"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>
                  {isSale 
                    ? 'Enviar reporte y aprobar en WhatsApp' 
                    : isSecurity 
                    ? 'Ver alerta crítica en WhatsApp' 
                    : 'Abrir chat con reporte en WhatsApp Web'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡Reporte copiado!' : 'Copiar texto'}</span>
                </button>

                {alertHistory.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Historial ({alertHistory.length})</span>
                    {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible History Drawer */}
            {showHistory && alertHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5 max-h-40 overflow-y-auto">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Alertas Despachadas Recientes:
                </div>
                {alertHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentAlert(item)}
                    className={`w-full p-2 rounded-lg text-left text-[11px] transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      currentAlert.id === item.id 
                        ? 'bg-slate-800 text-white font-bold border border-slate-700' 
                        : 'bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{item.title}</span>
                    <span className="text-[9px] text-slate-500 shrink-0 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
