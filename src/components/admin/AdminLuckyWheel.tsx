import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Gift,
  Clock,
  Percent,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Calendar,
  Zap,
  Flame,
  Check,
  Palette,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { 
  StoreSettings, 
  LuckyWheelSettings, 
  LuckyWheelSeasonPreset, 
  WheelDiscountSegment 
} from '../../types/index.ts';
import { 
  DEFAULT_LUCKY_WHEEL_SETTINGS, 
  SEASONAL_PRESETS, 
  getActiveLuckyWheelSettings 
} from '../../utils/luckyWheelPresets.ts';

interface AdminLuckyWheelProps {
  settings: StoreSettings;
  onSaveSettings: (updatedSettings: Partial<StoreSettings>) => Promise<void>;
}

export const AdminLuckyWheel: React.FC<AdminLuckyWheelProps> = ({
  settings,
  onSaveSettings
}) => {
  const [wheelConfig, setWheelConfig] = useState<LuckyWheelSettings>(() => {
    return getActiveLuckyWheelSettings(settings.luckyWheel);
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'seasons' | 'timing' | 'discounts' | 'texts' | 'preview'>('seasons');

  // Preview Simulator State
  const [previewRotation, setPreviewRotation] = useState(0);
  const [isPreviewSpinning, setIsPreviewSpinning] = useState(false);
  const [previewWinner, setPreviewWinner] = useState<WheelDiscountSegment | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state if settings prop changes externally
  useEffect(() => {
    if (settings.luckyWheel) {
      setWheelConfig(getActiveLuckyWheelSettings(settings.luckyWheel));
    }
  }, [settings.luckyWheel]);

  // Draw wheel in preview canvas
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 10;

    ctx.clearRect(0, 0, width, height);

    const segments = wheelConfig.segments || [];
    const numSegs = Math.max(segments.length, 1);
    const segAngle = 360 / numSegs;

    segments.forEach((seg, i) => {
      const startAngle = (i * segAngle - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * segAngle - 90) * (Math.PI / 180);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color || '#0284c7';
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + (segAngle / 2) * (Math.PI / 180));
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.textColor || '#ffffff';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;
      ctx.fillText(seg.label || `${seg.percentage}% OFF`, radius - 16, 5);
      ctx.restore();
    });

    // Outer Rim with Accent Color
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = wheelConfig.seasonAccentColor || '#f59e0b';
    ctx.stroke();

    // Outer LED lights
    const numStuds = Math.max(16, segments.length * 3);
    for (let i = 0; i < numStuds; i++) {
      const dotAngle = (i * (360 / numStuds)) * (Math.PI / 180);
      const dotX = centerX + (radius - 4) * Math.cos(dotAngle);
      const dotY = centerY + (radius - 4) * Math.sin(dotAngle);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : (wheelConfig.seasonAccentColor || '#fde047');
      ctx.fill();
    }

    // Center Hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = wheelConfig.seasonAccentColor || '#f59e0b';
    ctx.stroke();

    // Center Dot / Icon
    ctx.beginPath();
    ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
    ctx.fillStyle = wheelConfig.seasonAccentColor || '#f59e0b';
    ctx.fill();
  }, [wheelConfig]);

  // Redraw when activeTab changes to preview or when config changes
  useEffect(() => {
    if (activeTab === 'preview') {
      const timer = setTimeout(() => {
        drawWheel();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, drawWheel]);

  // Test spin simulator with realistic deceleration and forward accumulation
  const handleTestSpin = () => {
    if (isPreviewSpinning || wheelConfig.segments.length === 0) return;

    setIsPreviewSpinning(true);
    setPreviewWinner(null);

    const segments = wheelConfig.segments;
    const randomIndex = Math.floor(Math.random() * segments.length);
    const chosenSegment = segments[randomIndex];

    const segAngle = 360 / segments.length;
    const segmentCenter = randomIndex * segAngle + segAngle / 2;
    const extraSpins = 360 * 6; // 6 full turns
    
    setPreviewRotation(prev => {
      const currentMod = prev % 360;
      let needed = (360 - segmentCenter) - currentMod;
      if (needed < 0) needed += 360;
      return prev + extraSpins + needed;
    });

    const spinDuration = (wheelConfig.spinDurationSeconds || 4.5) * 1000;

    setTimeout(() => {
      setIsPreviewSpinning(false);
      setPreviewWinner(chosenSegment);

      // Celebrate in simulator
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.warn(e);
      }
    }, spinDuration);
  };

  // Apply Season Preset
  const handleSelectSeason = (presetKey: LuckyWheelSeasonPreset) => {
    const preset = SEASONAL_PRESETS[presetKey];
    if (!preset) return;

    setWheelConfig(prev => ({
      ...prev,
      activeSeason: presetKey,
      seasonName: preset.name,
      seasonTagline: preset.tagline,
      seasonAccentColor: preset.accentColor,
      seasonBadgeEmoji: preset.emoji,
      title: preset.title,
      subtitle: preset.subtitle,
      badgeText: preset.badgeText,
      segments: preset.segments
    }));
  };

  // Update specific field
  const updateField = <K extends keyof LuckyWheelSettings>(key: K, value: LuckyWheelSettings[K]) => {
    setWheelConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Segment editing
  const handleUpdateSegment = (index: number, updated: Partial<WheelDiscountSegment>) => {
    setWheelConfig(prev => {
      const newSegs = [...prev.segments];
      newSegs[index] = { ...newSegs[index], ...updated };
      return { ...prev, segments: newSegs };
    });
  };

  const handleAddSegment = () => {
    if (wheelConfig.segments.length >= 10) {
      alert('Se recomienda un máximo de 8 a 10 segmentos para asegurar legibilidad en móviles.');
      return;
    }
    const newId = `seg-${Date.now()}`;
    const newSegment: WheelDiscountSegment = {
      id: newId,
      label: '10% EXTRA',
      percentage: 10,
      color: '#0d9488',
      textColor: '#ffffff',
      couponPrefix: 'EXTRA10'
    };
    setWheelConfig(prev => ({
      ...prev,
      segments: [...prev.segments, newSegment]
    }));
  };

  const handleDeleteSegment = (index: number) => {
    if (wheelConfig.segments.length <= 3) {
      alert('La ruleta requiere al menos 3 segmentos para operar correctamente.');
      return;
    }
    setWheelConfig(prev => ({
      ...prev,
      segments: prev.segments.filter((_, i) => i !== index)
    }));
  };

  const handleResetDefaultSegments = () => {
    if (confirm('¿Deseas restablecer los segmentos y colores al modo estándar?')) {
      handleSelectSeason('default');
    }
  };

  // Quick toggle and auto-save
  const handleToggleEnabled = async () => {
    const nextState = !wheelConfig.enabled;
    const updated = { ...wheelConfig, enabled: nextState };
    setWheelConfig(updated);
    setIsSaving(true);
    try {
      await onSaveSettings({
        luckyWheel: updated
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error toggling lucky wheel:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Save all settings to Cloud Firestore & backend
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveSettings({
        luckyWheel: wheelConfig
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (error) {
      console.error('Error saving lucky wheel settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner & Save Action */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center text-slate-950 font-black text-2xl shrink-0">
            {wheelConfig.seasonBadgeEmoji || '🎯'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-white">
                Ruleta de Descuentos & Optimización CRO
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                wheelConfig.enabled 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {wheelConfig.enabled ? '● HABILITADA' : '○ DESHABILITADA'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Administra tiempos de disparo, segmentos de descuento, temporizador de urgencia y activa campañas temáticas por temporadas (Navidad, Black Friday, Día de la Madre, etc.).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={handleToggleEnabled}
            disabled={isSaving}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 border disabled:opacity-50 ${
              wheelConfig.enabled
                ? 'bg-red-500/10 text-red-300 border-red-500/40 hover:bg-red-500/20'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{wheelConfig.enabled ? 'Deshabilitar Ruleta' : 'Habilitar Ruleta'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Guardando en Firestore...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>¡Guardado Exitoso!</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'seasons', label: '🎄 Campañas & Temporadas', icon: Calendar },
          { id: 'timing', label: '⏱️ Tiempos & Disparadores', icon: Clock },
          { id: 'discounts', label: '🎰 Segmentos & Descuentos', icon: Percent },
          { id: 'texts', label: '✍️ Textos & Mensajes', icon: Sparkles },
          { id: 'preview', label: '👁️ Simulador & Vista Previa', icon: Eye }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-md font-black'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TEMPORADAS Y CAMPAÑAS */}
      {activeTab === 'seasons' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🎄 Selección Rápida de Temporada (1-Click Presets)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Haz clic en cualquiera de las temporadas colombianas para aplicar al instante temas, colores, textos y códigos de cupón especializados.
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
                Temporada Activa: <strong>{wheelConfig.seasonName || 'Estándar'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
              {Object.values(SEASONAL_PRESETS).map(preset => {
                const isSelected = wheelConfig.activeSeason === preset.key;
                return (
                  <div
                    key={preset.key}
                    onClick={() => handleSelectSeason(preset.key)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/5 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-400/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 bg-amber-400 text-slate-950 p-1 rounded-full shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{preset.emoji}</span>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white">
                            {preset.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {preset.key}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2.5 line-clamp-2">
                        {preset.tagline}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-white shadow-xs" 
                          style={{ backgroundColor: preset.accentColor }} 
                        />
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-white shadow-xs" 
                          style={{ backgroundColor: preset.secondaryColor }} 
                        />
                      </div>
                      <span className={`text-[10px] font-extrabold ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                        {isSelected ? 'APLICADA' : 'Elegir'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Season Customizer Parameters */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-500" />
              <span>Personalización de la Temporada Activa</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre de la Temporada
                </label>
                <input
                  type="text"
                  value={wheelConfig.seasonName || ''}
                  onChange={(e) => updateField('seasonName', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  placeholder="Ej: Navidad & Reyes 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Emoji o Ícono Distintivo
                </label>
                <input
                  type="text"
                  value={wheelConfig.seasonBadgeEmoji || ''}
                  onChange={(e) => updateField('seasonBadgeEmoji', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  placeholder="Ej: 🎄 o 🖤 o 🎁"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Color de Acento de la Ruleta (Borde & Luces)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={wheelConfig.seasonAccentColor || '#f59e0b'}
                    onChange={(e) => updateField('seasonAccentColor', e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 cursor-pointer bg-slate-50"
                  />
                  <input
                    type="text"
                    value={wheelConfig.seasonAccentColor || '#f59e0b'}
                    onChange={(e) => updateField('seasonAccentColor', e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIEMPOS Y DISPARADORES */}
      {activeTab === 'timing' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Configuración de Tiempos & Algoritmo de Indecisión</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Controla cuándo se activa la ruleta para usuarios indecisos sin molestar a clientes que ya están listos para comprar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Inactivity Seconds */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                ⏱️ Tiempo de Inactividad
              </label>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Segundos que el cliente pasa viendo productos sin agregar al carrito.
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={15}
                  max={180}
                  step={5}
                  value={wheelConfig.inactivitySeconds || 40}
                  onChange={(e) => updateField('inactivitySeconds', Math.max(15, Number(e.target.value)))}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">segundos</span>
              </div>
            </div>

            {/* Min Visited Products */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                📦 Productos Vistos (Umbral)
              </label>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Mínimo de productos inspeccionados para catalogar como "Cliente Indeciso".
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={wheelConfig.minVisitedProducts || 2}
                  onChange={(e) => updateField('minVisitedProducts', Math.max(1, Number(e.target.value)))}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">productos</span>
              </div>
            </div>

            {/* Coupon Expiry Countdown Minutes */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                ⏳ Urgencia del Cupón Ganado
              </label>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Minutos del temporizador de cuenta regresiva para completar el pedido.
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={60}
                  step={5}
                  value={wheelConfig.couponExpiryMinutes || 15}
                  onChange={(e) => updateField('couponExpiryMinutes', Math.max(5, Number(e.target.value)))}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">minutos</span>
              </div>
            </div>

            {/* Spin Duration */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                🎰 Duración del Giro
              </label>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Tiempo que tarda la animación de la ruleta girando para generar emoción.
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2.5}
                  max={8}
                  step={0.5}
                  value={wheelConfig.spinDurationSeconds || 4.5}
                  onChange={(e) => updateField('spinDurationSeconds', Number(e.target.value))}
                  className="w-24 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">segundos</span>
              </div>
            </div>
          </div>

          {/* Trigger Toggles */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Interruptores de Disparo en la Tienda
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { 
                  key: 'enableExitIntent', 
                  title: 'Intento de Salida (Exit Intent)', 
                  desc: 'Aparece en computadores cuando el cliente mueve el cursor hacia la barra de pestañas o botón cerrar.' 
                },
                { 
                  key: 'enableInactivityTrigger', 
                  title: 'Inactividad Prolongada', 
                  desc: 'Aparece tras los segundos estipulados de navegación sin realizar pedido.' 
                },
                { 
                  key: 'enableVisitedThresholdTrigger', 
                  title: 'Disparo por N Productos Explorados', 
                  desc: 'Se dispara cuando el cliente ha visto 2 o 3 productos diferentes sin comprar.' 
                },
                { 
                  key: 'enableFloatingBadge', 
                  title: 'Botón Flotante Gamificado', 
                  desc: 'Muestra el botón circular 🎁 flotante en la tienda SOLO para usuarios indecisos.' 
                }
              ].map(item => (
                <div 
                  key={item.key}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.desc}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={Boolean((wheelConfig as any)[item.key])}
                    onChange={(e) => updateField(item.key as any, e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded-md cursor-pointer mt-0.5"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEGMENTOS Y DESCUENTOS */}
      {activeTab === 'discounts' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-500" />
                <span>Segmentos y Porcentajes de la Ruleta</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configura cada porción de la ruleta: texto, porcentaje de descuento (5% a 25%), color y prefijo del código de cupón.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaultSegments}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>

              <button
                type="button"
                onClick={handleAddSegment}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Segmento</span>
              </button>
            </div>
          </div>

          {/* Segments Table / List */}
          <div className="space-y-2.5">
            {wheelConfig.segments.map((segment, idx) => (
              <div 
                key={segment.id || idx}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col md:flex-row items-stretch md:items-center gap-3"
              >
                <div className="flex items-center gap-2 w-12 shrink-0">
                  <span className="text-xs font-mono font-black text-slate-400">#{idx + 1}</span>
                  <div 
                    className="w-4 h-4 rounded-full border border-white shadow-xs" 
                    style={{ backgroundColor: segment.color }} 
                  />
                </div>

                {/* Label */}
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Etiqueta en Ruleta
                  </label>
                  <input
                    type="text"
                    value={segment.label}
                    onChange={(e) => handleUpdateSegment(idx, { label: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                    placeholder="Ej: 15% OFF"
                  />
                </div>

                {/* Percentage */}
                <div className="w-28 shrink-0">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Descuento (%)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={5}
                      max={25}
                      value={segment.percentage}
                      onChange={(e) => handleUpdateSegment(idx, { percentage: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white"
                    />
                    <span className="text-xs font-bold text-slate-500">%</span>
                  </div>
                </div>

                {/* Coupon Prefix */}
                <div className="w-36 shrink-0">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Prefijo Cupón
                  </label>
                  <input
                    type="text"
                    value={segment.couponPrefix}
                    onChange={(e) => handleUpdateSegment(idx, { couponPrefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase"
                    placeholder="Ej: NAVIDAD15"
                  />
                </div>

                {/* Background Color */}
                <div className="w-32 shrink-0">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Color Fondo
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={segment.color}
                      onChange={(e) => handleUpdateSegment(idx, { color: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={segment.color}
                      onChange={(e) => handleUpdateSegment(idx, { color: e.target.value })}
                      className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-mono text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>

                {/* Delete Button */}
                <div className="pt-2 md:pt-4">
                  <button
                    type="button"
                    onClick={() => handleDeleteSegment(idx)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                    title="Eliminar este segmento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TEXTOS Y MENSAJES */}
      {activeTab === 'texts' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Textos del Modal de la Ruleta</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personaliza los encabezados, mensajes de confianza de pago contra entrega y el llamado a la acción.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Título Principal de la Modal
              </label>
              <input
                type="text"
                value={wheelConfig.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                placeholder="Ej: 🎉 ¡Gira la Ruleta y Gana tu Descuento!"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Subtítulo / Mensaje Persuasivo
              </label>
              <textarea
                rows={2}
                value={wheelConfig.subtitle}
                onChange={(e) => updateField('subtitle', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                placeholder="Ej: Desbloquea entre 5% y 15% OFF de regalo en tu producto favorito con Pago Contra Entrega."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Cinta / Badge Superior
                </label>
                <input
                  type="text"
                  value={wheelConfig.badgeText || ''}
                  onChange={(e) => updateField('badgeText', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  placeholder="Ej: 🎁 Premio Exclusivo Zavela"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Texto del Botón de Giro
                </label>
                <input
                  type="text"
                  value={wheelConfig.callToActionText || ''}
                  onChange={(e) => updateField('callToActionText', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  placeholder="Ej: 🎯 Girar Ruleta de Descuentos"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SIMULADOR Y VISTA PREVIA */}
      {activeTab === 'preview' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Left: Canvas Wheel Preview */}
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72">
                {/* Pointer / Ticker Arrow */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-md" />

                {/* Rotating Wheel Canvas */}
                <div
                  style={{
                    transform: `rotate(${previewRotation}deg)`,
                    transition: isPreviewSpinning
                      ? `transform ${wheelConfig.spinDurationSeconds || 4.5}s cubic-bezier(0.15, 0.9, 0.25, 1)`
                      : 'none'
                  }}
                  className="w-full h-full"
                >
                  <canvas
                    ref={canvasRef}
                    width={288}
                    height={288}
                    className="w-full h-full drop-shadow-xl"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestSpin}
                disabled={isPreviewSpinning}
                className="mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{isPreviewSpinning ? 'Girando Ruleta...' : 'Probar Giro de Prueba'}</span>
              </button>
            </div>

            {/* Right: Live Preview Details & Winner Card */}
            <div className="flex-1 w-full space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider mb-2">
                  {wheelConfig.badgeText}
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {wheelConfig.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {wheelConfig.subtitle}
                </p>
              </div>

              {previewWinner && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border-2 border-emerald-400 text-emerald-950 dark:text-emerald-200 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🎉</span>
                    <div>
                      <div className="text-xs font-black uppercase tracking-wide">
                        ¡Resultado del Giro Simulado!
                      </div>
                      <div className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                        Premio: {previewWinner.label} ({previewWinner.percentage}% OFF)
                      </div>
                      <div className="text-xs font-mono mt-1 opacity-90">
                        Cupón generado: <span className="underline font-bold">{previewWinner.couponPrefix}-DEMO</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Segmentos activos:</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{wheelConfig.segments.length}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tiempo de inactividad:</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{wheelConfig.inactivitySeconds}s</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Temporizador del cupón:</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{wheelConfig.couponExpiryMinutes} min</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
