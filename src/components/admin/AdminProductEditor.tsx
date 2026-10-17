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
  ArrowRight,
  Building2,
  Store,
  Boxes
} from 'lucide-react';
import { Product, Category, ProductVariant } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { compressImageFile } from '../../utils/imageUtils.ts';
import { uploadProductImage } from '../../services/cpanelProducts.ts';
import { FacebookPageConnectModal } from './FacebookPageConnectModal.tsx';

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
  const currentProductId = product?.id || (product as any)?.productId || (product as any)?._id;
  const isEditing = Boolean(currentProductId);

  // --- Helpers canónicos de precarga y resolución para edición ---
  const resolveCategoryForEditor = (prod: any, cats: Category[]): string => {
    if (!prod) return cats[0]?.id || '';
    const rawCat = prod.categoria || prod.category || prod.categoryName || prod.categoryId || prod.category_id || prod.categoria_id;
    if (rawCat) {
      const clean = String(rawCat).toLowerCase().replace(/^[^\w\s]+/, '').trim();
      const found = cats.find(c => {
        const cClean = c.name.toLowerCase().replace(/^[^\w\s]+/, '').trim();
        return c.id.toLowerCase() === clean || c.slug.toLowerCase() === clean || cClean === clean || cClean.includes(clean) || clean.includes(cClean);
      });
      if (found) return found.id;
      const idMatch = cats.find(c => c.id === rawCat || c.slug === rawCat);
      if (idMatch) return idMatch.id;
    }
    const candidateId = prod.categoryId || prod.category_id || prod.categoria_id;
    if (candidateId) {
      const match = cats.find(c => c.id === candidateId || c.slug === candidateId);
      if (match) return match.id;
    }
    return (prod.categoria || prod.category || prod.categoryId || cats[0]?.id || '');
  };

  const resolveSupplierCost = (prod: any): number => {
    if (!prod) return 0;
    const rawVal = prod.supplier_cost ?? prod.costo_proveedor ?? prod.costPrice ?? 0;
    const num = Number(rawVal);
    return isNaN(num) ? 0 : num;
  };

  const resolveProviderForEditor = (prod: any): 'dropi' | 'derocha' | 'direct' | 'other' => {
    if (!prod) return 'derocha';
    const raw = prod.provider || prod.supplier || (prod.dropi_product_id ? 'dropi' : 'DeRocha');
    if (raw) {
      const lower = String(raw).toLowerCase().trim();
      if (lower.includes('derocha')) return 'derocha';
      if (lower === 'dropi' || lower.includes('dropi')) return 'dropi';
      if (lower.includes('direct') || lower.includes('bodega') || lower.includes('fabricante') || lower.includes('propio')) return 'direct';
      return 'other';
    }
    return (prod.dropi_product_id ? 'dropi' : 'derocha');
  };

  const resolveDropiProductId = (prod: any): string => {
    if (!prod) return '';
    const rawId = prod.dropi_product_id !== undefined && prod.dropi_product_id !== null
      ? prod.dropi_product_id
      : (prod.dropiProductId !== undefined && prod.dropiProductId !== null
        ? prod.dropiProductId
        : (prod.dropi_id !== undefined && prod.dropi_id !== null ? prod.dropi_id : ''));
    return String(rawId || '').trim();
  };

  const parseProductGallery = (prod: any): string[] => {
    if (!prod) return ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];
    let gallery: string[] = [];
    if (prod.imagenes !== undefined && prod.imagenes !== null) {
      if (typeof prod.imagenes === 'string') {
        const trimmed = prod.imagenes.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) gallery = parsed.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
          } catch (e) {}
        } else if (trimmed.includes(',')) {
          gallery = trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (trimmed.startsWith('http')) {
          gallery = [trimmed];
        }
      } else if (Array.isArray(prod.imagenes)) {
        gallery = prod.imagenes.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
      }
    }
    if (gallery.length === 0 && prod.images !== undefined && prod.images !== null) {
      if (Array.isArray(prod.images)) gallery = prod.images.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
      else if (typeof prod.images === 'string') {
        const trimmed = prod.images.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) gallery = parsed.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
          } catch (e) {}
        } else if (trimmed.includes(',')) {
          gallery = trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (trimmed.startsWith('http')) {
          gallery = [trimmed];
        }
      }
    }
    if (gallery.length === 0) {
      const single = prod.image || prod.imagen || prod.main_image || prod.featured_image;
      if (single && typeof single === 'string' && single.trim().length > 0) gallery = [single.trim()];
    }
    return gallery.length > 0 ? gallery : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];
  };

  // --- ESTADOS PRINCIPALES ---
  const [title, setTitle] = useState(product?.title || (product as any)?.nombre || (product as any)?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription || '');
  const [description, setDescription] = useState(product?.description || '');
  const [categoryId, setCategoryId] = useState<string>(() => resolveCategoryForEditor(product, categories));
  const [brand, setBrand] = useState(product?.brand || 'Zavela Store');
  const [warehouseCity, setWarehouseCity] = useState(product?.warehouseCity || 'Bogotá D.C.');
  const [provider, setProvider] = useState<'dropi' | 'derocha' | 'direct' | 'other'>(() => resolveProviderForEditor(product));
  const [customSupplierName, setCustomSupplierName] = useState<string>((product as any)?.supplier || (product as any)?.providerName || '');
  const [supplierSku, setSupplierSku] = useState<string>((product as any)?.supplier_sku || (product as any)?.supplierSku || (product as any)?.sku || '');
  const [dropiProductId, setDropiProductId] = useState<string>(() => resolveDropiProductId(product));
  const [costPrice, setCostPrice] = useState<number>(() => resolveSupplierCost(product));
  const [suggestedPrice, setSuggestedPrice] = useState<number>((product as any)?.suggested_price || (product as any)?.suggestedPrice || product?.compareAtPrice || 119900);
  
  // SOLUCIÓN FLETE: Extrae cualquier variante inicial y asegura formato número
  const [shippingCost, setShippingCost] = useState<number>(() => {
    const raw = (product as any)?.shippingCost ?? product?.shipping_cost ?? (product as any)?.flete ?? (product as any)?.flete_envio ?? product?.estimatedShippingCost;
    const parsed = typeof raw === 'string' ? parseFloat(raw.replace(/[^0-9.]/g, '')) : Number(raw);
    return (!isNaN(parsed) && parsed >= 0) ? parsed : 16500;
  });

  const estimatedShippingCost = shippingCost;
  const setEstimatedShippingCost = setShippingCost;

  const [dropiFee, setDropiFee] = useState<number>(product?.dropiFee !== undefined ? product.dropiFee : (resolveProviderForEditor(product) === 'dropi' ? 4000 : 0));
  const [price, setPrice] = useState<number>(product?.price || (product as any)?.precio || 89900);
  const [compareAtPrice, setCompareAtPrice] = useState<number>(product?.compareAtPrice || 119900);
  const [stock, setStock] = useState<number>(product?.stock ?? (product as any)?.inventario ?? 25);
  const [weightKg, setWeightKg] = useState<number>(product?.weightKg || 0.5);
  const [active, setActive] = useState<boolean>(product?.active !== false);
  const [featured, setFeatured] = useState<boolean>(Boolean(product?.featured));
  const [warrantyInfo, setWarrantyInfo] = useState(product?.warrantyInfo || '30 días de garantía oficial Zavela Store por defectos de fábrica.');
  const [images, setImages] = useState<string[]>(() => parseProductGallery(product));

  const [galleryTab, setGalleryTab] = useState<'upload' | 'url'>('upload');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [replacingImageIndex, setReplacingImageIndex] = useState<number | null>(null);
  const [replaceModal, setReplaceModal] = useState<{ index: number; urlInput: string; } | null>(null);
  const [coverUrlModalOpen, setCoverUrlModalOpen] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState('');

  const [variants, setVariants] = useState<ProductVariant[]>(() => {
    return (product?.variants || []).map(v => {
      let color = v.color;
      let size = v.size || v.talla;
      if (!color && v.name) {
        if (v.name.includes(' / ')) {
          const parts = v.name.split(' / ');
          color = parts[0]?.trim();
          size = size || parts[1]?.trim();
        } else {
          color = v.name;
        }
      }
      return {
        ...v,
        color: color || v.name || 'Único',
        size: size || 'Única',
        talla: size || 'Única',
        dropi_variation_id: v.dropi_variation_id || v.dropiVariationId
      };
    });
  });

  const [newVarColor, setNewVarColor] = useState('');
  const [newVarSize, setNewVarSize] = useState('Única');
  const [newVarDropiId, setNewVarDropiId] = useState('');
  const [newVarStock, setNewVarStock] = useState(10);
  const [newVarSku, setNewVarSku] = useState('');
  const [newVarPrice, setNewVarPrice] = useState(price);
  const [tags, setTags] = useState<string[]>(product?.tags || ['tendencia', 'calidad', 'contraentrega']);
  const [newTag, setNewTag] = useState('');

  const [publishToSocial, setPublishToSocial] = useState<boolean>(true);
  const [publishToFacebook, setPublishToFacebook] = useState<boolean>(true);
  const [isFbModalOpen, setIsFbModalOpen] = useState<boolean>(false);
  const [fbConfig, setFbConfig] = useState<{ connected: boolean; pageId: string; accountName: string; autoPostEnabled: boolean; }>({
    connected: false, pageId: '', accountName: 'Zavela Store Colombia', autoPostEnabled: true
  });
  const [isPublishingFbNow, setIsPublishingFbNow] = useState<boolean>(false);
  const [fbPublishNowResult, setFbPublishNowResult] = useState<{ success: boolean; message: string; postId?: string } | null>(null);
  const [showFbPreview, setShowFbPreview] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // --- CÁLCULOS MATEMÁTICOS OBLIGATORIOS (Deben estar antes de las funciones que los usan) ---
  const totalOperatingCost = Number(costPrice || 0) + Number(shippingCost || 0) + Number(dropiFee || 0);
  const realNetProfit = Number(price || 0) - totalOperatingCost;
  const realNetMarginPercentage = price > 0 ? ((realNetProfit / price) * 100) : 0;
  const markupOnCostPercentage = totalOperatingCost > 0 ? ((realNetProfit / totalOperatingCost) * 100) : 0;
  const grossProfitCOP = price - costPrice;
  const marginPercentage = costPrice > 0 ? ((grossProfitCOP / costPrice) * 100) : 0;
  const discountPercentage = (compareAtPrice && compareAtPrice > price) ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

  // --- EFECTOS ---
  const fetchFbStatus = async () => {
    try {
      const res = await fetch('/api/admin/social/facebook/status');
      const data = await res.json();
      if (data.success && data.data) {
        setFbConfig({
          connected: Boolean(data.data.connected),
          pageId: data.data.pageId || '',
          accountName: data.data.accountName || 'Zavela Store Colombia',
          autoPostEnabled: data.data.autoPostEnabled !== false
        });
      }
    } catch {}
  };

  useEffect(() => {
    fetchFbStatus();
  }, []);

  useEffect(() => {
    if (product) {
      const productData = product;
      setTitle(productData.title || (productData as any).nombre || (productData as any).name || '');
      setSlug(productData.slug || '');
      setShortDescription(productData.shortDescription || '');
      setDescription(productData.description || (productData as any).descripcion || '');
      setCategoryId(resolveCategoryForEditor(productData, categories));
      setBrand(productData.brand || 'Zavela Store');
      setWarehouseCity(productData.warehouseCity || 'Bogotá D.C.');
      setProvider(resolveProviderForEditor(productData));
      setCustomSupplierName((productData as any).supplier || (productData as any).providerName || (productData as any).proveedor || '');
      setSupplierSku((productData as any).supplier_sku || (productData as any).supplierSku || (productData as any).sku || '');
      setDropiProductId(resolveDropiProductId(productData));
      setCostPrice(resolveSupplierCost(productData));
      setSuggestedPrice((productData as any).suggested_price || (productData as any).suggestedPrice || productData.compareAtPrice || (Number(productData.price) ? Number(productData.price) + 20000 : 119900));
      
      // Carga dinámica robusta de flete
      const loadedShipping = (productData as any).shippingCost ?? (productData as any).shipping_cost ?? (productData as any).flete ?? (productData as any).flete_envio ?? (productData as any).estimatedShippingCost;
      const parsedLoadedShipping = typeof loadedShipping === 'string' ? parseFloat(String(loadedShipping).replace(/[^0-9.]/g, '')) : Number(loadedShipping);
      setShippingCost(!isNaN(parsedLoadedShipping) && parsedLoadedShipping >= 0 ? parsedLoadedShipping : 16500);

      setDropiFee(product.dropiFee !== undefined ? product.dropiFee : (resolveProviderForEditor(product) === 'dropi' ? 4000 : 0));
      setPrice(product.price || (product as any).precio || 89900);
      setCompareAtPrice(product.compareAtPrice || 119900);
      setStock(product.stock ?? (product as any).inventario ?? 25);
      setWeightKg(product.weightKg || 0.5);
      setActive(product.active !== false);
      setFeatured(Boolean(product.featured));
      setWarrantyInfo(product.warrantyInfo || '30 días de garantía oficial Zavela Store por defectos de fábrica.');
      setImages(parseProductGallery(product));

      if (product.variants && Array.isArray(product.variants)) {
        setVariants(product.variants.map(v => {
          let color = v.color;
          let size = v.size || (v as any).talla;
          if (!color && v.name) {
            if (v.name.includes(' / ')) {
              const parts = v.name.split(' / ');
              color = parts[0]?.trim();
              size = size || parts[1]?.trim();
            } else {
              color = v.name;
            }
          }
          return {
            ...v,
            color: color || v.name || 'Único',
            size: size || 'Única',
            talla: size || 'Única',
            dropi_variation_id: v.dropi_variation_id || (v as any).dropiVariationId
          };
        }));
      }

      if (product.tags && Array.isArray(product.tags)) {
        setTags(product.tags);
      }
    }
  }, [product, categories]);

  // --- HANDLERS ---
  const applySuggestedNetProfit = (targetProfitCOP: number) => {
    const calculatedPrice = Math.round((totalOperatingCost + targetProfitCOP) / 100) * 100;
    setPrice(calculatedPrice);
    if (!compareAtPrice || compareAtPrice <= calculatedPrice) setCompareAtPrice(Math.round((calculatedPrice * 1.35) / 100) * 100);
  };

  const applySuggestedMarginPercent = (marginPct: number) => {
    const factor = 1 - (marginPct / 100);
    if (factor <= 0) return;
    const calculatedPrice = Math.round((totalOperatingCost / factor) / 100) * 100;
    setPrice(calculatedPrice);
    if (!compareAtPrice || compareAtPrice <= calculatedPrice) setCompareAtPrice(Math.round((calculatedPrice * 1.35) / 100) * 100);
  };

  const applyMultiplierOnCost = (multiplier: number) => {
    const calculatedPrice = Math.round((costPrice * multiplier) / 100) * 100;
    setPrice(calculatedPrice);
    if (!compareAtPrice || compareAtPrice <= calculatedPrice) setCompareAtPrice(Math.round((calculatedPrice * 1.35) / 100) * 100);
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    const rawTokens = newImageUrl.split(/[\n,]+/).map(url => url.trim()).filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/')));
    if (rawTokens.length === 0) {
      if (newImageUrl.trim().startsWith('http')) setImages([...images, newImageUrl.trim()]);
      else { alert('Por favor ingresa enlaces válidos que comiencen con http:// o https://'); return; }
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
          try { return await uploadProductImage(file); } catch { return await compressImageFile(file); }
        })
      );
      setImages(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) { alert(err.message || 'Error al procesar y subir las imágenes.'); } finally { setIsProcessingImages(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    if (e.target) e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) await processFiles(e.dataTransfer.files);
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
      try { finalUrl = await uploadProductImage(file); } catch { finalUrl = await compressImageFile(file); }
      setImages(prev => { const copy = [...prev]; copy[replacingImageIndex] = finalUrl; return copy; });
    } catch (err: any) { alert(err.message || 'Error al reemplazar la imagen.'); } finally { setIsProcessingImages(false); setReplacingImageIndex(null); if (e.target) e.target.value = ''; }
  };

  const handleReplaceWithUrl = (idx: number, url: string) => {
    if (!url.trim()) return;
    setImages(prev => { const copy = [...prev]; copy[idx] = url.trim(); return copy; });
    setReplaceModal(null);
  };

  const handleSetCoverByUrl = (url: string) => {
    if (!url.trim()) return;
    setImages(prev => {
      const copy = [...prev];
      if (copy.length > 0) copy[0] = url.trim(); else copy.push(url.trim());
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
    if (images.length === 1) { alert('El producto debe tener al menos una imagen.'); return; }
    const copy = [...images];
    copy.splice(idx, 1);
    setImages(copy);
  };

  const handleAddVariant = () => {
    const color = newVarColor.trim();
    const size = newVarSize.trim() || 'Única';
    if (!color) { alert('Por favor indica al menos el Color o Nombre principal.'); return; }
    const displayName = size && size !== 'Única' ? `${color} / ${size}` : color;
    const cleanDropiId = newVarDropiId.trim();

    const newVariant: ProductVariant = {
      id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: displayName,
      color,
      size,
      talla: size,
      dropi_variation_id: cleanDropiId || undefined,
      dropiVariationId: cleanDropiId || undefined,
      sku: newVarSku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      stock: Number(newVarStock) >= 0 ? Number(newVarStock) : 10,
      price: newVarPrice || price
    };
    setVariants([...variants, newVariant]);
    setNewVarColor(''); setNewVarSize('Única'); setNewVarDropiId(''); setNewVarSku(''); setNewVarStock(10);
  };

  const handleRemoveVariant = (id: string) => setVariants(variants.filter(v => v.id !== id));

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (!tags.includes(newTag.trim().toLowerCase())) setTags([...tags, newTag.trim().toLowerCase()]);
    setNewTag('');
  };

  const handleRemoveTag = (t: string) => setTags(tags.filter(item => item !== t));

  const handlePublishToFacebookNow = async () => {
    if (!title.trim()) { alert('Por favor ingresa un título para el producto antes de publicarlo en Facebook.'); return; }
    if (!price || Number(price) <= 0) { alert('Por favor ingresa un precio válido antes de publicarlo en Facebook.'); return; }
    if (!fbConfig.connected) { setIsFbModalOpen(true); return; }

    setIsPublishingFbNow(true);
    setFbPublishNowResult(null);

    const effectiveTitle = (title || '').trim() || product?.title || (product as any)?.nombre || (product as any)?.name || 'Producto Zavela Store Colombia';
    const effectiveSlug = (slug || '').trim() || effectiveTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const validImages = images.filter(img => Boolean(img && img.trim()));
    const finalImages = validImages.length > 0 ? validImages : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];

    const targetFbId = currentProductId ? String(currentProductId) : (product?.id ? String(product.id) : `prod-${Date.now()}`);

    const currentProductData: Product = {
      id: targetFbId, title: effectiveTitle, slug: effectiveSlug,
      description: description || 'Producto exclusivo disponible con Pago Contra Entrega en toda Colombia.',
      shortDescription: shortDescription || 'Garantía oficial y despacho prioritario Zavela Store.',
      price: Number(price) || 89900, costPrice: Number(costPrice) || 45000,
      compareAtPrice: Number(compareAtPrice) || (Number(price) ? Number(price) + 20000 : 119900),
      discountPercentage: discountPercentage || 20, marginAmount: grossProfitCOP || 44900,
      marginPercentage: marginPercentage || 50, stock: Number(stock) || 20,
      active: Boolean(active), featured: Boolean(featured), images: finalImages,
      warrantyInfo: warrantyInfo || '30 días de garantía oficial Zavela Store por defectos de fábrica.',
      tags: tags && tags.length > 0 ? tags : ['tendencia', 'calidad', 'contraentrega'],
      weightKg: Number(weightKg) || 0.5, categoryId: categoryId || categories[0]?.id || 'cat-general',
      categoryName: categories.find(c => c.id === categoryId)?.name || categories[0]?.name || 'General',
      warehouseCity: warehouseCity || 'Bogotá D.C.', brand: brand || 'Zavela Store',
      dropi_product_id: dropiProductId || '', variants: variants || [],
      createdAt: product?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const localToken = localStorage.getItem('zavela_facebook_accessToken') || undefined;
    const localPageId = localStorage.getItem('zavela_facebook_pageId') || undefined;

    try {
      const res = await fetch('/api/admin/social/facebook/publish-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: currentProductData.id, id: currentProductData.id, accessToken: localToken, pageId: localPageId, product: currentProductData, ...currentProductData })
      });
      const data = await res.json();
      if (data.success) {
        setFbPublishNowResult({ success: true, message: `✅ Publicado con éxito en la página oficial de Facebook con ID ${data.postId}`, postId: data.postId });
      } else {
        setFbPublishNowResult({ success: false, message: `❌ Error de Facebook: ${data.message || 'Verifica permisos del token permanente'}` });
        if (data.isMissingToken || data.errorCode === 190 || data.message?.includes('Token')) setIsFbModalOpen(true);
      }
    } catch (err: any) {
      setFbPublishNowResult({ success: false, message: `Fallo de conexión: ${err.message}` });
    } finally { setIsPublishingFbNow(false); }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!title.trim()) { alert('Por favor indica un título para el producto.'); return; }

    setIsSaving(true);
    try {
      const selectedCat = categories.find(c => c.id === categoryId || c.slug === categoryId);
      const targetId = currentProductId ? String(currentProductId) : (product?.id ? String(product.id) : undefined);

      const selectedProvider = provider === 'dropi' ? 'dropi' : (provider === 'derocha' ? 'DeRocha' : (provider === 'direct' ? 'Bodega Directa' : (customSupplierName.trim() || 'Otro Proveedor')));

      const dropiId = dropiProductId && dropiProductId.trim() ? dropiProductId.trim() : null;
      const skuProveedor = supplierSku && supplierSku.trim() ? supplierSku.trim() : null;
      const costoProveedor = Number(costPrice) || 0;
      const precioVenta = Number(price) || 0;
      const precioSugerido = Number(suggestedPrice) || Number(precioVenta) || 0;
      const valorFlete = (typeof shippingCost === 'number' && !isNaN(shippingCost) && shippingCost >= 0) ? shippingCost : (parseFloat(String(shippingCost).replace(/[^0-9.]/g, '')) || 0);

      const selectedCategory = selectedCat?.name || (categories.find(c => c.id === categoryId || c.slug === categoryId)?.name) || (selectedCat?.id) || categoryId || (product as any)?.categoria || (product as any)?.category || 'General';

      const validImages = images.filter(img => Boolean(img && typeof img === 'string' && img.trim()));
      const galleryImages = validImages.length > 0 ? validImages : (images.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80']);
      const mainImage = galleryImages[0] || '';

      const payloadFinal = {
        ...(targetId ? { id: targetId } : {}),
        title: title.trim(), name: title.trim(), nombre: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        shortDescription: shortDescription.trim(), description: description.trim(), descripcion: description.trim(),
        categoryId: categoryId || selectedCat?.id || categories[0]?.id,
        category_id: categoryId || selectedCat?.id || categories[0]?.id,
        categoryName: selectedCategory,
        categoria_id: categoryId || selectedCat?.id || categories[0]?.id,
        categoria: selectedCategory, category: selectedCategory,
        brand: brand.trim() || 'Zavela Store',
        warehouseCity: warehouseCity.trim() || 'Bogotá D.C.',
        provider: selectedProvider, supplier: selectedProvider,
        costo_proveedor: Number(costoProveedor) || 0, supplier_cost: Number(costoProveedor) || 0,
        costo: Number(costoProveedor) || 0, costPrice: Number(costoProveedor) || 0,
        price: precioVenta, precio: precioVenta,
        suggested_price: Number(precioSugerido) || Number(precioVenta) || 0,
        compareAtPrice: Number(compareAtPrice) || precioSugerido,
        discountPercentage, marginAmount: grossProfitCOP,
        marginPercentage: Math.round(marginPercentage * 10) / 10,
        shippingCost: valorFlete, shipping_cost: valorFlete, flete_envio: valorFlete, flete: valorFlete, estimatedShippingCost: valorFlete,
        dropiFee, totalOperatingCost, realNetProfit,
        realNetMarginPercentage: Math.round(realNetMarginPercentage * 10) / 10,
        stock: Number(stock) || 0, weightKg: Number(weightKg) || 0.5,
        active: active ? 1 : 0, featured, warrantyInfo,
        dropiProductId: selectedProvider === 'dropi' ? (dropiId || null) : null,
        dropi_product_id: selectedProvider === 'dropi' ? (dropiId || null) : null,
        dropi_id: selectedProvider === 'dropi' ? (dropiId || null) : null,
        supplier_sku: skuProveedor, supplierSku: skuProveedor,
        image: mainImage, imagen: mainImage, images: galleryImages, imagenes: JSON.stringify(galleryImages),
        variants: variants || [], tags: tags || [], publishToSocial, publishToFacebook
      };

      console.log('Payload al guardar:', payloadFinal);
      if (isEditing && targetId) {
        const response = await fetch(`/api/products/${encodeURIComponent(targetId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadFinal)
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Error en el servidor al guardar');
        }
      }
      await onSave(payloadFinal);
    } catch (err: any) {
      alert(err.message || 'Error al guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = handleSave;

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

      {/* 🏢 Gestión de Proveedor & Logística */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl border-2 border-indigo-500/30 text-white shadow-xl space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
              <Boxes className="w-5 h-5 text-slate-950" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">Gestión de Proveedor & Bodega de Origen</h3>
                <span className="text-[10px] text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 font-bold px-2.5 py-0.5 rounded-full">
                  {provider === 'dropi' ? '⚡ Dropshipping Dropi' : (provider === 'derocha' ? '📦 Bodega DeRocha' : (provider === 'direct' ? '🏭 Bodega Directa' : '🏷️ Proveedor Externo'))}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Selecciona la fuente del producto para adaptar la logística de despacho y el código de enlace correspondiente.
              </p>
            </div>
          </div>

          <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full border shadow-xs ${
            provider === 'dropi'
              ? (dropiProductId ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40')
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
          }`}>
            {provider === 'dropi' 
              ? (dropiProductId ? `✓ Dropi ID: ${dropiProductId}` : '⚠ Requiere ID Dropi')
              : `✓ Proveedor: ${provider === 'derocha' ? 'DeRocha' : (provider === 'direct' ? 'Bodega Directa' : (customSupplierName || 'Externo'))}`}
          </span>
        </div>

        {/* Selector de Proveedor en Tabs/Botones */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setProvider('dropi');
              if (dropiFee === 0) setDropiFee(4000);
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              provider === 'dropi'
                ? 'bg-gradient-to-br from-cyan-600/30 to-blue-600/30 border-cyan-400 text-white ring-2 ring-cyan-500/30'
                : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                <Zap className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200">
                API Dropi
              </span>
            </div>
            <div className="font-extrabold text-xs text-white">Dropi Colombia</div>
            <p className="text-[11px] text-slate-400 line-clamp-1">Mapeo con catálogo y despacho automático</p>
          </button>

          <button
            type="button"
            onClick={() => setProvider('derocha')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              provider === 'derocha'
                ? 'bg-gradient-to-br from-amber-600/30 to-orange-600/30 border-amber-400 text-white ring-2 ring-amber-500/30'
                : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                <Store className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
                DeRocha
              </span>
            </div>
            <div className="font-extrabold text-xs text-white">DeRocha Bodega</div>
            <p className="text-[11px] text-slate-400 line-clamp-1">Proveedor mayorista nacional independiente</p>
          </button>

          <button
            type="button"
            onClick={() => setProvider('direct')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              provider === 'direct'
                ? 'bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border-emerald-400 text-white ring-2 ring-emerald-500/30'
                : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                <Building2 className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200">
                Propio
              </span>
            </div>
            <div className="font-extrabold text-xs text-white">Bodega Directa</div>
            <p className="text-[11px] text-slate-400 line-clamp-1">Fabricante o stock propio de Zavela Store</p>
          </button>

          <button
            type="button"
            onClick={() => setProvider('other')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              provider === 'other'
                ? 'bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-purple-400 text-white ring-2 ring-purple-500/30'
                : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                <Tag className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200">
                Externo
              </span>
            </div>
            <div className="font-extrabold text-xs text-white">Otro Proveedor</div>
            <p className="text-[11px] text-slate-400 line-clamp-1">Importador o distribuidor independiente</p>
          </button>
        </div>

        {/* Campos Condicionales según el Proveedor */}
        {provider === 'dropi' ? (
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-cyan-500/40 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-cyan-200 mb-1">
                  ID de Producto en Dropi (<code className="font-mono text-cyan-400">dropi_product_id</code>) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={dropiProductId}
                    onChange={(e) => setDropiProductId(e.target.value)}
                    placeholder="Ej. 2240082 o ID numérico del producto en Dropi Colombia"
                    className="w-full pl-3.5 pr-20 py-2.5 text-xs bg-slate-950 border border-cyan-400/50 rounded-xl focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 outline-hidden font-mono font-bold text-white shadow-xs"
                  />
                  {dropiProductId && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-bold flex items-center gap-1">
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
                    } catch {}
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-cyan-500/30 font-bold text-xs shadow-xs cursor-pointer text-center"
                  title="Pegar ID copiado desde Dropi"
                >
                  📋 Pegar ID
                </button>
                {dropiProductId && (
                  <button
                    type="button"
                    onClick={() => setDropiProductId('')}
                    className="py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold text-xs cursor-pointer"
                    title="Limpiar ID"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-cyan-300/80 leading-relaxed">
              💡 Este ID vincula automáticamente el producto con la API oficial de Dropi para cotizaciones de flete y envíos automáticos con pago contra entrega.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-indigo-500/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/50 px-3 py-2 rounded-xl border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Producto independiente de <strong>{provider === 'derocha' ? 'DeRocha Bodega' : (provider === 'direct' ? 'Bodega Directa' : 'Proveedor Externo')}</strong>. No requiere ID de Dropi y se mantendrá permanentemente seguro en tu base de datos cPanel MySQL sin ser sobreescrito ni eliminado.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {provider === 'other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nombre del Proveedor o Distribuidor
                  </label>
                  <input
                    type="text"
                    value={customSupplierName}
                    onChange={(e) => setCustomSupplierName(e.target.value)}
                    placeholder="Ej. Importaciones Andinas, Bodega Central..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-hidden text-white"
                  />
                </div>
              )}

              <div className={provider === 'other' ? '' : 'md:col-span-2'}>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Código de Referencia / SKU del Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  value={supplierSku}
                  onChange={(e) => setSupplierSku(e.target.value)}
                  placeholder="Ej. DR-8820, REF-CALI-01 o código de barras de la bodega"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-hidden font-mono text-white"
                />
              </div>
            </div>

            {/* Opción desplegable si también cuenta con ID Dropi */}
            <details className="text-xs text-slate-400 cursor-pointer pt-1">
              <summary className="hover:text-cyan-300 select-none">
                + Vincular también un ID de Dropi secundario (opcional)
              </summary>
              <div className="mt-2.5 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={dropiProductId}
                  onChange={(e) => setDropiProductId(e.target.value)}
                  placeholder="ID Dropi opcional (si existe versión en Dropi)"
                  className="w-full max-w-sm px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
            </details>
          </div>
        )}
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
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-medium text-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  {categoryId && !categories.some(c => c.id === categoryId) && (
                    <option value={categoryId}>
                      {product?.categoryName || (product as any)?.category || (product as any)?.categoria || categoryId}
                    </option>
                  )}
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
                    value={shippingCost}
                    onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-white border border-sky-200 rounded-lg focus:border-sky-500 outline-hidden font-bold font-mono text-sky-900"
                    placeholder="16500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setShippingCost(11000)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        shippingCost === 11000 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      Bogotá $11k
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingCost(16500)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        shippingCost === 16500 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      Nacional $16.5k
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingCost(25000)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        shippingCost === 25000 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      Especial $25k
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingCost(0)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        shippingCost === 0 ? 'bg-sky-600 text-white' : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>Variantes (Color, Talla, Versión & Dropi)</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {variants.length} {variants.length === 1 ? 'variante' : 'variantes'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Configura las opciones de color, talla y el código de variación de Dropi para que la orden se despache de forma exacta.
                </p>
              </div>
            </div>

            {/* Add Variant Form */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Agregar Nueva Variante:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    1. Color / Nombre <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newVarColor}
                    onChange={(e) => setNewVarColor(e.target.value)}
                    placeholder="ej. Negro, Rojo, Azul"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-cyan-500 outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    2. Talla / Medida
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newVarSize}
                      onChange={(e) => setNewVarSize(e.target.value)}
                      placeholder="ej. S, M, L o Única"
                      list="tallas-preset-list"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-cyan-500 outline-hidden font-medium"
                    />
                    <datalist id="tallas-preset-list">
                      <option value="Única" />
                      <option value="XS" />
                      <option value="S" />
                      <option value="M" />
                      <option value="L" />
                      <option value="XL" />
                      <option value="XXL" />
                      <option value="36" />
                      <option value="37" />
                      <option value="38" />
                      <option value="39" />
                      <option value="40" />
                      <option value="41" />
                      <option value="42" />
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <span>3. ID Variación Dropi</span>
                    <span className="text-[9px] bg-cyan-100 text-cyan-800 font-mono font-bold px-1 rounded">Dropi</span>
                  </label>
                  <input
                    type="text"
                    value={newVarDropiId}
                    onChange={(e) => setNewVarDropiId(e.target.value)}
                    placeholder="ej. 142058"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-cyan-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    4. Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newVarStock}
                    onChange={(e) => setNewVarStock(Number(e.target.value))}
                    placeholder="Stock"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-cyan-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    5. SKU (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newVarSku}
                    onChange={(e) => setNewVarSku(e.target.value)}
                    placeholder="ej. ZV-NEG-M"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-cyan-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Variante</span>
                </button>
              </div>
            </div>

            {/* Variants List */}
            {variants.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Variantes creadas para este producto:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Se sincronizan con MySQL y Dropi automáticamente
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {variants.map((v) => {
                    const colorDisplay = v.color || (v.name?.includes(' / ') ? v.name.split(' / ')[0] : v.name) || 'Color Único';
                    const sizeDisplay = v.size || v.talla || (v.name?.includes(' / ') ? v.name.split(' / ')[1] : 'Única');
                    const dropiIdDisplay = v.dropi_variation_id || (v as any).dropiVariationId;

                    return (
                      <div 
                        key={v.id} 
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-slate-300 shrink-0"></span>
                            <span className="font-extrabold text-slate-900 text-xs">
                              {colorDisplay}
                            </span>
                          </div>

                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 text-[11px]">
                            Talla: {sizeDisplay}
                          </span>

                          {dropiIdDisplay ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 text-[11px]">
                              📦 Dropi ID: #{dropiIdDisplay}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium text-slate-400 bg-slate-100 text-[10px] italic">
                              Sin Dropi ID
                            </span>
                          )}

                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            v.stock > 0 
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                              : 'text-rose-700 bg-rose-50 border border-rose-200'
                          }`}>
                            Stock: {v.stock} un.
                          </span>

                          {v.sku && (
                            <span className="text-slate-400 font-mono text-[10px] hidden md:inline-block">
                              SKU: {v.sku}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(v.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title="Eliminar esta variante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="sm:hidden">Eliminar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                No hay variantes agregadas. El producto se venderá como opción única con el stock general ({stock} unidades).
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

            {/* Images Grid */}
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

                  {/* Bottom Hover Actions */}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 bg-slate-950/90 backdrop-blur-xs p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setReplaceModal({ index: idx, urlInput: '' })}
                      className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[9.5px] font-bold transition-colors cursor-pointer"
                      title="Cambiar esta foto"
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
                      >
                        <ChevronLeft className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'right')}
                        disabled={idx === images.length - 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

      {/* Facebook Business Page */}
      <div className="bg-gradient-to-r from-blue-900/10 via-[#1877F2]/10 to-purple-900/10 dark:from-blue-950/30 dark:via-blue-900/20 dark:to-purple-950/30 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/60 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/20 shrink-0">
              f
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Sincronización y Publicación en Facebook Business Page
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-[#1877F2] text-white text-[9px] font-black uppercase">
                  Meta v26.0
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  fbConfig.connected
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${fbConfig.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {fbConfig.connected ? 'Sesión Conectada' : 'No Conectada'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                {fbConfig.connected
                  ? `Página vinculada: "${fbConfig.accountName}" (ID: ${fbConfig.pageId || 'Configurado'}). Al guardar, se publicará la foto y el texto comercial con Pago Contra Entrega.`
                  : 'Para que los productos subidos se publiquen automáticamente en Facebook, inicia sesión con tu Page ID y Token de Página Permanente.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsFbModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#1877F2] font-black text-xs border border-blue-200 dark:border-blue-700 shadow-xs transition-colors cursor-pointer"
            >
              {fbConfig.connected ? '⚙️ Configurar Facebook' : '🔑 Iniciar Sesión Facebook Page'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-blue-200/60 dark:border-blue-800/40">
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/30">
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="font-bold text-[#1877F2]">f</span>
                <span>Publicar en Facebook al Guardar</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Sube la foto y crea el post oficial con enlace directo de compra.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
              <input
                type="checkbox"
                checked={publishToFacebook}
                onChange={(e) => setPublishToFacebook(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1877F2]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-purple-100 dark:border-purple-900/30">
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Transmitir a Redes Virales</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Genera copys automáticos para Instagram y TikTok.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
              <input
                type="checkbox"
                checked={publishToSocial}
                onChange={(e) => setPublishToSocial(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowFbPreview(!showFbPreview)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{showFbPreview ? 'Ocultar vista previa de post' : '👁️ Ver cómo se publicará en Facebook'}</span>
          </button>

          <button
            type="button"
            onClick={handlePublishToFacebookNow}
            disabled={isPublishingFbNow}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1877F2] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            title="Publicar en la Fanpage de Facebook utilizando los datos actuales del formulario"
          >
            {isPublishingFbNow ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Publicando en Meta...</span>
              </>
            ) : (
              <>
                <span className="font-black">f</span>
                <span>Publicar en Facebook Ahora</span>
              </>
            )}
          </button>
        </div>

        {fbPublishNowResult && (
          <div className={`p-3 rounded-xl border text-xs font-medium animate-in fade-in duration-200 ${
            fbPublishNowResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
          }`}>
            <div className="font-black">{fbPublishNowResult.message}</div>
          </div>
        )}

        {showFbPreview && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-black">
                f
              </div>
              <div>
                <div className="font-black text-slate-900 dark:text-white">
                  {fbConfig.accountName || 'Zavela Store Colombia'}
                </div>
                <div className="text-[10px] text-slate-400">Publicado vía Meta Graph API v26.0 • Pago Contra Entrega</div>
              </div>
            </div>

            <div className="space-y-2 text-slate-800 dark:text-slate-200 whitespace-pre-line font-sans leading-relaxed">
              <p className="font-black text-sm text-slate-900 dark:text-white">
                🔥 ¡Novedad en Zavela Store! {title || 'Nombre del Producto'}
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                💎 BENEFICIOS DESTACADOS:
                {'\n'}✨ {shortDescription || 'Calidad premium y materiales de alta durabilidad.'}
                {'\n'}🛡️ Garantía oficial de 30 días contra cualquier defecto.
                {'\n'}🚚 Pago Contra Entrega: Pagas al recibir en la puerta de tu casa.
              </p>
              <p className="font-black text-emerald-700 dark:text-emerald-400">
                💰 PRECIO: {formatCOP(price)} COP {compareAtPrice > price ? `(Antes: ${formatCOP(compareAtPrice)} COP)` : ''}
              </p>
              <p className="font-bold text-slate-700 dark:text-slate-300">
                🛒 Pide ahora con Pago Contra Entrega en la puerta de tu casa:
                {'\n'}👉 https://zavelastore.com.co/producto/{slug || 'producto'}
              </p>
              <p className="font-bold text-slate-700 dark:text-slate-300">
                📲 Asesoría y pedidos directos por WhatsApp: +57 313 3595427
              </p>
              <p className="text-[11px] text-blue-600 font-mono">
                #ZavelaStore #Colombia #PagoContraEntrega #Tendencias2026 #TiendaOnline
              </p>
            </div>

            {images[0] && (
              <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img src={images[0]} alt="Vista previa post" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

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

            <div className="space-y-3 pt-1">
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

      <FacebookPageConnectModal
        isOpen={isFbModalOpen}
        onClose={() => setIsFbModalOpen(false)}
        onConnected={fetchFbStatus}
      />

    </form>
  );
};
