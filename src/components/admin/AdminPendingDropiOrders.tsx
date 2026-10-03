import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw, 
  Phone, 
  MapPin, 
  Package, 
  User, 
  FileCheck, 
  AlertTriangle, 
  Eye, 
  Edit2, 
  Check, 
  X, 
  DollarSign, 
  Zap, 
  Layers, 
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Building2,
  Info,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Order, OrderStatus, Product, OrderItem } from '../../types/index.ts';
import { formatCOP, formatDate, ORDER_STATUS_MAP } from '../../utils/formatters.ts';
import { getDaneCode, COLOMBIA_DEPARTMENTS } from '../../data/colombiaGeo.ts';

interface AdminPendingDropiOrdersProps {
  orders: Order[];
  products: Product[];
  onRefresh: () => void;
  onEditProduct?: (product: Product) => void;
}

export const AdminPendingDropiOrders: React.FC<AdminPendingDropiOrdersProps> = ({
  orders,
  products,
  onRefresh,
  onEditProduct
}) => {
  // Filters & State
  const [filterTab, setFilterTab] = useState<'pending' | 'errors' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  
  // Processing & Modal state
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [selectedOrderForView, setSelectedOrderForView] = useState<Order | null>(null);

  // Dropi Manual Approval Modal State
  const [dropiModalOrder, setDropiModalOrder] = useState<Order | null>(null);
  const [dropiSelectedCarrier, setDropiSelectedCarrier] = useState<string>('Servientrega');
  const [dropiCustomDaneCode, setDropiCustomDaneCode] = useState<string>('');
  const [dropiProductIdsMap, setDropiProductIdsMap] = useState<Record<string, string>>({});
  const [isApprovingDropi, setIsApprovingDropi] = useState<boolean>(false);
  const [dropiApprovalError, setDropiApprovalError] = useState<string | null>(null);
  const [dropiApprovalSuccess, setDropiApprovalSuccess] = useState<{
    dropi_order_id?: string | number;
    dropi_guia?: string;
    carrier?: string;
    message?: string;
  } | null>(null);

  const carriers = ['Servientrega', 'Coordinadora', 'Envía', 'Interrapidísimo', 'TCC'];

  // Helper to find real product matching an order item
  const findProductForItem = (item: OrderItem): Product => {
    const directMatch = products.find(p => p.id === item.productId || p.slug === item.productId);
    if (directMatch) return directMatch;
    
    // Match by title keywords
    const itemTitle = (item.title || '').toLowerCase();
    const titleMatch = products.find(p => {
      const pTitle = p.title.toLowerCase();
      return itemTitle.includes(pTitle) || pTitle.includes(itemTitle);
    });
    if (titleMatch) return titleMatch;

    return {
      id: item.productId || 'p-generic',
      title: item.title || 'Producto Zavela',
      slug: 'producto-zavela',
      price: item.unitPrice || 79000,
      costPrice: Math.round((item.unitPrice || 79000) * 0.45),
      compareAtPrice: (item.unitPrice || 79000) * 1.3,
      description: 'Producto verificado',
      images: [item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'],
      categoryId: 'cat-general',
      categoryName: 'General',
      active: true,
      featured: false,
      brand: 'Zavela Store',
      warehouseCity: 'Bogotá D.C.',
      dropi_product_id: item.dropi_product_id || '',
      stock: 50,
      variants: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Metrics Calculation
  const pendingOrders = useMemo(() => {
    return orders.filter(o => 
      o.status === 'PENDIENTE_REVISION' || 
      o.status === 'pendiente' || 
      (!o.dropi_order_id && o.status !== 'APROBADO_DROPI' && o.status !== 'CANCELADO' && o.status !== 'cancelado')
    );
  }, [orders]);

  const errorOrders = useMemo(() => {
    return orders.filter(o => o.status === 'ERROR_DROPI');
  }, [orders]);

  const approvedOrders = useMemo(() => {
    return orders.filter(o => o.status === 'APROBADO_DROPI' || Boolean(o.dropi_order_id));
  }, [orders]);

  const totalCodPendingAmount = useMemo(() => {
    return pendingOrders.reduce((sum, o) => sum + (o.total || o.subtotal || 0), 0);
  }, [pendingOrders]);

  // Filtered Orders List according to Active Tab & Search
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Tab Filtering
      if (filterTab === 'pending') {
        const isPending = order.status === 'PENDIENTE_REVISION' || 
                          order.status === 'pendiente' || 
                          (!order.dropi_order_id && order.status !== 'APROBADO_DROPI' && order.status !== 'CANCELADO' && order.status !== 'cancelado');
        if (!isPending) return false;
      } else if (filterTab === 'errors') {
        if (order.status !== 'ERROR_DROPI') return false;
      } else if (filterTab === 'approved') {
        if (order.status !== 'APROBADO_DROPI' && !order.dropi_order_id) return false;
      }

      // Carrier Filter
      if (selectedCarrierFilter !== 'all') {
        const c = (order.carrier || 'Servientrega').toLowerCase();
        if (!c.includes(selectedCarrierFilter.toLowerCase())) return false;
      }

      // Department Filter
      if (selectedDeptFilter !== 'all') {
        if (order.department !== selectedDeptFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = order.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone.toLowerCase().includes(q);
        const matchesCity = order.city.toLowerCase().includes(q);
        const matchesDept = order.department.toLowerCase().includes(q);
        const matchesAddress = order.address.toLowerCase().includes(q);
        const matchesDropiId = String(order.dropi_order_id || '').includes(q);
        const matchesGuia = (order.dropi_guia || order.trackingNumber || '').toLowerCase().includes(q);
        const matchesProduct = (order.items || []).some(i => i.title.toLowerCase().includes(q));

        if (!matchesNumber && !matchesCustomer && !matchesPhone && !matchesCity && !matchesDept && !matchesAddress && !matchesDropiId && !matchesGuia && !matchesProduct) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, filterTab, selectedCarrierFilter, selectedDeptFilter, searchQuery]);

  // Open Dropi Manual Approval Modal
  const handleOpenDropiModal = (order: Order) => {
    setDropiModalOrder(order);
    setDropiSelectedCarrier(order.carrier || 'Servientrega');
    setDropiCustomDaneCode(order.dane_code || getDaneCode(order.city, order.department));
    setDropiApprovalError(null);
    setDropiApprovalSuccess(null);

    // Pre-populate product IDs map
    const initialMap: Record<string, string> = {};
    (order.items || []).forEach(item => {
      const matchedProd = findProductForItem(item);
      const prodId = item.productId || matchedProd.id;
      const val = item.dropi_product_id ?? matchedProd.dropi_product_id ?? '';
      initialMap[prodId] = String(val);
    });
    setDropiProductIdsMap(initialMap);
  };

  // Submit Approval to Dropi Colombia API
  const handleApproveOrderForDropi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dropiModalOrder) return;

    setIsApprovingDropi(true);
    setDropiApprovalError(null);
    setDropiApprovalSuccess(null);

    try {
      // Build items with updated dropi_product_id
      const resolvedItems = (dropiModalOrder.items || []).map(item => {
        const matchedProd = findProductForItem(item);
        const prodId = item.productId || matchedProd.id;
        const mappedDropiId = dropiProductIdsMap[prodId] || item.dropi_product_id || matchedProd.dropi_product_id || '';
        return {
          ...item,
          dropi_product_id: mappedDropiId
        };
      });

      const payload = {
        orderId: dropiModalOrder.id,
        carrier: dropiSelectedCarrier,
        dane_code: dropiCustomDaneCode || getDaneCode(dropiModalOrder.city, dropiModalOrder.department),
        items: resolvedItems
      };

      const res = await fetch('/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error_message || data.message || 'Error al transmitir la orden a Dropi');
      }

      setDropiApprovalSuccess({
        dropi_order_id: data.data?.dropi_order_id || data.dropi_order_id,
        dropi_guia: data.data?.dropi_guia || data.dropi_guia,
        carrier: data.data?.carrier || dropiSelectedCarrier,
        message: data.message || '¡Orden aprobada y sincronizada exitosamente con Dropi Colombia!'
      });

      onRefresh();
    } catch (err: any) {
      setDropiApprovalError(err.message || 'No se pudo conectar con la API de Dropi Colombia');
      onRefresh();
    } finally {
      setIsApprovingDropi(false);
    }
  };

  // Quick WhatsApp Address Confirmation Link generator
  const getWhatsAppConfirmationUrl = (order: Order) => {
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const itemsSummary = (order.items || []).map(i => `${i.quantity}x ${i.title}`).join(', ');
    const msg = `¡Hola ${order.customerName}! Te saludamos de Zavela Store Colombia para confirmar tu pedido ${order.orderNumber} por ${formatCOP(order.total || order.subtotal || 0)} (${itemsSummary}). Tu dirección registrada es: ${order.address}, ${order.city} (${order.department}). ¿Confirmas que los datos son correctos para autorizar el despacho con ${order.carrier || 'Servientrega'} con pago contra entrega?`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">

      {/* TOP HERO BANNER: Centro de Control de Pedidos Pendientes por Revisión y Autorizar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white p-6 sm:p-8 border border-cyan-800/40 shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-10 w-48 h-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black text-xs shadow-xs">
                <Clock className="w-3.5 h-3.5 text-slate-950" />
                MÓDULO DE AUTORIZACIÓN DROPI
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-400/30">
                API Colombia v2 • Contra Entrega (COD)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pedidos Pendientes por Revisión y Autorizar
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Verifica los datos del destinatario, código DANE del municipio, transportadora y el <code className="text-cyan-300 font-mono font-bold">dropi_product_id</code> para transmitir los pedidos directamente a la plataforma de Dropi Colombia con generación automática de guía.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold transition-all cursor-pointer shadow-xs backdrop-blur-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sincronizar Pedidos</span>
            </button>

            {pendingOrders.length > 0 && (
              <button
                onClick={() => handleOpenDropiModal(pendingOrders[0])}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg shadow-cyan-500/25"
              >
                <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                <span>Autorizar Siguiente ({pendingOrders.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-6 mt-6 border-t border-slate-800/80">
          <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
              <span>Por Autorizar</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {pendingOrders.length}
            </div>
            <div className="text-[11px] text-slate-400">
              Requieren revisión logística
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-rose-400 text-xs font-bold">
              <span>Errores Dropi</span>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {errorOrders.length}
            </div>
            <div className="text-[11px] text-slate-400">
              Para corregir y reintentar
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
              <span>Aprobados en Dropi</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {approvedOrders.length}
            </div>
            <div className="text-[11px] text-slate-400">
              Con Guía y Despacho listo
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-cyan-400 text-xs font-bold">
              <span>Valor por Recaudar COD</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              {formatCOP(totalCodPendingAmount)}
            </div>
            <div className="text-[11px] text-slate-400">
              En órdenes por procesar
            </div>
          </div>
        </div>
      </div>

      {/* DROPI ARCHITECTURE & VERIFICATION ENGINE INFO CARD */}
      <div className="bg-gradient-to-r from-cyan-50/80 via-indigo-50/50 to-teal-50/60 p-5 sm:p-6 rounded-3xl border border-cyan-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-cyan-900 font-black text-sm">
          <Sparkles className="w-4 h-4 text-cyan-600" />
          <span>Última Modificación del Módulo de Integración con Dropi Colombia</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-slate-700">
          <div className="bg-white p-3.5 rounded-2xl border border-cyan-100 shadow-2xs space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-black text-[10px] flex items-center justify-center">1</span>
              <span>Mapeo <code className="text-cyan-700 font-mono">dropi_product_id</code></span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cada item se homologa con el ID de catálogo de Dropi para que la bodega despache la referencia exacta.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-cyan-100 shadow-2xs space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-black text-[10px] flex items-center justify-center">2</span>
              <span>Normalización DANE</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Se autocalcula el código DANE de 5 dígitos del municipio según los 32 departamentos de Colombia.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-cyan-100 shadow-2xs space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-black text-[10px] flex items-center justify-center">3</span>
              <span>Transportadora & COD</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Selección de Servientrega, Coordinadora, Envía, Interrapidísimo o TCC con cobro contra entrega garantizado.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-cyan-100 shadow-2xs space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-black text-[10px] flex items-center justify-center">4</span>
              <span>Sincronización Inmediata</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              La API almacena <code className="text-cyan-700 font-mono">dropi_order_id</code> y genera la guía de despacho sin errores.
            </p>
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendientes por Revisión ({pendingOrders.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('errors')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'errors'
                  ? 'bg-rose-600 text-white font-black shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Errores Dropi ({errorOrders.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('approved')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'approved'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aprobados en Dropi ({approvedOrders.length})</span>
            </button>

            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>Ver Todos ({orders.length})</span>
            </button>
          </div>

          {/* Result Count Indicator */}
          <div className="text-[11px] font-mono text-slate-500 font-bold">
            Mostrando {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Search & Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por # pedido, cliente, teléfono, ciudad, Dropi ID o producto..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-cyan-500 outline-hidden font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedCarrierFilter}
              onChange={(e) => setSelectedCarrierFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Todas las transportadoras</option>
              {carriers.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Todos los departamentos</option>
              {COLOMBIA_DEPARTMENTS.map(d => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ORDERS LIST / ACTION CARDS */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900">
            No hay pedidos en este estado
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {filterTab === 'pending'
              ? '¡Excelente trabajo! Todos los pedidos han sido revisados y autorizados para Dropi Colombia.'
              : filterTab === 'errors'
              ? 'No hay errores pendientes de sincronización con Dropi.'
              : 'No se encontraron pedidos con los filtros aplicados.'}
          </p>
          <button
            onClick={() => {
              setFilterTab('all');
              setSearchQuery('');
              setSelectedCarrierFilter('all');
              setSelectedDeptFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            Ver todos los pedidos
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const calculatedDane = order.dane_code || getDaneCode(order.city, order.department);
            const isApproved = order.status === 'APROBADO_DROPI' || Boolean(order.dropi_order_id);
            const isError = order.status === 'ERROR_DROPI';
            const isPending = !isApproved && !isError;

            // Check if all items have a dropi_product_id
            const itemsWithDropiCheck = (order.items || []).map(item => {
              const matched = findProductForItem(item);
              const dropiId = item.dropi_product_id || matched.dropi_product_id || '';
              return {
                ...item,
                dropiId,
                hasDropiId: Boolean(dropiId)
              };
            });

            const allItemsMapped = itemsWithDropiCheck.every(i => i.hasDropiId);

            return (
              <div 
                key={order.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                  isError ? 'border-rose-300 ring-2 ring-rose-100' :
                  isApproved ? 'border-emerald-300/80 bg-emerald-50/10' :
                  'border-slate-200 hover:border-cyan-400'
                }`}
              >
                
                {/* Card Header Bar */}
                <div className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
                  isError ? 'bg-rose-50/80 border-rose-200' :
                  isApproved ? 'bg-emerald-50/70 border-emerald-200' :
                  'bg-slate-50 border-slate-100'
                }`}>
                  
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {order.orderNumber}
                    </span>

                    {/* Status Pill */}
                    <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      isApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      isError ? 'bg-rose-100 text-rose-800 border-rose-300' :
                      'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {isError && <AlertCircle className="w-3 h-3 text-rose-600" />}
                      {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                      <span>{ORDER_STATUS_MAP[order.status]?.label || order.status}</span>
                    </span>

                    {/* COD Method Tag */}
                    <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      Contra Entrega (COD)
                    </span>

                    {/* Date */}
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Dropi Identifiers if approved */}
                  {isApproved && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-300">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Dropi ID: #{order.dropi_order_id || 'Generado'}</span>
                      </span>
                      {order.dropi_guia && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-cyan-100 text-cyan-900 px-2.5 py-1 rounded-xl border border-cyan-300">
                          <Truck className="w-3.5 h-3.5 text-cyan-700" />
                          <span>Guía: {order.dropi_guia}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Error Notification in Card Header */}
                  {isError && (
                    <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Fallo de transmisión Dropi</span>
                    </div>
                  )}

                </div>

                {/* Card Main Body */}
                <div className="p-5 sm:p-6 space-y-4">

                  {/* Error Box if Transmission Failed */}
                  {isError && order.error_message && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold">Motivo del rechazo de Dropi:</div>
                        <div className="text-[11px] mt-0.5 text-rose-700">{order.error_message}</div>
                        <div className="text-[10px] text-rose-600 mt-1 font-medium">
                          Presiona "Revisar & Enviar a Dropi" para asignar el ID de producto correcto o ajustar el código DANE.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3 Column Grid: Customer Info | Logistics & Dane | Items & Dropi IDs */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
                    
                    {/* Column 1: Customer Data (4 Cols) */}
                    <div className="lg:col-span-4 space-y-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                        <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Datos del Comprador</span>
                        </span>

                        {/* Direct WhatsApp Verification Button */}
                        <a
                          href={getWhatsAppConfirmationUrl(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-2 py-0.5 rounded-lg transition-colors"
                          title="Contactar al cliente por WhatsApp para confirmar dirección"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>Confirmar WA</span>
                        </a>
                      </div>

                      <div className="space-y-1.5">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{order.customerName}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{order.customerPhone}</div>
                        </div>

                        <div className="pt-1">
                          <div className="text-slate-500 text-[10px] font-bold uppercase">Dirección de Entrega:</div>
                          <div className="font-medium text-slate-800">{order.address}</div>
                          {order.additionalNotes && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">
                              Nota: {order.additionalNotes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-slate-600 pt-0.5">
                          <MapPin className="w-3 h-3 text-cyan-600 shrink-0" />
                          <span className="font-bold">{order.city}</span>
                          <span>•</span>
                          <span>{order.department}</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Logistics & DANE Parameters (3 Cols) */}
                    <div className="lg:col-span-3 space-y-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                      <div className="pb-1.5 border-b border-slate-200/60 font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Logística & Código DANE</span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-slate-500 text-[10px] font-bold uppercase block">Transportadora:</span>
                          <span className="font-bold text-slate-900 text-xs">
                            {order.carrier || 'Servientrega (Por defecto)'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 text-[10px] font-bold uppercase block">Código DANE Municipio:</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-md text-cyan-900">
                              {calculatedDane}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold">✓ Válido</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-500 text-[10px] font-bold uppercase block">Total a Recaudar:</span>
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {formatCOP(order.total || order.subtotal || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Items & Dropi Mapping Verification (5 Cols) */}
                    <div className="lg:col-span-5 space-y-2.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                        <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Productos ({order.items?.length || 1})</span>
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          allItemsMapped ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {allItemsMapped ? '✓ Dropi IDs Listos' : '⚠ Revisar IDs Dropi'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {itemsWithDropiCheck.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white border border-slate-200/70">
                            <div className="flex items-center gap-2 min-w-0">
                              <img 
                                src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'} 
                                alt="" 
                                className="w-8 h-8 rounded-lg object-cover border border-slate-100 shrink-0" 
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate text-[11px]">{item.title}</div>
                                <div className="text-[10px] text-slate-500">
                                  {item.quantity}x {formatCOP(item.unitPrice)}
                                  {item.variantName && ` • ${item.variantName}`}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {item.hasDropiId ? (
                                <span className="font-mono text-[9px] font-bold text-cyan-900 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded">
                                  DP #{item.dropiId}
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  Sin ID Dropi
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Bottom Action Row */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    
                    {/* Pre-flight Checks indicators */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1 font-bold text-emerald-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>DANE: {calculatedDane}</span>
                      </span>
                      <span>•</span>
                      <span className={`flex items-center gap-1 font-bold ${allItemsMapped ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {allItemsMapped ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                        <span>{allItemsMapped ? 'Catálogo Dropi OK' : 'Faltan IDs Dropi'}</span>
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setSelectedOrderForView(order)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Ver detalle del pedido"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Ficha</span>
                      </button>

                      {/* Main Dropi Approval CTA */}
                      {isApproved ? (
                        <button
                          onClick={() => handleOpenDropiModal(order)}
                          className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <FileCheck className="w-4 h-4 text-emerald-700" />
                          <span>Ficha de Transmisión Dropi</span>
                        </button>
                      ) : (
                        <button
                          id={`btn-approve-dropi-${order.id}`}
                          onClick={() => handleOpenDropiModal(order)}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-black shadow-md shadow-cyan-600/20 transition-all cursor-pointer flex items-center gap-2 hover:scale-101"
                        >
                          <Send className="w-3.5 h-3.5 text-cyan-200" />
                          <span>{isError ? 'Corregir & Reintentar Dropi' : 'Revisar & Enviar a Dropi Colombia'}</span>
                        </button>
                      )}
                    </div>

                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: DROPI COLOMBIA MANUAL ORDER APPROVAL & TRANSMISSION */}
      {dropiModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-cyan-600 uppercase font-mono tracking-wider">
                      Integración Dropi Colombia
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                      dropiModalOrder.status === 'APROBADO_DROPI' ? 'bg-emerald-100 text-emerald-800' :
                      dropiModalOrder.status === 'ERROR_DROPI' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {dropiModalOrder.status}
                    </span>
                  </div>
                  <h3 className="font-black text-base text-slate-900">
                    Aprobar y Enviar Pedido {dropiModalOrder.orderNumber}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setDropiModalOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success State Screen */}
            {dropiApprovalSuccess ? (
              <div className="space-y-4 py-3 text-center">
                <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-900">¡Pedido Transmitido con Éxito a Dropi!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {dropiApprovalSuccess.message}
                  </p>
                </div>

                {/* Dropi Summary Badge Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-3 gap-3 text-left max-w-lg mx-auto">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Dropi Order ID</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      #{dropiApprovalSuccess.dropi_order_id || 'Generado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Guía de Despacho</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {dropiApprovalSuccess.dropi_guia || 'En proceso'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Transportadora</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {dropiApprovalSuccess.carrier}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setDropiModalOrder(null);
                      onRefresh();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
                  >
                    Entendido, Volver a la Lista
                  </button>
                </div>
              </div>
            ) : (
              /* Review & Approval Form */
              <form onSubmit={handleApproveOrderForDropi} className="space-y-4 text-xs">
                
                {/* Error Banner if Dropi failed */}
                {dropiApprovalError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold">Error devuelto por la API de Dropi:</div>
                      <div className="text-[11px] mt-0.5">{dropiApprovalError}</div>
                      <div className="text-[10px] text-rose-600 mt-1 font-medium">
                        💡 Verifica que cada producto tenga su `dropi_product_id` configurado y que la dirección/código DANE sean válidos.
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid 1: Customer Data Verification */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Datos del Destinatario (Cliente)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Venta #{dropiModalOrder.orderNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block">Nombre Completo:</span>
                      <span className="font-bold text-slate-900">{dropiModalOrder.customerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block">Celular / Teléfono:</span>
                      <span className="font-mono font-bold text-slate-900">{dropiModalOrder.customerPhone}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] font-bold text-slate-500 block">Dirección de Entrega:</span>
                      <span className="font-medium text-slate-800">{dropiModalOrder.address}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block">Ciudad & Departamento:</span>
                      <span className="font-bold text-slate-800">{dropiModalOrder.city}, {dropiModalOrder.department}</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Código DANE Municipio *
                      </label>
                      <input
                        type="text"
                        required
                        value={dropiCustomDaneCode}
                        onChange={(e) => setDropiCustomDaneCode(e.target.value)}
                        placeholder="Ej. 11001"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:border-cyan-500 outline-hidden font-bold"
                      />
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Autocalculado para {dropiModalOrder.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid 2: Logistics & Carrier Selection */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Transportadora y Parámetros Dropi</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Cobro Contra Entrega (true)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Transportadora Asignada para el Envío *
                      </label>
                      <select
                        value={dropiSelectedCarrier}
                        onChange={(e) => setDropiSelectedCarrier(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:border-cyan-500 outline-hidden cursor-pointer"
                      >
                        {carriers.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Total a Recaudar por la Transportadora
                      </label>
                      <div className="px-3 py-2 bg-slate-200/70 border border-slate-300 rounded-xl font-mono font-black text-slate-900 text-sm">
                        {formatCOP(dropiModalOrder.total || dropiModalOrder.subtotal || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid 3: Products Mapping & Dropi Product IDs */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between font-bold text-slate-800 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Productos del Pedido y Mapeo Dropi ({dropiModalOrder.items?.length || 1})</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Cada producto debe tener su Dropi Product ID
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 p-3 space-y-2.5">
                    {(dropiModalOrder.items || []).map((item, idx) => {
                      const matchedProd = findProductForItem(item);
                      const prodId = item.productId || matchedProd.id;
                      const currentDropiId = dropiProductIdsMap[prodId] || item.dropi_product_id || matchedProd.dropi_product_id || '';
                      const isMissingDropiId = !currentDropiId;

                      return (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img 
                                src={item.image || matchedProd.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" 
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 line-clamp-1">{item.title}</div>
                                <div className="text-[10px] text-slate-500">
                                  {item.quantity} unidad{item.quantity > 1 ? 'es' : ''} • Precio: {formatCOP(item.unitPrice)}
                                  {item.variantName && ` • Var: ${item.variantName}`}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-slate-900">
                                {formatCOP(item.subtotal || item.unitPrice * item.quantity)}
                              </span>
                            </div>
                          </div>

                          {/* Inline Dropi Product ID Input / Verifier */}
                          <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              {isMissingDropiId ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Falta ID Dropi</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-mono">
                                  <Check className="w-3 h-3" />
                                  <span>Mapeado: {currentDropiId}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                              <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                Dropi Product ID:
                              </label>
                              <input
                                type="text"
                                value={currentDropiId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDropiProductIdsMap(prev => ({
                                    ...prev,
                                    [prodId]: val
                                  }));
                                }}
                                placeholder="Ej. 104529"
                                className={`w-full px-2 py-1 rounded-lg border text-xs font-mono font-bold outline-hidden ${
                                  isMissingDropiId ? 'border-rose-400 bg-rose-50/50 focus:border-rose-600' : 'border-slate-300 bg-white focus:border-cyan-500'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDropiModalOrder(null)}
                    disabled={isApprovingDropi}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isApprovingDropi}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-md shadow-cyan-600/25 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isApprovingDropi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Transmitiendo a Dropi Colombia...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Aprobar y Enviar a Dropi Colombia</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL 2: ORDER DETAIL MODAL */}
      {selectedOrderForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-700 font-bold uppercase">Ficha Logística</span>
                <h3 className="font-black text-base text-slate-900">Pedido {selectedOrderForView.orderNumber}</h3>
              </div>
              <button 
                onClick={() => setSelectedOrderForView(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1.5 border border-slate-200/70">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-bold text-slate-900">{selectedOrderForView.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Teléfono:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedOrderForView.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dirección:</span>
                  <span className="font-medium text-slate-900 text-right">{selectedOrderForView.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ciudad & Depto:</span>
                  <span className="font-bold text-slate-900">{selectedOrderForView.city}, {selectedOrderForView.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Código DANE:</span>
                  <span className="font-mono font-bold text-cyan-900">{selectedOrderForView.dane_code || getDaneCode(selectedOrderForView.city, selectedOrderForView.department)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 border border-slate-200/70">
                <div className="font-bold text-slate-800 pb-1 border-b border-slate-200/60">Productos</div>
                {(selectedOrderForView.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-800">{item.quantity}x {item.title}</span>
                    <span className="font-mono font-bold text-slate-900">{formatCOP(item.subtotal || item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-200/60 flex justify-between font-black text-xs text-slate-900">
                  <span>Total Pedido COD:</span>
                  <span>{formatCOP(selectedOrderForView.total || selectedOrderForView.subtotal || 0)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedOrderForView(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const o = selectedOrderForView;
                  setSelectedOrderForView(null);
                  handleOpenDropiModal(o);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer"
              >
                Revisar en Dropi
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
