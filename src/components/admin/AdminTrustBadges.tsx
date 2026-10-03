import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit2, 
  Truck, 
  Clock, 
  Award, 
  RotateCcw, 
  Check, 
  X, 
  Sparkles
} from 'lucide-react';
import { StoreSettings, TrustBadge } from '../../types/index.ts';

interface AdminTrustBadgesProps {
  settings: StoreSettings;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

export const AdminTrustBadges: React.FC<AdminTrustBadgesProps> = ({
  settings,
  onSaveSettings
}) => {
  const [badges, setBadges] = useState<TrustBadge[]>(
    settings.trustBadges || [
      { id: 'b1', icon: 'Truck', title: 'Pago Contra Entrega', description: 'Pagas en efectivo al recibir tu pedido en cualquier ciudad de Colombia.', active: true },
      { id: 'b2', icon: 'Shield', title: 'Garantía Zavela Store', description: '30 días de garantía directa por defectos de fábrica en todos los productos.', active: true },
      { id: 'b3', icon: 'Clock', title: 'Despachos en 24H', description: 'Alistamos y enviamos tus compras el mismo día hábil con transportadoras líderes.', active: true },
      { id: 'b4', icon: 'Award', title: 'Productos 100% Verificados', description: 'Calidad certificada y empaque seguro para una entrega impecable.', active: true },
    ]
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editingBadge, setEditingBadge] = useState<TrustBadge | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form
  const [form, setForm] = useState<Partial<TrustBadge>>({
    icon: 'Shield',
    title: '',
    description: '',
    active: true
  });

  const availableIcons = ['Truck', 'Shield', 'Clock', 'Award', 'RotateCcw', 'Sparkles'];

  const handleSaveBadge = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBadge) {
      setBadges(badges.map(b => b.id === editingBadge.id ? editingBadge : b));
      setEditingBadge(null);
    } else {
      const newB: TrustBadge = {
        id: `badge-${Date.now()}`,
        icon: form.icon || 'Shield',
        title: form.title || 'Beneficio Zavela',
        description: form.description || 'Descripción del beneficio',
        active: form.active !== false
      };
      setBadges([...badges, newB]);
      setIsCreating(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este badge de garantía?')) return;
    setBadges(badges.filter(b => b.id !== id));
  };

  const handleToggle = (id: string) => {
    setBadges(badges.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        trustBadges: badges
      });
      alert('Badges de confianza y garantías guardados correctamente.');
    } catch (err: any) {
      alert('Error al guardar.');
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
            Badges y Garantías de Confianza
          </h2>
          <p className="text-xs text-slate-500">
            Crea o modifica los distintivos de pago contra entrega, garantía oficial y despacho rápido.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setForm({ icon: 'Shield', title: '', description: '', active: true });
              setIsCreating(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Badge</span>
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{badge.title}</h3>
                    <span className="text-[10px] font-mono text-slate-400">Icono: {badge.icon}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  badge.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {badge.active ? 'Activo' : 'Oculto'}
                </span>
              </div>

              <p className="text-xs text-slate-600">
                {badge.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
              <button
                onClick={() => handleToggle(badge.id)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Alternar"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditingBadge(badge)}
                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                title="Editar"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(badge.id)}
                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      {(isCreating || editingBadge) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingBadge ? 'Modificar Badge de Garantía' : 'Nuevo Badge de Confianza'}
              </h3>
              <button
                onClick={() => { setIsCreating(false); setEditingBadge(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBadge} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título del Badge *</label>
                <input
                  type="text"
                  required
                  value={editingBadge ? editingBadge.title : form.title}
                  onChange={(e) => editingBadge
                    ? setEditingBadge({ ...editingBadge, title: e.target.value })
                    : setForm({ ...form, title: e.target.value })
                  }
                  placeholder="Ej. Envío Gratis Nacional"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción del Beneficio</label>
                <textarea
                  rows={2}
                  required
                  value={editingBadge ? editingBadge.description : form.description}
                  onChange={(e) => editingBadge
                    ? setEditingBadge({ ...editingBadge, description: e.target.value })
                    : setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Pagas en efectivo al recibir en la puerta de tu casa..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Icono Representativo</label>
                <select
                  value={editingBadge ? editingBadge.icon : form.icon}
                  onChange={(e) => editingBadge
                    ? setEditingBadge({ ...editingBadge, icon: e.target.value })
                    : setForm({ ...form, icon: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
                >
                  {availableIcons.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingBadge(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold cursor-pointer shadow-md shadow-cyan-600/20"
                >
                  Guardar Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
