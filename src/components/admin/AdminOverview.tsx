import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Truck,
  Package,
  ShoppingCart,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Plus,
  Bot,
  Calendar,
  Layers,
  Trash2,
  Play,
  Search,
  ArrowUpDown,
  Filter,
  Check,
  Tag,
  X,
  ShieldAlert,
  Info,
  Sliders,
  BookOpen,
  Building2,
  Percent,
  Download,
  Brain
} from 'lucide-react';
import { AdminStats, Order, Product, ProductProfitItem } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { AdminViewKey } from './AdminSidebar.tsx';
import { SalesSimulatorModal } from './SalesSimulatorModal.tsx';
import { ProductCatalogMagazineModal } from './ProductCatalogMagazineModal.tsx';

interface AdminOverviewProps {
  stats: AdminStats | null;
  orders: Order[];
  products: Product[];
  onNavigate: (view: AdminViewKey) => void;
  onRefresh: () => void;
  onSelectProductForEdit?: (product: Product) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  stats,
  orders,
  products,
  onNavigate,
  onRefresh,
  onSelectProductForEdit
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [showMagazineModal, setShowMagazineModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [salesFilter, setSalesFilter] = useState<'all' | 'with_sales' | 'without_sales'>('all');
  const [sortBy, setSortBy] = useState<'profit' | 'units' | 'revenue' | 'margin'>('profit');

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-500">
        Cargando estadísticas de Zavela Store...
      </div>
    );
  }

  // Profit breakdown list
  const profitList: ProductProfitItem[] = stats.productProfitBreakdown || products.map(p => {
    const cost = Number(p.costPrice) > 0 ? Number(p.costPrice) : Math.round(p.price * 0.45);
    const unitMargin = p.price - cost;
    const marginPct = cost > 0 ? (unitMargin / cost) * 100 : 0;
    return {
      productId: p.id,
      productTitle: p.title,
      productImage: p.images?.[0] || '',
      categoryName: p.categoryName || 'Catálogo',
      price: p.price,
      costPrice: cost,
      unitMargin,
      marginPercentage: Math.round(marginPct * 10) / 10,
      unitsSold: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMarginPercentage: Math.round(marginPct * 10) / 10
    };
  });

  const filteredProfitList = profitList.filter(item => {
    const matchesSearch = item.productTitle.toLowerCase().includes(productSearch.toLowerCase()) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(productSearch.toLowerCase()));
    if (!matchesSearch) return false;

    if (salesFilter === 'with_sales') return item.unitsSold > 0;
    if (salesFilter === 'without_sales') return item.unitsSold === 0;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'profit') return b.totalProfit - a.totalProfit;
    if (sortBy === 'units') return b.unitsSold - a.unitsSold;
    if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
    if (sortBy === 'margin') return b.profitMarginPercentage - a.profitMarginPercentage;
    return 0;
  });

  // Calculate totals from filtered profit breakdown
  const totalUnitsSold = profitList.reduce((acc, curr) => acc + curr.unitsSold, 0);
  const totalProfitCalculated = profitList.reduce((acc, curr) => acc + curr.totalProfit, 0);
  const totalRevenueCalculated = profitList.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalCostCalculated = profitList.reduce((acc, curr) => acc + curr.totalCost, 0);

  // Handlers for simulation and clearing
  const handleSimulate3Sales = async () => {
    setIsSimulating(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/admin/orders/simulate-3-per-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al simular ventas');
      setFeedbackMessage({
        type: 'success',
        text: `¡Éxito! Se simularon exactamente 3 ventas por cada producto (${data.data?.ordersCount || 0} pedidos). Las métricas de hoy y del mes han sido actualizadas.`
      });
      onRefresh();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Error al ejecutar la simulación'
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const executeClearSales = async () => {
    setIsClearing(true);
    setFeedbackMessage(null);
    setShowClearConfirmModal(false);
    try {
      const res = await fetch('/api/admin/orders/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al borrar ventas');
      setFeedbackMessage({
        type: 'success',
        text: '¡Ventas y pedidos eliminados exitosamente! Todas las métricas de ingresos, costos y ganancias se han reiniciado a $0 COP.'
      });
      onRefresh();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Error al borrar las ventas'
      });
    } finally {
      setIsClearing(false);
    }
  };

  const deliveredCount = orders.filter(o => o.status === 'entregado').length;
  const inRouteCount = orders.filter(o => o.status === 'enviado' || o.status === 'procesando').length;
  const pendingCount = orders.filter(o => o.status === 'pendiente' || o.status === 'pago_confirmado').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Commercial Control & Action Center */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-slate-800 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-black border border-cyan-500/30 uppercase tracking-wider">
              CENTRO DE CONTROL FINANCIERO
            </span>
            <span className="text-xs text-slate-400 font-medium">Actualizado en tiempo real</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Rendimiento Comercial & Ganancias • Zavela Store
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Monitoreo en vivo de ventas del día, ventas del mes, margen de ganancia neta por producto y gestión de pedidos contra entrega.
          </p>
        </div>

        {/* Action Buttons: Simulator, PDF Magazine & Clear Sales */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('commercemind_ai')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            title="Abrir Copiloto de Negocios y Analítica CommerceMind AI"
          >
            <Brain className="w-4 h-4 text-white animate-pulse" />
            <span>CommerceMind AI (Copiloto)</span>
          </button>

          <button
            id="btn-open-simulator-modal"
            onClick={() => setShowSimulatorModal(true)}
            disabled={isSimulating || isClearing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            title="Configura la cantidad de ventas por producto, flete de transportadora y cobro de Dropi"
          >
            <Sliders className="w-4 h-4 text-slate-950" />
            <span>Simular Ventas & Costos (Personalizado)</span>
          </button>

          <button
            id="btn-open-magazine-pdf"
            onClick={() => setShowMagazineModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            title="Generar y descargar revista digital tipo Yanbal en PDF con los productos del catálogo"
          >
            <BookOpen className="w-4 h-4 text-amber-200" />
            <span>Revista Catálogo PDF</span>
          </button>

          <button
            id="btn-clear-sales"
            onClick={() => setShowClearConfirmModal(true)}
            disabled={isSimulating || isClearing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="Borrar todas las ventas registradas y reiniciar a $0"
          >
            {isClearing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-rose-300" />
                <span>Borrando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Borrar Ventas</span>
              </>
            )}
          </button>

          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Recargar Métricas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feedback Alert if Action Performed */}
      {feedbackMessage && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200 ${
          feedbackMessage.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
          feedbackMessage.type === 'info' ? 'bg-cyan-50 border-cyan-300 text-cyan-900' :
          'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            <span className="font-semibold">{feedbackMessage.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* PRIMARY COMPARISON METRICS: VENTAS DEL DÍA vs. VENTAS DEL MES vs. COSTO vs. GANANCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. VENTAS DEL DÍA (HOY) */}
        <div className="bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-900 p-5 rounded-2xl border border-cyan-800/50 text-white shadow-xs space-y-2.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-cyan-300">
            <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ventas del Día (Hoy)</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-200 font-mono text-[11px] font-black border border-cyan-400/30">
              {stats.todayOrders} pedidos
            </span>
          </div>
          
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatCOP(stats.todaySales || 0)}
          </div>
          
          <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Costo ventas hoy:</span>
              <span className="font-mono text-slate-300 font-semibold">{formatCOP(stats.todayProductCosts || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Ganancia de hoy:</span>
              <span className="font-mono font-black text-emerald-400">+{formatCOP(stats.todayGrossProfit || 0)}</span>
            </div>
          </div>
        </div>

        {/* 2. VENTAS DEL MES */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-5 rounded-2xl border border-indigo-800/50 text-white shadow-xs space-y-2.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-indigo-300">
            <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ventas del Mes</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 font-mono text-[11px] font-black border border-indigo-400/30">
              {stats.monthOrders} pedidos
            </span>
          </div>
          
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatCOP(stats.monthSales || stats.totalRevenue || 0)}
          </div>
          
          <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Costo ventas mes:</span>
              <span className="font-mono text-slate-300 font-semibold">{formatCOP(stats.monthProductCosts || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Ganancia del mes:</span>
              <span className="font-mono font-black text-emerald-400">+{formatCOP(stats.monthGrossProfit || stats.totalGrossProfit || 0)}</span>
            </div>
          </div>
        </div>

        {/* 3. COSTO TOTAL DE TODAS LAS VENTAS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-slate-600" />
              <span>Costo Total de Ventas</span>
            </span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
              {stats.totalOrders}
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatCOP(stats.totalProductCosts || 0)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Costo base de mercancía:</span>
            <span className="text-slate-900 font-bold">{stats.totalOrders} unidades despachadas</span>
          </div>
        </div>

        {/* 4. GANANCIA TOTAL / UTILIDAD NETA */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-300 shadow-xs space-y-2.5 relative">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ganancia Neta Total</span>
            </span>
            <div className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs">
              {stats.averageMarginPercentage}% rent.
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
            +{formatCOP(stats.totalGrossProfit)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Margen sobre costo:</span>
            <span className="text-emerald-700 font-black">+{stats.averageMarginPercentage}% de utilidad</span>
          </div>
        </div>

      </div>

      {/* SECONDARY ROW: LOGISTICS STATUS & DROPI AUTHORIZATION SHORTCUT */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <button
          onClick={() => onNavigate('pending_dropi_orders')}
          className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-300 shadow-2xs flex items-center justify-between hover:scale-101 hover:border-amber-400 transition-all cursor-pointer text-left group"
        >
          <div className="space-y-0.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <span>Por Revisión & Autorizar Dropi</span>
              <ArrowUpRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {orders.filter(o => o.status === 'PENDIENTE_REVISION' || o.status === 'pendiente' || (!o.dropi_order_id && o.status !== 'APROBADO_DROPI' && o.status !== 'CANCELADO' && o.status !== 'cancelado')).length} pedidos
            </div>
            <div className="text-[10px] text-amber-800 font-medium">Click para autorizar en Dropi →</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-200/80 text-amber-900 flex items-center justify-center font-bold shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
        </button>

        <div className="bg-white p-4 rounded-2xl border border-cyan-200/80 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-cyan-800">En Camino con Transportadora</div>
            <div className="text-xl font-black text-slate-900">{inRouteCount} pedidos</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Entregados y Recaudados</div>
            <div className="text-xl font-black text-emerald-700">{deliveredCount} pedidos</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* DETAILED OPERATIONAL COSTS & FINANCIAL AUDIT (FLETES + DROPI FEES + UTILIDAD NETA) */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-2xl border border-slate-800 p-5 sm:p-6 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-black uppercase tracking-wider border border-cyan-500/30">
                AUDITORÍA DE COSTOS OPERATIVOS & DROPI
              </span>
              <span className="text-xs text-slate-400 font-medium">Control de Pagos y Fletes</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              Desglose de Fletes de Transportadoras, Cobros Dropi y Utilidad Neta Real
            </h3>
          </div>
          
          <button
            onClick={() => setShowSimulatorModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configurar Simulación</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Fletes Transportadora */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-amber-400">
              <span className="font-bold flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-400" />
                <span>Fletes Transportadoras</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">{stats.totalOrders} envíos</span>
            </div>
            <div className="text-xl font-black text-amber-300 font-mono">
              {formatCOP(stats.totalCarrierCosts || (stats.totalOrders * 16500))}
            </div>
            <p className="text-[11px] text-slate-400">
              Servientrega, Coordinadora, Interrapidísimo, Envía, TCC.
            </p>
          </div>

          {/* Cobros Dropi */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-indigo-400">
              <span className="font-bold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Comisiones Dropi</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">5% Recaudo</span>
            </div>
            <div className="text-xl font-black text-indigo-300 font-mono">
              {formatCOP(stats.totalDropiFees || Math.round((stats.totalRevenue || 0) * 0.05))}
            </div>
            <p className="text-[11px] text-slate-400">
              Tarifa de servicio de pasarela y recaudo en Dropi Colombia.
            </p>
          </div>

          {/* Costo Mercancía Proveedores */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-slate-300" />
                <span>Costo Proveedores</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Mayorista</span>
            </div>
            <div className="text-xl font-black text-slate-200 font-mono">
              {formatCOP(stats.totalProductCosts || 0)}
            </div>
            <p className="text-[11px] text-slate-400">
              Costo de fabricación y abastecimiento de los productos.
            </p>
          </div>

          {/* Ganancia Neta Real Líquida */}
          <div className="bg-emerald-950/80 p-3.5 rounded-xl border-2 border-emerald-500/80 space-y-1.5 text-emerald-200">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="font-black flex items-center gap-1 uppercase tracking-wider text-[11px]">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Utilidad Neta Real</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-300">
                {stats.netMarginPercentage !== undefined ? `${stats.netMarginPercentage}%` : 'En mano'}
              </span>
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono">
              +{formatCOP(stats.totalNetProfit !== undefined ? stats.totalNetProfit : (stats.totalGrossProfit - (stats.totalCarrierCosts || 0) - (stats.totalDropiFees || 0)))}
            </div>
            <p className="text-[11px] text-emerald-300/80">
              Beneficio líquido real descontando fletes y Dropi.
            </p>
          </div>

        </div>
      </div>

      {/* CRITICAL STOCK ALERTS (INVENTARIO CRÍTICO <= 5 UNIDADES) */}
      {products.filter(p => (p.active ?? true) && Number(p.stock) <= 5).length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 rounded-2xl border-2 border-amber-400/80 p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-white rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span>Alerta de Inventario Crítico (Stock ≤ 5 unidades)</span>
                  <span className="bg-red-600 text-white text-[10px] font-mono font-black px-2 py-0.5 rounded-full">
                    {products.filter(p => (p.active ?? true) && Number(p.stock) <= 5).length} en alerta
                  </span>
                </h4>
                <p className="text-xs text-slate-600">
                  Los siguientes productos están a punto de agotarse. Revisa el stock y reabastece con tu proveedor Dropi.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('products')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs transition-colors cursor-pointer shrink-0 uppercase tracking-wider"
            >
              Gestionar en Inventario →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {products
              .filter(p => (p.active ?? true) && Number(p.stock) <= 5)
              .slice(0, 6)
              .map(p => (
                <div 
                  key={p.id} 
                  className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img 
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'} 
                      alt="" 
                      className="w-10 h-10 object-cover rounded-lg shrink-0 border border-slate-100" 
                    />
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-slate-900 truncate">{p.title}</p>
                      <p className="text-[10px] font-mono text-slate-500">{formatCOP(p.price)}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-md ${
                      p.stock <= 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {p.stock} un.
                    </span>
                    {onSelectProductForEdit && (
                      <button
                        onClick={() => onSelectProductForEdit(p)}
                        className="block text-[10px] text-sky-700 hover:underline font-bold mt-1"
                      >
                        Editar Stock
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* DETAILED PROFIT BREAKDOWN TABLE BY PRODUCT (DESGLOSE DE GANANCIAS POR PRODUCTO) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <span>Desglose de Ganancias por Producto</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black font-mono">
                {filteredProfitList.length} {filteredProfitList.length === 1 ? 'producto' : 'productos'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Analiza exactamente cuánto dinero ganas por cada unidad vendida y la utilidad total generada en tu tienda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sales Status Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSalesFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  salesFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Todos ({profitList.length})
              </button>
              <button
                type="button"
                onClick={() => setSalesFilter('with_sales')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  salesFilter === 'with_sales' ? 'bg-white text-cyan-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Con Ventas ({profitList.filter(p => p.unitsSold > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setSalesFilter('without_sales')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  salesFilter === 'without_sales' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sin Ventas ({profitList.filter(p => p.unitsSold === 0).length})
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Filtrar producto..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-hidden w-40 text-slate-800"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Sort options */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setSortBy('profit')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  sortBy === 'profit' ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mayor Ganancia
              </button>
              <button
                onClick={() => setSortBy('units')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  sortBy === 'units' ? 'bg-white text-cyan-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Más Vendidos
              </button>
              <button
                onClick={() => setSortBy('margin')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  sortBy === 'margin' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mayor Margen %
              </button>
            </div>
          </div>
        </div>

        {/* Zero Sales Informational Banner */}
        {totalUnitsSold === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>
                <strong className="text-slate-900">Historial en Cero:</strong> No hay pedidos ni ventas registradas en este momento ($0 en ventas e ingresos). La siguiente tabla muestra los costos unitarios y el margen de ganancia por cada unidad que vendas de tus productos en el catálogo.
              </span>
            </div>
            <button
              onClick={handleSimulate3Sales}
              disabled={isSimulating}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Simular 3 Ventas</span>
            </button>
          </div>
        )}

        {/* Profit Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3.5 py-3">Producto</th>
                <th className="px-3.5 py-3 text-right">Precio Venta</th>
                <th className="px-3.5 py-3 text-right">Costo Unitario</th>
                <th className="px-3.5 py-3 text-right">Ganancia x Unidad</th>
                <th className="px-3.5 py-3 text-center">Unidades Vendidas</th>
                <th className="px-3.5 py-3 text-right">Ingresos Totales</th>
                <th className="px-3.5 py-3 text-right">Costo Total</th>
                <th className="px-3.5 py-3 text-right">Ganancia Neta Total</th>
                <th className="px-3.5 py-3 text-center">Rentabilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProfitList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron productos coincidentes con el filtro.
                  </td>
                </tr>
              ) : (
                filteredProfitList.map((item) => (
                  <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* 1. Product Info */}
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        <img 
                          src={item.productImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'} 
                          alt={item.productTitle}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{item.productTitle}</div>
                          <div className="text-[10px] text-slate-400 truncate">{item.categoryName || 'Catálogo'}</div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Selling Price */}
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                      {formatCOP(item.price)}
                    </td>

                    {/* 3. Unit Cost */}
                    <td className="px-3.5 py-3 text-right font-mono text-slate-500">
                      {formatCOP(item.costPrice)}
                    </td>

                    {/* 4. Unit Profit */}
                    <td className="px-3.5 py-3 text-right font-mono font-black text-emerald-700 bg-emerald-50/40">
                      +{formatCOP(item.unitMargin)}
                    </td>

                    {/* 5. Units Sold */}
                    <td className="px-3.5 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-xs font-mono ${
                        item.unitsSold > 0 ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.unitsSold} {item.unitsSold === 1 ? 'unidad' : 'unidades'}
                      </span>
                    </td>

                    {/* 6. Total Revenue */}
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                      {formatCOP(item.totalRevenue)}
                    </td>

                    {/* 7. Total Cost */}
                    <td className="px-3.5 py-3 text-right font-mono text-slate-500">
                      {formatCOP(item.totalCost)}
                    </td>

                    {/* 8. Total Gross Profit */}
                    <td className="px-3.5 py-3 text-right font-mono font-black text-base text-emerald-600 bg-emerald-50/60">
                      +{formatCOP(item.totalProfit)}
                    </td>

                    {/* 9. Profit Margin Percentage Bar */}
                    <td className="px-3.5 py-3 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono font-bold text-[11px]">
                        <span>+{item.profitMarginPercentage}%</span>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer with Summary Totals */}
            <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
              <tr>
                <td className="px-3.5 py-3 uppercase tracking-wider text-cyan-400">
                  TOTALES CALCULADOS ({profitList.length} productos)
                </td>
                <td className="px-3.5 py-3 text-right font-mono">-</td>
                <td className="px-3.5 py-3 text-right font-mono">-</td>
                <td className="px-3.5 py-3 text-right font-mono">-</td>
                <td className="px-3.5 py-3 text-center font-mono text-cyan-300 font-black">
                  {totalUnitsSold} unidades
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-white font-black">
                  {formatCOP(totalRevenueCalculated)}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-slate-400">
                  {formatCOP(totalCostCalculated)}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-emerald-400 font-black text-sm">
                  +{formatCOP(totalProfitCalculated)}
                </td>
                <td className="px-3.5 py-3 text-center font-mono text-emerald-400">
                  {stats.averageMarginPercentage}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>

      {/* Main Grid: Orders overview & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Últimos Pedidos Contra Entrega</h3>
              <p className="text-xs text-slate-500">Gestiona estados, transportadoras y guías de envío en tiempo real</p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos ({orders.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {orders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No hay pedidos registrados en este momento. Haz clic en "Simular 3 Ventas por Producto" para generar ventas de prueba con cálculo de ganancias.
              </div>
            ) : (
              orders.slice(0, 6).map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate">{order.customerName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {order.city}, {order.department} • {order.items.length} productos
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-slate-900">{formatCOP(order.total || 0)}</div>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                      order.status === 'entregado' ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'enviado' ? 'bg-cyan-100 text-cyan-800' :
                      order.status === 'procesando' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'cancelado' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {(order.status || 'pendiente').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900">Accesos Rápidos del Panel</h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => onNavigate('orders')}
                className="w-full p-2.5 rounded-xl bg-gradient-to-r from-cyan-50 to-emerald-50 hover:from-cyan-100 hover:to-emerald-100 border border-cyan-200 text-slate-900 font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-cyan-900 font-black">
                  <ShoppingCart className="w-3.5 h-3.5 text-cyan-600" />
                  <span>📦 Gestión de Pedidos ({orders.length})</span>
                </span>
                <span className="text-[10px] bg-cyan-600 text-white px-2 py-0.5 rounded-full font-bold">
                  Abrir
                </span>
              </button>
              <button
                onClick={() => onNavigate('whatsapp_ai_agent')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50/50 border border-slate-200 text-slate-700 hover:text-cyan-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>🤖 WhatsApp & Agente IA Sofía</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('advisors_sales')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50/50 border border-slate-200 text-slate-700 hover:text-cyan-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>👥 Ventas Asesores & Bolsa Dropi</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50/50 border border-slate-200 text-slate-700 hover:text-cyan-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>🏷️ Catálogo de Productos ({products.length})</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('header_ticker')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50/50 border border-slate-200 text-slate-700 hover:text-cyan-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>⚡ Barra Superior & Ticker</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('system_security')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50/50 border border-slate-200 text-slate-700 hover:text-cyan-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>🔄 Respaldos & Auditoría</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Logistics Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-5 rounded-2xl border border-slate-800 text-white space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
              <Truck className="w-4 h-4" />
              <span>Red Logística Nacional Colombia</span>
            </div>
            <p className="text-xs text-slate-300">
              Integración habilitada con Servientrega, Coordinadora, Envía, TCC e Interrapidísimo.
            </p>
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
              <span>Recaudo Contra Entrega</span>
              <span className="text-emerald-400 font-bold">Activo 100%</span>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL DE CONFIRMACIÓN PARA BORRAR TODAS LAS VENTAS */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">¿Borrar todas las ventas?</h3>
                  <p className="text-xs text-slate-500">Esta acción reiniciará el historial de ventas</p>
                </div>
              </div>
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>¿Qué ocurrirá al confirmar?</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700 pl-1">
                <li>Se eliminarán todos los <strong>pedidos y clientes</strong> registrados ({orders.length} pedidos).</li>
                <li>Las métricas de <strong>ventas del día y del mes</strong> se pondrán en <strong>$0 COP</strong>.</li>
                <li>Los pedidos de asesores y bolsa de ventas Dropi se limpiarán.</li>
                <li>Tus productos, precios y fotos en el catálogo <strong>NO</strong> se borrarán.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeClearSales}
                disabled={isClearing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Borrando ventas...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Borrar Todo a $0</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configurable Sales Simulator Modal */}
      <SalesSimulatorModal
        isOpen={showSimulatorModal}
        onClose={() => setShowSimulatorModal(false)}
        products={products}
        onSimulationComplete={() => {
          setFeedbackMessage({
            type: 'success',
            text: '¡Simulación personalizada completada con éxito! Las ventas, costos de transportadoras y cobros Dropi han sido actualizados.'
          });
          onRefresh();
        }}
      />

      {/* Revista Digital Catálogo Modal */}
      <ProductCatalogMagazineModal
        isOpen={showMagazineModal}
        onClose={() => setShowMagazineModal(false)}
        products={products}
      />

    </div>
  );
};
