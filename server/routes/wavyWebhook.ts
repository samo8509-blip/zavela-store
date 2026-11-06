import { Router, Request, Response } from 'express';
import { db } from '../db.ts';

const router = Router();

const STORE_NAME = 'Zavela Store Colombia';
const STORE_URL = 'https://zavelastore.com.co';

/**
 * Función auxiliar para normalizar números de teléfono (remueve caracteres no numéricos y asegura prefijo 57 de Colombia)
 */
function normalizePhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return '';
  let clean = String(rawPhone).replace(/\D/g, '');
  if (clean.length === 10 && clean.startsWith('3')) {
    clean = '57' + clean;
  }
  return clean;
}

/**
 * Generador de respuesta inteligente para Wavy (Wai) WhatsApp
 * Asesora Ejecutiva: Elizabeth (Zavela Store Colombia)
 */
function buildWavyBotResponse(userMessage: string, customerPhone: string): string {
  const msg = (userMessage || '').toLowerCase().trim();

  // 1. Saludos y bienvenida
  if (msg.match(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|inicio|menu|hi|hello)/i)) {
    return `¡Hola! 👋 Te damos una cordial bienvenida a *${STORE_NAME}*.\n\nSoy *Elizabeth*, tu Asesora Ejecutiva. Es un gusto saludarte. ¿En qué producto o requerimiento te puedo colaborar hoy con el mayor de los gustos?\n\n1️⃣ Consultar disponibilidad de un producto en inventario en vivo\n2️⃣ Información sobre *Pago Contra Entrega* (Pagas al recibir en casa)\n3️⃣ Estado de una orden o guía de despacho\n4️⃣ Hablar con un asesor comercial\n\n_Escríbeme tu consulta o el producto de tu interés y con gusto te asesoro._ ✨🇨🇴`;
  }

  // 2. Información de Pago Contra Entrega y Envíos
  if (msg.includes('contra entrega') || msg.includes('envio') || msg.includes('flete') || msg.includes('domicilio') || msg.includes('pago')) {
    return `🚚 *¡En ${STORE_NAME} compras con total tranquilidad y respaldo!* 🇨🇴\n\n✅ *Envío Nacional y Pago Contra Entrega* en las principales ciudades y municipios de Colombia.\n✅ El pedido llega en un lapso estimado de 2 a 5 días hábiles mediante transportadoras certificadas (Servientrega, Coordinadora, Envía o Inter Rapidísimo).\n✅ Pagas en efectivo directamente al transportador cuando tengas el paquete en tus manos.\n\n¿Tienes algún producto en mente para validar inventario en vivo y ayudarte a apartarlo? Quedo muy atenta. 📦`;
  }

  // 3. Consulta de Guía o Estado de Pedido
  if (msg.includes('guia') || msg.includes('pedido') || msg.includes('rastreo') || msg.includes('estado') || msg.includes('despacho')) {
    return `📦 *Rastreo y Estado de Despacho - Zavela Store*\n\nCon mucho gusto verifico tu despacho en nuestro sistema en vivo. Por favor compárteme:\n\n• Tu *Nombre Completo*\n• Número de *Cédula* o *Celular registrado en la compra*\n• Producto adquirido\n\nCon estos datos consulto inmediatamente la guía de la transportadora para darte el reporte exacto. 🚚💨`;
  }

  // 4. Búsqueda y validación estricta de inventario en vivo (Cero alucinaciones, dependencia exclusiva de BD en tiempo real)
  try {
    const products = db.getProducts({ onlyActive: true });
    
    // Si la base de datos en vivo está vacía o no tiene productos activos
    if (!products || products.length === 0) {
      return `Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.`;
    }

    if (msg.length >= 3) {
      const matched = products.filter(p => {
        const title = (p.title || (p as any).name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const cat = (p.categoryName || '').toLowerCase();
        return title.includes(msg) || desc.includes(msg) || cat.includes(msg);
      }).slice(0, 3);

      if (matched.length > 0) {
        let reply = `🔍 *Confirmado en nuestro inventario en vivo de Zavela Store:*\n\n`;
        matched.forEach((item, idx) => {
          const price = item.price ? `$${item.price.toLocaleString('es-CO')} COP` : 'Consultar disponibilidad';
          const link = `${STORE_URL}/producto/${item.slug || item.id}`;
          reply += `${idx + 1}️⃣ *${item.title}*\n💰 Precio confirmado: *${price}*\n🚚 Pago Contra Entrega disponible\n🔗 Ficha: ${link}\n\n`;
        });
        reply += `¿Deseas que reservemos alguna unidad para ti con despacho contra entrega? Indícame tu ciudad de destino para proceder. 🛍️`;
        return reply;
      } else {
        // Si el usuario preguntó por un producto específico pero no está en la base de datos en vivo
        const isProductQuery = msg.includes('precio') || msg.includes('tienen') || msg.includes('venden') || msg.includes('disponible') || msg.includes('cuanto') || msg.includes('costo') || msg.includes('perfume') || msg.includes('reloj') || msg.includes('producto');
        if (isProductQuery) {
          return `Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.`;
        }
      }
    }
  } catch (err) {
    console.warn('[Wavy Webhook] Error consultando inventario en vivo:', err);
    return `Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.`;
  }

  // 5. Respuesta institucional predeterminada
  return `Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.`;
}

/**
 * GET /api/wavy-webhook
 * Handshake / Verificación inicial del Webhook desde Wavy o monitor de salud
 */
router.get(['/', '/wavy-webhook', '/webhook'], (req: Request, res: Response) => {
  const challenge = req.query.challenge || req.query['hub.challenge'] || req.query.echo || '';
  const token = req.query.token || req.query['hub.verify_token'] || '';

  console.log('[Wavy Webhook Handshake GET]:', { token, challenge });

  if (challenge) {
    return res.status(200).send(String(challenge));
  }

  return res.status(200).json({
    status: 'online',
    service: 'Wavy (Wai) WhatsApp Webhook - Zavela Store Colombia',
    timestamp: new Date().toISOString(),
    endpoint: '/api/wavy-webhook'
  });
});

/**
 * POST /api/wavy-webhook
 * Recepción de eventos de mensajes entrantes de Wavy y retorno de respuesta estructurada
 */
router.post(['/', '/wavy-webhook', '/webhook'], (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    console.log('[Wavy Webhook POST Evento recibido]:', JSON.stringify(body, null, 2));

    // 1. Extracción flexible de teléfono y mensaje según los diferentes payloads que envía Wavy/Wai
    const rawPhone = 
      body.phone || 
      body.from || 
      body.sender || 
      body.contact?.phone || 
      body.customer?.phone || 
      body.destination || 
      body.user?.phone || 
      '';

    const rawMessage = 
      body.message || 
      body.text || 
      body.body || 
      body.content || 
      body.msg || 
      body.messageText || 
      body.data?.message || 
      '';

    const phone = normalizePhoneNumber(rawPhone);
    const message = typeof rawMessage === 'string' ? rawMessage.trim() : JSON.stringify(rawMessage);

    // 2. Si no hay mensaje o es un ping de status de Wavy
    if (!message && !phone) {
      return res.status(200).json({
        success: true,
        status: 'IGNORED_NO_PAYLOAD',
        message: 'No incoming message detected'
      });
    }

    // 3. Generar la respuesta del bot para el usuario
    const replyText = buildWavyBotResponse(message, phone);

    // 4. Formato de respuesta compatible con Wavy / Wai para contestar al cliente de WhatsApp
    const responsePayload = {
      success: true,
      status: 'success',
      timestamp: new Date().toISOString(),
      phone: phone || 'unknown',
      // Estructura oficial de Wavy Messaging API
      reply: {
        recipient: phone,
        type: 'text',
        text: {
          body: replyText
        }
      },
      // Estructura conversacional directa
      response: {
        type: 'text',
        text: replyText
      },
      // Array de mensajes para plataformas multi-burbuja
      messages: [
        {
          type: 'text',
          text: replyText
        }
      ],
      // Fallback simple
      message: replyText
    };

    console.log('[Wavy Webhook Respuesta enviada]:', {
      phone,
      replyPreview: replyText.substring(0, 100) + '...'
    });

    return res.status(200).json(responsePayload);

  } catch (error: any) {
    console.error('[Wavy Webhook Error]:', error);
    return res.status(500).json({
      success: false,
      status: 'error',
      error: error.message || 'Error interno procesando webhook de Wavy'
    });
  }
});

export default router;
