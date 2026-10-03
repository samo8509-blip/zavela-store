import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Save, 
  ShoppingBag, 
  Calendar,
  LogOut,
  Sparkles
} from 'lucide-react';
import { CustomerUser, updateCustomerProfile } from '../utils/customerAuthManager.ts';
import { COLOMBIA_DEPARTMENTS } from '../data/colombiaGeo.ts';
import { getCustomerOrders } from '../utils/customerOrdersManager.ts';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CustomerUser | null;
  onLogout: () => void;
  onOpenOrders: () => void;
  showToast?: (msg: string) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onOpenOrders,
  showToast
}) => {
  if (!isOpen || !currentUser) return null;

  const [name, setName] = useState(currentUser.name || `${currentUser.firstName} ${currentUser.lastName}`.trim());
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [department, setDepartment] = useState(currentUser.department || 'Bogotá D.C.');
  const [city, setCity] = useState(currentUser.city || 'Bogotá D.C.');
  const [address, setAddress] = useState(currentUser.address || '');
  const [isSaved, setIsSaved] = useState(false);

  const currentDeptObj = COLOMBIA_DEPARTMENTS.find(d => d.name === department) || COLOMBIA_DEPARTMENTS[0];
  const orderCount = getCustomerOrders().length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || '';

    updateCustomerProfile({
      name: name.trim(),
      firstName,
      lastName,
      phone: phone.trim(),
      department,
      city: city.trim(),
      address: address.trim()
    });

    setIsSaved(true);
    if (showToast) {
      showToast('✅ Tus datos personales y de envío fueron actualizados con éxito.');
    }
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-[#0B1528] to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-md">
              {(currentUser.firstName || currentUser.name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Mi Perfil y Direcciones
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                  Activo
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {currentUser.email}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Highlights / Stats Bar */}
        <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200 p-3 text-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOrders();
            }}
            className="p-2 rounded-xl hover:bg-white transition-all cursor-pointer text-left flex items-center gap-2.5 border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Historial</div>
              <div className="text-xs font-black text-slate-900">{orderCount} Pedidos activos</div>
            </div>
          </button>

          <div className="p-2 text-left flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Garantía</div>
              <div className="text-xs font-black text-emerald-700">Contra Entrega</div>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nombre Completo
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 text-slate-500 rounded-xl border border-slate-200 cursor-not-allowed"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Teléfono / WhatsApp
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="310 123 4567"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-300 focus:border-sky-500 outline-none transition-all"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Departamento
              </label>
              <select
                value={department}
                onChange={(e) => {
                  const nextDept = e.target.value;
                  setDepartment(nextDept);
                  const found = COLOMBIA_DEPARTMENTS.find(d => d.name === nextDept);
                  if (found && found.cities.length > 0) {
                    setCity(found.cities[0]);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-300 focus:border-sky-500 outline-none transition-all"
              >
                {COLOMBIA_DEPARTMENTS.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ciudad o Municipio
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-300 focus:border-sky-500 outline-none transition-all"
              >
                {currentDeptObj.cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Dirección de Entrega Predeterminada
            </label>
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle/Carrera, número, apartamento o barrio"
                required
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-300 focus:border-sky-500 outline-none transition-all"
              />
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Esta información se precargará de manera automática en el formulario de compra contra entrega.
            </p>
          </div>

          {isSaved && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>¡Datos actualizados correctamente!</span>
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Cerrar mi sesión"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
