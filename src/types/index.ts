// Shared TypeScript interfaces and types for ZAVELA STORE Colombia

export type OrderStatus =
  | 'PENDIENTE_REVISION'
  | 'APROBADO_DROPI'
  | 'ERROR_DROPI'
  | 'CANCELADO'
  | 'pendiente'
  | 'pago_confirmado'
  | 'procesando'
  | 'enviado'
  | 'entregado'
  | 'cancelado'
  | 'pending_cod_confirmation'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'contra_entrega' | 'pago_online' | 'transferencia' | 'cash_on_delivery';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CASH_ON_DELIVERY';

export interface ProductVariant {
  id: string;
  productId?: string;
  name: string;
  sku?: string;
  price: number;
  costPrice?: number;
  stock: number;
  attributes?: Record<string, string>;
}

export interface HeaderTickerItem {
  id: string;
  text: string;
  icon?: string;
  link?: string;
  active: boolean;
  highlightText?: string;
}

export type AnnouncementItem = HeaderTickerItem;

export interface HeaderTickerSettings {
  enabled: boolean;
  speedSeconds?: number;
  backgroundColor?: string;
  textColor?: string;
  items: HeaderTickerItem[];
}

export interface HeaderActionButton {
  id: string;
  label: string;
  url: string;
  icon?: string;
  active: boolean;
  openInNewTab?: boolean;
}

export interface HeaderButtonsSettings {
  showTrackingBtn?: boolean;
  showCartBtn?: boolean;
  showWhatsAppBtn?: boolean;
  searchPlaceholder?: string;
  customButtons?: HeaderActionButton[];
}

export interface SubCategory {
  id?: string;
  name: string;
  slug?: string;
  active?: boolean;
  productCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  active: boolean;
  order?: number;
  productCount?: number;
  subcategories?: (string | SubCategory)[];
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeText?: string;
  notificationText?: string;
  tagline?: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  videoUrl?: string;
  hasVideo?: boolean;
  active: boolean;
  order?: number;
  textColor?: string;
  discountBadge?: string;
}

export interface HomeSectionItem {
  id: string;
  key: string;
  title?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  enabled: boolean;
  order: number;
}

export interface TrustBadge {
  id: string;
  icon: string;
  title: string;
  description: string;
  active: boolean;
  order?: number;
}

export type TrustBadgeItem = TrustBadge;

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: string;
  publishedAt: string;
  readTime?: string;
  readTimeMinutes?: number;
  tags?: string[];
  active?: boolean;
  published?: boolean;
}

export interface LegalPoliciesConfig {
  termsAndConditions?: string;
  privacyPolicy?: string;
  shippingAndReturns?: string;
  warrantyPolicy?: string;
}

export interface CarrierConfig {
  id: string;
  name: string;
  code: string;
  active: boolean;
  trackingUrlTemplate: string;
  logoUrl?: string;
}

export interface FooterSettings {
  companyName: string;
  nit: string;
  bioText: string;
  copyrightNotice: string;
  showPaymentBadges: boolean;
  carriers: CarrierConfig[];
}

export interface GlobalTextsCMS {
  welcomeBannerText?: string;
  codNoticeText?: string;
  freeShippingNotice?: string;
  emptyCartText?: string;
  whatsappOrderTemplate?: string;
  checkoutNotice?: string;
  orderSuccessSubtitle?: string;
}

export interface ThemeStylesSettings {
  borderRadius?: string;
  glowIntensity?: string;
  neonGlowEnabled?: boolean;
  glowColor?: string;
  fontFamily?: string;
  darkThemeIntensity?: string;
}

export interface SocialLinksConfig {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
}

export interface SocialPlatformConnection {
  platform: 'facebook' | 'instagram' | 'tiktok';
  connected: boolean;
  accountName?: string;
  accountId?: string;
  pageId?: string;
  accessToken?: string;
  appSecret?: string;
  pixelId?: string;
  status: 'connected' | 'disconnected' | 'token_expired';
  lastSyncAt?: string;
  autoPostEnabled: boolean;
}

export interface SocialMarketingSettings {
  autoPublishOnProductCreate: boolean;
  autoPublishOnProductUpdate: boolean;
  defaultHashtags: string[];
  includePrice: boolean;
  includeCodBadge: boolean;
  includeFreeShippingBadge: boolean;
  callToActionText: string;
  targetChannels: {
    facebook: boolean;
    instagram: boolean;
    tiktok: boolean;
  };
  copyTone: 'viral_high_converting' | 'urgency_flash' | 'storytelling' | 'direct_offer';
  connections: {
    facebook: SocialPlatformConnection;
    instagram: SocialPlatformConnection;
    tiktok: SocialPlatformConnection;
  };
}

export interface SocialBroadcastPost {
  id: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  productImageUrl: string;
  productSlug: string;
  platforms: ('facebook' | 'instagram' | 'tiktok')[];
  copies: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
  status: 'published' | 'scheduled' | 'failed';
  publishedAt: string;
  views: number;
  clicks: number;
  likes: number;
  shares: number;
  attributedSalesCOP: number;
  postUrl?: string;
}

export type AIPersonalityTone =
  | 'friendly_colombian'
  | 'professional_sales'
  | 'enthusiastic_deals'
  | 'expert_consultant';

export interface AIAgentSettings {
  enabled: boolean;
  agentName: string;
  agentRole: string;
  personalityTone: AIPersonalityTone;
  welcomeMessage: string;
  customPromptInstructions?: string;
  recommendationMode: 'all_catalog' | 'featured_only' | 'deals_only';
  maxProductsToSuggest: number;
  enableDirectWhatsAppHandoff: boolean;
  suggestQuickQuestions: string[];
}

export interface WhatsAppConfigSettings {
  enabled: boolean;
  phoneNumber: string; // e.g. "573123456789"
  advisorName: string; // e.g. "Línea Oficial Zavela"
  defaultMessage: string;
  orderConfirmationTemplate?: string;
  supportHoursNotice?: string;
}

export interface WhatsAppCloudApiSettings {
  enabled: boolean;
  webhookCallbackUrl?: string; // URL de devolución de llamada para Meta Webhook
  webhookVerifyToken: string; // Token de verificación para el handshake de Meta
  phoneNumberId?: string; // ID del número de teléfono en Meta Cloud API
  wabaId?: string; // ID de la cuenta de WhatsApp Business (WABA)
  accessToken?: string; // Token de acceso de usuario del sistema (System User Token)
  autoReplyWithAI: boolean; // Responder automáticamente los mensajes entrantes con IA
  metaApiVersion?: string; // Versión de Meta Graph API (e.g. "v20.0")
  lastWebhookPing?: string;
  lastReceivedEvent?: string;
}

export type WhatsAppAlertType = 'NEW_SALE' | 'SECURITY_ALERT' | 'LOW_STOCK' | 'CUSTOM' | 'DAILY_SUMMARY';

export interface WhatsAppAlertLog {
  id: string;
  timestamp: string;
  type: WhatsAppAlertType;
  title: string;
  recipientPhone: string;
  message: string;
  status: 'sent_cloud_api' | 'pending_direct_backup' | 'failed_api' | 'simulated';
  waMeUrl: string;
  metaMessageId?: string;
  details?: Record<string, any>;
}

export interface WhatsAppAlertsSettings {
  enabled: boolean;
  adminPhoneNumber: string; // "+573008784427"
  notifyNewSales: boolean;
  notifySecurityAlerts: boolean;
  notifyLowStock: boolean;
  lowStockThreshold: number;
}

export interface MaintenanceNotifyLead {
  id: string;
  contact: string;
  type: 'email' | 'whatsapp';
  name?: string;
  createdAt: string;
}

export interface StoreSettings {
  id?: string;
  storeName?: string;
  storeSlogan?: string;
  slogan?: string;
  currency?: string;
  logoType?: 'vector' | 'custom_image';
  logoUrl?: string;
  logoImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  glowEnabled?: boolean;
  
  // Contact & Social
  whatsappNumber?: string;
  whatsappDefaultMessage?: string;
  whatsappMessage?: string;
  whatsappAdvisorName?: string;
  whatsappFloatingEnabled?: boolean;
  whatsappSettings?: WhatsAppConfigSettings;
  whatsappCloudApi?: WhatsAppCloudApiSettings;
  whatsappAlerts?: WhatsAppAlertsSettings;
  aiAgentSettings?: AIAgentSettings;

  // Tidio Live Chat & AI Integration
  tidioChatEnabled?: boolean;
  tidioScriptUrl?: string; // e.g. "//code.tidio.co/tu_codigo.js" or "https://code.tidio.co/xxxx.js"
  tidioPublicKey?: string; // e.g. "tu_codigo"
  chatWidgetMode?: 'native_novora' | 'tidio' | 'both';

  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  contactCity?: string;
  businessAddress?: string;
  businessHours?: string;
  socialLinks?: SocialLinksConfig;
  instagramUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;

  // Margin & Shipping defaults
  defaultProfitMarginPercentage?: number;
  defaultMarginPercentage?: number;
  defaultFixedMargin?: number;
  freeShippingThreshold?: number;
  flatShippingRate?: number;
  defaultShippingCost?: number;
  enableWhatsappNotifications?: boolean;
  colombiaCodEnabled?: boolean;

  // Security & Admin Access
  adminPassword?: string;
  adminUsername?: string;

  // Maintenance & Private Testing Mode
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  maintenanceTitle?: string;
  maintenanceBypassToken?: string;
  maintenanceNotifyLeads?: MaintenanceNotifyLead[];

  // Advanced modules
  headerTicker?: HeaderTickerSettings;
  headerButtons?: HeaderButtonsSettings;
  heroBanners?: HeroBanner[];
  heroBannerStyle?: 'jpfans' | 'classic';
  heroNotificationEnabled?: boolean;
  homeSections?: HomeSectionItem[];
  trustBadges?: TrustBadge[];
  blogPosts?: BlogPost[];
  legalPolicies?: any;
  footerSettings?: FooterSettings;
  globalTexts?: GlobalTextsCMS;
  themeStyles?: ThemeStylesSettings;
  socialMarketingSettings?: SocialMarketingSettings;
  luckyWheel?: LuckyWheelSettings;
  gamificationGame?: GamificationGameSettings;
  exclusivityPage?: ExclusivityPageSettings;
  customSubpages?: CustomSubpage[];
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number; // Precio de venta
  // Financial & Dropi Cost Breakdown
  costPrice?: number; // Costo base del producto/proveedor
  estimatedShippingCost?: number; // Costo estimado de flete/envío
  dropiFee?: number; // Tarifa fija/recaudo plataforma Dropi
  totalOperatingCost?: number; // Costo total = Producto + Envío + Tarifa Dropi
  realNetProfit?: number; // Ganancia neta real = Precio - Costo Total
  realNetMarginPercentage?: number; // Margen neto % real sobre venta
  compareAtPrice?: number; // Precio tachado
  discountPercentage?: number;
  marginAmount?: number; // Ganancia $ bruta (price - costPrice)
  marginPercentage?: number; // Margen % bruto ((price - costPrice)/costPrice * 100)
  stock: number;
  active: boolean;
  featured?: boolean;
  images: string[];
  warrantyInfo?: string;
  tags: string[];
  weightKg?: number;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  variants?: ProductVariant[];
  warehouseCity?: string;
  brand?: string;

  // Shipping & Logistics Options
  freeShipping?: boolean;
  envioGratis?: boolean;
  rating?: number;
  reviewCount?: number;

  // Dropi Colombia Integration
  dropi_product_id?: string | number;
  dropiProductId?: string | number;

  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  orderId?: string;
  productId: string;
  variantId?: string;
  title: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  subtotal?: number;
  image?: string;
  
  // Dropi Colombia Mapping
  dropi_product_id?: string | number;
}

export interface CustomerInfo {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  department?: string;
  city?: string;
  address?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
  department?: string;
  city?: string;
  address?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "NV-1001" or "ZV-1001"
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  department?: string;
  city?: string;
  address?: string;
  additionalNotes?: string;
  customerInfo?: CustomerInfo;

  subtotal?: number;
  discountCode?: string;
  discountAmount?: number;
  discountPercent?: number;
  shippingCost?: number;
  shippingFee?: number;
  shippingZone?: string;
  total?: number;
  totalAmount?: number;
  productCostTotal?: number;
  grossMargin?: number;
  carrierFee?: number; // Costo del flete de la transportadora (Servientrega, Coordinadora, etc.)
  dropiFee?: number; // Comisión / Tarifa cobro plataforma Dropi
  netMargin?: number; // Ganancia neta real líquida (Total - Costo Producto - Flete - Tarifa Dropi)

  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  status: OrderStatus;

  // Logistics & Tracking
  trackingNumber?: string;
  carrier?: string;
  carrierTrackingUrl?: string;
  guideUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;

  // Dropi Colombia Integration Fields
  dropi_order_id?: string | number;
  dropi_guia?: string;
  error_message?: string;
  dane_code?: string;
  dropi_approved_at?: string;
  dropi_response?: any;

  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface CustomPlateSelection {
  shape: 'round' | 'rectangular';
  finish: 'black_matte' | 'gold_engraved' | 'silver_chrome' | 'rose_gold';
  finishLabel?: string;
  engravingName?: string;
  brandText?: string;
  qrDestinationUrl?: string;
}

export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  customPlate?: CustomPlateSelection;
}

export interface CheckoutFormData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  department: string;
  city: string;
  address: string;
  additionalNotes?: string;
  paymentMethod: PaymentMethod;
  dane_code?: string;
  shippingZone?: string;
  shippingCost?: number;
}

export interface AuditLog {
  id: string;
  type?: 'ORDER_CREATED' | 'STATUS_UPDATE' | 'PRODUCT_UPDATE' | 'SETTINGS_UPDATE' | 'SYSTEM' | 'WHATSAPP_ALERT';
  action: string;
  orderId?: string;
  message?: string;
  details?: string;
  status?: 'success' | 'error' | 'info';
  payload?: any;
  createdAt: string;
}

export type SystemLog = AuditLog;

// Subperfiles de Asesores y Bolsa Dropi para el Perfil Principal de Sergio Martínez
export interface Advisor {
  id: string; // ej. "AS-001" o "VEN-001"
  name: string; // ej. "Juan Pérez"
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'advisor'; // 'admin' o 'advisor'
  sellerCode?: string; // ej. "VEN-001", código de vendedor para control del que más vende
  username?: string; // ej. "juan.perez"
  password?: string; // ej. "juan123"
  phone?: string;
  email?: string;
  channel?: string; // ej. "WhatsApp de Ventas"
  commissionRate?: number; // % o valor opcional
  status: 'active' | 'inactive';
  settlementStatus: 'al_dia' | 'pendiente_liquidacion' | 'liquidado';
  lastSettlementDate?: string;
  notes?: string;
  createdAt: string;
}

export type DropiStatus = 
  | 'pendiente_bolsa' 
  | 'montado_dropi' 
  | 'guia_generada' 
  | 'enviado' 
  | 'entregado' 
  | 'cancelado';

export interface AdvisorSale {
  id: string; // ej. "DP-001"
  orderNumber: string;
  advisorId: string;
  advisorName: string;
  advisorChannel?: string;
  productId?: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  clientName: string;
  clientPhone: string;
  clientCity: string;
  clientDepartment?: string;
  clientAddress: string;
  additionalNotes?: string;
  dropiStatus: DropiStatus;
  dropiOrderId?: string;
  trackingNumber?: string;
  paymentMethod: 'contra_entrega';
  createdAt: string;
  updatedAt?: string;
}

export interface AdvisorPerformance {
  advisorId: string;
  advisorName: string;
  channel: string;
  totalSalesCOP: number;
  unitsSold: number;
  orderCount: number;
  settlementStatus: 'al_dia' | 'pendiente_liquidacion' | 'liquidado';
  pendingSettlementAmountCOP: number;
  recentSales: AdvisorSale[];
}

export interface ProductProfitItem {
  productId: string;
  productTitle: string;
  productImage?: string;
  categoryName?: string;
  price: number;
  costPrice: number;
  unitMargin: number;
  marginPercentage: number;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMarginPercentage: number;
}

export interface AdminStats {
  totalRevenue: number;
  totalSales?: number;
  totalOrders: number;
  totalGrossProfit: number;
  totalProductCosts: number;
  averageMarginPercentage: number;
  
  // Desglose de Costos Operativos y Logísticos
  totalCarrierCosts?: number; // Total fletes pagados a transportadoras (Servientrega, Coordinadora, etc.)
  totalDropiFees?: number; // Total cobros/comisiones de plataforma Dropi
  totalNetProfit?: number; // Utilidad Neta Real Líquida en Mano (Ventas - Costos Producto - Fletes - Dropi)
  netMarginPercentage?: number; // Margen Neto % real sobre ventas

  // Daily and Monthly Metrics
  todaySales: number;
  todayOrders: number;
  todayGrossProfit: number;
  todayProductCosts: number;
  todayCarrierCosts?: number;
  todayDropiFees?: number;
  todayNetProfit?: number;
  
  monthSales: number;
  monthOrders: number;
  monthGrossProfit: number;
  monthProductCosts: number;
  monthCarrierCosts?: number;
  monthDropiFees?: number;
  monthNetProfit?: number;

  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  totalProducts: number;
  totalCustomers: number;
  productProfitBreakdown?: ProductProfitItem[];
}

export interface DashboardMetrics extends AdminStats {
  totalSales: number;
  recentOrders: Order[];
  topProducts: {
    product: Product;
    soldCount: number;
    revenue: number;
    profit?: number;
  }[];
}

export interface TrackedProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  visitsCount: number;
  timeSpent: number; // in seconds
  lastVisited: number; // timestamp
  affinityScore?: number;
}

export type LuckyWheelSeasonPreset = 
  | 'default'
  | 'navidad'
  | 'black_friday'
  | 'madres'
  | 'padres'
  | 'amor_amistad'
  | 'cyber_lunes'
  | 'custom';

export interface LuckyWheelSettings {
  enabled: boolean;
  
  // Textos y Títulos
  title: string;
  subtitle: string;
  badgeText?: string;
  callToActionText?: string;
  
  // Tiempos & Disparadores (Seconds & Thresholds)
  inactivitySeconds: number; // e.g. 40s (tiempo de inactividad antes de disparar a clientes indecisos)
  minVisitedProducts: number; // e.g. 2 o 3 (mínimo de productos vistos para considerarse indeciso)
  couponExpiryMinutes: number; // e.g. 15 minutos (temporizador de cuenta regresiva del cupón)
  spinDurationSeconds: number; // e.g. 4.5 segundos
  
  // Reglas de activación (Disparadores selectivos)
  enableExitIntent: boolean; // Disparar al intentar salir (cursor arriba)
  enableInactivityTrigger: boolean; // Disparar por tiempo inactivo
  enableVisitedThresholdTrigger: boolean; // Disparar tras visitar N productos
  enableFloatingBadge: boolean; // Mostrar botón flotante en la tienda a clientes indecisos
  
  // Opciones de Temporada
  activeSeason: LuckyWheelSeasonPreset;
  seasonName?: string;
  seasonTagline?: string;
  seasonAccentColor?: string;
  seasonBadgeEmoji?: string;
  
  // Segmentos y Descuentos
  segments: WheelDiscountSegment[];
}

export interface WheelDiscountSegment {
  id: string;
  label: string;
  percentage: number; // strictly between 5 and 25
  color: string;
  textColor: string;
  couponPrefix: string;
}

export interface ActiveDiscountCoupon {
  code: string;
  percentage: number;
  expiresAt: number; // timestamp
  productAffinityId?: string;
}

export type GamificationSeasonPreset = 
  | 'standard'
  | 'black_friday'
  | 'amor_amistad'
  | 'navidad'
  | 'liquidacion_verano'
  | 'cyber_days'
  | 'custom';

export interface GamificationTiersConfig {
  bronze: {
    minScore: number; // e.g. 1
    discountPercentage: number; // e.g. 5%
    label: string; // e.g. "Nivel Bronce"
    couponPrefix: string; // e.g. "FLASH5"
  };
  silver: {
    minScore: number; // e.g. 6
    discountPercentage: number; // e.g. 10%
    label: string; // e.g. "Nivel Plata"
    couponPrefix: string; // e.g. "SUPER10"
  };
  gold: {
    minScore: number; // e.g. 12
    discountPercentage: number; // e.g. 15%
    label: string; // e.g. "Nivel Oro"
    couponPrefix: string; // e.g. "VIP15"
  };
}

export interface GamificationGameSettings {
  enabled: boolean;
  
  // Campaña & Temporada
  activeSeason: GamificationSeasonPreset;
  seasonName: string; // e.g. "Black Friday", "Amor y Amistad", "Navidad"
  gameTitle: string; // e.g. "¡Desafío Flash de Black Friday!"
  gameSubtitle: string; // e.g. "¡Atrapa los descuentos que caen con el viento y desbloquea tu cupón exclusivo!"
  badgeEmoji: string; // e.g. "🌪️" o "🎁"
  accentColor: string; // e.g. "#f59e0b"
  
  // Reglas de descuento y límites controlados
  minDiscountPercentage: number; // e.g. 5%
  maxDiscountPercentage: number; // e.g. 15%
  tiers: GamificationTiersConfig;

  // Mecánica y Física del Juego
  gameDurationSeconds: number; // 12 a 15 segundos
  windEnabled: boolean; // Brisa/viento dinámico aleatorio
  windChangeIntervalSeconds: number; // 2 a 3 segundos
  basketSpeed: number; // Sensibilidad de la canasta
  couponExpiryMinutes: number; // e.g. 10 minutos para canjear
  enableGyroscope: boolean; // Control por inclinación de móvil (DeviceOrientation API)
  gyroSensitivity: number; // Multiplicador de sensibilidad del giroscopio (e.g. 1.2)
  gyroDeadzone: number; // Zona muerta central en grados (e.g. 5)
  
  // Dificultad y Penalizaciones
  difficultyLevel: 'normal' | 'hard' | 'expert'; // Nivel de dificultad y velocidad
  missPenaltyPoints: number; // Puntos/descuento restados si un objeto se escapa sin recoger (e.g. 1)
  includeObstacles: boolean; // Incluir bombas/obstáculos 💣 que restan puntos al atraparlos
  
  // Parámetros de Disparo (Triggers)
  inactivitySeconds: number; // e.g. 35s
  minVisitedProducts: number; // e.g. 2 productos vistos
  enableExitIntent: boolean; // Disparo al intentar salir (cursor arriba)
  enableInactivityTrigger: boolean; // Disparo por tiempo inactivo
  enableVisitedThresholdTrigger: boolean; // Disparo tras ver N productos
  enableFloatingBadge: boolean; // Botón flotante en tienda ("🎮 Desafío Flash")
}

// EXCLUSIVIDAD (BOLSOS & PLACAS) & SUBPÁGINAS DINÁMICAS (RAMAS)
// ==============================================================

export type PlateShape = 'round' | 'rectangular';
export type PlateFinish = 'black_matte' | 'gold_engraved' | 'silver_chrome' | 'rose_gold';

export interface PlateOption {
  id: string;
  shape: PlateShape;
  name: string;
  dimensions: string; // e.g. "3 cm Ø" o "3 cm x 1.5 cm"
  finish: PlateFinish;
  finishLabel: string;
  brandText: string; // e.g. "Rochy"
  sloganText: string; // e.g. "IDENTIDAD VISUAL"
  qrPosition: 'center' | 'side';
  qrUrl?: string;
  active: boolean;
  previewImage?: string;
  description?: string;
}

export interface ExclusivityBagProduct {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  priceCOP: number;
  compareAtPriceCOP: number;
  material: string;
  color: string;
  dimensions: string;
  craftsmanTag: string; // e.g. "Hecho a mano en Colombia • Diseño por Rochy"
  images: string[];
  stock: number;
  active: boolean;
  featured: boolean;
  defaultPlateShape?: PlateShape;
  defaultPlateFinish?: PlateFinish;
  rating: number;
  reviewCount: number;
  freeShipping: boolean;
  cashOnDelivery: boolean;
  tags: string[];
}

export interface ExclusivityPageSettings {
  enabled: boolean;
  navTitle: string; // "EXCLUSIVIDAD (Bolsos & Placas)"
  heroBadge: string; // "💎 EDICIÓN LIMITADA 2026 • DISEÑO POR ROCHY"
  heroTitle: string; // "Colección Exclusiva de Bolsos de Cuentas & Placas de Identidad"
  heroSubtitle: string; // "Piezas artesanales únicas con placa metálica grabada en láser y código QR personalizado."
  heroCtaText: string; // "Ver Modelos Disponibles"
  heroBannerImage?: string;
  platesShowcaseTitle: string; // "Showcase de Placas de Autenticidad (Rochy - Identidad Visual)"
  platesShowcaseSubtitle: string; // "Grabado láser de alta precisión en metal pulido con código QR personalizable"
  craftsmanshipGuaranteeText?: string;
  plates: PlateOption[];
  curatedProducts: ExclusivityBagProduct[];
}

export interface CustomSubpage {
  id: string;
  slug: string; // e.g. "joyeria-fina", "coleccion-verano", "tecnologia-vip"
  title: string;
  navLabel: string; // e.g. "Joyería VIP", "Colección Verano"
  showInNav: boolean;
  active: boolean;
  tagline?: string;
  heroBadge?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText?: string;
  heroImageUrl?: string;
  accentColor?: string; // hex or tailwind class
  categoryFilter?: string; // category id or 'all'
  customProductIds?: string[];
  customHtmlContent?: string;
  showPlatesShowcase?: boolean;
  showTrustGuarantees?: boolean;
  createdAt: string;
  updatedAt?: string;
}



