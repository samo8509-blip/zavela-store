import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Timer, 
  Volume2, 
  Square, 
  Copy, 
  Check, 
  Brain, 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  ShoppingBag, 
  Tag, 
  Sparkles, 
  Activity, 
  Compass, 
  Layers, 
  Code2, 
  Play, 
  Lock, 
  UserCheck, 
  Flame, 
  Eye, 
  ChevronRight,
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { formatCOP } from '../../utils/formatters.ts';
import { AssistantVoiceSelector } from './AssistantVoiceSelector.tsx';

interface SimulationResponseVisualizerProps {
  data: any | null;
  rawJson: string | null;
  latencyMs: number | null;
  schemaValid: boolean | null;
  schemaMode: 'cliente' | 'administrador' | 'seguridad' | 'desconocido';
  onPlayAudio: () => void;
  isPlayingAudio: boolean;
  onVoiceChange?: (voice: SpeechSynthesisVoice) => void;
}

export const SimulationResponseVisualizer: React.FC<SimulationResponseVisualizerProps> = ({
  data,
  rawJson,
  latencyMs,
  schemaValid,
  schemaMode,
  onPlayAudio,
  isPlayingAudio,
  onVoiceChange
}) => {
  const [activeView, setActiveView] = useState<'visual' | 'code'>('visual');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (rawJson) {
      navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenWhatsAppReport = () => {
    let reportText = '';
    if (schemaMode === 'seguridad') {
      reportText = `🛡️ ALERTA DE SEGURIDAD - ZAVELA STORE
Atención: Se detectaron múltiples intentos fallidos o sospechosos hacia la cuenta admin-portal / 190.85.122.44. El centinela ha bloqueado temporalmente el acceso para proteger los datos.
• Diagnóstico: ${data?.centinela_defensivo?.diagnostico_estrategico || 'Intento de fuerza bruta detectado y mitigado.'}`;
    } else if (schemaMode === 'administrador') {
      reportText = `🚨 REPORTE DE VENTAS Y TRÁFICO - ZAVELA STORE
• Diagnóstico: ${data?.asistente_admin?.diagnostico_estrategico || 'Consolidado diario en orden.'}
• Impacto esperado: ${data?.asistente_admin?.acciones_sugeridas?.[0]?.impacto_esperado || 'Optimización continua.'}`;
    } else {
      reportText = `🛍️ REPORTE IA CLIENTE - ZAVELA STORE
• Intención: ${data?.intencion_detectada || 'Interés en productos'}
• Recomendaciones: ${(data?.recomendaciones || []).map((r: any) => r.nombre).join(', ')}`;
    }

    const url = `https://wa.me/573008784427?text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!data && !rawJson) {
    return (
      <div className="h-[420px] rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
          <Brain className="w-7 h-7" />
        </div>
        <h4 className="text-sm font-bold text-white mb-1">
          Centro de Simulación Visual Listo
        </h4>
        <p className="text-xs text-slate-400 max-w-sm">
          Selecciona uno de los 4 presets rápidos arriba y haz clic en <strong>"Enviar Solicitud a CommerceMind AI"</strong> para visualizar el diagnóstico interactivo, el inspector de latencia y la narración por voz.
        </p>
      </div>
    );
  }

  // Latency rating
  let latencyBadge = { label: 'Ultrarrápida', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  if (latencyMs && latencyMs > 2500) {
    latencyBadge = { label: 'Estándar', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  } else if (latencyMs && latencyMs > 1000) {
    latencyBadge = { label: 'Fluida', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* 1. INSPECTOR DE RENDIMIENTO DE LA IA (LATENCIA + SCHEMA VALIDATION + AUDIO) */}
      <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800/90 flex flex-col gap-3">
        {/* Top metrics bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Latency badge */}
            <div className={`px-2.5 py-1 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-1.5 ${latencyBadge.color}`}>
              <Zap className="w-3.5 h-3.5" />
              <span>Latencia: <strong>{latencyMs !== null ? `${latencyMs} ms` : 'En cálculo...'}</strong></span>
              <span className="hidden sm:inline opacity-70 font-sans">• {latencyBadge.label}</span>
            </div>

            {/* Strict Schema Validation Indicator */}
            {schemaValid !== null && (
              <div className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
                schemaValid 
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}>
                {schemaValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>JSON Estricto Válido</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Estructura Incompleta</span>
                  </>
                )}
              </div>
            )}

            {/* Detected Mode Pill */}
            <div className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span>Modo: {
                schemaMode === 'cliente' ? 'Cliente (Recomendador)' :
                schemaMode === 'administrador' ? 'Admin (Copiloto de Negocios)' :
                schemaMode === 'seguridad' ? 'Centinela de Seguridad' : 'Personalizado'
              }</span>
            </div>
          </div>

          {/* View switcher & Voice trigger */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              type="button"
              onClick={handleOpenWhatsAppReport}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Abrir chat en WhatsApp Web con reporte para +57 300 878 4427"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-white" />
              <span className="hidden sm:inline">WhatsApp (+57 300 878 4427)</span>
              <span className="sm:hidden">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onPlayAudio}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isPlayingAudio
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
              }`}
              title="Escuchar la respuesta narrada con la voz femenina calibrada"
            >
              {isPlayingAudio ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Detener Voz</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Escuchar Respuesta (Voz Femenina)</span>
                </>
              )}
            </button>

            {/* Visual vs Code tab buttons */}
            <div className="inline-flex rounded-xl bg-slate-800/80 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveView('visual')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeView === 'visual'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vista Previa Gráfica</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('code')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeView === 'code'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>JSON Crudo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Voice selector helper in header */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-sky-400" />
            <span>Calibración: <strong>Velocidad 0.93x</strong> • <strong>Tono 1.08</strong> (Femenino natural)</span>
          </span>
          {onVoiceChange && (
            <AssistantVoiceSelector onVoiceChange={onVoiceChange} theme="dark" />
          )}
        </div>
      </div>

      {/* 2. BODY CONTENT: VISTA PREVIA GRÁFICA vs JSON CRUDO */}
      <div className="p-4 sm:p-5 max-h-[580px] overflow-y-auto">
        {activeView === 'code' ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 font-mono">Payload JSON de salida:</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado al portapapeles' : 'Copiar JSON'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800 rounded-xl overflow-x-auto leading-relaxed selection:bg-emerald-900/50">
              {rawJson}
            </pre>
          </div>
        ) : (
          /* VISTA PREVIA GRÁFICA */
          <div className="space-y-4">
            {/* ============================================================== */}
            {/* CASO A: MODO CLIENTE (Recomendaciones en tiempo real) */}
            {/* ============================================================== */}
            {schemaMode === 'cliente' && data && (
              <div className="space-y-4 animate-fadeIn">
                {/* Intención Hero Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/30 shadow-md">
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    <span>Intención de Compra Detectada por IA</span>
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                    "{data.intencion_detectada}"
                  </p>
                </div>

                {/* Grid de Recomendaciones */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Recomendaciones Personalizadas para el Comprador ({data.recomendaciones?.length || 0})</span>
                    </h5>
                    <span className="text-[11px] text-slate-500 font-mono">Modo Cliente</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {Array.isArray(data.recomendaciones) && data.recomendaciones.map((rec: any, idx: number) => {
                      const tipo = (rec.tipo_sugerencia || 'Recomendación').toLowerCase();
                      let badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
                      if (tipo.includes('cruzad') || tipo.includes('cross')) badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                      else if (tipo.includes('complement')) badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
                      else if (tipo.includes('alternat')) badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                      else if (tipo.includes('tendenc')) badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/40';

                      return (
                        <div 
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm group"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${badgeColor}`}>
                                {rec.tipo_sugerencia || 'Sugerencia'}
                              </span>
                              {rec.id_producto && (
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                                  {rec.id_producto}
                                </span>
                              )}
                            </div>

                            <h6 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors mb-2">
                              {rec.nombre}
                            </h6>

                            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 italic mb-2">
                              "{rec.mensaje_persuasivo}"
                            </div>
                          </div>

                          {rec.precio && (
                            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                              <span className="text-slate-400">Precio estimado:</span>
                              <span className="font-mono font-black text-emerald-400">{formatCOP(rec.precio)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* CASO B: MODO ADMINISTRADOR (Diagnóstico & Copiloto) */}
            {/* ============================================================== */}
            {schemaMode === 'administrador' && data && (
              <div className="space-y-4 animate-fadeIn">
                {/* Diagnóstico Estratégico */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/30 shadow-md">
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    <span>Diagnóstico Estratégico del Copiloto de Negocios</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {data.asistente_admin?.diagnostico_estrategico || data.diagnostico || 'Diagnóstico consolidado del catálogo y tráfico.'}
                  </p>
                </div>

                {/* Hallazgos Clave */}
                {Array.isArray(data.resumen_estadistico?.hallazgos_clave) && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                      <span>Hallazgos Clave de Tráfico & Conversión</span>
                    </h5>
                    <ul className="space-y-2">
                      {data.resumen_estadistico.hallazgos_clave.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Top Visualizados & Fricciones */}
                {Array.isArray(data.resumen_estadistico?.top_visualizados) && data.resumen_estadistico.top_visualizados.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rendimiento por Producto del Catálogo</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {data.resumen_estadistico.top_visualizados.map((prod: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                              <span>#{idx + 1} SKU</span>
                              <span className="text-sky-400 font-bold">{prod.visitas || 0} vistas</span>
                            </div>
                            <h6 className="text-xs font-bold text-white mb-2 line-clamp-2">
                              {prod.nombre || prod.id}
                            </h6>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                            <span className="text-slate-400">Conversión:</span>
                            <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                              parseFloat(prod.conversion_tasa || '0') > 3 
                                ? 'bg-emerald-500/20 text-emerald-300' 
                                : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {prod.conversion_tasa || '0%'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones Sugeridas */}
                {Array.isArray(data.asistente_admin?.acciones_sugeridas) && (
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Plan de Acción Táctico Inmediato</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.asistente_admin.acciones_sugeridas.map((acc: any, idx: number) => {
                        const area = (acc.area || 'Operación').toLowerCase();
                        let areaColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
                        if (area.includes('precio') || area.includes('oferta')) areaColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                        else if (area.includes('market') || area.includes('pauta')) areaColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
                        else if (area.includes('inventar') || area.includes('stock')) areaColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                        return (
                          <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                            <div>
                              <div className="mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${areaColor}`}>
                                  {acc.area || 'Estrategia'}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-white mb-2 leading-relaxed">
                                {acc.accion}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span><strong>Impacto:</strong> {acc.impacto_esperado}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* CASO C: MODO CENTINELA DE SEGURIDAD (Defensa & Ataque) */}
            {/* ============================================================== */}
            {schemaMode === 'seguridad' && data && (
              <div className="space-y-4 animate-fadeIn">
                {/* Alerta de Seguridad Perimetral */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/90 border border-rose-500/40 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center animate-pulse">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold block">
                          CENTINELA DEFENSIVO ZAVELA
                        </span>
                        <h4 className="text-sm font-black text-white">
                          {data.alerta_seguridad?.tipo_ataque || 'Intento de Vulneración Neutralizado'}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black uppercase bg-rose-500/30 text-rose-200 border border-rose-400">
                        Amenaza: {data.alerta_seguridad?.nivel_amenaza || 'CRÍTICO'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {data.alerta_seguridad?.estado_bloqueo || 'BLOQUEADO'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-slate-400 text-[10px] font-mono block">IP / RANGO ATACANTE:</span>
                      <code className="text-rose-300 font-mono font-bold text-xs">{data.alerta_seguridad?.ip_origen || '190.85.122.44'}</code>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-slate-400 text-[10px] font-mono block">ESTADO DEL PERÍMETRO:</span>
                      <span className="text-emerald-300 font-bold text-xs">✓ Tráfico Legítimo 100% Protegido</span>
                    </div>
                  </div>
                </div>

                {/* Diagnóstico Táctico del Centinela */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Evaluación Táctica del Centinela de Seguridad</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {data.centinela_defensivo?.diagnostico_estrategico || 'Intento de fuerza bruta aislado. El perímetro se encuentra blindado.'}
                  </p>
                </div>

                {/* Contramedidas Aplicadas */}
                {Array.isArray(data.centinela_defensivo?.contramedidas_aplicadas) && (
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Contramedidas Defensivas Aplicadas Automáticamente</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {data.centinela_defensivo.contramedidas_aplicadas.map((cm: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                          <div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase mb-2 inline-block">
                              {cm.area || 'Protección'}
                            </span>
                            <p className="text-xs font-semibold text-white mb-2 leading-relaxed">
                              {cm.accion}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{cm.impacto_esperado}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* CASO D: GENÉRICO / DESCONOCIDO */}
            {/* ============================================================== */}
            {schemaMode === 'desconocido' && data && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <span>Respuesta Estructurada Recibida</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {typeof data === 'object' ? (
                    <div className="space-y-2">
                      {Object.entries(data).map(([k, v]) => (
                        <div key={k} className="border-b border-slate-800/60 pb-1.5 last:border-0">
                          <span className="font-mono text-indigo-300 font-bold block">{k}:</span>
                          <span className="text-slate-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    String(data)
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
