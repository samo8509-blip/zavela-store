import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Save, Building2, Package, DollarSign, TrendingUp, AlertTriangle, 
  CheckCircle2, AlertCircle, Plus, Trash2, Image as ImageIcon, Sparkles, 
  Layers, Check, RefreshCw, X, Boxes
} from 'lucide-react';
import { Product, Category, ProductVariant } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { saveCustomProductCost, getCustomProductCost } from '../../services/cpanelProducts.ts';

// 🛡️ FUNCIÓN BLINDADA DEFINITIVA PARA NÚMEROS EN COP 🛡️
function parseNumCOP(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  let str = String(val).trim();
  
  // 1. Eliminar signo pesos y espacios
  str = str.replace(/[\$\s]/g, '');
  
  // 2. Si tiene decimales (.00 o ,00), eliminarlos por completo
  if (str.includes('.') && str.split('.').pop()?.length === 2) {
      str = str.substring(0, str.lastIndexOf('.'));
  } else if (str.includes(',') && str.split(',').pop()?.length === 2) {
      str = str.substring(0, str.lastIndexOf(','));
  }
  
  // 3. Eliminar CUALQUIER otro caracter que no sea dígito o signo negativo (esto borra los puntos de miles)
  str = str.replace(/[^\d-]/g, '');
  
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

export interface AdminProductEditorProps {
  product?: Product | null;
  categories: Category[];
  onSave?: (productData: Partial<Product>) => Promise<void>;
  onCancel: () => void;
}

export type WarehouseProvider = '' | 'dropi' | 'derocha' | 'propio' | 'otro';

export interface ProductFormData {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  categoryName: string;
  provider: WarehouseProvider | string;
  supplier: string;
  dropiId: string;
  comisionDropi: number;
  costoProveedor: number;
  fleteEnvio: number;
  precio: number;
  compareAtPrice: number;
  stock: number;
  active: boolean;
  featured: boolean;
  images: string[];
  variants: ProductVariant[];
}

export const AdminProductEditor: React.FC<AdminProductEditorProps> = ({
  product,
  categories,
  onSave,
  onCancel
}) => {

  // DESTRUCTOR DE CACHÉ TÓXICA: Elimina el localStorage viejo para que siempre lea de la Base de Datos
  useEffect(() => {
    try {
      localStorage.removeItem('zavela_custom_costs_v1');
    } catch (e) {
      // Silencioso
    }
  }, []);

  const getEmptyInitialState = (): ProductFormData => ({
    id: '', title: '', slug: '', description: '', shortDescription: '',
    categoryId: categories[0]?.id || '', categoryName: categories[0]?.name || 'General',
    provider: '', supplier: '', dropiId: '', comisionDropi: 0, costoProveedor: 0,
    fleteEnvio: 0, precio: 0, compareAtPrice: 0, stock: 0, active: true, featured: false,
    images: [], variants: []
  });

  const mapProductToFormData = (prod: any | null | undefined, cats: Category[]): ProductFormData => {
    if (!prod || (!prod.id && !prod.title && !prod.nombre)) return getEmptyInitialState();

    const pId = String(prod.id || prod.productId || '').trim();
    const pSlug = String(prod.slug || '').trim();
    
    const title = String(prod.nombre || prod.title || '').trim();
    const description = String(prod.descripcion || prod.description || '').trim();
    const shortDescription = String(prod.shortDescription || prod.resumen || '').trim();
    const mainImage = String(prod.imagen || prod.image || '').trim();
    
    let imagesList: string[] = [];
    if (Array.isArray(prod.images) && prod.images.length > 0) {
      imagesList = prod.images.filter(Boolean);
    } else if (Array.isArray(prod.imagenes) && prod.imagenes.length > 0) {
      imagesList = prod.imagenes.filter(Boolean);
    } else if (typeof prod.imagenes === 'string' && prod.imagenes.trim()) {
      try {
        const parsed = JSON.parse(prod.imagenes);
        if (Array.isArray(parsed)) imagesList = parsed;
      } catch {
        imagesList = [prod.imagenes];
      }
    } else if (mainImage) {
      imagesList = [mainImage];
    }

    // Extracción pura y blindada directamente desde la base de datos
    const precio = parseNumCOP(prod.precio ?? prod.price);
    const stock = parseNumCOP(prod.stock ?? prod.inventario);
    
    const rawProvider = String(prod.provider || prod.proveedor || '').toLowerCase().trim();
    let mappedProvider: WarehouseProvider | string = '';
    if (rawProvider.includes('dropi')) mappedProvider = 'dropi';
    else if (rawProvider.includes('derocha')) mappedProvider = 'derocha';
    else if (rawProvider.includes('propio') || rawProvider.includes('direct')) mappedProvider = 'propio';
    else if (rawProvider.includes('otro') || rawProvider.includes('other')) mappedProvider = 'otro';
    else if (rawProvider) mappedProvider = rawProvider;
    else if (prod.dropi_product_id || prod.dropiProductId) mappedProvider = 'dropi';
    else if (prod.id) mappedProvider = 'derocha';

    const dropiId = String(prod.dropi_product_id || prod.dropiProductId || prod.dropiId || '').trim();
    
    // ⚠️ LECTURA DIRECTA Y EXHAUSTIVA DE FLETE Y COMISIÓN ⚠️
    // Usa '??' para respetar el 0 si ese es el valor real en la BD
    const comisionDropi = parseNumCOP(
      prod.dropi_fee ?? 
      prod.dropiFee ?? 
      prod.comisionDropi ?? 
      prod.comision ?? 
      0
    );

    const fleteEnvio = parseNumCOP(
      prod.shipping_cost ?? 
      prod.flete_envio ?? 
      prod.flete ?? 
      prod.shippingCost ?? 
      prod.estimatedShippingCost ?? 
      prod.fleteEnvio ?? 
      0
    );

    let variantsList: ProductVariant[] = [];
    const rawVars = prod.variants || prod.variantes;
    if (Array.isArray(rawVars) && rawVars.length > 0) {
      variantsList = rawVars;
    } else if (typeof rawVars === 'string' && rawVars.trim()) {
      try {
        let parsed = JSON.parse(rawVars);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed); 
        if (Array.isArray(parsed)) variantsList = parsed;
      } catch (err) {
        console.error("Error interpretando variantes:", err);
      }
    }

    const costoProveedor = parseNumCOP(prod.costo ?? prod.costPrice ?? prod.supplier_cost);
    const compareAtPrice = parseNumCOP(prod.compareAtPrice ?? prod.suggested_price);
    const categoryId = String(prod.categoryId || prod.category_id || cats[0]?.id || '');
    const categoryName = String(prod.categoryName || prod.categoria || cats.find(c => c.id === categoryId)?.name || 'General');

    return {
      id: pId, title, slug: pSlug || (title ? title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-') : ''),
      description, shortDescription, categoryId, categoryName, provider: mappedProvider,
      supplier: String(prod.supplier || (mappedProvider === 'dropi' ? 'Dropi Colombia' : (mappedProvider === 'derocha' ? 'DeRocha' : 'Bodega Propia'))),
      dropiId, comisionDropi, costoProveedor, fleteEnvio, precio, compareAtPrice, stock,
      active: prod.active !== false, featured: Boolean(prod.featured), images: imagesList, variants: variantsList
    };
  };

  const initialData = useMemo(() => mapProductToFormData(product, categories), [product, categories]);
  const [formData, setFormData] = useState<ProductFormData>(initialData);

  const [shippingCost, setShippingCost] = useState<number>(() => parseNumCOP(initialData.fleteEnvio));
  const [dropiFee, setDropiFee] = useState<number>(() => parseNumCOP(initialData.comisionDropi));

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newVarColor, setNewVarColor] = useState<string>('');
  const [newVarSize, setNewVarSize] = useState<string>('Única');
  const [newVarDropiId, setNewVarDropiId] = useState<string>('');
  const [newVarStock, setNewVarStock] = useState<number>(0);
  const [newVarSku, setNewVarSku] = useState<string>('');

  useEffect(() => {
    if (product && (product.id || (product as any).nombre || product.title)) {
      const mapped = mapProductToFormData(product, categories);
      setFormData(mapped);
      setShippingCost(parseNumCOP(mapped.fleteEnvio));
      setDropiFee(parseNumCOP(mapped.comisionDropi));
      return;
    }

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlId = searchParams?.get('id') || searchParams?.get('productId') || searchParams?.get('editId') || '';

    if (urlId) {
      setIsLoading(true);
      fetch(`/api/products.php?id=${encodeURIComponent(urlId)}`)
        .then(res => res.json())
        .then(data => {
          const item = data.data || data.product || (data.id ? data : null);
          if (item) {
            const mapped = mapProductToFormData(item, categories);
            setFormData(mapped);
            setShippingCost(parseNumCOP(mapped.fleteEnvio));
            setDropiFee(parseNumCOP(mapped.comisionDropi));
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setFormData(getEmptyInitialState());
      setShippingCost(0);
      setDropiFee(0);
    }
  }, [product, categories]);

  const handleSelectBodega = (selected: 'dropi' | 'derocha' | 'propio' | 'otro') => {
    setValidationAlert(null);
    const isDropi = selected === 'dropi';
    if (!isDropi) setDropiFee(0);
    setFormData(prev => ({
      ...prev, provider: selected, dropiId: isDropi ? prev.dropiId : '', comisionDropi: isDropi ? prev.comisionDropi : 0,
      supplier: isDropi ? 'Dropi Colombia' : (selected === 'derocha' ? 'DeRocha' : (selected === 'propio' ? 'Bodega Propia' : 'Proveedor Externo')),
    }));
  };

  const costoProveedor = parseNumCOP(formData.costoProveedor);
  const fleteEnvio = parseNumCOP(shippingCost);
  const comisionDropi = formData.provider === 'dropi' ? parseNumCOP(dropiFee) : 0;
  const precioVenta = parseNumCOP(formData.precio);
  const costoTotalOperativo = costoProveedor + fleteEnvio + comisionDropi;
  const rentabilidadNetaReal = precioVenta - (costoProveedor + fleteEnvio + comisionDropi);

  const calcularPrecioParaMargen = (porcentajeMargen: number): number => {
    if (costoTotalOperativo <= 0) return 0;
    const factor = 1 - (porcentajeMargen / 100);
    if (factor <= 0) return costoTotalOperativo;
    return Math.ceil((costoTotalOperativo / factor) / 500) * 500;
  };

  const precioSugerido20 = useMemo(() => calcularPrecioParaMargen(20), [costoTotalOperativo]);
  const precioSugerido30 = useMemo(() => calcularPrecioParaMargen(30), [costoTotalOperativo]);
  const precioSugerido40 = useMemo(() => calcularPrecioParaMargen(40), [costoTotalOperativo]);

  const aplicarPrecioSugerido = (nuevoPrecio: number) => {
    if (nuevoPrecio <= 0) return;
    setFormData(prev => ({
      ...prev, precio: nuevoPrecio,
      compareAtPrice: prev.compareAtPrice > nuevoPrecio ? prev.compareAtPrice : Math.ceil((nuevoPrecio * 1.3) / 500) * 500
    }));
  };

  const validateForm = (): string | null => {
    if (!String(formData.title || '').trim()) return 'Alto: El campo Título está vacío o en 0';
    if (isNaN(parseNumCOP(formData.precio)) || parseNumCOP(formData.precio) <= 0) return 'Alto: El campo Precio Venta Cliente está vacío o en 0';
    if (!formData.provider || String(formData.provider).trim() === '') return 'Alto: El campo Bodega de Origen está vacío o en 0';
    if (!formData.categoryId || String(formData.categoryId).trim() === '') return 'Alto: El campo Categoría está vacío o en 0';
    if (formData.provider === 'dropi' && (!formData.dropiId || String(formData.dropiId).trim() === '')) return 'Alto: El campo ID Dropi está vacío o en 0';
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationAlert(null);

    const errorMsg = validateForm();
    if (errorMsg) {
      setValidationAlert(errorMsg);
      alert(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = Boolean(formData.id || product?.id);
      const targetId = formData.id || product?.id || `prod-${Date.now()}`;
      const finalTitle = formData.title.trim();
      const finalSlug = formData.slug.trim() || finalTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const mainImage = formData.images[0] || '';
      const dropiProductId = String(formData.dropiId || (product as any)?.dropi_product_id || (product as any)?.dropiProductId || '');
      const provider = String(formData.provider || 'derocha');

      const fleteReal = parseNumCOP(shippingCost || formData.fleteEnvio);
      const comisionReal = parseNumCOP(dropiFee || formData.comisionDropi);
      const costoProvReal = parseNumCOP(formData.costoProveedor);
      const precioFinal = parseNumCOP(formData.precio);

      const payload = {
        ...formData,
        id: targetId || formData.id || '',
        nombre: finalTitle || formData.title || '',
        title: finalTitle,
        name: finalTitle,
        precio: precioFinal,
        price: precioFinal,
        stock: parseNumCOP(formData.stock),
        descripcion: formData.description || '',
        description: formData.description || '',
        shortDescription: formData.shortDescription || '',
        imagen: mainImage || formData.images[0] || '',
        image: mainImage || formData.images[0] || '',
        images: formData.images.length > 0 ? formData.images : (mainImage ? [mainImage] : []),
        imagenes: formData.images.length > 0 ? formData.images : (mainImage ? [mainImage] : []),
        variants: formData.variants || [],
        
        shippingCost: fleteReal,
        shipping_cost: fleteReal,
        flete: fleteReal,
        flete_envio: fleteReal,
        estimatedShippingCost: fleteReal,
        fleteEnvio: fleteReal,
        
        dropiFee: comisionReal,
        dropi_fee: comisionReal,
        comisionDropi: comisionReal,
        
        costo: costoProvReal,
        costPrice: costoProvReal,
        supplier_cost: costoProvReal,
        costoProveedor: costoProvReal,
        
        dropiProductId: String(dropiProductId || formData.dropiId || ""),
        dropi_product_id: String(dropiProductId || formData.dropiId || ""),
        
        provider: String(provider),
        supplier: String(formData.supplier || provider),
        
        compareAtPrice: parseNumCOP(formData.compareAtPrice),
        compare_price: parseNumCOP(formData.compareAtPrice),
        suggested_price: parseNumCOP(formData.compareAtPrice),
        
        slug: finalSlug,
        categoryId: formData.categoryId || '',
        categoryName: categories.find(c => c.id === formData.categoryId)?.name || formData.categoryName || 'General',
        categoria: categories.find(c => c.id === formData.categoryId)?.name || formData.categoryName || 'General',
        active: Boolean(formData.active),
        featured: Boolean(formData.featured)
      };

      if (onSave) {
        await onSave(payload as any);
        setSaveSuccess(true);
        alert('Producto guardado correctamente');
      } else {
        const apiPhpEndpoint = formData.id ? `/api.php?id=${encodeURIComponent(targetId)}` : '/api.php';
        await fetch(apiPhpEndpoint, {
          method: formData.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        setSaveSuccess(true);
        alert('Producto guardado correctamente en la base de datos');
        setTimeout(() => { onCancel(); }, 500);
      }

    } catch (err: any) {
      console.error('Error durante el guardado:', err);
      alert('Error guardando producto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setFormData(prev => ({ ...prev, images: [...prev.images, newImageUrl.trim()] }));
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleAddVariant = () => {
    if (!newVarColor.trim()) { alert('Por favor especifica el Color o Nombre distintivo.'); return; }
    const color = newVarColor.trim();
    const size = newVarSize.trim() || 'Única';
    const name = size !== 'Única' ? `${color} / ${size}` : color;

    const newVariant: ProductVariant = {
      id: `var-${Date.now()}`, name, color, size, talla: size,
      stock: parseNumCOP(newVarStock) >= 0 ? parseNumCOP(newVarStock) : 0,
      price: parseNumCOP(formData.precio),
      dropi_variation_id: newVarDropiId.trim() || undefined,
      sku: newVarSku.trim() || undefined
    };

    setFormData(prev => ({ ...prev, variants: [...prev.variants, newVariant] }));
    setNewVarColor(''); setNewVarSize('Única'); setNewVarDropiId(''); setNewVarStock(0); setNewVarSku('');
  };

  const handleRemoveVariant = (variantId: string) => {
    setFormData(prev => ({ ...prev, variants: prev.variants.filter(v => v.id !== variantId) }));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <h3 className="text-lg font-black text-slate-800">Cargando datos del producto...</h3>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Barra Superior */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95" title="Volver al catálogo">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                {formData.id ? `EDITANDO ID: ${formData.id}` : 'NUEVO REGISTRO'}
              </span>
              {formData.provider && (
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-900 text-white">
                  Bodega: {formData.provider}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {formData.id ? 'Editor Maestro de Producto' : 'Crear Nuevo Producto'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button type="button" onClick={onCancel} className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50">
            {isSaving ? (<><RefreshCw className="w-4 h-4 animate-spin" /><span>Guardando...</span></>) : (<><Save className="w-4 h-4" /><span>Guardar Cambios</span></>)}
          </button>
        </div>
      </div>

      {validationAlert && (
        <div className="bg-rose-50 border-2 border-rose-400 text-rose-900 p-4 rounded-2xl shadow-sm flex items-start gap-3 animate-headShake">
          <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-black text-sm uppercase tracking-wide text-rose-800">Atención requerida</h4>
            <p className="text-sm font-bold mt-0.5">{validationAlert}</p>
          </div>
          <button type="button" onClick={() => setValidationAlert(null)} className="text-rose-400 hover:text-rose-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 p-4 rounded-2xl shadow-sm flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <p className="text-sm font-black">Producto guardado correctamente en la base de datos.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* FASE 1: BODEGAS */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-black text-slate-900">1. Seleccionar Bodega de Origen</h2>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {formData.provider ? `Seleccionada: ${formData.provider}` : 'Requerido'}
            </span>
          </div>

          <p className="text-sm text-slate-600">Selecciona la bodega proveedora para calcular el flete y la comisión:</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <button type="button" onClick={() => handleSelectBodega('dropi')} className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-center group ${formData.provider === 'dropi' ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400/30' : 'border-slate-200 hover:border-amber-300 bg-white hover:bg-amber-50/30'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 font-black text-base transition-transform group-hover:scale-105 ${formData.provider === 'dropi' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'}`}>D</div>
              <span className="font-black text-slate-900 text-sm">Dropi</span>
              <span className="text-[11px] text-amber-700 font-semibold mt-0.5">Dropi Colombia</span>
              {formData.provider === 'dropi' && <span className="absolute top-2 right-2 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center"><Check className="w-3.5 h-3.5 stroke-3" /></span>}
            </button>
            <button type="button" onClick={() => handleSelectBodega('derocha')} className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-center group ${formData.provider === 'derocha' ? 'border-blue-500 bg-blue-50/80 shadow-md ring-2 ring-blue-400/30' : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/30'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 font-black text-base transition-transform group-hover:scale-105 ${formData.provider === 'derocha' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}>R</div>
              <span className="font-black text-slate-900 text-sm">DeRocha</span>
              <span className="text-[11px] text-blue-700 font-semibold mt-0.5">Bodega DeRocha</span>
              {formData.provider === 'derocha' && <span className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center"><Check className="w-3.5 h-3.5 stroke-3" /></span>}
            </button>
            <button type="button" onClick={() => handleSelectBodega('propio')} className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-center group ${formData.provider === 'propio' ? 'border-emerald-500 bg-emerald-50/80 shadow-md ring-2 ring-emerald-400/30' : 'border-slate-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/30'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 font-black text-base transition-transform group-hover:scale-105 ${formData.provider === 'propio' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}><Boxes className="w-5 h-5" /></div>
              <span className="font-black text-slate-900 text-sm">Propio</span>
              <span className="text-[11px] text-emerald-700 font-semibold mt-0.5">Inventario Directo</span>
              {formData.provider === 'propio' && <span className="absolute top-2 right-2 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center"><Check className="w-3.5 h-3.5 stroke-3" /></span>}
            </button>
            <button type="button" onClick={() => handleSelectBodega('otro')} className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-center group ${formData.provider === 'otro' ? 'border-purple-500 bg-purple-50/80 shadow-md ring-2 ring-purple-400/30' : 'border-slate-200 hover:border-purple-300 bg-white hover:bg-purple-50/30'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 font-black text-base transition-transform group-hover:scale-105 ${formData.provider === 'otro' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'}`}><Package className="w-5 h-5" /></div>
              <span className="font-black text-slate-900 text-sm">Otro</span>
              <span className="text-[11px] text-purple-700 font-semibold mt-0.5">Proveedor Externo</span>
              {formData.provider === 'otro' && <span className="absolute top-2 right-2 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center"><Check className="w-3.5 h-3.5 stroke-3" /></span>}
            </button>
          </div>

          {formData.provider === 'dropi' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" /> Parámetros de Integración Dropi Colombia
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID Dropi <span className="text-rose-500">*</span></label>
                  <input type="text" required placeholder="Ej. 138402 o ID del producto en Dropi" value={formData.dropiId} onChange={(e) => setFormData(prev => ({ ...prev, dropiId: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white font-mono text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Comisión Dropi (\$ COP)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                    <input type="text" placeholder="0" value={dropiFee === 0 ? '' : dropiFee} onChange={(e) => { const val = parseNumCOP(e.target.value); setDropiFee(val); setFormData(prev => ({ ...prev, comisionDropi: val })); }} className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-amber-300 bg-white font-mono text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {formData.provider === '' ? (
          <div className="bg-amber-50/90 border-2 border-dashed border-amber-300 rounded-3xl p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto"><AlertCircle className="w-6 h-6 animate-pulse" /></div>
            <h3 className="text-lg font-black text-amber-900">Por favor selecciona una bodega de origen para continuar</h3>
          </div>
        ) : (
          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-600" /><h2 className="text-lg font-black text-slate-900">2. Costos, Precios y Calculadora de Rentabilidad</h2></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Costo Proveedor (\$ COP)</label>
                <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span><input type="text" placeholder="0" value={formData.costoProveedor === 0 ? '' : formData.costoProveedor} onChange={(e) => setFormData(prev => ({ ...prev, costoProveedor: parseNumCOP(e.target.value) }))} className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" /></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Flete de Envío (\$ COP)</label>
                <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span><input type="text" placeholder="0" value={shippingCost === 0 ? '' : shippingCost} onChange={(e) => { const val = parseNumCOP(e.target.value); setShippingCost(val); setFormData(prev => ({ ...prev, fleteEnvio: val })); }} className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" /></div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Costo Operativo Base</span>
                <span className="text-lg font-black text-slate-800 font-mono mt-0.5">{formatCOP(costoTotalOperativo)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Precio Venta Cliente (\$ COP) <span className="text-rose-500">*</span></label>
                <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600 font-black text-base">$</span><input type="text" required placeholder="0" value={formData.precio === 0 ? '' : formData.precio} onChange={(e) => setFormData(prev => ({ ...prev, precio: parseNumCOP(e.target.value) }))} className="w-full pl-9 pr-3.5 py-3 rounded-2xl border-2 border-indigo-500 bg-white font-mono text-base font-black text-indigo-950 focus:ring-2 focus:ring-indigo-400 focus:outline-none shadow-xs" /></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Precio Antes / Tachado (\$ COP)</label>
                <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span><input type="text" placeholder="0" value={formData.compareAtPrice === 0 ? '' : formData.compareAtPrice} onChange={(e) => setFormData(prev => ({ ...prev, compareAtPrice: parseNumCOP(e.target.value) }))} className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" /></div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" /> Recomendaciones de Ganancia</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button type="button" onClick={() => aplicarPrecioSugerido(precioSugerido20)} disabled={costoTotalOperativo <= 0} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 transition-all shadow-2xs group disabled:opacity-50"><span className="text-xs font-extrabold text-slate-700">Ganancia 20%</span><span className="text-sm font-black text-emerald-600 font-mono mt-0.5">{formatCOP(precioSugerido20)}</span></button>
                <button type="button" onClick={() => aplicarPrecioSugerido(precioSugerido30)} disabled={costoTotalOperativo <= 0} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 transition-all shadow-2xs group disabled:opacity-50"><span className="text-xs font-extrabold text-slate-700">Ganancia 30%</span><span className="text-sm font-black text-indigo-600 font-mono mt-0.5">{formatCOP(precioSugerido30)}</span></button>
                <button type="button" onClick={() => aplicarPrecioSugerido(precioSugerido40)} disabled={costoTotalOperativo <= 0} className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition-all shadow-2xs group disabled:opacity-50"><span className="text-xs font-extrabold text-slate-700">Ganancia 40%</span><span className="text-sm font-black text-amber-600 font-mono mt-0.5">{formatCOP(precioSugerido40)}</span></button>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${rentabilidadNetaReal > 0 ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' : (precioVenta > 0 ? 'bg-rose-50/80 border-rose-300 text-rose-950' : 'bg-slate-50 border-slate-200 text-slate-700')}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {rentabilidadNetaReal > 0 ? <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className={`w-5 h-5 shrink-0 ${precioVenta > 0 ? 'text-rose-600' : 'text-slate-400'}`} />}
                  <div><span className="text-xs font-bold uppercase tracking-wider block opacity-75">Rentabilidad Neta Real</span></div>
                </div>
                <div className="text-left sm:text-right">
                  <div className={`text-xl font-black font-mono ${rentabilidadNetaReal > 0 ? 'text-emerald-700' : (rentabilidadNetaReal < 0 ? 'text-rose-700' : 'text-slate-700')}`}>
                    {rentabilidadNetaReal > 0 ? `+${formatCOP(rentabilidadNetaReal)}` : formatCOP(rentabilidadNetaReal)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100"><Package className="w-5 h-5 text-indigo-600" /><h2 className="text-lg font-black text-slate-900">3. Información del Producto</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Título del Producto <span className="text-rose-500">*</span></label>
              <input type="text" required value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Slug</label>
              <input type="text" value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Categoría <span className="text-rose-500">*</span></label>
              <select required value={formData.categoryId} onChange={(e) => { const selCat = categories.find(c => c.id === e.target.value); setFormData(prev => ({ ...prev, categoryId: e.target.value, categoryName: selCat?.name || prev.categoryName })); }} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Selecciona una categoría</option>
                {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Descripción Completa</label>
              <textarea rows={4} value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100"><Layers className="w-5 h-5 text-indigo-600" /><h2 className="text-lg font-black text-slate-900">4. Inventario, Imágenes y Variantes</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Stock</label>
              <input type="text" placeholder="0" value={formData.stock === 0 ? '' : formData.stock} onChange={(e) => setFormData(prev => ({ ...prev, stock: parseNumCOP(e.target.value) }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={formData.active} onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                <span className="ml-3 text-xs font-bold text-slate-700">Producto Activo</span>
              </label>
            </div>
            <div className="flex items-center gap-3 pt-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                <span className="ml-3 text-xs font-bold text-slate-700">Destacado</span>
              </label>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-slate-700">Galería de Imágenes</label>
            <div className="flex gap-2">
              <input type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500" />
              <button type="button" onClick={handleAddImage} className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"><Plus className="w-4 h-4 inline" /> Agregar</button>
            </div>
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                    <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Variantes (Color, Talla, SKU)</label>
              <span className="text-[11px] text-slate-400">{formData.variants.length} variantes registradas</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Color / Nombre</label>
                <input type="text" placeholder="Negro, Rojo..." value={newVarColor} onChange={(e) => setNewVarColor(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Talla / Tamaño</label>
                <input type="text" placeholder="Única, M, L..." value={newVarSize} onChange={(e) => setNewVarSize(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Stock</label>
                <input type="text" placeholder="0" value={newVarStock === 0 ? '' : newVarStock} onChange={(e) => setNewVarStock(parseNumCOP(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">ID Dropi Var.</label>
                <input type="text" placeholder="Opcional" value={newVarDropiId} onChange={(e) => setNewVarDropiId(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none font-mono" />
              </div>
              <button type="button" onClick={handleAddVariant} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1 h-[34px]"><Plus className="w-3.5 h-3.5" /> Agregar</button>
            </div>

            {formData.variants.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {formData.variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{v.name}</span>
                      {v.color && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{v.color}</span>}
                      {v.size && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{v.size}</span>}
                      {v.dropi_variation_id && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">Dropi: {v.dropi_variation_id}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500">Stock: {v.stock}</span>
                      <button type="button" onClick={() => handleRemoveVariant(v.id)} className="p-1 text-rose-500 hover:text-rose-700" title="Eliminar variante"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="px-5 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-100">Cancelar</button>
          <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-indigo-600 text-white font-extrabold shadow-lg disabled:opacity-50">
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};
