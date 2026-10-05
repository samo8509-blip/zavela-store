import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  Mail, 
  Calendar, 
  X, 
  MessageCircle, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Customer } from '../../types/index.ts';

export interface CpanelCustomerItem {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  created_at: string;
}

interface AdminCustomersProps {
  customers?: Customer[];
  onRefresh?: () => void;
}

export const AdminCustomers: React.FC<AdminCustomersProps> = ({
  customers = [],
  onRefresh
}) => {
  const [cpanelCustomers, setCpanelCustomers] = useState<CpanelCustomerItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<'cpanel_direct' | 'cpanel_backend' | 'local_fallback'>('cpanel_backend');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Modal para registrar nuevo cliente
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: 'Bogotá D.C.',
    departamento: 'Cundinamarca'
  });

  /**
   * Carga los clientes desde la API de cPanel (http://api.zavelastore.com.co/api.php?action=clientes)
   * con arquitectura de fallback transparente:
   * 1. Intento directo a la API de cPanel si es accesible por el navegador.
   * 2. Si falla o hay bloqueo de mixed-content/CORS, recurre a /api/admin/cpanel-customers (proxy backend seguro).
   * 3. Si ambos fallan, usa los clientes locales pasados por prop.
   */
  const loadCpanelCustomers = async () => {
    setIsRefreshing(true);
    let loaded = false;

    // Intento 1: Fetch directo al endpoint de cPanel
    try {
      const directController = new AbortController();
      const directTimeout = setTimeout(() => directController.abort(), 3500);

      const res = await fetch('http://api.zavelastore.com.co/api.php?action=clientes', {
        headers: { 'Accept': 'application/json' },
        signal: directController.signal
      });
      clearTimeout(directTimeout);

      if (res.ok) {
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {}

        if (Array.isArray(json)) {
          setCpanelCustomers(json.map(normalizeCpanelItem));
          setDataSource('cpanel_direct');
          setLastSyncTime(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          loaded = true;
        }
      }
    } catch {
      // Ignorar fallo de CORS/Mixed-Content directo y continuar al paso 2
    }

    // Intento 2: Backend proxy (evita bloqueos HTTPS / HTTP en producción)
    if (!loaded) {
      try {
        const res = await fetch('/api/admin/cpanel-customers');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setCpanelCustomers(json.data.map(normalizeCpanelItem));
            setDataSource('cpanel_backend');
            setLastSyncTime(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            loaded = true;
          }
        }
      } catch (err) {
        console.warn('Fallo al obtener clientes vía backend proxy:', err);
      }
    }

    // Intento 3: Fallback a clientes de la base local
    if (!loaded) {
      if (customers && customers.length > 0) {
        const fallbackList: CpanelCustomerItem[] = customers.map(c => ({
          id: c.id,
          nombre: `${c.firstName} ${c.lastName || ''}`.trim(),
          email: c.email || '',
          telefono: c.phone || '',
          direccion: c.address || '',
          ciudad: c.city || 'Bogotá D.C.',
          created_at: c.createdAt || new Date().toISOString()
        }));
        setCpanelCustomers(fallbackList);
        setDataSource('local_fallback');
      }
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadCpanelCustomers();
  }, []);

  const normalizeCpanelItem = (item: any): CpanelCustomerItem => {
    return {
      id: String(item.id || `cust-${Math.random().toString(36).substring(2, 7)}`),
      nombre: item.nombre || item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Cliente Zavela',
      email: item.email || '',
      telefono: item.telefono || item.phone || '',
      direccion: item.direccion || item.address || '',
      ciudad: item.ciudad || item.city || 'Bogotá D.C.',
      created_at: item.created_at || item.createdAt || item.fecha || new Date().toISOString()
    };
  };

  // Formato de fecha legible en español
  const formatRegisterDate = (dateStr: string) => {
    if (!dateStr) return 'Reciente';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Formatear teléfono para Colombia
  const cleanPhoneNumber = (phone: string) => {
    return (phone || '').replace(/\D/g, '');
  };

  // Generar enlace directo de WhatsApp
  const getWhatsAppLink = (customer: CpanelCustomerItem) => {
    const rawNumber = cleanPhoneNumber(customer.telefono);
    const validNumber = rawNumber.startsWith('57') ? rawNumber : `57${rawNumber}`;
    const firstName = customer.nombre.split(' ')[0] || 'Cliente';
    const text = encodeURIComponent(
      `¡Hola ${firstName}! Te saludamos cordialmente desde el equipo de atención al cliente de Zavela Store. ¿En qué podemos asesorarte el día de hoy?`
    );
    return `https://wa.me/${validNumber}?text=${text}`;
  };

  // Guardar nuevo cliente tanto en cPanel como en backend
  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        nombre: form.nombre.trim(),
        name: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        phone: form.telefono.trim(),
        direccion: form.direccion.trim(),
        address: form.direccion.trim(),
        ciudad: form.ciudad.trim(),
        city: form.ciudad.trim(),
        departamento: form.departamento.trim(),
        department: form.departamento.trim()
      };

      // 1. Envío vía backend seguro
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // 2. Intento directo a cPanel HTTP
      fetch('http://api.zavelastore.com.co/api.php?action=clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (res.ok) {
        setIsCreating(false);
        setForm({
          nombre: '',
          email: '',
          telefono: '',
          direccion: '',
          ciudad: 'Bogotá D.C.',
          departamento: 'Cundinamarca'
        });
        await loadCpanelCustomers();
        if (onRefresh) onRefresh();
      } else {
        alert('Error al registrar cliente');
      }
    } catch (err: any) {
      alert(err?.message || 'Error al conectar');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtro de búsqueda rápida por NOMBRE o TELÉFONO (además de email o ciudad)
  const filteredCustomers = cpanelCustomers.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const cleanQ = cleanPhoneNumber(q);
    const cleanCustomerPhone = cleanPhoneNumber(c.telefono);

    return (
      c.nombre.toLowerCase().includes(q) ||
      (cleanQ.length > 0 && cleanCustomerPhone.includes(cleanQ)) ||
      c.telefono.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.ciudad.toLowerCase().includes(q) ||
      c.direccion.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Title Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-[#0A1128] text-white shadow-xs">
              <Users className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Clientes / Usuarios Registrados</span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 text-xs font-black font-mono">
                  {cpanelCustomers.length} en MySQL
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Base de datos de compradores sincronizada en tiempo real con MySQL cPanel vía{' '}
                <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                  action=clientes
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Connection Source Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50">
            <span className={`w-2 h-2 rounded-full ${
              dataSource === 'cpanel_direct' || dataSource === 'cpanel_backend'
                ? 'bg-emerald-500 animate-pulse' 
                : 'bg-amber-500'
            }`} />
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-700">
              {dataSource === 'cpanel_direct' && 'cPanel Directo (200 OK)'}
              {dataSource === 'cpanel_backend' && 'cPanel MySQL (Render)'}
              {dataSource === 'local_fallback' && 'Fallback Local Activo'}
            </span>
            {lastSyncTime && (
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                ({lastSyncTime})
              </span>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadCpanelCustomers}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refrescar lista desde cPanel"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {/* New Customer Button */}
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Quick Search & Summary Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o número telefónico..."
            className="w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-hidden transition-all font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-1 rounded-full hover:bg-slate-200 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
          <span className="font-bold text-slate-800">
            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'resultado' : 'resultados'}
          </span>
          {search && (
            <span className="text-slate-400">
              filtrados para &ldquo;<strong className="text-indigo-600">{search}</strong>&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A1128] text-white uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="px-5 py-3.5">Nombre</th>
                <th className="px-5 py-3.5">Teléfono</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Dirección</th>
                <th className="px-5 py-3.5">Ciudad</th>
                <th className="px-5 py-3.5">Fecha de Registro</th>
                <th className="px-5 py-3.5 text-right">Contacto WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin" />
                      <span className="font-bold text-slate-600">Consultando base de datos cPanel MySQL...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-700">No se encontraron clientes registrados</p>
                      <p className="text-xs text-slate-400">
                        {search 
                          ? 'Ningún cliente coincide con el criterio de búsqueda por nombre o teléfono.'
                          : 'Los clientes que se registren en la tienda aparecerán aquí automáticamente en la base de datos MySQL.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const hasPhone = Boolean(cleanPhoneNumber(cust.telefono));
                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* 1. Nombre */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-cyan-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-200">
                            {(cust.nombre || 'C')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 block leading-tight">
                              {cust.nombre}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {cust.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Teléfono */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-800 font-mono font-bold">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{cust.telefono || 'Sin registrar'}</span>
                        </div>
                      </td>

                      {/* 3. Email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{cust.email || 'Sin correo'}</span>
                        </div>
                      </td>

                      {/* 4. Dirección */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate max-w-[200px]" title={cust.direccion}>
                            {cust.direccion || 'Sin dirección'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Ciudad */}
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                          {cust.ciudad || 'No especificada'}
                        </span>
                      </td>

                      {/* 6. Fecha de registro */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{formatRegisterDate(cust.created_at)}</span>
                        </div>
                      </td>

                      {/* 7. Botón de acción rápida: WhatsApp */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {hasPhone ? (
                          <a
                            href={getWhatsAppLink(cust)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs hover:shadow-emerald-500/20 transition-all cursor-pointer group active:scale-95"
                            title={`Abrir chat de WhatsApp con ${cust.nombre}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-white fill-white/20 group-hover:scale-110 transition-transform" />
                            <span>Contactar WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Sin teléfono
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REGISTRAR NUEVO CLIENTE (MANUAL O TEST) */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 animate-fadeIn border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-100 text-cyan-800">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Registrar Nuevo Cliente en cPanel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Los datos se guardarán en MySQL y quedarán disponibles para compras y contacto
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Laura Morales"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="Ej. 3157894521"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-hidden font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="laura@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ciudad *</label>
                  <input
                    type="text"
                    required
                    value={form.ciudad}
                    onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                    placeholder="Ej. Medellín"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-hidden font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={form.departamento}
                    onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                    placeholder="Ej. Antioquia"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-hidden font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección de Entrega *</label>
                <input
                  type="text"
                  required
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Ej. Calle 10 # 43-20 Apto 301"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-hidden font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando en cPanel...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar Cliente</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
