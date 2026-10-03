import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  DollarSign, 
  TrendingUp, 
  Tag, 
  ShieldCheck, 
  ArrowLeft, 
  Save, 
  Layers, 
  Check, 
  X,
  Sparkles,
  Percent,
  Upload,
  RefreshCw,
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  FolderOpen,
  Share2,
  Calculator,
  Truck,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Zap,
  HelpCircle,
  Info,
  ArrowRight
} from 'lucide-react';
import { Product, Category, ProductVariant } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { compressImageFile } from '../../utils/imageUtils.ts';
import { uploadProductImageToStorage } from '../../services/firestoreProducts.ts';

export interface AdminProductEditorProps {
  product: Product | null;
  categories: Category[];
  onSave: (productData: Partial<Product>) => Promise<void>;
  onCancel: () => void;
}

export const AdminProductEditor: React.FC<AdminProductEditorProps> = ({
  product,
  categories,
  onSave,
  onCancel
}) => {
  const isEditing = Boolean(product?.id);

  const [title, setTitle] = useState(product?.title || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription || '');
  const [description, setDescription] = useState(product?.description || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || '');
  const [brand, setBrand] = useState(product?.brand || 'Zavela Store');
  const [warehouseCity, setWarehouseCity] = useState(product?.warehouseCity || 'Bogotá D.C.');
  const [dropiProductId, setDropiProductId] = useState<string>(
    product?.dropi_product_id ? String(product.dropi_product_id) : (product?.dropiProductId ? String(product.dropiProductId) : '')
  );
  
  // Financials & Dropi Operational Costs
  const [costPrice, setCostPrice] = useState<number>(product?.costPrice || 45000);
  const [estimatedShippingCost, setEstimatedShippingCost] = useState<number>(
    product?.estimatedShippingCost !== undefined ? product.estimatedShippingCost : 16500
  );
  const [dropiFee, setDropiFee] = useState<number>(
    product?.dropiFee !== undefined ? product.dropiFee : 4000
  );
  const [price, setPrice] = useState<number>(product?.price || 89900);
  const [compareAtPrice, setCompareAtPrice] = useState<number>(product?.compareAtPrice || 119900);
  const [stock, setStock] = useState<number>(product?.stock ?? 25);
  const [weightKg, setWeightKg] = useState<number>(product?.weightKg || 0.5);
  const [active, setActive] = useState<boolean>(product?.active !== false);
  const [featured, setFeatured] = useState<boolean>(Boolean(product?.featured));
  const [warrantyInfo, setWarrantyInfo] = useState(
    product?.warrantyInfo || '30 días de garantía oficial Zavela Store por defectos de fábrica.'
  );

  // Gallery
  const [images, setImages] = useState<string[]>(
    product?.images && product.images.length > 0 
      ? product.images 
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80']
  );
  const [galleryTab, setGalleryTab] = useState<'upload' | 'url'>('upload');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [replacingImageIndex, setReplacingImageIndex] = useState<number | null>(null);
  
  // Replace Modal State
  const [replaceModal, setReplaceModal] = useState<{
    index: number;
    urlInput: string;
  } | null>(null);

  // Quick Cover URL Modal
  const [coverUrlModalOpen, setCoverUrlModalOpen] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState('');

  // Variants
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants || []);
  const [newVarName, setNewVarName] = useState('');
  const [newVarSku, setNewVarSku] = useState('');
  const [newVarStock, setNewVarStock] = useState(10);
  const [newVarPrice, setNewVarPrice] = useState(price);

  // Tags
  const [tags, setTags] = useState<string[]>(product?.tags || ['tendencia', 'calidad', 'contraentrega']);
  const [newTag, setNewTag] = useState('');

  // Social Auto-Publishing
  const [publishToSocial, setPublishToSocial] = useState<boolean>(true);

  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Real-time Dropi & Operational Calculations
  const totalOperatingCost = Number(costPrice || 0) + Number(estimatedShippingCost || 0) + Number(dropiFee || 0);
  const realNetProfit = Number(price || 0) - totalOperatingCost;
  const realNetMarginPercentage = price > 0 ? ((realNetProfit / price) * 100) : 0;
  const markupOnCostPercentage = totalOperatingCost > 0 ? ((realNetProfit / totalOperatingCost) * 100) : 0;

  const grossProfitCOP = price - costPrice;
  const marginPercentage = costPrice > 0 ? ((grossProfitCOP / costPrice) * 100) : 0;
  const discountPercentage = (compareAtPrice && compareAtPrice > price)
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  // Helper functions to auto-suggest sale price based on desired net profit or margin
  const applySuggestedNetProfit = (targetProfitCOP: number) => {
    const calculatedPrice = Math.round((totalOperatingCost + targetProfitCOP) / 100) * 100;
    setPrice(calculatedPrice);
    if (!compareAtPrice || compareAtPrice <= calculatedPrice) {
      setCompareAtPrice(Math.round((calculatedPrice * 1.35) / 100) * 100);
    }
  };

  const applySuggestedMarginPercent = (marginPct: number) => {
    const factor = 1 - (marginPct / 100);
    if (factor <= 0) return;
    const calculatedPrice = Math.round((totalOperatingCost / factor) / 100) * 100;
    setPrice(calculatedPrice);
    if (!compareAtPrice || compareAtPrice <= calculatedPrice) {
      setCompareAtPrice(Math.round((calculatedPrice * 1.35) / 100) * 100);
    }
  };

  const applyMultiplierOnCost = (multiplier: number) => {
    const calculatedPrice = Math.round((costPrice * multiplier) / 100) * 100;
    setPrice(calculatedPrice);
    if (!compareAtPrice || compareAtPrice <= calculatedPrice) {
      setCompareAtPrice(Math.round((calculatedPrice * 1.35) / 100) * 100);
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    
    // Parse single or multiple URLs (separated by newlines, commas, or spaces)
    const rawTokens = newImageUrl
      .split(/[\n,]+/)
      .map(url => url.trim())
      .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/')));

    if (rawTokens.length === 0) {
      // If none had http, but text was entered, check if valid string
      if (newImageUrl.trim().startsWith('http')) {
        setImages([...images, newImageUrl.trim()]);
      } else {
        alert('Por favor ingresa enlaces válidos que comiencen con http:// o https://');
        return;
      }
    } else {
      setImages([...images, ...rawTokens]);
    }

    setNewImageUrl('');
  };

  const processFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    setIsProcessingImages(true);
    try {
      const uploadedUrls = await Promise.all(
        validFiles.map(async (file) => {
          try {
            return await uploadProductImageToStorage(file);
          } catch {
            return await compressImageFile(file);
          }
        })
      );
      setImages(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      alert(err.message || 'Error al procesar y subir las imágenes.');
    } finally {
      setIsProcessingImages(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleReplaceClick = (idx: number) => {
    setReplacingImageIndex(idx);
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || replacingImageIndex === null) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    setIsProcessingImages(true);
    try {
      let finalUrl = '';
      try {
        finalUrl = await uploadProductImageToStorage(file);
      } catch {
        finalUrl = await compressImageFile(file);
      }
      setImages(prev => {
        const copy = [...prev];
        copy[replacingImageIndex] = finalUrl;
        return copy;
      });
    } catch (err: any) {
      alert(err.message || 'Error al reemplazar la imagen.');
    } finally {
      setIsProcessingImages(false);
      setReplacingImageIndex(null);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleReplaceWithUrl = (idx: number, url: string) => {
    if (!url.trim()) return;
    setImages(prev => {
      const copy = [...prev];
      copy[idx] = url.trim();
      return copy;
    });
    setReplaceModal(null);
  };

  const handleSetCoverByUrl = (url: string) => {
    if (!url.trim()) return;
    setImages(prev => {
      const copy = [...prev];
      if (copy.length > 0) {
        copy[0] = url.trim();
      } else {
        copy.push(url.trim());
      }
      return copy;
    });
    setCoverUrlModalOpen(false);
    setCoverUrlInput('');
  };

  const handleSetPrimary = (idx: number) => {
    if (idx === 0) return;
    const copy = [...images];
    const [selected] = copy.splice(idx, 1);
    copy.unshift(selected);
    setImages(copy);
  };

  const handleMoveImage = (idx: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const copy = [...images];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    setImages(copy);
  };

  const handleRemoveImage = (idx: number) => {
    if (images.length === 1) {
      alert('El producto debe tener al menos una imagen.');
      return;
    }
    const copy = [...images];
    copy.splice(idx, 1);
    setImages(copy);
  };

  const handleAddVariant = () => {
    if (!newVarName.trim()) return;
    const newVariant: ProductVariant = {
      id: `var-${Date.now()}`,
      name: newVarName.trim(),
      sku: newVarSku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      stock: newVarStock,
      price: newVarPrice || price
    };
    setVariants([...variants, newVariant]);
    setNewVarName('');
    setNewVarSku('');
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (!tags.includes(newTag.trim().toLowerCase())) {
      setTags([...tags, newTag.trim().toLowerCase()]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(item => item !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor indica un título para el producto.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedCat = categories.find(c => c.id === categoryId);

      const payload: Partial<Product> = {
        ...(product?.id ? { id: product.id } : {}),
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        categoryId: categoryId || categories[0]?.id,
        categoryName: selectedCat?.name || 'General',
        brand: brand.trim() || 'Zavela Store',
        warehouseCity: warehouseCity.trim() || 'Bogotá D.C.',
        dropi_product_id: dropiProductId.trim() || '',
        price,
        costPrice,
        estimatedShippingCost,
        dropiFee,
        totalOperatingCost,
        realNetProfit,
        realNetMarginPercentage: Math.round(realNetMarginPercentage * 10) / 10,
        compareAtPrice,
        discountPercentage,
        marginAmount: grossProfitCOP,
        marginPercentage: Math.round(marginPercentage * 10) / 10,
        stock,
        weightKg,
        active,
        featured,
        warrantyInfo,
        images: images.filter(img => Boolean(img && img.trim())),
        variants: variants || [],
        tags: tags || [],
        publishToSocial
      } as any;

      await onSave(payload);
    } catch (err: any) {
      alert(err.message || 'Error al guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Volver al catálogo"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
              {isEditing ? 'MODIFICANDO PRODUCTO' : 'CREANDO NUEVO PRODUCTO'}
            </span>
            <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
              {isEditing ? title || 'Modificar Producto' : 'Crear Producto en Catálogo'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Publicar Producto')}</span>
          </button>
        </div>
      </div>

      {/* ⚡ Mapeo con Dropi Colombia - Ubicado en la parte superior para agilizar el ingreso de datos */}
      <div className="bg-gradient-to-br from-cyan-50/90 via-sky-50/80 to-indigo-50/70 p-6 rounded-3xl border-2 border-cyan-300 shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-cyan-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              DP
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">Mapeo con Dropi Colombia</h3>
                <span className="text-[10px] text-cyan-800 bg-cyan-100 font-bold px-2 py-0.5 rounded-md border border-cyan-300">
                  ⚡ Conexión Directa Dropi
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Ingresa primero el ID de Dropi para vincular el catálogo y automatizar despachos contra entrega
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3.5 py-1 rounded-full border shadow-2xs ${
            dropiProductId 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {dropiProductId ? `✓ Dropi ID: ${dropiProductId}` : '⚠ Sin ID Dropi'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              ID de Producto en Dropi (<code className="font-mono text-cyan-800">dropi_product_id</code>) *
            </label>
            <div className="relative">
              <input
                type="text"
                value={dropiProductId}
                onChange={(e) => setDropiProductId(e.target.value)}
                placeholder="Ej. 2240082 o ID numérico de Dropi Colombia"
                className="w-full pl-3.5 pr-20 py-2.5 text-xs bg-white border border-cyan-300 rounded-xl focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 outline-hidden font-mono font-bold text-slate-900 shadow-xs"
              />
              {dropiProductId && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Listo</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) setDropiProductId(text.trim());
                } catch {
                  // Ignore clipboard read errors
                }
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs shadow-xs cursor-pointer text-center"
              title="Pegar ID copiado desde Dropi"
            >
              📋 Pegar ID
            </button>
            {dropiProductId && (
              <button
                type="button"
                onClick={() => setDropiProductId('')}
                className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs cursor-pointer"
                title="Limpiar ID"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          💡 Este ID vincula automáticamente el producto con la API de Dropi para cotizaciones de flete y despachos contra entrega al presionar <strong>"Revisar y Enviar a Dropi"</strong> en las órdenes.
        </p>
      </div>

      {/* Financial & Profit Margin Live Card */}
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-white space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <Calculator className="w-4 h-4" />
            <span>Calculadora Financiera & Desglose de Rentabilidad Real Dropi Colombia</span>
          </div>
          <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full text-slate-300">
            Ventas Contra Entrega (Flete + Dropi)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold mb-1">
              <span>1. Costo Base</span>
              <Coins className="w-3 h-3 text-slate-500" />
            </div>
            <span className="text-base sm:text-lg font-black text-slate-200">{formatCOP(costPrice)}</span>
            <span className="block text-[9px] text-slate-500 mt-0.5">Proveedor Dropi</span>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold mb-1">
              <span>2. Flete Envío</span>
              <Truck className="w-3 h-3 text-sky-400" />
            </div>
            <span className="text-base sm:text-lg font-black text-sky-300">+{formatCOP(estimatedShippingCost)}</span>
            <span className="block text-[9px] text-slate-500 mt-0.5">Transportadora</span>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold mb-1">
              <span>3. Tarifa Dropi</span>
              <Tag className="w-3 h-3 text-amber-400" />
            </div>
            <span className="text-base sm:text-lg font-black text-amber-300">+{formatCOP(dropiFee)}</span>
            <span className="block text-[9px] text-slate-500 mt-0.5">Plataforma / Recaudo</span>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-cyan-800/60 ring-1 ring-cyan-500/20">
            <div className="flex items-center justify-between text-[10px] text-cyan-300 uppercase font-bold mb-1">
              <span>= Costo Operativo</span>
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
            </div>
            <span className="text-base sm:text-lg font-black text-cyan-300">{formatCOP(totalOperatingCost)}</span>
            <span className="block text-[9px] text-cyan-400/80 mt-0.5">Punto Equilibrio (0%)</span>
          </div>

          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold mb-1">
              <span>Precio Venta</span>
              <DollarSign className="w-3 h-3 text-cyan-400" />
            </div>
            <span className="text-base sm:text-lg font-black text-cyan-400">{formatCOP(price)}</span>
            <span className="block text-[9px] text-slate-500 mt-0.5">Cobro al Cliente</span>
          </div>

          <div className={`p-3.5 rounded-2xl border transition-colors ${
            realNetProfit > 0 
              ? 'bg-emerald-950/50 border-emerald-700/60 ring-1 ring-emerald-500/30' 
              : 'bg-rose-950/50 border-rose-700/60 ring-1 ring-rose-500/30'
          }`}>
            <div className="flex items-center justify-between text-[10px] uppercase font-bold mb-1">
              <span className={realNetProfit > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                Ganancia Real Neta
              </span>
              {realNetProfit > 0 ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-rose-400" />
              )}
            </div>
            <span className={`text-base sm:text-lg font-black ${realNetProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {realNetProfit > 0 ? `+${formatCOP(realNetProfit)}` : formatCOP(realNetProfit)}
            </span>
            <span className={`block text-[9px] font-bold mt-0.5 ${realNetProfit > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {realNetProfit > 0 ? `+${Math.round(realNetMarginPercentage)}% sobre venta` : 'Pérdida en flete/dropi'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Details, Descriptions & Pricing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Información del Producto</h3>
              <span className="text-[10px] text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full font-bold">
                Paso Principal
              </span>
            </div>

            {/* Quick Cover Photo Row */}
            <div className="bg-gradient-to-r from-cyan-950 to-slate-900 text-white p-4 rounded-2xl border border-cyan-800/40 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-16 h-16 rounded-xl border-2 border-cyan-400 overflow-hidden bg-slate-950 shrink-0 shadow-md">
                    <img
                      src={images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                      alt="Portada del Producto"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
                      }}
                    />
                    <div className="absolute top-0.5 right-0.5 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-slate-950" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-cyan-300">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>Foto de Portada Principal</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                      Esta es la imagen visible en catálogo y carrusel. Cámbiala fácilmente:
                    </p>
                  </div>
                </div>

                {/* Quick Cover Actions: PC or URL */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleReplaceClick(0)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
                    title="Subir foto de portada desde tu computador"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>📁 Subir desde PC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCoverUrlInput('');
                      setCoverUrlModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-cyan-200 border border-cyan-500/30 font-bold text-xs shadow-md transition-all cursor-pointer"
                    title="Pegar enlace Dropi para la foto de portada"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>🔗 Pegar Link Dropi</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Título Completo del Producto *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!isEditing) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                  }
                }}
                placeholder="Ej. Audífonos Inalámbricos Bluetooth Pro Con Cancelación de Ruido"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Slug URL</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="audifonos-inalambricos-pro"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descripción Corta (Puntos Clave)</label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Batería de larga duración, estuche de carga rápida, compatibles con iOS y Android..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descripción Completa del Producto</label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla las especificaciones técnicas, contenido de la caja y modo de uso..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-sans"
              />
            </div>
          </div>

          {/* Pricing & Dropi Operational Costs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-cyan-800" />
                  Estructura de Precios & Costos Operativos Dropi
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Calcula el precio de venta considerando costo proveedor, flete y tarifas de plataforma para asegurar tu ganancia neta real.
                </p>
              </div>
              <span className="text-[10px] text-cyan-800 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-full font-bold self-start sm:self-auto">
                Zavela Profit Engine
              </span>
            </div>

            {/* Step 1: Operating Cost Inputs */}
            <div>
              <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">1</span>
                <span>Desglose de Costos Operativos (Inversión por Unidad)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Cost 1: Supplier Product Cost */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Costo Proveedor</label>
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-cyan-500 outline-hidden font-bold font-mono text-slate-900"
                    placeholder="45000"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Valor en catálogo Dropi</span>
                </div>

                {/* Cost 2: Estimated Shipping / Freight */}
                <div className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-100">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-sky-950">Flete de Envío Estimado</label>
                    <Truck className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <input
                    type="number"
                    value={estimatedShippingCost}
                    onChange={(e) => setEstimatedShippingCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-sky-200 rounded-lg focus:border-sky-500 outline-hidden font-bold font-mono text-sky-900"
                    placeholder="16500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setEstimatedShippingCost(11000)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                        estimatedShippingCost === 11000 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      Bogotá $11k
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstimatedShippingCost(16500)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                        estimatedShippingCost === 16500 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      Nacional $16.5k
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstimatedShippingCost(28000)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                        estimatedShippingCost === 28000 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      Especial $28k
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstimatedShippingCost(0)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                        estimatedShippingCost === 0 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      $0
                    </button>
                  </div>
                </div>

                {/* Cost 3: Dropi Platform / Collection Fee */}
                <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-amber-950">Tarifa Dropi / Recaudo</label>
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <input
                    type="number"
                    value={dropiFee}
                    onChange={(e) => setDropiFee(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-200 rounded-lg focus:border-amber-500 outline-hidden font-bold font-mono text-amber-900"
                    placeholder="4000"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setDropiFee(3500)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                        dropiFee === 3500 ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      $3.5k
                    </button>
                    <button
                      type="button"
                      onClick={() => setDropiFee(4000)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                        dropiFee === 4000 ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      $4k (Estándar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDropiFee(5000)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                        dropiFee === 5000 ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      $5k
                    </button>
                    <button
                      type="button"
                      onClick={() => setDropiFee(0)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors ${
                        dropiFee === 0 ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      $0
                    </button>
                  </div>
                </div>
              </div>

              {/* Total Operating Cost Result Callout */}
              <div className="mt-3 p-3.5 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-300">
                      Costo Total Operativo (Punto de Equilibrio Dropi)
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Costo ({formatCOP(costPrice)}) + Envío ({formatCOP(estimatedShippingCost)}) + Tarifa Dropi ({formatCOP(dropiFee)})
                    </div>
                  </div>
                </div>
                <div className="text-right sm:pl-4 sm:border-l sm:border-slate-800">
                  <span className="text-sm sm:text-base font-black text-cyan-300 font-mono">
                    = {formatCOP(totalOperatingCost)}
                  </span>
                  <span className="block text-[9px] text-slate-400">Costo mínimo de venta</span>
                </div>
              </div>
            </div>

            {/* Step 2: Sale Pricing & Quick Target Profit Calculators */}
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-900 text-white flex items-center justify-center text-[10px] font-black">2</span>
                  <span>Fijación del Precio de Venta al Público</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Asistente 1-Clic</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="bg-cyan-50/40 p-3.5 rounded-xl border border-cyan-200/80">
                  <label className="block text-xs font-bold text-cyan-950 mb-1">
                    Precio de Venta al Cliente ($ COP)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-cyan-300 rounded-xl focus:border-cyan-600 outline-hidden font-black font-mono text-cyan-950 shadow-xs"
                    placeholder="89900"
                  />
                  <span className="text-[10px] text-cyan-800 mt-1 block">
                    Precio visible en la tienda online
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Precio Comparado (Tachado)</label>
                    {discountPercentage > 0 && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                        -{discountPercentage}% Dcto
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold font-mono text-slate-600 line-through"
                    placeholder="119900"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Precio de referencia para descuento psicológico
                  </span>
                </div>
              </div>

              {/* 1-Click Profit Helpers */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Calculadoras Rápidas: Fijar Precio Automático según Ganancia Deseada</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applySuggestedNetProfit(20000)}
                    className="text-[10px] px-2.5 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>+$20.000 COP</span>
                    <span className="text-slate-400 font-normal">Ganancia Limpia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestedNetProfit(30000)}
                    className="text-[10px] px-2.5 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>+$30.000 COP</span>
                    <span className="text-slate-400 font-normal">Recomendado Pauta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestedNetProfit(40000)}
                    className="text-[10px] px-2.5 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>+$40.000 COP</span>
                    <span className="text-slate-400 font-normal">Ganancia Alta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestedMarginPercent(30)}
                    className="text-[10px] px-2.5 py-1.5 bg-white border border-slate-300 hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-800 font-bold rounded-lg transition-colors"
                  >
                    30% Margen Neto
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestedMarginPercent(40)}
                    className="text-[10px] px-2.5 py-1.5 bg-white border border-slate-300 hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-800 font-bold rounded-lg transition-colors"
                  >
                    40% Margen Neto
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMultiplierOnCost(2.0)}
                    className="text-[10px] px-2.5 py-1.5 bg-white border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-800 font-bold rounded-lg transition-colors"
                  >
                    2x Proveedor ({formatCOP(costPrice * 2)})
                  </button>
                </div>
              </div>
            </div>

            {/* Diagnostic Banner of Real Profit */}
            <div className={`p-4 rounded-xl border transition-colors ${
              realNetProfit > 0 
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-start gap-2.5">
                {realNetProfit > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-extrabold text-xs">
                      {realNetProfit > 0 
                        ? `Rentabilidad Neta Positiva: +${formatCOP(realNetProfit)} por unidad entregada`
                        : `¡ALERTA DE PÉRDIDA! Estás vendiendo a ${formatCOP(price)} con un costo operativo de ${formatCOP(totalOperatingCost)}`
                      }
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block self-start sm:self-auto ${
                      realNetProfit > 0 ? 'bg-emerald-200/80 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}>
                      {realNetProfit > 0 ? `${Math.round(realNetMarginPercentage)}% Margen Neto Real` : 'Pérdida Operativa'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {realNetProfit >= 25000 && '🚀 Excelente margen para escalar con Meta Ads / TikTok Ads y absorber devoluciones con tranquilidad.'}
                    {realNetProfit > 0 && realNetProfit < 25000 && '⚠️ Margen ajustado. Si haces pauta publicitaria en Dropi, se recomienda tener al menos $25.000 a $30.000 de utilidad libre.'}
                    {realNetProfit <= 0 && '🚨 Aumenta el precio de venta o reduce los costos de envío para evitar pérdidas operativas en Dropi.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory & Logistics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stock Disponible</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Peso (Kg para cotizar flete)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad de Bodega de Origen</label>
                <input
                  type="text"
                  value={warehouseCity}
                  onChange={(e) => setWarehouseCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Variants Management */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Variantes (Color, Talla, Versión)</h3>
              <p className="text-xs text-slate-500">Agrega opciones para que el cliente elija al comprar</p>
            </div>

            {/* Add Variant Form */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="text"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                placeholder="Nombre (ej. Negro Mate)"
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-hidden"
              />
              <input
                type="text"
                value={newVarSku}
                onChange={(e) => setNewVarSku(e.target.value)}
                placeholder="SKU (opcional)"
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-hidden font-mono"
              />
              <input
                type="number"
                value={newVarStock}
                onChange={(e) => setNewVarStock(Number(e.target.value))}
                placeholder="Stock"
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddVariant}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>

            {/* Variants List */}
            {variants.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {variants.map((v) => (
                  <div key={v.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{v.name}</span>
                      <span className="text-slate-400 font-mono ml-2">({v.sku})</span>
                      <span className="text-emerald-700 ml-2 font-semibold">• {v.stock} disponibles</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(v.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Col: Gallery, Tags & Options */}
        <div className="space-y-6">
          
          {/* Visibility & Badges */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900">Estado de Publicación</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-800">Producto Activo en Tienda</span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 accent-cyan-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-800">Destacado en Home</span>
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 accent-cyan-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Garantía del Producto</label>
              <input
                type="text"
                value={warrantyInfo}
                onChange={(e) => setWarrantyInfo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
              />
            </div>
          </div>

          {/* Images Gallery */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Galería de Imágenes</h3>
                <p className="text-[11px] text-slate-500">Sube fotos locales o pega links de Dropi / Proveedor</p>
              </div>
              <span className="text-[10px] text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full font-bold">
                {images.length} foto{images.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={replaceFileInputRef}
              onChange={handleReplaceFileUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setGalleryTab('upload')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                  galleryTab === 'upload'
                    ? 'bg-white text-cyan-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-cyan-600" />
                <span>📁 Subir desde PC</span>
              </button>
              <button
                type="button"
                onClick={() => setGalleryTab('url')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                  galleryTab === 'url'
                    ? 'bg-white text-cyan-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>🔗 Pegar Enlaces Dropi</span>
              </button>
            </div>

            {/* Tab 1: Upload from Computer */}
            {galleryTab === 'upload' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                  isDragOver
                    ? 'border-cyan-600 bg-cyan-100/70 text-cyan-900 scale-[1.01]'
                    : 'border-cyan-400/80 bg-cyan-50/40 hover:bg-cyan-100/50 text-slate-800'
                }`}
              >
                {isProcessingImages ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-800 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                    <span>Comprimiendo y optimizando imágenes...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-cyan-600/10 flex items-center justify-center text-cyan-600">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 block">
                        Haz clic para seleccionar o arrastra fotos aquí
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Selecciona una o varias fotos desde tu computador (PNG, JPG, WebP)
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 2: Paste Link(s) from Dropi or Web */}
            {galleryTab === 'url' && (
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800">
                  Pega URL(s) de imagen (Dropi, CDN o Web):
                </label>
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://dropi.co/cdn/images/foto1.jpg (o pega varios links separados por renglón)"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-mono text-slate-800"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10.5px] text-slate-500 leading-tight">
                      💡 Clic derecho en la foto de Dropi &gt; <span className="font-semibold text-slate-700">"Copiar dirección de imagen"</span>
                    </p>
                    <button
                      type="button"
                      onClick={handleAddImage}
                      disabled={!newImageUrl.trim()}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Foto(s)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Images Grid with Replace, Reorder and Delete controls */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  className={`relative rounded-xl overflow-hidden border transition-all aspect-square group bg-slate-100 ${
                    idx === 0 ? 'border-cyan-500 ring-2 ring-cyan-400/30' : 'border-slate-200'
                  }`}
                >
                  <img 
                    src={img} 
                    alt={`Producto ${idx + 1}`} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* Top Bar Actions */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                    {idx === 0 ? (
                      <span className="bg-slate-950/90 text-cyan-400 text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-sm border border-cyan-500/30 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-cyan-400" />
                        <span>Portada</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(idx);
                        }}
                        className="pointer-events-auto flex items-center gap-1 bg-slate-900/80 hover:bg-slate-900 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs transition-colors cursor-pointer"
                        title="Establecer como imagen principal"
                      >
                        <Star className="w-2.5 h-2.5 fill-amber-300" />
                        <span>Hacer Portada</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="pointer-events-auto p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-md cursor-pointer transition-colors"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Bottom Hover Actions: Change & Reorder */}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 bg-slate-950/90 backdrop-blur-xs p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setReplaceModal({ index: idx, urlInput: '' })}
                      className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[9.5px] font-bold transition-colors cursor-pointer"
                      title="Cambiar esta foto (desde PC o con Link)"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Cambiar</span>
                    </button>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'left')}
                        disabled={idx === 0}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Mover antes"
                      >
                        <ChevronLeft className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'right')}
                        disabled={idx === images.length - 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Mover después"
                      >
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900">Etiquetas / Tags de Búsqueda</h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="ej. audio, inalámbrico, novedad"
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                +
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-semibold"
                >
                  <span>#{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Social Media Auto-Publishing Integration Card */}
      <div className="bg-gradient-to-r from-purple-900/10 via-pink-900/10 to-cyan-900/10 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-cyan-950/30 p-5 rounded-2xl border border-purple-200 dark:border-purple-800/50 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 text-white flex items-center justify-center font-black shadow-md shadow-purple-500/20 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Auto-Publicar en Redes: Facebook, Instagram & TikTok
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-black uppercase">
                  Viral Boost
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                Al guardar, transmitirá automáticamente este producto a tus cuentas vinculadas para generar visualizaciones y ventas con Pago Contra Entrega.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={publishToSocial}
              onChange={(e) => setPublishToSocial(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-7 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600"></div>
          </label>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
        >
          Cancelar y Volver
        </button>
        <button
          type="submit"
          disabled={isSaving || isProcessingImages}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando Cambios...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios del Producto' : 'Publicar Producto en Catálogo'}</span>
            </>
          )}
        </button>
      </div>

      {/* Modal: Replace Specific Image */}
      {replaceModal !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-700">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">
                    Cambiar Imagen #{replaceModal.index + 1}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {replaceModal.index === 0 ? 'Foto de Portada Principal' : 'Foto de la Galería'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplaceModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Image Preview */}
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                <img
                  src={images[replaceModal.index]}
                  alt="Actual"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Imagen Actual</span>
                <span className="text-[10px] text-slate-500 line-clamp-1 break-all">
                  {images[replaceModal.index]?.startsWith('data:') ? 'Archivo local cargado' : images[replaceModal.index]}
                </span>
              </div>
            </div>

            {/* Choose method */}
            <div className="space-y-3 pt-1">
              
              {/* Option A: Upload from PC */}
              <div className="p-3 rounded-2xl border border-cyan-200 bg-cyan-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-cyan-950 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Opción 1: Subir desde Computador</span>
                  </span>
                  <span className="text-[10px] text-cyan-700 font-bold bg-white px-2 py-0.5 rounded-md border border-cyan-200">PC / Celular</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const idx = replaceModal.index;
                    setReplaceModal(null);
                    handleReplaceClick(idx);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Examinar y Seleccionar Archivo Local</span>
                </button>
              </div>

              {/* Option B: Paste Dropi / Web URL */}
              <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Opción 2: Pegar Enlace / Link de Dropi</span>
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">Web / CDN</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={replaceModal.urlInput}
                    onChange={(e) => setReplaceModal({ ...replaceModal, urlInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleReplaceWithUrl(replaceModal.index, replaceModal.urlInput);
                      }
                    }}
                    placeholder="https://dropi.co/cdn/images/..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleReplaceWithUrl(replaceModal.index, replaceModal.urlInput)}
                    disabled={!replaceModal.urlInput.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
                  >
                    Reemplazar
                  </button>
                </div>
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setReplaceModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Cover Image by URL */}
      {coverUrlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Star className="w-4 h-4 fill-amber-500" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">
                    Foto de Portada por Enlace Dropi / Web
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Se establecerá como la imagen visible principal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCoverUrlModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Pega la URL de la imagen:
              </label>
              <input
                type="url"
                value={coverUrlInput}
                onChange={(e) => setCoverUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSetCoverByUrl(coverUrlInput);
                  }
                }}
                placeholder="https://dropi.co/cdn/images/producto-portada.jpg"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
              />
              <p className="text-[10.5px] text-slate-500 leading-tight">
                💡 Haz clic derecho sobre la foto en Dropi y selecciona <span className="font-semibold text-slate-800">"Copiar dirección de imagen"</span>.
              </p>
            </div>

            {coverUrlInput.trim() && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white shrink-0 border border-slate-200">
                  <img
                    src={coverUrlInput}
                    alt="Vista previa portada"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
                    }}
                  />
                </div>
                <div className="text-xs">
                  <span className="font-black text-slate-900 block">Vista Previa</span>
                  <span className="text-[10px] text-emerald-700 font-bold">Enlace listo para aplicar</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCoverUrlModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSetCoverByUrl(coverUrlInput)}
                disabled={!coverUrlInput.trim()}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white font-bold text-xs shadow-md cursor-pointer transition-all"
              >
                Establecer como Portada
              </button>
            </div>
          </div>
        </div>
      )}

    </form>
  );
};
