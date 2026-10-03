import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Brain, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Square, 
  X, 
  TrendingUp, 
  Eye, 
  ShoppingCart, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw,
  BarChart3,
  Flame,
  Award,
  Lightbulb,
  Zap,
  Tag,
  Clock,
  Shuffle,
  DollarSign,
  CreditCard,
  History,
  RotateCcw,
  MessageSquare,
  ExternalLink,
  Check
} from 'lucide-react';
import { Product, AdminStats } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { 
  getOrGenerateDailyTrafficReport, 
  generateDailyTrafficReport,
  SimulatedDailyTrafficReport, 
  SimulatedProductMetric 
} from '../../utils/mockDailyTrafficGenerator.ts';
import {
  compareWithLastReport,
  saveReportMemory,
  buildUnifiedSpeechScript,
  ReportMemoryComparison
} from '../../utils/commerceMindMemory.ts';
import { 
  getBestSpanishVoice, 
  createNaturalSpeechUtterance 
} from '../../utils/naturalVoiceSynthesizer.ts';
import { AssistantVoiceSelector } from './AssistantVoiceSelector.tsx';

interface AdminDailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  stats: AdminStats | null;
  initialStep?: 'greeting' | 'summary';
}

interface AdminAIData {
  resumen_estadistico: {
    top_visualizados: SimulatedProductMetric[];
    top_ingresos: SimulatedProductMetric[];
    hallazgos_clave: string[];
    total_visualizaciones: number;
    carritos_abandonados: number;
    compras_efectivas: number;
    total_ingresos: number;
    ticket_promedio: number;
    metodo_pago: string;
    tasa_promedio: string;
    tiempo_promedio_general: number;
  };
  asistente_admin: {
    diagnostico_estrategico: string;
    acciones_sugeridas: Array<{
      area: string;
      accion: string;
      impacto_esperado: string;
    }>;
  };
}

export const AdminDailySummaryModal: React.FC<AdminDailySummaryModalProps> = ({
  isOpen,
  onClose,
  products,
  stats,
  initialStep = 'greeting'
}) => {
  const [currentStep, setCurrentStep] = useState<'greeting' | 'summary'>(initialStep);
  const [aiData, setAiData] = useState<AdminAIData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [trafficReport, setTrafficReport] = useState<SimulatedDailyTrafficReport | null>(null);
  const [comparison, setComparison] = useState<ReportMemoryComparison | null>(null);
  const [waNotificationSent, setWaNotificationSent] = useState<boolean>(false);
  const [lastWaMessage, setLastWaMessage] = useState<string>('');
  const [copiedWa, setCopiedWa] = useState<boolean>(false);

  // Speech synthesis state
  const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);
  const [isPausedVoice, setIsPausedVoice] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [lastSpokenType, setLastSpokenType] = useState<'smart' | 'forced_full'>('smart');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Synchronize step when initialStep changes or modal reopens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep);
      if (initialStep === 'summary') {
        loadData(false);
      }
    }
  }, [isOpen, initialStep]);

  // Load voices for Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const best = getBestSpanishVoice();
      setSelectedVoice(best);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop voice on modal close
  useEffect(() => {
    if (!isOpen) {
      stopVoice();
    }
  }, [isOpen]);

  // Fetch AI daily statistics using unified traffic + sales report
  const loadData = async (forceRegenerate: boolean = false) => {
    setIsLoadingData(true);
    stopVoice();

    try {
      const report = forceRegenerate 
        ? generateDailyTrafficReport(products)
        : getOrGenerateDailyTrafficReport(products);

      setTrafficReport(report);

      // Memory comparison against previous state
      const comp = compareWithLastReport(report);
      setComparison(comp);

      // Prepare payload for CommerceMind AI with unified traffic and sales
      const payload = {
        modo: 'administrador',
        metricas: {
          conteos_visualizaciones: report.productos.map(p => ({
            id: p.id,
            nombre: p.nombre,
            visitas: p.visitas,
            compras: p.compras
          })),
          tasa_clics: '4.8%',
          carritos_abandonados: report.total_carritos_abandonados,
          compras_efectivas: report.total_compras,
          total_ingresos: report.total_ingresos,
          ticket_promedio: report.ticket_promedio,
          metodo_pago: report.metodo_pago_predominante
        }
      };

      let aiResponse: any = null;

      try {
        const res = await fetch('/api/ai/commercemind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          aiResponse = await res.json();
        }
      } catch (err) {
        console.warn('CommerceMind API fetch error, falling back to local analysis:', err);
      }

      const starProduct = report.productos.find(p => p.es_estrella) || report.productos[0];
      const frictionProduct = report.productos.find(p => p.es_friccion) || report.productos[1];

      const defaultHallazgos = [
        `Producto líder en facturación y visitas: "${starProduct?.nombre}" con ${starProduct?.visitas} visualizaciones y ${formatCOP(starProduct?.ingresos_generados || 0)} en ventas (${starProduct?.compras} pedidos).`,
        frictionProduct 
          ? `Alerta de fricción de compra en "${frictionProduct.nombre}": acumula ${frictionProduct.visitas} visualizaciones con solo ${frictionProduct.compras} pedidos (${formatCOP(frictionProduct.ingresos_generados || 0)}), evidenciando alta curiosidad pero objeción al momento del checkout.`
          : `El ${report.metodo_pago_predominante} sigue impulsando más del 85% de las conversiones en Colombia.`
      ];

      const defaultDiagnosis = `El desempeño comercial de hoy refleja una sincronía positiva entre tráfico (${report.total_visualizaciones} vistas) e ingresos (${formatCOP(report.total_ingresos)} en ${report.total_pedidos} pedidos). El ticket promedio se sitúa en ${formatCOP(report.ticket_promedio)}. Mientras artículos como "${starProduct?.nombre}" dominan la facturación, desbloquear la conversión de "${frictionProduct?.nombre}" mediante combos o garantía de flete contra entrega incrementará el ingreso diario de forma inmediata.`;

      const defaultActions = [
        {
          area: 'Precio',
          accion: `Activar combo 2x1 o incentivo de flete gratis en "${frictionProduct ? frictionProduct.nombre : 'productos con alta visualización'}" para convertir el tráfico represado.`,
          impacto_esperado: 'Aumento proyectado del 28% en pedidos directos y mayor rotación de inventario.'
        },
        {
          area: 'Marketing',
          accion: `Enviar recordatorio por WhatsApp a los ${report.total_carritos_abandonados} carritos abandonados hoy con enlace de pago contra entrega directo.`,
          impacto_esperado: 'Recuperación estimada de 3 a 5 ventas adicionales sin inversión publicitaria.'
        },
        {
          area: 'Inventario',
          accion: `Asegurar inventario prioritario de "${starProduct?.nombre}" en bodega para evitar rotura de stock ante la alta demanda.`,
          impacto_esperado: 'Protección de hasta 2 millones en ventas proyectadas para los próximos días.'
        }
      ];

      setAiData({
        resumen_estadistico: {
          top_visualizados: report.productos_top_visitas,
          top_ingresos: report.productos_top_ingresos,
          hallazgos_clave: aiResponse?.resumen_estadistico?.hallazgos_clave || defaultHallazgos,
          total_visualizaciones: report.total_visualizaciones,
          carritos_abandonados: report.total_carritos_abandonados,
          compras_efectivas: report.total_compras,
          total_ingresos: report.total_ingresos,
          ticket_promedio: report.ticket_promedio,
          metodo_pago: report.metodo_pago_predominante,
          tasa_promedio: report.tasa_conversion_promedio,
          tiempo_promedio_general: report.tiempo_promedio_general_segundos
        },
        asistente_admin: {
          diagnostico_estrategico: aiResponse?.asistente_admin?.diagnostico_estrategico || defaultDiagnosis,
          acciones_sugeridas: aiResponse?.asistente_admin?.acciones_sugeridas || defaultActions
        }
      });

      // Save report in memory after preparing
      saveReportMemory(report);

      // Si fue una simulación ("Simular nuevas ventas"), despachar automáticamente la notificación a WhatsApp
      if (forceRegenerate) {
        dispatchSimulationWhatsAppNotification(report, comp);
      }

    } catch (err) {
      console.warn('Error preparing daily summary data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  /**
   * Genera el texto con la estructura exacta requerida y despacha la alerta a WhatsApp (+57 3008784427)
   */
  const buildReportWhatsAppMessage = (
    report: SimulatedDailyTrafficReport, 
    comp?: ReportMemoryComparison | null
  ): string => {
    const starProduct = report.productos_top_ingresos?.[0] || report.productos?.[0];
    const starName = starProduct?.nombre || 'Taladro 2421 Dewalt Con Herramientas';
    const deltaSales = comp?.deltaPedidos && comp.deltaPedidos > 0 ? comp.deltaPedidos : 5;
    const deltaRevenueFormatted = comp?.deltaIngresos && comp.deltaIngresos > 0 
      ? formatCOP(comp.deltaIngresos) 
      : 'COP 870.000';
    const totalAccumFormatted = formatCOP(report.total_ingresos);
    const totalOrdersCount = report.total_pedidos;

    return `🚨 ¡REPORTE DE VENTAS - ZAVELA STORE!
Se acaban de registrar ${deltaSales} nuevas ventas.
• Nuevos ingresos: ${deltaRevenueFormatted}
• Acumulado del día: ${totalAccumFormatted} (${totalOrdersCount} pedidos)
• Producto destacado: ${starName}
• Modalidad predominante: Pago Contra Entrega (88%)
👉 Revisa el panel para aprobar despachos y generar guías.`;
  };

  /**
   * Despacha la notificación tanto al servicio interno backend como abriendo la ventana emergente/pestaña secundaria de WhatsApp
   */
  const dispatchSimulationWhatsAppNotification = (
    report: SimulatedDailyTrafficReport,
    comp?: ReportMemoryComparison | null
  ) => {
    const message = buildReportWhatsAppMessage(report, comp);
    setLastWaMessage(message);
    setWaNotificationSent(true);

    // 1. Invocar el servicio de notificación interna (backend /api/alerts/send)
    fetch('/api/alerts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'DAILY_SUMMARY',
        rawText: message,
        data: {
          totalIngresos: report.total_ingresos,
          totalPedidos: report.total_pedidos,
          source: 'Simulación Nuevas Ventas - Modal Reporte Diario'
        }
      })
    }).catch(err => console.warn('Error invoking internal alert notification service:', err));

    // 2. Disparar evento para que el banner flotante del admin y oyentes se actualicen
    try {
      window.dispatchEvent(new CustomEvent('zavela_whatsapp_alert_triggered', {
        detail: {
          type: 'DAILY_SUMMARY',
          title: '🚨 Reporte de Ventas Enviado a WhatsApp',
          message,
          destination: '+57 300 878 4427',
          waMeUrl: `https://wa.me/573008784427?text=${encodeURIComponent(message)}`,
          timestamp: new Date().toISOString()
        }
      }));
    } catch {}

    // 3. Abrir automáticamente en una pestaña secundaria o ventana emergente el enlace directo de WhatsApp Web / API
    const waUrl = `https://wa.me/573008784427?text=${encodeURIComponent(message)}`;
    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Popup blocked, available via backup button:', e);
    }
  };

  /**
   * Botón de Respaldo Rápido: Reenviar reporte a mi WhatsApp
   */
  const handleResendReportToWhatsApp = () => {
    if (!trafficReport) return;
    const message = lastWaMessage || buildReportWhatsAppMessage(trafficReport, comparison);
    const waUrl = `https://wa.me/573008784427?text=${encodeURIComponent(message)}`;
    
    // Disparar log interno
    fetch('/api/alerts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'DAILY_SUMMARY',
        rawText: message,
        data: { manualResend: true }
      })
    }).catch(() => {});

    setWaNotificationSent(true);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAcceptGreeting = () => {
    setCurrentStep('summary');
    loadData(false);
  };

  const handleDismissGreeting = () => {
    try {
      sessionStorage.setItem('cm_admin_greeting_dismissed', 'true');
    } catch {}
    stopVoice();
    onClose();
  };

  const startVoice = (forceFull: boolean = false) => {
    if (!('speechSynthesis' in window) || !trafficReport || !comparison) return;

    window.speechSynthesis.cancel();
    setLastSpokenType(forceFull ? 'forced_full' : 'smart');

    const script = buildUnifiedSpeechScript(trafficReport, comparison, forceFull);

    const utterance = createNaturalSpeechUtterance(script, {
      voice: selectedVoice || getBestSpanishVoice(),
      onStart: () => {
        setIsPlayingVoice(true);
        setIsPausedVoice(false);
      },
      onEnd: () => {
        setIsPlayingVoice(false);
        setIsPausedVoice(false);
        // Mark as acknowledged in memory
        saveReportMemory(trafficReport);
        setComparison(compareWithLastReport(trafficReport));
      },
      onError: () => {
        setIsPlayingVoice(false);
        setIsPausedVoice(false);
      }
    });

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pauseVoice = () => {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPausedVoice(true);
    }
  };

  const resumeVoice = () => {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPausedVoice(false);
      setIsPlayingVoice(true);
    } else {
      startVoice(lastSpokenType === 'forced_full');
    }
  };

  const stopVoice = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingVoice(false);
    setIsPausedVoice(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && currentStep === 'greeting') {
          handleDismissGreeting();
        }
      }}
    >
      {/* 1. MODO GREETING: SALUDO Y PREGUNTA DIARIA */}
      {currentStep === 'greeting' ? (
        <div 
          className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-indigo-100 relative overflow-hidden transform transition-all animate-scaleUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glowing Top Ambient Accents */}
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Close Icon Button */}
          <button
            onClick={handleDismissGreeting}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Assistant Header Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <Brain className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-widest text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  CommerceMind AI
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                Copiloto de Tráfico y Ventas
              </h3>
            </div>
          </div>

          {/* Warm Greeting Message */}
          <div className="space-y-3 mb-6">
            <p className="text-slate-800 text-base sm:text-lg font-medium leading-relaxed">
              ¡Hola! 👋 ¿Deseas ver el balance unificado de tráfico y ventas del día de hoy?
            </p>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              He preparado los ingresos generados en COP, pedidos completados, ticket promedio y productos con mayor atención y facturación, con memoria inteligente para no repetir lo que ya conoces.
            </p>
          </div>

          {/* Clear Decision Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={handleAcceptGreeting}
              className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Sí, ver balance</span>
            </button>

            <button
              onClick={handleDismissGreeting}
              className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all text-center cursor-pointer"
            >
              No, más tarde
            </button>
          </div>
        </div>
      ) : (
        /* 2. MODO SUMMARY: BALANCE UNIFICADO DE TRÁFICO + VENTAS + MEMORIA + VOZ */
        <div 
          className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col relative animate-scaleUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#0A1128] to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shadow-xs">
                <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                    CommerceMind AI • Balance Unificado
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Tráfico + Ventas
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Reporte Diario: Visualizaciones, Ingresos y Conversión
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Botón de Respaldo Rápido: Reenviar reporte a WhatsApp */}
              <button
                type="button"
                onClick={handleResendReportToWhatsApp}
                disabled={isLoadingData || !trafficReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                title="Reenviar reporte a mi WhatsApp (+57 3008784427)"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-white text-emerald-600" />
                <span className="hidden md:inline">Reenviar reporte a mi WhatsApp</span>
                <span className="inline md:hidden">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isLoadingData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                title="Generar nuevas cifras aleatorias de tráfico y ventas"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Simular nuevas ventas</span>
              </button>

              <button
                onClick={() => loadData(false)}
                disabled={isLoadingData}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-red-900/60 hover:text-red-300 text-slate-400 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Banner visual verde cuando se envía notificación a WhatsApp */}
          {waNotificationSent && (
            <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-medium flex items-center justify-between gap-3 shadow-inner shrink-0 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping shrink-0" />
                <MessageSquare className="w-4 h-4 shrink-0 fill-white text-emerald-600" />
                <span className="font-bold">
                  📲 Notificación generada y enviada a tu WhatsApp privado (+57 3008784427)
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResendReportToWhatsApp}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-emerald-50 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Abrir chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWaNotificationSent(false)}
                  className="p-1 rounded hover:bg-emerald-700 text-emerald-200 hover:text-white transition-colors cursor-pointer"
                  title="Ocultar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Presentation Memory Banner */}
          {comparison && (
            <div className={`px-6 py-2.5 border-b text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 ${
              comparison.mode === 'no_changes'
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                : comparison.mode === 'delta_updates'
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : 'bg-indigo-50/80 border-indigo-100 text-indigo-900'
            }`}>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 shrink-0 text-current opacity-80" />
                <span className="font-semibold">
                  {comparison.mode === 'no_changes' && (
                    <>Ya estás al día con el informe anterior. Seguimos con <strong>{trafficReport?.total_pedidos} pedidos</strong> por <strong>{formatCOP(trafficReport?.total_ingresos || 0)}</strong> sin cambios sustanciales.</>
                  )}
                  {comparison.mode === 'delta_updates' && (
                    <>¡Hay novedades desde tu última revisión! <strong>+{comparison.deltaPedidos} ventas</strong> ({formatCOP(comparison.deltaIngresos)}) y <strong>+{comparison.deltaVisitas} visitas</strong>.</>
                  )}
                  {comparison.mode === 'initial_full' && (
                    <>Primer balance del día preparado. Mostrando el consolidado completo de tráfico y facturación.</>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono opacity-70">
                  {comparison.lastReport ? `Última revisión: ${new Date(comparison.lastReport.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Revisión en vivo'}
                </span>
              </div>
            </div>
          )}

          {/* Audio Player Bar (Web Speech API) */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                  Narrador de Voz Inteligente
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {isPlayingVoice 
                    ? (isPausedVoice ? 'Voz en pausa' : lastSpokenType === 'forced_full' ? 'Narrando balance global completo...' : 'Narrando reporte adaptado a novedades...') 
                    : (comparison?.mode === 'no_changes' ? 'Puedes escuchar el saludo rápido o forzar la lectura completa' : 'Escucha el reporte narrado de forma fluida y natural')}
                </span>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <AssistantVoiceSelector 
                onVoiceChange={(v) => setSelectedVoice(v)} 
                theme="light" 
              />

              {!isPlayingVoice ? (
                <>
                  <button
                    type="button"
                    onClick={() => startVoice(false)}
                    disabled={isLoadingData || !trafficReport}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>
                      {comparison?.mode === 'no_changes' ? 'Escuchar estado actual' : 'Escuchar resumen'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startVoice(true)}
                    disabled={isLoadingData || !trafficReport}
                    className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Narrar todo el informe detallado sin importar si ya fue escuchado"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Forzar lectura completa</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {isPausedVoice ? (
                    <button
                      type="button"
                      onClick={resumeVoice}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Reanudar voz"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Reanudar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseVoice}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Pausar voz"
                    >
                      <Pause className="w-3.5 h-3.5 fill-white" />
                      <span>Pausar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={stopVoice}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Detener voz"
                  >
                    <Square className="w-3 h-3 fill-slate-700" />
                    <span>Detener</span>
                  </button>

                  {!isPausedVoice && (
                    <div className="flex items-center gap-0.5 px-2 py-1 bg-indigo-100 rounded-md">
                      <span className="w-1 h-3 bg-indigo-600 rounded-full animate-pulse" />
                      <span className="w-1 h-4 bg-indigo-600 rounded-full animate-pulse delay-75" />
                      <span className="w-1 h-2 bg-indigo-600 rounded-full animate-pulse delay-150" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {isLoadingData ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="text-xs font-mono font-bold text-slate-600">
                  Consolidando métricas de ventas, visualizaciones e inteligencia comercial...
                </span>
              </div>
            ) : aiData && trafficReport ? (
              <>
                {/* 1. SECCIÓN DE MÉTRICAS UNIFICADAS: TRÁFICO Y VENTAS LADO A LADO */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Balance Consolidado del Día (Colombia)
                    </span>
                    <span className="text-xs font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      {trafficReport.metodo_pago_predominante}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {/* Ventas: Ingresos Totales */}
                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Ingresos del Día</span>
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
                        {formatCOP(trafficReport.total_ingresos)}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold mt-1">Facturación proyectada hoy</span>
                    </div>

                    {/* Ventas: Pedidos Confirmados */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Pedidos Confirmados</span>
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                        {trafficReport.total_pedidos}
                      </div>
                      <span className="text-[10px] text-indigo-600 font-bold mt-1">Ticket prom: {formatCOP(trafficReport.ticket_promedio)}</span>
                    </div>

                    {/* Tráfico: Visualizaciones del Catálogo */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Visualizaciones</span>
                        <Eye className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                        {trafficReport.total_visualizaciones}
                      </div>
                      <span className="text-[10px] text-sky-600 font-bold mt-1">Permanencia: {trafficReport.tiempo_promedio_general_segundos}s</span>
                    </div>

                    {/* Conversión y Carritos */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tasa de Conversión</span>
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-mono text-purple-700">
                        {trafficReport.tasa_conversion_promedio}
                      </div>
                      <span className="text-[10px] text-amber-600 font-bold mt-1">{trafficReport.total_carritos_abandonados} carritos por rescatar</span>
                    </div>
                  </div>
                </div>

                {/* 2. VISTA ARMÓNICA LADO A LADO: TOP TRÁFICO VS TOP INGRESOS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Bloque A: Productos Más Vistos */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-sky-600" />
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                          Top Tráfico y Atención (Vistas)
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">Vistas / Tiempo</span>
                    </div>

                    <div className="space-y-2.5">
                      {trafficReport.productos_top_visitas.slice(0, 4).map((prod, idx) => (
                        <div 
                          key={prod.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            prod.es_estrella ? 'bg-emerald-50/50 border-emerald-200' :
                            prod.es_friccion ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {prod.nombre}
                              </h4>
                              <span className="text-[10px] font-mono text-slate-500">
                                {prod.tiempo_promedio_segundos}s en pantalla • {prod.agregados_carrito} al carrito
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-black text-sky-700 block">
                              {prod.visitas} vistas
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              {prod.compras} ventas ({prod.conversion_tasa})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bloque B: Productos que Más Dinero Generaron */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                          Top Ventas y Facturación (COP)
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">Ingresos Totales</span>
                    </div>

                    <div className="space-y-2.5">
                      {trafficReport.productos_top_ingresos.slice(0, 4).map((prod, idx) => (
                        <div 
                          key={prod.id}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {prod.nombre}
                              </h4>
                              <span className="text-[10px] font-mono text-slate-500">
                                {prod.compras} unidades vendidas a {formatCOP(prod.precio)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-black text-emerald-700 block">
                              {formatCOP(prod.ingresos_generados)}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              {prod.conversion_tasa} conv.
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. RELACIÓN VISITAS VS VENTAS (ESTRELLA VS FRICCIÓN) */}
                <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                        Relación Visitas vs. Ventas: Producto Estrella & Fricción
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-indigo-300">Análisis Predictivo</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tarjeta Estrella */}
                    {(() => {
                      const star = trafficReport.productos.find(p => p.es_estrella) || trafficReport.productos[0];
                      if (!star) return null;
                      return (
                        <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Award className="w-3 h-3" /> Alta Atención + Alta Conversión
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {formatCOP(star.ingresos_generados)}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate">{star.nombre}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Registra {star.visitas} visualizaciones y {star.compras} compras completadas. Es el motor principal de facturación de la jornada.
                          </p>
                        </div>
                      );
                    })()}

                    {/* Tarjeta Fricción */}
                    {(() => {
                      const friction = trafficReport.productos.find(p => p.es_friccion) || trafficReport.productos[1];
                      if (!friction) return null;
                      return (
                        <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Alta Atención pero Sin Ventas
                            </span>
                            <span className="text-xs font-mono font-bold text-amber-400">
                              {friction.conversion_tasa} conv.
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate">{friction.nombre}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Acumula {friction.visitas} visualizaciones con solo {friction.compras} ventas. Sugerencia: crear combo con flete gratis o cupón relámpago en el checkout.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 4. Diagnóstico Estratégico y Acciones de la IA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-indigo-700">
                        <Brain className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Diagnóstico Ejecutivo</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {aiData.asistente_admin.diagnostico_estrategico}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-amber-700">
                        <Lightbulb className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Hallazgos Comerciales Clave</span>
                      </div>
                      <div className="space-y-2">
                        {aiData.resumen_estadistico.hallazgos_clave.map((h, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 font-mono">
              CommerceMind AI • Memoria Activa de Presentación
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {/* Botón de Respaldo Rápido con logo de WhatsApp */}
              <button
                type="button"
                onClick={handleResendReportToWhatsApp}
                disabled={isLoadingData || !trafficReport}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                title="Reenviar balance actual al WhatsApp +573008784427"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-white text-emerald-600" />
                <span>Reenviar reporte a mi WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isLoadingData}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200 disabled:opacity-50"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Simular Nuevas Ventas</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cerrar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
