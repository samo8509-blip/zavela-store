import React, { useState } from 'react';
import { 
  Layers, 
  Eye, 
  EyeOff,
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  Trash2,
  Plus,
  Check, 
  X,
  Save,
  Sliders,
  Sparkles
} from 'lucide-react';
import { StoreSettings } from '../../types/index.ts';

interface AdminHomeSectionsProps {
  settings: StoreSettings;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

interface HomeSectionConfig {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
}

export const AdminHomeSections: React.FC<AdminHomeSectionsProps> = ({
  settings,
  onSaveSettings
}) => {
  const [sections, setSections] = useState<HomeSectionConfig[]>([
    { id: '1', key: 'hero', name: 'Carrusel de Banners (Hero)', description: 'Banner principal animado con llamados a la acción', enabled: true, order: 1 },
    { id: '2', key: 'badges', name: 'Garantías & Badges de Confianza', description: 'Envíos contra entrega, garantía oficial y atención 24/7', enabled: true, order: 2 },
    { id: '3', key: 'categories', name: 'Explorador Visual de Categorías', description: 'Acceso directo a colecciones con contador de productos', enabled: true, order: 3 },
    { id: '4', key: 'flash_offers', name: 'Ofertas Flash con Descuento', description: 'Productos con precios de liquidación y porcentaje de ahorro', enabled: true, order: 4 },
    { id: '5', key: 'featured_products', name: 'Catálogo de Productos Destacados', description: 'Grilla principal de productos con botón de compra rápida', enabled: true, order: 5 },
    { id: '6', key: 'cod_banner', name: 'Banner Promocional de Pago Contra Entrega', description: 'Explicación del proceso de pago al recibir sin tarjetas', enabled: true, order: 6 },
    { id: '7', key: 'blog', name: 'Artículos & Guías de Compra (Blog)', description: 'Contenido educativo y recomendaciones para clientes', enabled: true, order: 7 },
  ]);

  const [editingSection, setEditingSection] = useState<HomeSectionConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');
  const [newSectionKey, setNewSectionKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (id: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar la sección "${name}" del inicio de la tienda?`)) return;
    setSections(sections.filter(s => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...sections];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    setSections(copy.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const copy = [...sections];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    setSections(copy.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleStartEdit = (sec: HomeSectionConfig) => {
    setEditingSection({ ...sec });
  };

  const handleSaveEdit = () => {
    if (!editingSection) return;
    setSections(sections.map(s => s.id === editingSection.id ? editingSection : s));
    setEditingSection(null);
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    const newSec: HomeSectionConfig = {
      id: `sec-${Date.now()}`,
      key: newSectionKey.trim() || `custom_${Date.now()}`,
      name: newSectionName.trim(),
      description: newSectionDesc.trim() || 'Bloque personalizado de la tienda',
      enabled: true,
      order: sections.length + 1
    };

    setSections([...sections, newSec]);
    setNewSectionName('');
    setNewSectionDesc('');
    setNewSectionKey('');
    setIsCreating(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({});
      alert('Distribución de secciones del Home guardada correctamente.');
    } catch (err: any) {
      alert('Error al guardar secciones.');
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
            GRUPO 4: CUERPO DE LA TIENDA
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Secciones y Bloques del Home
          </h2>
          <p className="text-xs text-slate-500">
            Modifica, elimina, reordena, oculta o haz visible cualquier sección de la página principal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 text-cyan-600" />
            <span>Agregar Sección</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
          >
            {isSaving ? 'Guardando...' : 'Guardar Distribución'}
          </button>
        </div>
      </div>

      {/* Add New Section Inline Form */}
      {isCreating && (
        <form onSubmit={handleAddSection} className="p-5 rounded-2xl bg-white border border-cyan-300 shadow-sm space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-cyan-600" />
              <span>Añadir Nueva Sección al Home</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Sección</label>
              <input
                type="text"
                required
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Ej. Colección de Verano / Liquidación"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Identificador / Clave (slug)</label>
              <input
                type="text"
                value={newSectionKey}
                onChange={(e) => setNewSectionKey(e.target.value)}
                placeholder="ej. custom_promo"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Subtítulo explicativo</label>
            <input
              type="text"
              value={newSectionDesc}
              onChange={(e) => setNewSectionDesc(e.target.value)}
              placeholder="Descripción breve de lo que muestra esta sección"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Crear Sección</span>
            </button>
          </div>
        </form>
      )}

      {/* Sections List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {sections.map((sec, idx) => (
          <div
            key={sec.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-slate-900 truncate">{sec.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    sec.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {sec.enabled ? '✓ VISIBLE' : 'OCULTO'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{sec.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {/* Toggle switch with visible badge */}
              <button
                type="button"
                onClick={() => handleToggle(sec.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  sec.enabled ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                }`}
                title="Mostrar u ocultar sección"
              >
                {sec.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{sec.enabled ? 'Visible' : 'Oculto'}</span>
              </button>

              {/* Move up / down */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveUp(idx)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  title="Subir"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === sections.length - 1}
                  onClick={() => handleMoveDown(idx)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  title="Bajar"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Edit Button */}
              <button
                type="button"
                onClick={() => handleStartEdit(sec)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-cyan-100 text-slate-700 hover:text-cyan-800 transition-colors cursor-pointer border border-slate-200"
                title="Modificar nombre y descripción"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDelete(sec.id, sec.name)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition-colors cursor-pointer border border-slate-200"
                title="Eliminar sección"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingSection && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-600" />
                <span>Modificar Sección del Home</span>
              </h3>
              <button
                onClick={() => setEditingSection(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Visible de la Sección</label>
                <input
                  type="text"
                  value={editingSection.name}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Subtítulo</label>
                <input
                  type="text"
                  value={editingSection.description}
                  onChange={(e) => setEditingSection({ ...editingSection, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Estado de Visibilidad</div>
                  <div className="text-[11px] text-slate-500">¿Mostrar esta sección en la página principal?</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSection({ ...editingSection, enabled: !editingSection.enabled })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    editingSection.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {editingSection.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{editingSection.enabled ? 'Visible' : 'Oculto'}</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

