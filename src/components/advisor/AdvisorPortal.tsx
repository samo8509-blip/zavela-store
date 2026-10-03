import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  User, 
  Package, 
  Truck, 
  DollarSign, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  MessageSquare, 
  Phone, 
  MapPin, 
  Search, 
  LogOut, 
  ArrowLeft, 
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  Percent,
  Layers,
  Send,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Store
} from 'lucide-react';
import { Advisor, AdvisorSale, Product, DropiStatus } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { ZavelaLogo } from '../ZavelaLogo.tsx';

interface AdvisorPortalProps {
  advisor: Advisor;
  products?: Product[];
  onLogout: () => void;
  onBackToStore: () => void;
}

const COLOMBIA_CITIES = [
  { city: 'Bogotá D.C.', dept: 'Cundinamarca' },
  { city: 'Medellín', dept: 'Antioquia' },
  { city: 'Cali', dept: 'Valle del Cauca' },
  { city: 'Barranquilla', dept: 'Atlántico' },
  { city: 'Bucaramanga', dept: 'Santander' },
  { city: 'Cartagena', dept: 'Bolívar' },
  { city: 'Pereira', dept: 'Risaralda' },
  { city: 'Manizales', dept: 'Caldas' },
  { city: 'Cúcuta', dept: 'Norte de Santander' },
  { city: 'Ibagué', dept: 'Tolima' },
  { city: 'Santa Marta', dept: 'Magdalena' },
  { city: 'Villavicencio', dept: 'Meta' },
  { city: 'Pasto', dept: 'Nariño' },
  { city: 'Montería', dept: 'Córdoba' },
  { city: 'Neiva', dept: 'Huila' },
  { city: 'Armenia', dept: 'Quindío' },
  { city: 'Valledupar', dept: 'Cesar' },
  { city: 'Popayán', dept: 'Cauca' },
  { city: 'Sincelejo', dept: 'Sucre' },
  { city: 'Tunja', dept: 'Boyacá' },
  { city: 'Envigado', dept: 'Antioquia' },
  { city: 'Bello', dept: 'Antioquia' },
  { city: 'Itagüí', dept: 'Antioquia' },
  { city: 'Soacha', dept: 'Cundinamarca' },
  { city: 'Floridablanca', dept: 'Santander' },
  { city: 'Palmira', dept: 'Valle del Cauca' },
  { city: 'Dosquebradas', dept: 'Risaralda' },
  { city: 'Soledad', dept: 'Atlántico' }
];

export const AdvisorPortal: React.FC<AdvisorPortalProps> = ({
  advisor,
  products = [],
  onLogout,
  onBackToStore
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'my_sales' | 'catalog'>('register');
  const [mySales, setMySales] = useState<AdvisorSale[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lastCreatedOrder, setLastCreatedOrder] = useState<AdvisorSale | null>(null);

  // Form state
  const [productTitle, setProductTitle] = useState<string>('Reloj Smartwatch Ultra');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(80000);
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientCity, setClientCity] = useState<string>('Medellín');
  const [clientDepartment, setClientDepartment] = useState<string>('Antioquia');
  const [clientAddress, setClientAddress] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Unstructured chat paste
  const [chatText, setChatText] = useState<string>('');
  const [isParsingChat, setIsParsingChat] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load sales of this advisor
  const loadMySales = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/advisor-sales?advisorId=${advisor.id}`);
      const json = await res.json();
      if (json.success) {
        setMySales(json.data || []);
      }
    } catch (e) {
      console.error('Error fetching advisor sales:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMySales();
  }, [advisor.id]);

  // Handle product selection from store list
  const handleSelectProduct = (prod: Product) => {
    setProductTitle(prod.title);
    setUnitPrice(prod.price);
  };

  // Handle city selection
  const handleCityChange = (cityName: string) => {
    setClientCity(cityName);
    const found = COLOMBIA_CITIES.find(c => c.city.toLowerCase() === cityName.toLowerCase());
    if (found) {
      setClientDepartment(found.dept);
    }
  };

  // Handle WhatsApp chat parsing
  const handleParseChat = async () => {
    if (!chatText.trim()) {
      showToast('Pega primero el texto del chat para extraer datos.');
      return;
    }

    try {
      setIsParsingChat(true);
      const res = await fetch('/api/admin/advisor-sales/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chatText })
      });
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        if (d.productTitle) setProductTitle(d.productTitle);
        if (d.quantity) setQuantity(d.quantity);
        if (d.unitPrice) setUnitPrice(d.unitPrice);
        if (d.clientName) setClientName(d.clientName);
        if (d.clientPhone) setClientPhone(d.clientPhone);
        if (d.clientCity) {
          setClientCity(d.clientCity);
          if (d.clientDepartment) setClientDepartment(d.clientDepartment);
        }
        if (d.clientAddress) setClientAddress(d.clientAddress);
        if (d.additionalNotes) setAdditionalNotes(d.additionalNotes);

        showToast('✨ ¡Datos extraídos del chat con éxito!');
      } else {
        showToast('No se pudieron detectar todos los datos. Completa el formulario manualmente.');
      }
    } catch (e) {
      console.error(e);
      showToast('Error al procesar el texto.');
    } finally {
      setIsParsingChat(false);
    }
  };

  // Submit sale
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      showToast('Ingresa el nombre completo del cliente.');
      return;
    }
    if (!clientPhone.trim() || clientPhone.replace(/\D/g, '').length < 7) {
      showToast('Ingresa un número de celular o WhatsApp válido (10 dígitos).');
      return;
    }
    if (!clientAddress.trim()) {
      showToast('Ingresa la dirección completa de entrega.');
      return;
    }
    if (!productTitle.trim()) {
      showToast('Indica el nombre del producto vendido.');
      return;
    }

    const cleanPhone = clientPhone.replace(/\D/g, '');
    const finalQuantity = Number(quantity) || 1;
    const finalUnitPrice = Number(unitPrice) || 0;
    const finalTotal = finalUnitPrice * finalQuantity;

    const payload: Partial<AdvisorSale> = {
      advisorId: advisor.id,
      advisorName: advisor.name,
      advisorChannel: advisor.channel,
      productTitle: productTitle.trim(),
      quantity: finalQuantity,
      unitPrice: finalUnitPrice,
      totalAmount: finalTotal,
      clientName: clientName.trim(),
      clientPhone: cleanPhone,
      clientCity: clientCity.trim(),
      clientDepartment: clientDepartment.trim(),
      clientAddress: clientAddress.trim(),
      additionalNotes: additionalNotes.trim(),
      dropiStatus: 'pendiente_bolsa',
      paymentMethod: 'contra_entrega'
    };

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/advisor-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success && json.data) {
        setLastCreatedOrder(json.data);
        showToast(`🎉 ¡Venta registrada exitosamente! Orden ${json.data.orderNumber}`);
        
        // Reset form
        setClientName('');
        setClientPhone('');
        setClientAddress('');
        setAdditionalNotes('');
        setChatText('');
        
        await loadMySales();
      } else {
        showToast(json.message || 'Error al guardar la venta');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión al registrar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const validSales = mySales.filter(s => s.dropiStatus !== 'cancelado');
  const totalSalesCOP = validSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalUnits = validSales.reduce((sum, s) => sum + (s.quantity || 1), 0);
  const commissionRate = advisor.commissionRate || 10;
  const estimatedCommissionCOP = Math.round((totalSalesCOP * commissionRate) / 100);

  // Filtered sales list
  const filteredSales = mySales.filter(s => {
    if (statusFilter !== 'all' && s.dropiStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.clientName.toLowerCase().includes(q) ||
        s.clientPhone.includes(q) ||
        s.clientCity.toLowerCase().includes(q) ||
        s.productTitle.toLowerCase().includes(q) ||
        s.orderNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: DropiStatus) => {
    switch (status) {
      case 'pendiente_bolsa':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">🟡 En Bolsa de Despacho</span>;
      case 'montado_dropi':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">🔵 Despacho Confirmado</span>;
      case 'guia_generada':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">🟣 Guía Generada</span>;
      case 'enviado':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">🚚 En Ruta a Entrega</span>;
      case 'entregado':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🟢 Entregado</span>;
      case 'cancelado':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">🔴 Cancelado</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">Pendiente</span>;
    }
  };

  return (
    <div id="advisor-portal-root" className="min-h-screen bg-[#0A0518] text-slate-100 flex flex-col font-sans selection:bg-cyan-400 selection:text-black">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#160B30] text-white px-4 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,245,255,0.4)] flex items-center gap-2.5 border border-cyan-400/60 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0E0622]/95 backdrop-blur-md border-b border-[#2A1750] px-4 sm:px-8 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onBackToStore}
              className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
              title="Volver a la tienda Zavela"
            >
              <ZavelaLogo size="sm" showSlogan={false} />
            </button>
            <div className="h-5 w-px bg-[#2B1754] hidden sm:block" />
            <div className="flex items-center gap-2 bg-[#170C36] px-3 py-1 rounded-full border border-[#2E1857]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00F5FF]" />
              <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                Portal de Asesor
              </span>
            </div>
          </div>

          {/* Advisor identity info & quick actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-black text-white flex items-center justify-end gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                {advisor.name}
              </span>
              <span className="text-[10px] text-violet-300/80 font-mono">
                ID: {advisor.id} • {advisor.channel}
              </span>
            </div>

            <button
              onClick={onBackToStore}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#160B33] hover:bg-[#200F48] text-violet-200 hover:text-white border border-[#2E1857] text-xs font-semibold transition-all cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ver Tienda</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden xs:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        
        {/* Advisor Hero Card & Live Performance KPIs */}
        <div className="bg-gradient-to-br from-[#160B33] via-[#120829] to-[#0D051E] border border-[#2D1854] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/15 via-violet-600/20 to-transparent blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Welcome text */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-[10px] font-mono font-black text-cyan-300 uppercase tracking-widest">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Panel de Registro de Ventas Directas
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                ¡Bienvenido(a), {advisor.name}!
              </h1>
              <p className="text-xs text-violet-200/80 max-w-xl">
                Registra aquí manualmente cada venta que cierres por WhatsApp o redes sociales. Cada pedido se consolidará automáticamente en la <strong className="text-cyan-300">Bolsa de Despachos de Sergio Martínez</strong> para su envío con pago contra entrega.
              </p>
            </div>

            {/* Quick KPI stats pill cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              <div className="bg-[#0C061C]/80 border border-[#2B1754] rounded-2xl p-3 text-center">
                <span className="text-[10px] font-mono uppercase text-violet-400 font-bold block">Mis Ventas</span>
                <span className="text-sm sm:text-base font-mono font-black text-emerald-400">
                  {formatCOP(totalSalesCOP)}
                </span>
              </div>

              <div className="bg-[#0C061C]/80 border border-[#2B1754] rounded-2xl p-3 text-center">
                <span className="text-[10px] font-mono uppercase text-violet-400 font-bold block">Pedidos</span>
                <span className="text-sm sm:text-base font-mono font-black text-cyan-400">
                  {validSales.length} órdenes
                </span>
              </div>

              <div className="bg-[#0C061C]/80 border border-[#2B1754] rounded-2xl p-3 text-center">
                <span className="text-[10px] font-mono uppercase text-violet-400 font-bold block">Unidades</span>
                <span className="text-sm sm:text-base font-mono font-black text-violet-200">
                  {totalUnits} uds
                </span>
              </div>

              <div className="bg-[#0C061C]/80 border border-[#2B1754] rounded-2xl p-3 text-center">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">Mi Comisión ({commissionRate}%)</span>
                <span className="text-sm sm:text-base font-mono font-black text-amber-300">
                  {formatCOP(estimatedCommissionCOP)}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#27154A] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 font-black shadow-[0_0_20px_rgba(0,245,255,0.4)]'
                : 'bg-[#140B2E] text-violet-300 hover:text-white hover:bg-[#1C0F3E] border border-[#2C1752]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Subir Nueva Venta Manual</span>
          </button>

          <button
            onClick={() => setActiveTab('my_sales')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'my_sales'
                ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 font-black shadow-[0_0_20px_rgba(0,245,255,0.4)]'
                : 'bg-[#140B2E] text-violet-300 hover:text-white hover:bg-[#1C0F3E] border border-[#2C1752]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Mis Pedidos Subidos ({mySales.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 font-black shadow-[0_0_20px_rgba(0,245,255,0.4)]'
                : 'bg-[#140B2E] text-violet-300 hover:text-white hover:bg-[#1C0F3E] border border-[#2C1752]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Catálogo & Precios de Referencia</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: FORMULARIO PARA SUBIR VENTA MANUAL + PARSER CHAT */}
        {/* ========================================================= */}
        {activeTab === 'register' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Quick chat extractor */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#13092A] border border-[#2D1854] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-black text-sm text-white">Pegar Chat de WhatsApp</h3>
                </div>
                <p className="text-xs text-violet-300/80 leading-relaxed">
                  ¿Cerraste la venta por chat? Copia el mensaje del cliente y pégalo aquí. El extractor inteligente auto-llenará los campos de producto, cliente, ciudad y dirección.
                </p>

                <div className="space-y-2">
                  <textarea
                    rows={7}
                    value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    placeholder={`Ejemplo de mensaje recibido:\n\nProducto: Reloj Smartwatch Ultra (2 unidades) - $160.000\nCliente: Carlos Pérez\nTeléfono: 3101234567\nCiudad: Medellín, Antioquia\nDirección: Calle 10 # 40-20 Apto 301`}
                    className="w-full bg-[#0C061C] border border-[#2D1854] rounded-2xl p-3.5 text-xs text-white placeholder:text-violet-400/50 focus:outline-none focus:border-cyan-400 font-mono leading-relaxed"
                  />

                  <button
                    type="button"
                    onClick={handleParseChat}
                    disabled={isParsingChat || !chatText.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(0,245,255,0.3)] cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isParsingChat ? 'animate-spin' : ''}`} />
                    <span>{isParsingChat ? 'Extrayendo Datos...' : '⚡ Auto-Completar Formulario'}</span>
                  </button>
                </div>

                <div className="bg-[#0C061C]/80 p-3 rounded-2xl border border-[#2B1754] text-[11px] text-violet-300/90 space-y-1">
                  <div className="font-bold text-cyan-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ejemplo rápido para probar:
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatText(`Producto: Reloj Smartwatch Ultra (2 unidades) - $160.000\nCliente: Carlos Pérez\nTeléfono: 3101234567\nCiudad: Medellín, Antioquia\nDirección: Calle 10 # 40-20 Apto 301\nNotas: Entregar en horario de oficina`)}
                    className="text-cyan-400 hover:underline cursor-pointer block text-left"
                  >
                    👉 Cargar pedido de ejemplo de Smartwatch (2 unidades)
                  </button>
                </div>
              </div>

              {/* Order Confirmation Card if last created */}
              {lastCreatedOrder && (
                <div className="bg-gradient-to-br from-emerald-950/70 to-[#0F1E19] border border-emerald-500/50 rounded-3xl p-5 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-black text-sm text-white">¡Último Pedido Montado en Bolsa de Despacho!</span>
                  </div>
                  <div className="text-xs text-emerald-200/90 space-y-1 bg-[#091511] p-3.5 rounded-2xl border border-emerald-600/30">
                    <div><strong>Número de Pedido:</strong> <span className="font-mono font-bold text-amber-300">{lastCreatedOrder.orderNumber}</span></div>
                    <div><strong>Producto:</strong> {lastCreatedOrder.productTitle} ({lastCreatedOrder.quantity} unds)</div>
                    <div><strong>Cliente:</strong> {lastCreatedOrder.clientName} - {lastCreatedOrder.clientPhone}</div>
                    <div><strong>Destino:</strong> {lastCreatedOrder.clientCity}, {lastCreatedOrder.clientDepartment}</div>
                    <div><strong>Total Contra Entrega:</strong> <span className="font-mono font-bold text-emerald-300">{formatCOP(lastCreatedOrder.totalAmount)}</span></div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`https://wa.me/57${lastCreatedOrder.clientPhone}?text=${encodeURIComponent(`Hola ${lastCreatedOrder.clientName}, te saluda ${advisor.name} de Zavela Store. Confirmamos tu pedido ${lastCreatedOrder.orderNumber} (${lastCreatedOrder.productTitle}) por valor de ${formatCOP(lastCreatedOrder.totalAmount)} con Pago Contra Entrega. Pronto lo despacharemos a ${lastCreatedOrder.clientCity}. ¡Gracias por tu compra!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Notificar por WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Structured form for manual sale */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSubmitSale} className="bg-[#13092A] border border-[#2D1854] rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
                
                <div className="flex items-center justify-between border-b border-[#27154A] pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00F5FF]" />
                    <h2 className="font-black text-sm sm:text-base text-white">
                      Formulario de Venta Manual
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300 font-bold bg-cyan-950 px-2.5 py-1 rounded-full border border-cyan-800/60">
                    Modalidad: Pago Contra Entrega
                  </span>
                </div>

                {/* Advisor Assigned Fixed Display */}
                <div className="bg-[#0C061C] border border-[#27154A] rounded-2xl p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-950 flex items-center justify-center border border-cyan-800/60 text-cyan-300 font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-violet-400 uppercase font-bold block">Asesor que Registra</span>
                      <span className="text-xs font-bold text-white">{advisor.name} ({advisor.id})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-violet-400 uppercase font-bold block">Canal Asignado</span>
                    <span className="text-xs font-mono text-cyan-300 font-semibold">{advisor.channel}</span>
                  </div>
                </div>

                {/* Section: Product & Price */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-violet-200">
                      Producto Vendido *
                    </label>
                    {products.length > 0 && (
                      <div className="text-[11px] text-cyan-400 font-medium">
                        Selecciona o escribe el producto
                      </div>
                    )}
                  </div>

                  {/* Quick Pills of Store Products */}
                  {products.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                      {products.filter(p => p.active).map(prod => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectProduct(prod)}
                          className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer truncate max-w-[200px] ${
                            productTitle.toLowerCase() === prod.title.toLowerCase()
                              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                              : 'bg-[#0C061C] text-violet-300 hover:text-white border-[#2E1857] hover:border-cyan-400/40'
                          }`}
                        >
                          {prod.title} ({formatCOP(prod.price)})
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={productTitle}
                    onChange={e => setProductTitle(e.target.value)}
                    placeholder="Ej. Reloj Smartwatch Ultra Serie 9"
                    className="w-full bg-[#0C061C] border border-[#2D1854] rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder:text-violet-400/50 focus:outline-none focus:border-cyan-400 font-semibold"
                    required
                  />

                  {/* Quantity & Unit Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-violet-200">Cantidad (Unidades) *</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-9 h-9 rounded-xl bg-[#0C061C] border border-[#2D1854] text-white font-black hover:border-cyan-400 flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={quantity}
                          onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white text-center font-mono font-black focus:outline-none focus:border-cyan-400"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-9 h-9 rounded-xl bg-[#0C061C] border border-[#2D1854] text-white font-black hover:border-cyan-400 flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-violet-200">Precio Unitario ($ COP) *</label>
                      <input
                        type="number"
                        step="1000"
                        value={unitPrice}
                        onChange={e => setUnitPrice(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Customer Details */}
                <div className="space-y-3 pt-2 border-t border-[#27154A]">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider text-cyan-300">
                    Datos del Cliente (Destinatario)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-violet-200">Nombre Completo del Cliente *</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        placeholder="Ej. Carlos Pérez Gómez"
                        className="w-full bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white placeholder:text-violet-400/50 focus:outline-none focus:border-cyan-400"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-violet-200">Celular / WhatsApp (10 dígitos) *</label>
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={e => setClientPhone(e.target.value)}
                        placeholder="Ej. 3101234567"
                        className="w-full bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white placeholder:text-violet-400/50 font-mono focus:outline-none focus:border-cyan-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-violet-200">Ciudad de Destino *</label>
                      <div className="space-y-1">
                        <select
                          value={clientCity}
                          onChange={e => handleCityChange(e.target.value)}
                          className="w-full bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          {COLOMBIA_CITIES.map(c => (
                            <option key={c.city} value={c.city}>{c.city} ({c.dept})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-violet-200">Departamento *</label>
                      <input
                        type="text"
                        value={clientDepartment}
                        onChange={e => setClientDepartment(e.target.value)}
                        placeholder="Ej. Antioquia"
                        className="w-full bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white placeholder:text-violet-400/50 focus:outline-none focus:border-cyan-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-violet-200">
                      Dirección Exacta de Envío *
                    </label>
                    <input
                      type="text"
                      value={clientAddress}
                      onChange={e => setClientAddress(e.target.value)}
                      placeholder="Ej. Calle 10 # 40-20 Apto 301, Barrio El Poblado"
                      className="w-full bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white placeholder:text-violet-400/50 focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-violet-200">
                      Notas de Entrega / Referencias (Opcional)
                    </label>
                    <input
                      type="text"
                      value={additionalNotes}
                      onChange={e => setAdditionalNotes(e.target.value)}
                      placeholder="Ej. Dejar en portería con vigilancia, llamar antes de llegar"
                      className="w-full bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white placeholder:text-violet-400/50 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Total & Commission Calculation Preview */}
                <div className="bg-gradient-to-r from-[#0C061C] to-[#180A36] border border-[#2D1854] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-violet-400 uppercase font-bold block">Total a Cobrar Contra Entrega</span>
                    <span className="text-lg sm:text-xl font-mono font-black text-amber-300">
                      {formatCOP(unitPrice * quantity)} COP
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-cyan-300 uppercase font-bold block">Tu Comisión Estimada ({commissionRate}%)</span>
                    <span className="text-base font-mono font-black text-emerald-400">
                      {formatCOP(Math.round(((unitPrice * quantity) * commissionRate) / 100))} COP
                    </span>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-400 via-[#00E5FF] to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.99] text-slate-950 font-black rounded-2xl text-sm transition-all shadow-[0_0_25px_rgba(0,245,255,0.4)] hover:shadow-[0_0_35px_rgba(0,245,255,0.6)] cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Plus className="w-5 h-5 text-slate-950" />
                  <span>{isSubmitting ? 'Registrando en Bolsa...' : 'Registrar Venta en Bolsa de Despacho'}</span>
                </button>

              </form>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: HISTORIAL DE MIS VENTAS REGISTRADAS */}
        {/* ========================================================= */}
        {activeTab === 'my_sales' && (
          <div className="space-y-4">
            
            {/* Filter toolbar */}
            <div className="bg-[#13092A] border border-[#2D1854] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por cliente, teléfono o pedido..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#0C061C] text-white placeholder:text-violet-400/60 rounded-xl border border-[#2D1854] focus:outline-none focus:border-cyan-400"
                />
                <Search className="w-3.5 h-3.5 text-violet-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pendiente_bolsa">🟡 En Bolsa de Despacho</option>
                  <option value="montado_dropi">🔵 Despacho Confirmado</option>
                  <option value="guia_generada">🟣 Guía Generada</option>
                  <option value="enviado">🚚 En Ruta</option>
                  <option value="entregado">🟢 Entregado</option>
                  <option value="cancelado">🔴 Cancelado</option>
                </select>

                <button
                  onClick={loadMySales}
                  className="px-3 py-2 bg-[#0C061C] hover:bg-[#1A0E3C] border border-[#2D1854] text-violet-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Actualizar tabla"
                >
                  Refrescar
                </button>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-[#13092A] border border-[#2D1854] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0C061C] text-violet-300 font-mono uppercase text-[10px] tracking-wider border-b border-[#27154A]">
                    <tr>
                      <th className="p-3.5">#</th>
                      <th className="p-3.5">ID Pedido</th>
                      <th className="p-3.5">Producto</th>
                      <th className="p-3.5 font-mono text-center">Cant.</th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Teléfono</th>
                      <th className="p-3.5">Ciudad</th>
                      <th className="p-3.5">Dirección</th>
                      <th className="p-3.5 font-mono">Total ($)</th>
                      <th className="p-3.5 font-mono text-amber-300">Comisión</th>
                      <th className="p-3.5">Estado de Despacho</th>
                      <th className="p-3.5 text-right">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#241345] font-sans">
                    {isLoading ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-violet-400">
                          Cargando tus ventas registradas...
                        </td>
                      </tr>
                    ) : filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-violet-400">
                          <ShoppingBag className="w-8 h-8 mx-auto text-violet-500 mb-2 opacity-50" />
                          <div className="font-bold text-white">No tienes ventas registradas con estos filtros.</div>
                          <button
                            onClick={() => setActiveTab('register')}
                            className="mt-3 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            + Subir mi primera venta
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((s, index) => {
                        const sComm = Math.round(((s.totalAmount || 0) * commissionRate) / 100);
                        return (
                          <tr key={s.id} className="hover:bg-[#1A0E3C]/60 transition-colors">
                            <td className="p-3.5 font-mono text-violet-400">{index + 1}</td>
                            <td className="p-3.5 font-mono font-bold text-amber-300">{s.orderNumber}</td>
                            <td className="p-3.5 font-medium text-white max-w-[160px] truncate" title={s.productTitle}>
                              {s.productTitle}
                            </td>
                            <td className="p-3.5 font-mono font-black text-cyan-400 text-center">{s.quantity}</td>
                            <td className="p-3.5 font-bold text-white">{s.clientName}</td>
                            <td className="p-3.5 font-mono text-emerald-400">{s.clientPhone}</td>
                            <td className="p-3.5">{s.clientCity}</td>
                            <td className="p-3.5 text-violet-300 max-w-[180px] truncate" title={s.clientAddress}>
                              {s.clientAddress}
                            </td>
                            <td className="p-3.5 font-mono font-black text-white">{formatCOP(s.totalAmount)}</td>
                            <td className="p-3.5 font-mono font-bold text-amber-300">{formatCOP(sComm)}</td>
                            <td className="p-3.5">{getStatusBadge(s.dropiStatus)}</td>
                            <td className="p-3.5 text-right">
                              <a
                                href={`https://wa.me/57${s.clientPhone}?text=${encodeURIComponent(`Hola ${s.clientName}, te saluda ${advisor.name} de Zavela Store. Te escribo respecto a tu pedido ${s.orderNumber} (${s.productTitle}).`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[11px] font-bold transition-all border border-emerald-500/30 cursor-pointer"
                                title="Abrir chat WhatsApp con cliente"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Chat</span>
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CATÁLOGO & PRECIOS DE REFERENCIA */}
        {/* ========================================================= */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <div className="bg-[#13092A] border border-[#2D1854] rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-sm">Catálogo Oficial Zavela Store</h3>
                <p className="text-xs text-violet-300/80 mt-0.5">Precios oficiales recomendados al público con Pago Contra Entrega.</p>
              </div>
              <span className="text-xs font-mono text-cyan-300 font-bold bg-cyan-950 px-3 py-1 rounded-full border border-cyan-800/60">
                {products.length} Productos Disponibles
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.filter(p => p.active).map(prod => {
                const prodComm = Math.round((prod.price * commissionRate) / 100);
                return (
                  <div 
                    key={prod.id} 
                    className="bg-[#13092A] border border-[#2D1854] rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-cyan-400/50 transition-all group"
                  >
                    <div className="flex gap-3 items-start">
                      <img 
                        src={prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'} 
                        alt={prod.title} 
                        className="w-16 h-16 rounded-xl object-cover border border-[#2D1854] shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block">{prod.categoryName || 'Zavela'}</span>
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                          {prod.title}
                        </h4>
                        <div className="font-mono font-black text-sm text-emerald-400">
                          {formatCOP(prod.price)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0C061C] p-2.5 rounded-xl border border-[#27154A] flex items-center justify-between text-xs font-mono">
                      <span className="text-violet-300">Tu Comisión ({commissionRate}%):</span>
                      <span className="text-amber-300 font-bold">{formatCOP(prodComm)}</span>
                    </div>

                    <button
                      onClick={() => {
                        handleSelectProduct(prod);
                        setActiveTab('register');
                      }}
                      className="w-full py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-400/40 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Registrar Venta de Este Producto</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-[#231244] bg-[#0A0417] py-4 text-center text-xs text-violet-400/70">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Zavela Store • Subperfil de Ventas de {advisor.name} ({advisor.id})</span>
          <span>Consolidación automática a la Bolsa de Despachos de Sergio Martínez</span>
        </div>
      </footer>

    </div>
  );
};
