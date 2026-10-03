import React, { useState } from 'react';
import { 
  FolderPlus, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  ExternalLink, 
  Eye, 
  Save, 
  Sliders, 
  Layers, 
  Sparkles, 
  Tag, 
  ShieldCheck,
  CheckCircle2,
  FolderTree,
  ShoppingBag,
  Palette
} from 'lucide-react';
import { StoreSettings, CustomSubpage, Category, Product } from '../../types/index.ts';
import { DEFAULT_CUSTOM_SUBPAGES } from '../../utils/exclusivityPresets.ts';

interface AdminSubpagesManagerProps {
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  onSaveSettings: (updatedSettings: Partial<StoreSettings>) => Promise<void>;
  onPreviewSubpage?: (slug: string) => void;
}

export const AdminSubpagesManager: React.FC<AdminSubpagesManagerProps> = ({
  settings,
  categories,
  products,
  onSaveSettings,
  onPreviewSubpage
}) => {
  const currentSubpages: CustomSubpage[] = settings.customSubpages && settings.customSubpages.length > 0 
    ? settings.customSubpages 
    : DEFAULT_CUSTOM_SUBPAGES;

  const [subpages, setSubpages] = useState<CustomSubpage[]>([...currentSubpages]);
  const [editingSubpage, setEditingSubpage] = useState<CustomSubpage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveAll = async (updatedList?: CustomSubpage[]) => {
    try {
      setIsSaving(true);
      const listToSave = updatedList || subpages;
      await onSaveSettings({
        customSubpages: listToSave
      });
      showToast('Gestor de Subpáginas actualizado con éxito.');
    } catch (err: any) {
      alert('Error al guardar: ' + (err.message || 'Desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = subpages.map(sp => sp.id === id ? { ...sp, active: !sp.active } : sp);
    setSubpages(updated);
    handleSaveAll(updated);
  };

  const handleToggleNav = (id: string) => {
    const updated = subpages.map(sp => sp.id === id ? { ...sp, showInNav: !sp.showInNav } : sp);
    setSubpages(updated);
    handleSaveAll(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta subpágina?')) {
      const updated = subpages.filter(sp => sp.id !== id);
      setSubpages(updated);
      handleSaveAll(updated);
    }
  };

  const handleSaveModal = () => {
    if (!editingSubpage) return;
    const exists = subpages.some(sp => sp.id === editingSubpage.id);
    let updated: CustomSubpage[];
    if (exists) {
      updated = subpages.map(sp => sp.id === editingSubpage.id ? editingSubpage : sp);
    } else {
      updated = [...subpages, editingSubpage];
    }
    setSubpages(updated);
    setEditingSubpage(null);
    handleSaveAll(updated);
  };

  const handleCreateNew = () => {
    const newId = 'subpage-' + Date.now();
    setEditingSubpage({
      id: newId,
      slug: 'coleccion-' + Date.now().toString().slice(-4),
      title: 'Nueva Colección Especial',
      navLabel: 'Colección VIP',
      showInNav: true,
      active: true,
      tagline: 'Artículos premium con Pago Contra Entrega',
      heroBadge: '✨ NOVEDAD 2026',
      heroTitle: 'Colección Exclusiva de Temporada',
      heroSubtitle: 'Descubre los artículos más destacados con envío asegurado y garantía de satisfacción.',
      heroCtaText: 'Ver Artículos',
      heroImageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80',
      accentColor: '#0084FF',
      categoryFilter: 'all',
      showTrustGuarantees: true,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fade-in">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0E1838] via-[#1C2541] to-[#0A1128] border border-[#2A3A60] rounded-3xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-[#48CAE4] shadow-lg shrink-0">
            <FolderTree className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">Gestor de Subpáginas & Ramas (Landings)</h2>
              <span className="text-[10px] bg-cyan-400/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-400/30">
                Multi-Páginas
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Crea y administra subpáginas personalizadas para diferentes categorías o campañas conservando todos los colores oficiales, logotipo de Zavela Store, firmas de garantía y menús.
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateNew}
          className="px-5 py-3 rounded-2xl bg-[#0084FF] hover:bg-[#0070db] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Subpágina</span>
        </button>
      </div>

      {/* Subpages List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {subpages.map((sp) => (
          <div
            key={sp.id}
            className={`bg-white rounded-3xl p-6 border transition flex flex-col justify-between shadow-sm hover:shadow-md ${
              sp.active ? 'border-slate-200' : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{sp.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">/{sp.slug}</span>
                  </div>
                  <div className="text-[11px] text-[#0084FF] font-bold mt-0.5">
                    Menú: "{sp.navLabel}"
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleNav(sp.id)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                      sp.showInNav
                        ? 'bg-cyan-50 border-cyan-200 text-[#0084FF]'
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}
                    title="Mostrar/Ocultar del menú superior"
                  >
                    {sp.showInNav ? 'En Menú' : 'Oculto Menú'}
                  </button>

                  <button
                    onClick={() => handleToggleActive(sp.id)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      sp.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {sp.active ? 'Activa' : 'Pausada'}
                  </button>
                </div>
              </div>

              {sp.heroImageUrl && (
                <div className="aspect-[21/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                  <img
                    src={sp.heroImageUrl}
                    alt={sp.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="text-xs text-slate-600 line-clamp-2">
                {sp.heroSubtitle}
              </p>

              <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                <span>Filtro de Artículos: <strong>{sp.categoryFilter || 'Todos'}</strong></span>
                <span className="text-emerald-600 font-bold">✓ Preserva Firma & Logotipo</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setEditingSubpage(sp)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Editar Rama</span>
              </button>

              <button
                onClick={() => handleDelete(sp.id)}
                className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 text-xs font-bold"
                title="Eliminar Subpágina"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT / CREATE SUBPAGE MODAL */}
      {editingSubpage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">
                {subpages.some(sp => sp.id === editingSubpage.id) ? 'Editar Subpágina' : 'Crear Nueva Subpágina'}
              </h3>
              <button
                onClick={() => setEditingSubpage(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Título de la Página:</label>
                  <input
                    type="text"
                    value={editingSubpage.title}
                    onChange={(e) => setEditingSubpage({ ...editingSubpage, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                    placeholder="Ej. Joyería Fina & Accesorios"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Slug URL (Ruta):</label>
                  <input
                    type="text"
                    value={editingSubpage.slug}
                    onChange={(e) => setEditingSubpage({ ...editingSubpage, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                    placeholder="joyeria-fina"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Texto en el Menú:</label>
                  <input
                    type="text"
                    value={editingSubpage.navLabel}
                    onChange={(e) => setEditingSubpage({ ...editingSubpage, navLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="Ej. Joyería VIP"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Badge del Hero:</label>
                  <input
                    type="text"
                    value={editingSubpage.heroBadge || ''}
                    onChange={(e) => setEditingSubpage({ ...editingSubpage, heroBadge: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="💎 EDICIÓN ESPECIAL"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Título Principal del Hero:</label>
                <input
                  type="text"
                  value={editingSubpage.heroTitle}
                  onChange={(e) => setEditingSubpage({ ...editingSubpage, heroTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subtítulo Descriptivo:</label>
                <textarea
                  value={editingSubpage.heroSubtitle}
                  onChange={(e) => setEditingSubpage({ ...editingSubpage, heroSubtitle: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Filtrar por Categoría:</label>
                  <select
                    value={editingSubpage.categoryFilter || 'all'}
                    onChange={(e) => setEditingSubpage({ ...editingSubpage, categoryFilter: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="all">Todas las Categorías</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Texto Botón CTA:</label>
                  <input
                    type="text"
                    value={editingSubpage.heroCtaText || ''}
                    onChange={(e) => setEditingSubpage({ ...editingSubpage, heroCtaText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="Ver Artículos"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">URL Imagen del Hero:</label>
                <input
                  type="url"
                  value={editingSubpage.heroImageUrl || ''}
                  onChange={(e) => setEditingSubpage({ ...editingSubpage, heroImageUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSubpage.showInNav}
                    onChange={(e) => setEditingSubpage({ ...editingSubpage, showInNav: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0084FF]"
                  />
                  <span className="font-bold text-slate-700">Mostrar enlace en el menú de navegación</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSubpage.active}
                    onChange={(e) => setEditingSubpage({ ...editingSubpage, active: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500"
                  />
                  <span className="font-bold text-slate-700">Subpágina activa</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingSubpage(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModal}
                className="px-4 py-2 rounded-xl bg-[#0084FF] text-white text-xs font-bold flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Subpágina</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
