import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  DollarSign, 
  Percent, 
  ShieldCheck, 
  AlertCircle, 
  Tag, 
  Sliders,
  Sparkles,
  Package,
  Eye,
  EyeOff,
  Copy,
  Layers,
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  CheckSquare,
  Square,
  MinusSquare,
  CheckCheck,
  AlertTriangle,
  Loader2,
  ChevronDown,
  BookOpen,
  Download,
  Share2
} from 'lucide-react';
import { Product, Category } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { ProductCatalogMagazineModal } from './ProductCatalogMagazineModal.tsx';
import { FacebookPageConnectModal } from './FacebookPageConnectModal.tsx';
import { 
  updateFirestoreProduct, 
  deleteFirestoreProduct, 
  createFirestoreProduct,
  deleteMultipleFirestoreProducts,
  updateMultipleFirestoreProducts,
  seedProductsToFirestore
} from '../../services/firestoreProducts.ts';

interface AdminProductsProps {
  products: Product[];
  categories: Category[];
  onRefresh: () => void;
  onEditProduct: (product: Product | null) => void;
}

export const AdminProducts: React.FC<AdminProductsProps> = ({
  products,
  categories,
  onRefresh,
  onEditProduct
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'low_stock'>('all');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isMagazineModalOpen, setIsMagazineModalOpen] = useState(false);

  // Multi-Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'permanent' | 'soft'>('permanent');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<string | null>(null);
  const [showQuickSelectMenu, setShowQuickSelectMenu] = useState(false);

  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  // Facebook Page Meta Graph API v26.0 State
  const [isFbModalOpen, setIsFbModalOpen] = useState(false);
  const [fbConfig, setFbConfig] = useState<{
    connected: boolean;
    pageId: string;
    accountName: string;
    autoPostEnabled: boolean;
  }>({
    connected: false,
    pageId: '',
    accountName: 'Zavela Store Colombia',
    autoPostEnabled: true
  });
  const [publishingFbProductId, setPublishingFbProductId] = useState<string | null>(null);

  const fetchFacebookStatus = async () => {
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
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchFacebookStatus();
  }, []);

  const handlePublishSingleToFacebook = async (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!fbConfig.connected) {
      setIsFbModalOpen(true);
      return;
    }

    setPublishingFbProductId(product.id);
    showToast(`Publicando "${product.title}" en la Página de Facebook...`);
    try {
      const res = await fetch('/api/admin/social/facebook/publish-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ "${product.title}" publicado con éxito en Facebook (ID: ${data.postId})`);
      } else {
        showToast(`❌ Error de Facebook: ${data.message || 'Verifica permisos del token'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error de red al publicar en Facebook: ${err.message}`, 'error');
    } finally {
      setPublishingFbProductId(null);
    }
  };

  const handleBulkPublishToFacebook = async () => {
    if (!fbConfig.connected) {
      setIsFbModalOpen(true);
      return;
    }
    const targetIds = selectedProductIds.length > 0 ? selectedProductIds : visibleIds.slice(0, 5);
    if (targetIds.length === 0) {
      showToast('No hay productos seleccionados para publicar', 'error');
      return;
    }

    setIsProcessingBulk(true);
    setBulkActionType('facebook');
    showToast(`Sincronizando ${targetIds.length} productos con la Página de Facebook...`);
    try {
      const res = await fetch('/api/admin/social/facebook/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: targetIds })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Sincronizados ${data.syncedCount} productos en tu Página de Facebook`);
      } else {
        showToast(`Error al sincronizar con Facebook: ${data.message}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error de conexión con Facebook: ${err.message}`, 'error');
    } finally {
      setIsProcessingBulk(false);
      setBulkActionType(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const lowStockCount = products.filter(p => (p.active ?? true) && p.stock <= 5).length;

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (statusFilter === 'active' && !p.active) return false;
    if (statusFilter === 'inactive' && p.active) return false;
    if (statusFilter === 'low_stock' && p.stock > 5) return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.categoryName?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q)) ||
      (p.dropi_product_id && String(p.dropi_product_id).includes(q))
    );
  });

  const visibleIds = filteredProducts.map(p => p.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedProductIds.includes(id));
  const someVisibleSelected = visibleIds.some(id => selectedProductIds.includes(id)) && !allVisibleSelected;
  const allCatalogSelected = products.length > 0 && products.every(p => selectedProductIds.includes(p.id));

  // Sync master checkbox indeterminate state
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  // Toggle selection for a single product
  const handleToggleSelectProduct = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle master select for visible products
  const handleToggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      // Unselect only the visible ones
      setSelectedProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      // Select all visible ones
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Select entire catalog (all products)
  const handleSelectAllCatalog = () => {
    setSelectedProductIds(products.map(p => p.id));
    setShowQuickSelectMenu(false);
  };

  // Select inactive only
  const handleSelectInactive = () => {
    const inactiveIds = products.filter(p => !p.active).map(p => p.id);
    setSelectedProductIds(inactiveIds);
    setShowQuickSelectMenu(false);
    showToast(`Seleccionados ${inactiveIds.length} productos inactivos/ocultos.`);
  };

  // Select zero stock only
  const handleSelectZeroStock = () => {
    const zeroStockIds = products.filter(p => p.stock <= 0).map(p => p.id);
    setSelectedProductIds(zeroStockIds);
    setShowQuickSelectMenu(false);
    showToast(`Seleccionados ${zeroStockIds.length} productos sin stock (0 un.).`);
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedProductIds([]);
    setShowQuickSelectMenu(false);
  };

  // Execute Bulk Action: Activate or Soft Delete (Pause)
  const handleBulkStatusChange = async (activate: boolean) => {
    if (selectedProductIds.length === 0) return;
    setIsProcessingBulk(true);
    setBulkActionType(activate ? 'activate' : 'pause');

    try {
      // 1. Update in Cloud Firestore
      await updateMultipleFirestoreProducts(selectedProductIds, { active: activate });

      // 2. Sync with Backend API
      await fetch('/api/admin/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedProductIds, softDelete: !activate })
      }).catch(() => {});

      showToast(
        activate 
          ? `¡Éxito! ${selectedProductIds.length} productos activados y visibles en la tienda.`
          : `¡Éxito! ${selectedProductIds.length} productos pausados / ocultados de la tienda pública.`
      );
      setSelectedProductIds([]);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar productos en Firestore', 'error');
    } finally {
      setIsProcessingBulk(false);
      setBulkActionType(null);
    }
  };

  // Open Bulk Delete Confirmation Modal
  const handleOpenBulkDeleteModal = (mode: 'permanent' | 'soft' = 'permanent') => {
    if (selectedProductIds.length === 0) {
      showToast('Por favor selecciona al menos un producto para eliminar.', 'error');
      return;
    }
    setDeleteMode(mode);
    setIsDeleteModalOpen(true);
  };

  // Confirm and Execute Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    setIsProcessingBulk(true);

    try {
      const isSoft = deleteMode === 'soft';

      // 1. Execute in Cloud Firestore in batches
      const count = await deleteMultipleFirestoreProducts(selectedProductIds, isSoft);

      // 2. Sync with Backend API
      await fetch('/api/admin/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedProductIds, softDelete: isSoft })
      }).catch(() => {});

      showToast(
        isSoft
          ? `Se ocultaron ${count} productos seleccionados de la tienda pública.`
          : `¡Eliminación completada! Se borraron permanentemente ${count} productos de Cloud Firestore.`
      );

      setSelectedProductIds([]);
      setIsDeleteModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Error al procesar eliminación en Cloud Firestore', 'error');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    setIsProcessing(product.id);
    const newActiveState = !product.active;
    try {
      await updateFirestoreProduct(product.id, { active: newActiveState });

      await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActiveState })
      }).catch(() => {});

      showToast(newActiveState ? 'Producto activado en tienda pública.' : 'Producto pausado / ocultado de la tienda.');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar estado en Firestore', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDuplicate = async (product: Product) => {
    if (!confirm(`¿Duplicar el producto "${product.title}" en Firestore?`)) return;

    setIsProcessing(product.id);
    try {
      const duplicated: Partial<Product> = {
        ...product,
        id: undefined,
        title: `${product.title} (Copia)`,
        slug: `${product.slug}-copia-${Date.now()}`
      };

      await createFirestoreProduct(duplicated);

      await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicated)
      }).catch(() => {});

      showToast(`Producto "${product.title}" duplicado con éxito.`);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Error al duplicar producto en Firestore', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteSingle = (product: Product) => {
    setSelectedProductIds([product.id]);
    setDeleteMode('permanent');
    setIsDeleteModalOpen(true);
  };

  const handleSoftDeleteSingle = async (product: Product) => {
    if (!confirm(`¿Ocultar "${product.title}" de la tienda pública (Soft Delete)?`)) return;

    setIsProcessing(product.id);
    try {
      await deleteFirestoreProduct(product.id, true);

      await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false, isDeleted: true })
      }).catch(() => {});

      showToast(`Producto "${product.title}" marcado como inactivo.`);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Error al aplicar soft delete', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // Products currently selected for modal preview
  const selectedProductsList = products.filter(p => selectedProductIds.includes(p.id));

  return (
    <div className="space-y-6">
      
      {/* Toast Notification Alert */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-bold shadow-md transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-950 border border-emerald-500 text-emerald-200' 
            : 'bg-rose-950 border border-rose-500 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white cursor-pointer ml-4"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
              INVENTARIO & CATÁLOGO
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
              <Cloud className="w-3 h-3 text-emerald-600" />
              <span>Cloud Firestore Conectado</span>
            </span>
          </div>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <span>Administrador de Productos</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono">
              {products.length} productos
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Selecciona productos uno por uno o todos para borrar en lote, pausar o activar en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMagazineModalOpen(true)}
            title="Generar y descargar revista digital tipo Yanbal en PDF con los productos del catálogo"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer shrink-0"
          >
            <BookOpen className="w-4 h-4 text-amber-200" />
            <span className="hidden sm:inline">Revista Catálogo PDF</span>
            <span className="sm:hidden">Revista PDF</span>
          </button>

          <button
            onClick={async () => {
              showToast('Sincronizando catálogo con Cloud Firestore...');
              onRefresh();
            }}
            title="Refrescar y sincronizar con Firestore"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer shrink-0 border border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          <button
            onClick={() => onEditProduct(null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Facebook Business Page Sync Banner */}
      <div className="bg-gradient-to-r from-blue-900/10 via-[#1877F2]/10 to-indigo-900/10 border border-blue-200 dark:border-blue-900/40 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20 shrink-0">
            f
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Sincronización con Facebook Business Page
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                fbConfig.connected
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${fbConfig.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {fbConfig.connected ? 'Conectado & Auto-Post Activo' : 'No Conectado'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {fbConfig.connected 
                ? `Página: "${fbConfig.accountName}" (ID: ${fbConfig.pageId || 'Configurado'}) - Los productos creados se publican con Pago Contra Entrega.`
                : 'Inicia sesión con tu Page ID y Token permanente para publicar automáticamente tus productos en Facebook.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {fbConfig.connected && (
            <button
              type="button"
              onClick={handleBulkPublishToFacebook}
              disabled={isProcessingBulk}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#1877F2] text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
              title="Publicar catálogo activo en la Fanpage"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Publicar en Facebook</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFbModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <span className="font-black">f</span>
            <span>{fbConfig.connected ? 'Gestionar Conexión' : 'Iniciar Sesión / Conectar Facebook'}</span>
          </button>
        </div>
      </div>

      {/* Bulk Actions Floating / Sticky Action Bar (When 1 or more products are selected) */}
      {selectedProductIds.length > 0 && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0 border border-cyan-500/30">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">
                  {selectedProductIds.length} producto{selectedProductIds.length > 1 ? 's' : ''} seleccionado{selectedProductIds.length > 1 ? 's' : ''}
                </span>
                <span className="text-[11px] text-slate-400">
                  (de {products.length} totales en catálogo)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Puedes eliminarlos permanentemente, pausarlos u ocultarlos en lote.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick action: Select entire catalog if not fully selected */}
            {!allCatalogSelected && (
              <button
                onClick={handleSelectAllCatalog}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title="Seleccionar los productos de todas las páginas y categorías"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Seleccionar todos ({products.length})</span>
              </button>
            )}

            {/* Bulk Activate */}
            <button
              onClick={() => handleBulkStatusChange(true)}
              disabled={isProcessingBulk}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Activar visibilidad en tienda pública"
            >
              {isProcessingBulk && bulkActionType === 'activate' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>Activar</span>
            </button>

            {/* Bulk Pause / Soft Delete */}
            <button
              onClick={() => handleBulkStatusChange(false)}
              disabled={isProcessingBulk}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Pausar / Ocultar de la tienda sin borrar de la base de datos"
            >
              {isProcessingBulk && bulkActionType === 'pause' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              <span>Pausar</span>
            </button>

            {/* Bulk Publish to Facebook Page */}
            <button
              onClick={handleBulkPublishToFacebook}
              disabled={isProcessingBulk}
              className="px-3.5 py-1.5 bg-[#1877F2] hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-500/20"
              title="Publicar productos seleccionados en la Página de Facebook"
            >
              {isProcessingBulk && bulkActionType === 'facebook' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span className="font-black text-xs leading-none">f</span>
              )}
              <span>Facebook ({selectedProductIds.length})</span>
            </button>

            {/* Bulk Delete Button -> Opens Modal */}
            <button
              onClick={() => handleOpenBulkDeleteModal('permanent')}
              disabled={isProcessingBulk}
              className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-600/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar ({selectedProductIds.length})</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={handleClearSelection}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Deseleccionar todo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters: Search, Category & Status */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, categoría, tag o Dropi ID..."
            className="w-full pl-9 pr-3 py-2.5 text-xs bg-white rounded-xl border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-hidden"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Selection Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowQuickSelectMenu(!showQuickSelectMenu)}
              className="px-3 py-2 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <CheckSquare className="w-3.5 h-3.5 text-cyan-600" />
              <span>Selección rápida</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showQuickSelectMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs font-medium">
                <button
                  onClick={handleToggleSelectAllVisible}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 cursor-pointer"
                >
                  <span>{allVisibleSelected ? 'Deseleccionar visibles' : 'Seleccionar visibles'}</span>
                  <span className="font-mono text-[10px] text-slate-400 font-bold">({filteredProducts.length})</span>
                </button>
                <button
                  onClick={handleSelectAllCatalog}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 cursor-pointer"
                >
                  <span>Seleccionar todo el catálogo</span>
                  <span className="font-mono text-[10px] text-slate-400 font-bold">({products.length})</span>
                </button>
                <button
                  onClick={handleSelectInactive}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 cursor-pointer"
                >
                  <span>Seleccionar inactivos/ocultos</span>
                  <span className="font-mono text-[10px] text-amber-600 font-bold">
                    ({products.filter(p => !p.active).length})
                  </span>
                </button>
                <button
                  onClick={handleSelectZeroStock}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 cursor-pointer"
                >
                  <span>Seleccionar agotados (stock 0)</span>
                  <span className="font-mono text-[10px] text-rose-600 font-bold">
                    ({products.filter(p => p.stock <= 0).length})
                  </span>
                </button>
                {selectedProductIds.length > 0 && (
                  <>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button
                      onClick={handleClearSelection}
                      className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Limpiar selección ({selectedProductIds.length})</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activos ({products.filter(p => p.active).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'inactive' ? 'bg-white text-rose-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactivos ({products.filter(p => !p.active).length})
            </button>
            <button
              onClick={() => setStatusFilter('low_stock')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                statusFilter === 'low_stock' 
                  ? 'bg-amber-400 text-slate-950 shadow-2xs font-black' 
                  : lowStockCount > 0 
                    ? 'text-amber-700 hover:text-amber-900 bg-amber-100/60' 
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Stock Crítico ≤ 5 ({lowStockCount})</span>
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Selection Summary Banner inside table context */}
      {selectedProductIds.length > 0 && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-center justify-between text-xs text-cyan-950 font-medium">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>
              Has seleccionado <strong>{selectedProductIds.length}</strong> producto{selectedProductIds.length > 1 ? 's' : ''}.
              {!allCatalogSelected && ` (${products.length - selectedProductIds.length} restantes no seleccionados)`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!allCatalogSelected && (
              <button
                onClick={handleSelectAllCatalog}
                className="text-cyan-800 hover:text-cyan-950 font-bold underline cursor-pointer text-xs"
              >
                Seleccionar todos los {products.length} productos
              </button>
            )}
            <button
              onClick={handleClearSelection}
              className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer ml-3"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                {/* Master Checkbox Column */}
                <th className="px-4 py-3.5 w-10 text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      ref={masterCheckboxRef}
                      checked={allVisibleSelected}
                      onChange={handleToggleSelectAllVisible}
                      className="w-4 h-4 text-cyan-600 rounded-md border-slate-300 focus:ring-cyan-500 cursor-pointer accent-cyan-600"
                      title={allVisibleSelected ? 'Deseleccionar visibles' : 'Seleccionar visibles'}
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5">Producto</th>
                <th className="px-4 py-3.5">Categoría</th>
                <th className="px-4 py-3.5">Costo & Venta</th>
                <th className="px-4 py-3.5">Margen Neta</th>
                <th className="px-4 py-3.5">Stock</th>
                <th className="px-4 py-3.5">Estado en Tienda</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No se encontraron productos en esta categoría o búsqueda.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const grossMargin = p.price - (p.costPrice || 0);
                  const marginPct = (p.costPrice && p.costPrice > 0) ? ((grossMargin / p.costPrice) * 100) : 0;
                  const isBusy = isProcessing === p.id;
                  const isSelected = selectedProductIds.includes(p.id);

                  return (
                    <tr 
                      key={p.id} 
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-cyan-50/70 border-l-4 border-l-cyan-600' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Row Checkbox Column */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectProduct(p.id, e as any)}
                            className="w-4 h-4 text-cyan-600 rounded-md border-slate-300 focus:ring-cyan-500 cursor-pointer accent-cyan-600"
                            title={`Seleccionar ${p.title}`}
                          />
                        </div>
                      </td>
                      
                      {/* Product Thumbnail & Title */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                            <img
                              src={p.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                              alt={p.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 line-clamp-1">{p.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400">/{p.slug}</span>
                              {p.dropi_product_id && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-1.5 py-0.2 rounded">
                                  Dropi #{p.dropi_product_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {p.categoryName || 'General'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900">{formatCOP(p.price)}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Costo Op: {formatCOP(p.totalOperatingCost || ((p.costPrice || 0) + (p.estimatedShippingCost || 16500) + (p.dropiFee || 4000)))}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          (Base: {formatCOP(p.costPrice || 0)})
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {(() => {
                          const opCost = p.totalOperatingCost || ((p.costPrice || 0) + (p.estimatedShippingCost || 16500) + (p.dropiFee || 4000));
                          const netProfit = p.realNetProfit !== undefined ? p.realNetProfit : (p.price - opCost);
                          const netMarginPct = p.price > 0 ? Math.round((netProfit / p.price) * 100) : 0;
                          const isProfit = netProfit > 0;

                          return (
                            <div>
                              <div className={`font-black ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {isProfit ? `+${formatCOP(netProfit)}` : formatCOP(netProfit)}
                              </div>
                              <div className={`text-[10px] font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isProfit ? `+${netMarginPct}% real` : 'Pérdida flete'}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 ${
                            p.stock <= 0 ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                            p.stock <= 5 ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse font-black' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {p.stock <= 5 && p.stock > 0 && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                            <span>{p.stock} un.</span>
                          </span>
                          {p.stock <= 5 && (
                            <span className="text-[9px] font-bold text-amber-700 uppercase tracking-tight">
                              {p.stock <= 0 ? 'Agotado' : '⚠️ Crítico'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(p)}
                          disabled={isBusy}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                            p.active 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                          title="Haz clic para alternar visibilidad pública"
                        >
                          {p.active ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-rose-600" />
                              <span>Oculto</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => handlePublishSingleToFacebook(p, e)}
                            disabled={isBusy || publishingFbProductId === p.id}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1877F2] transition-colors cursor-pointer"
                            title="Publicar en Facebook Business Page (Meta Graph API v26.0)"
                          >
                            {publishingFbProductId === p.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#1877F2]" />
                            ) : (
                              <span className="font-black text-xs leading-none">f</span>
                            )}
                          </button>
                          <button
                            onClick={() => onEditProduct(p)}
                            disabled={isBusy}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                            title="Editar Producto (Firestore)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(p)}
                            disabled={isBusy}
                            className="p-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 transition-colors cursor-pointer"
                            title="Duplicar en Firestore"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSoftDeleteSingle(p)}
                            disabled={isBusy}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                            title="Soft Delete: Ocultar de la tienda"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(p)}
                            disabled={isBusy}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Bulk or Single Deletion */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-rose-50 to-amber-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Confirmar Eliminación de Productos
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedProductIds.length} producto{selectedProductIds.length > 1 ? 's' : ''} seleccionado{selectedProductIds.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isProcessingBulk}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content & Options */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Selecciona el método de eliminación para los productos seleccionados:
              </p>

              {/* Mode Selection Options */}
              <div className="grid grid-cols-1 gap-2.5">
                {/* Permanent Delete Option */}
                <label 
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    deleteMode === 'permanent'
                      ? 'border-rose-500 bg-rose-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteMode"
                    value="permanent"
                    checked={deleteMode === 'permanent'}
                    onChange={() => setDeleteMode('permanent')}
                    className="mt-0.5 accent-rose-600 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="space-y-0.5">
                    <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <span>Eliminación Permanente en Cloud Firestore</span>
                      <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded font-bold">Definitivo</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Borra por completo los documentos de Cloud Firestore y del servidor. Esta acción no se puede deshacer.
                    </p>
                  </div>
                </label>

                {/* Soft Delete (Hide) Option */}
                <label 
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    deleteMode === 'soft'
                      ? 'border-amber-500 bg-amber-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteMode"
                    value="soft"
                    checked={deleteMode === 'soft'}
                    onChange={() => setDeleteMode('soft')}
                    className="mt-0.5 accent-amber-600 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-0.5">
                    <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <span>Ocultar de la Tienda (Soft Delete)</span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">Reversible</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Marca los productos como inactivos y borrados lógicamente. Los clientes no los verán, pero se conservará el historial.
                    </p>
                  </div>
                </label>
              </div>

              {/* Selected Items Preview */}
              <div>
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Productos a procesar ({selectedProductsList.length}):</span>
                  {selectedProductIds.length > 5 && (
                    <span className="text-[10px] text-slate-400">Mostrando primeros 5</span>
                  )}
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {selectedProductsList.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={p.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'} 
                          alt={p.title} 
                          className="w-6 h-6 rounded object-cover shrink-0" 
                        />
                        <span className="font-bold text-slate-800 truncate text-[11px]">{p.title}</span>
                      </div>
                      <span className="font-black text-[11px] text-slate-700 shrink-0 font-mono">
                        {formatCOP(p.price)}
                      </span>
                    </div>
                  ))}
                  {selectedProductsList.length > 5 && (
                    <p className="text-center text-[10px] text-slate-400 font-bold py-1">
                      + y {selectedProductsList.length - 5} producto{selectedProductsList.length - 5 > 1 ? 's' : ''} más...
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isProcessingBulk}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isProcessingBulk}
                className={`px-5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md ${
                  deleteMode === 'permanent'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/30'
                }`}
              >
                {isProcessingBulk ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando en Firestore...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {deleteMode === 'permanent'
                        ? `Eliminar Definitivamente (${selectedProductIds.length})`
                        : `Ocultar (${selectedProductIds.length})`}
                    </span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Revista Digital Catálogo Modal */}
      <ProductCatalogMagazineModal
        isOpen={isMagazineModalOpen}
        onClose={() => setIsMagazineModalOpen(false)}
        products={products}
      />

      {/* Modal de Conexión e Inicio de Sesión de Facebook Page */}
      <FacebookPageConnectModal
        isOpen={isFbModalOpen}
        onClose={() => setIsFbModalOpen(false)}
        onConnected={fetchFacebookStatus}
      />

    </div>
  );
};

