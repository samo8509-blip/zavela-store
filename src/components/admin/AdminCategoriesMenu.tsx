import React, { useState } from 'react';
import { 
  FolderTree, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Sparkles, 
  Tag, 
  ArrowUpDown, 
  Layers, 
  Eye,
  EyeOff
} from 'lucide-react';
import { Category, Product } from '../../types/index.ts';

interface AdminCategoriesMenuProps {
  categories: Category[];
  products: Product[];
  onRefresh: () => void;
}

const getSubcategoryLabel = (sub: any): string => {
  if (!sub) return '';
  if (typeof sub === 'string') return sub;
  if (typeof sub === 'object' && sub.name) return String(sub.name);
  return String(sub);
};

export const AdminCategoriesMenu: React.FC<AdminCategoriesMenuProps> = ({
  categories = [],
  products = [],
  onRefresh
}) => {
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [form, setForm] = useState<Partial<Category>>({
    name: '',
    slug: '',
    description: '',
    icon: 'Sparkles',
    active: true,
    order: safeCategories.length + 1,
    subcategories: []
  });

  const [newSubcategory, setNewSubcategory] = useState('');

  const [toastFeedback, setToastFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setToastFeedback({ message, type });
    setTimeout(() => setToastFeedback(null), 3500);
  };

  const handleToggleVisibility = async (cat: Category) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cat, active: !cat.active })
      });
      if (!res.ok) throw new Error('Error al cambiar visibilidad');
      await onRefresh();
      showFeedback(`Categoría "${cat.name}" ahora está ${!cat.active ? 'visible' : 'oculta'}.`);
    } catch (err: any) {
      showFeedback(err.message || 'Error al cambiar visibilidad', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const isEdit = Boolean(editingCategory?.id);
      
      const rawSubcategories = (isEdit ? editingCategory?.subcategories : form.subcategories) || [];
      const currentSubcategories: string[] = rawSubcategories
        .map(s => getSubcategoryLabel(s))
        .filter(Boolean);

      // If user typed a subcategory but forgot to click Add, automatically add it
      if (newSubcategory.trim() && !currentSubcategories.includes(newSubcategory.trim())) {
        currentSubcategories.push(newSubcategory.trim());
      }

      const nameToUse = (isEdit ? editingCategory?.name : form.name)?.trim();
      if (!nameToUse) {
        throw new Error('El nombre de la categoría es obligatorio.');
      }

      const rawSlug = (isEdit ? editingCategory?.slug : form.slug)?.trim();
      const slugToUse = rawSlug && rawSlug.length > 0
        ? rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        : nameToUse.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      const payload = isEdit ? {
        ...editingCategory,
        name: nameToUse,
        slug: slugToUse,
        subcategories: currentSubcategories
      } : {
        ...form,
        name: nameToUse,
        slug: slugToUse,
        subcategories: currentSubcategories
      };

      const url = isEdit ? `/api/admin/categories/${editingCategory!.id}` : '/api/admin/categories';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const resJson = await res.json().catch(() => ({}));
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.message || 'Error al guardar la categoría');
      }

      setIsCreating(false);
      setEditingCategory(null);
      setNewSubcategory('');
      setForm({
        name: '',
        slug: '',
        description: '',
        icon: 'Sparkles',
        active: true,
        order: safeCategories.length + 2,
        subcategories: []
      });
      
      await onRefresh();
      showFeedback(isEdit ? `Categoría "${nameToUse}" actualizada con éxito.` : `¡Categoría "${nameToUse}" creada exitosamente!`);
    } catch (err: any) {
      showFeedback(err.message || 'Error al procesar la categoría', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"? Los productos asociados se mantendrán en el inventario.`)) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar categoría');
      await onRefresh();
      showFeedback(`Categoría "${name}" eliminada correctamente.`);
    } catch (err: any) {
      showFeedback(err.message || 'Error al eliminar', 'error');
    }
  };

  const handleAddSubcategoryToForm = () => {
    if (!newSubcategory.trim()) return;
    const cleanSub = newSubcategory.trim();
    if (editingCategory) {
      const existing = (editingCategory.subcategories || []).map(s => getSubcategoryLabel(s));
      setEditingCategory({
        ...editingCategory,
        subcategories: [...existing, cleanSub]
      });
    } else {
      const existing = (form.subcategories || []).map(s => getSubcategoryLabel(s));
      setForm({
        ...form,
        subcategories: [...existing, cleanSub]
      });
    }
    setNewSubcategory('');
  };

  const handleRemoveSubcategory = (index: number) => {
    if (editingCategory) {
      const copy = [...(editingCategory.subcategories || [])];
      copy.splice(index, 1);
      setEditingCategory({ ...editingCategory, subcategories: copy });
    } else {
      const copy = [...(form.subcategories || [])];
      copy.splice(index, 1);
      setForm({ ...form, subcategories: copy });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Feedback Banner */}
      {toastFeedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 ${
          toastFeedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {toastFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-600" />}
            <span>{toastFeedback.message}</span>
          </div>
          <button 
            onClick={() => setToastFeedback(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
            GRUPO 3: NAVEGACIÓN
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Menú, Categorías y Subcategorías
          </h2>
          <p className="text-xs text-slate-500">
            Organiza las secciones del menú, filtros de búsqueda y agrupación de productos.
          </p>
        </div>

        <button
          onClick={() => {
            setForm({
              name: '',
              slug: '',
              description: '',
              icon: 'Sparkles',
              active: true,
              order: safeCategories.length + 1,
              subcategories: []
            });
            setIsCreating(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Categoría</span>
        </button>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeCategories.map((cat) => {
          const productCount = safeProducts.filter(p => p.categoryId === cat.id).length;

          return (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-xs">
                      #{cat.order || 1}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">{cat.name}</h3>
                      <span className="font-mono text-[10px] text-slate-400">/{cat.slug}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    cat.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {cat.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {cat.description || 'Sin descripción asignada.'}
                </p>

                {/* Subcategories tags */}
                {cat.subcategories && cat.subcategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {cat.subcategories.map((sub, idx) => {
                      const label = getSubcategoryLabel(sub);
                      if (!label) return null;
                      return (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  <strong>{productCount}</strong> productos
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(cat)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      cat.active 
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                    }`}
                    title={cat.active ? 'Ocultar categoría del menú' : 'Hacer visible en el menú'}
                  >
                    {cat.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{cat.active ? 'Visible' : 'Oculto'}</span>
                  </button>
                  <button
                    onClick={() => setEditingCategory(cat)}
                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer border border-indigo-100"
                    title="Editar Categoría"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer border border-rose-100"
                    title="Eliminar Categoría"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {(isCreating || editingCategory) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingCategory ? `Modificar: ${editingCategory.name}` : 'Crear Nueva Categoría'}
                </h3>
                <p className="text-xs text-slate-500">Configura el título, slug y subcategorías para el menú</p>
              </div>
              <button
                onClick={() => { setIsCreating(false); setEditingCategory(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre de la Categoría *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory ? editingCategory.name : form.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const slugVal = val.toLowerCase().replace(/[^a-z0-9]/g, '-');
                      if (editingCategory) {
                        setEditingCategory({ ...editingCategory, name: val, slug: editingCategory.slug || slugVal });
                      } else {
                        setForm({ ...form, name: val, slug: slugVal });
                      }
                    }}
                    placeholder="Ej. Calzado & Zapatillas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Slug URL</label>
                  <input
                    type="text"
                    value={editingCategory ? editingCategory.slug : form.slug}
                    onChange={(e) => editingCategory
                      ? setEditingCategory({ ...editingCategory, slug: e.target.value })
                      : setForm({ ...form, slug: e.target.value })
                    }
                    placeholder="calzado-zapatillas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción de la Sección</label>
                <textarea
                  rows={2}
                  value={editingCategory ? editingCategory.description || '' : form.description || ''}
                  onChange={(e) => editingCategory
                    ? setEditingCategory({ ...editingCategory, description: e.target.value })
                    : setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Explica qué tipo de productos encontrarán los clientes aquí..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              {/* Subcategories Editor */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subcategorías / Etiquetas del Menú
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategoryToForm();
                      }
                    }}
                    placeholder="Ej. Botas Industriales, Tenis Urbanos (Presiona Enter)"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcategoryToForm}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold cursor-pointer"
                  >
                    Añadir
                  </button>
                </div>

                {/* Subcategories list chips */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 min-h-[40px]">
                  {(editingCategory ? editingCategory.subcategories : form.subcategories)?.map((sub, idx) => {
                    const label = getSubcategoryLabel(sub);
                    if (!label) return null;
                    return (
                      <span
                        key={idx}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold text-[11px]"
                      >
                        <span>{label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategory(idx)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Orden en el Menú</label>
                  <input
                    type="number"
                    value={editingCategory ? editingCategory.order || 1 : form.order || 1}
                    onChange={(e) => editingCategory
                      ? setEditingCategory({ ...editingCategory, order: Number(e.target.value) })
                      : setForm({ ...form, order: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="cat-active-toggle"
                    checked={editingCategory ? editingCategory.active !== false : form.active !== false}
                    onChange={(e) => editingCategory
                      ? setEditingCategory({ ...editingCategory, active: e.target.checked })
                      : setForm({ ...form, active: e.target.checked })
                    }
                    className="w-4 h-4 accent-cyan-600 rounded cursor-pointer"
                  />
                  <label htmlFor="cat-active-toggle" className="font-bold text-slate-700 cursor-pointer">
                    Visible en el Menú
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingCategory(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  {isProcessing ? 'Guardando...' : 'Guardar Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
