import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit2,
  Eye,
  EyeOff,
  Check, 
  X,
  Save, 
  Percent,
  Sliders
} from 'lucide-react';
import { StoreSettings } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';

interface AdminShippingRatesProps {
  settings: StoreSettings;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

interface DepartmentRate {
  id: string;
  department: string;
  deliveryDays: string;
  rateCOP: number;
  codEnabled: boolean;
  active?: boolean;
}

export const AdminShippingRates: React.FC<AdminShippingRatesProps> = ({
  settings,
  onSaveSettings
}) => {
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    settings.freeShippingThreshold || 120000
  );
  const [defaultShippingRate, setDefaultShippingRate] = useState(15000);
  const [codSurchargeRate, setCodSurchargeRate] = useState(0); // $0 COP por flete contra entrega gratis promocional

  const [rates, setRates] = useState<DepartmentRate[]>([
    { id: 'z1', department: 'Zona 1 (Local / Principales): Bogotá, Medellín y AM, Cali, Barranquilla, Bucaramanga', deliveryDays: '24 a 48 Horas Hábiles', rateCOP: 11000, codEnabled: true, active: true },
    { id: 'z2', department: 'Zona 2 (Nacional Estándar): Cundinamarca, Boyacá, Tolima, Huila, Caldas, Risaralda, Quindío, Bolívar, Córdoba, Cesar, Magdalena, Sucre, Norte de Santander, Meta, Casanare, Cauca, Nariño', deliveryDays: '2 a 4 Días Hábiles', rateCOP: 16500, codEnabled: true, active: true },
    { id: 'z3', department: 'Zona 3 (Especiales / Reexpedición): Arauca, Chocó, La Guajira, Putumayo, Caquetá, Amazonas, Guainía, Guaviare, Vaupés, Vichada, San Andrés y Providencia', deliveryDays: '4 a 7 Días Hábiles', rateCOP: 28000, codEnabled: true, active: true },
  ]);

  const [editingRate, setEditingRate] = useState<DepartmentRate | null>(null);
  const [newDept, setNewDept] = useState('');
  const [newDays, setNewDays] = useState('2 a 4 Días');
  const [newRate, setNewRate] = useState(15000);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.trim()) return;

    setRates([
      ...rates,
      {
        id: `rate-${Date.now()}`,
        department: newDept.trim(),
        deliveryDays: newDays.trim() || '2 a 4 Días',
        rateCOP: newRate,
        codEnabled: true,
        active: true
      }
    ]);
    setNewDept('');
    setNewDays('2 a 4 Días');
    setNewRate(15000);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar la tarifa para "${name}"?`)) return;
    setRates(rates.filter(r => r.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setRates(rates.map(r => r.id === id ? { ...r, active: r.active === false ? true : false } : r));
  };

  const handleStartEdit = (rate: DepartmentRate) => {
    setEditingRate({ ...rate, active: rate.active !== false });
  };

  const handleSaveEdit = () => {
    if (!editingRate) return;
    setRates(rates.map(r => r.id === editingRate.id ? editingRate : r));
    setEditingRate(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        freeShippingThreshold
      });
      alert('Tarifas de envío contra entrega para Colombia guardadas correctamente.');
    } catch (err: any) {
      alert('Error al guardar tarifas.');
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
            GRUPO 6: LOGÍSTICA & FLETES
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Tarifas de Envío & Tiempos de Entrega
          </h2>
          <p className="text-xs text-slate-500">
            Modifica, elimina, oculta o crea nuevas zonas y tarifas de flete contra entrega para Colombia.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
        >
          {isSaving ? 'Guardando...' : 'Guardar Tarifas'}
        </button>
      </div>

      {/* Global Shipping Rules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 block">Umbral de Envío Gratis</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={freeShippingThreshold}
              onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <span className="text-[10px] text-slate-400">Compras superiores no pagan flete.</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 block">Flete Estándar Base</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={defaultShippingRate}
              onChange={(e) => setDefaultShippingRate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <span className="text-[10px] text-slate-400">Tarifa por defecto si no hay zona.</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 block">Recargo por Recaudo COD</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={codSurchargeRate}
              onChange={(e) => setCodSurchargeRate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl font-bold"
            />
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">
            $0 COP = Beneficio de Pago Contra Entrega sin comisión extra.
          </span>
        </div>
      </div>

      {/* Add Department Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-cyan-600" />
          <span>Añadir Región o Departamento Específico</span>
        </h3>
        
        <form onSubmit={handleAddDepartment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <input
            type="text"
            required
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            placeholder="Departamento / Zona (ej. Huila, Tolima)"
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden font-bold"
          />
          <input
            type="text"
            value={newDays}
            onChange={(e) => setNewDays(e.target.value)}
            placeholder="Tiempos de entrega (ej. 2 a 3 Días)"
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
          />
          <input
            type="number"
            value={newRate}
            onChange={(e) => setNewRate(Number(e.target.value))}
            placeholder="Tarifa Flete COP"
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Zona</span>
          </button>
        </form>
      </div>

      {/* Rates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Departamento / Región</th>
                <th className="px-4 py-3.5">Tiempos Estimados</th>
                <th className="px-4 py-3.5">Tarifa Flete</th>
                <th className="px-4 py-3.5">Pago Contra Entrega</th>
                <th className="px-4 py-3.5">Visibilidad</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {rates.map((r) => {
                const isVisible = r.active !== false;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                      <span className={isVisible ? 'text-slate-900' : 'text-slate-400 line-through'}>{r.department}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.deliveryDays}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{formatCOP(r.rateCOP)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.codEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {r.codEnabled ? '✓ Habilitado' : 'Desactivado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(r.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                          isVisible ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{isVisible ? 'Visible' : 'Oculto'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStartEdit(r)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 cursor-pointer"
                          title="Modificar tarifa y tiempos"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id, r.department)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          title="Eliminar zona"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-600" />
                <span>Modificar Tarifa de Envío</span>
              </h3>
              <button
                onClick={() => setEditingRate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Región / Departamento</label>
                <input
                  type="text"
                  value={editingRate.department}
                  onChange={(e) => setEditingRate({ ...editingRate, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiempos Estimados de Entrega</label>
                <input
                  type="text"
                  value={editingRate.deliveryDays}
                  onChange={(e) => setEditingRate({ ...editingRate, deliveryDays: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Costo de Flete ($ COP)</label>
                <input
                  type="number"
                  value={editingRate.rateCOP}
                  onChange={(e) => setEditingRate({ ...editingRate, rateCOP: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Pago Contra Entrega (COD)</div>
                  <div className="text-[11px] text-slate-500">Permitir pago en efectivo en destino</div>
                </div>
                <input
                  type="checkbox"
                  checked={editingRate.codEnabled}
                  onChange={(e) => setEditingRate({ ...editingRate, codEnabled: e.target.checked })}
                  className="w-4 h-4 accent-cyan-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Estado de Visibilidad</div>
                  <div className="text-[11px] text-slate-500">¿Mostrar esta opción en el checkout?</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRate({ ...editingRate, active: editingRate.active !== false ? false : true })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    editingRate.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {editingRate.active !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{editingRate.active !== false ? 'Visible' : 'Oculto'}</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRate(null)}
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
