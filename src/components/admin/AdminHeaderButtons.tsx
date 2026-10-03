import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  ShoppingBag, 
  Truck, 
  HelpCircle,
  Eye,
  EyeOff,
  Check,
  X,
  Sparkles,
  Link,
  MessageCircle
} from 'lucide-react';
import { StoreSettings } from '../../types/index.ts';

interface AdminHeaderButtonsProps {
  settings: StoreSettings;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

interface HeaderButtonConfig {
  id: string;
  label: string;
  url: string;
  highlight: boolean;
  active: boolean;
}

export const AdminHeaderButtons: React.FC<AdminHeaderButtonsProps> = ({
  settings,
  onSaveSettings
}) => {
  const [searchPlaceholder, setSearchPlaceholder] = useState(
    'Buscar audífonos, compresor, arrancador, freidoras de aire...'
  );
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [showTrackingButton, setShowTrackingButton] = useState(true);
  const [trackingButtonText, setTrackingButtonText] = useState('Rastrear Mi Pedido');
  const [showCartCount, setShowCartCount] = useState(true);
  const [showWhatsAppDirect, setShowWhatsAppDirect] = useState(true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    settings.freeShippingThreshold || 120000
  );

  const [buttons, setButtons] = useState<HeaderButtonConfig[]>([
    { id: 'b1', label: 'Rastrear Mi Pedido', url: '#tracking', highlight: true, active: true },
    { id: 'b2', label: 'Ofertas Flash 24H', url: '#offers', highlight: false, active: true },
    { id: 'b3', label: 'Pago Contra Entrega', url: '#cod-info', highlight: false, active: true },
    { id: 'b4', label: 'Atención WhatsApp', url: '#whatsapp', highlight: true, active: true }
  ]);

  const [editingBtn, setEditingBtn] = useState<HeaderButtonConfig | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newHighlight, setNewHighlight] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    setButtons([
      ...buttons,
      {
        id: `btn-${Date.now()}`,
        label: newLabel.trim(),
        url: newUrl.trim() || '#',
        highlight: newHighlight,
        active: true
      }
    ]);
    setNewLabel('');
    setNewUrl('');
    setNewHighlight(false);
  };

  const handleToggle = (id: string) => {
    setButtons(buttons.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`¿Eliminar el botón "${label}"?`)) return;
    setButtons(buttons.filter(b => b.id !== id));
  };

  const handleStartEdit = (btn: HeaderButtonConfig) => {
    setEditingBtn({ ...btn });
  };

  const handleSaveEdit = () => {
    if (!editingBtn) return;
    setButtons(buttons.map(b => b.id === editingBtn.id ? editingBtn : b));
    setEditingBtn(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        freeShippingThreshold
      });
      alert('Configuración de botones y accesos de cabecera guardada correctamente.');
    } catch (err: any) {
      alert('Error al guardar configuración.');
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
            GRUPO 2: ENCABEZADO & ACCESOS
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Botones y Accesos de Cabecera (Header)
          </h2>
          <p className="text-xs text-slate-500">
            Modifica, elimina, oculta o haz visible cualquier botón, acceso o barra de búsqueda en la parte superior.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
        >
          {isSaving ? 'Guardando...' : 'Guardar Todos los Cambios'}
        </button>
      </div>

      {/* Grid: Search bar & Core Toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Core Controls & Global Visibility */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">Buscador y Accesos Principales</h3>
            <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md">Controles Globales</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Texto Sugerido en el Buscador (Placeholder)
              </label>
              <button
                type="button"
                onClick={() => setShowSearchBar(!showSearchBar)}
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                  showSearchBar ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {showSearchBar ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{showSearchBar ? 'Visible' : 'Oculto'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchPlaceholder}
                onChange={(e) => setSearchPlaceholder(e.target.value)}
                placeholder="Texto del buscador..."
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Botón de Rastreo de Envíos
              </label>
              <button
                type="button"
                onClick={() => setShowTrackingButton(!showTrackingButton)}
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                  showTrackingButton ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {showTrackingButton ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{showTrackingButton ? 'Visible' : 'Oculto'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={trackingButtonText}
                onChange={(e) => setTrackingButtonText(e.target.value)}
                placeholder="Rastrear Mi Pedido"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-medium"
              />
              <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Monto Mínimo para Envío Gratis ($ COP)
            </label>
            <input
              type="number"
              value={freeShippingThreshold}
              onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Los pedidos por encima de este valor se marcan automáticamente con flete gratis $0 COP.
            </span>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700">Contador Flotante de Carrito</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCartCount(!showCartCount)}
                className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  showCartCount ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {showCartCount ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showCartCount ? 'Visible' : 'Oculto'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">Botón Flotante de WhatsApp 24/7</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppDirect(!showWhatsAppDirect)}
                className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                  showWhatsAppDirect ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {showWhatsAppDirect ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showWhatsAppDirect ? 'Visible' : 'Oculto'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Custom Header CTA Buttons List with Full CRUD */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Botones & Accesos de Navegación</h3>
              <p className="text-xs text-slate-500">Puedes crear, modificar, ocultar o eliminar botones</p>
            </div>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {buttons.length} botones
            </span>
          </div>

          {/* Add Form */}
          <form onSubmit={handleAddButton} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-600" />
              <span>Añadir Nuevo Botón / Enlace</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Título del botón (ej. 🔥 Ofertas Hoy)"
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-medium"
              />
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="#seccion o https://..."
                className="sm:w-36 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.checked)}
                  className="w-3.5 h-3.5 accent-cyan-600 rounded"
                />
                <span>Destacar con brillo</span>
              </label>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Botón</span>
              </button>
            </div>
          </form>

          {/* Buttons List */}
          <div className="divide-y divide-slate-100 space-y-1">
            {buttons.map((btn) => (
              <div key={btn.id} className="py-2.5 flex items-center justify-between gap-3 group hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(btn.id)}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                      btn.active 
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                    title={btn.active ? 'Clic para Ocultar' : 'Clic para Hacer Visible'}
                  >
                    {btn.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span className="text-[10px]">{btn.active ? 'Visible' : 'Oculto'}</span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate ${btn.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                        {btn.label}
                      </span>
                      {btn.highlight && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800">
                          DESTACADO
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono truncate block">{btn.url}</span>
                  </div>
                </div>

                {/* Actions: Modify & Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(btn)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-cyan-100 text-slate-700 hover:text-cyan-800 transition-colors cursor-pointer"
                    title="Modificar botón"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(btn.id, btn.label)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition-colors cursor-pointer"
                    title="Eliminar botón"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Edit Modal for Button */}
      {editingBtn && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-600" />
                <span>Modificar Botón de Cabecera</span>
              </h3>
              <button
                onClick={() => setEditingBtn(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre / Texto del Botón</label>
                <input
                  type="text"
                  value={editingBtn.label}
                  onChange={(e) => setEditingBtn({ ...editingBtn, label: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Enlace / Destino (URL o #ancla)</label>
                <input
                  type="text"
                  value={editingBtn.url}
                  onChange={(e) => setEditingBtn({ ...editingBtn, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Estado de Visibilidad</div>
                  <div className="text-[11px] text-slate-500">¿Mostrar este botón en la tienda?</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBtn({ ...editingBtn, active: !editingBtn.active })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    editingBtn.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {editingBtn.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{editingBtn.active ? 'Visible' : 'Oculto'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Efecto Destacado</div>
                  <div className="text-[11px] text-slate-500">Fondo brillante para mayor conversión</div>
                </div>
                <input
                  type="checkbox"
                  checked={editingBtn.highlight}
                  onChange={(e) => setEditingBtn({ ...editingBtn, highlight: e.target.checked })}
                  className="w-4 h-4 accent-cyan-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBtn(null)}
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

