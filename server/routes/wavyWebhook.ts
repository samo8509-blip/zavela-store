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
 */
function buildWavyBotResponse(userMessage: string, customerPhone: string): string {
  const msg = (userMessage || '').toLowerCase().trim();

  // 1. Saludos y bienvenida
  if (msg.match(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|inicio|menu|hi|hello)/i)) {
    return `¡Hola! 👋 Te damos la bienvenida a *${STORE_NAME}*.\n\nSoy *Sofía*, tu asesora personal. ¿En qué te puedo colaborar hoy?\n\n1️⃣ Consultar catálogo y ofertas del día\n2️⃣ Información sobre *Pago Contra Entrega* (Pagas al recibir en casa)\n3️⃣ Estado de una orden o guía de envío\n4️⃣ Hablar con un asesor humano\n\n_Escríbeme el nombre del producto que buscas o tu duda y con gusto te asesoro._ 🛍️✨`;
  }

  // 2. Información de Pago Contra Entrega y Envíos
  if (msg.includes('contra entrega') || msg.includes('envio') || msg.includes('flete') || msg.includes('domicilio') || msg.includes('pago')) {
    return `🚚 *¡En ${STORE_NAME} pagas seguro en la puerta de tu casa!* 🇨🇴\n\n✅ *Envío Gratis y Pago Contra Entrega* a nivel nacional.\n✅ El pedido llega en 2 a 5 días hábiles a través de Servientrega, Coordinadora o Envía.\n✅ Pagas en efectivo cuando el transportador te entregue el paquete en mano.\n\n¿Deseas realizar un pedido de algún producto? Envíame el nombre o enlace para apartártelo de inmediato. 📦`;
  }

  // 3. Consulta de Guía o Estado de Pedido
  if (msg.includes('guia') || msg.includes('pedido') || msg.includes('rastreo') || msg.includes('estado') || msg.includes('despacho')) {
    return `📦 *Rastreo de Pedidos Zavela Store*\n\nPara consultar el estado de tu despacho o el número de guía con la transportadora, por favor indícame:\n\n• Tu *Nombre Completo*\n• Número de *Cédula* o *Celular registrado*\n• Producto comprado\n\nUn asesor de logística verificará tu despacho en nuestro sistema cPanel en minutos. 🚚💨`;
  }

  // 4. Búsqueda en catálogo de productos activos
  try {
    const products = db.getProducts({ onlyActive: true });
    if (products && products.length > 0 && msg.length >= 3) {
      const matched = products.filter(p => {
        const title = (p.title || (p as any).name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const cat = (p.categoryName || '').toLowerCase();
        return title.includes(msg) || desc.includes(msg) || cat.includes(msg);
      }).slice(0, 3);

      if (matched.length > 0) {
        let reply = `🔍 *Encontramos estas opciones para ti en Zavela Store:*\n\n`;
        matched.forEach((item, idx) => {
          const price = item.price ? `$${item.price.toLocaleString('es-CO')} COP` : 'Consultar precio';
          const link = `${STORE_URL}/producto/${item.slug || item.id}`;
          reply += `${idx + 1}️⃣ *${item.title}*\n💰 Precio: *${price}*\n🚚 Pago Contra Entrega Incluido\n🔗 Ver ficha: ${link}\n\n`;
        });
        reply += `¿Deseas pedir alguno de estos productos? Solo responde *SÍ* junto con tu ciudad de entrega para gestionarlo. 🛍️`;
        return reply;
      }
    }
  } catch (err) {
    console.warn('[Wavy Webhook] Error consultando productos:', err);
  }

  // 5. Respuesta por defecto con invitación a compra y llamada a la acción
  return `¡Gracias por tu mensaje! 🌟\n\nEn *${STORE_NAME}* contamos con cientos de productos en tecnología, hogar, moda y belleza con *Pago Contra Entrega en toda Colombia*.\n\nPuedes ver todo nuestro catálogo oficial en:\n👉 ${STORE_URL}\n\nO si deseas que te tome el pedido directamente por aquí, compártenos el producto que deseas, tu dirección y ciudad de destino. ¡Quedo muy atenta! 😊`;
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
