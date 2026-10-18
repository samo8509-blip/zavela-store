import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Upload, Link as LinkIcon, Star, CheckCircle2, AlertTriangle, Trash2, ChevronLeft, ChevronRight, Loader2, Boxes, Zap, Store, Building2, Tag, Coins, Truck, ShieldCheck, DollarSign, Calculator, Plus, X, RefreshCw } from 'lucide-react';
import { Product, Category, ProductVariant } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { FacebookPageConnectModal } from './FacebookPageConnectModal.tsx';
import { getLocalProductOverride, saveLocalProductOverride, saveCustomProductCost, getCustomProductCost, CUSTOM_COSTS_STORAGE_KEY } from '../../services/cpanelProducts.ts';

export interface AdminProductEditorProps {
  product: Product | null;
  categories: Category[];
  onSave: (productData: Partial<Product>) => Promise<void>;
  onCancel: () => void;
}

export const AdminProductEditor: React.FC<AdminProductEditorProps> = ({ product, categories, onSave, onCancel }) => {
  const isEditing = Boolean(product?.id);
  const [isSaving, setIsSaving] = useState(false);

  const pId = product?.id || (product as any)?.productId;
  const pSlug = product?.slug;
  const localOverride = pId || pSlug ? getCustomProductCost(String(pId || ''), String(pSlug || '')) : null;

  // Estados Base
  const [title, setTitle] = useState(product?.title || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription || '');
  const [description, setDescription] = useState(product?.description || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || '');
  const [customSupplierName, setCustomSupplierName] = useState((product as any)?.supplier || '');
  const [dropiProductId, setDropiProductId] = useState(() => {
    if (localOverride && localOverride.dropiProductId !== undefined) return localOverride.dropiProductId;
    return product?.dropiProductId || product?.dropi_product_id || '';
  });

  // Proveedor Inteligente
  const resolveInitialProvider = () => {
    if (localOverride && localOverride.provider) return localOverride.provider as any;
    if (!product) return 'derocha';
    const raw = String(product.provider || product.supplier || '').toLowerCase();
    if (raw.includes('dropi')) return 'dropi';
    if (raw.includes('direct') || raw.includes('propio')) return 'direct';
    if (raw.includes('other')) return 'other';
    return 'derocha';
  };
  const [provider, setProvider] = useState<'dropi'|'derocha'|'direct'|'other'>(resolveInitialProvider());

  // PRECIOS Y COSTOS (BLINDADOS CONTRA EL 16500 - DEFAULT 0)
  const [price, setPrice] = useState(Number(product?.price) || 0);
  const [costPrice, setCostPrice] = useState(Number(product?.costPrice || (product as any)?.supplier_cost) || 0);
  const [compareAtPrice, setCompareAtPrice] = useState(Number(product?.compareAtPrice) || 0);
  const [stock, setStock] = useState(Number(product?.stock) || 20);

  const [shippingCost, setShippingCost] = useState<number | ''>(() => {
    if (localOverride && typeof localOverride.shippingCost === 'number') {
      return localOverride.shippingCost;
    }
    const raw = product?.shippingCost ?? (product as any)?.shipping_cost ?? (product as any)?.flete ?? (product as any)?.flete_envio;
    if (raw === undefined || raw === null || raw === '') return '';
    const num = Number(raw);
    if (isNaN(num)) return '';
    if (num === 16500 && (product?.provider === 'dropi' || (product as any)?.dropi_product_id || (product as any)?.dropiProductId)) {
      return 0;
    }
    return num;
  });
  
  const [dropiFee, setDropiFee] = useState<number | ''>(() => {
    if (localOverride && typeof localOverride.dropiFee === 'number') {
      return localOverride.dropiFee;
    }
    const raw = product?.dropiFee ?? (product as any)?.dropi_fee;
    if (raw === undefined || raw === null || raw === '') return '';
    const num = Number(raw);
    return isNaN(num) ? '' : num;
  });

  // EFECTO OBLIGATORIO: Forzar lectura de zavela_custom_costs_v1 al montar o cambiar product
  useEffect(() => {
    if (!product) return;
    const prodId = String(product.id || (product as any)?.productId || '').trim();
    const prodSlug = String(product.slug || '').trim();

    try {
      const raw = localStorage.getItem('zavela_custom_costs_v1');
      if (raw) {
        const map = JSON.parse(raw);
        const saved = (prodId && map[prodId]) || (prodSlug && map[prodSlug]);
        if (saved) {
          if (typeof saved.shippingCost === 'number') {
            setShippingCost(saved.shippingCost);
          }
          if (typeof saved.dropiFee === 'number') {
            setDropiFee(saved.dropiFee);
          }
          if (saved.dropiProductId) {
            setDropiProductId(saved.dropiProductId);
          }
          if (saved.provider) {
            setProvider(saved.provider as any);
          }
        }
      }
    } catch (e) {
      console.warn('Error leyendo zavela_custom_costs_v1 en AdminProductEditor:', e);
    }
  }, [product]);

  const [active, setActive] = useState(product?.active !== false);
  const [featured, setFeatured] = useState(Boolean(product?.featured));
  const [images, setImages] = useState<string[]>(product?.images?.length ? product.images : []);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Estados de Variantes Avanzadas
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants || []);
  const [newVarColor, setNewVarColor] = useState('');
  const [newVarSize, setNewVarSize] = useState('Única');
  const [newVarDropiId, setNewVarDropiId] = useState('');
  const [newVarStock, setNewVarStock] = useState(10);
  const [newVarSku, setNewVarSku] = useState('');

  // Facebook Modal
  const [publishToFacebook, setPublishToFacebook] = useState(true);
  const [isFbModalOpen, setIsFbModalOpen] = useState(false);
  const [fbConfig, setFbConfig] = useState({ connected: false, pageId: '', accountName: 'Zavela Store Colombia' });

  const fetchFbStatus = async () => {
    try {
      const res = await fetch('/api/admin/social/facebook/status');
      const data = await res.json();
      if (data.success && data.data) {
        setFbConfig({ connected: Boolean(data.data.connected), pageId: data.data.pageId || '', accountName: data.data.accountName || '' });
      }
    } catch {}
  };

  useEffect(() => { fetchFbStatus(); }, []);

  // LÓGICA INTELIGENTE DE PROVEEDOR
  const handleProviderChange = (newProvider: 'dropi' | 'derocha' | 'direct' | 'other') => {
    setProvider(newProvider);
    if (newProvider !== 'dropi') {
      setDropiProductId(''); 
    }
  };

  // CÁLCULOS
  const totalOperatingCost = costPrice + (typeof shippingCost === 'number' ? shippingCost : 0) + (typeof dropiFee === 'number' ? dropiFee : 0);
  const realNetProfit = price - totalOperatingCost;
  const realNetMarginPercentage = price > 0 ? ((realNetProfit / price) * 100) : 0;
  const discountPercentage = (compareAtPrice > price) ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

  // LÓGICA AGREGAR VARIANTE AVANZADA
  const handleAddVariant = () => {
    if (!newVarColor.trim()) return alert('Por favor indica al menos el Color o Nombre principal de la variante.');
    
    const color = newVarColor.trim();
    const size = newVarSize.trim() || 'Única';
    const displayName = size !== 'Única' ? `${color} / ${size}` : color;

    const newVariant: ProductVariant = {
      id: `var-${Date.now()}`,
      name: displayName,
      color: color,
      size: size,
      talla: size,
      stock: Number(newVarStock) >= 0 ? Number(newVarStock) : 10,
      price: price,
      dropi_variation_id: newVarDropiId.trim() || undefined,
      sku: newVarSku.trim() || undefined
    };

    setVariants([...variants, newVariant]);
    setNewVarColor('');
    setNewVarSize('Única');
    setNewVarDropiId('');
    setNewVarSku('');
    setNewVarStock(10);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  // GUARDADO SEGURO
  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Ingresa un título.');
    setIsSaving(true);
    
    try {
      const finalShipping = shippingCost === '' ? 0 : Number(shippingCost);
      const finalDropiFee = dropiFee === '' ? 0 : Number(dropiFee);

      const cleanDropiId = provider === 'dropi' ? String(dropiProductId || '').trim() : '';

      const payload = {
        ...(product?.id ? { id: product.id } : {}),
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        categoryId,
        categoryName: categories.find(c => c.id === categoryId)?.name || 'General',
        provider,
        supplier: provider === 'dropi' ? 'Dropi Colombia' : (provider === 'derocha' ? 'DeRocha' : customSupplierName || 'Bodega Directa'),
        dropiProductId: cleanDropiId,
        dropi_product_id: cleanDropiId,
        price, 
        costPrice, 
        compareAtPrice, 
        shippingCost: finalShipping, 
        shipping_cost: finalShipping, 
        flete_envio: finalShipping, 
        flete: finalShipping, 
        estimatedShippingCost: finalShipping,
        dropiFee: finalDropiFee, 
        dropi_fee: finalDropiFee, 
        stock, 
        active, 
        featured,
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
        variants
      };

      const finalSlug = slug.trim() || title.toLowerCase().replace(/[^a-z0-9]/g, '-');

      // 1. MAPA DE PERSISTENCIA DE COSTOS (zavela_custom_costs_v1 en localStorage)
      try {
        const rawMap = localStorage.getItem('zavela_custom_costs_v1');
        const map = rawMap ? JSON.parse(rawMap) : {};
        const costRecord = {
          shippingCost: Number(finalShipping),
          dropiFee: Number(finalDropiFee),
          dropiProductId: String(cleanDropiId || ''),
          provider: String(provider),
          updatedAt: Date.now()
        };

        if (product?.id) {
          map[String(product.id).trim()] = costRecord;
        }
        if (finalSlug) {
          map[String(finalSlug).trim()] = costRecord;
        }
        localStorage.setItem('zavela_custom_costs_v1', JSON.stringify(map));
      } catch (err) {
        console.warn('Error guardando en zavela_custom_costs_v1:', err);
      }

      // Respaldo complementario para compatibilidad
      if (product?.id || finalSlug) {
        saveCustomProductCost(String(product?.id || finalSlug), {
          id: product?.id ? String(product.id) : undefined,
          slug: finalSlug,
          shippingCost: finalShipping,
          dropiFee: finalDropiFee,
          dropiProductId: cleanDropiId,
          provider
        });
      }

      await onSave(payload);
    } catch (err: any) { alert(err.message || 'Error al guardar producto'); } finally { setIsSaving(false); }
  };

  return (
    <form onSubmit={handleSaveClick} className="space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer">
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </button>
          <h2 className="text-base font-black text-slate-900">{isEditing ? 'Modificar Producto' : 'Crear Producto'}</h2>
        </div>
        <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 text-white shadow-xl space-y-4">
            <h3 className="font-extrabold text-sm flex items-center gap-2"><Boxes className="w-4 h-4 text-cyan-400"/> Gestión de Bodega de Origen</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <button type="button" onClick={() => handleProviderChange('dropi')} className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${provider === 'dropi' ? 'bg-cyan-900/50 border-cyan-400 ring-1 ring-cyan-400' : 'bg-slate-800 border-slate-700'}`}>
                <div className="font-black text-xs text-white">⚡ Dropi</div><div className="text-[10px] text-slate-400">Dropshipping</div>
              </button>
              <button type="button" onClick={() => handleProviderChange('derocha')} className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${provider === 'derocha' ? 'bg-amber-900/50 border-amber-400 ring-1 ring-amber-400' : 'bg-slate-800 border-slate-700'}`}>
                <div className="font-black text-xs text-white">📦 DeRocha</div><div className="text-[10px] text-slate-400">Bodega Local</div>
              </button>
              <button type="button" onClick={() => handleProviderChange('direct')} className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${provider === 'direct' ? 'bg-emerald-900/50 border-emerald-400 ring-1 ring-emerald-400' : 'bg-slate-800 border-slate-700'}`}>
                <div className="font-black text-xs text-white">🏭 Propio</div><div className="text-[10px] text-slate-400">Bodega Directa</div>
              </button>
              <button type="button" onClick={() => handleProviderChange('other')} className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${provider === 'other' ? 'bg-purple-900/50 border-purple-400 ring-1 ring-purple-400' : 'bg-slate-800 border-slate-700'}`}>
                <div className="font-black text-xs text-white">🏷️ Otro</div><div className="text-[10px] text-slate-400">Independiente</div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800">
              <div className={`p-3 rounded-xl border transition-all ${provider === 'dropi' ? 'bg-slate-950 border-cyan-500/50' : 'bg-slate-950/50 border-slate-800 opacity-50'}`}>
                <label className="block text-xs font-bold text-slate-300 mb-1">ID Dropi</label>
                <input type="text" disabled={provider !== 'dropi'} value={dropiProductId} onChange={(e) => setDropiProductId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs outline-none disabled:cursor-not-allowed" placeholder={provider === 'dropi' ? "Ej. 2240082" : "Solo para Dropi"} />
              </div>
              <div className={`p-3 rounded-xl border transition-all ${provider === 'dropi' ? 'bg-slate-950 border-amber-500/50' : 'bg-slate-950/50 border-slate-800 opacity-50'}`}>
                <label className="block text-xs font-bold text-slate-300 mb-1">Comisión Dropi (\$)</label>
                <input 
                  type="number" 
                  disabled={provider !== 'dropi'} 
                  value={dropiFee} 
                  onChange={(e) => setDropiFee(e.target.value === '' ? '' : Number(e.target.value))} 
                  className="w-full bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs outline-none disabled:cursor-not-allowed font-bold text-amber-500" 
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm">Datos del Producto</h3>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Título Completo *</label><input type="text" value={title} onChange={(e) => { setTitle(e.target.value); if(!isEditing) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')); }} className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-cyan-500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-cyan-500">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Slug URL</label><input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none" /></div>
            </div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Descripción Corta</label><textarea rows={2} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-cyan-500" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Descripción Completa</label><textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-cyan-500" /></div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm flex items-center gap-2"><Calculator className="w-4 h-4 text-cyan-600"/> Estructura de Precios y Fletes</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Costo Proveedor</label>
                <input type="number" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} className="w-full p-2 text-xs border border-slate-300 rounded-lg outline-none font-bold" />
              </div>
              <div className="bg-sky-50 p-3 rounded-xl border border-sky-200">
                <label className="block text-xs font-bold text-sky-900 mb-1">Flete de Envío (Predet: \$0)</label>
                <input type="number" value={shippingCost} onChange={(e) => setShippingCost(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 text-xs border border-sky-300 rounded-lg outline-none font-bold text-sky-900" placeholder="0" />
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <label className="block text-xs font-bold text-emerald-900 mb-1">Precio Venta Cliente</label>
                <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full p-2 text-xs border border-emerald-300 rounded-lg outline-none font-black text-emerald-900" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Precio Tachado (Para mostrar dto)</label><input type="number" value={compareAtPrice} onChange={(e) => setCompareAtPrice(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-xl text-xs line-through text-slate-500" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Descuento Mostrado</label><div className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">{discountPercentage}% OFF</div></div>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${realNetProfit > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              <div>
                <div className="font-black text-sm">Rentabilidad Neta: {formatCOP(realNetProfit)}</div>
                <div className="text-xs opacity-80">Margen real del {Math.round(realNetMarginPercentage)}% por unidad vendida</div>
              </div>
              {realNetProfit > 0 ? <CheckCircle2 className="w-6 h-6 text-emerald-500"/> : <AlertTriangle className="w-6 h-6 text-rose-500"/>}
            </div>
          </div>

          {/* VARIANTES AVANZADAS RESTAURADAS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>Variantes (Color, Talla, Versión & Dropi)</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {variants.length} {variants.length === 1 ? 'variante' : 'variantes'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Configura las opciones para que la orden se despache de forma exacta.
                </p>
              </div>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Color / Nombre *</label>
                  <input type="text" value={newVarColor} onChange={(e) => setNewVarColor(e.target.value)} placeholder="Ej. Negro" className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Talla</label>
                  <input type="text" value={newVarSize} onChange={(e) => setNewVarSize(e.target.value)} placeholder="Ej. M o Única" className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">ID Variación Dropi</label>
                  <input type="text" value={newVarDropiId} onChange={(e) => setNewVarDropiId(e.target.value)} placeholder="Ej. 142058" className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-cyan-500 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">Stock</label>
                  <input type="number" min="0" value={newVarStock} onChange={(e) => setNewVarStock(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-cyan-500 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">SKU (Opcional)</label>
                  <input type="text" value={newVarSku} onChange={(e) => setNewVarSku(e.target.value)} placeholder="Ej. ZV-NEG-M" className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-cyan-500 font-mono" />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={handleAddVariant} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all">
                  <Plus className="w-4 h-4" /> Agregar Variante
                </button>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {variants.map((v) => (
                  <div key={v.id} className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900">{v.color}</span>
                      <span className="px-2 py-0.5 rounded-md font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 text-[10px]">Talla: {v.size}</span>
                      {v.dropi_variation_id && (
                        <span className="px-2 py-0.5 rounded-md font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 text-[10px]">📦 Dropi ID: #{v.dropi_variation_id}</span>
                      )}
                      <span className="px-2 py-0.5 rounded-md font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 text-[10px]">Stock: {v.stock}</span>
                      {v.sku && <span className="text-slate-400 font-mono text-[10px]">SKU: {v.sku}</span>}
                    </div>
                    <button type="button" onClick={() => handleRemoveVariant(v.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Eliminar variante">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* COLUMNA DERECHA: IMÁGENES Y FACEBOOK */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm">Estado y Publicación</h3>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200"><span className="text-xs font-bold">Activar en Tienda</span><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 cursor-pointer" /></div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200"><span className="text-xs font-bold">Destacar en Home</span><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="w-4 h-4 cursor-pointer" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Stock General</label><input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-xl text-xs" /></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm flex justify-between">Imágenes <span className="text-cyan-600">{images.length}</span></h3>
            <div className="flex gap-2">
              <input type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Pegar URL de Dropi..." className="flex-1 p-2 text-xs border border-slate-200 rounded-xl outline-none" />
              <button type="button" onClick={() => { if(newImageUrl) { setImages([...images, newImageUrl]); setNewImageUrl(''); } }} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer">Añadir</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className={`relative aspect-square border rounded-xl overflow-hidden group ${idx===0 ? 'ring-2 ring-cyan-500':''}`}>
                  <img src={img} alt="Prod" className="w-full h-full object-cover" />
                  {idx !== 0 && <button type="button" onClick={() => { const cp=[...images]; const [s]=cp.splice(idx,1); cp.unshift(s); setImages(cp); }} className="absolute top-1 left-1 bg-amber-400 text-black text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 cursor-pointer">Portada</button>}
                  <button type="button" onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Trash2 className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1877F2]/10 p-5 rounded-2xl border border-blue-200 space-y-3">
            <div className="flex justify-between items-center"><h3 className="font-black text-sm text-[#1877F2]">Facebook Page</h3><button type="button" onClick={()=>setIsFbModalOpen(true)} className="text-[10px] bg-white px-2 py-1 rounded-md border cursor-pointer">{fbConfig.connected ? 'Conectado' : 'Conectar'}</button></div>
            <div className="flex items-center justify-between text-xs font-bold"><span>Auto-Publicar al Guardar</span><input type="checkbox" checked={publishToFacebook} onChange={(e) => setPublishToFacebook(e.target.checked)} className="w-4 h-4 cursor-pointer" /></div>
          </div>
        </div>
      </div>
      <FacebookPageConnectModal isOpen={isFbModalOpen} onClose={() => setIsFbModalOpen(false)} onConnected={fetchFbStatus} />
    </form>
  );
};
