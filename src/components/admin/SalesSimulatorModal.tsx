import React, { useState } from 'react';
import {
  X,
  Play,
  DollarSign,
  Truck,
  Building2,
  Package,
  TrendingUp,
  Percent,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Product } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';

interface SalesSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSimulationComplete: () => void;
}

export const SalesSimulatorModal: React.FC<SalesSimulatorModalProps> = ({
  isOpen,
  onClose,
  products,
  onSimulationComplete
}) => {
  const [salesPerProduct, setSalesPerProduct] = useState<number>(3);
  const [customSalesCount, setCustomSalesCount] = useState<string>('3');
  const [carrierCost, setCarrierCost] = useState<number>(16500);
  const [dropiFeePercent, setDropiFeePercent] = useState<number>(5);
  const [dropiFixedFee, setDropiFixedFee] = useState<number>(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter products if category is selected
  const activeProducts = products.filter(p => p.active ?? true);
  const targetProducts = selectedCategoryId === 'all' 
    ? activeProducts 
    : activeProducts.filter(p => p.categoryId === selectedCategoryId);

  const numSales = Number(customSalesCount) > 0 ? Number(customSalesCount) : salesPerProduct;
  const totalOrdersToGenerate = targetProducts.length * numSales;

  // Calculate live financial projections
  const totalProjectedSales = targetProducts.reduce((acc, p) => acc + (p.price * numSales), 0);
  const totalProjectedProductCost = targetProducts.reduce((acc, p) => {
    const cost = Number(p.costPrice) > 0 ? Number(p.costPrice) : Math.round(p.price * 0.45);
    return acc + (cost * numSales);
  }, 0);
  const totalProjectedCarrierCost = totalOrdersToGenerate * carrierCost;
  const totalProjectedDropiFees = Math.round(totalProjectedSales * (dropiFeePercent / 100)) + (totalOrdersToGenerate * dropiFixedFee);
  
  const totalOperationalCosts = totalProjectedProductCost + totalProjectedCarrierCost + totalProjectedDropiFees;
  const projectedGrossProfit = totalProjectedSales - totalProjectedProductCost;
  const projectedNetProfit = totalProjectedSales - totalOperationalCosts;
  const netMarginPercent = totalProjectedSales > 0 ? (projectedNetProfit / totalProjectedSales) * 100 : 0;
  const avgNetProfitPerOrder = totalOrdersToGenerate > 0 ? projectedNetProfit / totalOrdersToGenerate : 0;

  // Extract unique categories
  const categoriesMap = new Map<string, string>();
  activeProducts.forEach(p => {
    if (p.categoryId && p.categoryName) {
      categoriesMap.set(p.categoryId, p.categoryName);
    }
  });

  const handleQuickSalesSelect = (count: number) => {
    setSalesPerProduct(count);
    setCustomSalesCount(String(count));
  };

  const handleExecuteSimulation = async () => {
    setIsSimulating(true);
    setError(null);
    setResultMessage(null);

    try {
      const payload = {
        countPerProduct: numSales,
        carrierCost,
        dropiFeePercent,
        dropiFixedFee,
        selectedProductIds: selectedCategoryId === 'all' ? undefined : targetProducts.map(p => p.id)
      };

      const res = await fetch('/api/admin/orders/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al ejecutar la simulación de ventas');

      setResultMessage(data.message || `¡Simulación exitosa! Se generaron ${totalOrdersToGenerate} pedidos.`);
      setTimeout(() => {
        onSimulationComplete();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al procesar la simulación');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-black border border-emerald-400/30 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Simulador Financiero & Logístico COD</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Control de Pagos y Fletes</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Simular Ventas & Calcular Costos Operativos
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Define la cantidad de pedidos y los costos de fletes y pasarela Dropi para auditar exactamente la ganancia neta líquida.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto grow">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resultMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{resultMessage}</span>
            </div>
          )}

          {/* 1. SELECCIÓN DE CANTIDAD DE VENTAS */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cantidad de Ventas a Simular por Producto</span>
              </label>
              <span className="text-xs font-bold text-slate-500">
                {targetProducts.length} productos seleccionados
              </span>
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 5, 10, 20].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleQuickSalesSelect(count)}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                    numSales === count
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20 scale-102'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {count} {count === 1 ? 'Venta' : 'Ventas'}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-medium text-slate-600">O escribe una cantidad personalizada:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customSalesCount}
                  onChange={(e) => setCustomSalesCount(e.target.value)}
                  className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-hidden"
                />
                <span className="text-xs font-bold text-slate-700">ventas por producto</span>
              </div>
            </div>

            {/* Category Filter */}
            {categoriesMap.size > 0 && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-600 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span>Filtrar por categoría:</span>
                </span>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:border-cyan-500"
                >
                  <option value="all">Todo el Catálogo ({activeProducts.length} productos)</option>
                  {Array.from(categoriesMap.entries()).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name} ({activeProducts.filter(p => p.categoryId === id).length} productos)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. COSTOS OPERATIVOS Y LOGÍSTICOS (TRANSPORTADORA & DROPI) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-cyan-600" />
              <span>Parámetros de Costos Operativos & Comisiones</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* Carrier Cost */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Flete Transportadora Promedio:</span>
                  </span>
                  <span className="font-black text-cyan-800 font-mono">{formatCOP(carrierCost)}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Servientrega, Coordinadora, Interrapidísimo, Envía, TCC (flete nacional promedio).
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  {[14000, 16500, 18500, 21000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCarrierCost(val)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                        carrierCost === val ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ${val / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropi Fee */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-bold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Comisión Plataforma Dropi:</span>
                  </span>
                  <span className="font-black text-indigo-800 font-mono">{dropiFeePercent}% recaudo</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tarifa de recaudo y servicio de pasarela Dropi Colombia (promedio 5%).
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  {[3, 5, 7, 10].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDropiFeePercent(val)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                        dropiFeePercent === val ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* 3. PROYECCIÓN FINANCIERA EN VIVO (DESGLOSE COMPLETO DE COSTOS Y GANANCIA NETA) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-5 rounded-2xl border border-slate-800 text-white space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                  ESTIMACIÓN FINANCIERA DE LA SIMULACIÓN
                </span>
                <h5 className="font-extrabold text-sm text-white">
                  Desglose de Ingresos, Pagos a Realizar y Beneficio Líquido
                </h5>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-black font-mono border border-cyan-500/30">
                {totalOrdersToGenerate} pedidos a generar
              </span>
            </div>

            {/* Financial Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              
              {/* 1. Ventas Totales */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-cyan-400" />
                  <span>Ventas Brutas</span>
                </span>
                <div className="text-base font-black text-white font-mono">
                  {formatCOP(totalProjectedSales)}
                </div>
                <div className="text-[10px] text-slate-400">Recaudo Contra Entrega</div>
              </div>

              {/* 2. Pago a Transportadoras */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Truck className="w-3 h-3 text-amber-400" />
                  <span>Pago Fletes</span>
                </span>
                <div className="text-base font-black text-amber-300 font-mono">
                  -{formatCOP(totalProjectedCarrierCost)}
                </div>
                <div className="text-[10px] text-slate-400">{totalOrdersToGenerate} guías despachadas</div>
              </div>

              {/* 3. Pago Dropi Pasarela */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-indigo-400" />
                  <span>Cobro Dropi ({dropiFeePercent}%)</span>
                </span>
                <div className="text-base font-black text-indigo-300 font-mono">
                  -{formatCOP(totalProjectedDropiFees)}
                </div>
                <div className="text-[10px] text-slate-400">Tarifa plataforma/recaudo</div>
              </div>

              {/* 4. Costo Mercancía Proveedor */}
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Package className="w-3 h-3 text-slate-300" />
                  <span>Costo Mercancía</span>
                </span>
                <div className="text-base font-black text-slate-200 font-mono">
                  -{formatCOP(totalProjectedProductCost)}
                </div>
                <div className="text-[10px] text-slate-400">Pago proveedores Dropi</div>
              </div>

            </div>

            {/* NET PROFIT HIGHLIGHT BAR */}
            <div className="bg-emerald-950/90 border-2 border-emerald-500/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-200">
              <div className="space-y-0.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>GANANCIA NETA REAL EN MANO (Beneficio Líquido)</span>
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  Descontando costo de producto, flete transportadora y tarifa Dropi.
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  +{formatCOP(projectedNetProfit)}
                </div>
                <div className="text-[11px] font-bold text-emerald-300 font-mono">
                  +{netMarginPercent.toFixed(1)}% margen neto • {formatCOP(avgNetProfitPerOrder)} / pedido
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSimulating}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleExecuteSimulation}
            disabled={isSimulating || totalOrdersToGenerate === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Simulando {totalOrdersToGenerate} Ventas y Calculando...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>Generar {totalOrdersToGenerate} Ventas con Costos</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
