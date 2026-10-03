import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  Eye,
  Tag,
  Package,
  Layers,
  CheckCircle2,
  RefreshCw,
  Send,
  Zap,
  DollarSign,
  ArrowRight,
  Code2,
  Copy,
  Check,
  Compass,
  Flame,
  ShieldCheck,
  ShoppingBag,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  Shuffle,
  History,
  RotateCcw,
  Award,
  Clock,
  ShieldAlert,
  Lock,
  Timer,
  Gauge,
  FileCode,
  ChevronRight,
  MessageSquare,
  Phone
} from 'lucide-react';
import { Product, AdminStats } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { 
  getOrGenerateDailyTrafficReport, 
  generateDailyTrafficReport,
  SimulatedDailyTrafficReport 
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
import { SimulationResponseVisualizer } from './SimulationResponseVisualizer.tsx';

// 4 Interactive Presets for the Simulation Center
const SIMULATION_PRESETS = [
  {
    id: 'perfumeria_relojes',
    title: 'Simular Cliente Interesado en Perfumería y Relojes',
    badge: 'Modo Cliente',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Historial con perfumes de alta gama, relojes de lujo, items en carrito e inventario cruzado en COP.',
    icon: Sparkles,
    data: {
      modo: "cliente",
      historial_navegacion: {
        productos_visualizados: [
          { id: "PROD-PERF-01", nombre: "Perfume Sauvage Elixir 100ml Hombre", precio: 189900, categoria: "Perfumería & Fragancias" },
          { id: "PROD-PERF-02", nombre: "Combo Dúo Perfumes Árabes Alta Duración", precio: 220000, categoria: "Perfumería & Fragancias" },
          { id: "PROD-RELOJ-01", nombre: "Reloj de Lujo Minimalista Cuero Café", precio: 149900, categoria: "Accesorios & Joyería" }
        ],
        categorias: ["Perfumería & Fragancias", "Accesorios & Joyería"],
        tiempo_permanencia_segundos: 280,
        clics: 18,
        items_carrito: [
          { id: "PROD-PERF-01", nombre: "Perfume Sauvage Elixir 100ml Hombre", precio: 189900 }
        ]
      },
      inventario: [
        { id_producto: "PROD-RELOJ-01", sku: "ZV-WATCH-01", nombre: "Reloj de Lujo Minimalista Cuero Café", precio: 149900, categoria: "Accesorios & Joyería" },
        { id_producto: "PROD-PERF-DECANT", sku: "ZV-DEC-01", nombre: "Atomizador Decant Metálico de Bolsillo 10ml", precio: 35000, categoria: "Perfumería & Fragancias" },
        { id_producto: "PROD-BILLETERA-CUERO", sku: "ZV-BILL-02", nombre: "Billetera Cuero Café Protección RFID", precio: 79900, categoria: "Accesorios & Joyería" },
        { id_producto: "PROD-CREMA-BARBA", sku: "ZV-BEARD-01", nombre: "Bálsamo e Hidratante Masculino con Aceite de Argán", precio: 45000, categoria: "Cuidado Personal" }
      ]
    }
  },
  {
    id: 'cierre_ventas',
    title: 'Simular Cierre de Ventas Diario',
    badge: 'Modo Admin • Cierre',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Consolidado diario con 42 pedidos, facturación en COP contra entrega y conversión por producto.',
    icon: DollarSign,
    data: {
      modo: "administrador",
      tipo_simulacion: "cierre_ventas_diario",
      fecha_corte: "2026-09-25",
      metricas: {
        total_pedidos: 42,
        pedidos_contra_entrega: 38,
        pedidos_transferencia: 4,
        total_ingresos_cop: 5890000,
        ticket_promedio_cop: 140238,
        tasa_conversion: "4.8%",
        conteos_visualizaciones: [
          { id: "PROD-PERF-01", nombre: "Perfume Sauvage Elixir 100ml", visitas: 340, compras: 19, ingreso_cop: 3608100 },
          { id: "PROD-RELOJ-01", nombre: "Reloj Minimalista Cuero Café", visitas: 260, compras: 14, ingreso_cop: 2098600 },
          { id: "PROD-COMBO-01", nombre: "Combo Dúo Perfumería Fina", visitas: 180, compras: 9, ingreso_cop: 1980000 }
        ],
        carritos_abandonados: 11,
        ciudades_top: ["Bogotá D.C.", "Medellín", "Cali", "Barranquilla"]
      }
    }
  },
  {
    id: 'fuga_clientes',
    title: 'Simular Fuga de Clientes (Alta vista, 0 compras)',
    badge: 'Modo Admin • Fricción',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Identifica productos con cientos de visualizaciones pero cero compras para sugerir promociones y combos.',
    icon: TrendingUp,
    data: {
      modo: "administrador",
      tipo_simulacion: "fuga_clientes",
      metricas: {
        conteos_visualizaciones: [
          { id: "SKU-PROY-01", nombre: "Proyector Galaxia Astronauta HD", visitas: 890, compras: 0, tiempo_promedio_segundos: 14 },
          { id: "SKU-SMART-02", nombre: "Smartwatch Serie 9 Titanium", visitas: 620, compras: 1, tiempo_promedio_segundos: 22 },
          { id: "SKU-DEPIL-03", nombre: "Depiladora Láser IPL Portátil", visitas: 450, compras: 0, tiempo_promedio_segundos: 18 }
        ],
        tasa_clics: "1.8%",
        carritos_abandonados: 37,
        compras_efectivas: 1,
        diagnostico_hipotesis: "Público atraído por video de tendencia pero con fricción de precio percibido o falta de elementos de prueba social y reseñas."
      }
    }
  },
  {
    id: 'fuerza_bruta',
    title: 'Simular Intento de Vulneración / Ataque de Fuerza Bruta',
    badge: 'Modo Centinela',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'Prueba la respuesta defensiva del Centinela de Seguridad ante una ráfaga de 47 accesos no autorizados.',
    icon: ShieldAlert,
    data: {
      modo: "seguridad",
      evento_seguridad: "Ataque de Fuerza Bruta a Panel de Control / Intento de Vulneración",
      tipo_incidente: "fuerza_bruta_autenticacion",
      ip_origen: "190.85.122.44 (Bogotá, Colombia - Red Tor / Nodo de Salida)",
      intentos_fallidos: 47,
      intervalo_segundos: 60,
      endpoints_atacados: [
        "/api/admin/login",
        "/api/admin/auth/verify",
        "/admin-portal"
      ],
      cabeceras_sospechosas: {
        user_agent: "python-requests/2.31.0 - Hydra BruteForce Tool",
        sec_ch_ua: "None"
      },
      estado_actual: "Tarpitting activo y desafío de secuencia física requerido"
    }
  }
];

interface AdminCommerceMindAIProps {
  products: Product[];
  stats: AdminStats | null;
}

interface TopVisualizado {
  id: string;
  nombre: string;
  visitas: number;
  conversion_tasa: string;
}

interface AccionSugerida {
  area: string; // 'Precio' | 'Marketing' | 'Inventario'
  accion: string;
  impacto_esperado: string;
}

interface AdminModeResponse {
  resumen_estadistico: {
    top_visualizados: TopVisualizado[];
    hallazgos_clave: string[];
  };
  asistente_admin: {
    diagnostico_estrategico: string;
    acciones_sugeridas: AccionSugerida[];
  };
}

interface ClientModeResponse {
  intencion_detectada: string;
  recomendaciones: {
    id_producto: string;
    nombre: string;
    tipo_sugerencia: string;
    mensaje_persuasivo: string;
  }[];
}

export const AdminCommerceMindAI: React.FC<AdminCommerceMindAIProps> = ({
  products,
  stats
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'cliente' | 'raw_json'>('admin');
  const [loading, setLoading] = useState(false);
  const [adminResult, setAdminResult] = useState<AdminModeResponse | null>(null);
  const [clientResult, setClientResult] = useState<ClientModeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Unified traffic + sales state & memory
  const [trafficReport, setTrafficReport] = useState<SimulatedDailyTrafficReport | null>(null);
  const [comparison, setComparison] = useState<ReportMemoryComparison | null>(null);
  const [lastSpokenType, setLastSpokenType] = useState<'smart' | 'forced_full'>('smart');

  // Voice narration state
  const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);
  const [isPausedVoice, setIsPausedVoice] = useState<boolean>(false);
  const [customVoice, setCustomVoice] = useState<SpeechSynthesisVoice | null>(() => getBestSpanishVoice());
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const startVoiceNarration = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = createNaturalSpeechUtterance(text, {
      voice: customVoice || getBestSpanishVoice(),
      onStart: () => {
        setIsPlayingVoice(true);
        setIsPausedVoice(false);
      },
      onEnd: () => {
        setIsPlayingVoice(false);
        setIsPausedVoice(false);
      },
      onError: () => {
        setIsPlayingVoice(false);
        setIsPausedVoice(false);
      }
    });

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pauseVoiceNarration = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPausedVoice(true);
    }
  };

  const resumeVoiceNarration = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      setIsPausedVoice(false);
    }
  };

  const stopVoiceNarration = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingVoice(false);
    setIsPausedVoice(false);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Client simulation state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [simulatedDwellTime, setSimulatedDwellTime] = useState<number>(140);
  const [simulatedClicks, setSimulatedClicks] = useState<number>(8);
  const [simulatedCartProductIds, setSimulatedCartProductIds] = useState<string[]>([]);
  const [simulatedViewedProductIds, setSimulatedViewedProductIds] = useState<string[]>([]);

  // Visual Simulation Center state
  const [rawJsonInput, setRawJsonInput] = useState<string>(() => JSON.stringify(SIMULATION_PRESETS[1].data, null, 2));
  const [rawJsonResponse, setRawJsonResponse] = useState<string | null>(null);
  const [rawJsonParsedData, setRawJsonParsedData] = useState<any | null>(null);
  const [rawJsonLatencyMs, setRawJsonLatencyMs] = useState<number | null>(null);
  const [rawJsonSchemaValid, setRawJsonSchemaValid] = useState<boolean | null>(null);
  const [rawJsonSchemaMode, setRawJsonSchemaMode] = useState<'cliente' | 'administrador' | 'seguridad' | 'desconocido'>('administrador');
  const [rawJsonActivePreset, setRawJsonActivePreset] = useState<string | null>('cierre_ventas');
  const [isPlayingPlaygroundVoice, setIsPlayingPlaygroundVoice] = useState<boolean>(false);

  // Initialize simulated products for client mode
  useEffect(() => {
    if (products.length > 0 && simulatedViewedProductIds.length === 0) {
      setSimulatedViewedProductIds(products.slice(0, 3).map(p => p.id));
      if (products.length > 3) {
        setSimulatedCartProductIds([products[1].id]);
      }
    }
  }, [products]);

  // Load Admin Mode Analysis on mount
  useEffect(() => {
    fetchAdminAnalysis();
  }, []);

  const fetchAdminAnalysis = async (forceRegenerate: boolean = false) => {
    setLoading(true);
    setErrorMsg(null);
    stopVoiceNarration();
    try {
      // Build aggregated metrics from simulated/current store state
      const traffic = forceRegenerate 
        ? generateDailyTrafficReport(products) 
        : getOrGenerateDailyTrafficReport(products);

      setTrafficReport(traffic);
      const comp = compareWithLastReport(traffic);
      setComparison(comp);

      const topItems = traffic.productos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        visitas: p.visitas,
        compras: p.compras
      }));

      const payload = {
        modo: "administrador",
        metricas: {
          conteos_visualizaciones: topItems,
          tasa_clics: "4.8%",
          carritos_abandonados: traffic.total_carritos_abandonados,
          compras_efectivas: traffic.total_compras,
          total_ingresos: traffic.total_ingresos,
          ticket_promedio: traffic.ticket_promedio,
          metodo_pago: traffic.metodo_pago_predominante
        }
      };

      const res = await fetch('/api/ai/commercemind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.resumen_estadistico && data.asistente_admin) {
        setAdminResult(data);
        saveReportMemory(traffic);
      } else {
        throw new Error('Formato inesperado devuelto por CommerceMind AI');
      }
    } catch (err: any) {
      console.error('Error fetching admin analysis:', err);
      setErrorMsg(err.message || 'Error al conectar con CommerceMind AI');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayVoice = (forceFull: boolean = false) => {
    if (!trafficReport || !comparison) return;
    setLastSpokenType(forceFull ? 'forced_full' : 'smart');
    const text = buildUnifiedSpeechScript(trafficReport, comparison, forceFull);
    startVoiceNarration(text);
    saveReportMemory(trafficReport);
    setComparison(compareWithLastReport(trafficReport));
  };

  const fetchClientAnalysis = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const viewedProducts = products.filter(p => simulatedViewedProductIds.includes(p.id));
      const cartProducts = products.filter(p => simulatedCartProductIds.includes(p.id));

      const payload = {
        modo: "cliente",
        historial_navegacion: {
          productos_visualizados: viewedProducts.map(p => ({
            id: p.id,
            nombre: p.title,
            precio: p.price,
            categoria: p.categoryName || 'General'
          })),
          categorias: Array.from(new Set(viewedProducts.map(p => p.categoryName || 'General'))),
          tiempo_permanencia_segundos: simulatedDwellTime,
          clics: simulatedClicks,
          items_carrito: cartProducts.map(p => ({
            id: p.id,
            nombre: p.title,
            precio: p.price
          }))
        },
        inventario: products.slice(0, 20).map(p => ({
          id_producto: p.id,
          sku: p.id,
          nombre: p.title,
          precio: p.price,
          categoria: p.categoryName || 'General'
        }))
      };

      const res = await fetch('/api/ai/commercemind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.intencion_detectada && Array.isArray(data.recomendaciones)) {
        setClientResult(data);
      } else {
        throw new Error('Formato no coincide con el esquema requerido para modo cliente');
      }
    } catch (err: any) {
      console.error('Error fetching client analysis:', err);
      setErrorMsg(err.message || 'Error al consultar modo cliente');
    } finally {
      setLoading(false);
    }
  };

  const executeRawJsonPlayground = async (customPayload?: any) => {
    setLoading(true);
    setErrorMsg(null);
    setRawJsonResponse(null);
    setRawJsonParsedData(null);
    setRawJsonLatencyMs(null);
    setRawJsonSchemaValid(null);
    stopPlaygroundVoice();

    const t0 = performance.now();
    try {
      let parsedInput;
      if (customPayload) {
        parsedInput = customPayload;
      } else {
        try {
          parsedInput = JSON.parse(rawJsonInput);
        } catch (jsonErr: any) {
          throw new Error('El JSON ingresado no es válido: ' + jsonErr.message);
        }
      }

      const res = await fetch('/api/ai/commercemind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedInput)
      });

      const t1 = performance.now();
      const elapsed = Math.round(t1 - t0);
      setRawJsonLatencyMs(elapsed);

      const data = await res.json();
      setRawJsonResponse(JSON.stringify(data, null, 2));
      setRawJsonParsedData(data);

      // Validate schema
      let valid = false;
      let detected: 'cliente' | 'administrador' | 'seguridad' | 'desconocido' = 'desconocido';

      if (data?.intencion_detectada && Array.isArray(data?.recomendaciones)) {
        valid = true;
        detected = 'cliente';
      } else if (data?.resumen_estadistico && data?.asistente_admin) {
        valid = true;
        detected = 'administrador';
      } else if (data?.alerta_seguridad && data?.centinela_defensivo) {
        valid = true;
        detected = 'seguridad';

        // Disparar Alerta Inmediata a WhatsApp Personal (+57 300 878 4427)
        try {
          fetch('/api/alerts/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'SECURITY_ALERT',
              account: 'admin-portal / 190.85.122.44',
              details: {
                failedAttempts: 47,
                ip: '190.85.122.44',
                reason: 'Ataque de fuerza bruta simulado en el Centinela de Seguridad.'
              }
            })
          }).then(r => r.json()).then(alertData => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('zavela_whatsapp_alert_triggered', { detail: alertData }));
            }
          }).catch(err => console.warn('Could not dispatch security alert to WhatsApp:', err));
        } catch {}
      }

      setRawJsonSchemaValid(valid);
      setRawJsonSchemaMode(detected);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al ejecutar prueba');
    } finally {
      setLoading(false);
    }
  };

  const [testingAlert, setTestingAlert] = useState<string | null>(null);

  const handleTriggerWhatsAppTest = async (testType: 'NEW_SALE' | 'SECURITY_ALERT' | 'LOW_STOCK') => {
    setTestingAlert(testType);
    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType })
      });
      const data = await res.json();
      if (data.success && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zavela_whatsapp_alert_triggered', { detail: data }));
      }
    } catch (err: any) {
      console.warn('Error testing alert:', err);
    } finally {
      setTestingAlert(null);
    }
  };

  const handlePlayPlaygroundVoice = () => {
    if (!rawJsonParsedData) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlayingPlaygroundVoice) {
      window.speechSynthesis.cancel();
      setIsPlayingPlaygroundVoice(false);
      return;
    }

    window.speechSynthesis.cancel();

    let speechScript = '';

    if (rawJsonSchemaMode === 'cliente') {
      speechScript = `Intención de compra detectada: ${rawJsonParsedData.intencion_detectada}. Te sugiero las siguientes recomendaciones prioritarias: `;
      if (Array.isArray(rawJsonParsedData.recomendaciones)) {
        rawJsonParsedData.recomendaciones.slice(0, 3).forEach((rec: any, idx: number) => {
          speechScript += `Opción ${idx + 1}: ${rec.nombre}. ${rec.mensaje_persuasivo}. `;
        });
      }
    } else if (rawJsonSchemaMode === 'administrador') {
      const diag = rawJsonParsedData.asistente_admin?.diagnostico_estrategico || '';
      speechScript = `Diagnóstico del copiloto de negocios: ${diag}. `;
      if (Array.isArray(rawJsonParsedData.asistente_admin?.acciones_sugeridas)) {
        speechScript += 'Plan táctico sugerido: ';
        rawJsonParsedData.asistente_admin.acciones_sugeridas.slice(0, 2).forEach((act: any) => {
          speechScript += `En el área de ${act.area}: ${act.accion}. Impacto proyectado: ${act.impacto_esperado}. `;
        });
      }
    } else if (rawJsonSchemaMode === 'seguridad') {
      const alerta = rawJsonParsedData.alerta_seguridad;
      const centinela = rawJsonParsedData.centinela_defensivo;
      speechScript = `Alerta del Centinela de Seguridad. Nivel de amenaza ${alerta?.nivel_amenaza || 'Crítico'}. Ataque detectado: ${alerta?.tipo_ataque || 'Fuerza bruta'}. ${centinela?.diagnostico_estrategico || ''}. Medidas defensivas aplicadas con éxito.`;
    } else {
      speechScript = 'Respuesta estructurada recibida de CommerceMind AI. Revisa los detalles en pantalla.';
    }

    const utterance = createNaturalSpeechUtterance(speechScript, {
      voice: customVoice || getBestSpanishVoice(),
      onStart: () => setIsPlayingPlaygroundVoice(true),
      onEnd: () => setIsPlayingPlaygroundVoice(false),
      onError: () => setIsPlayingPlaygroundVoice(false)
    });

    window.speechSynthesis.speak(utterance);
  };

  const stopPlaygroundVoice = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingPlaygroundVoice(false);
    }
  };

  const handleCopyRawResponse = () => {
    if (rawJsonResponse) {
      navigator.clipboard.writeText(rawJsonResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Motor Dual Central de Inteligencia
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              CommerceMind AI
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold">
                Online (Gemini 3.8)
              </span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Motor central para <strong>personalización en tiempo real del comprador</strong> y <strong>copiloto estratégico de negocios</strong> para el administrador de Zavela Store.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  generateDailyTrafficReport(products);
                  fetchAdminAnalysis();
                }}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs sm:text-sm border border-indigo-500/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Generar nuevas cifras aleatorias de tráfico diario"
              >
                <Shuffle className="w-4 h-4 text-indigo-400" />
                <span>Simular Tráfico</span>
              </button>
            )}

            <button
              onClick={() => {
                if (activeTab === 'admin') fetchAdminAnalysis();
                if (activeTab === 'cliente') fetchClientAnalysis();
                if (activeTab === 'raw_json') executeRawJsonPlayground();
              }}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analizando...' : 'Ejecutar Análisis'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Brain className="w-4 h-4" />
            1. Modo Administrador (Copiloto de Negocios)
          </button>
          <button
            onClick={() => {
              setActiveTab('cliente');
              if (!clientResult) fetchClientAnalysis();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'cliente'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-4 h-4" />
            2. Modo Cliente (Recomendador en Tiempo Real)
          </button>
          <button
            onClick={() => setActiveTab('raw_json')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'raw_json'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            3. Probador de Entrada y JSON Estricto
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: MODO ADMINISTRADOR */}
      {/* ========================================================================= */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          {/* Memory Status Banner */}
          {comparison && (
            <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
              comparison.mode === 'no_changes'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : comparison.mode === 'delta_updates'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
            }`}>
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 shrink-0 text-current" />
                <div>
                  <span className="font-bold block">
                    {comparison.mode === 'no_changes' && 'Ya estás al día con el informe anterior'}
                    {comparison.mode === 'delta_updates' && '¡Hay novedades desde tu última revisión!'}
                    {comparison.mode === 'initial_full' && 'Balance consolidado de tráfico y facturación'}
                  </span>
                  <span className="text-xs opacity-85">
                    {comparison.mode === 'no_changes' && (
                      <>Seguimos con <strong>{trafficReport?.total_pedidos} pedidos</strong> por <strong>{formatCOP(trafficReport?.total_ingresos || 0)}</strong> sin cambios significativos.</>
                    )}
                    {comparison.mode === 'delta_updates' && (
                      <>Se registraron <strong>+{comparison.deltaPedidos} ventas adicionales</strong> ({formatCOP(comparison.deltaIngresos)}) y <strong>+{comparison.deltaVisitas} visitas</strong>.</>
                    )}
                    {comparison.mode === 'initial_full' && (
                      <>Consolidando visitas de catálogo, pedidos cerrados e ingresos del día para Colombia.</>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePlayVoice(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
                  <span>Forzar lectura completa</span>
                </button>
              </div>
            </div>
          )}

          {/* Executive Strategic Diagnosis with Voice Controls */}
          {adminResult?.asistente_admin && (
            <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <Brain className="w-4 h-4" />
                  Diagnóstico Estratégico del Copiloto
                </div>

                {/* Voice narration controls & voice selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <AssistantVoiceSelector 
                    onVoiceChange={(v) => setCustomVoice(v)} 
                    theme="dark" 
                  />

                  {!isPlayingVoice ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePlayVoice(false)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>
                          {comparison?.mode === 'no_changes' ? 'Escuchar estado actual' : 'Escuchar resumen'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePlayVoice(true)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-700"
                        title="Narrar balance completo"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="hidden sm:inline">Lectura completa</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {isPausedVoice ? (
                        <button
                          type="button"
                          onClick={resumeVoiceNarration}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Reanudar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={pauseVoiceNarration}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Pause className="w-3 h-3 fill-white" />
                          <span>Pausar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={stopVoiceNarration}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Square className="w-3 h-3 fill-slate-300" />
                        <span>Detener</span>
                      </button>

                      <div className="flex items-center gap-0.5 px-2 py-1 bg-indigo-950/80 rounded-md border border-indigo-500/30">
                        <span className="w-1 h-3 bg-indigo-400 rounded-full animate-pulse" />
                        <span className="w-1 h-4 bg-indigo-400 rounded-full animate-pulse delay-75" />
                        <span className="w-1 h-2 bg-indigo-400 rounded-full animate-pulse delay-150" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-white text-base sm:text-lg font-medium leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                "{adminResult.asistente_admin.diagnostico_estrategico}"
              </p>
            </div>
          )}

          {/* Unified KPI Cards: Tráfico + Ventas */}
          {trafficReport && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Ingresos del Día</span>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {formatCOP(trafficReport.total_ingresos)}
                </div>
                <span className="text-[11px] text-slate-400 mt-2">Facturación proyectada</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Pedidos Confirmados</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {trafficReport.total_pedidos}
                </div>
                <span className="text-[11px] text-indigo-300 mt-2">Ticket prom: {formatCOP(trafficReport.ticket_promedio)}</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-sky-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Visualizaciones</span>
                  <Eye className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {trafficReport.total_visualizaciones}
                </div>
                <span className="text-[11px] text-slate-400 mt-2">Permanencia: {trafficReport.tiempo_promedio_general_segundos}s</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <span>Tasa Conversión</span>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black font-mono text-purple-400">
                  {trafficReport.tasa_conversion_promedio}
                </div>
                <span className="text-[11px] text-amber-400 mt-2">{trafficReport.total_carritos_abandonados} carritos por rescatar</span>
              </div>
            </div>
          )}

          {/* Key Stats: Side by Side (Top Tráfico vs Top Facturación) */}
          {trafficReport && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Visualizados & Atención */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    Top Tráfico: Productos Más Vistos
                  </h2>
                  <span className="text-xs text-slate-400 font-semibold">Vistas / Tiempo</span>
                </div>

                <div className="divide-y divide-slate-800">
                  {trafficReport.productos_top_visitas.slice(0, 5).map((item, idx) => (
                    <div key={item.id || idx} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-black flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="text-sm font-semibold text-white truncate">{item.nombre}</div>
                          <div className="text-xs text-slate-400">
                            {item.visitas} vistas • {item.tiempo_promedio_segundos}s prom.
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.conversionNum === 0
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {item.compras} ventas ({item.conversion_tasa})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Facturación & Ingresos Generados */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Top Facturación: Mayores Ingresos (COP)
                  </h2>
                  <span className="text-xs text-emerald-400 font-semibold font-mono">Ingreso Total</span>
                </div>

                <div className="divide-y divide-slate-800">
                  {trafficReport.productos_top_ingresos.slice(0, 5).map((item, idx) => (
                    <div key={item.id || idx} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="text-sm font-semibold text-white truncate">{item.nombre}</div>
                          <div className="text-xs text-slate-400">
                            {item.compras} pedidos cerrados a {formatCOP(item.precio)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold font-mono text-emerald-400 block">
                          {formatCOP(item.ingresos_generados)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.conversion_tasa} conv.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Relación Visitas vs. Ventas: Producto Estrella & Fricción de Compra */}
          {trafficReport && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Relación Visitas vs. Ventas: Producto Estrella & Oportunidad
                </h2>
                <span className="text-xs font-mono text-indigo-300">Análisis Predictivo</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Producto Estrella */}
                {(() => {
                  const star = trafficReport.productos.find(p => p.es_estrella) || trafficReport.productos[0];
                  if (!star) return null;
                  return (
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Award className="w-3 h-3" /> ★ Producto Estrella (Alta Facturación)
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {formatCOP(star.ingresos_generados)}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{star.nombre}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Lidera el catálogo con {star.visitas} visualizaciones y {star.compras} compras completadas. Representa el motor de ventas principal del día.
                      </p>
                    </div>
                  );
                })()}

                {/* Producto con Fricción */}
                {(() => {
                  const friction = trafficReport.productos.find(p => p.es_friccion) || trafficReport.productos[1];
                  if (!friction) return null;
                  return (
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> ⚠️ Fricción: Muchas Vistas, Pocas Compras
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {friction.conversion_tasa} conv.
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{friction.nombre}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Retiene {friction.visitas} visualizaciones con solo {friction.compras} compras. Se aconseja probar combo promocional con envío gratis para convertir el tráfico.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Key Findings (Hallazgos Clave) */}
          {adminResult?.resumen_estadistico?.hallazgos_clave && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Hallazgos Clave de Conducta y Fricciones
                </h2>
                <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Insights Detectados
                </span>
              </div>

              <div className="space-y-3">
                {adminResult.resumen_estadistico.hallazgos_clave.map((insight, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Flame className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-normal">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Suggestions (Acciones Sugeridas: Precio, Marketing, Inventario) */}
          {adminResult?.asistente_admin?.acciones_sugeridas && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                Acciones Sugeridas por CommerceMind AI
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {adminResult.asistente_admin.acciones_sugeridas.map((act, idx) => {
                  let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                  let icon = <Tag className="w-4 h-4" />;
                  if (act.area.toLowerCase().includes('precio')) {
                    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                    icon = <DollarSign className="w-4 h-4" />;
                  } else if (act.area.toLowerCase().includes('marketing')) {
                    badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                    icon = <Flame className="w-4 h-4" />;
                  } else if (act.area.toLowerCase().includes('inventario')) {
                    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                    icon = <Package className="w-4 h-4" />;
                  }

                  return (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${badgeColor}`}>
                            {icon}
                            Área: {act.area}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-white leading-snug">
                          {act.accion}
                        </h3>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                          Impacto Proyectado
                        </div>
                        <p className="text-xs text-emerald-400 font-medium">
                          {act.impacto_esperado}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MODO CLIENTE */}
      {/* ========================================================================= */}
      {activeTab === 'cliente' && (
        <div className="space-y-6">
          {/* Simulation Config Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              Simular Sesión de Comprador Activo
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Tiempo de Permanencia (segundos)
                </label>
                <input
                  type="number"
                  value={simulatedDwellTime}
                  onChange={e => setSimulatedDwellTime(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Clics en la Sesión
                </label>
                <input
                  type="number"
                  value={simulatedClicks}
                  onChange={e => setSimulatedClicks(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchClientAnalysis}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? 'Analizando Intención...' : 'Predecir Intención'}
                </button>
              </div>
            </div>

            {/* Select Viewed Products for Simulation */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400">
                Productos Visualizados en la Sesión (Haz clic para alternar):
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                {products.slice(0, 15).map(p => {
                  const isSelected = simulatedViewedProductIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSimulatedViewedProductIds(simulatedViewedProductIds.filter(id => id !== p.id));
                        } else {
                          setSimulatedViewedProductIds([...simulatedViewedProductIds, p.id]);
                        }
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all truncate max-w-xs ${
                        isSelected
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '} {p.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results for Client Mode */}
          {clientResult && (
            <div className="space-y-6">
              {/* Detected Intention Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/40 shadow-xl">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
                  <Brain className="w-4 h-4" />
                  Intención de Compra Deducida
                </div>
                <div className="text-lg sm:text-xl font-bold text-white flex items-center gap-3">
                  "{clientResult.intencion_detectada}"
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  Recomendaciones Personalizadas Generadas ({clientResult.recomendaciones?.length || 0})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {clientResult.recomendaciones.map((rec, idx) => {
                    const foundProd = products.find(p => p.id === rec.id_producto || p.title === rec.nombre);
                    return (
                      <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/50 transition-all shadow-lg">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] px-2.5 py-1 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold">
                              {rec.tipo_sugerencia}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {rec.id_producto}
                            </span>
                          </div>

                          <div className="font-bold text-white text-base leading-snug">
                            {rec.nombre}
                          </div>

                          {foundProd && (
                            <div className="text-sm font-black text-emerald-400">
                              {formatCOP(foundProd.price)}
                            </div>
                          )}

                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                              Mensaje Persuasivo para Interfaz:
                            </div>
                            <p className="text-xs text-indigo-200 italic">
                              "{rec.mensaje_persuasivo}"
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs text-slate-400">Pago Contra Entrega</span>
                          <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                            Listo para inyectar <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROBADOR DE ENTRADA Y JSON ESTRICTO (CENTRO DE SIMULACIÓN VISUAL) */}
      {/* ========================================================================= */}
      {activeTab === 'raw_json' && (
        <div className="space-y-6">
          {/* Header & Presets Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-1 border border-indigo-500/30">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Centro de Simulación Visual Avanzado
                </div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-400" />
                  Consola de Pruebas & Inspector de Rendimiento JSON
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ejecuta simulaciones en tiempo real de compradores, cierres de ventas, fricciones de conversión o defensa perimetral del Centinela.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">Modo activo:</span>
                <span className="px-2.5 py-1 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold">
                  {rawJsonActivePreset ? SIMULATION_PRESETS.find(p => p.id === rawJsonActivePreset)?.badge || 'Personalizado' : 'Personalizado'}
                </span>
              </div>
            </div>

            {/* NOTIFICACIONES AUTOMÁTICAS A WHATSAPP PERSONAL (+57 300 878 4427) */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-950 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    Canal Privado de Alertas del Copiloto
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                    +57 300 878 4427
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed max-w-xl">
                  Canal confidencial para el Administrador: Meta Cloud API en servidor + enlace directo para WhatsApp Web ante <strong>Órdenes por Aprobar</strong>, <strong>Bloqueos del Centinela</strong> o <strong>Quiebres de Stock</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => handleTriggerWhatsAppTest('NEW_SALE')}
                  disabled={Boolean(testingAlert)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Probar notificación de orden por aprobar"
                >
                  <ShoppingBag className="w-3 h-3 text-emerald-400" />
                  <span>{testingAlert === 'NEW_SALE' ? 'Enviando...' : 'Probar Orden'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerWhatsAppTest('SECURITY_ALERT')}
                  disabled={Boolean(testingAlert)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Probar alerta de seguridad del centinela"
                >
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>{testingAlert === 'SECURITY_ALERT' ? 'Enviando...' : 'Probar Seguridad'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerWhatsAppTest('LOW_STOCK')}
                  disabled={Boolean(testingAlert)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Probar alerta de quiebre de stock"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>{testingAlert === 'LOW_STOCK' ? 'Enviando...' : 'Probar Stock'}</span>
                </button>

                <a
                  href="https://wa.me/573008784427"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  title="Abrir chat directo con +57 300 878 4427"
                >
                  <MessageSquare className="w-3 h-3 fill-white" />
                  <span>Abrir WhatsApp</span>
                </a>
              </div>
            </div>

            {/* 4 PRESETS RÁPIDOS INTERACTIVOS */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Presets Rápidos Interactivos (1 Clic para Cargar y Simular):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {SIMULATION_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = rawJsonActivePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setRawJsonActivePreset(preset.id);
                        setRawJsonInput(JSON.stringify(preset.data, null, 2));
                        executeRawJsonPlayground(preset.data);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group active:scale-[0.98] ${
                        isSelected
                          ? 'bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                      title={`Cargar ${preset.title}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${preset.badgeColor}`}>
                            {preset.badge}
                          </span>
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-1">
                          {preset.title}
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-indigo-400 font-semibold">
                        <span>{isSelected ? '✓ Activo' : 'Cargar Preset'}</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Editor and Visual Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-slate-800">
              {/* Left Column: Input Payload Editor */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="raw-json-textarea" className="block text-xs font-bold text-slate-400">
                      Payload de Entrada (POST a /api/ai/commercemind)
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">JSON Editable</span>
                  </div>

                  <div className="relative">
                    <textarea
                      id="raw-json-textarea"
                      rows={18}
                      value={rawJsonInput}
                      onChange={e => {
                        setRawJsonInput(e.target.value);
                        setRawJsonActivePreset(null);
                      }}
                      className="w-full p-4 bg-slate-950 font-mono text-xs text-indigo-300 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 leading-relaxed resize-y selection:bg-indigo-900/60"
                      placeholder="Pega o edita el payload JSON aquí..."
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => executeRawJsonPlayground()}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Consultando CommerceMind AI...' : 'Enviar Solicitud a CommerceMind AI'}</span>
                </button>
              </div>

              {/* Right Column: Visual Simulation Center & Performance Inspector */}
              <div className="lg:col-span-7">
                <SimulationResponseVisualizer
                  data={rawJsonParsedData}
                  rawJson={rawJsonResponse}
                  latencyMs={rawJsonLatencyMs}
                  schemaValid={rawJsonSchemaValid}
                  schemaMode={rawJsonSchemaMode}
                  onPlayAudio={handlePlayPlaygroundVoice}
                  isPlayingAudio={isPlayingPlaygroundVoice}
                  onVoiceChange={(v) => setCustomVoice(v)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
