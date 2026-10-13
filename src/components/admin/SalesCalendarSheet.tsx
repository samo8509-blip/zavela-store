import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Package,
  ShoppingBag,
  Clock,
  Phone,
  MapPin,
  ExternalLink,
  RefreshCw,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Truck,
  Trash2,
  Check,
  ArrowUpDown
} from 'lucide-react';
import { Order, Product } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { getDaneCode } from '../../data/colombiaGeo.ts';

interface CalendarOrderRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  time: string;
  date: string;
  customerName: string;
  customerPhone: string;
  city: string;
  department: string;
  daneCode: string;
  products: string;
  supplier: string;
  totalSale: number;
  operatingCost: number;
  netProfit: number;
  status: string;
  paymentMethod: string;
  carrier: string;
  trackingNumber: string;
}

interface SalesCalendarSheetProps {
  orders?: Order[];
  products?: Product[];
  onRefresh?: () => void;
}

export const SalesCalendarSheet: React.FC<SalesCalendarSheetProps> = ({
  orders = [],
  products = [],
  onRefresh
}) => {
  // Current viewing month and selected date
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  // Data from backend or fallback to props
  const [dayOrders, setDayOrders] = useState<CalendarOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [salesDatesMap, setSalesDatesMap] = useState<Record<string, { count: number; totalSales: number }>>({});
  
  // Table filters & sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'time' | 'totalSale' | 'netProfit'>('time');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Month names in Spanish
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Helper product map for supplier resolution
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => {
      map.set(p.id, p);
      if (p.slug) map.set(p.slug, p);
    });
    return map;
  }, [products]);

  const resolveSupplier = (productId?: string, itemSupplier?: string): string => {
    if (itemSupplier) return itemSupplier;
    if (!productId) return 'Dropi Colombia';
    const prod = productMap.get(productId);
    if ((prod as any)?.supplier_name) return (prod as any).supplier_name;
    if ((prod as any)?.supplier) return (prod as any).supplier;
    if (prod?.dropi_product_id) return 'Dropi Colombia';
    return 'DeRocha Store';
  };

  // Fetch sales for selected date from API
  const fetchCalendarData = async (dateToFetch: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/calendar?date=${dateToFetch}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDayOrders(data.orders || []);
          if (data.salesDates) {
            setSalesDatesMap(data.salesDates);
          }
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Fallback a cálculo local de calendario:', e);
    }

    // Fallback: Compute from props.orders
    const datesMap: Record<string, { count: number; totalSales: number }> = {};
    orders.forEach(o => {
      if (!o.createdAt) return;
      const d = o.createdAt.slice(0, 10);
      if (!datesMap[d]) datesMap[d] = { count: 0, totalSales: 0 };
      datesMap[d].count += 1;
      datesMap[d].totalSales += (o.total || 0);
    });
    setSalesDatesMap(datesMap);

    const filtered = orders.filter(o => o.createdAt && o.createdAt.slice(0, 10) === dateToFetch);
    const mapped: CalendarOrderRow[] = filtered.map(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      let itemsCost = 0;
      const supSet = new Set<string>();

      const prodSummary = items.map(it => {
        const prod = productMap.get(it.productId);
        const cost = Number(it.unitCost || prod?.costPrice || (prod as any)?.cost || 0);
        itemsCost += cost * (it.quantity || 1);
        supSet.add(resolveSupplier(it.productId, (it as any).supplier || (it as any).supplier_name));
        return `${it.title || 'Producto'} (x${it.quantity || 1})`;
      }).join(' + ') || 'Sin productos';

      const opCost = (order.productCostTotal && order.productCostTotal > 0)
        ? order.productCostTotal + (order.shippingCost || 0)
        : itemsCost + (order.shippingCost || 0);

      const netProfit = (order.total || 0) - opCost;
      const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';

      return {
        id: order.id,
        orderNumber: order.orderNumber || order.id,
        createdAt: order.createdAt,
        time: timeStr,
        date: dateToFetch,
        customerName: order.customerName || 'Cliente Anónimo',
        customerPhone: order.customerPhone || 'N/A',
        city: order.city || 'Bogotá D.C.',
        department: order.department || 'Cundinamarca',
        daneCode: order.dane_code || getDaneCode(order.city, order.department),
        products: prodSummary,
        supplier: Array.from(supSet).join(', ') || 'Dropi Colombia',
        totalSale: order.total || 0,
        operatingCost: opCost,
        netProfit,
        status: order.status || 'PENDIENTE_REVISION',
        paymentMethod: order.paymentMethod || 'contra_entrega',
        carrier: order.carrier || 'Servientrega',
        trackingNumber: order.trackingNumber || order.dropi_guia || ''
      };
    });

    setDayOrders(mapped);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCalendarData(selectedDate);
  }, [selectedDate]);

  // Navigate Months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Calendar Grid Days Calculation
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun, 1 is Mon...
    // Let's adjust so Monday is first day of week (0..6)
    const startOffset = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: true });
    }

    // Next month padding to fill complete rows of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 1 : currentMonth + 2;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Filtered & Sorted Rows
  const displayedOrders = useMemo(() => {
    let result = [...dayOrders];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.products.toLowerCase().includes(q)
      );
    }

    if (supplierFilter !== 'all') {
      result = result.filter(o => o.supplier.toLowerCase().includes(supplierFilter.toLowerCase()));
    }

    if (statusFilter !== 'all') {
      result = result.filter(o => o.status.toLowerCase() === statusFilter.toLowerCase());
    }

    result.sort((a, b) => {
      if (sortField === 'totalSale') {
        return sortAsc ? a.totalSale - b.totalSale : b.totalSale - a.totalSale;
      }
      if (sortField === 'netProfit') {
        return sortAsc ? a.netProfit - b.netProfit : b.netProfit - a.netProfit;
      }
      return sortAsc ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt);
    });

    return result;
  }, [dayOrders, searchQuery, supplierFilter, statusFilter, sortField, sortAsc]);

  // Totals of the day
  const dailyTotals = useMemo(() => {
    const totalSales = displayedOrders.reduce((sum, o) => sum + o.totalSale, 0);
    const totalCost = displayedOrders.reduce((sum, o) => sum + o.operatingCost, 0);
    const totalNet = displayedOrders.reduce((sum, o) => sum + o.netProfit, 0);
    const marginPercent = totalSales > 0 ? ((totalNet / totalSales) * 100).toFixed(1) : '0';

    return {
      count: displayedOrders.length,
      totalSales,
      totalCost,
      totalNet,
      marginPercent
    };
  }, [displayedOrders]);

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (displayedOrders.length === 0) {
      alert('No hay órdenes registradas en este día para exportar.');
      return;
    }

    const headers = [
      'ID Pedido',
      'Hora',
      'Fecha',
      'Cliente',
      'Telefono',
      'Ciudad',
      'Departamento',
      'Codigo DANE',
      'Producto(s)',
      'Proveedor',
      'Total Venta (COP)',
      'Costo Operativo (COP)',
      'Ganancia Neta (COP)',
      'Estado',
      'Metodo de Pago',
      'Transportadora',
      'Numero de Guia'
    ];

    const rows = displayedOrders.map(o => [
      `"${o.orderNumber}"`,
      `"${o.time}"`,
      `"${o.date}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.customerPhone}"`,
      `"${o.city}"`,
      `"${o.department}"`,
      `"${o.daneCode}"`,
      `"${o.products.replace(/"/g, '""')}"`,
      `"${o.supplier.replace(/"/g, '""')}"`,
      o.totalSale,
      o.operatingCost,
      o.netProfit,
      `"${o.status}"`,
      `"${o.paymentMethod}"`,
      `"${o.carrier}"`,
      `"${o.trackingNumber}"`
    ]);

    // Summary row
    const summaryRow = [
      '"TOTALES"',
      '""',
      '""',
      `"Total Pedidos: ${dailyTotals.count}"`,
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      dailyTotals.totalSales,
      dailyTotals.totalCost,
      dailyTotals.totalNet,
      `"Margen: ${dailyTotals.marginPercent}%"`,
      '""',
      '""',
      '""'
    ];

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.join(';')),
      summaryRow.join(';')
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ventas_ZavelaStore_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el pedido ${orderNumber}? Se eliminará permanentemente de MySQL.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) {
        await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      }
      fetchCalendarData(selectedDate);
      if (onRefresh) onRefresh();
    } catch (e: any) {
      alert('Error al eliminar orden: ' + (e.message || 'Error de conexión'));
    }
  };

  // Helper Badge Color for Supplier
  const getSupplierBadge = (supplier: string) => {
    const s = supplier.toLowerCase();
    if (s.includes('dropi')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (s.includes('derocha')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  // Helper Badge for Status
  const getStatusBadge = (status: string) => {
    const st = status.toUpperCase();
    if (st.includes('APROBADO') || st.includes('APPROVED')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (st.includes('PENDIENTE')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (st.includes('ERROR') || st.includes('CANCEL')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    return 'bg-cyan-100 text-cyan-800 border-cyan-200';
  };

  return (
    <div className="space-y-6 max-w-full">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Historial & Auditoría de Ventas
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  DataGrid Hoja de Cálculo
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Supervisa pedidos día a día, márgenes netos, desglose de costos operativos y exporta a Excel en un clic.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedDate(todayStr);
              setCurrentYear(today.getFullYear());
              setCurrentMonth(today.getMonth());
            }}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/10"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ir a Hoy</span>
          </button>

          <button
            onClick={() => fetchCalendarData(selectedDate)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/10"
            title="Recargar datos del día"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>Exportar Día a Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Top Section: Interactive Mini-Calendar & Day Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Calendar Picker Panel (5 columns) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-black text-slate-800 text-base">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <span>{monthNames[currentMonth]} {currentYear}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick direct date input */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Fecha específica:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  const [y, m] = e.target.value.split('-');
                  setCurrentYear(parseInt(y, 10));
                  setCurrentMonth(parseInt(m, 10) - 1);
                }
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-mono font-semibold focus:outline-indigo-500"
            />
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarGrid.map((cell, idx) => {
              const isSelected = cell.dateStr === selectedDate;
              const isTodayCell = cell.dateStr === todayStr;
              const salesInfo = salesDatesMap[cell.dateStr];
              const hasSales = Boolean(salesInfo && salesInfo.count > 0);

              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`
                    relative p-2 rounded-xl text-center text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-between min-h-[46px]
                    ${isSelected 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102 font-black z-10' 
                      : cell.isCurrentMonth
                        ? 'hover:bg-slate-100 text-slate-800'
                        : 'text-slate-300 hover:bg-slate-50'
                    }
                    ${isTodayCell && !isSelected ? 'border-2 border-indigo-400 font-bold' : ''}
                  `}
                >
                  <span className="text-[11px]">{cell.dayNumber}</span>

                  {/* Sales Indicator */}
                  {hasSales && (
                    <div className="mt-0.5 flex items-center justify-center">
                      <span className={`text-[9px] px-1 rounded-full font-mono font-bold leading-none py-0.5 ${
                        isSelected 
                          ? 'bg-emerald-400 text-slate-950' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {salesInfo.count}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Días con ventas registradas</span>
            </span>
            <span className="font-mono text-slate-600 font-bold">
              Seleccionado: {selectedDate}
            </span>
          </div>
        </div>

        {/* 4 Financial Stat Cards of Selected Day (7 columns) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          
          {/* Card 1: Recaudo Bruto */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recaudo Bruto del Día</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {formatCOP(dailyTotals.totalSales)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Suma de valor facturado en {dailyTotals.count} {dailyTotals.count === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
          </div>

          {/* Card 2: Costo Operativo */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Costo Operativo Total</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {formatCOP(dailyTotals.totalCost)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Costo de productos a bodega + fletes de envío
              </p>
            </div>
          </div>

          {/* Card 3: Ganancia Neta */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Margen Neto Acumulado</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                {formatCOP(dailyTotals.totalNet)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {dailyTotals.marginPercent}% de rentabilidad
                </span>
                <span className="text-[11px] text-slate-400">utilidad limpia</span>
              </div>
            </div>
          </div>

          {/* Card 4: Pedidos Auditados */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pedidos Auditados</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {dailyTotals.count}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Órdenes procesadas en {selectedDate}
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Spreadsheet / DataGrid Controls & Search */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, teléfono, pedido (NV-...) o producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Supplier Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Todos los Proveedores</option>
                <option value="dropi">Dropi Colombia</option>
                <option value="derocha">DeRocha Store</option>
                <option value="propio">Bodega Directa / Propio</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Todos los Estados</option>
                <option value="APROBADO_DROPI">Aprobado en Dropi</option>
                <option value="PENDIENTE_REVISION">Pendiente Revisión</option>
                <option value="ENTREGADO">Entregado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>

            {/* Sort toggle */}
            <button
              onClick={() => {
                if (sortField === 'time') {
                  setSortField('totalSale');
                } else if (sortField === 'totalSale') {
                  setSortField('netProfit');
                } else {
                  setSortField('time');
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              title="Cambiar ordenamiento"
            >
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              <span>
                Ordenar: {sortField === 'time' ? 'Hora' : sortField === 'totalSale' ? 'Total Venta' : 'Ganancia Neta'}
              </span>
            </button>

          </div>

        </div>

        {/* Spreadsheet DataGrid Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs border-collapse">
              
              {/* Spreadsheet Table Header */}
              <thead>
                <tr className="bg-slate-900 text-slate-200 text-[11px] uppercase font-bold tracking-wider border-b border-slate-800">
                  <th className="py-3 px-3 w-10 text-center font-mono">#</th>
                  <th className="py-3 px-3 whitespace-nowrap">ID Pedido</th>
                  <th className="py-3 px-3 whitespace-nowrap">Hora</th>
                  <th className="py-3 px-3 min-w-[150px]">Cliente</th>
                  <th className="py-3 px-3 whitespace-nowrap">Teléfono</th>
                  <th className="py-3 px-3 whitespace-nowrap">Ciudad / DANE</th>
                  <th className="py-3 px-4 min-w-[220px]">Producto(s)</th>
                  <th className="py-3 px-3 whitespace-nowrap">Proveedor</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Total Venta</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Costo Operativo</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Ganancia Neta</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Estado</th>
                  <th className="py-3 px-3 text-center w-20 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>

              {/* Spreadsheet Body */}
              <tbody className="divide-y divide-slate-100 bg-white font-sans text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                        <span className="font-semibold text-xs">Cargando registros contables del día...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-8 h-8 text-slate-300" />
                        <span className="font-bold text-sm text-slate-600">No hay ventas registradas para el {selectedDate}</span>
                        <span className="text-xs text-slate-400">Selecciona otro día en el calendario o ajusta los filtros.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedOrders.map((order, idx) => (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-indigo-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      {/* Row Index */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Order ID */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {order.orderNumber}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {order.time}
                      </td>

                      {/* Customer Name */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {order.customerName}
                      </td>

                      {/* Phone with WhatsApp link */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        <a
                          href={`https://wa.me/57${order.customerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 font-bold"
                          title="Contactar al cliente por WhatsApp"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{order.customerPhone}</span>
                        </a>
                      </td>

                      {/* City / DANE */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                        <div className="font-medium">{order.city}</div>
                        <div className="text-[10px] text-slate-400 font-mono">DANE: {order.daneCode || 'N/A'}</div>
                      </td>

                      {/* Products Summary */}
                      <td className="py-2.5 px-4 text-slate-800 text-[11px]">
                        <div className="line-clamp-2" title={order.products}>
                          {order.products}
                        </div>
                      </td>

                      {/* Supplier Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getSupplierBadge(order.supplier)}`}>
                          {order.supplier}
                        </span>
                      </td>

                      {/* Total Venta */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                        {formatCOP(order.totalSale)}
                      </td>

                      {/* Operating Cost */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-slate-500 text-[11px]">
                        {formatCOP(order.operatingCost)}
                      </td>

                      {/* Net Profit */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-black text-emerald-600">
                        {formatCOP(order.netProfit)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(order.status)}`}>
                          {order.status === 'APROBADO_DROPI' ? 'Aprobado Dropi' : order.status === 'PENDIENTE_REVISION' ? 'Pendiente' : order.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                          className="p-1 rounded-lg hover:bg-rose-100 text-rose-500 hover:text-rose-700 transition cursor-pointer"
                          title="Eliminar este pedido permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Spreadsheet Summary Footer */}
              {displayedOrders.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                      TOTALES DEL DÍA
                    </td>
                    <td colSpan={5} className="py-3 px-3 text-slate-300">
                      Total: {dailyTotals.count} {dailyTotals.count === 1 ? 'pedido auditado' : 'pedidos auditados'} • Margen Neto: {dailyTotals.marginPercent}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-white whitespace-nowrap">
                      {formatCOP(dailyTotals.totalSales)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400 whitespace-nowrap text-[11px]">
                      {formatCOP(dailyTotals.totalCost)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 whitespace-nowrap">
                      {formatCOP(dailyTotals.totalNet)}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center">
                      <button
                        onClick={handleExportCSV}
                        className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] transition cursor-pointer"
                      >
                        Excel
                      </button>
                    </td>
                  </tr>
                </tfoot>
              )}

            </table>
          </div>
        </div>

      </div>

    </div>
  );
};

export default SalesCalendarSheet;
