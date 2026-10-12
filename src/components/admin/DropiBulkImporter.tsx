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
  Boxes,
  Zap,
  Link2,
  Loader2,
  ExternalLink,
  Edit2,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { formatCOP } from '../../utils/formatters.ts';

export interface DropiCatalogItem {
  id: string;
  dropi_product_id?: string;
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
  dropi_product_id: string; // ID real de Dropi Colombia
  selected: boolean;
  estimatedShipping: number; // Por defecto $21.730 COP (piso logístico nacional)
  salePrice: number; // Precio de Venta Zavela
}

interface DropiBulkImporterProps {
  onImportComplete?: () => void;
  onBackToProducts?: () => void;
}

const DEFAULT_ESTIMATED_SHIPPING = 21730; // $21.730 COP por defecto (piso logístico nacional)

/**
 * Parsea de forma inteligente el ID numérico de Dropi desde una URL o texto ingresado
 * Ejemplos soportados:
 * - https://app.dropi.co/dashboard/products/detail/20391
 * - https://app.dropi.co/products/detail/20391?ref=test
 * - https://app.dropi.co/product/20391
 * - https://dropi.co/p/20391
 * - DROPI-20391
 * - 20391
 */
function parseDropiId(input: string): string {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  const prefixMatch = trimmed.match(/^DROPI-(\d+)$/i);
  if (prefixMatch) {
    return prefixMatch[1];
  }
  const queryMatch = trimmed.match(/[?&](?:id|product_id|productId)=(\d+)/i);
  if (queryMatch) {
    return queryMatch[1];
  }
  const pathMatch = trimmed.match(/(?:products|detail|producto|product|p)\/(\d+)/i);
  if (pathMatch) {
    return pathMatch[1];
  }
  const lastDigits = trimmed.match(/(\d+)(?:\/?$|[?#])/);
  if (lastDigits) {
    return lastDigits[1];
  }
  return trimmed.replace(/^DROPI-/i, '').trim();
}

export const DropiBulkImporter: React.FC<DropiBulkImporterProps> = ({
  onImportComplete,
  onBackToProducts
}) => {
  // Direct Link / ID Extractor State
  const [urlOrIdInput, setUrlOrIdInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractorError, setExtractorError] = useState<string | null>(null);

  // Catalog Explorer State
  const [catalog, setCatalog] = useState<DropiCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Staging Table state (map by Dropi ID)
  const [staging, setStaging] = useState<Record<string, StagingItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal / Preview state for gallery
  const [previewImages, setPreviewImages] = useState<{ title: string; images: string[] } | null>(null);

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

  // Extraer producto directo por URL o ID numérico
  const handleExtractDirectProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = urlOrIdInput.trim();
    if (!rawInput) {
      setExtractorError('Por favor ingresa un enlace o un ID numérico de Dropi.');
      return;
    }

    const cleanId = parseDropiId(rawInput);
    if (!cleanId) {
      setExtractorError('No se pudo detectar un ID numérico de Dropi válido en el enlace ingresado.');
      return;
    }

    setIsExtracting(true);
    setExtractorError(null);

    try {
      const res = await fetch(`/api/dropi/product/${encodeURIComponent(cleanId)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.message || `No se encontró el producto con ID #${cleanId} en Dropi Colombia.`);
      }

      const prod = data.data;
      const cost = Number(prod.cost_price) || 0;
      const totalOp = cost + DEFAULT_ESTIMATED_SHIPPING;
      // Margen sugerido pre-llenado: Costo Total + 40% (o precio sugerido de Dropi si es mayor)
      const calculatedSalePrice = Math.max(
        Number(prod.suggested_price) || 0,
        Math.round((totalOp * 1.40) / 100) * 100
      );

      const stagingId = String(prod.dropi_product_id || cleanId);

      // Agregar o apilar en la tabla de revisión interactiva
      setStaging(prev => ({
        ...prev,
        [stagingId]: {
          id: `DROPI-${stagingId}`,
          dropi_product_id: stagingId,
          name: prod.name || `Producto Dropi #${stagingId}`,
          category: prod.category || 'General',
          description: prod.description || '',
          images: Array.isArray(prod.images) && prod.images.length > 0 ? prod.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
          cost_price: cost,
          suggested_price: Number(prod.suggested_price) || calculatedSalePrice,
          stock: Number(prod.stock) || 25,
          supplier: prod.supplier || 'Proveedor Dropi Colombia',
          warehouse: prod.warehouse || 'Bogotá D.C.',
          selected: true,
          estimatedShipping: DEFAULT_ESTIMATED_SHIPPING,
          salePrice: calculatedSalePrice
        }
      }));

      setUrlOrIdInput('');
      setNotification({
        type: 'success',
        message: `✨ ¡Producto #${stagingId} "${prod.name}" extraído con éxito con ${prod.images?.length || 1} fotos en alta resolución!`
      });
      setTimeout(() => setNotification(null), 4000);

      // Scroll suave hacia la tabla de cotización si no está a la vista
      const stagingEl = document.getElementById('staging-margin-table');
      if (stagingEl) {
        stagingEl.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      setExtractorError(err.message || 'Error al conectar con la API de Dropi');
    } finally {
      setIsExtracting(false);
    }
  };

  // Toggle selection for a product from the explorer
  const toggleSelect = (item: DropiCatalogItem) => {
    const rawId = item.dropi_product_id || item.id.replace(/^DROPI-/i, '');
    setStaging(prev => {
      const next = { ...prev };
      if (next[rawId]) {
        delete next[rawId];
      } else {
        const cost = item.cost_price;
        const totalCost = cost + DEFAULT_ESTIMATED_SHIPPING;
        const defaultSalePrice = item.suggested_price || Math.round((totalCost * 1.40) / 100) * 100;
        next[rawId] = {
          ...item,
          dropi_product_id: rawId,
          selected: true,
          estimatedShipping: DEFAULT_ESTIMATED_SHIPPING,
          salePrice: defaultSalePrice
        };
      }
      return next;
    });
  };

  // Select all or deselect all visible from the explorer
  const handleToggleSelectAllVisible = () => {
    const allSelected = catalog.length > 0 && catalog.every(item => {
      const rid = item.dropi_product_id || item.id.replace(/^DROPI-/i, '');
      return Boolean(staging[rid]);
    });

    setStaging(prev => {
      const next = { ...prev };
      if (allSelected) {
        catalog.forEach(item => {
          const rid = item.dropi_product_id || item.id.replace(/^DROPI-/i, '');
          delete next[rid];
        });
      } else {
        catalog.forEach(item => {
          const rid = item.dropi_product_id || item.id.replace(/^DROPI-/i, '');
          if (!next[rid]) {
            const cost = item.cost_price;
            const totalCost = cost + DEFAULT_ESTIMATED_SHIPPING;
            const defaultSalePrice = item.suggested_price || Math.round((totalCost * 1.40) / 100) * 100;
            next[rid] = {
              ...item,
              dropi_product_id: rid,
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
      message: `✨ Margen global de +${percentage}% aplicado a todos los ${stagingItems.length} productos en cotización.`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Update a single staging item field (name, description, estimatedShipping, salePrice)
  const updateStagingRow = (id: string, field: keyof StagingItem, value: any) => {
    setStaging(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          [field]: value
        }
      };
    });
  };

  // Bulk Import Submit
  const handleBulkImport = async () => {
    if (stagingItems.length === 0) {
      alert('Por favor agrega o selecciona al menos un producto para importar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = stagingItems.map(item => {
        return {
          name: item.name.trim(),
          title: item.name.trim(),
          slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: item.description,
          images: item.images,
          price: item.salePrice,
          cost_price: item.cost_price,
          dropi_product_id: item.dropi_product_id || item.id.replace(/^DROPI-/i, ''),
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

  const allVisibleSelected = catalog.length > 0 && catalog.every(item => {
    const rid = item.dropi_product_id || item.id.replace(/^DROPI-/i, '');
    return Boolean(staging[rid]);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-blue-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-black uppercase tracking-wider font-mono">
                API Oficial Dropi Colombia
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                <Truck className="w-3 h-3 text-emerald-400" />
                Piso Flete Nacional: $21.730 COP
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Importador & Cotizador Masivo Dropi</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Importa productos directamente pegando enlaces o IDs de Dropi, o explora el catálogo proveedor. Ajusta tus precios con cotización de fletes y márgenes netos en tiempo real con persistencia blindada en MySQL.
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
              <span>Sincronizar Catálogo</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: EXTRACTOR RÁPIDO POR ENLACE O ID DE DROPI */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-5 sm:p-7 border-2 border-cyan-400 shadow-xl text-white relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
              </span>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                ⚡ Importar producto directo desde Dropi por Enlace o ID
              </h2>
            </div>
            <span className="text-[11px] font-mono text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-400/30 px-2.5 py-0.5 rounded-full">
              Extracción Instantánea de Fotos & Costos
            </span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed max-w-3xl">
            Pega el enlace directo de Dropi (ej: <code className="bg-black/40 px-2 py-0.5 rounded text-cyan-300 font-mono">https://app.dropi.co/dashboard/products/detail/20391</code>) o ingresa directamente el ID numérico (ej: <code className="bg-black/40 px-2 py-0.5 rounded text-cyan-300 font-mono">20391</code>). El sistema extraerá todas las fotos en alta resolución, la descripción técnica y el costo base del proveedor.
          </p>

          <form onSubmit={handleExtractDirectProduct} className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="relative flex-1">
              <input
                type="text"
                value={urlOrIdInput}
                onChange={(e) => {
                  setUrlOrIdInput(e.target.value);
                  if (extractorError) setExtractorError(null);
                }}
                placeholder="Pega la URL de Dropi o escribe el ID numérico (ej: 20391 o https://app.dropi.co/...)"
                disabled={isExtracting}
                className="w-full pl-10 pr-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder:text-slate-400 rounded-2xl border border-cyan-400/50 focus:border-cyan-400 outline-hidden text-xs font-mono transition-all"
              />
              <Link2 className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="submit"
              disabled={isExtracting || !urlOrIdInput.trim()}
              className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Extrayendo Fotos e Info...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Extraer Información y Fotos</span>
                </>
              )}
            </button>
          </form>

          {extractorError && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{extractorError}</span>
            </div>
          )}
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

      {/* SECCIÓN 2: TABLA INTERACTIVA DE AJUSTE DE MÁRGENES (STAGING TABLE) */}
      {stagingItems.length > 0 && (
        <div id="staging-margin-table" className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-cyan-400 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Tabla de Cotización & Revisión ({stagingItems.length} {stagingItems.length === 1 ? 'Producto' : 'Productos'})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Edita nombres, descripciones y precios en tiempo real. Flete promedio nacional predefinido en <strong>$21.730 COP</strong>.
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
                  <th className="px-3 py-3 min-w-[280px]">Producto & Fotos Extraídas</th>
                  <th className="px-3 py-3 text-right">Costo Base Dropi</th>
                  <th className="px-3 py-3 text-right min-w-[130px]">Flete Estimado</th>
                  <th className="px-3 py-3 text-right">Costo Op. Total</th>
                  <th className="px-3 py-3 text-right min-w-[150px]">Precio Venta Zavela</th>
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
                  const rawKey = item.dropi_product_id || item.id.replace(/^DROPI-/i, '');

                  return (
                    <tr key={rawKey} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product, Gallery Thumbnails & Editable Fields */}
                      <td className="px-3 py-3">
                        <div className="space-y-2">
                          <div className="flex items-start gap-2.5">
                            {/* Main Cover & Thumbnails Gallery trigger */}
                            <div 
                              onClick={() => setPreviewImages({ title: item.name, images: item.images })}
                              className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 cursor-pointer group"
                              title="Ver galería completa de fotos extraídas"
                            >
                              <img
                                src={item.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              {item.images.length > 1 && (
                                <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[9px] font-mono font-bold px-1 py-0.2 rounded-tl">
                                  +{item.images.length - 1}
                                </span>
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateStagingRow(rawKey, 'name', e.target.value)}
                                className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:border-cyan-500 outline-hidden"
                                placeholder="Nombre del producto"
                                title="Título editable del producto"
                              />
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-1">
                                <span className="font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                  Dropi #{rawKey}
                                </span>
                                <span>• {item.images.length} fotos</span>
                                <span>• {item.category || 'General'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Editable Description Snippet */}
                          <div>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateStagingRow(rawKey, 'description', e.target.value)}
                              placeholder="Descripción o especificaciones clave..."
                              className="w-full text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:border-cyan-500 focus:bg-white outline-hidden"
                              title="Descripción editable"
                            />
                          </div>

                          {/* Horizontal Mini Thumbnails Bar */}
                          {item.images.length > 1 && (
                            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                              {item.images.slice(0, 5).map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`Thumb ${idx}`}
                                  onClick={() => setPreviewImages({ title: item.name, images: item.images })}
                                  className="w-6 h-6 object-cover rounded border border-slate-200 cursor-pointer hover:border-cyan-500 shrink-0"
                                />
                              ))}
                              {item.images.length > 5 && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImages({ title: item.name, images: item.images })}
                                  className="text-[10px] font-mono text-cyan-600 hover:text-cyan-800 font-bold px-1"
                                >
                                  +{item.images.length - 5} más
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Costo Dropi Base */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-700">
                        {formatCOP(cost)}
                      </td>

                      {/* Flete Estimado Editable */}
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          value={shipping}
                          onChange={(e) => updateStagingRow(rawKey, 'estimatedShipping', Number(e.target.value))}
                          step="500"
                          className="w-24 px-2 py-1 text-right font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded-lg focus:border-cyan-500 focus:bg-white outline-hidden"
                          title="Flete promedio nacional (editable)"
                        />
                      </td>

                      {/* Costo Operativo Total */}
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-800">
                        {formatCOP(totalOp)}
                      </td>

                      {/* Precio de Venta Zavela Editable */}
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          value={sale}
                          onChange={(e) => updateStagingRow(rawKey, 'salePrice', Number(e.target.value))}
                          step="1000"
                          className="w-28 px-2 py-1 text-right font-mono font-extrabold text-xs bg-white border-2 border-cyan-400 rounded-lg focus:border-cyan-600 focus:ring-1 focus:ring-cyan-500 outline-hidden text-slate-900"
                          title="Precio final de venta Zavela Store (editable)"
                        />
                      </td>

                      {/* Ganancia Neta Calculada */}
                      <td className="px-3 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-black text-[11px] ${
                          isProfitable 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {isProfitable ? '+' : ''}{formatCOP(profit)}
                        </span>
                      </td>

                      {/* % Margen de Rentabilidad Neta */}
                      <td className="px-3 py-3 text-center">
                        <span className={`font-mono font-bold text-xs ${
                          marginPct >= 30 ? 'text-emerald-700' : (marginPct > 0 ? 'text-amber-700' : 'text-rose-600')
                        }`}>
                          {marginPct}%
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => {
                            setStaging(prev => {
                              const next = { ...prev };
                              delete next[rawKey];
                              return next;
                            });
                          }}
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
            <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900">{stagingItems.length}</span> producto{stagingItems.length > 1 ? 's' : ''} listo{stagingItems.length > 1 ? 's' : ''} para importar al catálogo Zavela.
              <span className="text-slate-400">|</span>
              <span className="font-mono text-emerald-700 font-bold">
                Utilidad líquida total estimada: {formatCOP(stagingItems.reduce((acc, i) => acc + (i.salePrice - (i.cost_price + i.estimatedShipping)), 0))}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStaging({})}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Limpiar Lista
              </button>

              <button
                onClick={handleBulkImport}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${isSubmitting ? 'animate-bounce' : ''}`} />
                <span>{isSubmitting ? 'Importando a MySQL...' : `Guardar e Importar al Catálogo (${stagingItems.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: EXPLORADOR DEL CATÁLOGO DROPI COLOMBIA */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-cyan-600" />
              <span>Explorador de Catálogo Dropi Colombia</span>
            </h2>
            <p className="text-xs text-slate-500">
              Selecciona productos individuales o masivos para cargarlos en la tabla de cotización y márgenes.
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
              const rawKey = item.dropi_product_id || item.id.replace(/^DROPI-/i, '');
              const isSelected = Boolean(staging[rawKey]);

              return (
                <div
                  key={rawKey}
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
                        #{rawKey}
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
                      {item.images.length > 1 && (
                        <span className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-md">
                          {item.images.length} fotos
                        </span>
                      )}
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

      {/* MODAL PREVIEW DE GALERÍA DE FOTOS */}
      {previewImages && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm line-clamp-1">{previewImages.title}</h3>
                <span className="text-xs text-slate-500 font-mono">{previewImages.images.length} fotos en alta resolución</span>
              </div>
              <button
                onClick={() => setPreviewImages(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {previewImages.images.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
                  <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                  <a
                    href={img}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-2 right-2 bg-black/70 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Abrir imagen completa"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewImages(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Cerrar Galería
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
