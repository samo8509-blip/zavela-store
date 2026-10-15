import React, { useState } from 'react';
import { 
  Palette, 
  Sparkles, 
  Eye, 
  Check, 
  Sliders, 
  RotateCcw,
  Zap,
  Layers,
  Calendar,
  Sun,
  Flame,
  Heart,
  Gift,
  Ghost,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StoreSettings, SeasonalThemeId } from '../../types/index.ts';
import { ZavelaLogo } from '../ZavelaLogo.tsx';
import { ImageDualUploader } from './ImageDualUploader.tsx';
import { SeasonalLogoWrapper, ChristmasFairyLightsGarland } from '../SeasonalThemeOrnaments.tsx';
import { 
  SEASONAL_THEMES, 
  detectCalendarSeasonalTheme, 
  MONTH_NAMES_ES,
  SeasonalThemeDefinition 
} from '../../utils/seasonalThemes.ts';

interface AdminBrandIdentityProps {
  settings: StoreSettings;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

export const AdminBrandIdentity: React.FC<AdminBrandIdentityProps> = ({
  settings,
  onSaveSettings
}) => {
  const [storeName, setStoreName] = useState(settings.storeName || 'Zavela Store');
  const [slogan, setSlogan] = useState(settings.storeSlogan || 'Tecnología, Hogar y Tendencias con Pago Contra Entrega en Colombia');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor || '#06b6d4');
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor || '#4f46e5');
  const [neonGlow, setNeonGlow] = useState(settings.themeStyles?.neonGlowEnabled ?? true);
  const [glowColor, setGlowColor] = useState(settings.themeStyles?.glowColor || '#06b6d4');
  const [borderRadius, setBorderRadius] = useState(settings.themeStyles?.borderRadius || '1rem');

  // Seasonal & Holidays Configuration
  const [seasonalTheme, setSeasonalTheme] = useState<SeasonalThemeId>(
    settings.seasonalThemeConfig?.activeTheme || settings.seasonalTheme || 'standard-cyber'
  );
  const [autoCalendar, setAutoCalendar] = useState<boolean>(
    settings.seasonalThemeConfig?.autoCalendar ?? false
  );
  const [particlesEnabled, setParticlesEnabled] = useState<boolean>(
    settings.seasonalThemeConfig?.particlesEnabled ?? true
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Calendar Detection details
  const currentMonthIdx = new Date().getMonth();
  const currentMonthName = MONTH_NAMES_ES[currentMonthIdx];
  const calendarDetectedThemeId = detectCalendarSeasonalTheme();
  const calendarDetectedThemeDef = SEASONAL_THEMES.find(t => t.id === calendarDetectedThemeId) || SEASONAL_THEMES[1];

  // Currently resolved preview theme (calendar takes precedence if autoCalendar is ON, unless user is inspecting)
  const resolvedPreviewThemeId: SeasonalThemeId = autoCalendar ? calendarDetectedThemeId : seasonalTheme;
  const currentPreviewDef = SEASONAL_THEMES.find(t => t.id === resolvedPreviewThemeId) || SEASONAL_THEMES[1];

  const presetThemes = [
    { name: 'Cian Neón Zavela (Predeterminado)', primary: '#06b6d4', secondary: '#4f46e5', glow: '#06b6d4' },
    { name: 'Esmeralda Andino', primary: '#10b981', secondary: '#047857', glow: '#10b981' },
    { name: 'Violeta Tecnológico', primary: '#8b5cf6', secondary: '#4338ca', glow: '#8b5cf6' },
    { name: 'Ámbar Premium', primary: '#f59e0b', secondary: '#b45309', glow: '#f59e0b' },
    { name: 'Rosa Neón Cyber', primary: '#ec4899', secondary: '#9d174d', glow: '#ec4899' },
  ];

  const handleApplyPreset = (preset: typeof presetThemes[0]) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setGlowColor(preset.glow);
  };

  const handleSelectSeasonalTheme = (themeId: SeasonalThemeId) => {
    setSeasonalTheme(themeId);
    // If auto calendar is on, turning it off gives the user immediate direct manual control
    if (autoCalendar) {
      setAutoCalendar(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccessNotice(false);
    try {
      await onSaveSettings({
        storeName,
        storeSlogan: slogan,
        logoUrl,
        primaryColor,
        secondaryColor,
        seasonalTheme,
        seasonalThemeConfig: {
          activeTheme: seasonalTheme,
          autoCalendar,
          particlesEnabled,
          glowEnabled: neonGlow
        },
        themeStyles: {
          ...settings.themeStyles,
          neonGlowEnabled: neonGlow,
          glowColor,
          borderRadius
        }
      });
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 4000);
    } catch (err: any) {
      alert('Error al guardar cambios de identidad y temas: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
            GRUPO 2: ENCABEZADO & MARCA
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <span>Identidad de Marca, Logo y Paleta de Colores</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
              {currentPreviewDef.icon} {currentPreviewDef.shortName}
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Configura el nombre comercial, logotipo vectorizado, temporadas dinámicas del año y colores corporativos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccessNotice && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> Guardado exitosamente
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar Identidad'}
          </button>
        </div>
      </div>

      {/* Dynamic Live Brand Preview Box */}
      <div 
        className={`p-6 rounded-3xl border transition-all duration-500 space-y-4 shadow-xl relative overflow-hidden ${
          resolvedPreviewThemeId === 'standard-light'
            ? 'bg-gradient-to-br from-slate-100 via-white to-slate-200 border-slate-300 text-slate-900 shadow-md'
            : resolvedPreviewThemeId === 'halloween'
              ? 'bg-gradient-to-br from-[#12081f] via-[#1d0d2e] to-[#0c0416] border-orange-500/60 text-white shadow-orange-950/40'
              : resolvedPreviewThemeId === 'navidad-fin-ano'
                ? 'bg-gradient-to-br from-[#061912] via-[#0c2e20] to-[#04120d] border-emerald-500/60 text-white shadow-emerald-950/40'
                : resolvedPreviewThemeId === 'san-valentin'
                  ? 'bg-gradient-to-br from-[#1c0817] via-[#2f0e26] to-[#12040f] border-pink-500/60 text-white shadow-pink-950/40'
                  : resolvedPreviewThemeId === 'madre'
                    ? 'bg-gradient-to-br from-[#1a0818] via-[#290e25] to-[#130514] border-rose-400/60 text-white shadow-rose-950/40'
                    : resolvedPreviewThemeId === 'amor-amistad'
                      ? 'bg-gradient-to-br from-[#200910] via-[#310f1a] to-[#13050a] border-red-500/60 text-white shadow-red-950/40'
                      : 'bg-slate-950 border-slate-800 text-white shadow-cyan-950/30'
        }`}
      >
        {/* Festive Lights Garland for Christmas */}
        {resolvedPreviewThemeId === 'navidad-fin-ano' && (
          <ChristmasFairyLightsGarland className="!top-1" />
        )}

        <div className="flex flex-wrap items-center justify-between text-xs font-bold gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <span className={resolvedPreviewThemeId === 'standard-light' ? 'text-slate-800 font-extrabold' : 'text-slate-200'}>
              Vista Previa del Logotipo & Cabecera en Vivo
            </span>
            <span 
              style={{
                backgroundColor: `${currentPreviewDef.primaryColor}22`,
                borderColor: `${currentPreviewDef.primaryColor}55`,
                color: resolvedPreviewThemeId === 'standard-light' ? '#0369a1' : currentPreviewDef.primaryColor
              }}
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1"
            >
              <span>{currentPreviewDef.icon}</span>
              <span>{currentPreviewDef.name}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono">
            {autoCalendar ? (
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>Auto-Calendario ({currentMonthName})</span>
              </span>
            ) : (
              <span className="bg-slate-800/80 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md font-bold">
                🖐️ Modo Manual Fijo
              </span>
            )}
            <span className="bg-slate-800/80 px-2 py-0.5 rounded-md text-slate-300">
              Efecto Neón: {neonGlow ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Brand Card Display Inner Container */}
        <div 
          style={{
            borderColor: resolvedPreviewThemeId === 'standard-light' ? '#cbd5e1' : `${currentPreviewDef.primaryColor}40`
          }}
          className={`flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl border relative overflow-hidden transition-all duration-300 ${
            resolvedPreviewThemeId === 'standard-light'
              ? 'bg-white/90 shadow-sm'
              : 'bg-slate-900/90 shadow-xl'
          }`}
        >
          <div className="flex items-center gap-4">
            
            {/* Logo Emblem with Festive Ornaments (Santa Hat, Witch Hat, Hearts, Flowers, etc.) */}
            <SeasonalLogoWrapper 
              themeId={resolvedPreviewThemeId} 
              size="md"
              glowEnabled={neonGlow && resolvedPreviewThemeId !== 'standard-light'}
            >
              <div
                style={{
                  boxShadow: neonGlow && resolvedPreviewThemeId !== 'standard-light'
                    ? `0 0 25px ${glowColor}66, 0 0 50px ${glowColor}33` 
                    : 'none',
                  borderColor: resolvedPreviewThemeId === 'standard-light' ? '#94a3b8' : primaryColor
                }}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center relative transition-all duration-300 ${
                  resolvedPreviewThemeId === 'standard-light' 
                    ? 'bg-white shadow-inner' 
                    : 'bg-gradient-to-br from-slate-900 to-slate-950'
                }`}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                ) : (
                  <div className="flex items-center justify-center p-1.5">
                    <ZavelaLogo 
                      size="xs" 
                      variant="icon-only" 
                      theme={resolvedPreviewThemeId === 'standard-light' ? 'light' : 'dark'} 
                    />
                  </div>
                )}
              </div>
            </SeasonalLogoWrapper>

            <div>
              <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${
                resolvedPreviewThemeId === 'standard-light' ? 'text-slate-900' : 'text-white'
              }`}>
                <span>{storeName}</span>
                <span
                  style={{ 
                    backgroundColor: `${primaryColor}22`, 
                    color: resolvedPreviewThemeId === 'standard-light' ? '#0369a1' : primaryColor, 
                    borderColor: `${primaryColor}44` 
                  }}
                  className="text-[10px] font-black font-mono px-2 py-0.5 rounded border"
                >
                  COLOMBIA
                </span>
                {resolvedPreviewThemeId !== 'standard-light' && resolvedPreviewThemeId !== 'standard-cyber' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-yellow-300 animate-pulse">
                    {currentPreviewDef.icon} {currentPreviewDef.monthLabel}
                  </span>
                )}
              </h1>
              <p className={`text-xs mt-0.5 max-w-md ${
                resolvedPreviewThemeId === 'standard-light' ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {slogan}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-xl text-slate-950 font-black text-xs shadow-md transition-colors"
            >
              Botón Primario
            </div>
            <div
              style={{ backgroundColor: secondaryColor }}
              className="px-4 py-2 rounded-xl text-white font-black text-xs shadow-md transition-colors"
            >
              Acento
            </div>
          </div>
        </div>
      </div>

      {/* MÓDULO NUEVO OBLIGATORIO: Temporadas y Festividades Dinámicas */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 text-rose-600 border border-rose-200">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                  Temporadas y Festividades Dinámicas
                </h3>
                <p className="text-xs text-slate-500">
                  Selecciona la atmósfera visual de la tienda o deja que el sistema sincronice el tema según el calendario anual.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Tema activo actual:</span>
            <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
              <span>{currentPreviewDef.icon}</span>
              <span>{currentPreviewDef.name}</span>
            </span>
          </div>
        </div>

        {/* 7 Interactive Theme Selection Buttons with Active Highlight */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
            Opciones de Estilo y Festividades del Año
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {SEASONAL_THEMES.map((theme) => {
              const isSelected = seasonalTheme === theme.id;
              const isLiveActive = resolvedPreviewThemeId === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectSeasonalTheme(theme.id)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer relative flex flex-col justify-between group ${
                    isLiveActive
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar with Icon and Month Badge */}
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-2xl filter drop-shadow-xs group-hover:scale-110 transition-transform">
                      {theme.icon}
                    </span>

                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${theme.badgeColor}`}>
                      {theme.monthLabel}
                    </span>
                  </div>

                  {/* Title and Tagline */}
                  <div>
                    <h4 className={`text-xs font-black tracking-tight ${
                      isLiveActive ? 'text-indigo-950 font-black' : 'text-slate-800'
                    }`}>
                      {theme.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                      {theme.description}
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-400">
                      ID: {theme.id}
                    </span>
                    {isLiveActive ? (
                      <span className="font-bold text-indigo-700 flex items-center gap-1 bg-indigo-100 px-2 py-0.5 rounded-md">
                        <Check className="w-3 h-3 stroke-[3]" /> Activo
                      </span>
                    ) : (
                      <span className="text-slate-400 group-hover:text-slate-600 font-medium">
                        Seleccionar
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTROLES Y SWITCHES (Calendario Automático y Animación de Partículas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          
          {/* Switch 1: Activación Automática por Calendario */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-900">Activación Automática por Calendario</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Detecta el mes actual del sistema y activa el tema festivo correspondiente sin intervención manual.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={autoCalendar}
                  onChange={(e) => setAutoCalendar(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Information Box based on Switch State */}
            <div className="pt-2 border-t border-slate-200/80">
              {autoCalendar ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Mes detectado en servidor/sistema: <strong>{currentMonthName}</strong></span>
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Tema auto-asignado: <strong>{calendarDetectedThemeDef.icon} {calendarDetectedThemeDef.name}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-200/70 text-slate-700 text-[11px]">
                  <span>Modo manual activo. Se utilizará fijamente el tema que hayas seleccionado en los botones superiores.</span>
                </div>
              )}
            </div>
          </div>

          {/* Switch 2: Animación de Fondo (Partículas / Efectos) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-black text-slate-900">Animación de Fondo (Partículas / Efectos)</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Muestra partículas flotantes no invasivas en el frontend de la tienda (copos de nieve en Navidad, murciélagos en Halloween, corazones en San Valentín, destellos en Cyber).
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={particlesEnabled}
                  onChange={(e) => setParticlesEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Estado de animación:</span>
                <span className={`font-black px-2 py-0.5 rounded-md ${
                  particlesEnabled 
                    ? 'bg-cyan-100 text-cyan-800' 
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {particlesEnabled ? '✨ Partículas Flotantes ON' : 'Apagadas (Sin partículas)'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Basic Brand Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">Datos Principales de la Tienda</h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Comercial de la Tienda</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Zavela Store"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Slogan o Lema Comercial</label>
            <textarea
              rows={2}
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="Tecnología, Hogar y Tendencias con Envío Contra Entrega..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
            />
          </div>

          <div>
            <ImageDualUploader
              label="Logotipo de la Tienda (Personalizado u Oficial)"
              sublabel="Sube el archivo de tu logo desde el computador o pega un enlace de imagen"
              currentImageUrl={logoUrl}
              onImageChange={(url) => setLogoUrl(url)}
              aspectRatio="auto"
              placeholder="https://... o sube tu logo PNG / SVG / JPG"
              allowClear={true}
            />
            {!logoUrl && (
              <div className="mt-2 p-2 rounded-xl bg-cyan-50/70 border border-cyan-200 text-cyan-900 text-[11px] flex items-center justify-between">
                <span className="font-semibold">Usando el isotipo oficial Zavela Store Colombia</span>
                <span className="text-[10px] font-mono bg-cyan-200/80 px-1.5 py-0.5 rounded font-bold">PREDETERMINADO</span>
              </div>
            )}
          </div>
        </div>

        {/* Color Palette & Neon Glow */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">Paleta Cromática & Efectos</h3>

          {/* Color Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Color Primario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-9 h-9 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Color Secundario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-9 h-9 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* Neon Glow Toggle */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Efecto Resplandor Neón</span>
                <span className="text-[11px] text-slate-500">Iluminación cyber en logos y botones</span>
              </div>
              <input
                type="checkbox"
                checked={neonGlow}
                onChange={(e) => setNeonGlow(e.target.checked)}
                className="w-5 h-5 accent-cyan-600 rounded cursor-pointer"
              />
            </div>

            {neonGlow && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Color de Iluminación Neón</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={glowColor}
                    onChange={(e) => setGlowColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={glowColor}
                    onChange={(e) => setGlowColor(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Temas Predefinidos</label>
            <div className="flex flex-wrap gap-1.5">
              {presetThemes.map((theme, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(theme)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
