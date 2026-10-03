import React, { useState } from 'react';
import { 
  Sparkles, 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  Eye, 
  QrCode, 
  ShoppingBag, 
  Layers, 
  Sliders, 
  Tag, 
  DollarSign, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Gem,
  ToggleLeft,
  ToggleRight,
  ArrowUp,
  ArrowDown,
  Copy,
  RotateCcw,
  ShieldCheck,
  Package,
  Info
} from 'lucide-react';
import { 
  StoreSettings, 
  ExclusivityPageSettings, 
  PlateOption, 
  ExclusivityBagProduct, 
  PlateShape, 
  PlateFinish 
} from '../../types/index.ts';
import { DEFAULT_EXCLUSIVITY_SETTINGS, getResolvedExclusivitySettings } from '../../utils/exclusivityPresets.ts';

interface AdminExclusivitySettingsProps {
  settings: StoreSettings;
  onSaveSettings: (updatedSettings: Partial<StoreSettings>) => Promise<void>;
}

export const AdminExclusivitySettings: React.FC<AdminExclusivitySettingsProps> = ({
  settings,
  onSaveSettings
}) => {
  const currentSettings = getResolvedExclusivitySettings(settings.exclusivityPage);
  
  const [form, setForm] = useState<ExclusivityPageSettings>({ ...currentSettings });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'bags' | 'plates'>('bags');
  const [editingPlate, setEditingPlate] = useState<PlateOption | null>(null);
  const [editingBag, setEditingBag] = useState<ExclusivityBagProduct | null>(null);
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = async (customForm?: ExclusivityPageSettings) => {
    try {
      setIsSaving(true);
      const dataToSave = customForm || form;
      await onSaveSettings({
        exclusivityPage: dataToSave
      });
      showToast('Ajustes de la Colección Exclusiva guardados exitosamente.');
    } catch (err: any) {
      alert('Error al guardar ajustes: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  // Plates CRUD & Reordering
  const handleTogglePlate = (plateId: string) => {
    const updatedPlates = form.plates.map(p => 
      p.id === plateId ? { ...p, active: !p.active } : p
    );
    const updated = { ...form, plates: updatedPlates };
    setForm(updated);
    handleSave(updated);
  };

  const handleMovePlate = (index: number, direction: 'up' | 'down') => {
    const newPlates = [...form.plates];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newPlates.length) return;
    const temp = newPlates[index];
    newPlates[index] = newPlates[targetIdx];
    newPlates[targetIdx] = temp;
    const updated = { ...form, plates: newPlates };
    setForm(updated);
    handleSave(updated);
  };

  const handleDuplicatePlate = (plate: PlateOption) => {
    const newPlate: PlateOption = {
      ...plate,
      id: 'plate-' + Date.now(),
      name: `${plate.name} (Copia)`
    };
    const updated = { ...form, plates: [...form.plates, newPlate] };
    setForm(updated);
    handleSave(updated);
    showToast('Modelo de placa duplicado.');
  };

  const handleDeletePlate = (plateId: string) => {
    if (confirm('¿Eliminar este modelo de placa metálica?')) {
      const updated = { ...form, plates: form.plates.filter(p => p.id !== plateId) };
      setForm(updated);
      handleSave(updated);
      showToast('Modelo de placa eliminado.');
    }
  };

  const handleSavePlateModal = () => {
    if (!editingPlate) return;
    const exists = form.plates.some(p => p.id === editingPlate.id);
    let updatedPlates: PlateOption[];
    if (exists) {
      updatedPlates = form.plates.map(p => p.id === editingPlate.id ? editingPlate : p);
    } else {
      updatedPlates = [...form.plates, editingPlate];
    }
    const updated = { ...form, plates: updatedPlates };
    setForm(updated);
    setEditingPlate(null);
    handleSave(updated);
  };

  // Bags CRUD & Reordering
  const handleToggleBag = (bagId: string) => {
    const updatedBags = form.curatedProducts.map(b => 
      b.id === bagId ? { ...b, active: !b.active } : b
    );
    const updated = { ...form, curatedProducts: updatedBags };
    setForm(updated);
    handleSave(updated);
  };

  const handleMoveBag = (index: number, direction: 'up' | 'down') => {
    const newBags = [...form.curatedProducts];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newBags.length) return;
    const temp = newBags[index];
    newBags[index] = newBags[targetIdx];
    newBags[targetIdx] = temp;
    const updated = { ...form, curatedProducts: newBags };
    setForm(updated);
    handleSave(updated);
  };

  const handleDuplicateBag = (bag: ExclusivityBagProduct) => {
    const newBag: ExclusivityBagProduct = {
      ...bag,
      id: 'bag-' + Date.now(),
      slug: `${bag.slug}-copia-${Date.now()}`,
      title: `${bag.title} (Nueva Variación)`
    };
    const updated = { ...form, curatedProducts: [...form.curatedProducts, newBag] };
    setForm(updated);
    handleSave(updated);
    showToast('Bolso duplicado para la colección.');
  };

  const handleDeleteBag = (bagId: string) => {
    if (confirm('¿Eliminar este bolso de la colección exclusiva?')) {
      const updatedBags = form.curatedProducts.filter(b => b.id !== bagId);
      const updated = { ...form, curatedProducts: updatedBags };
      setForm(updated);
      handleSave(updated);
      showToast('Bolso eliminado de la colección.');
    }
  };

  const handleSaveBagModal = () => {
    if (!editingBag) return;
    const exists = form.curatedProducts.some(b => b.id === editingBag.id);
    let updatedBags: ExclusivityBagProduct[];
    if (exists) {
      updatedBags = form.curatedProducts.map(b => b.id === editingBag.id ? editingBag : b);
    } else {
      updatedBags = [...form.curatedProducts, editingBag];
    }
    const updated = { ...form, curatedProducts: updatedBags };
    setForm(updated);
    setEditingBag(null);
    handleSave(updated);
  };

  const handleResetDefaults = () => {
    if (confirm('¿Restaurar los bolsos y placas oficiales del lookbook Rochy 2026?')) {
      setForm({ ...DEFAULT_EXCLUSIVITY_SETTINGS });
      handleSave(DEFAULT_EXCLUSIVITY_SETTINGS);
      showToast('Colección oficial 2026 restaurada.');
    }
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

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-[#0A0D14] via-[#141B2D] to-[#0A1128] border border-[#2A3A60] rounded-3xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-lg shrink-0">
            <Gem className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">Colección Exclusiva (Bolsos & Placas)</h2>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                Lookbook 2026
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Administra la subpágina exclusiva inspirada en el catálogo Rochy. Agrega y personaliza piezas únicas y placas metálicas sin agregarlas al inventario principal de la tienda.
            </p>
          </div>
        </div>

        {/* Global Enable / Disable Switch */}
        <div className="flex items-center gap-4 bg-[#0A1128]/90 p-3 rounded-2xl border border-[#2A3A60]">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-200">
              {form.enabled ? '🟢 Subpágina Activada' : '🔴 Subpágina Desactivada'}
            </div>
            <div className="text-[10px] text-slate-400">
              {form.enabled ? 'Visible en menú y navegación' : 'Oculta en la tienda'}
            </div>
          </div>
          <button
            onClick={() => {
              const updated = { ...form, enabled: !form.enabled };
              setForm(updated);
              handleSave(updated);
            }}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
              form.enabled ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-300 ${
                form.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ISOLATION GUARANTEE NOTICE BANNER */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-amber-500/10 to-transparent border border-[#0084FF]/30 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0084FF] text-white flex items-center justify-center font-bold shrink-0">
            🔒
          </div>
          <div>
            <div className="font-black text-slate-900">Colección 100% Exclusiva y Aislada</div>
            <div className="text-slate-600 text-[11px]">
              Los productos y placas configurados aquí pertenecen exclusivamente a la subpágina VIP de bolsos y no se mezclan con el inventario o catálogo principal de la tienda.
            </div>
          </div>
        </div>

        <button
          onClick={handleResetDefaults}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
          title="Restaurar catálogo oficial Rochy"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Predefinidos</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('bags')}
          className={`px-5 py-3 text-xs font-black rounded-t-2xl border-b-2 transition flex items-center gap-2 ${
            activeTab === 'bags'
              ? 'border-[#0084FF] text-[#0084FF] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Catálogo de Bolsos Exclusivos ({form.curatedProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plates')}
          className={`px-5 py-3 text-xs font-black rounded-t-2xl border-b-2 transition flex items-center gap-2 ${
            activeTab === 'plates'
              ? 'border-[#0084FF] text-[#0084FF] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Modelos de Placas Metálicas ({form.plates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`px-5 py-3 text-xs font-black rounded-t-2xl border-b-2 transition flex items-center gap-2 ${
            activeTab === 'general'
              ? 'border-[#0084FF] text-[#0084FF] bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Textos & Banner Lookbook</span>
        </button>
      </div>

      {/* TAB 1: BAGS CATALOG MANAGEMENT (CRUD + REORDERING) */}
      {activeTab === 'bags' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Diseños de Bolsos Artesanales de Cuentas ({form.curatedProducts.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Usa las flechas para ordenar cómo se apilan en la página.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingBag({
                  id: 'bag-' + Date.now(),
                  title: 'Nuevo Bolso Artesanal de Cuentas',
                  slug: 'nuevo-bolso-artesanal-' + Date.now(),
                  subtitle: 'Tejido a mano con cuentas y placa Rochy de autenticidad',
                  description: 'Diseño artesanal exclusivo confeccionado en Colombia con más de 1.200 cuentas engarzadas.',
                  priceCOP: 159900,
                  compareAtPriceCOP: 210000,
                  material: 'Cuentas Nacaradas Acrílicas HD + Herrajes Zamak',
                  color: 'Blanco Perla Satinado',
                  dimensions: '22 cm x 16 cm x 7 cm',
                  craftsmanTag: '💎 Hecho a Mano en Colombia • Diseño por Rochy',
                  images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80'],
                  stock: 10,
                  active: true,
                  featured: true,
                  defaultPlateShape: 'round',
                  defaultPlateFinish: 'gold_engraved',
                  rating: 5.0,
                  reviewCount: 12,
                  freeShipping: true,
                  cashOnDelivery: true,
                  tags: ['bolso de cuentas', 'exclusivo', 'rochy', 'edicion limitada']
                });
              }}
              className="px-4 py-2.5 bg-[#0084FF] hover:bg-[#0070db] text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Nuevo Bolso a la Colección</span>
            </button>
          </div>

          {/* Bags Stacked List in Admin */}
          <div className="space-y-4">
            {form.curatedProducts.map((bag, index) => (
              <div
                key={bag.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition flex flex-col md:flex-row items-center justify-between gap-4 ${
                  bag.active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {/* Order Controls */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveBag(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                      title="Mover arriba"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveBag(index, 'down')}
                      disabled={index === form.curatedProducts.length - 1}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                      title="Mover abajo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img
                      src={bag.images[0]}
                      alt={bag.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Bag Info */}
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">#{index + 1}</span>
                      <h4 className="font-black text-slate-900 text-sm truncate">{bag.title}</h4>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        bag.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {bag.active ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate max-w-md">{bag.subtitle}</p>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                      <span>Color: <strong>{bag.color}</strong></span>
                      <span>Stock: <strong>{bag.stock} uds.</strong></span>
                      <span>Medidas: <strong>{bag.dimensions}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <div className="text-sm font-black text-slate-950">
                      ${bag.priceCOP.toLocaleString('es-CO')} COP
                    </div>
                    <div className="text-[10px] text-slate-400 line-through">
                      ${bag.compareAtPriceCOP.toLocaleString('es-CO')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleBag(bag.id)}
                      className={`p-2 rounded-xl text-xs font-bold transition ${
                        bag.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600'
                      }`}
                      title={bag.active ? 'Pausar Bolso' : 'Activar Bolso'}
                    >
                      {bag.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleDuplicateBag(bag)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                      title="Duplicar Bolso"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setEditingBag(bag)}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0084FF] text-xs font-bold transition"
                      title="Editar Bolso"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteBag(bag.id)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition"
                      title="Eliminar Bolso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PLATES SHOWCASE MANAGEMENT (CRUD + REORDERING) */}
      {activeTab === 'plates' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Modelos de Placas Metálicas de Autenticidad ({form.plates.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Configura los grabados láser, acabados metálicos y códigos QR para los bolsos exclusivos.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPlate({
                  id: 'plate-' + Date.now(),
                  shape: 'round',
                  name: 'Nueva Placa Metálica',
                  dimensions: '3 cm Ø',
                  finish: 'gold_engraved',
                  finishLabel: 'Dorado Grabado 24K',
                  brandText: 'Rochy',
                  sloganText: 'IDENTIDAD VISUAL',
                  qrPosition: 'center',
                  qrUrl: 'https://zavelastore.com/autenticidad',
                  active: true,
                  description: 'Grabado láser de alta precisión con tecnología QR activa.'
                });
              }}
              className="px-4 py-2.5 bg-[#0084FF] hover:bg-[#0070db] text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Modelo de Placa</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.plates.map((plate, index) => (
              <div
                key={plate.id}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                  plate.active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${
                      plate.shape === 'round' ? 'rounded-full' : 'rounded-lg'
                    } ${
                      plate.finish === 'gold_engraved'
                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                        : plate.finish === 'black_matte'
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}>
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">{plate.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {plate.dimensions} • {plate.finishLabel}
                      </div>
                      <div className="text-[10px] text-[#0084FF] font-bold mt-0.5">
                        Logo: "{plate.brandText}" ({plate.sloganText})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMovePlate(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded bg-slate-100 text-slate-600 disabled:opacity-30 text-xs"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMovePlate(index, 'down')}
                      disabled={index === form.plates.length - 1}
                      className="p-1 rounded bg-slate-100 text-slate-600 disabled:opacity-30 text-xs"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {plate.description && (
                  <p className="text-[11px] text-slate-500 mt-3 line-clamp-2">
                    {plate.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => handleTogglePlate(plate.id)}
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                      plate.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {plate.active ? 'Activa' : 'Inactiva'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDuplicatePlate(plate)}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                      title="Duplicar Placa"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingPlate(plate)}
                      className="p-1.5 rounded-lg text-[#0084FF] hover:bg-blue-50 font-bold flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeletePlate(plate.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                      title="Eliminar Placa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GENERAL SETTINGS & HERO */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Configuración de Textos & Encabezado Lookbook</span>
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-4 py-2 bg-[#0084FF] hover:bg-[#0070db] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Texto en el Menú de Navegación:
              </label>
              <input
                type="text"
                value={form.navTitle}
                onChange={(e) => setForm({ ...form, navTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#0084FF] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Badge Superior del Hero:
              </label>
              <input
                type="text"
                value={form.heroBadge}
                onChange={(e) => setForm({ ...form, heroBadge: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#0084FF] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Título Principal del Hero:
              </label>
              <input
                type="text"
                value={form.heroTitle}
                onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-[#0084FF] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Subtítulo Descriptivo:
              </label>
              <textarea
                value={form.heroSubtitle}
                onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#0084FF] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Título de la Sección de Placas:
              </label>
              <input
                type="text"
                value={form.platesShowcaseTitle}
                onChange={(e) => setForm({ ...form, platesShowcaseTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#0084FF] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Subtítulo de la Sección de Placas:
              </label>
              <input
                type="text"
                value={form.platesShowcaseSubtitle}
                onChange={(e) => setForm({ ...form, platesShowcaseSubtitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#0084FF] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Texto del Certificado de Garantía y Artesanía:
              </label>
              <textarea
                value={form.craftsmanshipGuaranteeText || ''}
                onChange={(e) => setForm({ ...form, craftsmanshipGuaranteeText: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#0084FF] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / ADD BAG */}
      {editingBag && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Editar Bolso Exclusivo de Cuentas</h3>
                <span className="text-[10px] text-amber-600 font-bold">💎 Exclusivo de esta subpágina VIP</span>
              </div>
              <button
                onClick={() => setEditingBag(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Título del Bolso:</label>
                <input
                  type="text"
                  value={editingBag.title}
                  onChange={(e) => setEditingBag({ ...editingBag, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-[#0084FF] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subtítulo / Resumen:</label>
                <input
                  type="text"
                  value={editingBag.subtitle}
                  onChange={(e) => setEditingBag({ ...editingBag, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#0084FF] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Precio COP (Venta):</label>
                  <input
                    type="number"
                    value={editingBag.priceCOP}
                    onChange={(e) => setEditingBag({ ...editingBag, priceCOP: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-black text-[#0084FF]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Precio Tachado:</label>
                  <input
                    type="number"
                    value={editingBag.compareAtPriceCOP}
                    onChange={(e) => setEditingBag({ ...editingBag, compareAtPriceCOP: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-400"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Stock Disponible:</label>
                  <input
                    type="number"
                    value={editingBag.stock}
                    onChange={(e) => setEditingBag({ ...editingBag, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Material:</label>
                  <input
                    type="text"
                    value={editingBag.material}
                    onChange={(e) => setEditingBag({ ...editingBag, material: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Color de Cuentas:</label>
                  <input
                    type="text"
                    value={editingBag.color}
                    onChange={(e) => setEditingBag({ ...editingBag, color: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Medidas (cm):</label>
                  <input
                    type="text"
                    value={editingBag.dimensions}
                    onChange={(e) => setEditingBag({ ...editingBag, dimensions: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Multiple Images Manager */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">Imágenes del Bolso ({editingBag.images.length}):</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newImageUrl.trim()) {
                        setEditingBag({
                          ...editingBag,
                          images: [...editingBag.images, newImageUrl.trim()]
                        });
                        setNewImageUrl('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-900 text-white rounded-xl font-bold"
                  >
                    + Agregar Foto
                  </button>
                </div>

                {/* Images list */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {editingBag.images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          if (editingBag.images.length > 1) {
                            setEditingBag({
                              ...editingBag,
                              images: editingBag.images.filter((_, idx) => idx !== i)
                            });
                          } else {
                            alert('El bolso debe tener al menos 1 imagen.');
                          }
                        }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descripción Detallada:</label>
                <textarea
                  value={editingBag.description}
                  onChange={(e) => setEditingBag({ ...editingBag, description: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingBag(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBagModal}
                className="px-5 py-2.5 rounded-xl bg-[#0084FF] text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Bolso</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / ADD PLATE */}
      {editingPlate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Editar Modelo de Placa Metálica</h3>
                <span className="text-[10px] text-amber-600 font-bold">Tecnología Láser y Código QR</span>
              </div>
              <button
                onClick={() => setEditingPlate(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del Modelo:</label>
                <input
                  type="text"
                  value={editingPlate.name}
                  onChange={(e) => setEditingPlate({ ...editingPlate, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Geometría / Forma:</label>
                  <select
                    value={editingPlate.shape}
                    onChange={(e) => setEditingPlate({ ...editingPlate, shape: e.target.value as PlateShape })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="round">Circular (Redonda)</option>
                    <option value="rectangular">Rectangular</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dimensiones:</label>
                  <input
                    type="text"
                    value={editingPlate.dimensions}
                    onChange={(e) => setEditingPlate({ ...editingPlate, dimensions: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Acabado Metálico:</label>
                  <select
                    value={editingPlate.finish}
                    onChange={(e) => setEditingPlate({ ...editingPlate, finish: e.target.value as PlateFinish })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="gold_engraved">Dorado Grabado 24K</option>
                    <option value="black_matte">Negro Mate Obsidiana</option>
                    <option value="silver_chrome">Plata Platino Espejo</option>
                    <option value="rose_gold">Oro Rosa</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Etiqueta de Acabado:</label>
                  <input
                    type="text"
                    value={editingPlate.finishLabel}
                    onChange={(e) => setEditingPlate({ ...editingPlate, finishLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Logo / Texto de Marca:</label>
                  <input
                    type="text"
                    value={editingPlate.brandText}
                    onChange={(e) => setEditingPlate({ ...editingPlate, brandText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Slogan / Leyenda Inferior:</label>
                  <input
                    type="text"
                    value={editingPlate.sloganText}
                    onChange={(e) => setEditingPlate({ ...editingPlate, sloganText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">URL Predeterminada para el QR:</label>
                <input
                  type="url"
                  value={editingPlate.qrUrl || ''}
                  onChange={(e) => setEditingPlate({ ...editingPlate, qrUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="https://zavelastore.com/autenticidad"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descripción del Grabado:</label>
                <textarea
                  value={editingPlate.description || ''}
                  onChange={(e) => setEditingPlate({ ...editingPlate, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingPlate(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlateModal}
                className="px-5 py-2.5 rounded-xl bg-[#0084FF] text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Placa</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
