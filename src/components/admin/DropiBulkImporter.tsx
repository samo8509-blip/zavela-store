import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  CheckSquare, 
  Square, 
  ArrowRight, 
  Truck, 
  DollarSign, 
  Percent, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Package, 
  Filter, 
  Eye, 
  Trash2, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Boxes
} from 'lucide-react';
import { formatCOP } from '../../utils/formatters.ts';

export interface DropiCatalogItem {
  id: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  cost_price: number;
  suggested_price: number;
  stock: number;
  supplier?: string;
  supplier_rating?: number;
  warehouse?: string;
}

export interface StagingItem extends DropiCatalogItem {
  selected: boolean;
  estimatedShipping: number; // Por defecto $21.730 COP (piso logístico nacional)
  salePrice: number; // Precio de Venta Zavela
}

interface DropiBulkImporterProps {
  onImportComplete?: () => void;
  onBackToProducts?: () => void;
}

const DEFAULT_ESTIMATED_SHIPPING = 21730; // $21.730 COP por defecto

export const DropiBulkImporter: React.FC<DropiBulkImporterProps> = ({
  onImportComplete,
  onBackToProducts
}) => {
  const [catalog, setCatalog] = useState<DropiCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Staging Table state (map by Dropi ID)
  const [staging, setStaging] = useState<Record<string, StagingItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch Dropi catalog
  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dropi/catalog?search=${encodeURIComponent(search)}&category=${encodeURIComponent(selectedCategory)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCatalog(data.data);
      }
    } catch (e: any) {
      console.error('Error fetching Dropi catalog:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog();
  };

  // Categories present in catalog
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [catalog]);

  // Toggle selection for a product
  const toggleSelect = (item: DropiCatalogItem) => {
    setStaging(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        const cost = item.cost_price;
        const totalCost = cost + DEFAULT_ESTIMATED_SHIPPING;
        // Precio sugerido o margen estándar del 45% sobre costo total
        const defaultSalePrice = item.suggested_price || Math.round((totalCost * 1.45) / 100) * 100;
        next[item.id] = {
          ...item,
          selected: true,
          estimatedShipping: DEFAULT_ESTIMATED_SHIPPING,
          salePrice: defaultSalePrice
        };
      }
      return next;
    });
  };

  // Select all or deselect all visible
  const handleToggleSelectAllVisible = () => {
    const allSelected = catalog.length > 0 && catalog.every(item => Boolean(staging[item.id]));
    setStaging(prev => {
      const next = { ...prev };
      if (allSelected) {
        catalog.forEach(item => {
          delete next[item.id];
        });
      } else {
        catalog.forEach(item => {
          if (!next[item.id]) {
            const cost = item.cost_price;
            const totalCost = cost + DEFAULT_ESTIMATED_SHIPPING;
            const defaultSalePrice = item.suggested_price || Math.round((totalCost * 1.45) / 100) * 100;
            next[item.id] = {
              ...item,
              selected: true,
              estimatedShipping: DEFAULT_ESTIMATED_SHIPPING,
              salePrice: defaultSalePrice
            };
          }
        });
      }
      return next;
    });
  };

  // Staging items array
  const stagingItems = useMemo(() => Object.values(staging), [staging]);

  // Apply global automatic margin (e.g. +30%, +40%, +50%, +60%) over total operating cost
  const applyGlobalMargin = (percentage: number) => {
    setStaging(prev => {
      const next: Record<string, StagingItem> = {};
      for (const [id, item] of Object.entries(prev)) {
        const totalCost = item.cost_price + item.estimatedShipping;
        const multiplier = 1 + percentage / 100;
        // Redondear a las centenas más cercanas para precios comerciales limpios COP
        const newSalePrice = Math.round((totalCost * multiplier) / 100) * 100;
        next[id] = {
          ...item,
          salePrice: newSalePrice
        };
      }
      return next;
    });
    setNotification({
      type: 'success',
      message: `✨ Margen global de +${percentage}% aplicado a todos los ${stagingItems.length} productos en revisión.`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Update a single staging item field
  const updateStagingRow = (id: string, field: 'estimatedShipping' | 'salePrice', value: number) => {
    setStaging(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          [field]: Math.max(0, value)
        }
      };
    });
  };

  // Bulk Import Submit
  const handleBulkImport = async () => {
    if (stagingItems.length === 0) {
      alert('Por favor selecciona al menos un producto para importar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = stagingItems.map(item => {
        return {
          name: item.name,
          title: item.name,
          slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: item.description,
          images: item.images,
          price: item.salePrice,
          cost_price: item.cost_price,
          dropi_product_id: item.id,
          shipping_cost: 0, // Envío gratis para el cliente
          status: 'active',
          stock: item.stock || 25,
          estimated_shipping: item.estimatedShipping,
          category_name: item.category,
          warehouse: item.warehouse || 'Bogotá D.C.'
        };
      });

      const res = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload })
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: 'success',
          message: `✅ ¡${data.count} productos importados y persistidos en MySQL con respaldo Dropi exitosamente!`
        });
        setStaging({});
        setTimeout(() => {
          if (onImportComplete) onImportComplete();
        }, 1500);
      } else {
        throw new Error(data.message || 'Error al importar productos');
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `❌ ${err.message || 'Error en la importación masiva'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allVisibleSelected = catalog.length > 0 && catalog.every(item => Boolean(staging[item.id]));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-blue-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-black uppercase tracking-wider font-mono">
                Módulo Proveedor Dropi Colombia
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                <Truck className="w-3 h-3 text-emerald-400" />
                Piso Flete: $21.730 COP
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Importador & Cotizador Masivo Dropi</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Explora el catálogo de Dropi Colombia, selecciona múltiples productos, ajusta márgenes de ganancia con el piso logístico nacional y guárdalos directamente en MySQL con respaldo persistente garantizado.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {onBackToProducts && (
              <button
                onClick={onBackToProducts}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
              >
                Volver a Catálogo
              </button>
            )}
            <button
              onClick={fetchCatalog}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sincronizar Dropi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' 
            : 'bg-rose-50 border-rose-200 text-rose-900 shadow-sm'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* STAGING TABLE (Pre-Import Revision) */}
      {stagingItems.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-cyan-400 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Tabla de Revisión y Ajuste de Márgenes ({stagingItems.length} Seleccionados)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calcula la ganancia neta en tiempo real considerando el costo Dropi y el flete logístico nacional ($21.730 COP).
              </p>
            </div>

            {/* Global Automatic Margin Controls */}
            <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-2 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 pl-1">
                <SlidersHorizontal className="w-3 h-3 text-cyan-600" />
                <span>Margen Global:</span>
              </span>
              <button
                onClick={() => applyGlobalMargin(30)}
                className="px-2.5 py-1 text-xs font-black bg-white hover:bg-cyan-50 hover:text-cyan-700 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                +30%
              </button>
              <button
                onClick={() => applyGlobalMargin(40)}
                className="px-2.5 py-1 text-xs font-black bg-white hover:bg-cyan-50 hover:text-cyan-700 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                +40%
              </button>
              <button
                onClick={() => applyGlobalMargin(50)}
                className="px-2.5 py-1 text-xs font-black bg-white hover:bg-cyan-50 hover:text-cyan-700 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                +50%
              </button>
              <button
                onClick={() => applyGlobalMargin(60)}
                className="px-2.5 py-1 text-xs font-black bg-white hover:bg-cyan-50 hover:text-cyan-700 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                +60%
              </button>
            </div>
          </div>

          {/* Interactive Staging Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">Sel.</th>
                  <th className="px-3 py-3 min-w-[200px]">Producto Dropi</th>
                  <th className="px-3 py-3 text-right">Costo Base Dropi</th>
                  <th className="px-3 py-3 text-right min-w-[130px]">Flete Estimado</th>
                  <th className="px-3 py-3 text-right">Costo Op. Total</th>
                  <th className="px-3 py-3 text-right min-w-[140px]">Precio Venta Zavela</th>
                  <th className="px-3 py-3 text-right">Ganancia Neta</th>
                  <th className="px-3 py-3 text-center">% Rentabilidad</th>
                  <th className="px-3 py-3 w-10 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stagingItems.map(item => {
                  const cost = item.cost_price;
                  const shipping = item.estimatedShipping;
                  const totalOp = cost + shipping;
                  const sale = item.salePrice;
                  const profit = sale - totalOp;
                  const marginPct = totalOp > 0 ? Math.round((profit / totalOp) * 1000) / 10 : 0;
                  const isProfitable = profit > 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleSelect(item)}
                          className="text-cyan-600 hover:text-cyan-700 cursor-pointer"
                        >
                          <CheckSquare className="w-4 h-4 fill-cyan-50" />
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 line-clamp-1">{item.name}</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span className="font-bold text-blue-700 bg-blue-50 px-1 rounded">{item.id}</span>
                              <span>• {item.category}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-700">
                        {formatCOP(cost)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          value={shipping}
                          onChange={(e) => updateStagingRow(item.id, 'estimatedShipping', Number(e.target.value))}
                          step="500"
                          className="w-24 px-2 py-1 text-right font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded-lg focus:border-cyan-500 focus:bg-white outline-hidden"
                          title="Flete promedio nacional (editable)"
                        />
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-800">
                        {formatCOP(totalOp)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          value={sale}
                          onChange={(e) => updateStagingRow(item.id, 'salePrice', Number(e.target.value))}
                          step="1000"
                          className="w-28 px-2 py-1 text-right font-mono font-extrabold text-xs bg-white border-2 border-cyan-400 rounded-lg focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500 outline-hidden text-slate-900"
                          title="Precio de venta Zavela Store (editable)"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-black text-[11px] ${
                          isProfitable 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {isProfitable ? '+' : ''}{formatCOP(profit)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-mono font-bold text-xs ${
                          marginPct >= 30 ? 'text-emerald-700' : (marginPct > 0 ? 'text-amber-700' : 'text-rose-600')
                        }`}>
                          {marginPct}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleSelect(item)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                          title="Quitar de revisión"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Action Footer for Staging */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <span className="font-bold text-slate-900">{stagingItems.length}</span> productos listos para sincronizar en MySQL.
              <span className="text-slate-400">|</span>
              <span className="font-mono text-emerald-700 font-bold">
                Utilidad potencial total: {formatCOP(stagingItems.reduce((acc, i) => acc + (i.salePrice - (i.cost_price + i.estimatedShipping)), 0))}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStaging({})}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Limpiar Selección
              </button>

              <button
                onClick={handleBulkImport}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${isSubmitting ? 'animate-bounce' : ''}`} />
                <span>{isSubmitting ? 'Importando a MySQL...' : `Guardar e Importar ${stagingItems.length} Productos`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPLORADOR DEL CATÁLOGO DROPI */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-cyan-600" />
              <span>Explorador de Catálogo Dropi</span>
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona los productos que deseas incorporar a la tienda Zavela.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAllVisible}
              className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {allVisibleSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-cyan-600" />
                  <span>Deseleccionar Todos</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-500" />
                  <span>Seleccionar Todos ({catalog.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, ID de Dropi, categoría o descripción..."
              className="w-full pl-9 pr-20 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:border-cyan-500 focus:bg-white outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Buscar
            </button>
          </form>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2.5 px-3 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:border-cyan-500 focus:bg-white outline-hidden font-bold text-slate-800 cursor-pointer"
            >
              <option value="all">Todas las Categorías</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Catalog Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
            <span className="text-xs font-mono font-bold">Consultando catálogo oficial de Dropi...</span>
          </div>
        ) : catalog.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-sm text-slate-700">No se encontraron productos en Dropi</div>
            <p className="text-xs text-slate-400">Intenta con otros términos de búsqueda o selecciona otra categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {catalog.map(item => {
              const isSelected = Boolean(staging[item.id]);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item)}
                  className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all cursor-pointer relative ${
                    isSelected 
                      ? 'bg-cyan-50/50 border-cyan-500 shadow-md ring-2 ring-cyan-400/40' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    {/* Top Checkbox & Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        #{item.id}
                      </span>
                      <div className="flex items-center gap-1">
                        {isSelected ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full">
                            <CheckSquare className="w-3.5 h-3.5 text-cyan-600" />
                            Seleccionado
                          </span>
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Image */}
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-100 mb-2.5 relative">
                      <img
                        src={item.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-snug mb-1">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {item.description}
                    </p>
                  </div>

                  {/* Pricing Details */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Costo Proveedor:</span>
                      <span className="font-mono font-bold text-slate-700">{formatCOP(item.cost_price)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Sugerido Venta:</span>
                      <span className="font-mono font-black text-cyan-700">{formatCOP(item.suggested_price)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-0.5">
                      <span>Stock: {item.stock} un.</span>
                      <span>{item.warehouse || 'Bogotá'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
