import { Router } from 'express';
import { db, isTestProduct } from '../db.ts';
import { pool, nativePool } from '../mysqlPool.ts';
import { dropiBackupService } from '../services/dropiBackupService.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';

const router = Router();

// 🛡️ FUNCIÓN BLINDADA PARA NÚMEROS EN COP (PESOS COLOMBIANOS) 🛡️
// Elimina símbolos $, puntos de miles, espacios y letras, dejando el número entero real.
// Ej: "$ 114.997" -> 114997
export function parseNumCOP(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  // Extrae SOLO los dígitos numéricos (0-9) y el signo negativo si lo hay.
  // Esto elimina mágicamente el '$', los espacios y los '.' de los miles.
  const cleaned = String(val).replace(/[^\d-]/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

export function mapSqlRowToProduct(row: any): any {
  let images: string[] = [];
  if (typeof row.imagenes === 'string' && row.imagenes.trim()) {
    try { images = JSON.parse(row.imagenes); } catch { images = [row.imagenes]; }
  } else if (row.imagen) { images = [row.imagen]; }
  
  let variants: any[] = [];
  if (typeof row.variants === 'string' && row.variants.trim()) {
    try { variants = JSON.parse(row.variants); } catch { variants = []; }
  } else if (typeof row.variantes === 'string' && row.variantes.trim()) {
    try { variants = JSON.parse(row.variantes); } catch { variants = []; }
  }

  // EXTRACCIÓN BLINDADA DIRECTA DE LA BASE DE DATOS
  let rawShipping = row.shipping_cost ?? row.flete_envio ?? row.flete ?? row.estimatedShippingCost;
  let parsedShipping = parseNumCOP(rawShipping);
  
  let rawFee = row.dropi_fee ?? row.dropiFee;
  let parsedDropiFee = parseNumCOP(rawFee);
  const dropiCode = row.dropi_product_id || row.dropiProductId || '';

  return {
    id: String(row.id),
    title: row.nombre || row.title || 'Producto Zavela',
    slug: row.slug || String(row.id),
    price: parseNumCOP(row.precio || row.price),
    costPrice: parseNumCOP(row.supplier_cost),
    compareAtPrice: parseNumCOP(row.suggested_price),
    shippingCost: parsedShipping,
    shipping_cost: parsedShipping,
    flete_envio: parsedShipping,
    flete: parsedShipping,
    estimatedShippingCost: parsedShipping,
    dropiFee: parsedDropiFee,
    dropi_fee: parsedDropiFee,
    stock: parseNumCOP(row.stock),
    description: row.descripcion || '',
    categoryId: row.category_id || 'cat-general',
    categoryName: row.categoria || 'General',
    dropiProductId: dropiCode,
    dropi_product_id: dropiCode,
    provider: row.provider || (dropiCode ? 'dropi' : 'derocha'),
    supplier: row.supplier || (row.provider === 'dropi' ? 'Dropi Colombia' : 'DeRocha'),
    supplierSku: row.supplier_sku || '',
    image: images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    variants: variants,
    active: row.active === 1,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

router.get('/', async (req, res) => {
  try {
    let products: any[] = [];
    if (nativePool) {
      try {
        const [rows]: any = await pool.query('SELECT * FROM productos ORDER BY created_at DESC');
        if (Array.isArray(rows)) products = rows.map(mapSqlRowToProduct).filter(p => !isTestProduct(p));
      } catch (e) {
        console.error("Error GET MySQL:", e);
      }
    }
    res.json({ success: true, count: products.length, data: products });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

const handleProductUpsert = async (req: any, res: any) => {
  try {
    const b = req.body;
    const targetId = req.params?.id || req.query?.id || b.id || `prod-${Date.now()}`;
    const activeInt = (b.active === false || b.activo === false) ? 0 : 1;
    
    // EXTRACCIÓN BLINDADA DE FLETE Y COMISIÓN (Soporta múltiples variables y limpia formatos)
    const shipping = parseNumCOP(b.shipping_cost ?? b.flete_envio ?? b.fleteEnvio ?? b.flete ?? b.shippingCost ?? b.estimatedShippingCost ?? b.shipping ?? 0);
    const dropiFee = parseNumCOP(b.dropi_fee ?? b.dropiFee ?? b.comisionDropi ?? b.comision ?? b.fee ?? 0);
    
    const dropiCode = String(b.dropi_product_id || b.dropiProductId || '').trim();
    const provider = String(b.provider || (dropiCode ? 'dropi' : 'derocha')).trim();
    const supplier = b.supplier || (provider === 'dropi' ? 'Dropi Colombia' : (provider === 'derocha' ? 'DeRocha' : 'Bodega Propia'));
    
    let variantsStr = '[]';
    if (b.variants) variantsStr = typeof b.variants === 'string' ? b.variants : JSON.stringify(b.variants);
    else if (b.variantes) variantsStr = typeof b.variantes === 'string' ? b.variantes : JSON.stringify(b.variantes);

    let imagesStr = '[]';
    if (b.images) imagesStr = typeof b.images === 'string' ? b.images : JSON.stringify(b.images);
    else if (b.imagenes) imagesStr = typeof b.imagenes === 'string' ? b.imagenes : JSON.stringify(b.imagenes);

    const title = b.nombre || b.title || b.name || '';
    const price = parseNumCOP(b.precio ?? b.price ?? 0);
    const cost = parseNumCOP(b.costo ?? b.costoProveedor ?? b.costPrice ?? b.supplier_cost ?? 0);
    const comparePrice = parseNumCOP(b.compare_price ?? b.compareAtPrice ?? b.suggested_price ?? 0);
    const stock = parseNumCOP(b.stock ?? b.inventario ?? 0);
    const description = b.descripcion || b.description || '';
    const categoryName = b.categoria || b.categoryName || 'General';
    const categoryId = b.category_id || b.categoryId || 'cat-general';
    const image = b.imagen || b.image || '';

    await pool.query(`
      INSERT INTO productos (
        id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, categoria, category_id,
        dropi_product_id, provider, supplier, supplier_sku, shipping_cost, flete_envio, flete, dropi_fee,
        imagen, imagenes, variants, variantes, active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        nombre=VALUES(nombre), precio=VALUES(precio), supplier_cost=VALUES(supplier_cost), suggested_price=VALUES(suggested_price), 
        stock=VALUES(stock), descripcion=VALUES(descripcion), categoria=VALUES(categoria), category_id=VALUES(category_id), 
        dropi_product_id=VALUES(dropi_product_id), provider=VALUES(provider), supplier=VALUES(supplier), supplier_sku=VALUES(supplier_sku), 
        shipping_cost=VALUES(shipping_cost), flete_envio=VALUES(flete_envio), flete=VALUES(flete), dropi_fee=VALUES(dropi_fee), 
        imagen=VALUES(imagen), imagenes=VALUES(imagenes), variants=VALUES(variants), variantes=VALUES(variantes), active=VALUES(active), updated_at=NOW()
    `, [
      targetId, title, price, cost, comparePrice, 
      stock, description, categoryName, categoryId, 
      dropiCode || null, provider, supplier, b.supplierSku || b.supplier_sku || '', 
      shipping, shipping, shipping, dropiFee, image, imagesStr, variantsStr, variantsStr, activeInt
    ]);

    const savedProduct = {
      ...b,
      id: targetId,
      provider,
      supplier,
      dropiProductId: dropiCode,
      dropi_product_id: dropiCode,
      shippingCost: shipping,
      shipping_cost: shipping,
      flete_envio: shipping,
      flete: shipping,
      estimatedShippingCost: shipping,
      dropiFee,
      dropi_fee: dropiFee
    };

    res.status(200).json({ success: true, message: 'Producto guardado en MySQL', data: savedProduct });
  } catch (error: any) { 
    console.error('Error guardando producto en MySQL:', error);
    res.status(500).json({ success: false, error: error.message }); 
  }
};

router.post('/', handleProductUpsert);
router.put('/', handleProductUpsert);
router.put('/:id', handleProductUpsert);

router.delete('/:id?', async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    await pool.query('DELETE FROM productos WHERE id = ?', [id]);
    res.json({ success: true, message: `Eliminado` });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

router.post('/bulk-import', async (req, res) => {
  try {
    for (const item of req.body.products) {
      const id = item.id || `prod-${Date.now()}`;
      const shipping = parseNumCOP(item.shippingCost ?? item.flete ?? item.shipping_cost ?? item.flete_envio ?? 0);
      const dropiFee = parseNumCOP(item.dropiFee ?? item.dropi_fee ?? item.comisionDropi ?? 0);
      
      await pool.query(`
        INSERT INTO productos (
          id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, dropi_product_id, provider, supplier, shipping_cost, flete_envio, flete, dropi_fee, imagen, imagenes, active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dropi', 'Dropi Colombia', ?, ?, ?, ?, ?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE
          nombre=VALUES(nombre), precio=VALUES(precio), supplier_cost=VALUES(supplier_cost), suggested_price=VALUES(suggested_price), stock=VALUES(stock), dropi_product_id=VALUES(dropi_product_id), shipping_cost=VALUES(shipping_cost), flete_envio=VALUES(flete_envio), flete=VALUES(flete), dropi_fee=VALUES(dropi_fee), imagen=VALUES(imagen), imagenes=VALUES(imagenes), updated_at=NOW()
      `, [id, item.name||'', parseNumCOP(item.price), parseNumCOP(item.cost_price), parseNumCOP(item.suggested_price), parseNumCOP(item.stock), item.description||'', item.dropi_product_id||null, shipping, shipping, shipping, dropiFee, item.images?.[0]||'', JSON.stringify(item.images||[])]);
    }
    res.status(201).json({ success: true, message: 'Importación exitosa' });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// ==============================================================================
// 🤖 Endpoint de Consulta para Bots de WhatsApp (WAI / ManyChat / Kommo)
// ==============================================================================
export async function searchProductForBot(query: string): Promise<any> {
  const cleanQuery = (query || '').trim();
  const baseUrl = 'https://zavelastore.com.co';

  if (!cleanQuery) {
    return {
      encontrado: false,
      error: 'Parámetro de búsqueda requerido.',
      instruccion: 'Envía el parámetro por GET (?producto=nombre) o POST JSON {"producto": "nombre"}',
      nombre: '',
      precio: 0,
      precio_formateado: '$0 COP',
      estado: 'no_especificado',
      disponible: false,
      stock: 0,
      url: `${baseUrl}/catalogo`,
      url_compra: `${baseUrl}/catalogo`,
      imagen: `${baseUrl}/images/logo-zavela.jpg`,
      mensaje: 'Por favor indícanos el nombre del producto que deseas consultar para darte el precio oficial y enlace directo.',
      tienda: 'Zavela Store Colombia'
    };
  }

  let matchedProduct: any = null;

  // 1. Intentar consulta en MySQL
  if (nativePool) {
    try {
      // 1.1 Coincidencia exacta por ID o Slug
      const [exactRows]: any = await pool.query(
        `SELECT * FROM productos 
         WHERE (id = ? OR slug = ? OR dropi_product_id = ?) 
           AND active = 1 
           AND LOWER(nombre) NOT LIKE '%asesor%' 
           AND LOWER(nombre) NOT LIKE '%admin%' 
           AND LOWER(nombre) NOT LIKE '%prueba%' 
         LIMIT 1`,
        [cleanQuery, cleanQuery, cleanQuery]
      );

      if (Array.isArray(exactRows) && exactRows.length > 0) {
        matchedProduct = mapSqlRowToProduct(exactRows[0]);
      } else {
        // 1.2 Búsqueda por palabras clave
        const words = cleanQuery.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
        const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'para', 'y', 'en', 'con', 'por', 'a', 'al', 'que', 'me', 'interesa', 'quiero', 'precio', 'costo', 'tienen', 'venden', 'comprar']);
        const keywords = words.filter(w => !stopWords.has(w));

        if (keywords.length > 0) {
          const conditions = keywords.map(() => '(LOWER(nombre) LIKE ? OR LOWER(descripcion) LIKE ?)').join(' AND ');
          const params: string[] = [];
          for (const kw of keywords) {
            params.push(`%${kw}%`, `%${kw}%`);
          }

          const [keywordRows]: any = await pool.query(
            `SELECT *, 
                    (CASE WHEN LOWER(nombre) LIKE ? THEN 10 ELSE 0 END + CASE WHEN stock > 0 THEN 5 ELSE 0 END) AS score
             FROM productos
             WHERE ${conditions}
               AND active = 1
               AND LOWER(nombre) NOT LIKE '%asesor%'
               AND LOWER(nombre) NOT LIKE '%admin%'
               AND LOWER(nombre) NOT LIKE '%prueba%'
               AND LOWER(nombre) NOT LIKE '%dummy%'
             ORDER BY score DESC, stock DESC, created_at DESC
             LIMIT 1`,
            [`%${cleanQuery.toLowerCase()}%`, ...params]
          );

          if (Array.isArray(keywordRows) && keywordRows.length > 0) {
            matchedProduct = mapSqlRowToProduct(keywordRows[0]);
          }
        }

        // 1.3 Coincidencia general parcial
        if (!matchedProduct) {
          const [likeRows]: any = await pool.query(
            `SELECT * FROM productos
             WHERE (LOWER(nombre) LIKE ? OR LOWER(categoria) LIKE ?)
               AND active = 1
               AND LOWER(nombre) NOT LIKE '%asesor%'
               AND LOWER(nombre) NOT LIKE '%admin%'
             ORDER BY stock DESC, created_at DESC
             LIMIT 1`,
            [`%${cleanQuery.toLowerCase()}%`, `%${cleanQuery.toLowerCase()}%`]
          );
          if (Array.isArray(likeRows) && likeRows.length > 0) {
            matchedProduct = mapSqlRowToProduct(likeRows[0]);
          }
        }
      }
    } catch (e: any) {
      console.warn('[Bot Search MySQL Warning]:', e?.message);
    }
  }

  // 2. Fallback a la base de datos local
  if (!matchedProduct) {
    const allProducts = db.getProducts({ onlyActive: true }).filter(p => !isTestProduct(p));
    matchedProduct = allProducts.find(p => p.id === cleanQuery || p.slug === cleanQuery || p.dropiProductId === cleanQuery);

    if (!matchedProduct) {
      const qLower = cleanQuery.toLowerCase();
      matchedProduct = allProducts.find(p => (p.title || '').toLowerCase().includes(qLower));
    }

    if (!matchedProduct) {
      const words = cleanQuery.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
      if (words.length > 0) {
        matchedProduct = allProducts.find(p => {
          const t = (p.title || '').toLowerCase();
          return words.every(w => t.includes(w));
        });
      }
    }
  }

  // 3. Respuesta JSON estricta
  if (matchedProduct) {
    const id = String(matchedProduct.id);
    const nombre = matchedProduct.title || 'Producto Zavela';
    const precio = Number(matchedProduct.price || 0);
    const stock = Number(matchedProduct.stock ?? 1);
    const disponible = stock > 0 && matchedProduct.active !== false;
    const estado = disponible ? 'disponible' : 'agotado';
    const precioFormateado = `$${precio.toLocaleString('es-CO')} COP`;
    const url = `${baseUrl}/producto/${id}`;
    const imagen = matchedProduct.image || `${baseUrl}/images/logo-zavela.jpg`;

    const rawDesc = String(matchedProduct.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const descripcion = rawDesc.length > 160 ? rawDesc.slice(0, 157) + '...' : rawDesc;

    const mensaje = `✅ *${nombre}*\n\n` +
                    `💰 *Precio oficial:* ${precioFormateado}\n` +
                    `📦 *Estado:* ${disponible ? 'Disponible para despacho inmediato' : 'Temporalmente agotado'}\n` +
                    `🚚 *Envío:* Gratis a nivel nacional con Pago Contra Entrega (pagas en efectivo al recibir)\n\n` +
                    `👉 *Haz tu pedido o consulta fotos aquí:*\n${url}`;

    return {
      encontrado: true,
      id,
      nombre,
      precio,
      precio_formateado: precioFormateado,
      estado,
      disponible,
      stock,
      url,
      url_compra: url,
      categoria: matchedProduct.categoryName || 'General',
      descripcion,
      imagen,
      mensaje,
      metodos_pago: 'Pago Contra Entrega en efectivo, ePayco, Tarjeta',
      garantia: 'Garantía directa de tienda Zavela Store Colombia'
    };
  }

  return {
    encontrado: false,
    termino_buscado: cleanQuery,
    id: '',
    nombre: '',
    precio: 0,
    precio_formateado: '$0 COP',
    estado: 'agotado',
    disponible: false,
    stock: 0,
    url: `${baseUrl}/catalogo`,
    url_compra: `${baseUrl}/catalogo`,
    imagen: `${baseUrl}/images/logo-zavela.jpg`,
    mensaje: `No encontramos un producto exacto con el nombre "${cleanQuery}" en nuestra base de datos oficial.\n\n👉 Puedes explorar nuestro catálogo completo con precios actualizados y pago contra entrega aquí:\n${baseUrl}/catalogo`,
    sugerencia: `Visita ${baseUrl}/catalogo para ver todos los artículos disponibles`
  };
}

router.all(['/bot-search', '/search-bot', '/consulta-bot'], async (req, res) => {
  const query = (req.query.producto || req.query.q || req.query.nombre || req.query.search || req.query.query ||
                 req.body?.producto || req.body?.q || req.body?.nombre || req.body?.query || req.body?.message || req.body?.text || '') as string;
  const result = await searchProductForBot(query);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(result);
});

export default router;
