import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2, 
  Menu, 
  X, 
  ExternalLink,
  Store,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shuffle,
  ShieldAlert,
  Power,
  Trash2
} from 'lucide-react';
import { 
  Product, 
  Order, 
  Customer, 
  Category, 
  StoreSettings, 
  AuditLog, 
  AdminStats 
} from '../types/index.ts';
import { 
  getCpanelProducts,
  saveCpanelProduct,
  normalizeCpanelProduct,
  saveLocalProductOverride,
  saveCustomProductCost,
  overrideProductWithCustomCosts
} from '../services/cpanelProducts.ts';
import { 
  getFirestoreSettings, 
  saveFirestoreSettings 
} from '../services/firestoreSettings.ts';
import { calculateDashboardMetrics } from '../utils/metricsCalculator.ts';
import { AdminMaintenanceModal } from './admin/AdminMaintenanceModal.tsx';
import { AdminSidebar, AdminSectionKey } from './admin/AdminSidebar.tsx';
import { AdminOverview } from './admin/AdminOverview.tsx';
import { AdminCommerceMindAI } from './admin/AdminCommerceMindAI.tsx';
import { AdminCopilotPrivateAlerts } from './admin/AdminCopilotPrivateAlerts.tsx';
import { AdminDailySummaryModal } from './admin/AdminDailySummaryModal.tsx';
import { AssistantVoiceSelector } from './admin/AssistantVoiceSelector.tsx';
import { generateDailyTrafficReport, clearSimulatedTraffic } from '../utils/mockDailyTrafficGenerator.ts';
import { clearAllTestCustomers } from '../utils/customerAuthManager.ts';
import { AdminHeaderTicker } from './admin/AdminHeaderTicker.tsx';
import { AdminBrandIdentity } from './admin/AdminBrandIdentity.tsx';
import { AdminWhatsAppAIAgent } from './admin/AdminWhatsAppAIAgent.tsx';
import { AdminSocialMarketing } from './admin/AdminSocialMarketing.tsx';
import { AdminContactSocial } from './admin/AdminContactSocial.tsx';
import { AdminHeaderButtons } from './admin/AdminHeaderButtons.tsx';
import { AdminCategoriesMenu } from './admin/AdminCategoriesMenu.tsx';
import { AdminExclusivitySettings } from './admin/AdminExclusivitySettings.tsx';
import { AdminSubpagesManager } from './admin/AdminSubpagesManager.tsx';
import { AdminLuckyWheel } from './admin/AdminLuckyWheel.tsx';
import { AdminGamificationSettings } from './admin/AdminGamificationSettings.tsx';
import { AdminHeroBanners } from './admin/AdminHeroBanners.tsx';
import { AdminHomeSections } from './admin/AdminHomeSections.tsx';
import { AdminReviews } from './admin/AdminReviews.tsx';
import { AdminTrustBadges } from './admin/AdminTrustBadges.tsx';
import { AdminBlogPosts } from './admin/AdminBlogPosts.tsx';
import { AdminProducts } from './admin/AdminProducts.tsx';
import { AdminProductEditor } from './admin/AdminProductEditor.tsx';
import { DropiBulkImporter } from './admin/DropiBulkImporter.tsx';
import { AdminOrders } from './admin/AdminOrders.tsx';
import { SalesCalendarSheet } from './admin/SalesCalendarSheet.tsx';
import { AdminPendingDropiOrders } from './admin/AdminPendingDropiOrders.tsx';
import { AdminCustomers } from './admin/AdminCustomers.tsx';
import { AdminAdvisorsDropi } from './admin/AdminAdvisorsDropi.tsx';
import { AdminShippingRates } from './admin/AdminShippingRates.tsx';
import { AdminLegalPolicies } from './admin/AdminLegalPolicies.tsx';
import { AdminSystemSecurity } from './admin/AdminSystemSecurity.tsx';
import { AdminErrorBoundary } from './admin/AdminErrorBoundary.tsx';
import { WhatsAppAlertFloatingBanner } from './admin/WhatsAppAlertFloatingBanner.tsx';
import { clearAdminAuthentication } from './AdminLoginModal.tsx';
import { FacebookPageConnectModal } from './admin/FacebookPageConnectModal.tsx';

// 🛡️ FUNCIÓN BLINDADA DEFINITIVA (SEPARA MILES Y DECIMALES DE MYSQL) 🛡️
function parseNumCOP(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Math.floor(val);
  
  let str = String(val).trim();
  
  // 1. Quitar signo pesos y espacios
  str = str.replace(/[\$\s]/g, '');
  
  // 2. Si el string termina exactamente en .00 (formato MySQL), lo eliminamos
  if (str.endsWith('.00')) {
    str = str.slice(0, -3);
  } else if (str.endsWith(',00')) {
    str = str.slice(0, -3);
  }
  
  // 3. Eliminar todos los puntos y comas restantes (que son separadores de miles)
  str = str.replace(/[.,]/g, '');
  
  // 4. Quitar cualquier otra letra o símbolo que no sea dígito
  str = str.replace(/[^\d-]/g, '');
  
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

interface AdminDashboardProps {
  onBackToStore: () => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onBackToStore,
  onLogout
}) => {
  const [activeSection, setActiveSection] = useState<AdminSectionKey>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [isFbModalOpen, setIsFbModalOpen] = useState(false);

  // Core Data Stores
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // CommerceMind AI Daily Greeting & Voice Summary Modal
  const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);
  const [dailySummaryInitialStep, setDailySummaryInitialStep] = useState<'greeting' | 'summary'>('greeting');
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);

  const handleToggleMaintenanceMode = async () => {
    if (!settings) return;
    const nextMode = !Boolean(settings.maintenanceMode);
    try {
      // 1. Guardar en Cloud Firestore para sincronización inmediata
      await saveFirestoreSettings({ maintenanceMode: nextMode }).catch(err => console.warn('Firestore toggle warning:', err));
      
      // 2. Guardar en servidor local
      await fetch('/api/admin/maintenance/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextMode })
      });

      setSettings(prev => prev ? ({ ...prev, maintenanceMode: nextMode }) : null);
      showToast(nextMode ? '🔴 Modo Mantenimiento ACTIVADO (Tienda oculta al público)' : '🟢 Modo Mantenimiento DESACTIVADO (Tienda abierta al público)');
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado de mantenimiento');
    }
  };

  // Check first visit of the day to show warm greeting
  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastGreetingDate = localStorage.getItem('cm_admin_last_greeting_date');
      const sessionDismissed = sessionStorage.getItem('cm_admin_greeting_dismissed');

      if (lastGreetingDate !== todayStr && sessionDismissed !== 'true') {
        const timer = setTimeout(() => {
          setIsDailySummaryOpen(true);
          setDailySummaryInitialStep('greeting');
          localStorage.setItem('cm_admin_last_greeting_date', todayStr);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('Error checking daily greeting date:', e);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSimulateDailyTraffic = () => {
    generateDailyTrafficReport(products);
    setIsDailySummaryOpen(true);
    setDailySummaryInitialStep('summary');
    showToast('🎲 ¡Nuevas ventas y tráfico del día simulados con éxito!');
  };

  const handleCleanAllInternalTests = async () => {
    if (!confirm('¿Deseas borrar y detener todas las pruebas internas (ventas simuladas, clientes de prueba y tráfico simulado)?')) return;
    try {
      await fetch('/api/admin/clean-tests', { method: 'POST' });
      await fetch('/api/admin/orders/clear-all', { method: 'POST' });
      await fetch('/api/admin/customers/clear-all', { method: 'POST' });
      clearSimulatedTraffic();
      clearAllTestCustomers();
      await fetchAdminData();
      showToast('🧹 ¡Pruebas internas, ventas simuladas y clientes de prueba eliminados con éxito!');
    } catch (err: any) {
      showToast('Error al limpiar pruebas: ' + (err?.message || err));
    }
  };

  const fetchAdminData = async () => {
    try {
   // 1. Cargar datos del backend y cPanel MySQL en paralelo (Omitiendo api.php antiguo)
    const [statsRes, ordersRes, customersRes, categoriesRes, settingsRes, cpanelProds, firestoreSet] = await Promise.all([
      fetch('https://api.zavelastore.com.co/api.php?action=metrics').then(r => r.json()).catch(() => ({ success: false })),
      fetch('https://api.zavelastore.com.co/api.php?action=pedidos').then(r => r.json()).catch(() => ({ success: false })),
      fetch('https://api.zavelastore.com.co/api.php?action=customers').then(r => r.json()).catch(() => ({ success: false })),
      
   // APUNTA DIRECTO A NODE.JS PARA TRAER LAS CATEGORÍAS REALES DESDE LA BASE DE DATOS
      fetch('/api/admin/categories')
        .then(r => r.json())
        .then(data => ({ success: true, data: Array.isArray(data) ? data : (data?.data || []) }))
        .catch(() => ({ success: false })),

      fetch('https://api.zavelastore.com.co/api.php?action=settings').then(r => r.json()).catch(() => ({ success: false })),
      getCpanelProducts(false).catch(() => null),
      getFirestoreSettings().catch(() => null)
    ]);

      // 🛡️ Priorizar SIEMPRE el puente blindado cpanelProds que trae todos los campos (flete, comision, etc.)
      let loadedProducts: Product[] = [];
      if (cpanelProds !== null && Array.isArray(cpanelProds) && cpanelProds.length > 0) {
        loadedProducts = cpanelProds.map(p => overrideProductWithCustomCosts(normalizeCpanelProduct(p)));
      } else {
        // Solo como medida de emergencia extrema (fallback)
        const fallbackRes = await fetch('https://api.zavelastore.com.co/api.php?action=products').then(r => r.json()).catch(() => ({ success: false }));
        if (fallbackRes.success && Array.isArray(fallbackRes.data)) {
          loadedProducts = fallbackRes.data.map((p: any) => overrideProductWithCustomCosts(normalizeCpanelProduct(p)));
        }
      }

      const loadedOrders: Order[] = (ordersRes.success && Array.isArray(ordersRes.data)) ? ordersRes.data : [];

      setProducts(loadedProducts);
      setOrders(loadedOrders);
      if (customersRes.success) setCustomers(customersRes.data);
      if (categoriesRes.success) setCategories(categoriesRes.data);

      // Cálculo estricto y en vivo de métricas según las reglas de costos, logística, Dropi y hora de Colombia
      const calculatedStats = calculateDashboardMetrics(loadedOrders, loadedProducts);
      if (statsRes.success && statsRes.data) {
        setStats({ ...statsRes.data, ...calculatedStats });
      } else {
        setStats(calculatedStats);
      }
      
      if (firestoreSet) {
        setSettings(firestoreSet);
      } else if (settingsRes.success) {
        const loaded = settingsRes.data?.settings || settingsRes.data;
        setSettings(loaded);
        if (loaded) {
          saveFirestoreSettings(loaded).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Recalcular métricas automáticamente cuando los pedidos o productos cambien
  useEffect(() => {
    if (orders.length > 0 || products.length > 0) {
      setStats(prev => {
        const fresh = calculateDashboardMetrics(orders, products);
        return prev ? { ...prev, ...fresh } : fresh;
      });
    }
  }, [orders, products]);

  const handleSaveSettings = async (updatedSettings: Partial<StoreSettings>) => {
    try {
      // 1. Guardar y persistir físicamente en cPanel MySQL (tabla configuraciones y banners)
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (!res.ok) throw new Error('Error al actualizar ajustes en MySQL');
      
      // Sincronizar estado local en memoria
      await saveFirestoreSettings(updatedSettings).catch(() => {});
      await fetchAdminData();
      showToast('Configuración guardada con éxito en cPanel MySQL');
    } catch (err: any) {
      alert(err.message || 'Error al guardar en cPanel MySQL');
      throw err;
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      const targetId = productData.id || (productData as any).productId;
      const isEdit = Boolean(targetId);

      // 1. Si el producto ya tiene id, enviar por PUT /api/products/:id; si es nuevo sin id, enviar por POST /api/products
      const endpoint = isEdit ? `/api/products/${encodeURIComponent(targetId!)}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      // 🛡️ REEMPLAZO DE NUMBER POR PARSENOUMCOP PARA BLINDAR LA EXTRACCIÓN DE NÚMEROS 🛡️
      const shippingValue = parseNumCOP(
        (productData as any).shippingCost ??
        productData.shipping_cost ??
        (productData as any).flete_envio ??
        (productData as any).flete ??
        (productData as any).estimatedShippingCost
      );
      
      const feeValue = parseNumCOP(
        (productData as any).dropiFee ??
        (productData as any).dropi_fee ??
        (productData as any).comisionDropi
      );

      const costoProveedorRaw = parseNumCOP(
        (productData as any).costoProveedor || 
        (productData as any).costPrice || 
        (productData as any).costo
      );

      const rawDropiCode = String(productData.dropi_product_id || (productData as any).dropiProductId || '').trim();
      const provider = productData.provider || (rawDropiCode ? 'dropi' : 'derocha');

      // Respaldo preventivo en zavela_custom_costs_v1 en localStorage antes del guardado en servidor
      try {
        const rawMap = localStorage.getItem('zavela_custom_costs_v1');
        const map = rawMap ? JSON.parse(rawMap) : {};
        const costRecord = {
          shippingCost: shippingValue,
          dropiFee: feeValue,
          dropiProductId: String(rawDropiCode || ''),
          provider: String(provider),
          updatedAt: Date.now()
        };
        if (targetId) map[String(targetId).trim()] = costRecord;
        if (productData.slug) map[String(productData.slug).trim()] = costRecord;
        localStorage.setItem('zavela_custom_costs_v1', JSON.stringify(map));
      } catch (e) {
        console.warn('Error saving zavela_custom_costs_v1 before fetch in AdminDashboard:', e);
      }

      if (targetId) {
        saveCustomProductCost(String(targetId), {
          id: String(targetId),
          slug: productData.slug,
          shippingCost: shippingValue,
          dropiFee: feeValue,
          dropiProductId: rawDropiCode,
          provider
        });
      }

      const payload = {
        ...productData,
        shippingCost: shippingValue,
        shipping_cost: shippingValue,
        flete: shippingValue,
        flete_envio: shippingValue,
        fleteEnvio: shippingValue,
        dropiFee: feeValue,
        dropi_fee: feeValue,
        comisionDropi: feeValue,
        costoProveedor: costoProveedorRaw,
        dropiProductId: String(rawDropiCode || ""),
        provider: String(provider),
        ...(targetId ? { id: targetId } : {})
      };

      console.log('Payload al guardar (Dashboard):', payload);

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || `Error HTTP ${res.status} al guardar producto`);
      }

      const resData = await res.json();
      const savedProductResult = resData.data || payload;
      const finalProductId = savedProductResult?.id || targetId || `prod-${Date.now()}`;
      const finalDropiCode = String(rawDropiCode || savedProductResult?.dropi_product_id || (savedProductResult as any)?.dropiProductId || '').trim();
      
      // BLINDAJE TOTAL: Los valores exactos digitados por el usuario NUNCA pueden ser pisados por el 0 del servidor
      const finalFee = feeValue;
      const finalShipping = shippingValue;

      // Respaldo local definitivo en zavela_custom_costs_v1 en localStorage tras confirmación del servidor
      try {
        const rawMap = localStorage.getItem('zavela_custom_costs_v1');
        const map = rawMap ? JSON.parse(rawMap) : {};
        const costRecord = {
          shippingCost: finalShipping,
          dropiFee: finalFee,
          dropiProductId: String(finalDropiCode || ''),
          provider: String(provider),
          updatedAt: Date.now()
        };
        if (finalProductId) map[String(finalProductId).trim()] = costRecord;
        if (productData.slug) map[String(productData.slug).trim()] = costRecord;
        localStorage.setItem('zavela_custom_costs_v1', JSON.stringify(map));
      } catch (e) {
        console.warn('Error saving zavela_custom_costs_v1 after server response in AdminDashboard:', e);
      }

      if (finalProductId) {
        saveCustomProductCost(String(finalProductId), {
          id: String(finalProductId),
          slug: productData.slug,
          shippingCost: finalShipping,
          dropiFee: finalFee,
          dropiProductId: finalDropiCode,
          provider
        });
      }

      const completeSavedProduct = {
        ...productData,
        ...savedProductResult,
        id: finalProductId,
        provider,
        shippingCost: finalShipping,
        shipping_cost: finalShipping,
        flete_envio: finalShipping,
        flete: finalShipping,
        estimatedShippingCost: finalShipping,
        dropiFee: finalFee,
        dropi_fee: finalFee,
        dropi_product_id: finalDropiCode,
        dropiProductId: finalDropiCode,
        publishToFacebook: productData.publishToFacebook !== false
      };

      // Actualizar inmediatamente el estado de productos local para que el badge de Dropi se visualice al instante
      setProducts(prev => {
        const idx = prev.findIndex(p => p.id === finalProductId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = completeSavedProduct as Product; // Reemplazo total para limpiar cache viejo
          return copy;
        }
        return [completeSavedProduct as Product, ...prev];
      });

      // 2. Si el toggle 'Publicar en Facebook al Guardar' está activo, asegurar publicación inmediata tras confirmación de MySQL
      let fbSyncResult: any = null;

      if (productData.publishToFacebook !== false) {
        try {
          const localToken = localStorage.getItem('zavela_facebook_accessToken') || undefined;
          const localPageId = localStorage.getItem('zavela_facebook_pageId') || undefined;

          const fbRes = await fetch('/api/admin/social/facebook/publish-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: finalProductId,
              id: finalProductId,
              accessToken: localToken,
              pageId: localPageId,
              product: completeSavedProduct,
              ...completeSavedProduct
            })
          });
          const fbData = await fbRes.json().catch(() => null);
          if (fbData && (fbData.success || fbData.postId)) {
            fbSyncResult = fbData;
          }
        } catch (e) {
          console.warn('[Facebook Auto-Publish Error]:', e);
        }
      }

      await fetchAdminData();
      setEditingProduct(undefined);

      if (fbSyncResult?.success) {
        showToast(`✅ ${isEdit ? 'Producto modificado' : 'Producto creado'} y publicado en Facebook (ID: ${fbSyncResult.postId})`);
      } else if (fbSyncResult && !fbSyncResult.success) {
        showToast(`⚠️ Guardado en cPanel MySQL, pero Facebook reportó: ${fbSyncResult.message}`);
      } else {
        showToast(isEdit ? 'Producto modificado en cPanel MySQL exitosamente.' : 'Producto creado y persistido en cPanel MySQL.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al guardar producto en cPanel MySQL');
      throw err;
    }
  };

  const handleLogoutClick = () => {
    if (confirm('¿Deseas cerrar la sesión de administración?')) {
      clearAdminAuthentication();
      if (onLogout) {
        onLogout();
      } else {
        onBackToStore();
      }
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono font-bold text-slate-300">
            Cargando Panel Maestro Zavela Store...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* Mobile Topbar */}
      <div className="md:hidden bg-[#0A1128] border-b border-[#2A3A60] p-4 flex items-center justify-between text-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-[#1C2541] text-slate-300"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-black text-sm text-[#48CAE4]">Zavela Store Control</span>
        </div>

        <button
          onClick={onBackToStore}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#1C2541] text-slate-300 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Tienda</span>
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-[#0A1128] transform transition-transform duration-200 ease-in-out md:static md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <AdminSidebar
          activeSection={activeSection}
          onSelectSection={(sec) => {
            setActiveSection(sec);
            setIsMobileMenuOpen(false);
            setEditingProduct(undefined);
          }}
          onBackToStore={onBackToStore}
          onLogout={handleLogoutClick}
          pendingOrdersCount={orders.filter(o => {
            const s = String(o.status || (o as any).estado || '').toLowerCase().trim();
            return s === 'pendiente' || s === 'pendiente_revision';
          }).length}
          totalProductsCount={products.length}
          lowStockCount={products.filter(p => (p.active ?? true) && Number(p.stock) <= 5).length}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        
        {/* Global Dashboard Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              ZAVELA STORE COLOMBIA
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-extrabold text-slate-800">
              Panel Maestro de Control Total
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            
            {/* Control Destacado: Modo Mantenimiento de la Tienda [ACTIVO / INACTIVO] */}
            <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-2xs transition-all">
              <button
                type="button"
                onClick={() => setIsMaintenanceModalOpen(true)}
                className="flex items-center gap-2 px-2 py-0.5 text-left cursor-pointer group"
                title="Configurar Modo Mantenimiento, mensaje público y Enlace Privado de Bypass"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${settings?.maintenanceMode ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-500 hidden sm:inline">
                      Modo Mantenimiento:
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border ${
                      settings?.maintenanceMode 
                        ? 'bg-rose-100 text-rose-800 border-rose-300' 
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {settings?.maintenanceMode ? 'Rojo: Tienda cerrada' : 'Verde: Tienda abierta'}
                    </span>
                  </div>
                  <span className={`text-[11px] font-black block leading-none ${settings?.maintenanceMode ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {settings?.maintenanceMode ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              </button>

              {/* Master Quick Switch Button */}
              <button
                type="button"
                onClick={handleToggleMaintenanceMode}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-2xs ${
                  settings?.maintenanceMode ? 'bg-rose-600' : 'bg-slate-300 hover:bg-slate-400'
                }`}
                title={settings?.maintenanceMode ? 'Desactivar Modo Mantenimiento y Abrir al Público' : 'Activar Modo Mantenimiento (Cerrar Tienda)'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    settings?.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  <Power className={`w-3 h-3 ${settings?.maintenanceMode ? 'text-rose-600' : 'text-slate-400'}`} />
                </span>
              </button>
            </div>

            <AssistantVoiceSelector theme="light" className="hidden xl:inline-flex" />

            <button
              type="button"
              onClick={handleCleanAllInternalTests}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Borrar y detener ventas de prueba, simulaciones y clientes registrados de prueba"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden lg:inline">Limpiar Pruebas</span>
            </button>

            <button
              type="button"
              onClick={handleSimulateDailyTraffic}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Generar nuevas cifras aleatorias de tráfico del día para probar el reporte y la voz"
            >
              <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Simular tráfico</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFbModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2] hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
              title="Vincular / Iniciar Sesión de Facebook Business Page (Meta Graph API v26.0)"
            >
              <span className="font-black text-xs leading-none">f</span>
              <span className="hidden sm:inline">Facebook Page</span>
            </button>

            <button
              onClick={() => {
                setIsDailySummaryOpen(true);
                setDailySummaryInitialStep('summary');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-sm hover:shadow-indigo-500/25 transition-all cursor-pointer active:scale-95"
              title="Abrir resumen y estadísticas de productos con narrador de voz"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
              <span className="hidden sm:inline">Resumen</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded font-mono">IA</span>
            </button>

            <button
              onClick={fetchAdminData}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Refrescar datos en tiempo real"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onBackToStore}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1128] hover:bg-[#1C2541] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-[#48CAE4]" />
              <span>Ver Tienda</span>
            </button>
          </div>
        </header>

        {/* Global Critical Low Stock Alert Banner (<= 5 units) */}
        {products.filter(p => (p.active ?? true) && Number(p.stock) <= 5).length > 0 && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white px-5 py-3 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn border-b border-amber-600">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide">
                  ⚠️ ALERTA DE INVENTARIO CRÍTICO ({products.filter(p => (p.active ?? true) && Number(p.stock) <= 5).length} PRODUCTOS CON STOCK ≤ 5)
                </p>
                <p className="text-[11px] text-amber-100 font-medium">
                  {products.filter(p => (p.active ?? true) && Number(p.stock) <= 5).slice(0, 3).map(p => `${p.title} (${p.stock} un.)`).join(' • ')}
                  {products.filter(p => (p.active ?? true) && Number(p.stock) <= 5).length > 3 && ` y más...`}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveSection('products');
                setEditingProduct(undefined);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 font-black text-xs hover:bg-amber-50 shadow-xs transition-colors cursor-pointer shrink-0 uppercase tracking-wider"
            >
              Revisar Inventario
            </button>
          </div>
        )}

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="bg-emerald-500 text-slate-950 px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Dynamic Section View */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          <AdminErrorBoundary sectionName={activeSection} onReset={fetchAdminData}>
            {/* GRUPO 1: RESUMEN, ASESORES Y PEDIDOS */}
            {activeSection === 'overview' && (
              <AdminOverview
                stats={stats}
                products={products}
                orders={orders}
                onRefresh={fetchAdminData}
                onNavigate={(sec) => {
                  setActiveSection(sec);
                  setEditingProduct(undefined);
                }}
              />
            )}

            {activeSection === 'commercemind_ai' && (
              <AdminCommerceMindAI
                products={products}
                stats={stats}
              />
            )}

            {activeSection === 'copilot_private_alerts' && (
              <AdminCopilotPrivateAlerts
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'pending_dropi_orders' && (
              <AdminPendingDropiOrders
                orders={orders}
                products={products}
                onRefresh={fetchAdminData}
                onEditProduct={(p) => {
                  setEditingProduct(p);
                  setActiveSection('products');
                }}
              />
            )}

            {activeSection === 'advisors_sales' && (
              <AdminAdvisorsDropi
                products={products}
              />
            )}

            {/* GRUPO 2: ENCABEZADO Y MARCA */}
            {activeSection === 'whatsapp_ai_agent' && (
              <AdminWhatsAppAIAgent
                settings={settings}
                products={products}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'social_marketing' && (
              <AdminSocialMarketing
                products={products}
                onNavigateToProduct={(p) => {
                  setEditingProduct(p);
                  setActiveSection('products');
                }}
              />
            )}

            {activeSection === 'header_ticker' && (
              <AdminHeaderTicker
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'brand_identity' && (
              <AdminBrandIdentity
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'contact_social' && (
              <AdminContactSocial
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'header_buttons' && (
              <AdminHeaderButtons
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {/* GRUPO 3: NAVEGACIÓN Y SUBPÁGINAS */}
            {activeSection === 'categories_menu' && (
              <AdminCategoriesMenu
                categories={categories}
                products={products}
                onRefresh={fetchAdminData}
              />
            )}

            {activeSection === 'exclusivity_page' && (
              <AdminExclusivitySettings
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'custom_subpages' && (
              <AdminSubpagesManager
                settings={settings}
                categories={categories}
                products={products}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {/* GRUPO 4: CUERPO DE LA TIENDA & CONVERSIÓN */}
            {activeSection === 'lucky_wheel' && (
              <AdminLuckyWheel
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'gamification_game' && (
              <AdminGamificationSettings
                settings={settings}
                products={products}
                onUpdateSettings={async (updatedSettings) => {
                  await handleSaveSettings(updatedSettings);
                }}
                showToast={showToast}
              />
            )}

            {activeSection === 'hero_banners' && (
              <AdminHeroBanners
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'home_sections' && (
              <AdminHomeSections
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'reviews' && (
              <AdminReviews
                products={products}
                showToast={showToast}
              />
            )}

            {activeSection === 'trust_badges' && (
              <AdminTrustBadges
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {activeSection === 'blog_posts' && (
              <AdminBlogPosts
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {/* GRUPO 5: INVENTARIO & CATÁLOGO */}
            {activeSection === 'products' && (
              editingProduct !== undefined ? (
                <AdminProductEditor
                  product={editingProduct}
                  categories={categories}
                  onSave={handleSaveProduct}
                  onCancel={() => setEditingProduct(undefined)}
                />
              ) : (
                <AdminProducts
                  products={products}
                  categories={categories}
                  onRefresh={fetchAdminData}
                  onEditProduct={(p) => setEditingProduct(p)}
                  onSave={handleSaveProduct}
                  onNavigateToDropiImporter={() => setActiveSection('dropi_bulk_importer')}
                  onDeleteProduct={(deletedId) => {
                    setProducts(prev => prev.filter(p => String(p.id) !== String(deletedId) && (p as any).productId !== deletedId));
                  }}
                />
              )
            )}

            {activeSection === 'dropi_bulk_importer' && (
              <DropiBulkImporter
                onImportComplete={async () => {
                  await fetchAdminData();
                  setActiveSection('products');
                  showToast('✅ Catálogo actualizado con los nuevos productos importados de Dropi.');
                }}
                onBackToProducts={() => setActiveSection('products')}
              />
            )}

            {/* GRUPO 6: VENTAS & LOGÍSTICA */}
            {activeSection === 'orders' && (
              <AdminOrders
                orders={orders}
                products={products}
                onRefresh={fetchAdminData}
                onEditProduct={(p) => {
                  setEditingProduct(p);
                  setActiveSection('products');
                }}
                onNavigate={(sec) => {
                  setActiveSection(sec);
                  setEditingProduct(undefined);
                }}
              />
            )}

            {activeSection === 'sales_calendar' && (
              <SalesCalendarSheet
                orders={orders}
                products={products}
                onRefresh={fetchAdminData}
              />
            )}

            {activeSection === 'customers' && (
              <AdminCustomers
                customers={customers}
                onRefresh={fetchAdminData}
              />
            )}

            {activeSection === 'shipping_rates' && (
              <AdminShippingRates
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {/* GRUPO 7: CMS & LEGAL */}
            {activeSection === 'legal_policies' && (
              <AdminLegalPolicies
                settings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {/* GRUPO 8: SISTEMA & SEGURIDAD */}
            {activeSection === 'system_security' && (
              <AdminSystemSecurity
                products={products}
                orders={orders}
                customers={customers}
                onRefreshAll={fetchAdminData}
              />
            )}
          </AdminErrorBoundary>
        </main>
      </div>

      {/* CommerceMind AI Daily Greeting & Voice Summary Modal */}
      <AdminDailySummaryModal
        isOpen={isDailySummaryOpen}
        initialStep={dailySummaryInitialStep}
        onClose={() => setIsDailySummaryOpen(false)}
        products={products}
        stats={stats}
      />

      {/* Admin Maintenance Mode and Bypass Token Modal */}
      <AdminMaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onRefreshData={fetchAdminData}
      />

      {/* Floating Immediate WhatsApp Notifications Banner (+57 300 878 4427) */}
      <WhatsAppAlertFloatingBanner />

      {/* Modal de Conexión & Sesión Facebook Business Page Meta Graph API v26.0 */}
      <FacebookPageConnectModal
        isOpen={isFbModalOpen}
        onClose={() => setIsFbModalOpen(false)}
        onConnected={fetchAdminData}
      />

    </div>
  );
};
