import React, { useState } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Sparkles, 
  Sliders,
  Palette,
  Eye,
  ArrowRight
} from 'lucide-react';
import { StoreSettings, HeaderTickerItem } from '../../types/index.ts';

interface AdminHeaderTickerProps {
  settings: StoreSettings;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

export const AdminHeaderTicker: React.FC<AdminHeaderTickerProps> = ({
  settings,
  onSaveSettings
}) => {
  const [enabled, setEnabled] = useState(settings.headerTicker?.enabled ?? true);
  const [speed, setSpeed] = useState(settings.headerTicker?.speedSeconds ?? 25);
  const [bgColor, setBgColor] = useState(settings.headerTicker?.backgroundColor ?? '#0284c7');
  const [textColor, setTextColor] = useState(settings.headerTicker?.textColor ?? '#ffffff');
  const [items, setItems] = useState<HeaderTickerItem[]>(
    settings.headerTicker?.items ?? [
      { id: '1', text: '🇨🇴 ENVÍO GRATIS Y PAGO CONTRA ENTREGA EN TODA COLOMBIA', icon: 'Truck', active: true },
      { id: '2', text: '⚡ DESPACHOS EN 24 HORAS CON SERVIENTREGA Y COORDINADORA', icon: 'Zap', active: true },
      { id: '3', text: '🛡️ GARANTÍA OFICIAL ZAVELA STORE EN TODOS TUS PEDIDOS', icon: 'Shield', active: true }
    ]
  );

  const [editingItem, setEditingItem] = useState<HeaderTickerItem | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [newItemIcon, setNewItemIcon] = useState('Sparkles');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: HeaderTickerItem = {
      id: `tick-${Date.now()}`,
      text: newItemText.trim(),
      icon: newItemIcon,
      active: true
    };

    setItems([...items, newItem]);
    setNewItemText('');
  };

  const handleToggleItem = (id: string) => {
    setItems(items.map(it => it.id === id ? { ...it, active: !it.active } : it));
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  const handleSaveEditItem = () => {
    if (!editingItem) return;
    setItems(items.map(it => it.id === editingItem.id ? editingItem : it));
    setEditingItem(null);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        headerTicker: {
          enabled,
          speedSeconds: speed,
          backgroundColor: bgColor,
          textColor,
          items
        }
      });
      alert('Ajustes del Ticker Superior guardados correctamente.');
    } catch (err: any) {
      alert('Error al guardar ajustes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
              GRUPO 2: ENCABEZADO
            </span>
          </div>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Barra Superior & Ticker de Avisos
          </h2>
          <p className="text-xs text-slate-500">
            Personaliza el cintillo dinámico superior con ofertas, envíos gratis y avisos urgentes.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
        >
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Live Preview of Header Ticker */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Eye className="w-4 h-4" />
            <span>Vista Previa en Vivo (Header Superior)</span>
          </div>
          <span>{enabled ? 'ACTIVO' : 'DESACTIVADO'}</span>
        </div>

        {enabled ? (
          <div
            style={{ backgroundColor: bgColor, color: textColor }}
            className="py-2 px-4 rounded-xl text-center text-xs font-bold tracking-wide shadow-inner overflow-hidden"
          >
            <div className="flex items-center justify-center gap-6 animate-pulse">
              {items.filter(i => i.active).map((it, idx) => (
                <span key={idx} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span>⚡</span>
                  <span>{it.text}</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2.5 px-4 rounded-xl bg-slate-800 text-center text-xs text-slate-400 font-medium">
            (El cintillo superior está actualmente oculto para los clientes)
          </div>
        )}
      </div>

      {/* Controls: Activation & Colors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Toggle Enabled */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-extrabold text-sm text-slate-900 block">Mostrar Ticker</span>
              <span className="text-xs text-slate-500">Cintillo superior visible</span>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-5 h-5 accent-cyan-600 rounded cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Velocidad de Animación ({speed}s)
            </label>
            <input
              type="range"
              min={10}
              max={60}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-cyan-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Rápido (10s)</span>
              <span>Lento (60s)</span>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 md:col-span-2">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-600" />
            <span>Colores del Cintillo</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Color de Fondo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Color del Texto</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-200 p-0.5 cursor-pointer"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Ticker Items CRUD List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Mensajes del Ticker ({items.length})</h3>
            <p className="text-xs text-slate-500">Crea, edita o elimina los anuncios rotativos</p>
          </div>
        </div>

        {/* Add new item form */}
        <form onSubmit={handleAddItem} className="flex gap-2">
          <input
            type="text"
            required
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Escribe un nuevo mensaje para el ticker (ej. 📦 ENVÍO CONTRA ENTREGA GRATIS)..."
            className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        </form>

        {/* Items List */}
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={() => handleToggleItem(item.id)}
                  className="w-4 h-4 accent-cyan-600 rounded cursor-pointer"
                  title="Activar / Desactivar mensaje"
                />
                <span className={`text-xs font-semibold ${item.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                  {item.text}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditingItem(item)}
                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                  title="Editar texto"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                  title="Eliminar mensaje"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900">Editar Mensaje del Ticker</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Texto del Mensaje</label>
              <textarea
                rows={3}
                value={editingItem.text}
                onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditItem}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold cursor-pointer"
              >
                Guardar Modificación
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
