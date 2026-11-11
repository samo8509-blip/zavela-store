import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import {
  executeBuscarProductos,
  interceptAndExecuteToolCalls,
  sanitizeWhatsAppMessage
} from '../services/whatsappToolService.ts';

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
 * Intercepta y ejecuta llamadas a funciones (tool calls) en segundo plano
 * Asesora Ejecutiva: Elizabeth (Zavela Store Colombia)
 */
async function buildWavyBotResponse(userMessage: string, customerPhone: string): Promise<string> {
  // 1. INTERCEPCIÓN DIRECTA DE TOOL CALLS (JSON o pseudo-código buscar_productos)
  // Si WAI o el bot externo envió un bloque como:
  // json { tool: buscar_productos, query: luces navideñas solares }
  // se intercepta, se ejecuta en segundo plano y se devuelve únicamente texto natural.
  const intercepted = await interceptAndExecuteToolCalls(userMessage);
  if (intercepted !== userMessage) {
    return sanitizeWhatsAppMessage(intercepted);
  }

  const msg = (userMessage || '').toLowerCase().trim();

  // 2. Saludos y bienvenida
  if (msg.match(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|inicio|menu|hi|hello)/i)) {
    return `¡Hola! 👋 Te damos una cordial bienvenida a *${STORE_NAME}*.\n\nSoy *Elizabeth*, tu Asesora Ejecutiva. Es un gusto saludarte. ¿En qué producto o requerimiento te puedo colaborar hoy con el mayor de los gustos?\n\n1️⃣ Consultar disponibilidad de un producto en inventario en vivo\n2️⃣ Información sobre *Pago Contra Entrega* (Pagas al recibir en casa)\n3️⃣ Estado de una orden o guía de despacho\n4️⃣ Hablar con un asesor comercial\n\n_Escríbeme tu consulta o el producto de tu interés y con gusto te asesoro._ ✨🇨🇴`;
  }

  // 3. Información de Pago Contra Entrega y Envíos
  if (msg.includes('contra entrega') || msg.includes('envio') || msg.includes('flete') || msg.includes('domicilio') || msg.includes('pago')) {
    return `🚚 *¡En ${STORE_NAME} compras con total tranquilidad y respaldo!* 🇨🇴\n\n✅ *Envío Nacional y Pago Contra Entrega* en las principales ciudades y municipios de Colombia.\n✅ El pedido llega en un lapso estimado de 2 a 5 días hábiles mediante transportadoras certificadas (Servientrega, Coordinadora, Envía o Inter Rapidísimo).\n✅ Pagas en efectivo directamente al transportador cuando tengas el paquete en tus manos.\n\n¿Tienes algún producto en mente para validar inventario en vivo y ayudarte a apartarlo? Quedo muy atenta. 📦`;
  }

  // 4. Consulta de Guía o Estado de Pedido
  if (msg.includes('guia') || msg.includes('pedido') || msg.includes('rastreo') || msg.includes('estado') || msg.includes('despacho')) {
    return `📦 *Rastreo y Estado de Despacho - Zavela Store*\n\nCon mucho gusto verifico tu despacho en nuestro sistema en vivo. Por favor compárteme:\n\n• Tu *Nombre Completo*\n• Número de *Cédula* o *Celular registrado en la compra*\n• Producto adquirido\n\nCon estos datos consulto inmediatamente la guía de la transportadora para darte el reporte exacto. 🚚💨`;
  }

  // 5. Intención de compra directa
  if (msg.includes('si') || msg.includes('sí') || msg.includes('quiero') || msg.includes('comprar') || msg.includes('ordenar') || msg.includes('pedir')) {
    return `¡Con mucho gusto! 📦 Para registrar tu pedido con Pago Contra Entrega en Colombia, por favor compárteme:\n\n👤 Nombre completo:\n📱 Teléfono de contacto:\n📍 Dirección y Barrio:\n🏙️ Ciudad y Departamento:\n\nQuedo atenta para procesarlo de inmediato y apartarlo en bodega. 😊`;
  }

  // 6. Búsqueda y validación estricta de inventario en vivo con la herramienta buscar_productos
  try {
    const toolResult = await executeBuscarProductos(userMessage);
    if (toolResult.found) {
      return sanitizeWhatsAppMessage(toolResult.formattedText);
    }
  } catch (err) {
    console.warn('[Wavy Webhook] Error consultando buscar_productos:', err);
  }

  // 7. Respuesta institucional predeterminada
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
router.post(['/', '/wavy-webhook', '/webhook'], async (req: Request, res: Response) => {
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

    // 3. Generar la respuesta del bot para el usuario ejecutando herramientas en segundo plano
    const replyText = await buildWavyBotResponse(message, phone);

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
