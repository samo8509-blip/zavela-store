import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Sparkles,
  Trophy,
  Sliders,
  Clock,
  Wind,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  RotateCcw,
  Zap,
  Flame,
  ShieldCheck,
  Tag,
  Palette,
  Timer,
  Play,
  Smartphone,
  Hand,
  Gauge
} from 'lucide-react';
import {
  StoreSettings,
  GamificationGameSettings,
  GamificationSeasonPreset,
  Product
} from '../../types/index.ts';
import {
  DEFAULT_GAMIFICATION_SETTINGS,
  GAMIFICATION_SEASONS,
  getActiveGamificationSettings,
  GamificationSeasonDefinition
} from '../../utils/gamificationPresets.ts';
import { CatchDiscountGame } from '../CatchDiscountGame.tsx';

interface AdminGamificationSettingsProps {
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => Promise<void>;
  showToast: (msg: string) => void;
  products?: Product[];
}

export const AdminGamificationSettings: React.FC<AdminGamificationSettingsProps> = ({
  settings,
  onUpdateSettings,
  showToast,
  products = []
}) => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'rules' | 'triggers' | 'physics' | 'preview'>('campaign');
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<GamificationGameSettings>(() => {
    return getActiveGamificationSettings(settings.gamificationGame);
  });

  // Modal test simulator in admin
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  useEffect(() => {
    setConfig(getActiveGamificationSettings(settings.gamificationGame));
  }, [settings.gamificationGame]);

  // Quick toggle and auto-save
  const handleToggleEnabled = async () => {
    const nextState = !config.enabled;
    const updatedGameConfig: GamificationGameSettings = {
      ...config,
      enabled: nextState
    };
    setConfig(updatedGameConfig);
    setIsSaving(true);
    try {
      const updatedStoreSettings: StoreSettings = {
        ...settings,
        gamificationGame: updatedGameConfig
      };
      await onUpdateSettings(updatedStoreSettings);
      showToast(nextState ? '✅ Desafío Flash Activado en la Tienda' : '🛑 Desafío Flash Desactivado en la Tienda');
    } catch (err) {
      console.error('Error toggling gamification game:', err);
      showToast('❌ Error al actualizar estado del minijuego');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving to StoreSettings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated: StoreSettings = {
        ...settings,
        gamificationGame: config
      };
      await onUpdateSettings(updated);
      showToast('✅ Ajustes del Desafío Flash guardados exitosamente');
    } catch (err) {
      console.error(err);
      showToast('❌ Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  // Apply Seasonal Preset
  const handleSelectSeasonPreset = (presetKey: GamificationSeasonPreset) => {
    const preset = GAMIFICATION_SEASONS[presetKey];
    if (!preset) return;

    setConfig(prev => ({
      ...prev,
      activeSeason: presetKey,
      seasonName: preset.name,
      gameTitle: preset.themeTitle,
      gameSubtitle: preset.themeSubtitle,
      badgeEmoji: preset.emoji,
      accentColor: preset.accentColor,
      tiers: {
        bronze: {
          ...prev.tiers.bronze,
          couponPrefix: preset.bronzePrefix
        },
        silver: {
          ...prev.tiers.silver,
          couponPrefix: preset.silverPrefix
        },
        gold: {
          ...prev.tiers.gold,
          couponPrefix: preset.goldPrefix
        }
      }
    }));

    showToast(`🎨 Tema "${preset.name}" aplicado`);
  };

  // Reset to initial defaults
  const handleResetDefaults = () => {
    setConfig(DEFAULT_GAMIFICATION_SETTINGS);
    showToast('🔄 Valores restablecidos a los predeterminados');
  };

  // Dummy product for preview
  const sampleProduct: Product = products[0] || {
    id: 'sample-p1',
    title: 'Producto Estrella Zavela Store',
    slug: 'sample-p1',
    price: 139900,
    images: ['https://images.unsplash.com/photo-1541643600914-78b084683601?w=400'],
    description: 'Producto de demostración para probar el descuento.',
    categoryId: 'all',
    stock: 15,
    tags: ['descuento', 'oferta'],
    active: true
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner with Master Switch */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-700/80 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg border shrink-0"
              style={{
                backgroundColor: `${config.accentColor}25`,
                borderColor: config.accentColor
              }}
            >
              {config.badgeEmoji || '🌪️'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Desafío Flash: Atrapa tu Descuento
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  config.enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}>
                  {config.enabled ? '● ACTIVO EN TIENDA' : '○ DESACTIVADO'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Minijuego interactivo con física de viento dinámico para captar clientes indecisos y aumentar la tasa de conversión (CRO) con cupones de margen controlado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            {/* Master Toggle */}
            <button
              onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border ${
                config.enabled
                  ? 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border-red-700/50'
                  : 'bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-600/50'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{config.enabled ? 'Deshabilitar Minijuego' : 'Habilitar Minijuego'}</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-lg hover:shadow-amber-400/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('campaign')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'campaign'
              ? 'bg-slate-800 text-amber-400 border border-amber-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Campañas & Temporadas</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'rules'
              ? 'bg-slate-800 text-amber-400 border border-amber-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Reglas de Descuento (5%-15%)</span>
        </button>

        <button
          onClick={() => setActiveTab('triggers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'triggers'
              ? 'bg-slate-800 text-amber-400 border border-amber-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Disparadores & Indecisión</span>
        </button>

        <button
          onClick={() => setActiveTab('physics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'physics'
              ? 'bg-slate-800 text-amber-400 border border-amber-400/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Física, Viento & Giroscopio Móvil</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'preview'
              ? 'bg-amber-400 text-slate-950 font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Simulador en Vivo</span>
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS & SEASONS */}
      {activeTab === 'campaign' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Presets de Temporada y Fechas Comerciales</span>
            </h3>
            <p className="text-xs text-slate-400">
              Selecciona una temporada para adaptar instantáneamente los títulos, colores, emojis temáticos y prefijos de cupones de tu tienda.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {(Object.keys(GAMIFICATION_SEASONS) as GamificationSeasonPreset[]).map((key) => {
                const s = GAMIFICATION_SEASONS[key];
                const isSelected = config.activeSeason === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectSeasonPreset(key)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/20 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{s.emoji}</span>
                      <div 
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: s.accentColor }}
                      />
                    </div>
                    <div className="font-bold text-sm text-white">{s.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{s.tagline}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Titles and Brand Settings */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Textos y Personalización del Modal Emergente</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre de la Campaña
                </label>
                <input
                  type="text"
                  value={config.seasonName || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, seasonName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  placeholder="ej. Black Friday 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Emoji Representativo
                </label>
                <input
                  type="text"
                  value={config.badgeEmoji || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, badgeEmoji: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  placeholder="🌪️ o 🎁 o ⚡"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Título Principal del Desafío
                </label>
                <input
                  type="text"
                  value={config.gameTitle || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, gameTitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  placeholder="ej. ¡Desafío Flash de Black Friday!"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Subtítulo / Instrucción al Cliente
                </label>
                <textarea
                  rows={2}
                  value={config.gameSubtitle || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, gameSubtitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  placeholder="Instrucciones del minijuego..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Color de Acento / Luces
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.accentColor || '#f59e0b'}
                    onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={config.accentColor || '#f59e0b'}
                    onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DISCOUNT RULES & CONTROLLED MARGINS */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Límites Globales de Rentabilidad (Control de Margen)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Garantiza que ningún descuento otorgado por el juego exceda los límites comerciales de tu tienda ni comprometa la ganancia neta en Dropi Colombia.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Descuento Mínimo Garantizado (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={3}
                    max={10}
                    value={config.minDiscountPercentage}
                    onChange={(e) => setConfig(prev => ({ ...prev, minDiscountPercentage: Number(e.target.value) }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-black text-amber-400"
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Mínimo obtenido incluso con pocas capturas (Nivel Bronce).
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Descuento Máximo Permitido (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={25}
                    value={config.maxDiscountPercentage}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxDiscountPercentage: Number(e.target.value) }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-black text-emerald-400"
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Tope máximo otorgado a los jugadores expertos (Nivel Oro).
                </p>
              </div>
            </div>
          </div>

          {/* Tier Escalation Rules */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Niveles de Puntuación y Asignación de Cupones</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bronze Tier */}
              <div className="bg-slate-950/80 border border-amber-900/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xl">🥉</span>
                  <span className="text-[10px] font-bold uppercase bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-800/40">
                    Bajo Desempeño
                  </span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Etiqueta Nivel</label>
                  <input
                    type="text"
                    value={config.tiers.bronze.label}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        bronze: { ...prev.tiers.bronze, label: e.target.value }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    min={config.minDiscountPercentage}
                    max={config.maxDiscountPercentage}
                    value={config.tiers.bronze.discountPercentage}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        bronze: { ...prev.tiers.bronze, discountPercentage: Number(e.target.value) }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Puntos Mínimos</label>
                  <input
                    type="number"
                    min={1}
                    value={config.tiers.bronze.minScore}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        bronze: { ...prev.tiers.bronze, minScore: Number(e.target.value) }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Prefijo Cupón</label>
                  <input
                    type="text"
                    value={config.tiers.bronze.couponPrefix}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        bronze: { ...prev.tiers.bronze, couponPrefix: e.target.value.toUpperCase() }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white uppercase"
                  />
                </div>
              </div>

              {/* Silver Tier */}
              <div className="bg-slate-950/80 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xl">🥈</span>
                  <span className="text-[10px] font-bold uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-600">
                    Desempeño Medio
                  </span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Etiqueta Nivel</label>
                  <input
                    type="text"
                    value={config.tiers.silver.label}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        silver: { ...prev.tiers.silver, label: e.target.value }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    min={config.minDiscountPercentage}
                    max={config.maxDiscountPercentage}
                    value={config.tiers.silver.discountPercentage}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        silver: { ...prev.tiers.silver, discountPercentage: Number(e.target.value) }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Puntos Mínimos</label>
                  <input
                    type="number"
                    min={3}
                    value={config.tiers.silver.minScore}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        silver: { ...prev.tiers.silver, minScore: Number(e.target.value) }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Prefijo Cupón</label>
                  <input
                    type="text"
                    value={config.tiers.silver.couponPrefix}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        silver: { ...prev.tiers.silver, couponPrefix: e.target.value.toUpperCase() }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white uppercase"
                  />
                </div>
              </div>

              {/* Gold Tier */}
              <div className="bg-slate-950/80 border border-amber-400/40 rounded-2xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xl">🥇</span>
                  <span className="text-[10px] font-bold uppercase bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black">
                    Máximo Desempeño
                  </span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Etiqueta Nivel</label>
                  <input
                    type="text"
                    value={config.tiers.gold.label}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        gold: { ...prev.tiers.gold, label: e.target.value }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    min={config.minDiscountPercentage}
                    max={config.maxDiscountPercentage}
                    value={config.tiers.gold.discountPercentage}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        gold: { ...prev.tiers.gold, discountPercentage: Number(e.target.value) }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Puntos Mínimos</label>
                  <input
                    type="number"
                    min={6}
                    value={config.tiers.gold.minScore}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        gold: { ...prev.tiers.gold, minScore: Number(e.target.value) }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Prefijo Cupón</label>
                  <input
                    type="text"
                    value={config.tiers.gold.couponPrefix}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiers: {
                        ...prev.tiers,
                        gold: { ...prev.tiers.gold, couponPrefix: e.target.value.toUpperCase() }
                      }
                    }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white uppercase"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRIGGERS & INDECISION PARAMETERS */}
      {activeTab === 'triggers' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Parámetros de Disparo & Algoritmo de Indecisión</span>
            </h3>
            <p className="text-xs text-slate-400">
              Define cuándo debe desplegarse el minijuego automáticamente para captar al cliente antes de que abandone la tienda sin comprar.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Inactivity Seconds */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tiempo de Inactividad o Navegación Requerido (Segundos)
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={config.inactivitySeconds}
                  onChange={(e) => setConfig(prev => ({ ...prev, inactivitySeconds: Number(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Tiempo sin interacción o navegación pasiva antes de activar el pop-up (Recomendado: 30s - 45s).
                </p>
              </div>

              {/* Visited Products Threshold */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mínimo de Productos Vistos
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.minVisitedProducts}
                  onChange={(e) => setConfig(prev => ({ ...prev, minVisitedProducts: Number(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Cantidad de productos que el usuario debe explorar antes de disparar el desafío (Recomendado: 2 o 3).
                </p>
              </div>
            </div>

            {/* Trigger Switches */}
            <div className="space-y-3 pt-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Activar Detección de Exit Intent (Intención de Salida)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Dispara el minijuego cuando el cursor del cliente se mueve rápidamente hacia la barra superior para cerrar la pestaña.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableExitIntent}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableExitIntent: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Disparar por Tiempo de Inactividad Prolongado
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Activa el juego si el usuario pasa más de {config.inactivitySeconds}s mirando el catálogo sin agregar al carrito.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableInactivityTrigger}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableInactivityTrigger: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Disparar tras Visitar Umbral de Productos
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Muestra el desafío al navegar por {config.minVisitedProducts} productos distintos.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableVisitedThresholdTrigger}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableVisitedThresholdTrigger: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Mostrar Botón Flotante Gamificado en la Tienda
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Despliega un acceso flotante discreto para que clientes indecisos puedan jugar voluntariamente cuando deseen.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableFloatingBadge}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableFloatingBadge: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WIND PHYSICS & GAME MECHANICS & GYROSCOPE */}
      {activeTab === 'physics' && (
        <div className="space-y-6">
          {/* Mobile Motion Sensors (Device Orientation / Gyroscope) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Control por Inclinación Móvil (Giroscopio / DeviceOrientation API)
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-full">
                Sensores Móviles
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Permite a los usuarios en smartphones controlar la canasta inclinando físicamente el teléfono a la izquierda o derecha en lugar de arrastrar el dedo. Compatible con iOS Safari 13+ (solicitud de permiso) y Android.
            </p>

            <div className="pt-2 space-y-4">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Activar Modo Giroscopio en Celulares
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Si se desactiva, los usuarios móviles jugarán exclusivamente mediante deslizamiento táctil (touch drag).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableGyroscope !== false}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableGyroscope: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-indigo-400 focus:ring-0 cursor-pointer"
                />
              </label>

              {config.enableGyroscope !== false && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Sensibilidad de Inclinación ({config.gyroSensitivity || 1.2}x)
                    </label>
                    <input
                      type="range"
                      min={0.6}
                      max={2.5}
                      step={0.1}
                      value={config.gyroSensitivity || 1.2}
                      onChange={(e) => setConfig(prev => ({ ...prev, gyroSensitivity: Number(e.target.value) }))}
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>Suave (0.6x)</span>
                      <span>Normal (1.2x)</span>
                      <span>Rápido (2.5x)</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Zona Muerta Central ({config.gyroDeadzone || 5}°)
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      step={1}
                      value={config.gyroDeadzone || 5}
                      onChange={(e) => setConfig(prev => ({ ...prev, gyroDeadzone: Number(e.target.value) }))}
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>1° (Ultra reactivo)</span>
                      <span>5° (Recomendado)</span>
                      <span>12° (Estable)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Difficulty & Miss Penalty Settings */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Dificultad, Penalizaciones & Obstáculos
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full">
                Mecánica Competitiva
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configura el nivel de reto, la penalización al dejar escapar objetos y la aparición de trampas/bombas para aumentar la adrenalina.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Difficulty Level */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nivel de Dificultad y Velocidad
                </label>
                <select
                  value={config.difficultyLevel || 'hard'}
                  onChange={(e) => setConfig(prev => ({ ...prev, difficultyLevel: e.target.value as 'normal' | 'hard' | 'expert' }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:ring-1 focus:ring-amber-400"
                >
                  <option value="normal">Normal (Velocidad estándar)</option>
                  <option value="hard">Desafiante (Velocidad rápida + ráfagas dinámicas)</option>
                  <option value="expert">Experto (Alta velocidad + reflejos extremos)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Aumenta la velocidad de caída de los ítems y la frecuencia de ráfagas.
                </p>
              </div>

              {/* Miss Penalty Points */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Penalización por Objeto Perdido
                </label>
                <select
                  value={config.missPenaltyPoints ?? 1}
                  onChange={(e) => setConfig(prev => ({ ...prev, missPenaltyPoints: Number(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:ring-1 focus:ring-amber-400"
                >
                  <option value={1}>Restar 1 punto (Descuenta porcentaje al caer)</option>
                  <option value={2}>Restar 2 puntos (Penalización severa)</option>
                  <option value={0}>Sin penalización (Modo relajado)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Si un ítem cae sin recogerse, resta puntos reduciendo en tiempo real el tier de descuento.
                </p>
              </div>
            </div>

            {/* Include Obstacles / Hazards */}
            <div className="pt-2">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Incluir Suite de Obstáculos y Trampas (💣, 🪨, ⚡, 🔥, 🌵, ☠️, 🧊, 🌪️, 🕳️)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Spawnea bombas (-3), rocas, rayos con controles invertidos, cactus con encogimiento de red, fuego y hielo.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.includeObstacles !== false}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeObstacles: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Dynamic Wind & Canvas Physics */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span>Física de Viento Dinámico & Dinámica de Juego</span>
            </h3>
            <p className="text-xs text-slate-400">
              Personaliza el realismo del viento, la velocidad de cambio de ráfagas y la duración de la partida.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Duración de la Partida (Segundos)
                </label>
                <input
                  type="number"
                  min={10}
                  max={25}
                  value={config.gameDurationSeconds}
                  onChange={(e) => setConfig(prev => ({ ...prev, gameDurationSeconds: Number(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Recomendado: 12 a 15 segundos para máxima adrenalina y retención.
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Intervalo de Ráfagas de Viento (Segundos)
                </label>
                <input
                  type="number"
                  min={1.5}
                  max={5}
                  step={0.5}
                  value={config.windChangeIntervalSeconds}
                  onChange={(e) => setConfig(prev => ({ ...prev, windChangeIntervalSeconds: Number(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Cada cuánto tiempo cambia aleatoriamente la dirección del viento (Recomendado: 2.5s).
                </p>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Urgencia del Cupón Ganado (Minutos)
                </label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={config.couponExpiryMinutes}
                  onChange={(e) => setConfig(prev => ({ ...prev, couponExpiryMinutes: Number(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Temporizador de cuenta regresiva en el checkout (Recomendado: 10 minutos).
                </p>
              </div>
            </div>

            <div className="pt-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Habilitar Efecto de Viento Dinámico en Canvas
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Aplica curvatura física a la trayectoria de los ítems y genera partículas atmosféricas.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.windEnabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, windEnabled: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-cyan-400 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE SIMULATOR */}
      {activeTab === 'preview' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-xl border-2"
              style={{
                backgroundColor: `${config.accentColor}20`,
                borderColor: config.accentColor
              }}
            >
              {config.badgeEmoji || '🌪️'}
            </div>
            <h3 className="text-xl font-black text-white">
              Simulador del Minijuego en Vivo
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prueba la experiencia de juego tal como la vivirá el cliente final en tu tienda: cuenta regresiva, física de viento, colisiones de canasta y pantalla de premio.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setIsTestModalOpen(true)}
              className="px-6 py-3.5 rounded-xl font-black text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-xl hover:shadow-amber-400/30 flex items-center gap-2 text-sm transition-all transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Lanzar Partida de Prueba ({config.gameDurationSeconds || 15}s)</span>
            </button>
          </div>

          {/* Quick Summary Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-4 text-left">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Campaña activa:</span>
              <span className="text-xs font-bold text-white truncate block">{config.seasonName}</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Margen seguro:</span>
              <span className="text-xs font-bold text-amber-400 block">{config.minDiscountPercentage}% a {config.maxDiscountPercentage}% OFF</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Viento dinámico:</span>
              <span className="text-xs font-bold text-cyan-300 block">{config.windEnabled ? 'Activado (2.5s)' : 'Desactivado'}</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Urgencia checkout:</span>
              <span className="text-xs font-bold text-emerald-300 block">{config.couponExpiryMinutes} minutos</span>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Modal Instance */}
      {isTestModalOpen && (
        <CatchDiscountGame
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          favoriteProduct={sampleProduct}
          gamificationSettings={config}
          onApplyDiscountAndBuy={(prod, coup) => {
            showToast(`🎉 Simulación: Comprando ${prod.title} con cupón ${coup.code} (${coup.percentage}% OFF)`);
          }}
          onApplyDiscountToCart={(coup) => {
            showToast(`🛒 Simulación: Cupón ${coup.code} aplicado al carrito`);
          }}
        />
      )}
    </div>
  );
};
