import { ExclusivityPageSettings, CustomSubpage, PlateOption, ExclusivityBagProduct } from '../types/index.ts';

export const DEFAULT_PLATES: PlateOption[] = [
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
];

export const DEFAULT_EXCLUSIVITY_BAGS: ExclusivityBagProduct[] = [
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
  },
  {
    id: 'bag-emerald-imperial',
    title: 'Bolso Esmeralda Imperial Colombiano',
    slug: 'bolso-esmeralda-imperial-colombiano',
    subtitle: 'Homenaje a las esmeraldas colombianas con destellos verdes profundos',
    description: 'Inspirado en la joya representativa de Colombia. Tejido artesanal con cuentas de tono verde esmeralda y reflejos prisma. Viene acompañado de su placa con QR personalizado en acabado oro brillante.',
    priceCOP: 189900,
    compareAtPriceCOP: 250000,
    material: 'Cuentas Cristal Esmeralda HD + Forro Interior Acolchado',
    color: 'Verde Esmeralda Profundo',
    dimensions: '23 cm (ancho) x 17 cm (alto) x 7 cm (profundidad)',
    craftsmanTag: '💎 Hecho a Mano en Colombia • Diseño por Rochy',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80'
    ],
    stock: 8,
    active: true,
    featured: true,
    defaultPlateShape: 'round',
    defaultPlateFinish: 'gold_engraved',
    rating: 5.0,
    reviewCount: 24,
    freeShipping: true,
    cashOnDelivery: true,
    tags: ['esmeralda', 'verde', 'cuentas artesanales', 'colombia', 'rochy']
  },
  {
    id: 'bag-sapphire-night',
    title: 'Bolso Zafiro Imperial & Plata',
    slug: 'bolso-zafiro-imperial-plata',
    subtitle: 'Tonalidad azul noche con placa en acabado plata espejo pulido',
    description: 'Un modelo de alta distinción que conjuga cuentas azul cobalto profundo con herrajes plateados y placa de autor en acero quirúrgico espejo. Máxima resistencia y elegancia atemporal.',
    priceCOP: 175000,
    compareAtPriceCOP: 230000,
    material: 'Cuentas Zafiro Translúcidas + Cadena Metálica Plateada',
    color: 'Azul Zafiro Noche',
    dimensions: '22 cm (ancho) x 16 cm (alto) x 7 cm (profundidad)',
    craftsmanTag: '💎 Hecho a Mano en Colombia • Diseño por Rochy',
    images: [
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80'
    ],
    stock: 11,
    active: true,
    featured: false,
    defaultPlateShape: 'rectangular',
    defaultPlateFinish: 'silver_chrome',
    rating: 4.8,
    reviewCount: 17,
    freeShipping: true,
    cashOnDelivery: true,
    tags: ['zafiro', 'azul', 'cuentas', 'artesania', 'rochy']
  }
];

export const DEFAULT_EXCLUSIVITY_SETTINGS: ExclusivityPageSettings = {
  enabled: true,
  navTitle: 'EXCLUSIVIDAD (Bolsos & Placas)',
  heroBadge: '💎 EDICIÓN LIMITADA 2026 • DISEÑO POR ROCHY',
  heroTitle: 'Colección Exclusiva de Bolsos',
  heroSubtitle: 'Piezas artesanales únicas con placa metálica grabada en láser y código QR personalizado.',
  heroCtaText: 'Ver Modelos Disponibles',
  heroBannerImage: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80',
  platesShowcaseTitle: 'Showcase de Placas de Autenticidad (Rochy - Identidad Visual)',
  platesShowcaseSubtitle: 'Grabado láser de alta precisión en metal pulido con código QR personalizable',
  craftsmanshipGuaranteeText: 'Cada bolso es confeccionado a mano en Colombia en un proceso de 18 horas de tejido continuo. Respaldado con garantía directa de 30 días y certificado de autenticidad.',
  plates: DEFAULT_PLATES,
  curatedProducts: DEFAULT_EXCLUSIVITY_BAGS
};

export const DEFAULT_CUSTOM_SUBPAGES: CustomSubpage[] = [];

export function getResolvedExclusivitySettings(customSettings?: Partial<ExclusivityPageSettings>): ExclusivityPageSettings {
  if (!customSettings) return DEFAULT_EXCLUSIVITY_SETTINGS;
  return {
    ...DEFAULT_EXCLUSIVITY_SETTINGS,
    ...customSettings,
    enabled: customSettings.enabled ?? true,
    plates: customSettings.plates && customSettings.plates.length > 0 ? customSettings.plates : DEFAULT_PLATES,
    curatedProducts: customSettings.curatedProducts && customSettings.curatedProducts.length > 0 ? customSettings.curatedProducts : DEFAULT_EXCLUSIVITY_BAGS
  };
}
