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
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { StoreSettings } from '../../types/index.ts';
import { ZavelaLogo } from '../ZavelaLogo.tsx';
import { ImageDualUploader } from './ImageDualUploader.tsx';

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

  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        storeName,
        storeSlogan: slogan,
        logoUrl,
        primaryColor,
        secondaryColor,
        themeStyles: {
          ...settings.themeStyles,
          neonGlowEnabled: neonGlow,
          glowColor,
          borderRadius
        }
      });
      alert('Identidad de marca y colores guardados exitosamente.');
    } catch (err: any) {
      alert('Error al guardar cambios.');
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
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Identidad de Marca, Logo y Paleta de Colores
          </h2>
          <p className="text-xs text-slate-500">
            Configura el nombre comercial, logo vectorizado, efectos de iluminación neón y colores corporativos.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
        >
          {isSaving ? 'Guardando...' : 'Guardar Identidad'}
        </button>
      </div>

      {/* Live Brand Preview Component */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-white space-y-4 shadow-xl">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
          <div className="flex items-center gap-2 text-cyan-400">
            <Eye className="w-4 h-4" />
            <span>Vista Previa del Logotipo & Cabecera en Vivo</span>
          </div>
          <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
            Efecto Neón: {neonGlow ? 'ON' : 'OFF'}
          </span>
        </div>

        {/* Brand Card Display */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center gap-4">
            {/* Logo Emblem with Dynamic Glow */}
            <div
              style={{
                boxShadow: neonGlow ? `0 0 25px ${glowColor}66, 0 0 50px ${glowColor}33` : 'none',
                borderColor: primaryColor
              }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 flex items-center justify-center relative transition-all duration-300"
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <div className="flex items-center justify-center p-1.5">
                  <ZavelaLogo size="xs" variant="icon-only" />
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{storeName}</span>
                <span
                  style={{ backgroundColor: `${primaryColor}22`, color: primaryColor, borderColor: `${primaryColor}44` }}
                  className="text-[10px] font-black font-mono px-2 py-0.5 rounded border"
                >
                  COLOMBIA
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                {slogan}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 rounded-xl text-slate-950 font-black text-xs shadow-md"
            >
              Botón Primario
            </div>
            <div
              style={{ backgroundColor: secondaryColor }}
              className="px-4 py-2 rounded-xl text-white font-black text-xs shadow-md"
            >
              Acento
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
