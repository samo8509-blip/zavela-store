import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Edit2, 
  Eye, 
  Image as ImageIcon, 
  ExternalLink,
  ArrowRight,
  Sparkles,
  Check,
  X,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StoreSettings, HeroBanner } from '../../types/index.ts';
import { ImageDualUploader } from './ImageDualUploader.tsx';

interface AdminHeroBannersProps {
  settings: StoreSettings;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

export const AdminHeroBanners: React.FC<AdminHeroBannersProps> = ({
  settings,
  onSaveSettings
}) => {
  const [banners, setBanners] = useState<HeroBanner[]>(
    settings.heroBanners || [
      {
        id: 'banner-1',
        badgeText: '💎 ALTA PERFUMERÍA',
        tagline: 'Only On Zavela Store',
        title: '50% OFF en Fragancias de Lujo',
        subtitle: 'Perfumes exclusivos de alta duración, estuches sellados y Pago Contra Entrega en toda Colombia.',
        notificationText: '🎉 Los descuentos por tiempo limitado en Zavela Store abren hoy con pago contra entrega en toda Colombia.',
        ctaText: 'Get Now',
        ctaLink: '#products',
        imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&auto=format&fit=crop&q=80',
        active: true,
        order: 1
      },
      {
        id: 'banner-2',
        badgeText: '🇨🇴 PAGO CONTRA ENTREGA',
        tagline: 'Garantía Total Zavela',
        title: 'Envío Express & Pago al Recibir',
        subtitle: 'Pide sin tarjetas bancarias. Recibe con Servientrega, Coordinadora o Envía y paga en efectivo.',
        notificationText: '🚚 Despachos inmediatos a más de 1.100 municipios con rastreo de guía en tiempo real.',
        ctaText: 'Pedir Ahora',
        ctaLink: '#products',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600&auto=format&fit=crop&q=80',
        active: true,
        order: 2
      }
    ]
  );

  const [bannerStyle, setBannerStyle] = useState<'jpfans' | 'classic'>(
    settings.heroBannerStyle || 'jpfans'
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  // Form State
  const [form, setForm] = useState<Partial<HeroBanner>>({
    badgeText: '💎 ALTA PERFUMERÍA',
    tagline: 'Only On Zavela Store',
    title: '',
    subtitle: '',
    notificationText: '',
    ctaText: 'Get Now',
    ctaLink: '#products',
    imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&auto=format&fit=crop&q=80',
    active: true,
    order: banners.length + 1
  });

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBanner) {
      setBanners(banners.map(b => b.id === editingBanner.id ? editingBanner : b));
      setEditingBanner(null);
    } else {
      const newB: HeroBanner = {
        id: `banner-${Date.now()}`,
        badgeText: form.badgeText || '💎 ALTA PERFUMERÍA',
        tagline: form.tagline || 'Only On Zavela Store',
        title: form.title || 'Título del Banner',
        subtitle: form.subtitle || 'Subtítulo explicativo con beneficios',
        notificationText: form.notificationText || '🎉 Oferta especial disponible por tiempo limitado con Pago Contra Entrega.',
        ctaText: form.ctaText || 'Get Now',
        ctaLink: form.ctaLink || '#products',
        imageUrl: form.imageUrl || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&auto=format&fit=crop&q=80',
        hasVideo: Boolean(form.hasVideo),
        videoUrl: form.videoUrl || '',
        active: form.active !== false,
        order: form.order || banners.length + 1
      };
      setBanners([...banners, newB]);
      setIsCreating(false);
    }
  };

  const handleDeleteBanner = (id: string) => {
    if (!confirm('¿Eliminar este banner del carrusel principal?')) return;
    setBanners(banners.filter(b => b.id !== id));
  };

  const handleToggleBanner = (id: string) => {
    setBanners(banners.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        heroBanners: banners,
        heroBannerStyle: bannerStyle
      });
      alert('Carrusel de banners y estilo guardados con éxito en Cloud Firestore.');
    } catch (err: any) {
      alert('Error al guardar carrusel.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeBanners = banners.filter(b => b.active);
  const currentPreviewBanner = activeBanners[previewSlideIdx % (activeBanners.length || 1)] || banners[0];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
            GRUPO 4: CUERPO DE LA TIENDA
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Carrusel de Banners Principales (Hero)
          </h2>
          <p className="text-xs text-slate-500">
            Diseña los banners de impacto visual, selecciona el estilo (JPFans vs Clásico) y configura la barra de notificación sincronizada.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Preview Button */}
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-900 font-bold text-xs cursor-pointer shadow-xs transition-all"
          >
            <Eye className="w-4 h-4 text-cyan-600" />
            <span>Visualizar sin Aplicar</span>
          </button>

          <button
            onClick={() => {
              setForm({
                badgeText: '💎 ALTA PERFUMERÍA',
                tagline: 'Only On Zavela Store',
                title: '',
                subtitle: '',
                notificationText: '',
                ctaText: 'Get Now',
                ctaLink: '#products',
                imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&auto=format&fit=crop&q=80',
                active: true,
                order: banners.length + 1
              });
              setIsCreating(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Banner</span>
          </button>
        </div>
      </div>

      {/* Style Selector Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-600" />
          <span>Estilo Visual del Carrusel Principal</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* JPFans Style Option */}
          <div 
            onClick={() => setBannerStyle('jpfans')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              bannerStyle === 'jpfans'
                ? 'border-cyan-500 bg-cyan-50/50 shadow-md ring-2 ring-cyan-200'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                Estilo JPFans (Moderno + Barra Notificación)
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Recomendado
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Fondo pastel con degradado azul/cian, botón 3D amarillo "Get Now", tarjeta limpia y una <strong>Barra de Notificación</strong> inferior sincronizada con la campaña o colección de cada slide.
            </p>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[10px] text-slate-700 flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">🔔 Notificación: Texto dinámico que cambia junto al banner</span>
            </div>
          </div>

          {/* Classic Style Option */}
          <div 
            onClick={() => setBannerStyle('classic')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              bannerStyle === 'classic'
                ? 'border-cyan-500 bg-cyan-50/50 shadow-md ring-2 ring-cyan-200'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Estilo Clásico
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded">
                Estándar
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Diseño tradicional con caja blanca, imagen a la izquierda, detalles a la derecha y barra de progreso superior.
            </p>
          </div>
        </div>
      </div>

      {/* Banner List */}
      <div className="space-y-3">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 ${
              banner.active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/60'
            }`}
          >
            {/* Image Preview & Info */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white font-mono text-[9px] px-1 rounded">
                  #{index + 1}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded border border-cyan-200">
                    {banner.badgeText || 'OFERTA'}
                  </span>
                  {banner.tagline && (
                    <span className="text-[10px] italic font-serif text-slate-500">
                      "{banner.tagline}"
                    </span>
                  )}
                  {banner.hasVideo && (
                    <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold">
                      VIDEO MP4
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 truncate mt-1">
                  {banner.title}
                </h4>
                <p className="text-xs text-slate-500 truncate max-w-md">
                  {banner.subtitle}
                </p>
                {banner.notificationText && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded mt-1 border border-amber-200/60 truncate max-w-lg flex items-center gap-1">
                    <Bell className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>{banner.notificationText}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button
                onClick={() => handleToggleBanner(banner.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all border ${
                  banner.active
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {banner.active ? 'Activo' : 'Pausado'}
              </button>

              <button
                onClick={() => {
                  setEditingBanner({ ...banner });
                  setIsCreating(false);
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                title="Editar banner"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDeleteBanner(banner.id)}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                title="Eliminar banner"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer transition-all"
        >
          <Check className="w-4 h-4" />
          <span>{isSaving ? 'Guardando en Firestore...' : 'Guardar Todos los Cambios'}</span>
        </button>
      </div>

      {/* Create / Edit Modal */}
      {(isCreating || editingBanner) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingBanner ? 'Editar Banner del Hero' : 'Crear Nuevo Banner'}
                </h3>
                <p className="text-xs text-slate-500">Configura la imagen, textos, notificación sincronizada y botón CTA</p>
              </div>
              <button
                onClick={() => { setIsCreating(false); setEditingBanner(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Etiqueta Superior (Badge)</label>
                  <input
                    type="text"
                    value={editingBanner ? editingBanner.badgeText : form.badgeText}
                    onChange={(e) => editingBanner
                      ? setEditingBanner({ ...editingBanner, badgeText: e.target.value })
                      : setForm({ ...form, badgeText: e.target.value })
                    }
                    placeholder="💎 ALTA PERFUMERÍA"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tagline / Colección (Estilo JPFans)</label>
                  <input
                    type="text"
                    value={editingBanner ? (editingBanner.tagline || '') : (form.tagline || '')}
                    onChange={(e) => editingBanner
                      ? setEditingBanner({ ...editingBanner, tagline: e.target.value })
                      : setForm({ ...form, tagline: e.target.value })
                    }
                    placeholder="Only On Zavela Store"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden italic font-serif"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Título Principal *</label>
                <input
                  type="text"
                  required
                  value={editingBanner ? editingBanner.title : form.title}
                  onChange={(e) => editingBanner
                    ? setEditingBanner({ ...editingBanner, title: e.target.value })
                    : setForm({ ...form, title: e.target.value })
                  }
                  placeholder="50% OFF en Fragancias de Lujo"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtítulo / Mensaje de Campaña</label>
                <textarea
                  rows={2}
                  value={editingBanner ? editingBanner.subtitle : form.subtitle}
                  onChange={(e) => editingBanner
                    ? setEditingBanner({ ...editingBanner, subtitle: e.target.value })
                    : setForm({ ...form, subtitle: e.target.value })
                  }
                  placeholder="Perfumes exclusivos de alta duración, estuches sellados y Pago Contra Entrega..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              {/* Notification Text Field (Synchronized with this Banner) */}
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1.5">
                <label className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  <span>Texto de la Barra de Notificación (Sincronizado con este Banner)</span>
                </label>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Este texto se mostrará automáticamente en la barra de notificación cuando este banner esté activo.
                </p>
                <input
                  type="text"
                  value={editingBanner ? (editingBanner.notificationText || '') : (form.notificationText || '')}
                  onChange={(e) => editingBanner
                    ? setEditingBanner({ ...editingBanner, notificationText: e.target.value })
                    : setForm({ ...form, notificationText: e.target.value })
                  }
                  placeholder="🎉 Los descuentos por tiempo limitado en Zavela Store abren hoy con pago contra entrega en toda Colombia."
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl focus:border-amber-500 outline-hidden text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Texto del Botón (CTA)</label>
                  <input
                    type="text"
                    value={editingBanner ? editingBanner.ctaText : form.ctaText}
                    onChange={(e) => editingBanner
                      ? setEditingBanner({ ...editingBanner, ctaText: e.target.value })
                      : setForm({ ...form, ctaText: e.target.value })
                    }
                    placeholder="Get Now"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Enlace del Botón</label>
                  <input
                    type="text"
                    value={editingBanner ? editingBanner.ctaLink : form.ctaLink}
                    onChange={(e) => editingBanner
                      ? setEditingBanner({ ...editingBanner, ctaLink: e.target.value })
                      : setForm({ ...form, ctaLink: e.target.value })
                    }
                    placeholder="#products o /url"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <ImageDualUploader
                  label="Imagen de Fondo / Producto del Banner"
                  sublabel="Sube una foto desde tu computador o pega un enlace web / Dropi"
                  currentImageUrl={editingBanner ? editingBanner.imageUrl : form.imageUrl}
                  onImageChange={(url) => editingBanner
                    ? setEditingBanner({ ...editingBanner, imageUrl: url })
                    : setForm({ ...form, imageUrl: url })
                  }
                  aspectRatio="banner"
                  placeholder="https://images.unsplash.com/... o sube tu imagen"
                  allowClear={false}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingBanner(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer shadow-sm"
                >
                  {editingBanner ? 'Guardar Cambios' : 'Añadir Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Interactive Preview Modal ("Visualizar sin Aplicar") */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            
            {/* Header with Style Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-base font-black text-slate-900">
                    Vista Previa Interactiva (Sin Aplicar Cambios)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Visualiza cómo se verá el banner y la barra de notificación antes de guardar permanentemente.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
                  <button
                    onClick={() => setBannerStyle('jpfans')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      bannerStyle === 'jpfans' ? 'bg-cyan-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Estilo JPFans
                  </button>
                  <button
                    onClick={() => setBannerStyle('classic')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      bannerStyle === 'classic' ? 'bg-slate-800 text-white' : 'text-slate-600'
                    }`}
                  >
                    Estilo Clásico
                  </button>
                </div>

                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Component Container */}
            <div className="space-y-3">
              {bannerStyle === 'jpfans' ? (
                <div className="space-y-3">
                  {/* JPFans Card */}
                  <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#e0e7ff] border border-blue-200/80 shadow-md min-h-[320px] flex flex-col justify-between p-6 sm:p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 my-auto">
                      <div className="w-full md:w-1/2 text-left space-y-3">
                        <span className="text-sm font-semibold text-blue-900 italic font-serif">
                          {currentPreviewBanner?.tagline || 'Only On Zavela Store'}
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
                          {currentPreviewBanner?.title || '50% OFF'}
                        </h2>
                        <p className="text-sm sm:text-base font-medium text-slate-700 italic font-serif">
                          {currentPreviewBanner?.subtitle || 'Perfumería exclusiva y pago contra entrega'}
                        </p>
                        <div className="pt-2">
                          <button className="px-8 py-3 rounded-full bg-gradient-to-b from-[#fef08a] via-[#facc15] to-[#eab308] text-slate-950 font-black text-sm shadow-md border border-amber-300">
                            {currentPreviewBanner?.ctaText || 'Get Now'}
                          </button>
                        </div>
                      </div>

                      <div className="w-full md:w-1/2 flex items-center justify-center">
                        <div className="w-48 sm:w-60 aspect-square rounded-2xl overflow-hidden flex items-center justify-center">
                          <img
                            src={currentPreviewBanner?.imageUrl}
                            alt="Banner Preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain drop-shadow-xl"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pagination Dots */}
                    {activeBanners.length > 1 && (
                      <div className="w-full flex items-center justify-center gap-2 pt-2">
                        {activeBanners.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPreviewSlideIdx(idx)}
                            className={`h-2 rounded-full cursor-pointer transition-all ${
                              idx === (previewSlideIdx % activeBanners.length)
                                ? 'w-6 bg-slate-900'
                                : 'w-2 bg-slate-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notification Bar */}
                  <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-amber-100 text-amber-900 border border-amber-200 font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Bell className="w-3 h-3 text-amber-600" />
                        <span>Notificación</span>
                      </span>
                      <span className="text-slate-800 font-medium truncate">
                        {currentPreviewBanner?.notificationText || '🎉 Los descuentos por tiempo limitado en Zavela Store abren hoy con pago contra entrega en toda Colombia.'}
                      </span>
                    </div>
                    <span className="text-slate-700 font-bold text-xs shrink-0">Más &gt;</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-full md:w-1/2 aspect-4/3 rounded-xl overflow-hidden bg-slate-100">
                    <img
                      src={currentPreviewBanner?.imageUrl}
                      alt="Banner Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="w-full md:w-1/2 space-y-3">
                    <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                      {currentPreviewBanner?.badgeText}
                    </span>
                    <h2 className="text-2xl font-black text-slate-900">
                      {currentPreviewBanner?.title}
                    </h2>
                    <p className="text-xs text-slate-600">
                      {currentPreviewBanner?.subtitle}
                    </p>
                    <button className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase">
                      {currentPreviewBanner?.ctaText}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Slider for Preview */}
            {activeBanners.length > 1 && (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <span className="font-mono text-slate-600">
                  Mostrando slide <strong>{(previewSlideIdx % activeBanners.length) + 1}</strong> de <strong>{activeBanners.length}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewSlideIdx(prev => (prev - 1 + activeBanners.length) % activeBanners.length)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewSlideIdx(prev => (prev + 1) % activeBanners.length)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cerrar sin Aplicar
              </button>
              <button
                onClick={async () => {
                  await handleSaveAll();
                  setIsPreviewModalOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar y Guardar en la Tienda</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
