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

const DB_FILE_PATH = path.join(process.cwd(), 'data_store.json');

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
}

const DEFAULT_CATEGORIES: Category[] = [
  { 
    id: 'cat-amor-amistad', 
    name: '💖 Amor y Amistad', 
    slug: 'amor-y-amistad', 
    active: true, 
    icon: 'Heart',
    description: 'Especial Amor y Amistad en Colombia: Joyería de pareja, rosas preservadas LED, proyectores galaxia, relojes dúo y regalos inolvidables con pago contra entrega.',
    order: 0,
    subcategories: [
      { id: 'sub-amor-1', name: 'Detalles y Rosas LED', slug: 'detalles-rosas', active: true },
      { id: 'sub-amor-2', name: 'Joyería & Pulseras de Pareja', slug: 'joyeria-parejas', active: true },
      { id: 'sub-amor-3', name: 'Relojes & Accesorios Dúo', slug: 'relojes-duo', active: true },
      { id: 'sub-amor-4', name: 'Cuidado y Relajación Romántica', slug: 'cuidado-relajacion', active: true }
    ]
  },
  { 
    id: 'cat-halloween', 
    name: '🎃 Halloween & Disfraces', 
    slug: 'halloween-disfraces', 
    active: true, 
    icon: 'Ghost',
    description: 'Especial Halloween y Noche de Brujas: Disfraces impactantes, máscaras LED de neón, calderos de niebla RGB, proyectores de terror y disfraces para mascotas con pago contra entrega.',
    order: 1,
    subcategories: [
      { id: 'sub-halo-1', name: 'Disfraces para Adultos y Niños', slug: 'disfraces-adultos-ninos', active: true },
      { id: 'sub-halo-2', name: 'Máscaras LED y Neón', slug: 'mascaras-led-neon', active: true },
      { id: 'sub-halo-3', name: 'Decoración Terror & Calderos Niebla', slug: 'decoracion-terror-niebla', active: true },
      { id: 'sub-halo-4', name: 'Disfraces para Mascotas', slug: 'disfraces-mascotas', active: true }
    ]
  },
  { 
    id: 'cat-navidad', 
    name: '🎄 Artículos Navideños y Diciembre', 
    slug: 'navidad-diciembre', 
    active: true, 
    icon: 'Gift',
    description: 'Luces navideñas inteligentes, árboles nevados, proyectores láser 3D, guirnaldas y decoración especial para celebrar la mejor época del año con pago contra entrega.',
    order: 2,
    subcategories: [
      { id: 'sub-nav-1', name: 'Luces y Proyectores LED', slug: 'luces-proyectores', active: true },
      { id: 'sub-nav-2', name: 'Árboles y Coronas', slug: 'arboles-coronas', active: true },
      { id: 'sub-nav-3', name: 'Inflables y Decoración Exterior', slug: 'inflables-exterior', active: true },
      { id: 'sub-nav-4', name: 'Regalos Navideños', slug: 'regalos-navidenos', active: true }
    ]
  },
  { 
    id: 'cat-1', 
    name: 'Belleza y Cuidado Personal', 
    slug: 'belleza-cuidado', 
    active: true, 
    icon: 'Sparkles',
    description: 'Perfumería fina de mujer y hombre, combos exclusivos de fragancias, cuidado capilar y bienestar personal con pago contra entrega.',
    order: 3,
    subcategories: [
      { id: 'sub-perfumeria', name: '💎 Perfumería & Fragancias', slug: 'perfumeria-fragancias', active: true },
      { id: 'sub-perfumes-mujer', name: '🌸 Perfumes de Mujer', slug: 'perfumes-mujer', active: true },
      { id: 'sub-perfumes-hombre', name: '🔥 Perfumes de Hombre', slug: 'perfumes-hombre', active: true },
      { id: 'sub-perfumes-combos', name: '🎁 Perfumes en Combo & Dúos', slug: 'perfumes-combos', active: true },
      { id: 'sub-1', name: 'Cuidado Capilar', slug: 'cuidado-capilar', active: true },
      { id: 'sub-2', name: 'Cuidado Facial', slug: 'cuidado-facial', active: true },
      { id: 'sub-3', name: 'Aparatos de Belleza', slug: 'aparatos-belleza', active: true }
    ]
  },
  { 
    id: 'cat-2', 
    name: 'Hogar y Cocina', 
    slug: 'hogar-cocina', 
    active: true, 
    icon: 'Home',
    description: 'Soluciones inteligentes, electrodomésticos portátiles y decoración para el hogar.',
    order: 4,
    subcategories: [
      { id: 'sub-4', name: 'Cocina Práctica', slug: 'cocina-practica', active: true },
      { id: 'sub-5', name: 'Iluminación y Ambiente', slug: 'iluminacion-ambiente', active: true },
      { id: 'sub-6', name: 'Organización', slug: 'organizacion', active: true }
    ]
  },
  { 
    id: 'cat-3', 
    name: 'Tecnología y Gadgets', 
    slug: 'tecnologia', 
    active: true, 
    icon: 'Smartphone',
    description: 'Smartwatches, audio inalámbrico y accesorios de última tecnología.',
    order: 5,
    subcategories: [
      { id: 'sub-7', name: 'Smartwatches', slug: 'smartwatches', active: true },
      { id: 'sub-8', name: 'Audio Bluetooth', slug: 'audio-bluetooth', active: true },
      { id: 'sub-9', name: 'Accesorios Móviles', slug: 'accesorios-moviles', active: true }
    ]
  },
  { 
    id: 'cat-4', 
    name: 'Salud y Fitness', 
    slug: 'salud-fitness', 
    active: true, 
    icon: 'Activity',
    description: 'Equipos de masaje, terapia muscular y accesorios de entrenamiento.',
    order: 6,
    subcategories: [
      { id: 'sub-10', name: 'Masajeadores', slug: 'masajeadores', active: true },
      { id: 'sub-11', name: 'Postura y Soporte', slug: 'postura-soporte', active: true }
    ]
  },
  { 
    id: 'cat-5', 
    name: 'Moda y Accesorios', 
    slug: 'moda-accesorios', 
    active: true, 
    icon: 'ShoppingBag',
    description: 'Bolsos, billeteras y accesorios de alta tendencia.',
    order: 7,
    subcategories: [
      { id: 'sub-12', name: 'Billeteras y Tarjeteros', slug: 'billeteras', active: true },
      { id: 'sub-13', name: 'Lentes y Relojes', slug: 'lentes-relojes', active: true }
    ]
  },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    "id": "GdY5ZMjnTXsc2SH2YWVM",
    "title": "One million oneprive 212 vipblack",
    "slug": "one-million-oneprive-212-vipblack",
    "description": "Fragancias creadas para quienes buscan elegancia y carácter. Cada aroma está formulado para garantizar horas de fijación en la piel, dejando una huella imposible de ignorar en cada aplicación:\n\n🔹 Fijación prolongada y estela de alto impacto.\n\n🔹 Notas olfativas intensas y perfectamente equilibradas.\n\n🔹 Rentabilidad insuperable (la mejor relación calidad-precio del mercado).\n\n🔹 Empaques de lujo, ideales para regalo o uso diario.",
    "shortDescription": "💎 PERFUMISSIMO: Distinción y calidad que se perciben al instante",
    "price": 170000,
    "costPrice": 138000,
    "compareAtPrice": 189000,
    "discountPercentage": 10,
    "marginAmount": 32000,
    "marginPercentage": 23.2,
    "stock": 25,
    "active": true,
    "featured": true,
    "images": [
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/2226369/aa3318fe-fac3-47e6-8c97-aedfe14a41de.jpg",
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/2226369/ef6bbdc5-4deb-4edb-b1fb-d484784c684a.jpg",
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/2226369/bb5d59b5-d6dd-42ba-b25a-03db8e17b4c7.jpg",
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/2226369/f30dd63a-395c-4ef2-8be3-ed4e3dadee60.jpg"
    ],
    "warrantyInfo": "30 días de garantía oficial Zavela Store por defectos de fábrica.",
    "tags": [
      "tendencia",
      "calidad",
      "contraentrega"
    ],
    "weightKg": 0.5,
    "categoryId": "cat-1",
    "categoryName": "Belleza y Cuidado Personal",
    "subcategoryId": "",
    "subcategoryName": "",
    "variants": [],
    "warehouseCity": "Bogotá D.C.",
    "brand": "Zavela Store",
    "dropi_product_id": "",
    "createdAt": "2026-08-28T20:26:48.571Z",
    "updatedAt": "2026-08-28T20:49:44.918Z"
  },
  {
    "id": "ZLIZ3gPA2mAEM0kqDdkR",
    "title": "Bright cristal chance tendrá 2 perfumes",
    "slug": "bright-cristal-chance-tendr--2-perfumes",
    "description": "Fragancias creadas para quienes buscan elegancia y carácter. Cada aroma está formulado para garantizar horas de fijación en la piel, dejando una huella imposible de ignorar en cada aplicación:\n\n🔹 Fijación prolongada y estela de alto impacto.\n\n🔹 Notas olfativas intensas y perfectamente equilibradas.\n\n🔹 Rentabilidad insuperable (la mejor relación calidad-precio del mercado).\n\n🔹 Empaques de lujo, ideales para regalo o uso diario.",
    "shortDescription": "💎 PERFUMISSIMO: Distinción y calidad que se perciben al instante",
    "price": 145000,
    "costPrice": 105000,
    "compareAtPrice": 165000,
    "discountPercentage": 12,
    "marginAmount": 40000,
    "marginPercentage": 38.1,
    "stock": 25,
    "active": true,
    "featured": false,
    "images": [
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/2226359/7db6d421-8473-4748-991c-f6c467858f97.jpg",
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/2226359/cbeb596e-42f0-455c-97a0-00d4bdd46f1b.jpg",
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/2226359/827c1846-3eec-4f0f-8d26-a4f2deab287d.jpg"
    ],
    "warrantyInfo": "30 días de garantía oficial Zavela Store por defectos de fábrica.",
    "tags": [
      "tendencia",
      "calidad",
      "contraentrega"
    ],
    "weightKg": 0.5,
    "categoryId": "cat-amor-amistad",
    "categoryName": "💖 Amor y Amistad",
    "subcategoryId": "",
    "subcategoryName": "",
    "variants": [],
    "warehouseCity": "Bogotá D.C.",
    "brand": "Zavela Store",
    "dropi_product_id": "",
    "createdAt": "2026-08-28T20:33:35.092Z",
    "updatedAt": "2026-08-28T20:33:35.092Z"
  },
  {
    "id": "u67sAYAnWY8MPgRaq9JM",
    "title": "Creed Silvereros 2 perfumeros",
    "slug": "creed-silvereros-2-perfumeros",
    "description": "Fragancias creadas para quienes buscan elegancia y carácter. Cada aroma está formulado para garantizar horas de fijación en la piel, dejando una huella imposible de ignorar en cada aplicación:\n\n🔹 Fijación prolongada y estela de alto impacto.\n\n🔹 Notas olfativas intensas y perfectamente equilibradas.\n\n🔹 Rentabilidad insuperable (la mejor relación calidad-precio del mercado).\n\n🔹 Empaques de lujo, ideales para regalo o uso diario.",
    "shortDescription": "💎 PERFUMISSIMO: Distinción y calidad que se perciben al instante",
    "price": 140000,
    "costPrice": 90000,
    "compareAtPrice": 155000,
    "discountPercentage": 10,
    "marginAmount": 50000,
    "marginPercentage": 55.6,
    "stock": 25,
    "active": true,
    "featured": false,
    "images": [
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/2226356/950eb27f-3fc8-46d5-9c13-d3b4d8afcae6.jpg",
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/2226356/8fc1a12e-5ced-4b21-87e7-4616dea7aefb.jpg",
      "https://d39ru7awumhhs2.cloudfront.net/colombia/products/2226356/bbfd12a0-5949-48ac-9da1-d5a1ca096ec3.jpg"
    ],
    "warrantyInfo": "30 días de garantía oficial Zavela Store por defectos de fábrica.",
    "tags": [
      "tendencia",
      "calidad",
      "contraentrega"
    ],
    "weightKg": 0.5,
    "categoryId": "cat-1",
    "categoryName": "Belleza y Cuidado Personal",
    "subcategoryId": "",
    "subcategoryName": "",
    "variants": [],
    "warehouseCity": "Bogotá D.C.",
    "brand": "Zavela Store",
    "dropi_product_id": "",
    "createdAt": "2026-08-28T20:23:19.631Z",
    "updatedAt": "2026-08-28T20:49:55.313Z"
  },
  {
    "id": "prod-dewalt-2421",
    "title": "Taladro 2421 Dewalt Con Herramientas",
    "slug": "taladro-2421-dewalt-con-herramientas",
    "description": "Potente taladro percutor inalámbrico Dewalt modelo 2421 acompañado de kit completo con 24 accesorios y herramientas de uso rudo. Ideal para bricolaje, proyectos del hogar, carpintería y reparaciones.\n\n🔹 Motor de alto torque con control de velocidad reversible.\n🔹 2 Baterías de litio de larga duración con cargador rápido.\n🔹 Maletín rígido de transporte con brocas, puntas y dados incluidos.\n🔹 Diseño ergonómico de agarre antideslizante para trabajos continuos.",
    "shortDescription": "🔧 El kit definitivo para amantes del bricolaje y proyectos en casa",
    "price": 174000,
    "costPrice": 115000,
    "compareAtPrice": 220000,
    "discountPercentage": 21,
    "marginAmount": 59000,
    "marginPercentage": 33.9,
    "stock": 35,
    "active": true,
    "featured": true,
    "images": [
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&q=80"
    ],
    "warrantyInfo": "30 días de garantía oficial Zavela Store por defectos de fabricación.",
    "tags": ["herramientas", "bricolaje", "dewalt", "hogar", "regalo", "contraentrega"],
    "weightKg": 2.2,
    "categoryId": "cat-2",
    "categoryName": "Hogar y Herramientas",
    "subcategoryId": "sub-4",
    "subcategoryName": "Bricolaje y Herramientas",
    "variants": [],
    "warehouseCity": "Bogotá D.C.",
    "brand": "Dewalt / Zavela Store",
    "dropi_product_id": "",
    "createdAt": "2026-08-28T21:00:00.000Z",
    "updatedAt": "2026-08-28T21:00:00.000Z"
  },
  {
    "id": "prod-bolso-perla-rochy",
    "title": "Bolso Perla Blanco Artesanal Rochy",
    "slug": "bolso-perla-blanco-artesanal-rochy",
    "description": "Edición de lujo tejida 100% a mano con cuentas perladas de alto brillo. Incluye placa metálica en láser de autenticidad Rochy con código QR personalizado y cadena de hombro reforzada.\n\n🔹 Tejido artesanal minucioso de 18 horas de confección.\n🔹 Placa grabada en láser con código QR de verificación.\n🔹 Cierre de seguridad imantado y forro interno satinado.\n🔹 El regalo ideal para ocasiones especiales, bodas, aniversarios y veladas elegantes.",
    "shortDescription": "💎 Edición de lujo tejida a mano con placa de autenticidad Rochy",
    "price": 185000,
    "costPrice": 120000,
    "compareAtPrice": 240000,
    "discountPercentage": 23,
    "marginAmount": 65000,
    "marginPercentage": 35.1,
    "stock": 20,
    "active": true,
    "featured": true,
    "images": [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80"
    ],
    "warrantyInfo": "30 días de garantía oficial Zavela Store y certificado de autenticidad.",
    "tags": ["moda", "bolsos", "cuentas", "artesanal", "regalo", "lujo", "contraentrega"],
    "weightKg": 0.7,
    "categoryId": "cat-5",
    "categoryName": "Moda y Accesorios",
    "subcategoryId": "sub-12",
    "subcategoryName": "Bolsos de Mano",
    "variants": [],
    "warehouseCity": "Bogotá D.C.",
    "brand": "Rochy / Zavela Store",
    "dropi_product_id": "",
    "createdAt": "2026-08-28T21:10:00.000Z",
    "updatedAt": "2026-08-28T21:10:00.000Z"
  }
];

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

  // Contact & Social
  whatsappNumber: '573008784427',
  whatsappAdvisorName: 'Sofía - Asesora Experta en Regalos y Compras',
  whatsappMessage: '¡Hola Sofía! Quiero asesoría personalizada para encontrar el regalo ideal en Zavela Store Colombia.',
  whatsappDefaultMessage: '¡Hola Sofía! Quiero asesoría personalizada para encontrar el regalo ideal en Zavela Store Colombia.',
  whatsappFloatingEnabled: true,
  contactEmail: 'contacto@zavelastore.com',
  contactPhone: '+57 300 878 4427',
  instagramUrl: 'https://instagram.com/zavelastore.co',
  tiktokUrl: 'https://tiktok.com/@zavelastore',
  facebookUrl: 'https://facebook.com/zavelastore.colombia',
  businessAddress: 'Calle 100 # 19A - 40, Edificio Titanium, Bogotá D.C., Colombia',
  businessHours: 'Lunes a Sábado: 8:00 AM - 7:00 PM | Domingos: 9:00 AM - 2:00 PM',

  // WhatsApp & AI Agent Configuration
  whatsappSettings: {
    enabled: true,
    phoneNumber: '573008784427',
    advisorName: 'Sofía - Asesora Experta en Regalos y Compras',
    defaultMessage: '¡Hola Sofía! Quiero asesoría personalizada para encontrar el regalo ideal en Zavela Store Colombia.',
    orderConfirmationTemplate: 'Hola Sofía, quiero confirmar mi pedido *{ORDER_NUMBER}* a nombre de *{NAME}* por valor de *{TOTAL}*. ¿Me confirmas el despacho?',
    supportHoursNotice: 'Lunes a Sábado: 8:00 AM - 8:00 PM | Envíos a toda Colombia con Pago Contra Entrega'
  },
  aiAgentSettings: {
    enabled: true,
    agentName: 'Sofía',
    agentRole: 'Asesora Experta en Regalos y Personal Shopper',
    personalityTone: 'friendly_colombian',
    welcomeMessage: '¡Hola! 👋 Qué alegría saludarte. Soy Sofía, tu asesora experta en regalos y compras de Zavela Store Colombia. Mi misión es ser tu Personal Shopper y ayudarte a encontrar el detalle perfecto según la persona y la ocasión. 🎁✨\n\nCuéntame:\n1️⃣ ¿Para quién es el regalo?\n2️⃣ ¿Qué le gusta hacer a esa persona o cuáles son sus pasatiempos?\n3️⃣ ¿Cuál es la ocasión especial?',
    customPromptInstructions: `Eres Sofía, la asesora experta en regalos y compras de Zavela Store Colombia.
Tu misión principal es actuar como un "Personal Shopper" que ayuda al usuario a encontrar el regalo ideal según la persona y la ocasión.

DIRECTRICES DE CONVERSACIÓN:
1. TONO: Cercano, empático, entusiasta y servicial (español de Colombia amigable y profesional).
2. SALUDO INICIAL: Saluda cordialmente y pregunta directamente:
   - ¿Para quién es el regalo?
   - ¿Qué le gusta hacer a esa persona o cuáles son sus pasatiempos?
   - ¿Cuál es la ocasión especial?
3. PERFILADO: Escucha con atención los gustos (ej. si le gusta el bricolaje/herramientas, tecnología, moda, accesorios). Si falta información clave, haz máximo una pregunta breve de seguimiento.
4. RECOMENDACIÓN: Sugiere entre 1 y 3 productos que mejor encajen con lo descrito de nuestro catálogo activo. Explica brevemente por qué es una excelente opción para esa persona.
5. CIERRE DE VENTA: Recuerda siempre que contamos con Envíos a toda Colombia y Pago Contra Entrega en efectivo al recibir el paquete. Facilita el botón/enlace de compra directa.`,
    recommendationMode: 'all_catalog',
    maxProductsToSuggest: 3,
    enableDirectWhatsAppHandoff: true,
    suggestQuickQuestions: [
      '🎁 Ayúdame a elegir un regalo especial',
      '🔧 Regalos para amantes del bricolaje y herramientas',
      '🌸 Perfumes y fragancias para regalar',
      '🚚 ¿Cómo funciona el Pago Contra Entrega en Colombia?',
      '🛍️ Quiero tomar mi pedido por chat'
    ]
  },

  // Tidio Live Chat & Lyro AI
  tidioChatEnabled: false,
  tidioScriptUrl: '',
  tidioPublicKey: '',
  chatWidgetMode: 'both',

  // WhatsApp Cloud API & Webhook (Meta for Developers)
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

  // Pricing & Shipping
  defaultProfitMarginPercentage: 80,
  defaultMarginPercentage: 80,
  defaultFixedMargin: 30000,
  freeShippingThreshold: 120000,
  flatShippingRate: 12000,
  defaultShippingCost: 12000,
  enableWhatsappNotifications: true,
  colombiaCodEnabled: true,

  // Maintenance & Private Testing Mode
  maintenanceMode: false,
  maintenanceTitle: 'Estamos mejorando tu experiencia de compra',
  maintenanceMessage: 'Estamos mejorando tu experiencia de compra. Volvemos muy pronto con nuevas ofertas exclusivas.',
  maintenanceBypassToken: 'zavela_test',
  maintenanceNotifyLeads: [],

  // Header Ticker
  headerTicker: {
    enabled: true,
    speedSeconds: 5,
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    items: [
      { id: 'tick-amor', text: '💖 ESPECIAL AMOR Y AMISTAD: Rosas eternas LED, joyería dúo y regalos con pago contra entrega', highlightText: 'ESPECIAL AMOR Y AMISTAD', active: true },
      { id: 'tick-halo', text: '🎃 TEMPORADA HALLOWEEN: Disfraces virales, máscaras neón LED y generadores de niebla', highlightText: 'TEMPORADA HALLOWEEN', active: true },
      { id: 'tick-1', text: '🚚 PAGO CONTRA ENTREGA en toda Colombia • Paga solo al recibir tu pedido', highlightText: 'PAGO CONTRA ENTREGA', active: true },
      { id: 'tick-2', text: '⚡ ENVÍO GRATIS por compras superiores a $120.000 COP', highlightText: 'ENVÍO GRATIS', active: true },
      { id: 'tick-3', text: '🛡️ Garantía oficial de 30 días en todos los productos Zavela', highlightText: 'Garantía oficial', active: true },
      { id: 'tick-4', text: '📦 Despachos rápidos el mismo día con Servientrega, Coordinadora y Envía', highlightText: 'Despachos rápidos', active: true }
    ]
  },

  // Header Buttons
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

  // Hero Banners
  heroBanners: [
    {
      id: 'ban-perfume-1',
      title: '💎 Alta Perfumería & Fragancias Exclusivas Zavela',
      subtitle: 'Fragancias de alta fijación con estuche de lujo, calidad premium garantizada y Pago Contra Entrega en toda Colombia.',
      badge: '💎 ALTA PERFUMERÍA • 100% GARANTIZADO',
      badgeText: '💎 ALTA PERFUMERÍA • 100% GARANTIZADO',
      ctaText: 'Ver Fragancias en Stock',
      ctaLink: '#productos',
      imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&auto=format&fit=crop&q=80',
      active: true,
      order: 1
    },
    {
      id: 'ban-perfume-2',
      title: '🚚 Pide Hoy y Paga en Efectivo al Recibir',
      subtitle: 'Envíos rápidos a las principales ciudades de Colombia con Servientrega, Coordinadora y Envía.',
      badge: '🇨🇴 PAGO CONTRA ENTREGA',
      badgeText: '🇨🇴 PAGO CONTRA ENTREGA',
      ctaText: 'Pedir con Envío Rápido',
      ctaLink: '#productos',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600&auto=format&fit=crop&q=80',
      active: true,
      order: 2
    }
  ],

  // Home Sections
  homeSections: [
    { id: 'sec-1', key: 'hero_banners', title: 'Carrusel de Banners Principales', subtitle: 'Hero visual con llamadas a la acción', enabled: true, order: 1 },
    { id: 'sec-2', key: 'trust_badges', title: 'Garantías y Confianza', subtitle: 'Badges de contra entrega, garantía y soporte', enabled: true, order: 2 },
    { id: 'sec-3', key: 'categories', title: 'Explorador de Categorías', subtitle: 'Tarjetas con iconos interactivos', enabled: true, order: 3 },
    { id: 'sec-4', key: 'featured_products', title: 'Catálogo de Productos', subtitle: 'Filtros rápidos y tarjetas de producto', enabled: true, order: 4 },
    { id: 'sec-5', key: 'blog_posts', title: 'Guías y Consejos Zavela', subtitle: 'Artículos de interés para clientes', enabled: true, order: 5 }
  ],

  // Trust Badges
  trustBadges: [
    { id: 'badge-1', icon: 'Truck', title: 'Pago Contra Entrega', description: 'Pagas en efectivo o transferencia solo cuando recibes el producto en tu puerta.', active: true, order: 1 },
    { id: 'badge-2', icon: 'ShieldCheck', title: 'Garantía de 30 Días', description: 'Garantía directa de cambio o reembolso por defectos de fabricación.', active: true, order: 2 },
    { id: 'badge-3', icon: 'PackageCheck', title: 'Despacho Rápido', description: 'Envíos en 2 a 4 días hábiles a nivel nacional con guía rastreable.', active: true, order: 3 },
    { id: 'badge-4', icon: 'Headphones', title: 'Atención Personalizada', description: 'Soporte vía WhatsApp para resolver cualquier duda sobre tu pedido.', active: true, order: 4 }
  ],

  // Blog Posts
  blogPosts: [
    {
      id: 'post-1',
      title: 'Cómo cuidar y alargar la vida útil de tu cepillo secador 3 en 1',
      slug: 'cuidar-cepillo-secador-3-en-1',
      excerpt: 'Aprende los mejores trucos para limpiar las cerdas y optimizar la emisión de iones negativos.',
      content: 'El cepillo secador 3 en 1 se ha convertido en el aliado esencial de miles de colombianas. Para mantener su potencia máxima, retira siempre los cabellos acumulados luego de cada uso y limpia la entrada de aire una vez al mes.',
      coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
      author: 'Equipo Zavela',
      publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      readTimeMinutes: 3,
      tags: ['Belleza', 'Cabello', 'Guías'],
      published: true
    },
    {
      id: 'post-2',
      title: 'Beneficios de tener un humidificador ultrasónico en tu habitación',
      slug: 'beneficios-humidificador-ultrasonico',
      excerpt: 'Descubre cómo la aromaterapia y la humidificación mejoran la calidad de tu descanso nocturno.',
      content: 'Los humidificadores de ambiente no solo añaden un toque estético con su luz lunar 3D, sino que ayudan a mantener las vías respiratorias hidratadas y distribuyen aceites esenciales relajantes.',
      coverImage: 'https://images.unsplash.com/photo-1517991104123-1d56a6e81ed9?w=800&auto=format&fit=crop&q=80',
      author: 'Equipo Zavela',
      publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      readTimeMinutes: 4,
      tags: ['Hogar', 'Bienestar', 'Aromaterapia'],
      published: true
    }
  ],

  // Legal Policies
  legalPolicies: [
    {
      id: 'pol-1',
      type: 'terms',
      title: 'Términos y Condiciones de Compra',
      slug: 'terminos-y-condiciones',
      content: 'En Zavela Store todos los pedidos se procesan con modalidad de Pago Contra Entrega o métodos electrónicos autorizados. Al realizar un pedido, el comprador se compromete a tener los fondos listos al momento de la entrega por la transportadora.',
      lastUpdated: new Date().toISOString(),
      active: true
    },
    {
      id: 'pol-2',
      type: 'privacy',
      title: 'Política de Privacidad y Tratamiento de Datos',
      slug: 'politica-de-privacidad',
      content: 'Zavela Store protege sus datos conforme a la Ley 1581 de 2012 de Colombia. La información de contacto y envío únicamente se utiliza para la coordinación logística del despacho.',
      lastUpdated: new Date().toISOString(),
      active: true
    },
    {
      id: 'pol-3',
      type: 'shipping',
      title: 'Política de Envíos y Tiempos de Entrega',
      slug: 'politica-de-envios',
      content: 'Los envíos se realizan desde nuestras bodegas en Bogotá, Medellín y Cali a través de Servientrega, Coordinadora, Envía e Interrapidísimo. El tiempo promedio de entrega es de 2 a 4 días hábiles en ciudades principales.',
      lastUpdated: new Date().toISOString(),
      active: true
    },
    {
      id: 'pol-4',
      type: 'warranty',
      title: 'Política de Garantías y Devoluciones',
      slug: 'politica-de-garantias',
      content: 'Ofrecemos 30 días de garantía directa por defectos de fabricación. Si el producto presenta fallas técnicas, gestionamos el cambio inmediato sin costo adicional de flete.',
      lastUpdated: new Date().toISOString(),
      active: true
    }
  ],

  // Footer & Carriers
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
      { id: 'c-4', name: 'Interrapidísimo', code: 'interrapidisimo', active: true, trackingUrlTemplate: 'https://interrapidisimo.com/rastreo/{GUIDE}' },
      { id: 'c-5', name: 'TCC', code: 'tcc', active: true, trackingUrlTemplate: 'https://tcc.com.co/rastreo/{GUIDE}' }
    ]
  },

  // Global CMS Texts
  globalTexts: {
    welcomeBannerText: '¡Bienvenido a Zavela Store Colombia! Disfruta de pago contra entrega en todos los productos.',
    codNoticeText: 'Paga con tranquilidad en tu puerta: en efectivo o transferencia al recibir.',
    freeShippingNotice: '¡Envío Gratis por compras superiores a $120.000 COP!',
    emptyCartText: 'Tu carrito de compras está vacío. ¡Explora nuestro catálogo y añade tus favoritos!',
    whatsappOrderTemplate: 'Hola Zavela Store, realicé el pedido *{ORDER_NUMBER}* a nombre de *{NAME}* por valor de *{TOTAL}*. ¿Me confirman el despacho?',
    checkoutNotice: 'Al pulsar confirmar pedido, autorizas el despacho a tu dirección con pago contra entrega.',
    orderSuccessSubtitle: 'Hemos recibido tu pedido con éxito. Nuestro equipo de bodega está alistando tu paquete.'
  },

  // Theme Styles
  themeStyles: {
    borderRadius: 'md',
    glowIntensity: 'normal',
    fontFamily: 'sans',
    darkThemeIntensity: 'midnight'
  },

  // Lucky Wheel & Gamification Defaults
  luckyWheel: {
    enabled: false,
    title: '🎉 ¡Gira la Ruleta y Gana tu Descuento!',
    subtitle: 'Desbloquea entre 5% y 15% OFF de regalo en tu producto favorito con Pago Contra Entrega.',
    badgeText: '🎁 Premio Exclusivo Zavela',
    callToActionText: '🎯 Girar Ruleta de Descuentos',
    inactivitySeconds: 40,
    minVisitedProducts: 2,
    couponExpiryMinutes: 15,
    spinDurationSeconds: 4.5,
    enableExitIntent: true,
    enableInactivityTrigger: true,
    enableVisitedThresholdTrigger: true,
    enableFloatingBadge: true,
    activeSeason: 'default',
    seasonName: 'Estándar',
    seasonTagline: 'Descuentos exclusivos y sorpresas todo el año',
    seasonAccentColor: '#f59e0b',
    seasonBadgeEmoji: '🎁',
    segments: [
      { id: 'seg-1', label: '10% OFF', percentage: 10, color: '#0284c7', textColor: '#ffffff', couponPrefix: 'RULETA10' },
      { id: 'seg-2', label: '5% OFF',  percentage: 5,  color: '#0f172a', textColor: '#f8fafc', couponPrefix: 'SUERTE5' },
      { id: 'seg-3', label: '15% OFF', percentage: 15, color: '#f59e0b', textColor: '#0f172a', couponPrefix: 'PREMIO15' },
      { id: 'seg-4', label: '8% OFF',  percentage: 8,  color: '#10b981', textColor: '#ffffff', couponPrefix: 'LUCKY8' },
      { id: 'seg-5', label: '12% OFF', percentage: 12, color: '#6366f1', textColor: '#ffffff', couponPrefix: 'ZAVELA12' },
      { id: 'seg-6', label: '10% EXTRA', percentage: 10, color: '#ec4899', textColor: '#ffffff', couponPrefix: 'SUPER10' }
    ]
  },

  gamificationGame: {
    enabled: false,
    activeSeason: 'standard',
    seasonName: 'Estándar (Todo el Año)',
    gameTitle: '🎯 ¡Desafío Flash: Atrapa tu Descuento!',
    gameSubtitle: 'Mueve la canasta, esquiva las ráfagas de viento y atrapa los cupones que caen para desbloquear hasta 15% OFF exclusivo.',
    badgeEmoji: '🌪️',
    accentColor: '#f59e0b',
    minDiscountPercentage: 5,
    maxDiscountPercentage: 15,
    tiers: {
      bronze: { minScore: 1, discountPercentage: 5, label: 'Nivel Bronce 🥉', couponPrefix: 'FLASH5' },
      silver: { minScore: 16, discountPercentage: 10, label: 'Nivel Plata 🥈', couponPrefix: 'PRO10' },
      gold: { minScore: 30, discountPercentage: 15, label: 'Nivel Oro 🥇', couponPrefix: 'VIP15' }
    },
    gameDurationSeconds: 15,
    windEnabled: true,
    windChangeIntervalSeconds: 2.5,
    basketSpeed: 1.0,
    couponExpiryMinutes: 10,
    enableGyroscope: true,
    gyroSensitivity: 1.2,
    gyroDeadzone: 5,
    difficultyLevel: 'hard',
    missPenaltyPoints: 1,
    includeObstacles: true,
    inactivitySeconds: 35,
    minVisitedProducts: 2,
    enableExitIntent: true,
    enableInactivityTrigger: true,
    enableVisitedThresholdTrigger: true,
    enableFloatingBadge: true
  },

  // Exclusividad & Subpáginas Dinámicas (Ramas de Tienda)
  exclusivityPage: {
    enabled: true,
    navTitle: 'EXCLUSIVIDAD (Bolsos & Placas)',
    heroBadge: '💎 EDICIÓN LIMITADA 2026 • DISEÑO POR ROCHY',
    heroTitle: 'Colección Exclusiva de Bolsos de Cuentas & Placas de Identidad',
    heroSubtitle: 'Piezas artesanales únicas con placa metálica grabada en láser y código QR personalizado.',
    heroCtaText: 'Ver Modelos Disponibles',
    heroBannerImage: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80',
    platesShowcaseTitle: 'Showcase de Placas de Autenticidad (Rochy - Identidad Visual)',
    platesShowcaseSubtitle: 'Grabado láser de alta precisión en metal pulido con código QR personalizable',
    craftsmanshipGuaranteeText: 'Cada bolso es confeccionado a mano en Colombia en un proceso de 18 horas de tejido continuo. Respaldado con garantía directa de 30 días y certificado de autenticidad.',
    plates: [
      {
        id: 'plate-round-black',
        shape: 'round',
        name: 'Placa Circular Negro Mate',
        dimensions: '3 cm Ø',
        finish: 'black_matte',
        finishLabel: 'Negro Mate Premium',
        brandText: 'Rochy',
        sloganText: 'IDENTIDAD VISUAL',
        qrPosition: 'center',
        qrUrl: 'https://zavelastore.com/autenticidad/rochy-001',
        active: true,
        description: 'Acabado en aluminio anodizado negro mate con grabado láser de alta precisión y micro-código QR central.'
      },
      {
        id: 'plate-round-gold',
        shape: 'round',
        name: 'Placa Circular Dorado Espejo',
        dimensions: '3 cm Ø',
        finish: 'gold_engraved',
        finishLabel: 'Dorado Grabado 24K',
        brandText: 'Rochy',
        sloganText: 'IDENTIDAD VISUAL',
        qrPosition: 'center',
        qrUrl: 'https://zavelastore.com/autenticidad/rochy-002',
        active: true,
        description: 'Chapa de latón pulido con baño dorado brillante, relieve en bajo relieve y QR de autenticidad.'
      },
      {
        id: 'plate-rect-black',
        shape: 'rectangular',
        name: 'Placa Rectangular Negro Mate',
        dimensions: '3 cm x 1.5 cm',
        finish: 'black_matte',
        finishLabel: 'Negro Mate Minimalista',
        brandText: 'Rochy',
        sloganText: 'IDENTIDAD VISUAL',
        qrPosition: 'side',
        qrUrl: 'https://zavelastore.com/autenticidad/rochy-003',
        active: true,
        description: 'Perfil rectangular elegante con logo cursivo Rochy, leyenda lateral y micro-código QR lateral.'
      },
      {
        id: 'plate-rect-gold',
        shape: 'rectangular',
        name: 'Placa Rectangular Dorado Relieve',
        dimensions: '3 cm x 1.5 cm',
        finish: 'gold_engraved',
        finishLabel: 'Oro Cepillado Clásico',
        brandText: 'Rochy',
        sloganText: 'IDENTIDAD VISUAL',
        qrPosition: 'side',
        qrUrl: 'https://zavelastore.com/autenticidad/rochy-004',
        active: true,
        description: 'Acabado dorado satín cepillado con bordes pulidos a mano y código QR de validación de autor.'
      },
      {
        id: 'plate-rect-silver',
        shape: 'rectangular',
        name: 'Placa Rectangular Plata Platino',
        dimensions: '3 cm x 1.5 cm',
        finish: 'silver_chrome',
        finishLabel: 'Plata Espejo Platino',
        brandText: 'Rochy',
        sloganText: 'IDENTIDAD VISUAL',
        qrPosition: 'side',
        qrUrl: 'https://zavelastore.com/autenticidad/rochy-005',
        active: true,
        description: 'Acero inoxidable grado quirúrgico con pulido espejo de alta refracción luminosa.'
      }
    ],
    curatedProducts: [
      {
        id: 'bag-pearl-white',
        title: 'Bolso Perla Blanco Artesanal',
        slug: 'bolso-perla-blanco-artesanal',
        subtitle: 'Tejido a mano con cuentas nacaradas de alto brillo y herrajes reforzados',
        description: 'Una obra de arte contemporánea. Diseñado meticulosamente cuenta por cuenta con perlas sintéticas de alta densidad refractaria que proyectan un brillo satinado único. Cada pieza incluye placa metálica grabada en láser con la firma de Rochy y su código QR de autenticidad numerado.',
        priceCOP: 159900,
        compareAtPriceCOP: 210000,
        material: 'Cuentas Nacaradas Acrílicas HD + Hilo Poliamida Reforzado',
        color: 'Blanco Perla Satinado',
        dimensions: '22 cm (ancho) x 16 cm (alto) x 7 cm (profundidad)',
        craftsmanTag: '💎 Hecho a Mano en Colombia • Diseño por Rochy',
        images: [
          'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80',
          'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',
          'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80'
        ],
        stock: 14,
        active: true,
        featured: true,
        defaultPlateShape: 'round',
        defaultPlateFinish: 'gold_engraved',
        rating: 4.9,
        reviewCount: 48,
        freeShipping: true,
        cashOnDelivery: true,
        tags: ['bolso de cuentas', 'perlas', 'artesanal', 'exclusivo', 'rochy', 'edicion limitada']
      },
      {
        id: 'bag-obsidian-black',
        title: 'Bolso Obsidiana Negro Artesanal',
        slug: 'bolso-obsidiana-negro-artesanal',
        subtitle: 'Elegancia nocturna con cuentas facetadas en negro azabache brillante',
        description: 'El clásico indiscutible de las noches de gala. Construido con más de 1.400 cuentas facetadas que atrapan la luz en múltiples ángulos. Su forro interior suave protege tus pertenencias mientras la placa metálica grabada con láser en tono negro mate u oro certifica su autenticidad.',
        priceCOP: 169900,
        compareAtPriceCOP: 225000,
        material: 'Cristales Facetados Azabache + Forro de Satín',
        color: 'Negro Obsidiana Intenso',
        dimensions: '24 cm (ancho) x 17 cm (alto) x 8 cm (profundidad)',
        craftsmanTag: '💎 Hecho a Mano en Colombia • Diseño por Rochy',
        images: [
          'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80',
          'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80',
          'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80'
        ],
        stock: 9,
        active: true,
        featured: true,
        defaultPlateShape: 'rectangular',
        defaultPlateFinish: 'black_matte',
        rating: 5.0,
        reviewCount: 36,
        freeShipping: true,
        cashOnDelivery: true,
        tags: ['bolso obsidiana', 'negro gala', 'cuentas', 'artesanal', 'rochy']
      },
      {
        id: 'bag-champagne-gold',
        title: 'Bolso Oro Champán Deluxe',
        slug: 'bolso-oro-champan-deluxe',
        subtitle: 'Tonalidad cálida y resplandeciente para celebraciones y eventos especiales',
        description: 'Creado para destacar en cualquier reunión. El tono oro champán suave combina con cualquier vestimenta formal o casual chic. Cuenta con asa rígida de cuentas y correa larga desmontable en cadena metálica dorada.',
        priceCOP: 179900,
        compareAtPriceCOP: 235000,
        material: 'Cuentas Ámbar y Perlas Doradas con Núcleo Reforzado',
        color: 'Oro Champán Resplandeciente',
        dimensions: '23 cm (ancho) x 18 cm (alto) x 7.5 cm (profundidad)',
        craftsmanTag: '💎 Hecho a Mano en Colombia • Diseño por Rochy',
        images: [
          'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',
          'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80'
        ],
        stock: 7,
        active: true,
        featured: true,
        defaultPlateShape: 'round',
        defaultPlateFinish: 'gold_engraved',
        rating: 4.8,
        reviewCount: 29,
        freeShipping: true,
        cashOnDelivery: true,
        tags: ['oro champan', 'fiesta', 'bolso lujo', 'cuentas', 'rochy']
      },
      {
        id: 'bag-ruby-gala',
        title: 'Bolso Rubí Gala Artesanal',
        slug: 'bolso-rubi-gala-artesanal',
        subtitle: 'Pasión y distinción con cuentas cristalizadas color carmesí profundo',
        description: 'Edición extremadamente limitada de 25 unidades. La combinación de cuentas color rubí brillante con la placa metálica grabada en láser produce un contraste magnético y sofisticado.',
        priceCOP: 185000,
        compareAtPriceCOP: 245000,
        material: 'Cristal Rubí Facetado de Alta Claridad + Herrajes Zamak',
        color: 'Rojo Rubí Carmesí',
        dimensions: '21 cm (ancho) x 15 cm (alto) x 6.5 cm (profundidad)',
        craftsmanTag: '💎 Hecho a Mano en Colombia • Diseño por Rochy',
        images: [
          'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80',
          'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80'
        ],
        stock: 5,
        active: true,
        featured: false,
        defaultPlateShape: 'rectangular',
        defaultPlateFinish: 'gold_engraved',
        rating: 4.9,
        reviewCount: 19,
        freeShipping: true,
        cashOnDelivery: true,
        tags: ['rubi gala', 'rojo', 'cuentas', 'edicion de coleccionista', 'rochy']
      }
    ]
  },

  customSubpages: [
    {
      id: 'subpage-exclusividad',
      slug: 'exclusividad-bolsos-placas',
      title: 'Colección Exclusiva: Bolsos & Placas Rochy',
      navLabel: 'EXCLUSIVIDAD (Bolsos & Placas)',
      showInNav: true,
      active: true,
      tagline: 'Artesanía colombiana con grabado láser y tecnología QR',
      heroBadge: '💎 EDICIÓN LIMITADA 2026 • DISEÑO POR ROCHY',
      heroTitle: 'Colección Exclusiva de Bolsos de Cuentas & Placas de Identidad',
      heroSubtitle: 'Piezas artesanales únicas con placa metálica grabada en láser y código QR personalizado.',
      heroCtaText: 'Ver Modelos Disponibles',
      heroImageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80',
      accentColor: '#0084FF',
      categoryFilter: 'all',
      showPlatesShowcase: true,
      showTrustGuarantees: true,
      createdAt: '2026-08-30T10:00:00.000Z'
    }
  ]
};

const DEFAULT_LOGS: SystemLog[] = [
  {
    id: 'log-1',
    type: 'STATUS_UPDATE',
    orderId: 'ord-1001',
    action: 'Guía de Despacho Asignada',
    details: 'Pedido NV-1001 en camino. Guía Servientrega SER-9281746201 asignada.',
    status: 'success',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'log-2',
    type: 'ORDER_CREATED',
    orderId: 'ord-1002',
    action: 'Pedido Registrado',
    details: 'Pedido NV-1002 recibido. En alistamiento de bodega para despacho.',
    status: 'success',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

export const DEFAULT_ADVISORS: Advisor[] = [
  {
    id: 'AS-001',
    name: 'Juan (Asesor 1)',
    username: 'juan',
    password: 'juan123',
    phone: '3101234567',
    email: 'juan.asesor1@zavelastore.com',
    channel: 'WhatsApp Directo / Llamadas',
    commissionRate: 10,
    status: 'active',
    settlementStatus: 'pendiente_liquidacion',
    notes: 'Asesor principal de ventas directas WhatsApp',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 'AS-002',
    name: 'Valentina (Asesora 2)',
    username: 'valentina',
    password: 'valentina123',
    phone: '3209876543',
    email: 'valentina.ventas@zavelastore.com',
    channel: 'TikTok Ads & Chat',
    commissionRate: 10,
    status: 'active',
    settlementStatus: 'al_dia',
    notes: 'Campañas de video corto TikTok y WhatsApp',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString()
  },
  {
    id: 'AS-003',
    name: 'Carlos Gómez (Asesor 3)',
    username: 'carlos',
    password: 'carlos123',
    phone: '3157891234',
    email: 'carlos.gomez@zavelastore.com',
    channel: 'Facebook Ads & Messenger',
    commissionRate: 10,
    status: 'active',
    settlementStatus: 'al_dia',
    notes: 'Atención campañas Meta Ads y referidos',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'AS-004',
    name: 'Daniela Ríos (Asesora 4)',
    username: 'daniela',
    password: 'daniela123',
    phone: '3184567890',
    email: 'daniela.rios@zavelastore.com',
    channel: 'Instagram DM & Reels',
    commissionRate: 10,
    status: 'active',
    settlementStatus: 'al_dia',
    notes: 'Cierre de ventas por Instagram y WhatsApp',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

export const DEFAULT_ADVISOR_SALES: AdvisorSale[] = [
  {
    id: 'DP-001',
    orderNumber: 'DP-1001',
    advisorId: 'AS-001',
    advisorName: 'Juan (Asesor 1)',
    advisorChannel: 'WhatsApp Directo / Llamadas',
    productId: 'prod-2240082',
    productTitle: 'Reloj Smartwatch Ultra',
    quantity: 2,
    unitPrice: 80000,
    totalAmount: 160000,
    clientName: 'Carlos Pérez',
    clientPhone: '3101234567',
    clientCity: 'Medellín',
    clientDepartment: 'Antioquia',
    clientAddress: 'Calle 10 # 40-20 Apto 301',
    additionalNotes: 'Cliente confirmó despacho contra entrega. Cobrar en efectivo al recibir.',
    dropiStatus: 'pendiente_bolsa',
    paymentMethod: 'contra_entrega',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const DEFAULT_SOCIAL_SETTINGS: SocialMarketingSettings = {
  autoPublishOnProductCreate: true,
  autoPublishOnProductUpdate: true,
  defaultHashtags: ['#ZavelaStore', '#PagoContraEntrega', '#Colombia', '#Tendencia2026', '#EnvioGratis', '#OfertaEspecial', '#ModaYTecnologia'],
  includePrice: true,
  includeCodBadge: true,
  includeFreeShippingBadge: true,
  callToActionText: '📦 ¡Pide hoy y paga al recibir en la puerta de tu casa! Envíos rápidos y seguros a todo el país.',
  targetChannels: {
    facebook: true,
    instagram: true,
    tiktok: true
  },
  copyTone: 'viral_high_converting',
  connections: {
    facebook: {
      platform: 'facebook',
      connected: true,
      accountName: 'Zavela Store Colombia (Página Oficial)',
      pageId: 'fb_page_109283746192',
      accessToken: 'EAAG...zavela_meta_token_active',
      pixelId: 'pixel_9847261520',
      status: 'connected',
      lastSyncAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      autoPostEnabled: true
    },
    instagram: {
      platform: 'instagram',
      connected: true,
      accountName: '@zavelastore.col',
      accountId: 'ig_biz_9482716039',
      accessToken: 'IGQV...zavela_ig_graph_token_active',
      status: 'connected',
      lastSyncAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      autoPostEnabled: true
    },
    tiktok: {
      platform: 'tiktok',
      connected: true,
      accountName: '@zavelastore_oficial',
      accountId: 'tt_shop_5839201948',
      appSecret: 'tt_sec_8930491823',
      status: 'connected',
      lastSyncAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      autoPostEnabled: true
    }
  }
};

export const DEFAULT_SOCIAL_POSTS: SocialBroadcastPost[] = [
  {
    id: 'soc-post-1',
    productId: 'prod-amor-102',
    productTitle: 'Set Pulseras Pareja Amor Infinito Imantadas en Piedra Natural',
    productPrice: 36900,
    productImageUrl: 'https://images.unsplash.com/photo-1611591475102-470e89ec3e65?w=800&auto=format&fit=crop&q=80',
    productSlug: 'set-pulseras-pareja-amor-infinito-imantadas',
    platforms: ['facebook', 'instagram', 'tiktok'],
    copies: {
      facebook: '✨ ¡El detalle perfecto para tu persona favorita! Set de Pulseras Imantadas que se atraen al estar juntos. 🚚 PAGO CONTRA ENTREGA en toda Colombia: recibes en casa y pagas seguro. ¡Últimas unidades con 35% de descuento!',
      instagram: '🔒 Conectados sin importar la distancia. 🖤 Set Dúo Amor Infinito con broche magnético de atracción mutua. Pide el tuyo con un clic en el link de la bio o DM. 📦 Pago Contra Entrega.',
      tiktok: 'POV: Le das esto a tu pareja y no se lo vuelve a quitar 🥺✨ Pulseras imantadas que se unen al tocarse. Envíos contra entrega a toda Colombia 🇨🇴 #AmorYAmistad #RegaloPareja #Colombia #PagoContraEntrega'
    },
    status: 'published',
    publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    views: 4890,
    clicks: 412,
    likes: 685,
    shares: 94,
    attributedSalesCOP: 553500,
    postUrl: 'https://instagram.com/p/sample1'
  },
  {
    id: 'soc-post-2',
    productId: 'prod-amor-105',
    productTitle: 'Lámpara Proyector Astronauta Galaxia y Nebulosa 360° para Citas y Noches Mágicas',
    productPrice: 79900,
    productImageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    productSlug: 'lampara-proyector-astronauta-galaxia-360',
    platforms: ['facebook', 'instagram', 'tiktok'],
    copies: {
      facebook: '🚀 Transforma tu habitación en un universo infinito. Proyector Astronauta 360° con 8 nebulosas y control remoto. 🎁 Paga al recibir en tu puerta.',
      instagram: 'Noches mágicas garantizadas 🌌 Proyector Astronauta Galaxia con giro magnético 360°. ¡Envío rápido y pago contra entrega en toda Colombia! 🚀💫',
      tiktok: 'No puedo creer lo que hace este astronauta en mi cuarto 😱🌌 Proyector Galaxia 360. ¡Pagas al recibir en casa! 🇨🇴 #HabitacionGamer #Tendencia #TikTokMadeMeBuyIt'
    },
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    views: 12450,
    clicks: 1120,
    likes: 1890,
    shares: 340,
    attributedSalesCOP: 1598000,
    postUrl: 'https://tiktok.com/@zavelastore_oficial/video/sample2'
  }
];

const DEFAULT_ORDERS: Order[] = [];

const DEFAULT_CUSTOMERS: Customer[] = [];

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
        // Ensure structure is up to date
        if (parsed && Array.isArray(parsed.products)) {
          // If parsed data contains products, respect the saved list directly
          const categories = Array.isArray(parsed.categories) && parsed.categories.length > 0
            ? parsed.categories
            : DEFAULT_CATEGORIES;

          const products = Array.isArray(parsed.products)
            ? (parsed.products || []).map((p: any) => ({
                ...p,
                dropi_product_id: p.dropi_product_id ? String(p.dropi_product_id) : (p.dropiProductId ? String(p.dropiProductId) : ''),
                warrantyInfo: (p.warrantyInfo || '30 días de garantía oficial').replace(/dropi|novora/gi, 'Zavela'),
                warehouseCity: p.warehouseCity || p.dropiWarehouseCity || 'Bogotá D.C.',
                brand: (p.brand && !p.brand.toLowerCase().includes('novora')) ? p.brand : 'Zavela',
                tags: (p.tags || []).filter((t: string) => typeof t === 'string' && !t.toLowerCase().includes('drop'))
              }))
            : DEFAULT_PRODUCTS;

          const heroBanners = (parsed.settings?.heroBanners && Array.isArray(parsed.settings.heroBanners) && parsed.settings.heroBanners.length > 0)
            ? parsed.settings.heroBanners
            : DEFAULT_SETTINGS.heroBanners;

          const tickerItems = (parsed.settings?.headerTicker?.items && Array.isArray(parsed.settings.headerTicker.items) && parsed.settings.headerTicker.items.length > 0)
            ? parsed.settings.headerTicker.items
            : DEFAULT_SETTINGS.headerTicker.items;

          const mergedSettings: StoreSettings = {
            ...DEFAULT_SETTINGS,
            ...(parsed.settings || {}),
            heroBanners: heroBanners.length > 0 ? heroBanners : DEFAULT_SETTINGS.heroBanners,
            headerTicker: {
              ...DEFAULT_SETTINGS.headerTicker,
              ...(parsed.settings?.headerTicker || {}),
              items: tickerItems.length > 0 ? tickerItems : DEFAULT_SETTINGS.headerTicker.items
            }
          };

          const data: DatabaseSchema = {
            categories,
            products,
            orders: (parsed.orders || DEFAULT_ORDERS).map((o: any) => ({
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
            advisors: parsed.advisors && parsed.advisors.length > 0 ? parsed.advisors : DEFAULT_ADVISORS,
            advisorSales: parsed.advisorSales && parsed.advisorSales.length > 0 ? parsed.advisorSales : DEFAULT_ADVISOR_SALES,
            socialSettings: parsed.socialSettings || DEFAULT_SOCIAL_SETTINGS,
            socialPosts: parsed.socialPosts && parsed.socialPosts.length > 0 ? parsed.socialPosts : DEFAULT_SOCIAL_POSTS
          };

          if (!data.orders) {
            data.orders = [];
          }

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
      advisors: DEFAULT_ADVISORS,
      advisorSales: DEFAULT_ADVISOR_SALES,
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

  // Categories
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
    const existingIndex = this.data.categories.findIndex(c => c.id === cat.id);
    const updatedCategory: Category = {
      id: cat.id || `cat-${Date.now()}`,
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
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.data.categories.splice(idx, 1);
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // Products
  getProducts(filter?: { categorySlug?: string; search?: string; onlyActive?: boolean; featured?: boolean }): Product[] {
    let result = [...this.data.products];
    if (filter?.onlyActive) {
      result = result.filter(p => p.active);
    }
    if (filter?.featured) {
      result = result.filter(p => p.featured);
    }
    if (filter?.categorySlug && filter.categorySlug !== 'todos') {
      const cat = this.getCategoryBySlug(filter.categorySlug);
      if (cat) {
        result = result.filter(p => p.categoryId === cat.id);
      }
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) || 
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }

  getProductById(idOrSlug: string): Product | undefined {
    return this.data.products.find(p => p.id === idOrSlug || p.slug === idOrSlug);
  }

  saveProduct(product: Product): Product {
    const index = this.data.products.findIndex(p => p.id === product.id);
    const updatedProduct = {
      ...product,
      updatedAt: new Date().toISOString()
    };
    if (index >= 0) {
      this.data.products[index] = updatedProduct;
    } else {
      this.data.products.unshift(updatedProduct);
    }
    this.saveData(this.data);
    return updatedProduct;
  }

  deleteProduct(id: string): boolean {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index >= 0) {
      this.data.products.splice(index, 1);
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  setProducts(products: Product[]): Product[] {
    this.data.products = [...products];
    this.saveData(this.data);
    return this.data.products;
  }

  // Orders
  getOrders(filter?: { status?: OrderStatus; search?: string }): Order[] {
    let result = [...this.data.orders];
    if (filter?.status) {
      result = result.filter(o => o.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(o => 
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.trackingNumber?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrderById(idOrNumber: string): Order | undefined {
    const q = idOrNumber.trim().toLowerCase();
    return this.data.orders.find(o => 
      o.id === idOrNumber || 
      o.orderNumber.toLowerCase() === q ||
      o.trackingNumber?.toLowerCase() === q
    );
  }

  getOrderByPhoneOrEmail(query: string): Order[] {
    const q = query.trim().toLowerCase();
    return this.data.orders.filter(o => 
      o.customerPhone.includes(q) ||
      o.customerEmail.toLowerCase() === q ||
      o.orderNumber.toLowerCase() === q ||
      o.trackingNumber?.toLowerCase() === q
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  saveOrder(order: Order): Order {
    const index = this.data.orders.findIndex(o => o.id === order.id);
    const updatedOrder = {
      ...order,
      updatedAt: new Date().toISOString()
    };
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
    const existingIndex = this.data.customers.findIndex(c => 
      c.phone === order.customerPhone || (c.email && c.email.toLowerCase() === order.customerEmail.toLowerCase())
    );
    const [firstName, ...rest] = order.customerName.split(' ');
    const lastName = rest.join(' ') || '';

    if (existingIndex >= 0) {
      const existing = this.data.customers[existingIndex];
      this.data.customers[existingIndex] = {
        ...existing,
        totalOrders: existing.totalOrders + 1,
        totalSpent: existing.totalSpent + order.total,
        department: order.department,
        city: order.city,
        address: order.address
      };
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        firstName: firstName || order.customerName,
        lastName,
        email: order.customerEmail,
        phone: order.customerPhone,
        department: order.department,
        city: order.city,
        address: order.address,
        notes: order.additionalNotes,
        totalOrders: 1,
        totalSpent: order.total,
        createdAt: new Date().toISOString()
      };
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

  // Customers
  getCustomers(): Customer[] {
    return this.data.customers;
  }

  getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find(c => c.id === id);
  }

  saveCustomer(customer: Partial<Customer>): Customer {
    const idx = this.data.customers.findIndex(c => c.id === customer.id);
    const updatedCustomer: Customer = {
      id: customer.id || `cust-${Date.now()}`,
      firstName: customer.firstName || 'Cliente',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      department: customer.department || 'Bogotá D.C.',
      city: customer.city || 'Bogotá D.C.',
      address: customer.address || '',
      notes: customer.notes || '',
      totalOrders: customer.totalOrders ?? 0,
      totalSpent: customer.totalSpent ?? 0,
      createdAt: customer.createdAt || new Date().toISOString()
    };

    if (idx >= 0) {
      this.data.customers[idx] = updatedCustomer;
    } else {
      this.data.customers.unshift(updatedCustomer);
    }
    this.saveData(this.data);
    return updatedCustomer;
  }

  deleteCustomer(id: string): boolean {
    const idx = this.data.customers.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.data.customers.splice(idx, 1);
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // Settings
  getSettings(): StoreSettings {
    return this.data.settings;
  }

  saveSettings(settings: Partial<StoreSettings>): StoreSettings {
    this.data.settings = {
      ...this.data.settings,
      ...settings
    };
    this.saveData(this.data);
    return this.data.settings;
  }

  // Logs
  getLogs(limit = 100): SystemLog[] {
    return this.data.logs.slice(0, limit);
  }

  clearLogs(): boolean {
    this.data.logs = [];
    this.saveData(this.data);
    return true;
  }

  addLog(log: Omit<SystemLog, 'id' | 'createdAt'>): SystemLog {
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...log,
      createdAt: new Date().toISOString()
    };
    this.data.logs.unshift(newLog);
    if (this.data.logs.length > 500) {
      this.data.logs = this.data.logs.slice(0, 500);
    }
    this.saveData(this.data);
    return newLog;
  }

  // Backup & Restore
  getFullBackup(): DatabaseSchema {
    return this.data;
  }

  restoreBackup(backupData: DatabaseSchema): boolean {
    if (!backupData || !Array.isArray(backupData.products)) {
      throw new Error('Formato de respaldo JSON no válido');
    }
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
      categories: DEFAULT_CATEGORIES,
      products: DEFAULT_PRODUCTS,
      orders: DEFAULT_ORDERS,
      customers: DEFAULT_CUSTOMERS,
      advisors: DEFAULT_ADVISORS,
      advisorSales: DEFAULT_ADVISOR_SALES,
      settings: DEFAULT_SETTINGS,
      logs: DEFAULT_LOGS
    };
    this.saveData(this.data);
    return true;
  }

  // Clear all orders and sales records
  clearAllOrders(): boolean {
    this.data.orders = [];
    this.data.customers = [];
    this.data.advisorSales = [];
    this.saveData(this.data);
    return true;
  }

  // Simulate custom orders with carrier costs and Dropi fees
  simulateOrders(options?: {
    countPerProduct?: number;
    totalOrdersCount?: number;
    carrierCost?: number;
    dropiFeePercent?: number;
    dropiFixedFee?: number;
    selectedProductIds?: string[];
  }): Order[] {
    const products = this.data.products;
    if (!products || products.length === 0) {
      return [];
    }

    const targetProducts = options?.selectedProductIds && options.selectedProductIds.length > 0
      ? products.filter(p => options.selectedProductIds!.includes(p.id))
      : products;

    if (targetProducts.length === 0) return [];

    const defaultCarrierCost = options?.carrierCost !== undefined ? Number(options.carrierCost) : 16500;
    const defaultDropiFeePercent = options?.dropiFeePercent !== undefined ? Number(options.dropiFeePercent) : 5;
    const defaultDropiFixedFee = options?.dropiFixedFee !== undefined ? Number(options.dropiFixedFee) : 0;
    const countPerProd = options?.countPerProduct ? Math.max(1, Number(options.countPerProduct)) : 3;

    const colCustomers = [
      { name: 'Camila Fernanda Ospina', phone: '3148729104', email: 'camila.ospina@gmail.com', city: 'Medellín', dept: 'Antioquia', addr: 'Carrera 43A # 11-45, El Poblado' },
      { name: 'Juan Carlos Morales', phone: '3104592817', email: 'juan.morales@hotmail.com', city: 'Bogotá D.C.', dept: 'Bogotá D.C.', addr: 'Calle 140 # 12-34, Cedritos' },
      { name: 'Daniela Sofía Valencia', phone: '3189201483', email: 'daniela.valencia@yahoo.es', city: 'Cali', dept: 'Valle del Cauca', addr: 'Avenida 6N # 28N-15, Santa Mónica' },
      { name: 'Andrés Felipe Barreto', phone: '3207419823', email: 'andres.barreto@gmail.com', city: 'Barranquilla', dept: 'Atlántico', addr: 'Calle 84 # 52-20, Alto Prado' },
      { name: 'Valentina Gómez Pardo', phone: '3168291045', email: 'valentina.gomez@outlook.com', city: 'Bucaramanga', dept: 'Santander', addr: 'Carrera 33 # 48-12, Cabecera' },
      { name: 'Santiago Alejandro Rincón', phone: '3129038471', email: 'santiago.rincon@gmail.com', city: 'Pereira', dept: 'Risaralda', addr: 'Avenida Circunvalar # 14-22' },
      { name: 'Mariana Restrepo Duque', phone: '3156719284', email: 'mariana.restrepo@gmail.com', city: 'Manizales', dept: 'Caldas', addr: 'Calle 65 # 23-40, Palermo' },
      { name: 'Mateo Esteban Silva', phone: '3118273940', email: 'mateo.silva@hotmail.com', city: 'Cartagena', dept: 'Bolívar', addr: 'Carrera 3 # 8-15, Bocagrande' },
      { name: 'Isabella Castro Méndez', phone: '3174920183', email: 'isabella.castro@gmail.com', city: 'Cúcuta', dept: 'Norte de Santander', addr: 'Avenida 0 # 12-50, Caobos' },
      { name: 'Nicolás David Pineda', phone: '3138491027', email: 'nicolas.pineda@yahoo.com', city: 'Ibagué', dept: 'Tolima', addr: 'Carrera 5 # 38-19, La Pola' },
      { name: 'Laura Jimena Torres', phone: '3162948102', email: 'laura.torres@gmail.com', city: 'Santa Marta', dept: 'Magdalena', addr: 'Calle 22 # 3-45, El Rodadero' },
      { name: 'Gabriel Eduardo Rojas', phone: '3184910283', email: 'gabriel.rojas@gmail.com', city: 'Villavicencio', dept: 'Meta', addr: 'Calle 15 # 40-10, Los Centauros' },
      { name: 'Paola Andrea Guerrero', phone: '3127491023', email: 'paola.guerrero@hotmail.com', city: 'Pasto', dept: 'Nariño', addr: 'Carrera 27 # 18-30, Pandiaco' },
      { name: 'David Leonardo Lozano', phone: '3159201847', email: 'david.lozano@gmail.com', city: 'Armenia', dept: 'Quindío', addr: 'Avenida Bolívar # 14N-30' },
      { name: 'Sofía Elena Cardona', phone: '3108291048', email: 'sofia.cardona@gmail.com', city: 'Neiva', dept: 'Huila', addr: 'Calle 10 # 25-18, Ipanema' },
      { name: 'Alejandro José Navarro', phone: '3179201845', email: 'alejandro.navarro@gmail.com', city: 'Montería', dept: 'Córdoba', addr: 'Carrera 6 # 60-15, El Recreo' }
    ];

    const carriers = [
      { name: 'Servientrega', code: 'SER', cost: defaultCarrierCost },
      { name: 'Coordinadora', code: 'COO', cost: defaultCarrierCost },
      { name: 'Envía', code: 'ENV', cost: defaultCarrierCost },
      { name: 'Interrapidísimo', code: 'INT', cost: defaultCarrierCost },
      { name: 'TCC', code: 'TCC', cost: defaultCarrierCost }
    ];

    const newOrders: Order[] = [];
    let orderCounter = 1001;
    let customerIndex = 0;
    const now = new Date();

    targetProducts.forEach((prod, prodIndex) => {
      const unitCost = Number(prod.costPrice) > 0 ? Number(prod.costPrice) : Math.round(prod.price * 0.45);

      for (let saleIdx = 1; saleIdx <= countPerProd; saleIdx++) {
        const cust = colCustomers[customerIndex % colCustomers.length];
        customerIndex++;

        const carrierObj = carriers[(prodIndex + saleIdx) % carriers.length];
        const trackingNumber = `${carrierObj.code}-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        
        // Orders distributed realistically today
        const totalMinutesAgo = ((prodIndex * countPerProd + saleIdx) * 6.5) % (14 * 60) + 15;
        const orderDate = new Date(now.getTime() - totalMinutesAgo * 60000);
        
        const statuses: OrderStatus[] = ['procesando', 'enviado', 'entregado', 'pendiente'];
        const status = statuses[(prodIndex + saleIdx) % statuses.length];

        const quantity = 1;
        const subtotal = prod.price * quantity;
        const shippingCost = subtotal >= (this.getSettings().freeShippingThreshold || 120000) ? 0 : 0;
        const total = subtotal + shippingCost;
        const productCostTotal = unitCost * quantity;
        
        // Exact Operational Costs per order
        const carrierFee = carrierObj.cost;
        const dropiFee = Math.round((total * (defaultDropiFeePercent / 100))) + defaultDropiFixedFee;
        const grossMargin = total - productCostTotal;
        const netMargin = total - productCostTotal - carrierFee - dropiFee;

        const order: Order = {
          id: `ord-sim-${prod.id}-${saleIdx}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          orderNumber: `ZV-${orderCounter++}`,
          customerName: cust.name,
          customerPhone: cust.phone,
          customerEmail: cust.email,
          department: cust.dept,
          city: cust.city,
          address: cust.addr,
          additionalNotes: `Venta simulada #${saleIdx} para ${prod.title}. Flete: $${carrierFee.toLocaleString()} COP | Tarifa Dropi: $${dropiFee.toLocaleString()} COP`,
          subtotal,
          shippingCost,
          total,
          productCostTotal,
          grossMargin,
          carrierFee,
          dropiFee,
          netMargin,
          paymentMethod: 'contra_entrega',
          paymentStatus: 'CASH_ON_DELIVERY',
          status,
          carrier: carrierObj.name,
          trackingNumber,
          guideUrl: `https://tracking.zavelastore.co/${trackingNumber}`,
          shippedAt: status === 'enviado' || status === 'entregado' ? new Date(orderDate.getTime() + 1800000).toISOString() : undefined,
          deliveredAt: status === 'entregado' ? new Date(orderDate.getTime() + 7200000).toISOString() : undefined,
          items: [
            {
              id: `item-${prod.id}-${saleIdx}`,
              productId: prod.id,
              title: prod.title,
              variantId: prod.variants && prod.variants[0] ? prod.variants[0].id : undefined,
              variantName: prod.variants && prod.variants[0] ? prod.variants[0].name : undefined,
              quantity,
              unitPrice: prod.price,
              unitCost,
              subtotal,
              image: prod.images && prod.images[0] ? prod.images[0] : undefined
            }
          ],
          createdAt: orderDate.toISOString(),
          updatedAt: orderDate.toISOString()
        };

        newOrders.push(order);
      }
    });

    this.data.orders = newOrders;
    this.data.customers = [];
    newOrders.forEach(o => this.upsertCustomerFromOrder(o));
    this.saveData(this.data);
    return newOrders;
  }

  // Simulate exactly 3 orders for backward compatibility
  simulate3OrdersPerProduct(): Order[] {
    return this.simulateOrders({ countPerProduct: 3, carrierCost: 16500, dropiFeePercent: 5 });
  }

  // Metrics
  getMetrics() {
    const orders = this.data.orders || [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const validOrders = orders.filter(o => o.status !== 'cancelado');

    // Total calculations
    const totalSales = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalProductCosts = validOrders.reduce((sum, o) => sum + (o.productCostTotal || 0), 0);
    const totalCarrierCosts = validOrders.reduce((sum, o) => sum + (o.carrierFee !== undefined ? o.carrierFee : 16500), 0);
    const totalDropiFees = validOrders.reduce((sum, o) => sum + (o.dropiFee !== undefined ? o.dropiFee : Math.round((o.total || 0) * 0.05)), 0);
    
    const totalGrossProfit = totalSales - totalProductCosts;
    const totalNetProfit = totalSales - totalProductCosts - totalCarrierCosts - totalDropiFees;
    const averageMarginPercentage = totalProductCosts > 0 ? (totalGrossProfit / totalProductCosts) * 100 : 0;
    const netMarginPercentage = totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0;

    // Daily calculations (Today)
    const todayOrdersList = validOrders.filter(o => new Date(o.createdAt) >= startOfToday);
    const todaySales = todayOrdersList.reduce((sum, o) => sum + (o.total || 0), 0);
    const todayProductCosts = todayOrdersList.reduce((sum, o) => sum + (o.productCostTotal || 0), 0);
    const todayCarrierCosts = todayOrdersList.reduce((sum, o) => sum + (o.carrierFee !== undefined ? o.carrierFee : 16500), 0);
    const todayDropiFees = todayOrdersList.reduce((sum, o) => sum + (o.dropiFee !== undefined ? o.dropiFee : Math.round((o.total || 0) * 0.05)), 0);
    const todayGrossProfit = todaySales - todayProductCosts;
    const todayNetProfit = todaySales - todayProductCosts - todayCarrierCosts - todayDropiFees;

    // Monthly calculations (This Month)
    const monthOrdersList = validOrders.filter(o => new Date(o.createdAt) >= startOfMonth);
    const monthSales = monthOrdersList.reduce((sum, o) => sum + (o.total || 0), 0);
    const monthProductCosts = monthOrdersList.reduce((sum, o) => sum + (o.productCostTotal || 0), 0);
    const monthCarrierCosts = monthOrdersList.reduce((sum, o) => sum + (o.carrierFee !== undefined ? o.carrierFee : 16500), 0);
    const monthDropiFees = monthOrdersList.reduce((sum, o) => sum + (o.dropiFee !== undefined ? o.dropiFee : Math.round((o.total || 0) * 0.05)), 0);
    const monthGrossProfit = monthSales - monthProductCosts;
    const monthNetProfit = monthSales - monthProductCosts - monthCarrierCosts - monthDropiFees;

    const pendingOrders = orders.filter(o => o.status === 'pendiente' || o.status === 'pago_confirmado').length;
    const processingOrders = orders.filter(o => o.status === 'procesando').length;
    const shippedOrders = orders.filter(o => o.status === 'enviado').length;
    const deliveredOrders = orders.filter(o => o.status === 'entregado').length;

    // Detailed profit breakdown per product
    const productBreakdownMap: Record<string, {
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
    }> = {};

    // Initialize map for all products
    (this.data.products || []).forEach(p => {
      const cost = Number(p.costPrice) > 0 ? Number(p.costPrice) : Math.round(p.price * 0.45);
      const unitMargin = p.price - cost;
      const marginPct = cost > 0 ? (unitMargin / cost) * 100 : 0;

      productBreakdownMap[p.id] = {
        productId: p.id,
        productTitle: p.title,
        productImage: p.images && p.images[0] ? p.images[0] : '',
        categoryName: p.categoryName || 'Catálogo',
        price: p.price,
        costPrice: cost,
        unitMargin,
        marginPercentage: Math.round(marginPct * 10) / 10,
        unitsSold: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMarginPercentage: 0
      };
    });

    // Populate from orders
    for (const order of validOrders) {
      for (const item of (order.items || [])) {
        if (!productBreakdownMap[item.productId]) {
          const unitCost = Number(item.unitCost) > 0 ? Number(item.unitCost) : Math.round(item.unitPrice * 0.45);
          productBreakdownMap[item.productId] = {
            productId: item.productId,
            productTitle: item.title,
            productImage: item.image,
            categoryName: 'Catálogo',
            price: item.unitPrice,
            costPrice: unitCost,
            unitMargin: item.unitPrice - unitCost,
            marginPercentage: unitCost > 0 ? Math.round(((item.unitPrice - unitCost) / unitCost) * 1000) / 10 : 0,
            unitsSold: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            profitMarginPercentage: 0
          };
        }

        const entry = productBreakdownMap[item.productId];
        const itemQuantity = item.quantity || 1;
        const itemRevenue = item.subtotal || (item.unitPrice * itemQuantity);
        const itemCost = (entry.costPrice || (item.unitCost || 0)) * itemQuantity;

        entry.unitsSold += itemQuantity;
        entry.totalRevenue += itemRevenue;
        entry.totalCost += itemCost;
        entry.totalProfit += (itemRevenue - itemCost);
      }
    }

    const productProfitBreakdown = Object.values(productBreakdownMap).map(item => {
      const marginPct = item.totalCost > 0 ? (item.totalProfit / item.totalCost) * 100 : (item.costPrice > 0 ? (item.unitMargin / item.costPrice) * 100 : 0);
      return {
        ...item,
        profitMarginPercentage: Math.round(marginPct * 10) / 10
      };
    }).sort((a, b) => b.totalProfit - a.totalProfit);

    // Top products calculation
    const topProducts = productProfitBreakdown
      .filter(p => p.unitsSold > 0)
      .slice(0, 5)
      .map(p => ({
        product: this.getProductById(p.productId) || {
          id: p.productId,
          title: p.productTitle,
          price: p.price,
          costPrice: p.costPrice,
          images: p.productImage ? [p.productImage] : []
        } as any,
        soldCount: p.unitsSold,
        revenue: p.totalRevenue,
        profit: p.totalProfit
      }));

    return {
      totalRevenue: totalSales,
      totalSales,
      totalOrders: orders.length,
      totalGrossProfit,
      totalProductCosts,
      totalCarrierCosts,
      totalDropiFees,
      totalNetProfit,
      averageMarginPercentage: Math.round(averageMarginPercentage * 10) / 10,
      netMarginPercentage: Math.round(netMarginPercentage * 10) / 10,
      
      // Daily
      todaySales,
      todayOrders: todayOrdersList.length,
      todayGrossProfit,
      todayProductCosts,
      todayCarrierCosts,
      todayDropiFees,
      todayNetProfit,

      // Monthly
      monthSales,
      monthOrders: monthOrdersList.length,
      monthGrossProfit,
      monthProductCosts,
      monthCarrierCosts,
      monthDropiFees,
      monthNetProfit,

      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalProducts: this.data.products.length,
      totalCustomers: this.data.customers.length,
      recentOrders: orders.slice(0, 8),
      topProducts,
      productProfitBreakdown
    };
  }

  // ==========================================
  // ADVISORS & DROPI BAG (Sergio Martínez Profile)
  // ==========================================

  getAdvisors(): Advisor[] {
    return this.data.advisors || DEFAULT_ADVISORS;
  }

  getAdvisorById(id: string): Advisor | undefined {
    return (this.data.advisors || DEFAULT_ADVISORS).find(a => a.id === id);
  }

  saveAdvisor(advisor: Partial<Advisor>): Advisor {
    if (!this.data.advisors) this.data.advisors = [...DEFAULT_ADVISORS];
    const existingIndex = this.data.advisors.findIndex(a => a.id === advisor.id);
    
    // Generate clean default username if not specified
    const generatedUsername = advisor.username?.trim() || 
      (advisor.name ? advisor.name.toLowerCase().replace(/[^a-z0-9]/g, '') : `asesor${this.data.advisors.length + 1}`);

    const updated: Advisor = {
      id: advisor.id || `AS-${String(this.data.advisors.length + 1).padStart(3, '0')}`,
      name: advisor.name || 'Nuevo Asesor',
      username: generatedUsername,
      password: advisor.password || 'asesor123',
      phone: advisor.phone || '',
      email: advisor.email || '',
      channel: advisor.channel || 'WhatsApp Directo',
      commissionRate: advisor.commissionRate ?? 10,
      status: advisor.status || 'active',
      settlementStatus: advisor.settlementStatus || 'al_dia',
      lastSettlementDate: advisor.lastSettlementDate,
      notes: advisor.notes || '',
      createdAt: advisor.createdAt || new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.data.advisors[existingIndex] = updated;
    } else {
      this.data.advisors.push(updated);
    }
    this.saveData(this.data);
    return updated;
  }

  authenticateAdvisor(identifier: string, password: string): Advisor | null {
    if (!identifier || !password) return null;
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    const advisors = this.getAdvisors();
    const matched = advisors.find(a => {
      const matchUsername = a.username && a.username.toLowerCase() === cleanId;
      const matchId = a.id && a.id.toLowerCase() === cleanId;
      const matchName = a.name && a.name.toLowerCase() === cleanId;
      const matchEmail = a.email && a.email.toLowerCase() === cleanId;
      return (matchUsername || matchId || matchName || matchEmail) && a.password === cleanPass && a.status === 'active';
    });

    return matched || null;
  }

  deleteAdvisor(id: string): boolean {
    if (!this.data.advisors) return false;
    const idx = this.data.advisors.findIndex(a => a.id === id);
    if (idx >= 0) {
      this.data.advisors.splice(idx, 1);
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  settleAdvisor(id: string, notes?: string): Advisor | null {
    if (!this.data.advisors) return null;
    const idx = this.data.advisors.findIndex(a => a.id === id);
    if (idx < 0) return null;

    this.data.advisors[idx] = {
      ...this.data.advisors[idx],
      settlementStatus: 'liquidado',
      lastSettlementDate: new Date().toISOString(),
      notes: notes ? `${this.data.advisors[idx].notes || ''}\n[Liquidado ${new Date().toLocaleDateString()}]: ${notes}`.trim() : this.data.advisors[idx].notes
    };
    this.saveData(this.data);
    return this.data.advisors[idx];
  }

  getAdvisorSales(filter?: { advisorId?: string; dropiStatus?: DropiStatus; search?: string }): AdvisorSale[] {
    let sales = this.data.advisorSales || DEFAULT_ADVISOR_SALES;
    if (filter?.advisorId && filter.advisorId !== 'all') {
      sales = sales.filter(s => s.advisorId === filter.advisorId);
    }
    if (filter?.dropiStatus) {
      sales = sales.filter(s => s.dropiStatus === filter.dropiStatus);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      sales = sales.filter(s => 
        s.clientName.toLowerCase().includes(q) ||
        s.clientPhone.includes(q) ||
        s.clientCity.toLowerCase().includes(q) ||
        s.productTitle.toLowerCase().includes(q) ||
        s.advisorName.toLowerCase().includes(q) ||
        s.orderNumber.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }
    return sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  saveAdvisorSale(sale: Partial<AdvisorSale>): AdvisorSale {
    if (!this.data.advisorSales) this.data.advisorSales = [...DEFAULT_ADVISOR_SALES];
    const existingIndex = this.data.advisorSales.findIndex(s => s.id === sale.id);

    const advisor = sale.advisorId ? this.getAdvisorById(sale.advisorId) : undefined;
    const advisorName = advisor ? advisor.name : (sale.advisorName || 'Asesor General');
    const advisorId = advisor ? advisor.id : (sale.advisorId || 'AS-001');

    const count = this.data.advisorSales.length + 1;
    const unitPrice = Number(sale.unitPrice) || 0;
    const quantity = Number(sale.quantity) || 1;
    const totalAmount = Number(sale.totalAmount) || (unitPrice * quantity);

    const updatedSale: AdvisorSale = {
      id: sale.id || `DP-${String(count).padStart(3, '0')}`,
      orderNumber: sale.orderNumber || `DP-100${count}`,
      advisorId,
      advisorName,
      advisorChannel: advisor?.channel || sale.advisorChannel || 'WhatsApp Directo',
      productId: sale.productId || 'prod-custom',
      productTitle: sale.productTitle || 'Producto Nacional',
      quantity,
      unitPrice,
      totalAmount,
      clientName: sale.clientName || 'Cliente Particular',
      clientPhone: sale.clientPhone || '',
      clientCity: sale.clientCity || 'Bogotá D.C.',
      clientDepartment: sale.clientDepartment || 'Cundinamarca',
      clientAddress: sale.clientAddress || '',
      additionalNotes: sale.additionalNotes || '',
      dropiStatus: sale.dropiStatus || 'pendiente_bolsa',
      dropiOrderId: sale.dropiOrderId,
      trackingNumber: sale.trackingNumber,
      paymentMethod: 'contra_entrega',
      createdAt: sale.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.data.advisorSales[existingIndex] = updatedSale;
    } else {
      this.data.advisorSales.unshift(updatedSale);

      // Auto update advisor settlement status to 'pendiente_liquidacion'
      const advIdx = (this.data.advisors || []).findIndex(a => a.id === advisorId);
      if (advIdx >= 0) {
        this.data.advisors[advIdx].settlementStatus = 'pendiente_liquidacion';
      }
    }

    this.saveData(this.data);
    return updatedSale;
  }

  deleteAdvisorSale(id: string): boolean {
    if (!this.data.advisorSales) return false;
    const idx = this.data.advisorSales.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.data.advisorSales.splice(idx, 1);
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  markAdvisorSalesDropiStatus(ids: string[], status: DropiStatus): number {
    if (!this.data.advisorSales || ids.length === 0) return 0;
    let count = 0;
    this.data.advisorSales = this.data.advisorSales.map(s => {
      if (ids.includes(s.id)) {
        count++;
        return {
          ...s,
          dropiStatus: status,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    this.saveData(this.data);
    return count;
  }

  getAdvisorsPerformance(): AdvisorPerformance[] {
    const advisors = this.getAdvisors();
    const allSales = this.data.advisorSales || DEFAULT_ADVISOR_SALES;

    return advisors.map(adv => {
      const advSales = allSales.filter(s => s.advisorId === adv.id && s.dropiStatus !== 'cancelado');
      const totalSalesCOP = advSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
      const unitsSold = advSales.reduce((acc, s) => acc + (s.quantity || 1), 0);
      const commissionRate = adv.commissionRate || 10;
      const pendingSettlementAmountCOP = Math.round((totalSalesCOP * commissionRate) / 100);

      return {
        advisorId: adv.id,
        advisorName: adv.name,
        channel: adv.channel,
        totalSalesCOP,
        unitsSold,
        orderCount: advSales.length,
        settlementStatus: adv.settlementStatus,
        pendingSettlementAmountCOP,
        recentSales: advSales.slice(0, 5)
      };
    });
  }

  // ==========================================
  // SOCIAL MARKETING & MULTI-CHANNEL AUTOMATION
  // ==========================================
  getSocialMarketingSettings(): SocialMarketingSettings {
    if (!this.data.socialSettings) {
      this.data.socialSettings = { ...DEFAULT_SOCIAL_SETTINGS };
      this.saveData(this.data);
    }
    return this.data.socialSettings;
  }

  saveSocialMarketingSettings(settings: Partial<SocialMarketingSettings>): SocialMarketingSettings {
    const current = this.getSocialMarketingSettings();
    const updated: SocialMarketingSettings = {
      ...current,
      ...settings,
      connections: {
        ...current.connections,
        ...(settings.connections || {})
      },
      targetChannels: {
        ...current.targetChannels,
        ...(settings.targetChannels || {})
      }
    };
    this.data.socialSettings = updated;
    this.saveData(this.data);
    return updated;
  }

  getSocialBroadcastPosts(): SocialBroadcastPost[] {
    if (!this.data.socialPosts) {
      this.data.socialPosts = [...DEFAULT_SOCIAL_POSTS];
      this.saveData(this.data);
    }
    return this.data.socialPosts;
  }

  publishSocialPost(params: {
    productId: string;
    platforms?: ('facebook' | 'instagram' | 'tiktok')[];
    copies?: { facebook?: string; instagram?: string; tiktok?: string };
    estimatedViewsBoost?: number;
  }): SocialBroadcastPost | null {
    const product = this.getProductById(params.productId);
    if (!product) return null;

    const socSettings = this.getSocialMarketingSettings();
    const activePlatforms = params.platforms && params.platforms.length > 0
      ? params.platforms
      : (['facebook', 'instagram', 'tiktok'] as ('facebook' | 'instagram' | 'tiktok')[]).filter(
          p => socSettings.targetChannels[p] && socSettings.connections[p]?.connected
        );

    const platformsToUse = activePlatforms.length > 0 ? activePlatforms : ['facebook', 'instagram', 'tiktok'];
    const priceFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(product.price);

    const defaultFbCopy = `🔥 ¡Nuevo Lanzamiento en Zavela Store! ${product.title}\n\n🏷️ PRECIO ESPECIAL: ${priceFormatted}\n🚚 PAGO CONTRA ENTREGA: Recibe en tu casa y paga en efectivo.\n✅ 30 días de garantía oficial.\n\n👉 ¡Haz tu pedido directo antes de que se agoten las unidades!`;
    const defaultIgCopy = `✨ Presentamos: ${product.title} ✨\n\n💰 Precio: ${priceFormatted} con envío contra entrega a toda Colombia 🇨🇴\n📦 Toca el link de nuestra biografía o déjanos un DM para apartar el tuyo con despacho prioritario.\n\n#ZavelaStore #PagoContraEntrega #Colombia #Tendencia2026 #EnvioGratis`;
    const defaultTtCopy = `POV: Encontraste el producto en tendencia con PAGO CONTRA ENTREGA en Colombia 🇨🇴😱🔥\n\n${product.title} por solo ${priceFormatted}!\nComenta "YO QUIERO" o haz clic en el enlace para pedirlo con envío gratis. #TikTokMadeMeBuyIt #ZavelaStore #Colombia #Oferta`;

    const initialViews = Math.floor(Math.random() * 2500) + (params.estimatedViewsBoost || 1500);
    const initialClicks = Math.round(initialViews * (0.06 + Math.random() * 0.04));
    const initialLikes = Math.round(initialViews * (0.08 + Math.random() * 0.05));
    const initialShares = Math.round(initialViews * 0.015);
    const sampleConversionCount = Math.floor(initialClicks * 0.04);
    const attributedSalesCOP = sampleConversionCount * product.price;

    const newPost: SocialBroadcastPost = {
      id: `soc-post-${Date.now()}`,
      productId: product.id,
      productTitle: product.title,
      productPrice: product.price,
      productImageUrl: product.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      productSlug: product.slug,
      platforms: platformsToUse as ('facebook' | 'instagram' | 'tiktok')[],
      copies: {
        facebook: params.copies?.facebook || defaultFbCopy,
        instagram: params.copies?.instagram || defaultIgCopy,
        tiktok: params.copies?.tiktok || defaultTtCopy
      },
      status: 'published',
      publishedAt: new Date().toISOString(),
      views: initialViews,
      clicks: initialClicks,
      likes: initialLikes,
      shares: initialShares,
      attributedSalesCOP: attributedSalesCOP,
      postUrl: `https://instagram.com/p/zavela_${product.slug.slice(0, 10)}`
    };

    if (!this.data.socialPosts) {
      this.data.socialPosts = [];
    }
    this.data.socialPosts.unshift(newPost);
    this.saveData(this.data);

    // Add log
    this.addLog({
      type: 'PRODUCT_UPDATE',
      action: 'Publicación en Redes Sociales',
      details: `Producto "${product.title}" publicado en [${platformsToUse.join(', ')}]. Generando visualizaciones y tráfico de ventas.`,
      status: 'success'
    });

    return newPost;
  }

  deleteSocialBroadcastPost(id: string): boolean {
    if (!this.data.socialPosts) return false;
    const idx = this.data.socialPosts.findIndex(p => p.id === id);
    if (idx >= 0) {
      this.data.socialPosts.splice(idx, 1);
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  autoBroadcastProduct(product: Product): SocialBroadcastPost | null {
    const settings = this.getSocialMarketingSettings();
    if (!settings.autoPublishOnProductCreate) {
      return null;
    }

    return this.publishSocialPost({
      productId: product.id,
      estimatedViewsBoost: 2000
    });
  }
}

export const db = new DatabaseStore();
