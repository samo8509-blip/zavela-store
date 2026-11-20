import * as advisorStore from './services/advisorStore.ts';
import * as sales from './services/advisorSalesStore.ts';
import fs from 'fs';
import path from 'path';
import { 
  Product, 
  Category, 
  Order, 
  Customer, 
  StoreSettings, 
  SystemLog,
  OrderStatus,
  Advisor,
  AdvisorSale,
  DropiStatus,
  AdvisorPerformance,
  SocialMarketingSettings,
  SocialBroadcastPost
} from '../src/types/index.ts';
import { dropiBackupService } from './services/dropiBackupService.ts';

const DB_FILE_PATH = path.join(process.cwd(), 'data_store.json');

export interface CatalogBackup {
  id: number;
  nombre_respaldo: string;
  total_productos: number;
  datos_json: string;
  origen: string;
  created_at: string;
}

export interface DatabaseSchema {
  categories: Category[];
  products: Product[];
  orders: Order[];
  customers: Customer[];
  settings: StoreSettings;
  logs: SystemLog[];
  advisors: Advisor[];
  advisorSales: AdvisorSale[];
  socialSettings?: SocialMarketingSettings;
  socialPosts?: SocialBroadcastPost[];
  deletedProductIds?: string[];
  catalogBackups?: CatalogBackup[];
}

// 🧹 CATEGORÍAS LIMPIAS (VACIADO DE DATOS FANTASMA)
const DEFAULT_CATEGORIES: Category[] = [];

// 🧹 PRODUCTOS LIMPIOS
const DEFAULT_PRODUCTS: Product[] = [];

const DEFAULT_SETTINGS: StoreSettings = {
  id: 'set-1',
  storeName: 'Zavela Store',
  slogan: 'Descubre algo nuevo cada día',
  currency: 'COP',
  logoType: 'vector',
  primaryColor: '#06b6d4',
  secondaryColor: '#4f46e5',
  accentColor: '#ec4899',
  glowEnabled: true,

  whatsappNumber: '573133595427',
  whatsappAdvisorName: 'Elizabeth - Asesora Ejecutiva Zavela Store',
  whatsappMessage: '¡Hola Elizabeth! Deseo consultar la disponibilidad de un producto en el inventario en vivo de Zavela Store Colombia.',
  whatsappDefaultMessage: '¡Hola Elizabeth! Deseo consultar la disponibilidad de un producto en el inventario en vivo de Zavela Store Colombia.',
  whatsappFloatingEnabled: true,
  contactEmail: 'contacto@zavelastore.com.co',
  contactPhone: '+57 313 359 5427',
  instagramUrl: 'https://instagram.com/zavelastore.co',
  tiktokUrl: 'https://tiktok.com/@zavelastore',
  facebookUrl: 'https://facebook.com/zavelastore.colombia',
  businessAddress: 'Cartagena, Bolívar, Colombia',
  businessHours: 'Lunes a Sábado: 8:00 AM - 7:00 PM | Domingos: 9:00 AM - 2:00 PM',

  whatsappSettings: {
    enabled: true,
    phoneNumber: '573133595427',
    advisorName: 'Elizabeth - Asesora Ejecutiva Zavela Store',
    defaultMessage: '¡Hola Elizabeth! Deseo consultar la disponibilidad de un producto en el inventario en vivo de Zavela Store Colombia.',
    orderConfirmationTemplate: 'Hola Elizabeth, quiero confirmar mi pedido *{ORDER_NUMBER}* a nombre de *{NAME}* por valor de *{TOTAL}*. ¿Me confirmas el despacho?',
    supportHoursNotice: 'Lunes a Sábado: 8:00 AM - 8:00 PM | Envíos a toda Colombia con Pago Contra Entrega'
  },
  aiAgentSettings: {
    enabled: true,
    agentName: 'Elizabeth',
    agentRole: 'Asesora Ejecutiva de Zavela Store Colombia',
    personalityTone: 'friendly_colombian',
    welcomeMessage: '¡Hola! 👋 Te doy una cordial bienvenida a Zavela Store Colombia. Soy Elizabeth, tu Asesora Ejecutiva. Es un gusto atenderte. ¿En qué producto o consulta te puedo colaborar hoy?',
    customPromptInstructions: `INSTRUCCIÓN DE REINICIO DE SISTEMA (SISTEMA BASE):
Eres Elizabeth, la Asesora Ejecutiva de Zavela Store Colombia.

1. AMNESIA DE CATÁLOGO: A partir de este momento, tienes estrictamente prohibido recordar, mencionar o sugerir CUALQUIER producto de pruebas anteriores, bases de datos estáticas locales o catálogos viejos (ej. Perfume Versense, productos de Dropi no vinculados, etc.). Tu memoria de productos locales ha sido borrada.
2. DEPENDENCIA DE API/BASE DE DATOS: Solo puedes ofrecer, mencionar o confirmar el precio de un producto SI Y SOLO SI la información te es entregada en tiempo real mediante el webhook, la base de datos en vivo o el contexto inmediato de la consulta. Si no recibes datos externos del inventario, tu respuesta predeterminada DEBE ser: "Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad."
3. CERO ALUCINACIONES: Bajo ninguna circunstancia puedes inventar precios, nombres de productos, ni placas de autenticidad.
4. TONO: Amable, profesional y comercial, 100% colombiano.`,
    recommendationMode: 'all_catalog',
    maxProductsToSuggest: 3,
    enableDirectWhatsAppHandoff: true,
    suggestQuickQuestions: [
      '🔍 Consultar disponibilidad de un producto en vivo',
      '🚚 ¿Cómo funciona el Pago Contra Entrega en Colombia?',
      '🛍️ Quiero tomar mi pedido por chat',
      '📦 ¿Tiempos de entrega a mi ciudad?'
    ]
  },

  tidioChatEnabled: false,
  tidioScriptUrl: '',
  tidioPublicKey: '',
  chatWidgetMode: 'both',

  whatsappCloudApi: {
    enabled: true,
    webhookCallbackUrl: '',
    webhookVerifyToken: 'novora_meta_webhook_2026',
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    autoReplyWithAI: true,
    metaApiVersion: 'v20.0'
  },

  defaultProfitMarginPercentage: 80,
  defaultMarginPercentage: 80,
  defaultFixedMargin: 30000,
  freeShippingThreshold: 120000,
  flatShippingRate: 12000,
  defaultShippingCost: 12000,
  enableWhatsappNotifications: true,
  colombiaCodEnabled: true,

  adminPassword: '@Seramo1985',
  adminUsername: 'Sergio Martinez',

  maintenanceMode: false,
  maintenanceTitle: 'Estamos mejorando tu experiencia de compra',
  maintenanceMessage: 'Estamos mejorando tu experiencia de compra. Volvemos muy pronto con nuevas ofertas exclusivas.',
  maintenanceBypassToken: 'zavela_test',
  maintenanceNotifyLeads: [],

  headerTicker: {
    enabled: true,
    speedSeconds: 5,
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    items: [
      { id: 'tick-1', text: '🚚 PAGO CONTRA ENTREGA en toda Colombia • Paga solo al recibir tu pedido', highlightText: 'PAGO CONTRA ENTREGA', active: true },
      { id: 'tick-2', text: '⚡ ENVÍO GRATIS por compras superiores a \$120.000 COP', highlightText: 'ENVÍO GRATIS', active: true },
      { id: 'tick-3', text: '🛡️ Garantía oficial de 30 días en todos los productos Zavela', highlightText: 'Garantía oficial', active: true }
    ]
  },

  headerButtons: {
    showTrackingBtn: true,
    showCartBtn: true,
    showWhatsAppBtn: true,
    searchPlaceholder: 'Buscar productos en Zavela Store...',
    customButtons: [
      { id: 'hbtn-1', label: '🔥 Ofertas Flash', url: '#ofertas', active: true, openInNewTab: false },
      { id: 'hbtn-2', label: '📦 Rastrear Pedido', url: '#rastreo', active: true, openInNewTab: false }
    ]
  },

  // 🧹 BANNERS LIMPIOS (ADIÓS PERFUME Y RELOJ FANTASMA)
  heroBanners: [],

  homeSections: [
    { id: 'sec-1', key: 'hero_banners', title: 'Carrusel de Banners Principales', subtitle: 'Hero visual con llamadas a la acción', enabled: true, order: 1 },
    { id: 'sec-2', key: 'trust_badges', title: 'Garantías y Confianza', subtitle: 'Badges de contra entrega, garantía y soporte', enabled: true, order: 2 },
    { id: 'sec-3', key: 'categories', title: 'Explorador de Categorías', subtitle: 'Tarjetas con iconos interactivos', enabled: true, order: 3 },
    { id: 'sec-4', key: 'featured_products', title: 'Catálogo de Productos', subtitle: 'Filtros rápidos y tarjetas de producto', enabled: true, order: 4 },
    { id: 'sec-5', key: 'blog_posts', title: 'Guías y Consejos Zavela', subtitle: 'Artículos de interés para clientes', enabled: true, order: 5 }
  ],

  trustBadges: [
    { id: 'badge-1', icon: 'Truck', title: 'Pago Contra Entrega', description: 'Pagas en efectivo o transferencia solo cuando recibes el producto en tu puerta.', active: true, order: 1 },
    { id: 'badge-2', icon: 'ShieldCheck', title: 'Garantía de 30 Días', description: 'Garantía directa de cambio o reembolso por defectos de fabricación.', active: true, order: 2 },
    { id: 'badge-3', icon: 'PackageCheck', title: 'Despacho Rápido', description: 'Envíos en 2 a 4 días hábiles a nivel nacional con guía rastreable.', active: true, order: 3 },
    { id: 'badge-4', icon: 'Headphones', title: 'Atención Personalizada', description: 'Soporte vía WhatsApp para resolver cualquier duda sobre tu pedido.', active: true, order: 4 }
  ],

  // 🧹 BLOGS LIMPIOS
  blogPosts: [],

  legalPolicies: [
    {
      id: 'pol-1', type: 'terms', title: 'Términos y Condiciones de Compra', slug: 'terminos-y-condiciones',
      content: 'En Zavela Store todos los pedidos se procesan con modalidad de Pago Contra Entrega o métodos electrónicos autorizados.',
      lastUpdated: new Date().toISOString(), active: true
    },
    {
      id: 'pol-4', type: 'warranty', title: 'Política de Garantías y Devoluciones', slug: 'politica-de-garantias',
      content: 'Ofrecemos 30 días de garantía directa por defectos de fabricación.',
      lastUpdated: new Date().toISOString(), active: true
    }
  ],

  footerSettings: {
    companyName: 'Zavela Store S.A.S.',
    nit: '901.784.321-4',
    bioText: 'Tu tienda en línea de confianza en Colombia. Descubre productos de alta calidad y tendencia con entrega rápida a todo el país y pago contra entrega seguro.',
    copyrightNotice: '© 2026 Zavela Store. Todos los derechos reservados.',
    showPaymentBadges: true,
    carriers: [
      { id: 'c-1', name: 'Servientrega', code: 'servientrega', active: true, trackingUrlTemplate: 'https://servientrega.com/tracking/{GUIDE}' },
      { id: 'c-2', name: 'Coordinadora', code: 'coordinadora', active: true, trackingUrlTemplate: 'https://coordinadora.com/rastreo/{GUIDE}' },
      { id: 'c-3', name: 'Envía', code: 'envia', active: true, trackingUrlTemplate: 'https://envia.co/rastreo/{GUIDE}' },
      { id: 'c-4', name: 'Interrapidísimo', code: 'interrapidisimo', active: true, trackingUrlTemplate: 'https://interrapidisimo.com/rastreo/{GUIDE}' }
    ]
  },

  globalTexts: {
    welcomeBannerText: '¡Bienvenido a Zavela Store Colombia! Disfruta de pago contra entrega en todos los productos.',
    codNoticeText: 'Paga con tranquilidad en tu puerta: en efectivo o transferencia al recibir.',
    freeShippingNotice: '¡Envío Gratis por compras superiores a \$120.000 COP!',
    emptyCartText: 'Tu carrito de compras está vacío. ¡Explora nuestro catálogo y añade tus favoritos!',
    whatsappOrderTemplate: 'Hola Zavela Store, realicé el pedido *{ORDER_NUMBER}* a nombre de *{NAME}* por valor de *{TOTAL}*. ¿Me confirman el despacho?',
    checkoutNotice: 'Al pulsar confirmar pedido, autorizas el despacho a tu dirección con pago contra entrega.',
    orderSuccessSubtitle: 'Hemos recibido tu pedido con éxito. Nuestro equipo de bodega está alistando tu paquete.'
  },

  themeStyles: {
    borderRadius: 'md',
    glowIntensity: 'normal',
    fontFamily: 'sans',
    darkThemeIntensity: 'midnight'
  },

  luckyWheel: {
    enabled: false,
    title: '🎉 ¡Gira la Ruleta y Gana tu Descuento!',
    subtitle: 'Desbloquea entre 5% y 15% OFF de regalo en tu producto favorito con Pago Contra Entrega.',
    badgeText: '🎁 Premio Exclusivo Zavela',
    callToActionText: '🎯 Girar Ruleta de Descuentos',
    inactivitySeconds: 40, minVisitedProducts: 2, couponExpiryMinutes: 15, spinDurationSeconds: 4.5,
    enableExitIntent: true, enableInactivityTrigger: true, enableVisitedThresholdTrigger: true, enableFloatingBadge: true,
    activeSeason: 'default', seasonName: 'Estándar', seasonTagline: 'Descuentos exclusivos y sorpresas todo el año',
    seasonAccentColor: '#f59e0b', seasonBadgeEmoji: '🎁',
    segments: [
      { id: 'seg-1', label: '10% OFF', percentage: 10, color: '#0284c7', textColor: '#ffffff', couponPrefix: 'RULETA10' }
    ]
  },

  gamificationGame: {
    enabled: false, activeSeason: 'standard', seasonName: 'Estándar (Todo el Año)',
    gameTitle: '🎯 ¡Desafío Flash: Atrapa tu Descuento!',
    gameSubtitle: 'Mueve la canasta, esquiva las ráfagas de viento y atrapa los cupones que caen para desbloquear hasta 15% OFF exclusivo.',
    badgeEmoji: '🌪️', accentColor: '#f59e0b', minDiscountPercentage: 5, maxDiscountPercentage: 15,
    tiers: { bronze: { minScore: 1, discountPercentage: 5, label: 'Nivel Bronce 🥉', couponPrefix: 'FLASH5' } } as any,
    gameDurationSeconds: 15, windEnabled: true, windChangeIntervalSeconds: 2.5, basketSpeed: 1.0, couponExpiryMinutes: 10,
    enableGyroscope: true, gyroSensitivity: 1.2, gyroDeadzone: 5, difficultyLevel: 'hard', missPenaltyPoints: 1,
    includeObstacles: true, inactivitySeconds: 35, minVisitedProducts: 2, enableExitIntent: true, enableInactivityTrigger: true,
    enableVisitedThresholdTrigger: true, enableFloatingBadge: true
  },

  // 🧹 EXCLUSIVIDAD LIMPIA (ADIÓS BOLSOS FANTASMA)
  exclusivityPage: {
    enabled: true,
    navTitle: 'EXCLUSIVIDAD (Bolsos & Placas)',
    heroBadge: '💎 EDICIÓN LIMITADA 2026',
    heroTitle: 'Colección Exclusiva de Bolsos de Cuentas',
    heroSubtitle: 'Piezas artesanales únicas.',
    heroCtaText: 'Ver Modelos Disponibles',
    heroBannerImage: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80',
    platesShowcaseTitle: 'Showcase de Placas de Autenticidad',
    platesShowcaseSubtitle: 'Grabado láser de alta precisión',
    craftsmanshipGuaranteeText: 'Garantía directa de 30 días.',
    plates: [],
    curatedProducts: []
  },

  customSubpages: []
};

// 🧹 LOGS, POSTS, ORDERS Y CUSTOMERS LIMPIOS
const DEFAULT_LOGS: SystemLog[] = [];
export const DEFAULT_ADVISORS: Advisor[] = [];
export const DEFAULT_ADVISOR_SALES: AdvisorSale[] = [];
export const DEFAULT_SOCIAL_SETTINGS: SocialMarketingSettings = {
  autoPublishOnProductCreate: true,
  autoPublishOnProductUpdate: true,
  defaultHashtags: ['#ZavelaStore', '#PagoContraEntrega', '#Colombia'],
  includePrice: true,
  includeCodBadge: true,
  includeFreeShippingBadge: true,
  callToActionText: '📦 ¡Pide hoy y paga al recibir en la puerta de tu casa!',
  targetChannels: { facebook: true, instagram: true, tiktok: true },
  copyTone: 'viral_high_converting',
  connections: {} as any
};
export const DEFAULT_SOCIAL_POSTS: SocialBroadcastPost[] = [];
const DEFAULT_ORDERS: Order[] = [];
const DEFAULT_CUSTOMERS: Customer[] = [];

export function isHumanOrAdvisorProfile(p: any): boolean {
  if (!p) return false;
  const title = String(p.title || p.nombre || p.name || '').toLowerCase().trim();
  const id = String(p.id || (p as any).productId || '').toLowerCase().trim();
  const slug = String(p.slug || '').toLowerCase().trim();
  const cat = String(p.categoryName || p.categoria || (p as any).role || (p as any).rol || '').toLowerCase().trim();

  // 🛡️ FIREWALL DE ASESORES: Bloqueo estricto de usuarios, administradores y perfiles humanos
  const humanKeywords = [
    'asesor', 'asesora', 'asesores', 'asesor de redes', 'asesora de redes',
    'admin', 'administrador', 'administradora', 'administradores',
    'sergio martínez', 'sergio martinez', 'asesor de ventas', 'asesor comercial',
    'vendedor', 'vendedora', 'atencion al cliente', 'atención al cliente',
    'soporte humano', 'ejecutivo de ventas', 'ejecutiva de ventas'
  ];

  return humanKeywords.some(kw => 
    title.includes(kw) || 
    slug.includes(kw.replace(/\s+/g, '-')) || 
    cat.includes(kw) || 
    id.includes(kw.replace(/\s+/g, '-'))
  );
}

export function isTestProduct(p: any): boolean {
  if (!p) return false;
  if (isHumanOrAdvisorProfile(p)) return true;

  const title = String(p.title || p.nombre || p.name || '').toLowerCase().trim();
  const id = String(p.id || (p as any).productId || '').toLowerCase().trim();
  const slug = String(p.slug || '').toLowerCase().trim();

  return (
    title.includes('prueba') || title.includes('dummy') || title.includes('producto test') ||
    title.includes('test sincronizacion') || title.includes('test cpanel') ||
    title === 'producto zavela store colombia' || title.startsWith('producto de prueba') ||
    id.startsWith('test-') || id.startsWith('temp-') || id.startsWith('prod-test') ||
    id.startsWith('test_') || slug.includes('prueba') || slug.includes('dummy') ||
    slug.includes('producto-test') || slug.includes('test-')
  );
}

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed && Array.isArray(parsed.products)) {
          const categories = Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES;
          const rawProducts = Array.isArray(parsed.products)
            ? (parsed.products || [])
                .filter((p: any) => !isTestProduct(p))
                .map((p: any) => {
                  const dId = p.dropi_product_id ? String(p.dropi_product_id) : (p.dropiProductId ? String(p.dropiProductId) : '');
                  return {
                    ...p,
                    dropi_product_id: dId,
                    dropiProductId: dId,
                    warrantyInfo: (p.warrantyInfo || '30 días de garantía oficial').replace(/dropi|novora/gi, 'Zavela'),
                    warehouseCity: p.warehouseCity || p.dropiWarehouseCity || 'Bogotá D.C.',
                    brand: (p.brand && !p.brand.toLowerCase().includes('novora')) ? p.brand : 'Zavela',
                    tags: (p.tags || []).filter((t: string) => typeof t === 'string' && !t.toLowerCase().includes('drop'))
                  };
                })
            : [];

          dropiBackupService.restoreProducts(rawProducts);

          const harvestMap: Record<string, string> = {};
          for (const p of rawProducts) {
            if (p.dropi_product_id && String(p.dropi_product_id).trim()) {
              harvestMap[String(p.id)] = String(p.dropi_product_id).trim();
            }
          }
          if (Object.keys(harvestMap).length > 0) {
            dropiBackupService.saveBulk(harvestMap);
          }

          const products = rawProducts;

          // Ya no permitimos que jale banners o items viejos
          const mergedSettings: StoreSettings = {
            ...DEFAULT_SETTINGS,
            ...(parsed.settings || {}),
            heroBanners: [], 
            headerTicker: {
              ...DEFAULT_SETTINGS.headerTicker,
              ...(parsed.settings?.headerTicker || {}),
              items: DEFAULT_SETTINGS.headerTicker.items
            }
          };

          const data: DatabaseSchema = {
            categories,
            products,
            orders: (parsed.orders || []).filter((o: any) => {
              const name = String(o.customerName || '').toLowerCase().trim();
              const num = String(o.orderNumber || '').toUpperCase().trim();
              const id = String(o.id || '');
              return !(name.includes('prueba') || name.includes('test') || id.includes('sim') || id.includes('test'));
            }).map((o: any) => ({
              ...o,
              orderNumber: o.orderNumber?.replace(/^DP-/, 'NV-') || 'NV-1001',
              trackingNumber: o.trackingNumber || o.dropiTrackingNumber,
              carrier: o.carrier || o.dropiCarrier || 'Servientrega',
              guideUrl: o.guideUrl || o.dropiGuideUrl,
              status: (['enviado_a_dropi', 'recibido_por_dropi', 'error'].includes(o.status)) ? 'procesando' : o.status
            })),
            customers: parsed.customers || DEFAULT_CUSTOMERS,
            settings: mergedSettings,
            logs: parsed.logs || DEFAULT_LOGS,
            advisors: Array.isArray(parsed.advisors) ? parsed.advisors : [],
            advisorSales: Array.isArray(parsed.advisorSales) ? parsed.advisorSales : [],
            socialSettings: parsed.socialSettings || DEFAULT_SOCIAL_SETTINGS,
            socialPosts: []
          };

          if (!data.orders) { data.orders = []; }
          this.saveData(data);
          return data;
        }
      }
    } catch (e) {
      console.warn('Error reading data_store.json, initializing with default data:', e);
    }
    const initial: DatabaseSchema = {
      categories: DEFAULT_CATEGORIES,
      products: DEFAULT_PRODUCTS,
      orders: [],
      customers: DEFAULT_CUSTOMERS,
      settings: DEFAULT_SETTINGS,
      logs: DEFAULT_LOGS,
      advisors: [],
      advisorSales: [],
      socialSettings: DEFAULT_SOCIAL_SETTINGS,
      socialPosts: DEFAULT_SOCIAL_POSTS
    };
    this.data = initial;
    initial.orders = [];
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving data_store.json:', e);
    }
  }

  getCategories(): Category[] {
    return this.data.categories.map(c => ({
      ...c,
      productCount: this.data.products.filter(p => p.categoryId === c.id && p.active).length
    }));
  }

  getCategoryBySlug(slug: string): Category | undefined {
    return this.data.categories.find(c => c.slug === slug);
  }

  saveCategory(cat: Partial<Category>): Category {
    const rawId = cat.id ? String(cat.id).trim() : '';
    
    // Validación de seguridad: Rechazar IDs con prefijo de producto
    if (rawId.toLowerCase().startsWith('prod-') || rawId.toLowerCase().startsWith('product-')) {
      throw new Error(`Prefijo no permitido: El identificador "${rawId}" corresponde a un producto y no puede ser guardado en categorías.`);
    }

    // Validación de seguridad: Rechazar objetos con campos exclusivos de productos
    const productFields = ['price', 'precio', 'costPrice', 'supplier_cost', 'stock', 'cantidad', 'variants', 'variantes', 'dropiProductId', 'dropi_product_id'];
    for (const field of productFields) {
      if ((cat as any)[field] !== undefined && (cat as any)[field] !== null && (cat as any)[field] !== '') {
        throw new Error(`Estructura inválida: El objeto contiene el campo de producto "${field}" y no puede guardarse como categoría.`);
      }
    }

    const cleanId = rawId || `cat-${Date.now()}`;
    const existingIndex = this.data.categories.findIndex(c => 
      String(c.id).trim().toLowerCase() === cleanId.toLowerCase()
    );

    const updatedCategory: Category = {
      id: cleanId,
      name: cat.name || 'Nueva Categoría',
      slug: cat.slug || (cat.name ? cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : `cat-${Date.now()}`),
      description: cat.description || '',
      icon: cat.icon || 'Sparkles',
      active: cat.active !== false,
      order: cat.order ?? (this.data.categories.length + 1),
      subcategories: Array.isArray(cat.subcategories) ? cat.subcategories : []
    };

    if (existingIndex >= 0) {
      this.data.categories[existingIndex] = updatedCategory;
    } else {
      this.data.categories.push(updatedCategory);
    }
    this.saveData(this.data);
    return updatedCategory;
  }

  deleteCategory(id: string): boolean {
    const cleanId = String(id || '').trim();
    if (!cleanId) return false;
    const lowerClean = cleanId.toLowerCase();

    // Acepta cualquier prefijo (cat-, prod-, numérico, etc.) y busca coincidencia
    // por ID exacto, en minúsculas, por productId o slug
    const idx = this.data.categories.findIndex(c => {
      const catId = String(c.id || '').trim();
      const catProductId = String((c as any).productId || (c as any).id_producto || '').trim();
      const catSlug = String(c.slug || '').trim();

      return (
        catId === cleanId ||
        catId.toLowerCase() === lowerClean ||
        (catProductId && (catProductId === cleanId || catProductId.toLowerCase() === lowerClean)) ||
        (catSlug && catSlug.toLowerCase() === lowerClean)
      );
    });

    if (idx >= 0) {
      this.data.categories.splice(idx, 1);
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  getProducts(filter?: { categorySlug?: string; search?: string; onlyActive?: boolean; featured?: boolean }): Product[] {
    const deleted = new Set((this.data.deletedProductIds || []).map(id => String(id).trim()));
    let result = this.data.products.filter(p => !isTestProduct(p) && !deleted.has(String(p.id).trim()) && !deleted.has(String((p as any).productId || '')));
    if (filter?.onlyActive) { result = result.filter(p => p.active); }
    if (filter?.featured) { result = result.filter(p => p.featured); }
    if (filter?.categorySlug && filter.categorySlug !== 'todos') {
      const cat = this.getCategoryBySlug(filter.categorySlug);
      if (cat) { result = result.filter(p => p.categoryId === cat.id); }
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) || 
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    const backupMap = dropiBackupService.getBackupMap();
    return result.map(p => {
      const dId = p.dropi_product_id ? String(p.dropi_product_id).trim() : (p.dropiProductId ? String(p.dropiProductId).trim() : (backupMap[String(p.id)] || ''));
      return { ...p, dropi_product_id: dId, dropiProductId: dId };
    });
  }

  isProductDeleted(id: string): boolean {
    const target = String(id).trim();
    return Boolean(this.data.deletedProductIds && this.data.deletedProductIds.includes(target));
  }

  getProductById(idOrSlug: string): Product | undefined {
    if (!idOrSlug) return undefined;
    const target = String(idOrSlug).trim();
    const cleanTarget = target.replace(/^proc-/, '').replace('proc-', '').trim();
    if (this.isProductDeleted(target) || (cleanTarget && this.isProductDeleted(cleanTarget))) return undefined;

    const lowerTarget = target.toLowerCase();
    const lowerCleanTarget = cleanTarget.toLowerCase();
    const enrich = (prod: Product): Product => {
      const backupMap = dropiBackupService.getBackupMap();
      const dId = prod.dropi_product_id ? String(prod.dropi_product_id).trim() : (prod.dropiProductId ? String(prod.dropiProductId).trim() : (backupMap[String(prod.id)] || ''));
      return { ...prod, dropi_product_id: dId, dropiProductId: dId };
    };

    const found = this.data.products.find(p => {
      const pId = String(p.id).trim();
      const cleanPId = pId.replace(/^proc-/, '').replace('proc-', '').trim();
      return (
        pId === target || pId === cleanTarget || cleanPId === cleanTarget || cleanPId === target ||
        p.slug === target || p.slug === cleanTarget ||
        pId.toLowerCase() === lowerTarget || pId.toLowerCase() === lowerCleanTarget ||
        (p.slug && (p.slug.trim().toLowerCase() === lowerTarget || p.slug.trim().toLowerCase() === lowerCleanTarget)) ||
        String((p as any).productId || '').trim() === target ||
        String((p as any).productId || '').trim() === cleanTarget
      );
    });
    if (found && !isTestProduct(found)) return enrich(found);

    const norm = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+\$/g, '');
    const normTarget = norm(target);

    const normFound = this.data.products.find(p => norm(p.slug || '') === normTarget || norm(p.id || '') === normTarget || norm(p.title || '') === normTarget);
    if (normFound && !isTestProduct(normFound)) return enrich(normFound);

    return undefined;
  }

  saveProduct(product: Product): Product {
    if (isTestProduct(product)) { return product; }
    if (product.id && this.data.deletedProductIds) {
      this.data.deletedProductIds = this.data.deletedProductIds.filter(id => id !== String(product.id).trim());
    }
    const target = String(product.id).trim();

    const incomingDropi = product.dropi_product_id !== undefined && product.dropi_product_id !== null && String(product.dropi_product_id).trim() !== ''
      ? String(product.dropi_product_id).trim() : ((product as any).dropiProductId !== undefined && (product as any).dropiProductId !== null && String((product as any).dropiProductId).trim() !== '' ? String((product as any).dropiProductId).trim() : '');

    const backupMap = dropiBackupService.getBackupMap();
    const existing = this.data.products.find(p => String(p.id).trim() === target);
    const existingDropi = existing?.dropi_product_id ? String(existing.dropi_product_id).trim() : (backupMap[target] || '');

    const finalDropi = incomingDropi || existingDropi;
    if (finalDropi) { dropiBackupService.saveDropiId(target, finalDropi); }

    const index = this.data.products.findIndex(p => String(p.id).trim() === target);
    const updatedProduct = { ...product, dropi_product_id: finalDropi, dropiProductId: finalDropi, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      this.data.products[index] = updatedProduct;
    } else {
      this.data.products.unshift(updatedProduct);
    }
    this.saveData(this.data);
    return updatedProduct;
  }

  deleteProduct(id: string): boolean {
    const target = String(id).trim();
    if (!this.data.deletedProductIds) { this.data.deletedProductIds = []; }
    const exists = this.data.products.some(p => String(p.id).trim() === target || (p as any).productId === target || p.slug === target);
    if (!this.data.deletedProductIds.includes(target)) { this.data.deletedProductIds.push(target); }
    this.data.products = this.data.products.filter(p => String(p.id).trim() !== target && (p as any).productId !== target && p.slug !== target);
    this.saveData(this.data);
    return exists;
  }

  setProducts(products: Product[]): Product[] {
    this.data.products = products.filter(p => !isTestProduct(p));
    this.saveData(this.data);
    return this.data.products;
  }

  mergeRemoteProducts(remoteProducts: Product[]): void {
    if (!remoteProducts || !Array.isArray(remoteProducts) || remoteProducts.length === 0) return;
    const deleted = new Set((this.data.deletedProductIds || []).map(id => String(id).trim()));
    const backupMap = dropiBackupService.getBackupMap();

    for (const remote of remoteProducts) {
      if (isTestProduct(remote)) continue;
      const targetRemoteId = String(remote.id).trim();
      if (deleted.has(targetRemoteId) || (remote.slug && deleted.has(remote.slug))) continue;
      
      const idx = this.data.products.findIndex(p => String(p.id).trim() === targetRemoteId || p.slug === remote.slug);
      if (idx >= 0) {
        const existing = this.data.products[idx];
        const remoteImages = (Array.isArray(remote.images) && remote.images.length > 0) ? remote.images : [];
        const existingImages = (Array.isArray(existing.images) && existing.images.length > 0) ? existing.images : [];
        const finalImages = remoteImages.length > existingImages.length ? remoteImages : (existingImages.length > 0 ? existingImages : remoteImages);
        const finalDropiId = (remote.dropi_product_id && String(remote.dropi_product_id).trim().length > 0) ? String(remote.dropi_product_id).trim() : (existing.dropi_product_id ? String(existing.dropi_product_id).trim() : (backupMap[targetRemoteId] || ''));

        if (finalDropiId) { dropiBackupService.saveDropiId(String(targetRemoteId), String(finalDropiId)); }

        this.data.products[idx] = { ...existing, ...remote, images: finalImages.length > 0 ? finalImages : existingImages, dropi_product_id: finalDropiId, dropiProductId: finalDropiId };
      } else {
        const dId = remote.dropi_product_id ? String(remote.dropi_product_id).trim() : (backupMap[targetRemoteId] || '');
        if (dId) { dropiBackupService.saveDropiId(targetRemoteId, dId); }
        this.data.products.unshift({ ...remote, dropi_product_id: dId, dropiProductId: dId });
      }
    }
  }

  mergeRemoteOrders(remoteOrders: Order[]): void {
    if (!remoteOrders || !Array.isArray(remoteOrders) || remoteOrders.length === 0) return;
    for (const remote of remoteOrders) {
      const idx = this.data.orders.findIndex(o => o.id === remote.id || o.orderNumber === remote.orderNumber);
      if (idx >= 0) {
        const existing = this.data.orders[idx];
        const finalCity = (remote.city && remote.city !== 'Bogotá D.C.') ? remote.city : (existing.city || remote.city);
        const finalDept = (remote.department && remote.department !== 'Cundinamarca' && remote.department !== 'Bogotá D.C.')
          ? remote.department
          : (existing.department || remote.department);
        const finalDane = remote.dane_code || existing.dane_code;
        const finalItems = (Array.isArray(remote.items) && remote.items.length > 0 && remote.items[0]?.title && remote.items[0]?.title !== 'Producto')
          ? remote.items
          : (existing.items && existing.items.length > 0 ? existing.items : remote.items);

        this.data.orders[idx] = {
          ...existing,
          ...remote,
          city: finalCity,
          department: finalDept,
          dane_code: finalDane,
          items: finalItems
        };
      } else {
        this.data.orders.unshift(remote);
      }
    }
  }

  getOrders(filter?: { status?: OrderStatus; search?: string }): Order[] {
    let result = [...this.data.orders];
    if (filter?.status) { result = result.filter(o => o.status === filter.status); }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(o => o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.customerPhone.includes(q) || o.customerEmail.toLowerCase().includes(q) || o.trackingNumber?.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrderById(idOrNumber: string): Order | undefined {
    const q = idOrNumber.trim().toLowerCase();
    return this.data.orders.find(o => 
      o.id === idOrNumber || 
      o.id?.toLowerCase() === q || 
      o.orderNumber.toLowerCase() === q || 
      o.trackingNumber?.toLowerCase() === q ||
      (o.dropi_guia && o.dropi_guia.toLowerCase() === q)
    );
  }

  getOrderByPhoneOrEmail(query: string): Order[] {
    const q = query.trim().toLowerCase();
    const cleanDigits = q.replace(/\D/g, '');
    return this.data.orders.filter(o => 
      o.id?.toLowerCase() === q ||
      o.id?.toLowerCase().includes(q) ||
      (cleanDigits.length >= 6 && o.id?.replace(/\D/g, '').includes(cleanDigits)) ||
      o.customerPhone.includes(q) || 
      o.customerEmail.toLowerCase() === q || 
      o.orderNumber.toLowerCase() === q || 
      o.orderNumber.toLowerCase().includes(q) ||
      o.trackingNumber?.toLowerCase() === q ||
      o.trackingNumber?.toLowerCase().includes(q) ||
      (o.dropi_guia && o.dropi_guia.toLowerCase() === q)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  saveOrder(order: Order): Order {
    const index = this.data.orders.findIndex(o => o.id === order.id);
    const updatedOrder = { ...order, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      this.data.orders[index] = updatedOrder;
    } else {
      this.data.orders.unshift(updatedOrder);
      this.upsertCustomerFromOrder(updatedOrder);
    }
    this.saveData(this.data);
    return updatedOrder;
  }

  private upsertCustomerFromOrder(order: Order) {
    const existingIndex = this.data.customers.findIndex(c => c.phone === order.customerPhone || (c.email && c.email.toLowerCase() === order.customerEmail.toLowerCase()));
    const [firstName, ...rest] = order.customerName.split(' ');
    const lastName = rest.join(' ') || '';

    if (existingIndex >= 0) {
      const existing = this.data.customers[existingIndex];
      this.data.customers[existingIndex] = { ...existing, totalOrders: existing.totalOrders + 1, totalSpent: existing.totalSpent + order.total, department: order.department, city: order.city, address: order.address };
    } else {
      const newCust: Customer = { id: `cust-${Date.now()}`, firstName: firstName || order.customerName, lastName, email: order.customerEmail, phone: order.customerPhone, department: order.department, city: order.city, address: order.address, notes: order.additionalNotes, totalOrders: 1, totalSpent: order.total, createdAt: new Date().toISOString() };
      this.data.customers.unshift(newCust);
    }
  }

  deleteOrder(id: string): boolean {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx >= 0) {
      this.data.orders.splice(idx, 1);
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  getCustomers(): Customer[] { return this.data.customers; }
  getCustomerById(id: string): Customer | undefined { return this.data.customers.find(c => c.id === id); }
  
  saveCustomer(customer: Partial<Customer>): Customer {
    const idx = this.data.customers.findIndex(c => c.id === customer.id);
    const updatedCustomer: Customer = {
      id: customer.id || `cust-${Date.now()}`, firstName: customer.firstName || 'Cliente', lastName: customer.lastName || '', email: customer.email || '', phone: customer.phone || '', department: customer.department || 'Bogotá D.C.', city: customer.city || 'Bogotá D.C.', address: customer.address || '', notes: customer.notes || '', totalOrders: customer.totalOrders ?? 0, totalSpent: customer.totalSpent ?? 0, createdAt: customer.createdAt || new Date().toISOString()
    };
    if (idx >= 0) { this.data.customers[idx] = updatedCustomer; } else { this.data.customers.unshift(updatedCustomer); }
    this.saveData(this.data);
    return updatedCustomer;
  }

  deleteCustomer(id: string): boolean {
    const idx = this.data.customers.findIndex(c => c.id === id);
    if (idx >= 0) { this.data.customers.splice(idx, 1); this.saveData(this.data); return true; }
    return false;
  }

  clearAllCustomers(): boolean { this.data.customers = []; this.saveData(this.data); return true; }

  cleanTestRecords(): { deletedOrders: number; deletedCustomers: number; deletedProducts: number } {
    return { deletedOrders: 0, deletedCustomers: 0, deletedProducts: 0 };
  }

  getSettings(): StoreSettings { return this.data.settings; }
  saveSettings(settings: Partial<StoreSettings>): StoreSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.saveData(this.data);
    return this.data.settings;
  }

  getLogs(limit = 100): SystemLog[] { return this.data.logs.slice(0, limit); }
  clearLogs(): boolean { this.data.logs = []; this.saveData(this.data); return true; }
  addLog(log: Omit<SystemLog, 'id' | 'createdAt'>): SystemLog {
    const newLog: SystemLog = { id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, ...log, createdAt: new Date().toISOString() };
    this.data.logs.unshift(newLog);
    if (this.data.logs.length > 500) { this.data.logs = this.data.logs.slice(0, 500); }
    this.saveData(this.data);
    return newLog;
  }

  getFullBackup(): DatabaseSchema { return this.data; }
  
  restoreBackup(backupData: DatabaseSchema): boolean {
    if (!backupData || !Array.isArray(backupData.products)) { throw new Error('Formato de respaldo JSON no válido'); }
    this.data = {
      categories: backupData.categories || DEFAULT_CATEGORIES,
      products: backupData.products || DEFAULT_PRODUCTS,
      orders: backupData.orders || DEFAULT_ORDERS,
      customers: backupData.customers || DEFAULT_CUSTOMERS,
      advisors: backupData.advisors || DEFAULT_ADVISORS,
      advisorSales: backupData.advisorSales || DEFAULT_ADVISOR_SALES,
      settings: { ...DEFAULT_SETTINGS, ...(backupData.settings || {}) },
      logs: backupData.logs || DEFAULT_LOGS
    };
    this.saveData(this.data);
    return true;
  }

  resetToDefaultData(): boolean {
    this.data = {
      categories: DEFAULT_CATEGORIES, products: DEFAULT_PRODUCTS, orders: DEFAULT_ORDERS, customers: DEFAULT_CUSTOMERS,
      advisors: DEFAULT_ADVISORS, advisorSales: DEFAULT_ADVISOR_SALES, settings: DEFAULT_SETTINGS, logs: DEFAULT_LOGS
    };
    this.saveData(this.data);
    return true;
  }

  clearAllOrders(): boolean {
    this.data.orders = []; this.data.customers = []; this.data.advisorSales = []; this.saveData(this.data); return true;
  }

  simulateOrders(options?: any): Order[] { return []; }
  simulate3OrdersPerProduct(): Order[] { return []; }
  getMetrics() { return {} as any; }
  getAdvisors(): Advisor[] { return advisorStore.listAdvisors(); }
  getAdvisorById(id: string): Advisor | undefined { return advisorStore.getAdvisor(id); }
  saveAllAdvisors(_advisors: Advisor[]): void { /* los asesores viven en MySQL (advisorStore) */ }
  saveAllProducts(products: Product[]): void { this.data.products = products; this.saveData(this.data); }
  saveAdvisor(advisor: Partial<Advisor>): Advisor { return advisorStore.saveAdvisor(advisor); }
  authenticateAdvisor(identifier: string, password: string): Advisor | null { return advisorStore.authenticate(identifier, password); }
  deleteAdvisor(id: string): boolean { return advisorStore.deleteAdvisors([id]) > 0; }
  deleteAdvisors(ids: string[]): number { return advisorStore.deleteAdvisors(ids); }
  settleAdvisor(id: string, notes?: string): Advisor | null {
    const a = advisorStore.getAdvisor(id);
    return a ? advisorStore.saveAdvisor({ id, settlementStatus: 'liquidado', lastSettlementDate: new Date().toISOString(), notes: notes ?? a.notes }) : null;
  }
  // ---- Ventas de asesores: cada venta es un pedido normal + una marca de asesor (advisorSalesStore) ----
  private orderToAdvisorSale(o: Order, a: sales.SaleAttribution): AdvisorSale {
    const s = String((o as any).status || '').toLowerCase().trim();
    let dropiStatus: DropiStatus = 'pendiente_bolsa';
    if (['cancelado', 'rechazado', 'error_dropi', 'devuelto'].includes(s)) dropiStatus = 'cancelado';
    else if (s === 'entregado') dropiStatus = 'entregado';
    else if (s === 'enviado') dropiStatus = 'enviado';
    else if (o.dropi_guia || o.trackingNumber) dropiStatus = 'guia_generada';
    else if (['aprobado_dropi', 'aprobado', 'procesando', 'pago_confirmado', 'pagado'].includes(s)) dropiStatus = 'montado_dropi';
    const first = (o.items || [])[0];
    const qty = (o.items || []).reduce((n, it) => n + Number(it.quantity || 1), 0) || 1;
    const status = sales.statusOf(o, a);
    return {
      id: o.id, orderNumber: o.orderNumber, advisorId: a.advisorId, advisorName: a.advisorName, advisorChannel: a.channel,
      sellerCode: a.sellerCode, productId: first?.productId, productTitle: (o.items || []).length > 1 ? (o.items || []).map(it => `${it.title} x${it.quantity}`).join(' + ') : (first?.title || 'Producto'), items: (o.items || []).map((it: any) => ({ productId: it.productId, title: it.title, quantity: Number(it.quantity || 1), unitPrice: Number(it.unitPrice || 0) })), quantity: qty,
      unitPrice: Number(first?.unitPrice || 0), totalAmount: Number(o.total ?? o.totalAmount ?? 0),
      clientName: o.customerName || '', clientPhone: o.customerPhone || '', clientCity: o.city || '', clientDepartment: o.department,
      clientAddress: o.address || '', additionalNotes: o.additionalNotes, dropiStatus, dropiOrderId: o.dropi_order_id ? String(o.dropi_order_id) : undefined,
      trackingNumber: o.dropi_guia || o.trackingNumber, carrier: o.carrier, carrierTrackingUrl: o.carrierTrackingUrl, paymentMethod: (o.paymentMethod === 'epayco' || o.paymentMethod === 'pago_online') ? 'pse' : 'contra_entrega', paymentStatus: String(o.paymentStatus || ''), clientEmail: o.customerEmail || '',
      commissionRate: a.commissionRate, commissionAmount: sales.estimatedCommission(o, a), commissionFrozen: a.commissionAmount != null,
      commissionStatus: status, dropiPaidAt: a.dropiPaidAt, paidAt: a.paidAt, createdAt: o.createdAt, updatedAt: o.updatedAt
    };
  }

  getAdvisorSales(filter?: any): AdvisorSale[] {
    const out: AdvisorSale[] = [];
    for (const a of sales.listAttributions()) {
      const o = this.data.orders.find(x => x.id === a.orderId);
      if (!o) continue;
      out.push(this.orderToAdvisorSale(o, a));
    }
    let res = out;
    if (filter?.advisorId) res = res.filter(x => x.advisorId === filter.advisorId);
    if (filter?.dropiStatus) res = res.filter(x => x.dropiStatus === filter.dropiStatus);
    if (filter?.search) {
      const q = String(filter.search).toLowerCase();
      res = res.filter(x => [x.clientName, x.clientPhone, x.clientCity, x.productTitle, x.orderNumber].some(v => String(v || '').toLowerCase().includes(q)));
    }
    return res.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
  }

  /** Un asesor registra una venta: se crea un pedido "Pendiente de autorizar" marcado con su código. */
  saveAdvisorSale(sale: Partial<AdvisorSale>): AdvisorSale {
    const existing = sale.id ? this.data.orders.find(o => o.id === sale.id) : undefined;
    const attrExisting = existing ? sales.getAttribution(existing.id) : undefined;
    if (existing && attrExisting) return this.orderToAdvisorSale(existing, attrExisting); // las ventas ya registradas se gestionan desde el Centro de Despachos

    const adv = sale.advisorId ? advisorStore.getAdvisor(sale.advisorId) : undefined;
    if (!adv) throw new Error('Asesor no válido.');
    // Lista de productos de la venta (acepta el formato antiguo de un solo producto).
    const rawItems: any[] = Array.isArray((sale as any).items) && (sale as any).items.length
      ? (sale as any).items
      : [{ productId: sale.productId, title: sale.productTitle, quantity: sale.quantity, unitPrice: sale.unitPrice }];
    const products = this.getProducts();
    const lines = new Map<string, { product: Product; qty: number }>();
    for (const it of rawItems) {
      const title = String(it.title || it.productTitle || '').trim().toLowerCase();
      const product = products.find(p => String(p.id) === String(it.productId)) ||
        (title ? products.find(p => (p.title || '').trim().toLowerCase() === title) : undefined);
      if (!product) throw new Error(`Selecciona el producto de la lista del catálogo${it.title ? ` ("${it.title}" no está)` : ''}.`);
      if ((product as any).active === false) throw new Error(`"${product.title}" no está disponible para la venta.`);
      const qty = Math.max(1, Math.min(50, Math.floor(Number(it.quantity) || 1)));
      const key = String(product.id);
      lines.set(key, { product, qty: (lines.get(key)?.qty || 0) + qty });
    }
    if (!lines.size) throw new Error('Agrega al menos un producto a la venta.');
    // Control de inventario: no se vende más de lo que hay.
    for (const { product, qty } of lines.values()) {
      const stock = Number(product.stock ?? 0);
      if (qty > stock) throw new Error(stock <= 0 ? `"${product.title}" está agotado.` : `De "${product.title}" solo quedan ${stock} unidad(es).`);
    }
    const isPse = sale.paymentMethod === 'pse';
    const clientEmail = String(sale.clientEmail || '').trim().toLowerCase();
    if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) throw new Error('El correo del cliente no es válido.');
    const stamp = Date.now();
    const orderItems: any[] = [];
    let subtotal = 0, costTotal = 0, shipTotal = 0, feeTotal = 0;
    let n = 0;
    for (const { product, qty } of lines.values()) {
      // El precio y los costos salen del catálogo (no del navegador).
      const unitPrice = Number(product.price) || 0;
      const unitCost = Number(product.costPrice || 0);
      const ship = Number(product.shippingCost ?? product.estimatedShippingCost ?? product.shipping_cost ?? 0);
      const fee = Number(product.dropiFee ?? product.dropi_fee ?? 0);
      subtotal += unitPrice * qty; costTotal += unitCost * qty; shipTotal += ship * qty; feeTotal += fee * qty;
      orderItems.push({ id: `item-${stamp}-${++n}`, orderId: '', productId: String(product.id), title: product.title, quantity: qty, unitPrice, unitCost, subtotal: unitPrice * qty });
    }
    const id = `ord-${stamp}`;
    orderItems.forEach(it => { it.orderId = id; });
    let orderNumber = `ZV-${Math.floor(1000 + Math.random() * 9000)}`;
    while (this.data.orders.some(o => o.orderNumber === orderNumber)) orderNumber = `ZV-${Math.floor(1000 + Math.random() * 9000)}`;
    const note = `Venta del asesor ${adv.name} (${adv.sellerCode}) por ${sale.advisorChannel || adv.channel || 'WhatsApp'}.${sale.additionalNotes ? ' ' + String(sale.additionalNotes).slice(0, 300) : ''}`;
    const order: Order = {
      id, orderNumber,
      customerName: String(sale.clientName || 'Cliente').slice(0, 120),
      customerPhone: String(sale.clientPhone || '').replace(/\D/g, '').slice(0, 15),
      customerEmail: clientEmail,
      department: String(sale.clientDepartment || '').slice(0, 80), city: String(sale.clientCity || '').slice(0, 80),
      address: String(sale.clientAddress || '').slice(0, 250), additionalNotes: note,
      subtotal, shippingCost: 0, total: subtotal,
      productCostTotal: costTotal, carrierFee: shipTotal, dropiFee: feeTotal,
      paymentMethod: (isPse ? 'epayco' : 'contra_entrega') as any, paymentStatus: (isPse ? 'PENDING' : 'CASH_ON_DELIVERY') as any,
      status: (isPse ? 'PENDIENTE_PAGO' : 'PENDIENTE_REVISION') as any,
      stock_deducted: !isPse,
      items: orderItems,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    } as Order;
    // Contra entrega: se descuenta el inventario al registrar. Con PSE se descuenta cuando el pago es aprobado.
    if (!isPse) for (const { product, qty } of lines.values()) {
      product.stock = Math.max(0, Number(product.stock || 0) - qty);
      this.saveProduct(product);
      import('./services/cpanelDbService.ts').then(m => m.cpanelDbService.decrementProductStock(String(product.id), qty)).catch(() => {});
    }
    const saved = this.saveOrder(order);
    const attr = sales.attributeOrder(saved.id, {
      advisorId: adv.id, sellerCode: adv.sellerCode || '', advisorName: adv.name,
      channel: String(sale.advisorChannel || adv.channel || 'WhatsApp'), commissionRate: Number(adv.commissionRate ?? 25)
    });
    return this.orderToAdvisorSale(saved, attr);
  }

  deleteAdvisorSale(id: string): boolean {
    const o = this.data.orders.find(x => x.id === id);
    const a = sales.getAttribution(id);
    if (!o || !a) return false;
    const s = String(o.status || '').toLowerCase();
    if (!(s === 'pendiente' || s === 'pendiente_revision' || (s === 'pendiente_pago' && o.paymentStatus !== 'APPROVED'))) return false; // solo si aún no se autorizó ni se pagó
    // Al borrar una venta que nunca se autorizó, las unidades vuelven al inventario (solo si se habían descontado).
    if (o.stock_deducted !== false) for (const it of (o.items || []) as any[]) {
      const p = this.getProducts().find(x => String(x.id) === String(it.productId));
      if (p) { p.stock = Number(p.stock || 0) + Number(it.quantity || 0); this.saveProduct(p); }
    }
    sales.removeAttribution(id);
    return this.deleteOrder(id);
  }
  deleteAdvisorSales(ids: string[]): number { return ids.filter(id => this.deleteAdvisorSale(id)).length; }
  markAdvisorSalesDropiStatus(_ids: string[], _status: DropiStatus): number { return 0; } // el estado lo maneja el Centro de Despachos

  getAdvisorsPerformance(): AdvisorPerformance[] {
    return advisorStore.listAdvisors().filter(a => a.role !== 'admin').map(a => {
      const list = this.getAdvisorSales({ advisorId: a.id }).filter(x => x.dropiStatus !== 'cancelado');
      const pending = list.filter(x => x.commissionStatus === 'por_pagar').reduce((n, x) => n + Number(x.commissionAmount || 0), 0);
      return {
        advisorId: a.id, advisorName: a.name, channel: a.channel || '',
        totalSalesCOP: list.reduce((n, x) => n + x.totalAmount, 0), unitsSold: list.reduce((n, x) => n + x.quantity, 0), orderCount: list.length,
        settlementStatus: pending > 0 ? 'pendiente_liquidacion' : (a.settlementStatus || 'al_dia'),
        pendingSettlementAmountCOP: pending, recentSales: list.slice(0, 5)
      } as AdvisorPerformance;
    });
  }
  getSocialMarketingSettings(): SocialMarketingSettings { return this.data.socialSettings || DEFAULT_SOCIAL_SETTINGS; }
  saveSocialMarketingSettings(settings: Partial<SocialMarketingSettings>): SocialMarketingSettings {
    const current = this.data.socialSettings || DEFAULT_SOCIAL_SETTINGS;
    const merged: SocialMarketingSettings = {
      ...current,
      ...settings,
      connections: { ...(current.connections || {}), ...((settings as any)?.connections || {}) } as any
    };
    this.data.socialSettings = merged;
    this.saveData(this.data);
    return merged;
  }
  getSocialBroadcastPosts(): SocialBroadcastPost[] { return this.data.socialPosts || []; }
  publishSocialPost(params: any): SocialBroadcastPost | null { return null; }
  deleteSocialBroadcastPost(id: string): boolean { return false; }
  autoBroadcastProduct(product: Product): SocialBroadcastPost | null { return null; }
  getConfig(key: string): string | null { return null; }
  setConfig(key: string, value: string): void {}
  getCatalogBackups(): CatalogBackup[] { return this.data.catalogBackups || []; }
  getCatalogBackupById(id: number | string): CatalogBackup | null { return null; }
  saveCatalogBackup(backup: any): CatalogBackup { return {} as any; }
  deleteCatalogBackup(id: number | string): boolean { return false; }
}

export const db = new DatabaseStore();
