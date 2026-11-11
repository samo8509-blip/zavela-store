import { FunctionDeclaration, Type } from '@google/genai';
import { db, isTestProduct } from '../db.ts';
import { nativePool } from '../mysqlPool.ts';
import { mapSqlRowToProduct } from '../routes/products.ts';
import { Product } from '../../src/types/index.ts';

const STORE_NAME = 'Zavela Store Colombia';
const STORE_URL = 'https://zavelastore.com.co';

export interface ToolSearchResult {
  found: boolean;
  query: string;
  products: {
    id: string;
    title: string;
    price: number;
    formattedPrice: string;
    url: string;
    image: string;
    category: string;
    available: boolean;
  }[];
  formattedText: string;
}

/**
 * Declaración oficial de la herramienta buscar_productos para la SDK @google/genai
 */
export const buscarProductosToolDeclaration: FunctionDeclaration = {
  name: 'buscar_productos',
  description: 'Busca productos en el catálogo e inventario en tiempo real de Zavela Store Colombia para obtener precios oficiales en COP, disponibilidad, enlace de compra y detalles de Pago Contra Entrega.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Término de búsqueda, nombre del producto o referencia (ej: "luces navideñas solares", "perfume good girl", "reloj", "batería de ollas").'
      }
    },
    required: ['query']
  }
};

/**
 * Formatea un número como pesos colombianos (ej: $74.600 COP)
 */
function formatCOP(amount: number): string {
  return `$${Math.round(amount || 0).toLocaleString('es-CO')} COP`;
}

/**
 * Limpia y normaliza texto para coincidencias
 */
function cleanQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ejecuta la búsqueda de productos en segundo plano consultando MySQL y la base de datos local.
 * Genera SIEMPRE una respuesta en texto natural para el usuario, sin exponer JSON.
 */
export async function executeBuscarProductos(query: string): Promise<ToolSearchResult> {
  const rawQuery = (query || '').trim();
  const normalized = cleanQuery(rawQuery);

  let matchedProducts: Product[] = [];

  // 1. Intentar consulta en MySQL en vivo si el pool está disponible
  if (nativePool) {
    try {
      const words = normalized.split(' ').filter(w => w.length >= 2);
      const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'para', 'y', 'en', 'con', 'por', 'a', 'al', 'que', 'me', 'interesa', 'quiero', 'precio', 'tienen', 'venden', 'comprar'];
      const keywords = words.filter(w => !stopWords.includes(w));

      if (keywords.length > 0) {
        const conditions = keywords.map(() => '(LOWER(nombre) LIKE ? OR LOWER(descripcion) LIKE ? OR LOWER(categoria) LIKE ?)');
        const params: any[] = [];
        keywords.forEach(kw => {
          const p = `%${kw}%`;
          params.push(p, p, p);
        });

        const sql = `
          SELECT * FROM productos 
          WHERE (${conditions.join(' AND ')}) 
            AND active = 1 
            AND LOWER(nombre) NOT LIKE '%asesor%' 
            AND LOWER(nombre) NOT LIKE '%admin%' 
            AND LOWER(nombre) NOT LIKE '%prueba%' 
          LIMIT 4
        `;

        const [rows]: any = await nativePool.query(sql, params);
        if (Array.isArray(rows) && rows.length > 0) {
          matchedProducts = rows.map(mapSqlRowToProduct).filter(p => !isTestProduct(p));
        }
      }
    } catch (e: any) {
      console.warn('[WhatsApp Tool Service] Error consultando MySQL para buscar_productos:', e?.message || e);
    }
  }

  // 2. Si MySQL no arrojó resultados o falló, buscar en el catálogo local
  if (matchedProducts.length === 0) {
    const allLocal = db.getProducts({ onlyActive: true }).filter(p => !isTestProduct(p));
    
    // Búsqueda por coincidencia de términos
    const terms = normalized.split(' ').filter(t => t.length >= 2);
    const scored = allLocal.map(product => {
      let score = 0;
      const title = (product.title || '').toLowerCase();
      const desc = (product.description || '').toLowerCase();
      const cat = (product.categoryName || '').toLowerCase();

      // Coincidencia exacta de frase completa
      if (title.includes(normalized)) score += 50;
      if (desc.includes(normalized)) score += 25;

      // Coincidencia de palabras individuales
      terms.forEach(term => {
        if (title.includes(term)) score += 20;
        if (cat.includes(term)) score += 15;
        if (desc.includes(term)) score += 8;
      });

      return { product, score };
    });

    matchedProducts = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.product);
  }

  // 3. Formatear la respuesta a texto natural 100% conversacional (cero JSON)
  if (matchedProducts.length > 0) {
    const mapped = matchedProducts.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      formattedPrice: formatCOP(p.price),
      url: `${STORE_URL}/producto/${p.id}`,
      image: p.image || `${STORE_URL}/images/logo-zavela.jpg`,
      category: p.categoryName || 'General',
      available: (p.stock ?? 1) > 0
    }));

    let formattedText = `¡Con mucho gusto! Te confirmo la disponibilidad en nuestro inventario en vivo de Zavela Store:\n\n`;

    if (mapped.length === 1) {
      const item = mapped[0];
      formattedText += `🛍️ *${item.title}*\n`;
      formattedText += `💰 *Precio oficial:* ${item.formattedPrice}\n`;
      formattedText += `📦 *Disponibilidad:* ${item.available ? 'Disponible para despacho inmediato' : 'Últimas unidades en bodega'}\n`;
      formattedText += `🚚 *Envío Nacional con Pago Contra Entrega:* Pagas en efectivo al transportador al recibir en la puerta de tu casa (2 a 5 días hábiles).\n`;
      formattedText += `🔗 *Ver fotos y detalles:* ${item.url}\n\n`;
      formattedText += `¿Deseas que tomemos tus datos (Nombre, Teléfono, Dirección y Ciudad) para programar tu despacho contra entrega hoy mismo? Con gusto te asisto. 📦✨`;
    } else {
      mapped.forEach((item, idx) => {
        formattedText += `${idx + 1}️⃣ *${item.title}*\n`;
        formattedText += `💰 *Precio:* ${item.formattedPrice}\n`;
        formattedText += `🔗 *Ver producto:* ${item.url}\n\n`;
      });
      formattedText += `🚚 *Todos nuestros envíos cuentan con Pago Contra Entrega en efectivo a toda Colombia.*\n\n`;
      formattedText += `¿Cuál de estas opciones te gustaría apartar para tu despacho? Indícame y con gusto lo gestionamos. 😊`;
    }

    return {
      found: true,
      query: rawQuery,
      products: mapped,
      formattedText
    };
  } else {
    // Si no se encontraron productos
    const notFoundText = `Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.\n\n` +
      `En este momento no encontré una coincidencia exacta para "${rawQuery || 'el producto solicitado'}" en nuestra bodega principal, pero puedes consultar todo nuestro catálogo oficial con Pago Contra Entrega aquí:\n` +
      `👉 ${STORE_URL}/catalogo\n\n` +
      `¿Deseas consultar sobre otra categoría (perfumes, tecnología, hogar, belleza o accesorios)? Con gusto te ayudo a encontrar la mejor opción. 🛍️`;

    return {
      found: false,
      query: rawQuery,
      products: [],
      formattedText: notFoundText
    };
  }
}

/**
 * Intercepta cualquier bloque JSON, pseudo-JSON o llamada a tool que el modelo o bot haya impreso
 * como texto plano (ej: { tool: buscar_productos, query: luces navideñas solares }),
 * ejecuta la búsqueda en segundo plano y reemplaza el JSON con texto natural formateado.
 */
export async function interceptAndExecuteToolCalls(rawText: string): Promise<string> {
  if (!rawText || typeof rawText !== 'string') return rawText;

  // 1. Detectar si el texto contiene llamadas a la función buscar_productos
  const hasToolIndicator = 
    rawText.includes('buscar_productos') ||
    rawText.includes('"tool"') ||
    rawText.includes('tool:') ||
    rawText.includes('function_call') ||
    rawText.includes('functionCall');

  if (!hasToolIndicator) {
    return rawText;
  }

  // 2. Regex para capturar bloques JSON o pseudo-código de herramientas
  // Cubre:
  // - ```json { tool: buscar_productos, query: ... } ```
  // - json\n{\n  tool: buscar_productos,\n  query: luces navideñas solares\n}
  // - {"tool": "buscar_productos", "query": "..."}
  // - {"name": "buscar_productos", "arguments": {"query": "..."}}
  const toolBlockRegexes = [
    // Caso con prefijo "json" o bloques de código
    /(?:```(?:json)?\s*)?(?:json\s*)?\{[\s\S]*?(?:tool|function|name)["']?\s*:\s*["']?buscar_productos["']?[\s\S]*?\}(?:\s*```)?/gi,
    // Caso general de cualquier bloque con buscar_productos y query
    /\{[\s\S]*?buscar_productos[\s\S]*?(?:query|producto|search|termino)[\s\S]*?\}/gi
  ];

  let processedText = rawText;
  let intercepted = false;

  for (const regex of toolBlockRegexes) {
    const matches = Array.from(processedText.matchAll(regex));
    for (const match of matches) {
      const matchedBlock = match[0];
      
      // Extraer el parámetro de búsqueda (query)
      let extractedQuery = '';

      // Intento A: Regex sobre query: valor o "query": "valor"
      const queryMatch = matchedBlock.match(/(?:query|producto|q|search|termino)\s*[:=]\s*["']?([^"',}\n\r]+)["']?/i);
      if (queryMatch && queryMatch[1]) {
        extractedQuery = queryMatch[1].trim();
      }

      // Intento B: Si el bloque es JSON estándar
      if (!extractedQuery) {
        try {
          const cleanedJsonStr = matchedBlock.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
          const parsed = JSON.parse(cleanedJsonStr);
          extractedQuery = parsed.query || parsed.producto || parsed.q || parsed.arguments?.query || '';
        } catch (e) {
          // No es JSON estricto
        }
      }

      // Intento C: Búsqueda flexible de palabras tras query
      if (!extractedQuery) {
        const fallbackMatch = matchedBlock.match(/query\s*:\s*([^\}\n]+)/i);
        if (fallbackMatch && fallbackMatch[1]) {
          extractedQuery = fallbackMatch[1].replace(/["']/g, '').trim();
        }
      }

      if (extractedQuery) {
        intercepted = true;
        const toolResult = await executeBuscarProductos(extractedQuery);
        // Reemplazar el bloque JSON con el texto natural de ventas
        processedText = processedText.replace(matchedBlock, toolResult.formattedText);
      } else {
        // Si no se pudo extraer el query del bloque buscar_productos, remover el bloque técnico
        processedText = processedText.replace(matchedBlock, '');
      }
    }
  }

  // 3. Limpieza final de residuos sintácticos que el modelo haya podido dejar
  processedText = processedText
    .replace(/^json\s*$/gim, '')
    .replace(/```(?:json)?\s*```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Si después del reemplazo quedó vacío, proveer respuesta de cortesía
  if (!processedText && intercepted) {
    return `Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.`;
  }

  return processedText;
}

/**
 * Filtro estricto previo al envío de cualquier mensaje por WhatsApp.
 * Garantiza que NINGÚN objeto JSON o fragmento de código sea enviado al cliente.
 */
export function sanitizeWhatsAppMessage(text: string): string {
  if (!text) return '';
  let clean = text;

  // Eliminar cualquier bloque tipo { tool: ... } o { "tool": ... } residual
  clean = clean.replace(/\{[\s\S]*?tool[\s\S]*?\}/gi, '');
  clean = clean.replace(/```(?:json)?[\s\S]*?```/gi, '');
  clean = clean.replace(/^json\s*$/gim, '');
  clean = clean.replace(/\n{3,}/g, '\n\n').trim();

  return clean;
}
