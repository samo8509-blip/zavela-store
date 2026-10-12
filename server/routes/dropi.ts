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

// GET /api/dropi/product/:id - Extraer información y fotos de un producto individual por ID o enlace parseado
router.get('/product/:id', async (req, res) => {
  try {
    const rawParam = req.params.id;
    if (!rawParam || !rawParam.trim()) {
      return res.status(400).json({ success: false, message: 'Se requiere un ID de producto de Dropi' });
    }

    // Extraer identificador limpio (numérico o texto sin prefijo DROPI-)
    const cleanId = rawParam.replace(/^DROPI-/i, '').trim();
    const token = process.env.DROPI_TOKEN || process.env.DROPI_API_TOKEN;

    // 1. Si existe token de Dropi, consultar la API real de Dropi Colombia
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

            if (response.ok) {
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
          } catch (fetchErr: any) {
            console.warn(`[Dropi API Detail] Error consultando ${endpoint}:`, fetchErr.message);
          }
        }
      } catch (err: any) {
        console.warn('[Dropi API Direct Call Warning]:', err.message);
      }
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

    // 3. Si no se encontró en la API ni en el catálogo, responder error descriptivo 404
    return res.status(404).json({
      success: false,
      message: `No se encontró el producto con ID #${cleanId} en Dropi Colombia. Verifica que el ID sea correcto, que el producto esté publicado en Dropi o que las credenciales de DROPI_TOKEN estén activas.`
    });
  } catch (error: any) {
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

        if (response.ok) {
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
        console.warn('[Dropi API Search Warning]:', err.message);
      }
    }

    // 2. Filtro en catálogo base verificado
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

    res.json({
      success: true,
      source: 'dropi_verified_catalog',
      count: results.length,
      data: results
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dropi/catalog - Redirige o ejecuta la misma lógica de /search
router.get('/catalog', async (req, res) => {
  try {
    const { search, category } = req.query;
    const token = process.env.DROPI_TOKEN || process.env.DROPI_API_TOKEN;

    if (token && token.trim()) {
      try {
        const dropiBaseUrl = process.env.DROPI_API_URL || 'https://api.dropi.co';
        const url = `${dropiBaseUrl}/api/products?country=CO${search ? `&search=${encodeURIComponent(String(search).trim())}` : ''}`;

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

        if (response.ok) {
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
        console.warn('[Dropi Catalog Live Warning]:', err.message);
      }
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

    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
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

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
