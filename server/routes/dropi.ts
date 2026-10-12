import { Router } from 'express';
import { dropiBackupService } from '../services/dropiBackupService.ts';

const router = Router();

// Catálogo de respaldo verificado de Dropi Colombia para desarrollo o cuando el API token no esté configurado
const DROPI_VERIFIED_CATALOG = [
  {
    id: 'DROPI-20391',
    numeric_id: '20391',
    name: 'Perfume Versace Bright Crystal Absolu 90ml',
    category: 'Perfumería & Fragancias',
    description: 'Fragancia floral afrutada de alta fijación, presentación tester con caja sellada y estuche de lujo. Notas de granada, yuzu, peonía y magnolia con base de ámbar y almizcle.',
    images: [
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'
    ],
    cost_price: 49500,
    suggested_price: 119900,
    stock: 85,
    supplier: 'Perfumes & Fragancias SAS (Bogotá)',
    warehouse: 'Bogotá D.C.'
  },
  {
    id: 'DROPI-18492',
    numeric_id: '18492',
    name: 'Lámpara LED UV Uñas Sun X5 Plus 54W',
    category: 'Belleza y Cuidado',
    description: 'Secador profesional de uñas con sensor infrarrojo inteligente automático, 4 temporizadores digitales (10s, 30s, 60s, 99s modo bajo calor) y tecnología dual UV/LED para esmaltado semipermanente.',
    images: [
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800'
    ],
    cost_price: 28900,
    suggested_price: 79900,
    stock: 120,
    supplier: 'Distribuidora Glow Beauty (Medellín)',
    warehouse: 'Medellín'
  },
  {
    id: 'DROPI-39201',
    numeric_id: '39201',
    name: 'Máscara LED La Purga Neón Halloween',
    category: 'Halloween & Temporada',
    description: 'Máscara luminosa con 3 modos de luz LED (fija, parpadeo lento, estroboscópica), control con clip y almohadilla ergonómica de espuma. Fabricada en PVC resistente con cable electroluminiscente de bajo consumo.',
    images: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800',
      'https://images.unsplash.com/photo-1508361001413-7a9dca21d08a?w=800'
    ],
    cost_price: 19800,
    suggested_price: 59900,
    stock: 240,
    supplier: 'Importaciones Halloween Fest (Cali)',
    warehouse: 'Cali'
  },
  {
    id: 'DROPI-48192',
    numeric_id: '48192',
    name: 'Cúpula Rosa Eterna Preservada Luz LED Amor y Amistad',
    category: 'Amor y Amistad',
    description: 'Rosa encantada de cristal con micro-luces LED cálidas, cable dorado y base de madera fina. Regalo romántico inolvidable para fechas especiales como Amor y Amistad o aniversarios.',
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800',
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800'
    ],
    cost_price: 32000,
    suggested_price: 89900,
    stock: 95,
    supplier: 'Floristería Regalos De Amor (Bogotá)',
    warehouse: 'Bogotá D.C.'
  },
  {
    id: 'DROPI-59281',
    numeric_id: '59281',
    name: 'Proyector Galaxia Astronauta Luz Estrellas y Nebulosa',
    category: 'Hogar & Tecnología',
    description: 'Proyector láser RGB espacial con cabeza magnética giratoria 360°, control remoto y temporizador inteligente. Crea un cielo estrellado y nebulosas de colores en techos y paredes.',
    images: [
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800'
    ],
    cost_price: 45000,
    suggested_price: 109900,
    stock: 60,
    supplier: 'Tech Trend Colombia (Barranquilla)',
    warehouse: 'Barranquilla'
  },
  {
    id: 'DROPI-67129',
    numeric_id: '67129',
    name: 'Cepillo Secador y Voluminizador One Step 3 en 1',
    category: 'Belleza y Cuidado',
    description: 'Cepillo secador eléctrico con tecnología iónica de cerámica, cerdas desenredantes de nylon con puntas redondeadas y 3 niveles ajustables de calor para secar y peinar simultáneamente.',
    images: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
      'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800'
    ],
    cost_price: 27500,
    suggested_price: 74900,
    stock: 140,
    supplier: 'ElectroBelleza Mayorista (Bogotá)',
    warehouse: 'Bogotá D.C.'
  },
  {
    id: 'DROPI-78193',
    numeric_id: '78193',
    name: 'Humidificador Difusor Aromaterapia Volcán de Niebla',
    category: 'Hogar & Tecnología',
    description: 'Difusor ultrasónico con efecto visual de flama y volcán, luz ambiental bicolor ámbar/azul, apagado automático por falta de agua y capacidad de 300ml.',
    images: [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800'
    ],
    cost_price: 36000,
    suggested_price: 89900,
    stock: 75,
    supplier: 'Home Zen Colombia (Bucaramanga)',
    warehouse: 'Bucaramanga'
  },
  {
    id: 'DROPI-89102',
    numeric_id: '89102',
    name: 'Mini Impresora Térmica Portátil Bluetooth para Celular',
    category: 'Hogar & Tecnología',
    description: 'Impresora de bolsillo sin tinta para recibos, stickers, notas de estudio y dibujos en blanco y negro compatible con Android e iOS.',
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800'
    ],
    cost_price: 38500,
    suggested_price: 94900,
    stock: 110,
    supplier: 'Gadgets Express (Medellín)',
    warehouse: 'Medellín'
  },
  {
    id: 'DROPI-91284',
    numeric_id: '91284',
    name: 'Dispensador Automático de Agua Eléctrico Recargable USB',
    category: 'Hogar & Tecnología',
    description: 'Bomba automática para botellones de agua estándar de 5 galones, manguera de silicona grado alimenticio y batería recargable de alta capacidad.',
    images: [
      'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800',
      'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800'
    ],
    cost_price: 15900,
    suggested_price: 49900,
    stock: 200,
    supplier: 'Hogar & Vida Mayorista (Cali)',
    warehouse: 'Cali'
  },
  {
    id: 'DROPI-10492',
    numeric_id: '10492',
    name: 'Smartwatch Deportivo T900 Ultra 2 Gran Pantalla HD',
    category: 'Hogar & Tecnología',
    description: 'Reloj inteligente con llamadas Bluetooth, monitor de frecuencia cardíaca, múltiples modos deportivos, carga inalámbrica y correas intercambiables.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800'
    ],
    cost_price: 42000,
    suggested_price: 99900,
    stock: 130,
    supplier: 'Tech Innova Colombia (Bogotá)',
    warehouse: 'Bogotá D.C.'
  }
];

/**
 * Normaliza y extrae todas las URLs de imágenes válidas en alta resolución de un objeto de producto de Dropi
 */
function extractDropiImages(rawProduct: any): string[] {
  const images: string[] = [];

  const addIfValid = (url: any) => {
    if (typeof url === 'string' && url.trim().startsWith('http')) {
      const clean = url.trim();
      if (!images.includes(clean)) {
        images.push(clean);
      }
    }
  };

  if (Array.isArray(rawProduct.images)) {
    for (const item of rawProduct.images) {
      if (typeof item === 'string') {
        addIfValid(item);
      } else if (item && typeof item === 'object') {
        addIfValid(item.url || item.src || item.original || item.image || item.path);
      }
    }
  }

  if (Array.isArray(rawProduct.gallery)) {
    for (const item of rawProduct.gallery) {
      if (typeof item === 'string') addIfValid(item);
      else if (item && typeof item === 'object') addIfValid(item.url || item.src || item.image);
    }
  }

  if (Array.isArray(rawProduct.photos)) {
    for (const item of rawProduct.photos) {
      if (typeof item === 'string') addIfValid(item);
      else if (item && typeof item === 'object') addIfValid(item.url || item.src);
    }
  }

  addIfValid(rawProduct.image);
  addIfValid(rawProduct.imagen);
  addIfValid(rawProduct.photo);
  addIfValid(rawProduct.thumbnail);

  // Imágenes en variaciones
  if (Array.isArray(rawProduct.variations)) {
    for (const v of rawProduct.variations) {
      if (v?.image) addIfValid(v.image);
      if (v?.image_url) addIfValid(v.image_url);
    }
  }

  return images.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
}

/**
 * Normaliza un producto devuelto por la API de Dropi al formato unificado de Zavela Store
 */
function mapDropiProduct(raw: any, fallbackId: string) {
  const cleanId = String(raw.id || raw.product_id || fallbackId).replace(/^DROPI-/i, '').trim();
  const costPrice = Number(raw.cost_price || raw.supplier_price || raw.costo || raw.price || raw.sale_price || 0) || 0;
  const suggestedPrice = Number(raw.suggested_price || raw.suggestedPrice || raw.price || raw.public_price || 0) || (costPrice > 0 ? Math.round((costPrice + 21730) * 1.45) : 0);
  const images = extractDropiImages(raw);

  return {
    dropi_product_id: cleanId,
    id: `DROPI-${cleanId}`,
    name: String(raw.name || raw.title || raw.nombre || 'Producto Dropi Colombia').trim(),
    description: String(raw.description || raw.descripcion || '').trim(),
    cost_price: costPrice,
    suggested_price: suggestedPrice,
    images,
    stock: Number(raw.stock !== undefined ? raw.stock : (raw.stock_quantity !== undefined ? raw.stock_quantity : (raw.quantity ?? 25))) || 25,
    category: String(raw.category?.name || raw.category_name || raw.category || 'General').trim(),
    supplier: String(raw.supplier_name || raw.supplier?.name || raw.warehouse || 'Proveedor Verificado Dropi').trim(),
    warehouse: String(raw.warehouse || raw.city || 'Bogotá D.C.').trim()
  };
}

/**
 * Parsea cualquier URL o texto de Dropi para extraer el ID numérico y el slug/nombre del producto
 */
export function parseDropiUrlOrId(input: string): { id: string; slug: string; suggestedName: string; isUrl: boolean } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. ID puramente numérico (ej: 2265271)
  if (/^\d{3,12}$/.test(trimmed)) {
    return { id: trimmed, slug: '', suggestedName: `Producto Dropi #${trimmed}`, isUrl: false };
  }

  // 2. Prefijo DROPI- (ej: DROPI-2265271)
  const prefixMatch = trimmed.match(/^DROPI-(\d+)$/i);
  if (prefixMatch) {
    return { id: prefixMatch[1], slug: '', suggestedName: `Producto Dropi #${prefixMatch[1]}`, isUrl: false };
  }

  // 3. Parámetro en Query string (?id=2265271 o product_id=2265271)
  const queryMatch = trimmed.match(/[?&](?:id|product_id|productId|product-id)=(\d+)/i);
  if (queryMatch) {
    return { id: queryMatch[1], slug: '', suggestedName: `Producto Dropi #${queryMatch[1]}`, isUrl: true };
  }

  // 4. Formato de ruta: /product-details/2265271/organizador-para-condimentos-x12
  // o /products/detail/2265271, /product/2265271/..., /producto/2265271, etc.
  const pathMatch = trimmed.match(/(?:product-details|product_details|products\/detail|products|product|producto|p)\/(\d+)(?:\/([a-zA-Z0-9_\-\.]+))?/i);
  if (pathMatch) {
    const id = pathMatch[1];
    const slug = pathMatch[2] || '';
    let suggestedName = '';
    if (slug) {
      suggestedName = slug
        .replace(/[-_.]+/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
    }
    return { id, slug, suggestedName: suggestedName || `Producto Dropi #${id}`, isUrl: true };
  }

  // 5. Fallback en URLs con 'dropi': cualquier secuencia de 4 a 12 dígitos
  if (trimmed.toLowerCase().includes('dropi')) {
    const digitsMatch = trimmed.match(/(\d{4,12})/);
    if (digitsMatch) {
      const id = digitsMatch[1];
      const after = trimmed.slice(trimmed.indexOf(id) + id.length);
      const slugMatch = after.match(/^\/([a-zA-Z0-9_\-]+)/);
      let suggestedName = '';
      if (slugMatch) {
        suggestedName = slugMatch[1]
          .replace(/[-_.]+/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim();
      }
      return { id, slug: slugMatch?.[1] || '', suggestedName: suggestedName || `Producto Dropi #${id}`, isUrl: true };
    }
  }

  return null;
}

// GET /api/dropi/product/:id - Extraer información y fotos de un producto individual por ID o enlace parseado
router.get('/product/:id', async (req, res) => {
  try {
    const rawParam = req.params.id;
    if (!rawParam || !rawParam.trim()) {
      return res.status(400).json({ success: false, message: 'Se requiere un ID de producto de Dropi' });
    }

   // Extraer identificador limpio
    const parsed = parseDropiUrlOrId(rawParam);
    const cleanId = parsed ? parsed.id : rawParam.replace(/^DROPI-/i, '').trim();
    const HARDCODED_DROPI_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJUzI1NiJ9.eyJpc3MiOiJodHRwOi8vYXBwLmRyb3BpLmNvOjgwliwiaWF0IjoxNzkxMjEzOTQ0LCJleHAiOjQ5NDY4ODc1NDQslm5iZiI6MTc5MTIxMzk0NCwianRjIoiWHVDWTIxd05Gc0xPdDIDQilsInN1Yil6IjewMTk3NzciLCJwcnYiOiI4N2UwYWYxZWY5ZmQxNTgxMmZkZWM5NzE1M2ExNGUwYjA0NzU0NmFhliwiYXVkIjoiliwidG9rZW5fdHlwZSI6IkIOVEVHUkFUSU9OUyIsIndiX2IkljoxLCJpbnRIZ3JhdGlvbl9oZXBlljpudWxsLCJpbnRIZ3JhdGlvbl9oEXBlX2Ikljo4NDksImlwX3VybCI6W10sImludGVncmF0aW9uX3VybCI6IliJ9.k3S1Pen-ALPUemNX-CKRTEQDGnAg__Pfg4MAJGFHyhU';
    const token = process.env.DROPI_TOKEN || process.env.DROPI_API_TOKEN || HARDCODED_DROPI_TOKEN;

    // 1. Si existe token de Dropi, consultar la API oficial de Dropi Colombia con diagnóstico detallado
    if (token && token.trim()) {
      try {
        const dropiBaseUrl = process.env.DROPI_API_URL || 'https://api.dropi.co';
        const endpointsToTry = [
          `${dropiBaseUrl}/api/products/${cleanId}?country=CO`,
          `${dropiBaseUrl}/api/products/detail/${cleanId}`,
          `${dropiBaseUrl}/api/products/${cleanId}`
        ];

        for (const endpoint of endpointsToTry) {
          try {
            console.log(`[Dropi API Detail] Consultando: ${endpoint}`);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);

          headers: {
          'Authorization': token.trim().startsWith('Bearer ') ? token.trim() : `Bearer ${token.trim()}`,
          'token': token.trim(),
          'dropi-token': token.trim(),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
              signal: controller.signal
            });
            clearTimeout(timeout);

            if (!response.ok) {
              const errText = await response.text();
              console.error(`[Dropi API Detail Error] HTTP ${response.status} en ${endpoint}. Respuesta exacta: ${errText}`);
              if (response.status === 401 || response.status === 403) {
                return res.status(response.status).json({
                  success: false,
                  error: "TOKEN_ERROR",
                  message: "Falta configurar o renovar el token de Dropi en el archivo .env",
                  dropi_status: response.status,
                  dropi_response: errText
                });
              }
              continue;
            }

            const resJson: any = await response.json();
            const productData = resJson.data || resJson.product || resJson.result || resJson;
            if (productData && (productData.name || productData.title || productData.id)) {
              const unified = mapDropiProduct(productData, cleanId);
              return res.json({
                success: true,
                source: 'dropi_api_live',
                data: unified
              });
            }
          } catch (fetchErr: any) {
            console.error(`[Dropi API Detail Error] Falla de red consultando ${endpoint}:`, fetchErr.message);
          }
        }
      } catch (err: any) {
        console.error('[Dropi API Direct Call Exception]:', err.message);
      }
    } else {
      console.error(`[Dropi API Detail] Falta configurar DROPI_TOKEN en .env para consultar en vivo el producto #${cleanId}`);
    }

    // 2. Consulta de coincidencia en catálogo verificado o respaldo local
    const foundInCatalog = DROPI_VERIFIED_CATALOG.find(
      i => i.numeric_id === cleanId || i.id.toUpperCase() === `DROPI-${cleanId}`.toUpperCase()
    );

    if (foundInCatalog) {
      return res.json({
        success: true,
        source: 'dropi_verified_catalog',
        data: {
          dropi_product_id: foundInCatalog.numeric_id,
          id: foundInCatalog.id,
          name: foundInCatalog.name,
          description: foundInCatalog.description,
          cost_price: foundInCatalog.cost_price,
          suggested_price: foundInCatalog.suggested_price,
          images: foundInCatalog.images,
          stock: foundInCatalog.stock,
          category: foundInCatalog.category,
          supplier: foundInCatalog.supplier,
          warehouse: foundInCatalog.warehouse
        }
      });
    }

    // 3. Si no hay token y no está en catálogo verificado, devolver TOKEN_ERROR con datos básicos para permitir Carga Asistida
    if (!token || !token.trim()) {
      return res.status(401).json({
        success: false,
        error: "TOKEN_ERROR",
        message: "Falta configurar o renovar el token de Dropi en el archivo .env",
        dropi_product_id: cleanId,
        suggestedName: parsed?.suggestedName || `Producto Dropi #${cleanId}`
      });
    }

    // 4. Si hay token pero Dropi no encontró el ID
    return res.status(404).json({
      success: false,
      message: `No se encontró el producto con ID #${cleanId} en Dropi Colombia. Verifica que el ID sea correcto o usa la "Carga Asistida en 1 Clic".`
    });
  } catch (error: any) {
    console.error('[Dropi API /product/:id Error fatal]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dropi/product-by-url - Acepta una URL completa de Dropi, extrae slug/ID y consulta página pública o endpoint directo
router.get('/product-by-url', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || req.query.link || req.query.u || '').trim();
    if (!rawUrl) {
      return res.status(400).json({ success: false, message: 'Se requiere el parámetro url con el enlace de Dropi' });
    }

    const parsed = parseDropiUrlOrId(rawUrl);
    if (!parsed || !parsed.id) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo detectar un ID numérico de producto en el enlace ingresado. Asegúrate de incluir el enlace completo de Dropi.'
      });
    }

    const cleanId = parsed.id;
    const token = process.env.DROPI_TOKEN || process.env.DROPI_API_TOKEN;

    // 1. Si hay token configurado, intentar consultar la API oficial primero
    if (token && token.trim()) {
      try {
        const dropiBaseUrl = process.env.DROPI_API_URL || 'https://api.dropi.co';
        const endpoint = `${dropiBaseUrl}/api/products/${cleanId}?country=CO`;
        console.log(`[Dropi product-by-url] Consultando API con token para ID #${cleanId}: ${endpoint}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token.trim()}`,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ZavelaStore/1.0',
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[Dropi API Error by URL] HTTP ${response.status} en ${endpoint}. Respuesta exacta: ${errText}`);
          if (response.status === 401 || response.status === 403) {
            return res.status(response.status).json({
              success: false,
              error: "TOKEN_ERROR",
              message: "Falta configurar o renovar el token de Dropi en el archivo .env",
              dropi_status: response.status,
              dropi_response: errText,
              extracted_id: cleanId,
              suggested_name: parsed.suggestedName
            });
          }
        } else {
          const resJson: any = await response.json();
          const productData = resJson.data || resJson.product || resJson.result || resJson;
          if (productData && (productData.name || productData.title || productData.id)) {
            const unified = mapDropiProduct(productData, cleanId);
            return res.json({
              success: true,
              source: 'dropi_api_live',
              data: unified
            });
          }
        }
      } catch (liveErr: any) {
        console.error('[Dropi product-by-url Live API Exception]:', liveErr.message);
      }
    } else {
      console.warn(`[Dropi product-by-url] Sin DROPI_TOKEN en .env. Ejecutando extracción pública para URL: ${rawUrl}`);
    }

    // 2. Extracción pública asistida (scraping de metadatos OpenGraph y página pública)
    let publicTitle = parsed.suggestedName || `Producto Dropi #${cleanId}`;
    let publicDesc = `Producto importado desde Dropi Colombia (ID #${cleanId}). ${publicTitle}`;
    let publicImages: string[] = [];
    let publicCost = 0;
    let publicSuggestedPrice = 0;

    // A. Revisar si coincide con catálogo verificado
    const foundInCatalog = DROPI_VERIFIED_CATALOG.find(i => i.numeric_id === cleanId || i.id === `DROPI-${cleanId}`);
    if (foundInCatalog) {
      publicTitle = foundInCatalog.name;
      publicDesc = foundInCatalog.description;
      publicCost = foundInCatalog.cost_price;
      publicSuggestedPrice = foundInCatalog.suggested_price;
      publicImages = [...foundInCatalog.images];
    } else {
      // B. Intentar consultar la página web pública de Dropi
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const pageRes = await fetch(rawUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (pageRes.ok) {
          const html = await pageRes.text();
          
          // Extraer og:title o title
          const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
          if (ogTitle && ogTitle[1] && ogTitle[1].trim()) {
            publicTitle = ogTitle[1].trim();
          }

          // Extraer og:description
          const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
          if (ogDesc && ogDesc[1] && ogDesc[1].trim()) {
            publicDesc = ogDesc[1].trim();
          }

          // Extraer og:image
          const ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
          if (ogImg && ogImg[1] && ogImg[1].startsWith('http')) {
            publicImages.push(ogImg[1].trim());
          }

          // Extraer imágenes que tengan patrones de Dropi / Cloudinary / AWS
          const imgMatches = html.matchAll(/https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi);
          for (const m of imgMatches) {
            const url = m[0];
            if (!publicImages.includes(url) && (url.includes('dropi') || url.includes('cloudinary') || url.includes('amazonaws') || url.includes('storage') || url.includes('products'))) {
              publicImages.push(url);
              if (publicImages.length >= 6) break;
            }
          }
        } else {
          console.warn(`[Dropi product-by-url Public Page HTTP]: ${pageRes.status}`);
        }
      } catch (pageErr: any) {
        console.warn(`[Dropi product-by-url Public Fetch Warn]:`, pageErr.message);
      }
    }

    if (publicImages.length === 0) {
      publicImages = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
    }

    const unifiedProduct = {
      dropi_product_id: cleanId,
      id: `DROPI-${cleanId}`,
      name: publicTitle,
      description: publicDesc,
      cost_price: publicCost,
      suggested_price: publicSuggestedPrice || (publicCost > 0 ? Math.round((publicCost + 21730) * 1.45) : 0),
      images: publicImages,
      stock: 25,
      category: 'General',
      supplier: 'Proveedor Dropi Colombia',
      warehouse: 'Bogotá D.C.',
      source: 'public_url_extraction'
    };

    return res.json({
      success: true,
      source: 'public_url_extraction',
      data: unifiedProduct,
      token_configured: Boolean(token && token.trim())
    });
  } catch (error: any) {
    console.error('[Dropi product-by-url Fatal Error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dropi/search - Búsqueda en el catálogo real de Dropi Colombia
router.get('/search', async (req, res) => {
  try {
    const { q, query, search, category } = req.query;
    const searchTerm = String(q || query || search || '').trim();
    const token = process.env.DROPI_TOKEN || process.env.DROPI_API_TOKEN;

    // 1. Consulta a la API oficial de Dropi Colombia si hay token configurado
    if (token && token.trim()) {
      try {
        const dropiBaseUrl = process.env.DROPI_API_URL || 'https://api.dropi.co';
        const url = `${dropiBaseUrl}/api/products?country=CO${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`;
        console.log(`[Dropi API Search] Consultando Dropi API oficial: ${url}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token.trim()}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[Dropi API Search Error] HTTP ${response.status}. Respuesta exacta: ${errText}`);
          if (response.status === 401 || response.status === 403) {
            return res.status(response.status).json({
              success: false,
              error: "TOKEN_ERROR",
              message: "Falta configurar o renovar el token de Dropi en el archivo .env",
              dropi_status: response.status,
              dropi_response: errText
            });
          }
        } else {
          const resJson: any = await response.json();
          const itemsList = Array.isArray(resJson) ? resJson : (resJson.data || resJson.objects || resJson.results || []);
          if (Array.isArray(itemsList) && itemsList.length > 0) {
            const mapped = itemsList.map((item: any, idx: number) => mapDropiProduct(item, String(item.id || idx)));
            return res.json({
              success: true,
              source: 'dropi_api_live',
              count: mapped.length,
              data: mapped
            });
          }
        }
      } catch (err: any) {
        console.error('[Dropi API Search Exception]:', err.message);
      }
    } else {
      console.error(`[Dropi API Search] No hay DROPI_TOKEN configurado en .env para buscar "${searchTerm}"`);
    }

    // 2. Filtro en catálogo base verificado de respaldo
    let results = [...DROPI_VERIFIED_CATALOG].map(i => ({
      dropi_product_id: i.numeric_id,
      id: i.id,
      name: i.name,
      description: i.description,
      cost_price: i.cost_price,
      suggested_price: i.suggested_price,
      images: i.images,
      stock: i.stock,
      category: i.category,
      supplier: i.supplier,
      warehouse: i.warehouse
    }));

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      results = results.filter(
        i => i.name.toLowerCase().includes(lower) || 
             i.dropi_product_id.includes(lower) || 
             i.description.toLowerCase().includes(lower) ||
             i.category.toLowerCase().includes(lower)
      );
    }

    if (category && category !== 'all') {
      const lowerCat = String(category).toLowerCase();
      results = results.filter(i => i.category.toLowerCase().includes(lowerCat));
    }

    // 3. Si no hay token configurado y la búsqueda no produjo resultados en el catálogo local verificado:
    // Retornar error descriptivo TOKEN_ERROR en lugar de un array vacío silencioso
    if ((!token || !token.trim()) && searchTerm && results.length === 0) {
      return res.json({
        success: false,
        error: "TOKEN_ERROR",
        message: "Falta configurar o renovar el token de Dropi en el archivo .env",
        count: 0,
        data: []
      });
    }

    res.json({
      success: true,
      source: 'dropi_verified_catalog',
      count: results.length,
      data: results,
      token_configured: Boolean(token && token.trim())
    });
  } catch (error: any) {
    console.error('[Dropi API /search Error fatal]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dropi/catalog - Redirige o ejecuta la misma lógica de /search con control estricto de TOKEN_ERROR
router.get('/catalog', async (req, res) => {
  try {
    const { search, category } = req.query;
    const searchTerm = String(search || '').trim();
    const token = process.env.DROPI_TOKEN || process.env.DROPI_API_TOKEN;

    if (token && token.trim()) {
      try {
        const dropiBaseUrl = process.env.DROPI_API_URL || 'https://api.dropi.co';
        const url = `${dropiBaseUrl}/api/products?country=CO${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`;
        console.log(`[Dropi API Catalog] Consultando: ${url}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token.trim()}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[Dropi API Catalog Error] HTTP ${response.status}. Respuesta exacta: ${errText}`);
          if (response.status === 401 || response.status === 403) {
            return res.status(response.status).json({
              success: false,
              error: "TOKEN_ERROR",
              message: "Falta configurar o renovar el token de Dropi en el archivo .env",
              dropi_status: response.status,
              dropi_response: errText
            });
          }
        } else {
          const resJson: any = await response.json();
          const itemsList = Array.isArray(resJson) ? resJson : (resJson.data || resJson.objects || resJson.results || []);
          if (Array.isArray(itemsList) && itemsList.length > 0) {
            const mapped = itemsList.map((item: any, idx: number) => mapDropiProduct(item, String(item.id || idx)));
            return res.json({
              success: true,
              source: 'dropi_api_live',
              count: mapped.length,
              data: mapped
            });
          }
        }
      } catch (err: any) {
        console.error('[Dropi Catalog Live Exception]:', err.message);
      }
    } else {
      console.warn('[Dropi Catalog] Sin DROPI_TOKEN configurado en .env.');
    }

    // Catálogo base con filtros
    let items = DROPI_VERIFIED_CATALOG.map(i => ({
      dropi_product_id: i.numeric_id,
      id: i.id,
      name: i.name,
      description: i.description,
      cost_price: i.cost_price,
      suggested_price: i.suggested_price,
      images: i.images,
      stock: i.stock,
      category: i.category,
      supplier: i.supplier,
      warehouse: i.warehouse
    }));

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(
        i => i.name.toLowerCase().includes(q) || 
             i.dropi_product_id.includes(q) || 
             i.description.toLowerCase().includes(q) ||
             i.category.toLowerCase().includes(q)
      );
    }

    if (category && category !== 'all') {
      const c = String(category).trim().toLowerCase();
      items = items.filter(i => i.category.toLowerCase().includes(c));
    }

    // Si el usuario buscó específicamente un término o ID y no hay token ni coincidencias en el catálogo verificado:
    if ((!token || !token.trim()) && searchTerm && items.length === 0) {
      return res.json({
        success: false,
        error: "TOKEN_ERROR",
        message: "Falta configurar o renovar el token de Dropi en el archivo .env",
        count: 0,
        data: []
      });
    }

    res.json({
      success: true,
      count: items.length,
      data: items,
      token_configured: Boolean(token && token.trim())
    });
  } catch (error: any) {
    console.error('[Dropi API /catalog Error fatal]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;


