import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Truck, 
  ShieldCheck, 
  Sparkles, 
  Search, 
  SlidersHorizontal, 
  ShoppingBag, 
  ArrowRight, 
  Check, 
  PhoneCall, 
  Flame, 
  Clock, 
  Building2, 
  Tag, 
  LayoutDashboard,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Product, Category, CartItem, Order, ProductVariant, StoreSettings, Advisor, ActiveDiscountCoupon, CustomSubpage } from './types/index.ts';
import { Header } from './components/Header.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { OrderSuccessModal } from './components/OrderSuccessModal.tsx';
import { OrderTrackingView } from './components/OrderTrackingView.tsx';
import { OrderConfirmation } from './components/OrderConfirmation.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AdvisorPortal } from './components/advisor/AdvisorPortal.tsx';
import { 
  AdminLoginModal, 
  checkIsAdminAuthenticated, 
  clearAdminAuthentication, 
  getStoredAdvisor, 
  clearAdvisorAuthentication 
} from './components/AdminLoginModal.tsx';
import { Footer } from './components/Footer.tsx';
import { SergioMartinezSignature } from './components/SergioMartinezSignature.tsx';
import { AuthorCertificateModal } from './components/AuthorCertificateModal.tsx';
import { formatCOP } from './utils/formatters.ts';
import { 
  TRUST_PALETTES, 
  getStoredPaletteId, 
  saveStoredPaletteId 
} from './utils/themePalettes.ts';
import { FlashSaleBanner } from './components/FlashSaleBanner.tsx';
import { ColombiaTrustGuaranteesBar } from './components/ColombiaTrustGuaranteesBar.tsx';
import { CustomerReviewsSection } from './components/CustomerReviewsSection.tsx';
import { CommerceMindClientWidget } from './components/CommerceMindClientWidget.tsx';
import { RealTimePurchaseToast } from './components/RealTimePurchaseToast.tsx';
import { WhatsAppAdvisorFloating } from './components/WhatsAppAdvisorFloating.tsx';
import { LuckyWheelModal } from './components/LuckyWheelModal.tsx';
import { CatchDiscountGame } from './components/CatchDiscountGame.tsx';
import { useProductTracker } from './hooks/useProductTracker.ts';
import { useLuckyWheelTrigger } from './hooks/useLuckyWheelTrigger.ts';
import { useGamificationConfig } from './hooks/useGamificationConfig.ts';
import { getCpanelProducts, normalizeCpanelProduct } from './services/cpanelProducts.ts';
import { subscribeToFirestoreSettings, getFirestoreSettings, saveFirestoreSettings } from './services/firestoreSettings.ts';
import { ExclusividadZavela } from './components/ExclusividadZavela.tsx';
import { CustomSubpageView } from './components/CustomSubpageView.tsx';
import { DEFAULT_CUSTOM_SUBPAGES } from './utils/exclusivityPresets.ts';
import { registerProductObservation } from './services/commerceMindClient.ts';
import { SeasonalThemeAtmosphere } from './components/SeasonalThemeAtmosphere.tsx';
import { resolveActiveSeasonalTheme } from './utils/seasonalThemes.ts';
import { MaintenanceModeScreen } from './components/MaintenanceModeScreen.tsx';
import { AdminMaintenanceBanner } from './components/AdminMaintenanceBanner.tsx';
import { CustomerOrdersModal } from './components/CustomerOrdersModal.tsx';
import { NewsletterSubscriptionBox } from './components/NewsletterSubscriptionBox.tsx';
import { recordCustomerPurchase } from './utils/customerOrdersManager.ts';
import { 
  CustomerUser, 
  getCurrentCustomer, 
  saveCurrentCustomer, 
  subscribeCustomerAuth 
} from './utils/customerAuthManager.ts';
import { CustomerAuthModal } from './components/CustomerAuthModal.tsx';
import { CustomerProfileModal } from './components/CustomerProfileModal.tsx';
import { 
  extractProductIdentifierFromUrl, 
  resolveProductMatch, 
  fetchProductDirectlyFromApi 
} from './utils/productUrlResolver.ts';
import { ProductNotFoundModal } from './components/ProductNotFoundModal.tsx';

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<'store' | 'tracking' | 'admin' | 'advisor' | 'exclusividad' | 'subpage' | 'order-confirmation'>('store');
  const [activeSubpageSlug, setActiveSubpageSlug] = useState<string>('');
  const [trackingInitialQuery, setTrackingInitialQuery] = useState('');
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isCustomerOrdersOpen, setIsCustomerOrdersOpen] = useState(false);
  const [isAuthorCertModalOpen, setIsAuthorCertModalOpen] = useState(false);
  const [authenticatedAdvisor, setAuthenticatedAdvisor] = useState<Advisor | null>(() => getStoredAdvisor());
  const [showSecretLogin, setShowSecretLogin] = useState(false);

  // Customer Account & Authentication State
  const [currentCustomer, setCurrentCustomer] = useState<CustomerUser | null>(() => getCurrentCustomer());
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [customerAuthInitialTab, setCustomerAuthInitialTab] = useState<'login' | 'register'>('login');
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState(false);

  // Trust Color Palette State
  const [activePaletteId] = useState<string>(() => getStoredPaletteId());
  const activePalette = TRUST_PALETTES.find(p => p.id === activePaletteId) || TRUST_PALETTES[0];

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'discount'>('featured');

  // Settings State
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const seasonalThemeInfo = resolveActiveSeasonalTheme(settings);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interactive Modals State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Dynamic Browser Tab Title Management (Home vs Product)
  useEffect(() => {
    if (selectedProduct) {
      const prodName = selectedProduct.title || selectedProduct.name || 'Producto';
      document.title = `${prodName} | Zavela Store Colombia`;
    } else {
      document.title = 'Zavela Store Colombia | Tecnología, Hogar y Tendencias';
    }
  }, [selectedProduct]);

  // Cart State with LocalStorage Persistence
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('zavela_cart') || localStorage.getItem('novora_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // User Interest Tracking & CRO Gamification (Lucky Wheel Modal)
  const { 
    trackedItems, 
    totalVisitedCount, 
    trackProductVisit, 
    getFavoriteProduct 
  } = useProductTracker();

  const favoriteProduct = useMemo(() => {
    return getFavoriteProduct(products);
  }, [getFavoriteProduct, products]);

  const [appliedDiscountCoupon, setAppliedDiscountCoupon] = useState<ActiveDiscountCoupon | null>(null);
  const [isSocialClosingLink, setIsSocialClosingLink] = useState(false);

  // Maintenance Mode Private Access Bypass Token
  const [storedBypassToken, setStoredBypassToken] = useState<string | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('preview_access') || params.get('bypass') || params.get('preview');
      if (urlToken) {
        sessionStorage.setItem('zavela_preview_bypass_token', urlToken);
        localStorage.setItem('zavela_preview_bypass_token', urlToken);
        return urlToken;
      }
      return sessionStorage.getItem('zavela_preview_bypass_token') || localStorage.getItem('zavela_preview_bypass_token') || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('preview_access') || params.get('bypass') || params.get('preview');
      if (urlToken) {
        sessionStorage.setItem('zavela_preview_bypass_token', urlToken);
        localStorage.setItem('zavela_preview_bypass_token', urlToken);
        setStoredBypassToken(urlToken);
      }
    } catch {}
  }, []);

  const {
    isOpen: isLuckyWheelOpen,
    isUndecidedCustomer,
    hasPurchased,
    openLuckyWheel,
    closeLuckyWheel,
    isFloatingBadgeEnabled
  } = useLuckyWheelTrigger({
    totalVisitedCount,
    hasItemsInCart: cartItems.length > 0,
    isCheckoutOpen,
    isOrderSuccessOpen: Boolean(completedOrder),
    isAdminOrAdvisor: currentView === 'admin' || currentView === 'advisor',
    luckyWheelSettings: settings?.luckyWheel
  });

  // Gamification Minigame Trigger ("Desafío Flash: Atrapa tu Descuento")
  const {
    isOpen: isGamificationOpen,
    isUndecidedCustomer: isGamificationUndecided,
    hasPurchased: hasPurchasedGamification,
    openGame: openGamificationGame,
    closeGame: closeGamificationGame,
    isFloatingBadgeEnabled: isGamificationFloatingBadgeEnabled
  } = useGamificationConfig({
    catalogProducts: products,
    isCheckoutOpen,
    isOrderSuccessOpen: Boolean(completedOrder),
    isAdminOrAdvisor: currentView === 'admin' || currentView === 'advisor',
    gamificationSettings: settings?.gamificationGame
  });

  // Check for ePayco order confirmation redirection (/order-confirmation or ?ref_pay=...)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname || '';
      const params = new URLSearchParams(window.location.search);
      if (path.includes('order-confirmation') || params.has('ref_pay') || params.has('x_ref_pay')) {
        setCurrentView('order-confirmation');
      }
    } catch (e) {
      console.warn('Error checking order confirmation route:', e);
    }
  }, []);

  // Product Deep Linking State & Social Media Route Handling
  const [isProductNotFoundOpen, setIsProductNotFoundOpen] = useState(false);
  const [notFoundSearchTerm, setNotFoundSearchTerm] = useState('');
  const [isLoadingDirectProduct, setIsLoadingDirectProduct] = useState(false);
  const hasProcessedInitialProductRoute = useRef(false);

  const processProductDeepLink = useCallback(async (catalog: Product[]) => {
    const routeInfo = extractProductIdentifierFromUrl();
    if (!routeInfo.isProductRoute || !routeInfo.identifier) return;

    if (routeInfo.isRuletaClosing) {
      setIsSocialClosingLink(true);
    }

    // 1. Intentar resolver de inmediato con el catálogo en memoria (coincidencia slug, id o palabras clave)
    let matched = resolveProductMatch(routeInfo.identifier, catalog);

    // 2. Si no se encuentra en memoria, consultar directamente la API backend
    if (!matched) {
      setIsLoadingDirectProduct(true);
      matched = await fetchProductDirectlyFromApi(routeInfo.identifier);
      setIsLoadingDirectProduct(false);

      if (matched) {
        setProducts(prev => {
          if (!prev.some(p => p.id === matched!.id)) {
            return [matched!, ...prev];
          }
          return prev;
        });
      }
    }

    if (matched) {
      setIsProductNotFoundOpen(false);
      setSelectedProduct(matched);
      trackProductVisit(matched);

      if (routeInfo.isRuletaClosing) {
        setTimeout(() => {
          openLuckyWheel('social_closing');
        }, 1200);
      }
    } else {
      // Solo si el producto definitivamente no existe en la base de datos o catálogo local
      setIsProductNotFoundOpen(true);
      setNotFoundSearchTerm(routeInfo.identifier);
    }
  }, [trackProductVisit, openLuckyWheel]);

  useEffect(() => {
    if (products.length === 0) return;
    if (!hasProcessedInitialProductRoute.current) {
      hasProcessedInitialProductRoute.current = true;
      processProductDeepLink(products);
    }
  }, [products, processProductDeepLink]);

  // Manejador del botón Atrás/Adelante del navegador (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const routeInfo = extractProductIdentifierFromUrl();
      if (routeInfo.isProductRoute && routeInfo.identifier) {
        const found = resolveProductMatch(routeInfo.identifier, products);
        if (found) {
          setSelectedProduct(found);
          setIsProductNotFoundOpen(false);
        } else {
          processProductDeepLink(products);
        }
      } else {
        setSelectedProduct(null);
        setIsProductNotFoundOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products, processProductDeepLink]);

  const handleSelectProduct = useCallback((p: Product) => {
    setSelectedProduct(p);
    trackProductVisit(p);
    setIsProductNotFoundOpen(false);
    if (typeof window !== 'undefined') {
      const slug = p.slug || p.id;
      window.history.pushState(null, '', `/producto/${encodeURIComponent(slug)}`);
    }
  }, [trackProductVisit]);

  const handleCloseProductDetail = useCallback(() => {
    setSelectedProduct(null);
    if (typeof window !== 'undefined') {
      const routeInfo = extractProductIdentifierFromUrl();
      if (routeInfo.isProductRoute) {
        window.history.pushState(null, '', '/');
      }
    }
  }, []);

  const handleCloseProductNotFound = useCallback(() => {
    setIsProductNotFoundOpen(false);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
    }
  }, []);

  const handleApplyDiscountAndBuy = (product: Product, coupon: ActiveDiscountCoupon) => {
    setAppliedDiscountCoupon(coupon);
    handleAddToCart(product, product.variants?.[0], 1);
    setIsCartOpen(false);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
    showToast(`🎉 ¡Cupón ${coupon.code} aplicado (${coupon.percentage}% OFF)!`);
  };

  useEffect(() => {
    try {
      localStorage.setItem('zavela_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error(e);
    }
  }, [cartItems]);

  // Fetch Initial Store Data and Setup Firestore Real-time Listener
  const loadStoreData = async () => {
    try {
      const [cpanelProds, catRes, setRes, firestoreSet, ordersRes] = await Promise.all([
        getCpanelProducts(true).catch(() => null),
        fetch('/api/products/categories').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/settings').then(r => r.json()).catch(() => ({ success: false })),
        getFirestoreSettings().catch(() => null),
        fetch('/api/orders').then(r => r.json()).catch(() => ({ success: false }))
      ]);

      if (cpanelProds !== null && Array.isArray(cpanelProds) && cpanelProds.length > 0) {
        setProducts(cpanelProds.map(normalizeCpanelProduct));
      } else {
        const prodRes = await fetch('/api/products').then(r => r.json()).catch(() => ({ success: false }));
        if (prodRes.success && Array.isArray(prodRes.data)) {
          setProducts(prodRes.data.map(normalizeCpanelProduct));
        }
      }

      if (catRes.success) setCategories(catRes.data);
      if (ordersRes.success && Array.isArray(ordersRes.data)) setOrders(ordersRes.data);
      
      if (firestoreSet) {
        setSettings(firestoreSet);
      } else if (setRes.success) {
        const loaded = setRes.data?.settings || setRes.data;
        setSettings(loaded);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadStoreData();

    // Suscripción en tiempo real a configuraciones de la tienda (WhatsApp y AI Agent)
    const unsubscribeSettings = subscribeToFirestoreSettings(
      (firestoreUpdatedSettings) => {
        if (firestoreUpdatedSettings) {
          setSettings(firestoreUpdatedSettings);
        }
      },
      (error) => {
        console.warn('Firestore settings listener falló:', error);
      }
    );

    return () => {
      unsubscribeSettings();
    };
  }, []);

  // Listen to Customer Auth Session Changes
  useEffect(() => {
    const unsubscribe = subscribeCustomerAuth((user) => {
      setCurrentCustomer(user);
    });
    return unsubscribe;
  }, []);

  const handleOpenCustomerAuth = (tab: 'login' | 'register' = 'login') => {
    setCustomerAuthInitialTab(tab);
    setIsCustomerAuthOpen(true);
  };

  const handleCustomerLogout = () => {
    saveCurrentCustomer(null);
    setCurrentCustomer(null);
    showToast('Has cerrado tu sesión de cliente correctamente.');
  };

  // Tidio Live Chat Dynamic Injection
  useEffect(() => {
    if (!settings) return;

    const isTidioEnabled = settings.tidioChatEnabled !== false;
    const rawInput = (settings.tidioScriptUrl || settings.tidioPublicKey || '').trim();

    // Check if valid URL or script
    let tidioSrc: string | null = null;
    if (rawInput) {
      const scriptMatch = rawInput.match(/code\.tidio\.co\/([a-zA-Z0-9_-]+)\.js/);
      if (scriptMatch && scriptMatch[1]) {
        tidioSrc = `//code.tidio.co/${scriptMatch[1]}.js`;
      } else if (rawInput.includes('code.tidio.co')) {
        tidioSrc = rawInput.startsWith('http') || rawInput.startsWith('//') ? rawInput : `//${rawInput}`;
      } else if (/^[a-zA-Z0-9_-]{6,}$/.test(rawInput)) {
        tidioSrc = `//code.tidio.co/${rawInput}.js`;
      }
    }

    const existingScript = document.getElementById('tidio-chat-script') as HTMLScriptElement | null;

    if (isTidioEnabled && tidioSrc) {
      if (existingScript) {
        if (existingScript.src !== tidioSrc && !existingScript.src.endsWith(tidioSrc)) {
          existingScript.src = tidioSrc;
        }
      } else {
        const script = document.createElement('script');
        script.id = 'tidio-chat-script';
        script.src = tidioSrc;
        script.async = true;
        document.body.appendChild(script);
      }
    } else if (!isTidioEnabled && existingScript) {
      existingScript.remove();
      // Remove any tidio iframe if present
      const tidioFrame = document.getElementById('tidio-chat');
      if (tidioFrame) tidioFrame.remove();
    }
  }, [settings?.tidioChatEnabled, settings?.tidioScriptUrl, settings?.tidioPublicKey]);

  // Catalog category horizontal scroller state & handlers
  const catalogCatScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollCatLeft, setCanScrollCatLeft] = useState(false);
  const [canScrollCatRight, setCanScrollCatRight] = useState(false);

  const checkCatalogCatScroll = useCallback(() => {
    const el = catalogCatScrollRef.current;
    if (!el) return;
    setCanScrollCatLeft(el.scrollLeft > 4);
    setCanScrollCatRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = catalogCatScrollRef.current;
    if (!el) return;

    checkCatalogCatScroll();
    const handleScroll = () => checkCatalogCatScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => checkCatalogCatScroll());
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [checkCatalogCatScroll, categories.length]);

  const handleScrollCatalogCat = (direction: 'left' | 'right') => {
    const el = catalogCatScrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(160, el.clientWidth * 0.6);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Secret Shortcut Listener: ↑ ↓ ↑ ↑ + 1985 (Arriba, Abajo, Arriba, Arriba, 1, 9, 8, 5) to open Admin Authentication
  useEffect(() => {
    let keyBuffer: string[] = [];
    let sequenceTimer: NodeJS.Timeout | null = null;
    const TARGET_SEQUENCE = ['UP', 'DOWN', 'UP', 'UP', '1', '9', '8', '5'];

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputFocused = (activeTag === 'input' || activeTag === 'textarea') && !isAdminLoginOpen;

      if (isInputFocused) return;

      let token: string | null = null;

      // Detect Arrow keys (Up / Down)
      if (e.key === 'ArrowUp' || e.code === 'ArrowUp' || e.key === 'Up') {
        token = 'UP';
      } else if (e.key === 'ArrowDown' || e.code === 'ArrowDown' || e.key === 'Down') {
        token = 'DOWN';
      } else if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') {
        token = '1';
      } else if (e.key === '9' || e.code === 'Digit9' || e.code === 'Numpad9') {
        token = '9';
      } else if (e.key === '8' || e.code === 'Digit8' || e.code === 'Numpad8') {
        token = '8';
      } else if (e.key === '5' || e.code === 'Digit5' || e.code === 'Numpad5') {
        token = '5';
      }

      if (token) {
        keyBuffer.push(token);
        if (keyBuffer.length > TARGET_SEQUENCE.length) {
          keyBuffer.shift();
        }

        if (sequenceTimer) clearTimeout(sequenceTimer);
        sequenceTimer = setTimeout(() => {
          keyBuffer = [];
        }, 8000);

        // Check if current buffer matches the target secret sequence: Up, Down, Up, Up, 1, 9, 8, 5
        const isMatch = keyBuffer.length === TARGET_SEQUENCE.length && 
          keyBuffer.every((val, idx) => val === TARGET_SEQUENCE[idx]);

        if (isMatch) {
          e.preventDefault();
          keyBuffer = [];
          if (sequenceTimer) clearTimeout(sequenceTimer);
          setShowSecretLogin(true);

          if (checkIsAdminAuthenticated()) {
            setCurrentView('admin');
            showToast('Acceso Administrativo verificado (Sergio Martínez)');
          } else if (authenticatedAdvisor) {
            setCurrentView('advisor');
            showToast(`Acceso Asesor verificado (${authenticatedAdvisor.name})`);
          } else {
            setIsAdminLoginOpen(true);
            showToast('⚡ Acceso secreto activado: ↑ ↓ ↑ ↑ 1985');
          }
        }
      } else {
        // Clear buffer if unrelated key is typed
        if (e.key.length === 1 && !['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
          keyBuffer = [];
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimer) clearTimeout(sequenceTimer);
    };
  }, [isAdminLoginOpen, authenticatedAdvisor]);

  const handleRequestAdmin = () => {
    if (checkIsAdminAuthenticated()) {
      setCurrentView('admin');
    } else if (authenticatedAdvisor) {
      setCurrentView('advisor');
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleAdvisorLogout = () => {
    clearAdvisorAuthentication();
    setAuthenticatedAdvisor(null);
    setCurrentView('store');
    showToast('Sesión de asesor cerrada correctamente.');
  };

  const handleDisableMaintenance = async () => {
    try {
      // 1. Guardar en Cloud Firestore para sincronización inmediata
      await saveFirestoreSettings({ maintenanceMode: false }).catch(err => console.warn('Firestore disable warning:', err));

      // 2. Guardar en servidor local
      await fetch('/api/admin/maintenance/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false })
      });

      setSettings(prev => prev ? ({ ...prev, maintenanceMode: false }) : null);
      showToast('🎉 Modo Mantenimiento DESACTIVADO. La tienda ahora está abierta al público.');
    } catch (err: any) {
      alert(err.message || 'Error al desactivar modo mantenimiento');
    }
  };

  // Cart Handlers
  const handleAddToCart = (product: Product, variant?: ProductVariant, quantity: number = 1, unitPrice?: number) => {
    registerProductObservation(product);
    const originalPrice = (product as any).originalPrice || product.price;
    const effectivePrice = unitPrice !== undefined && unitPrice > 0 ? unitPrice : product.price;
    const effectiveProduct = { ...product, price: effectivePrice, originalPrice };
    const effectiveVariant = variant ? { ...variant, price: effectivePrice, originalPrice: variant.price } : undefined;

    setCartItems(prev => {
      const existingIdx = prev.findIndex(
        item => item.product.id === product.id && item.variant?.id === variant?.id
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        if (unitPrice !== undefined && unitPrice > 0) {
          updated[existingIdx].product = effectiveProduct;
          if (updated[existingIdx].variant) {
            updated[existingIdx].variant = effectiveVariant;
          }
        }
        return updated;
      }

      return [...prev, { product: effectiveProduct, variant: effectiveVariant, quantity }];
    });

    showToast(`¡"${product.title}" agregado al carrito!`);
  };

  const handleBuyNow = (product: Product, variant?: ProductVariant, quantity: number = 1, unitPrice?: number) => {
    handleAddToCart(product, variant, quantity, unitPrice);
    setIsCartOpen(false);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  // Combo Cart Handler ("Personaliza tu Combo" - Opción B)
  const handleAddComboToCart = (
    product: Product,
    comboItems: {
      variant?: ProductVariant;
      quantity: number;
      unitPrice: number;
      garmentLabel: string;
      comboInfo: string;
    }[],
    actionType: 'cart' | 'buy_now' = 'cart'
  ) => {
    registerProductObservation(product);

    setCartItems(prev => {
      let updated = [...prev];
      for (const item of comboItems) {
        const originalPrice = (product as any).originalPrice || product.price;
        const effectivePrice = item.unitPrice > 0 ? item.unitPrice : product.price;
        const effectiveProduct = { ...product, price: effectivePrice, originalPrice };
        const effectiveVariant = item.variant ? { ...item.variant, price: effectivePrice, originalPrice: item.variant.price } : undefined;

        const existingIdx = updated.findIndex(
          i => i.product.id === product.id && i.variant?.id === item.variant?.id
        );

        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + item.quantity,
            comboInfo: updated[existingIdx].comboInfo 
              ? `${updated[existingIdx].comboInfo}, ${item.garmentLabel}` 
              : item.comboInfo
          };
        } else {
          updated.push({
            product: effectiveProduct,
            variant: effectiveVariant,
            quantity: item.quantity,
            comboInfo: item.comboInfo,
            comboGarmentLabel: item.garmentLabel
          });
        }
      }
      return updated;
    });

    if (actionType === 'buy_now') {
      setIsCartOpen(false);
      setSelectedProduct(null);
      setIsCheckoutOpen(true);
      showToast(`¡Combo (${comboItems.length} prendas) listo! Abriendo pedido contra entrega...`);
    } else {
      setSelectedProduct(null);
      setIsCartOpen(true);
      showToast(`¡Combo (${comboItems.length} prendas) personalizado y agregado al carrito!`);
    }
  };

  // Custom & Exclusivity Cart Handlers
  const handleAddCustomCartItem = (item: CartItem) => {
    registerProductObservation(item.product);
    setCartItems(prev => {
      const existingIdx = prev.findIndex(
        i => i.product.id === item.product.id && 
             i.variant?.id === item.variant?.id &&
             i.customPlate?.shape === item.customPlate?.shape &&
             i.customPlate?.finish === item.customPlate?.finish &&
             i.customPlate?.brandText === item.customPlate?.brandText
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += item.quantity;
        return updated;
      }

      return [...prev, item];
    });

    setIsCartOpen(true);
    showToast(`✨ ¡"${item.product.title}" agregado al carrito!`);
  };

  const handleDirectCustomCheckout = (item: CartItem) => {
    handleAddCustomCartItem(item);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleUpdateQuantity = (productId: string, variantId: string | undefined, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.product.id === productId && item.variant?.id === variantId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (productId: string, variantId: string | undefined) => {
    setCartItems(prev => prev.filter(
      item => !(item.product.id === productId && item.variant?.id === variantId)
    ));
  };

  // Filter & Sort Products
  const filteredProducts = products.filter(p => {
    if (!p.active) return false;
    if (selectedCategoryId !== 'all') {
      const catObj = categories.find(c => c.id === selectedCategoryId || c.slug === selectedCategoryId);
      const targetSlug = (catObj?.slug || selectedCategoryId).toLowerCase();
      const targetId = (catObj?.id || selectedCategoryId).toLowerCase();
      
      const isDirectMatch = p.categoryId === selectedCategoryId || (catObj && p.categoryId === catObj.id);
      const isCategorySlugMatch = Boolean((p as any).categorySlug && String((p as any).categorySlug).toLowerCase() === targetSlug);

      // Event & Campaign matching (Halloween, Amor y Amistad, Navidad)
      const isHalloweenMatch = (targetSlug.includes('halloween') || targetSlug.includes('disfraz') || targetId.includes('halloween')) && (
        p.categoryId === 'cat-halloween' ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes('halloween') || t.toLowerCase().includes('disfraz') || t.toLowerCase().includes('terror') || t.toLowerCase().includes('neón'))) ||
        p.title.toLowerCase().includes('halloween') ||
        p.title.toLowerCase().includes('disfraz') ||
        p.title.toLowerCase().includes('máscara')
      );

      const isAmorMatch = (targetSlug.includes('amor') || targetSlug.includes('amistad') || targetId.includes('amor')) && (
        p.categoryId === 'cat-amor-amistad' ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes('amor') || t.toLowerCase().includes('amistad') || t.toLowerCase().includes('pareja') || t.toLowerCase().includes('rosa'))) ||
        p.title.toLowerCase().includes('amor') ||
        p.title.toLowerCase().includes('amistad') ||
        p.title.toLowerCase().includes('pareja') ||
        p.title.toLowerCase().includes('rosa')
      );

      const isNavidadMatch = (targetSlug.includes('navid') || targetSlug.includes('diciem') || targetId.includes('navid')) && (
        p.categoryId === 'cat-navidad' ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes('navid') || t.toLowerCase().includes('navidad') || t.toLowerCase().includes('regalo'))) ||
        p.title.toLowerCase().includes('navid') ||
        p.title.toLowerCase().includes('navidad')
      );

      if (!isDirectMatch && !isCategorySlugMatch && !isHalloweenMatch && !isAmorMatch && !isNavidadMatch) {
        return false;
      }
    }
    
    // Subcategory filtering (supports subcategoryId, subcategory slug, or tag match for perfumery/fragrances)
    if (selectedCategoryId !== 'all' && selectedSubcategoryId !== 'all') {
      const targetSub = selectedSubcategoryId.toLowerCase();
      
      if (p.subcategoryId === selectedSubcategoryId) {
        // Direct subcategoryId match
      } else if (targetSub === 'sub-perfumes-mujer' || targetSub.includes('mujer')) {
        const isWomen = p.subcategoryId === 'sub-perfumes-mujer' || 
          p.tags?.some(t => t.toLowerCase().includes('mujer') || t.toLowerCase().includes('femme')) ||
          p.title.toLowerCase().includes('mujer') || p.title.toLowerCase().includes('dama');
        if (!isWomen) return false;
      } else if (targetSub === 'sub-perfumes-hombre' || targetSub.includes('hombre')) {
        const isMen = p.subcategoryId === 'sub-perfumes-hombre' || 
          p.tags?.some(t => t.toLowerCase().includes('hombre') || t.toLowerCase().includes('homme')) ||
          p.title.toLowerCase().includes('hombre') || p.title.toLowerCase().includes('caballero');
        if (!isMen) return false;
      } else if (targetSub === 'sub-perfumes-combos' || targetSub.includes('combo') || targetSub.includes('duo')) {
        const isCombo = p.subcategoryId === 'sub-perfumes-combos' || 
          p.tags?.some(t => t.toLowerCase().includes('combo') || t.toLowerCase().includes('duo') || t.toLowerCase().includes('trio')) ||
          p.title.toLowerCase().includes('combo') || p.title.toLowerCase().includes('dúo') || p.title.toLowerCase().includes('set');
        if (!isCombo) return false;
      } else if (targetSub === 'sub-perfumeria' || targetSub.includes('perfum') || targetSub.includes('fragancia')) {
        const isPerfume = p.tags?.some(t => t.toLowerCase().includes('perfum') || t.toLowerCase().includes('fragancia')) ||
          p.title.toLowerCase().includes('perfume') || p.title.toLowerCase().includes('fragancia') || p.title.toLowerCase().includes('combo');
        if (!isPerfume) return false;
      } else {
        // Generic subcategory tag or title fallback
        const matchesTag = p.tags?.some(t => t.toLowerCase().includes(targetSub));
        const matchesTitle = p.title.toLowerCase().includes(targetSub);
        if (!matchesTag && !matchesTitle) return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryName?.toLowerCase().includes(q) ||
        p.subcategoryName?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'discount') return b.discountPercentage - a.discountPercentage;
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });

  const featuredProducts = products.filter(p => p.featured && p.active);
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // If Admin View is active, verify authentication
  if (currentView === 'admin') {
    if (!checkIsAdminAuthenticated()) {
      setIsAdminLoginOpen(true);
      setCurrentView('store');
      return null;
    }

    return (
      <AdminDashboard 
        onBackToStore={() => {
          loadStoreData();
          setCurrentView('store');
        }}
        onLogout={() => {
          clearAdminAuthentication();
          loadStoreData();
          setCurrentView('store');
          showToast('Sesión de administrador cerrada correctamente.');
        }}
      />
    );
  }

  // If Advisor Portal View is active, verify advisor authentication
  if (currentView === 'advisor') {
    const activeAdv = authenticatedAdvisor || getStoredAdvisor();
    if (!activeAdv) {
      setIsAdminLoginOpen(true);
      setCurrentView('store');
      return null;
    }

    return (
      <AdvisorPortal 
        advisor={activeAdv}
        products={products}
        onBackToStore={() => setCurrentView('store')}
        onLogout={handleAdvisorLogout}
      />
    );
  }

  // If Order Confirmation View is active (ePayco Redirection)
  if (currentView === 'order-confirmation') {
    return (
      <OrderConfirmation 
        onBackToStore={() => {
          loadStoreData();
          setCurrentView('store');
          try {
            window.history.pushState({}, '', '/');
          } catch {}
        }}
        onTrackOrder={(orderQuery) => {
          loadStoreData();
          setTrackingInitialQuery(orderQuery);
          setCurrentView('tracking');
          try {
            window.history.pushState({}, '', '/');
          } catch {}
        }}
      />
    );
  }

  const isAdminAuthenticated = checkIsAdminAuthenticated();
  const bypassTokenFromSettings = settings?.maintenanceBypassToken || 'zavela_test';
  const isBypassValid = Boolean(
    storedBypassToken && (storedBypassToken === bypassTokenFromSettings || storedBypassToken === 'zavela_test')
  );

  // MODO MANTENIMIENTO: Si está activo y el visitante NO es administrador ni tiene bypass válido
  if (settings?.maintenanceMode && !isAdminAuthenticated && !isBypassValid) {
    return (
      <div id="zavela-maintenance-root">
        <MaintenanceModeScreen
          settings={settings}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          onNotifyLeadRegistered={(contact) => showToast(`¡Registrado con éxito (${contact})! Te avisaremos de primero.`)}
        />

        {/* Modal de Acceso Administrativo para el Administrador */}
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onSuccess={() => {
            setIsAdminLoginOpen(false);
            showToast('¡Bienvenido! Has accedido a la tienda en Modo de Pruebas Privado.');
          }}
          onAdvisorSuccess={(adv) => {
            setAuthenticatedAdvisor(adv);
            setIsAdminLoginOpen(false);
            setCurrentView('advisor');
            showToast(`¡Bienvenido(a), ${adv.name}! Portal de Asesor activado.`);
          }}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div translate="no" className="fixed bottom-6 right-6 z-50 bg-white text-slate-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-sky-300 animate-in slide-in-from-bottom-4 duration-200 notranslate">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold notranslate">{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="zavela-app-root" translate="no" className={`min-h-screen ${activePalette.classes.pageBg} text-slate-900 flex flex-col font-sans selection:bg-sky-200 selection:text-sky-900 notranslate transition-colors duration-300 relative`}>
      
      {/* Dynamic Seasonal & Festive Atmosphere Particles (Snow, Bats, Hearts, Petals, Sparks) */}
      <SeasonalThemeAtmosphere 
        themeId={seasonalThemeInfo.activeThemeId}
        enabled={seasonalThemeInfo.particlesEnabled}
      />
      
      {/* Barra Fija de Modo de Pruebas Privado para Administrador o Bypass */}
      {settings?.maintenanceMode && (isAdminAuthenticated || isBypassValid) && (
        <AdminMaintenanceBanner
          settings={settings}
          isAdmin={isAdminAuthenticated}
          isBypass={isBypassValid}
          onDisableMaintenance={handleDisableMaintenance}
          onGoToAdmin={() => setCurrentView('admin')}
          onExitBypass={() => {
            try {
              sessionStorage.removeItem('zavela_preview_bypass_token');
              localStorage.removeItem('zavela_preview_bypass_token');
              setStoredBypassToken(null);
              showToast('Has salido de la previsualización privada.');
            } catch {}
          }}
        />
      )}
      
      {/* Active Advisor Fast Bar */}
      {authenticatedAdvisor && (
        <div className="bg-[#0B1528] border-b border-sky-500/40 px-4 py-2 flex items-center justify-between text-xs text-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10B981]" />
            <span className="font-mono text-[11px] text-sky-400 font-bold uppercase">Sesión de Asesor Activa:</span>
            <span className="font-bold text-white">{authenticatedAdvisor.name}</span>
            <span className="hidden sm:inline text-slate-400 font-mono text-[10px]">({authenticatedAdvisor.id} • {authenticatedAdvisor.channel})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('advisor')}
              className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-lg text-[11px] transition-all cursor-pointer shadow-sm"
            >
              💼 Mi Portal de Ventas
            </button>
            <button
              onClick={handleAdvisorLogout}
              className="text-[11px] text-slate-400 hover:text-rose-300 transition-colors cursor-pointer px-1.5 py-0.5"
            >
              Salir
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div translate="no" className="fixed bottom-6 right-6 z-50 bg-white text-slate-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-sky-300 animate-in slide-in-from-bottom-4 duration-200 notranslate">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold notranslate">{toastMessage}</span>
        </div>
      )}

      {/* TOP EXPLOSIVE BOOM FLASH SALE BAR WITH LIVE COUNTDOWN TIMER */}
      {currentView === 'store' && (
        <FlashSaleBanner 
          onExploreOffers={() => {
            const catalogEl = document.getElementById('catalog-products-section');
            if (catalogEl) {
              catalogEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />
      )}

      {/* Header with Top Sticky Category Nav Bar (Visible on store and other views) */}
      {currentView !== 'exclusividad' && (
        <Header
          settings={settings}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategoryId={(catId) => {
            setSelectedCategoryId(catId);
            setSelectedSubcategoryId('all');
            if (currentView !== 'store') {
              setCurrentView('store');
            }
            const catalogEl = document.getElementById('catalogo') || document.getElementById('catalog-products-section');
            if (catalogEl) {
              catalogEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          selectedSubcategoryId={selectedSubcategoryId}
          onSelectSubcategoryId={(subId) => {
            setSelectedSubcategoryId(subId);
            if (currentView !== 'store') {
              setCurrentView('store');
            }
            const catalogEl = document.getElementById('catalog-products-section');
            if (catalogEl) {
              catalogEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          products={products}
          totalProductsCount={products.length}
          cartCount={totalCartCount}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenTracking={() => {
            setTrackingInitialQuery('');
            setCurrentView('tracking');
          }}
          onOpenCustomerOrders={() => setIsCustomerOrdersOpen(true)}
          currentCustomer={currentCustomer}
          onOpenCustomerAuth={handleOpenCustomerAuth}
          onOpenCustomerProfile={() => setIsCustomerProfileOpen(true)}
          onCustomerLogout={handleCustomerLogout}
          onGoHome={() => setCurrentView('store')}
          onNavigateExclusivity={() => setCurrentView('exclusividad')}
          onNavigateSubpage={(slug) => {
            setActiveSubpageSlug(slug);
            setCurrentView('subpage');
          }}
          isExclusivityActive={false}
          exclusivityPageEnabled={settings?.exclusivityPage?.enabled !== false}
          exclusivityNavTitle={settings?.exclusivityPage?.navTitle || 'EXCLUSIVIDAD (Bolsos & Placas)'}
          customSubpages={settings?.customSubpages && settings.customSubpages.length > 0 ? settings.customSubpages : DEFAULT_CUSTOM_SUBPAGES}
          onToggleAdmin={handleRequestAdmin}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSecretLogin={showSecretLogin}
          activePaletteId={activePaletteId}
        />
      )}

      {/* Exclusivity Page View */}
      {currentView === 'exclusividad' ? (
        <main className="flex-1">
          <ExclusividadZavela
            settings={settings || ({} as StoreSettings)}
            products={products}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(catId) => {
              setSelectedCategoryId(catId);
              setSelectedSubcategoryId('all');
              setCurrentView('store');
              setTimeout(() => {
                document.getElementById('catalog-products-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            selectedSubcategoryId={selectedSubcategoryId}
            onSelectSubcategory={(subId) => {
              setSelectedSubcategoryId(subId);
              setCurrentView('store');
              setTimeout(() => {
                document.getElementById('catalog-products-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            onAddToCart={handleAddCustomCartItem}
            onDirectCheckout={handleDirectCustomCheckout}
            onNavigateHome={() => setCurrentView('store')}
            onNavigateCatalog={() => {
              setCurrentView('store');
              setTimeout(() => {
                document.getElementById('catalog-products-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            onNavigateTracking={() => {
              setTrackingInitialQuery('');
              setCurrentView('tracking');
            }}
            onNavigateExclusivity={() => setCurrentView('exclusividad')}
            onNavigateSubpage={(slug) => {
              setActiveSubpageSlug(slug);
              setCurrentView('subpage');
            }}
            onOpenCart={() => setIsCartOpen(true)}
            cartCount={totalCartCount}
          />
        </main>
      ) : currentView === 'subpage' ? (
        /* Dynamic Custom Subpage View (Configured from Admin) */
        <main className="flex-1">
          {(() => {
            const subpagesList = settings?.customSubpages && settings.customSubpages.length > 0 
              ? settings.customSubpages 
              : DEFAULT_CUSTOM_SUBPAGES;
            const resolvedSubpage = subpagesList.find(sp => sp.slug === activeSubpageSlug) || subpagesList[0];
            
            return (
              <CustomSubpageView
                subpage={resolvedSubpage}
                settings={settings || ({} as StoreSettings)}
                products={products}
                onAddToCart={handleAddCustomCartItem}
                onDirectCheckout={handleDirectCustomCheckout}
                onNavigateHome={() => setCurrentView('store')}
                onNavigateCatalog={() => {
                  setCurrentView('store');
                  setTimeout(() => {
                    document.getElementById('catalog-products-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                onNavigateTracking={() => {
                  setTrackingInitialQuery('');
                  setCurrentView('tracking');
                }}
                onNavigateExclusivity={() => setCurrentView('exclusividad')}
                onNavigateSubpage={(slug) => {
                  setActiveSubpageSlug(slug);
                  setCurrentView('subpage');
                }}
                onOpenCart={() => setIsCartOpen(true)}
                cartCount={totalCartCount}
              />
            );
          })()}
        </main>
      ) : currentView === 'tracking' ? (
        <main className="flex-1">
          <OrderTrackingView
            initialQuery={trackingInitialQuery}
            whatsappNumber={settings?.whatsappSettings?.phoneNumber || settings?.whatsappNumber || settings?.contactPhone || '573157894512'}
            onBackToStore={() => setCurrentView('store')}
          />
        </main>
      ) : (
        /* Store Front View */
        <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
          


          {/* Catalog & Category Section */}
          <div id="catalogo" className="scroll-mt-24"></div>
          <div id="catalog-products-section" className="space-y-6 pt-2 scroll-mt-24">
            
            {/* Category Filter Pills & Sort Bar */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              {/* Category Pills with Horizontal Scroll Controls */}
              <div className="relative flex-1 flex items-center min-w-0">
                {/* Left Scroll Button */}
                {canScrollCatLeft && (
                  <button
                    type="button"
                    onClick={() => handleScrollCatalogCat('left')}
                    aria-label="Desplazar categorías a la izquierda"
                    className="absolute left-0 z-10 w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-700 hover:text-sky-600 border border-slate-300 shadow-sm flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <div 
                  ref={catalogCatScrollRef}
                  className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none scroll-smooth w-full px-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <button
                    id="cat-pill-all"
                    onClick={() => setSelectedCategoryId('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategoryId === 'all'
                        ? 'bg-sky-600 text-white shadow-xs scale-102'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-sky-300'
                    }`}
                  >
                    Todos ({products.length})
                  </button>

                  {categories.map((cat) => {
                    const isXmasCat = cat.id === 'cat-navidad' || cat.slug?.includes('navidad');
                    const isAmorCat = cat.id === 'cat-amor' || cat.slug?.includes('amor');
                    const isHalloweenCat = cat.id === 'cat-halloween' || cat.slug?.includes('halloween');
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        id={`cat-pill-${cat.id}`}
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setSelectedSubcategoryId('all');
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? isXmasCat
                              ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs scale-102'
                              : isAmorCat
                              ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-xs scale-102'
                              : isHalloweenCat
                              ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-xs scale-102'
                              : 'bg-sky-600 text-white shadow-xs scale-102'
                            : isXmasCat
                              ? 'bg-red-50 border border-red-200 text-red-700 hover:text-red-900 hover:border-red-300'
                              : isAmorCat
                              ? 'bg-pink-50 border border-pink-200 text-pink-700 hover:text-pink-900 hover:border-pink-300'
                              : isHalloweenCat
                              ? 'bg-orange-50 border border-orange-200 text-orange-800 hover:text-orange-950 hover:border-orange-300'
                              : 'bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-sky-300'
                        }`}
                      >
                        {isXmasCat && <span>🎄</span>}
                        {isAmorCat && <span>💖</span>}
                        {isHalloweenCat && <span>🎃</span>}
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Scroll Button */}
                {canScrollCatRight && (
                  <button
                    type="button"
                    onClick={() => handleScrollCatalogCat('right')}
                    aria-label="Desplazar categorías a la derecha"
                    className="absolute right-0 z-10 w-7 h-7 rounded-full bg-white hover:bg-slate-100 text-slate-700 hover:text-sky-600 border border-slate-300 shadow-sm flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 self-end md:self-auto text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl outline-hidden focus:border-sky-500 text-xs cursor-pointer"
                >
                  <option value="featured">Destacados Zavela</option>
                  <option value="price_asc">Menor Precio</option>
                  <option value="price_desc">Mayor Precio</option>
                  <option value="discount">Mayor Descuento</option>
                </select>
              </div>

            </div>

            {/* Main Products Grid */}
            <div className="space-y-4">
              {/* Category Sub-Menú Pills (Perfumería, Perfumes Mujer, Perfumes Hombre, Combos) */}
              {selectedCategoryId !== 'all' && (() => {
                const currentCat = categories.find(c => c.id === selectedCategoryId);
                if (!currentCat || !currentCat.subcategories || currentCat.subcategories.length === 0) return null;

                const subList = currentCat.subcategories.map(s => typeof s === 'string' ? { id: s, name: s } : s);

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2 overflow-x-auto w-full scrollbar-none py-0.5">
                      <span className="text-[11px] font-mono text-sky-700 font-black uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                        <span>💎 Sub-Menú:</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedSubcategoryId('all')}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          selectedSubcategoryId === 'all'
                            ? 'bg-sky-600 text-white border-sky-600 font-black shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        Ver Todos
                      </button>

                      {subList.map((sub) => {
                        const subId = sub.id || sub.name;
                        const isSelectedSub = selectedSubcategoryId === subId;
                        const isPerfume = sub.name.includes('Perfume') || sub.name.includes('💎') || sub.name.includes('Fragancia');

                        let btnClass = isSelectedSub
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-500 font-black shadow-xs scale-102'
                          : 'bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-pink-300 hover:bg-pink-50/50';

                        if (isSelectedSub && !isPerfume) {
                          btnClass = 'bg-sky-600 text-white border-sky-600 font-black shadow-xs scale-102';
                        }

                        return (
                          <button
                            key={subId}
                            type="button"
                            onClick={() => setSelectedSubcategoryId(subId)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer border ${btnClass}`}
                          >
                            <span>{sub.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-sky-600 rounded-full shadow-xs" />
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                    {selectedCategoryId === 'all' 
                      ? 'Catálogo Disponible con Pago Contra Entrega' 
                      : categories.find(c => c.id === selectedCategoryId)?.name || 'Catálogo'}
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  {filteredProducts.length} PRODUCTOS
                </span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3 shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto border border-slate-200">
                    <Search className="w-6 h-6 text-sky-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {selectedCategoryId !== 'all'
                      ? 'No hay productos disponibles en esta categoría actualmente'
                      : 'No se encontraron productos'}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    {selectedCategoryId !== 'all'
                      ? 'Pronto agregaremos nuevas existencias y novedades para esta sección.'
                      : 'No encontramos ningún producto que coincida con tu búsqueda. Intenta con otro término o categoría.'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategoryId('all');
                      setSelectedSubcategoryId('all');
                      setSearchQuery('');
                    }}
                    className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black px-5 py-2.5 rounded-xl text-xs cursor-pointer uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                  >
                    Ver todos los productos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id || product.slug}
                      product={product}
                      onSelectProduct={(p) => {
                        setSelectedProduct(p);
                        trackProductVisit(p);
                      }}
                      onAddToCart={(p, e) => handleAddToCart(p, p.variants?.[0], 1)}
                      onBuyNow={(p, e) => handleBuyNow(p, p.variants?.[0], 1)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 🧠 CommerceMind AI: Real-Time Personalized Recommendations for Shoppers */}
            <div className="pt-2">
              <CommerceMindClientWidget
                products={products}
                currentProduct={selectedProduct}
                cartItems={cartItems}
                onSelectProduct={setSelectedProduct}
                onAddToCart={(p) => handleAddToCart(p, p.variants?.[0], 1)}
              />
            </div>

            {/* 🛡️ Official Colombia Trust & Guarantees Bar (Zero Risk) */}
            <div className="pt-4">
              <ColombiaTrustGuaranteesBar />
            </div>

            {/* ⭐ Verified Colombian Customer Reviews & Testimonials Section */}
            <div className="pt-2">
              <CustomerReviewsSection />
            </div>

            {/* 📬 Newsletter Subscription Box (Ofertas Exclusivas + Email Marketing con IA) */}
            <div className="pt-2">
              <NewsletterSubscriptionBox 
                currentCategoryInterest={selectedCategoryId} 
                showToast={showToast} 
              />
            </div>

            {/* Creative Authorship Showcase Banner (Mockup: Certificados de Diseño / Banner) */}
            <div className="pt-4">
              <SergioMartinezSignature 
                variant="banner" 
                onClickCertificate={() => setIsAuthorCertModalOpen(true)} 
              />
            </div>

          </div>
        </main>
      )}

      {/* Floating Lucky Wheel Gamified Quick Trigger Badge (Visible ONLY if enabled by admin and for undecided customers) */}
      {currentView === 'store' && settings?.luckyWheel?.enabled === true && isUndecidedCustomer && !hasPurchased && isFloatingBadgeEnabled && (
        <button
          onClick={() => openLuckyWheel('manual')}
          id="btn-floating-lucky-wheel"
          className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-40 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black px-3.5 py-2.5 rounded-2xl shadow-xl shadow-amber-500/25 border-2 border-white flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all hover:scale-105 animate-in fade-in slide-in-from-bottom-3 duration-300"
          title="Gira la Ruleta y Gana tu Descuento Exclusivo"
          style={{
            borderColor: settings?.luckyWheel?.seasonAccentColor || '#ffffff'
          }}
        >
          <span className="text-base">{settings?.luckyWheel?.seasonBadgeEmoji || '🎁'}</span>
          <span className="hidden sm:inline">Ruleta de Descuentos</span>
          <span className="sm:hidden">Ruleta</span>
          <span className="bg-slate-950 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-md">
            5%-15%
          </span>
        </button>
      )}

      {/* Floating Gamification Quick Trigger Badge ("Desafío Flash: Atrapa Descuento") */}
      {currentView === 'store' && settings?.gamificationGame?.enabled === true && isGamificationUndecided && !hasPurchasedGamification && isGamificationFloatingBadgeEnabled && (
        <button
          onClick={() => openGamificationGame('manual')}
          id="btn-floating-gamification-challenge"
          className="fixed bottom-32 left-4 sm:bottom-20 sm:left-6 z-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black px-3.5 py-2.5 rounded-2xl shadow-xl shadow-indigo-600/30 border-2 border-white flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all hover:scale-105 animate-in fade-in slide-in-from-bottom-3 duration-300"
          title="Juega el Desafío Flash y Atrapa tu Descuento"
          style={{
            borderColor: settings?.gamificationGame?.accentColor || '#ffffff'
          }}
        >
          <span className="text-base">{settings?.gamificationGame?.badgeEmoji || '🌪️'}</span>
          <span className="hidden sm:inline">Desafío Flash</span>
          <span className="sm:hidden">Desafío</span>
          <span className="bg-slate-950/80 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-amber-400/30">
            {settings?.gamificationGame?.minDiscountPercentage || 5}%-{settings?.gamificationGame?.maxDiscountPercentage || 15}%
          </span>
        </button>
      )}

      {/* Floating Real-Time Purchase Notifications Widget */}
      <RealTimePurchaseToast />

      {/* Floating WhatsApp Live Advisor Widget (🟢 EN LÍNEA AHORA) */}
      {settings?.chatWidgetMode !== 'tidio' && (
        <WhatsAppAdvisorFloating 
          settings={settings}
          whatsappNumber={settings?.whatsappSettings?.phoneNumber || settings?.whatsappNumber || settings?.contactPhone || '573157894512'} 
          onSelectProduct={(p) => {
            setSelectedProduct(p);
            trackProductVisit(p);
          }}
        />
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          key={selectedProduct.id || selectedProduct.slug || 'product-detail-modal'}
          product={selectedProduct}
          allProducts={products}
          cartItems={cartItems}
          onSelectProduct={(p) => {
            setSelectedProduct(p);
            trackProductVisit(p);
          }}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onAddComboToCart={handleAddComboToCart}
          onOpenAuthorCertificate={() => setIsAuthorCertModalOpen(true)}
          isSocialClosing={isSocialClosingLink}
          onOpenLuckyWheel={() => openLuckyWheel('social_closing')}
          isLuckyWheelEnabled={Boolean(settings?.luckyWheel?.enabled === true)}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        freeShippingThreshold={settings?.freeShippingThreshold || 120000}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        appliedCoupon={appliedDiscountCoupon}
        onRemoveCoupon={() => setAppliedDiscountCoupon(null)}
        onOrderCreated={(order) => {
          setCartItems([]);
          setAppliedDiscountCoupon(null);
          setCompletedOrder(order);
          recordCustomerPurchase(order);
        }}
        freeShippingThreshold={settings?.freeShippingThreshold || 120000}
      />

      {/* Interactive Gamified Lucky Wheel Modal (CRO Ruleta de Descuentos) */}
      {settings?.luckyWheel?.enabled === true && (
        <LuckyWheelModal
          isOpen={isLuckyWheelOpen}
          onClose={closeLuckyWheel}
          favoriteProduct={favoriteProduct}
          luckyWheelSettings={settings?.luckyWheel}
          onApplyDiscountAndBuy={handleApplyDiscountAndBuy}
          onApplyDiscountToCart={(coupon) => {
            setAppliedDiscountCoupon(coupon);
            showToast(`🎉 ¡Descuento de Ruleta (${coupon.percentage}% OFF) activado!`);
          }}
        />
      )}

      {/* Interactive Gamified Minigame Modal ("Desafío Flash: Atrapa tu Descuento") */}
      <CatchDiscountGame
        isOpen={isGamificationOpen}
        onClose={closeGamificationGame}
        favoriteProduct={favoriteProduct}
        gamificationSettings={settings?.gamificationGame}
        onApplyDiscountAndBuy={handleApplyDiscountAndBuy}
        onApplyDiscountToCart={(coupon) => {
          setAppliedDiscountCoupon(coupon);
          showToast(`🎉 ¡Descuento de Desafío Flash (${coupon.percentage}% OFF) activado!`);
        }}
      />

      {/* Order Success Modal */}
      <OrderSuccessModal
        order={completedOrder}
        whatsappNumber={settings?.whatsappSettings?.phoneNumber || settings?.whatsappNumber || settings?.contactPhone || '573157894512'}
        onClose={() => setCompletedOrder(null)}
        onTrackOrder={(orderNumber) => {
          setTrackingInitialQuery(orderNumber);
          setCurrentView('tracking');
        }}
      />

      {/* Customer Purchase History Portal ("Mis Pedidos") */}
      <CustomerOrdersModal
        isOpen={isCustomerOrdersOpen}
        onClose={() => setIsCustomerOrdersOpen(false)}
        onTrackOrder={(query) => {
          setTrackingInitialQuery(query);
          setCurrentView('tracking');
        }}
        onReorder={(items) => {
          items.forEach(item => {
            const p = products.find(prod => prod.id === item.productId) || {
              id: item.productId,
              title: item.title,
              price: item.price,
              images: [item.image],
              stock: 10,
              active: true
            } as any;
            handleAddToCart(p, undefined, item.quantity);
          });
          setIsCheckoutOpen(true);
        }}
        showToast={showToast}
      />

      {/* Customer Authentication Modal (Login / Register Tabs) */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        initialTab={customerAuthInitialTab}
        onClose={() => setIsCustomerAuthOpen(false)}
        onSuccess={(user, msg) => {
          setCurrentCustomer(user);
          setIsCustomerAuthOpen(false);
          showToast(msg || `¡Bienvenido(a), ${user.firstName || user.name}!`);
        }}
      />

      {/* Customer Profile & Address Management Modal */}
      <CustomerProfileModal
        isOpen={isCustomerProfileOpen}
        currentUser={currentCustomer}
        onClose={() => setIsCustomerProfileOpen(false)}
        onLogout={handleCustomerLogout}
        onOpenOrders={() => {
          setIsCustomerProfileOpen(false);
          setIsCustomerOrdersOpen(true);
        }}
        showToast={showToast}
      />

      {/* Standard Full Footer with Author Signature & Certificate */}
      <Footer
        onOpenTracking={() => {
          setTrackingInitialQuery('');
          setCurrentView('tracking');
        }}
        onToggleAdmin={handleRequestAdmin}
        showSecretLogin={showSecretLogin}
        onOpenAuthorCertificate={() => setIsAuthorCertModalOpen(true)}
      />

      {/* Author Creative Certificate Modal (Official Sergio Martínez Design System) */}
      <AuthorCertificateModal
        isOpen={isAuthorCertModalOpen}
        onClose={() => setIsAuthorCertModalOpen(false)}
      />

      {/* Secret Admin / Advisor Authentication Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => {
          setIsAdminLoginOpen(false);
          setCurrentView('admin');
          showToast('¡Bienvenido! Panel Master de Despachos activado.');
        }}
        onAdvisorSuccess={(adv) => {
          setAuthenticatedAdvisor(adv);
          setIsAdminLoginOpen(false);
          setCurrentView('advisor');
          showToast(`¡Bienvenido(a), ${adv.name}! Portal de Asesor activado.`);
        }}
      />

    </div>
  );
}
