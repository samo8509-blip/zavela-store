import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Phone, 
  MapPin, 
  DollarSign, 
  ShoppingBag, 
  X, 
  MessageCircle,
  Clock,
  UserCheck
} from 'lucide-react';
import { Customer } from '../../types/index.ts';
import { formatCOP, formatDate } from '../../utils/formatters.ts';

interface AdminCustomersProps {
  customers: Customer[];
  onRefresh: () => void;
}

export const AdminCustomers: React.FC<AdminCustomersProps> = ({
  customers,
  onRefresh
}) => {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // New customer form state
  const [form, setForm] = useState<Partial<Customer>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Bogotá D.C.',
    city: 'Bogotá D.C.',
    address: '',
    notes: '',
    totalOrders: 0,
    totalSpent: 0
  });

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const isEdit = Boolean(editingCustomer?.id);
      const url = isEdit ? `/api/admin/customers/${editingCustomer!.id}` : '/api/admin/customers';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { ...editingCustomer } : { ...form };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al guardar cliente');

      setIsCreating(false);
      setEditingCustomer(null);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: 'Bogotá D.C.',
        city: 'Bogotá D.C.',
        address: '',
        notes: '',
        totalOrders: 0,
        totalSpent: 0
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al procesar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el registro del cliente ${name}?`)) return;

    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar cliente');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Directorio de Clientes Zavela</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold font-mono">
              {customers.length} registros
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Historial de compradores, direcciones de despacho y contacto directo por WhatsApp.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nuevo Cliente</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, celular, email o ciudad..."
          className="w-full pl-9 pr-3 py-2.5 text-xs bg-white rounded-xl border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-hidden"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Contacto</th>
                <th className="px-4 py-3.5">Ubicación</th>
                <th className="px-4 py-3.5">Historial</th>
                <th className="px-4 py-3.5">Total Comprado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                          {cust.firstName[0]}
                        </div>
                        <span>{cust.firstName} {cust.lastName}</span>
                      </div>
                      {cust.notes && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                          Nota: {cust.notes}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-800 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{cust.phone}</span>
                      </div>
                      {cust.email && <div className="text-[11px] text-slate-400">{cust.email}</div>}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-800">{cust.city}, {cust.department}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{cust.address}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                        {cust.totalOrders} pedidos
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-black text-slate-900">{formatCOP(cust.totalSpent)}</div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`https://wa.me/57${cust.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(cust.firstName)},%20te%20escribimos%20de%20Zavela%20Store`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setEditingCustomer(cust)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                          title="Modificar Datos"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust.id, `${cust.firstName} ${cust.lastName}`)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {(isCreating || editingCustomer) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingCustomer ? 'Modificar Datos del Cliente' : 'Registrar Nuevo Cliente'}
                </h3>
                <p className="text-xs text-slate-500">Completa la información para contacto y despachos</p>
              </div>
              <button
                onClick={() => { setIsCreating(false); setEditingCustomer(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer ? editingCustomer.firstName : form.firstName}
                    onChange={(e) => editingCustomer 
                      ? setEditingCustomer({ ...editingCustomer, firstName: e.target.value })
                      : setForm({ ...form, firstName: e.target.value })
                    }
                    placeholder="Ej. Laura"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={editingCustomer ? editingCustomer.lastName || '' : form.lastName || ''}
                    onChange={(e) => editingCustomer 
                      ? setEditingCustomer({ ...editingCustomer, lastName: e.target.value })
                      : setForm({ ...form, lastName: e.target.value })
                    }
                    placeholder="Ej. Morales"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Celular / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={editingCustomer ? editingCustomer.phone : form.phone}
                    onChange={(e) => editingCustomer 
                      ? setEditingCustomer({ ...editingCustomer, phone: e.target.value })
                      : setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="Ej. 3123456789"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingCustomer ? editingCustomer.email || '' : form.email || ''}
                    onChange={(e) => editingCustomer 
                      ? setEditingCustomer({ ...editingCustomer, email: e.target.value })
                      : setForm({ ...form, email: e.target.value })
                    }
                    placeholder="cliente@correo.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={editingCustomer ? editingCustomer.department || '' : form.department || ''}
                    onChange={(e) => editingCustomer 
                      ? setEditingCustomer({ ...editingCustomer, department: e.target.value })
                      : setForm({ ...form, department: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={editingCustomer ? editingCustomer.city || '' : form.city || ''}
                    onChange={(e) => editingCustomer 
                      ? setEditingCustomer({ ...editingCustomer, city: e.target.value })
                      : setForm({ ...form, city: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección de Entrega</label>
                <input
                  type="text"
                  value={editingCustomer ? editingCustomer.address || '' : form.address || ''}
                  onChange={(e) => editingCustomer 
                    ? setEditingCustomer({ ...editingCustomer, address: e.target.value })
                    : setForm({ ...form, address: e.target.value })
                  }
                  placeholder="Calle, Carrera, Barrio, Conjunto, Apto..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas Internas</label>
                <textarea
                  rows={2}
                  value={editingCustomer ? editingCustomer.notes || '' : form.notes || ''}
                  onChange={(e) => editingCustomer 
                    ? setEditingCustomer({ ...editingCustomer, notes: e.target.value })
                    : setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="Preferencias del cliente, observaciones de entrega..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditingCustomer(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  {isProcessing ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
