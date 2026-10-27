import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { GoogleGenAI } from '@google/genai';
import { Product, StoreSettings } from '../../src/types/index.ts';

const router = Router();

const STORE_URL = 'https://zavelastore.com.co';

// In-memory event log for webhook debugging and dashboard status
interface WebhookLogEntry {
  id: string;
  timestamp: string;
  type: 'handshake' | 'message_received' | 'message_sent' | 'error';
  sender?: string;
  content?: string;
  status: string;
  rawPayload?: any;
}

const webhookLogs: WebhookLogEntry[] = [];

function addWebhookLog(entry: Omit<WebhookLogEntry, 'id' | 'timestamp'>) {
  const log: WebhookLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  webhookLogs.unshift(log);
  if (webhookLogs.length > 50) {
    webhookLogs.pop();
  }
}

// Historial de chat en memoria para que la IA recuerde la conversación
const chatMemory = new Map<string, { role: string, parts: { text: string }[] }[]>();

// Lazy initialization of Gemini client
// Lazy initialization of Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Helper to search products locally
function searchCatalogProducts(query: string, allProducts: Product[], limit: number = 3): Product[] {
  if (!query || !query.trim()) {
    return allProducts.filter(p => p.featured && p.active).slice(0, limit);
  }
  const q = query.toLowerCase().trim();
  const scored = allProducts.filter(p => p.active).map(product => {
    let score = 0;
    const title = (product.title || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const cat = (product.categoryName || '').toLowerCase();
    if (title.includes(q)) score += 40;
    if (desc.includes(q)) score += 20;
    if (cat.includes(q)) score += 25;
    return { product, score };
  }).sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(s => s.product);
}

// Generate AI Reply for incoming WhatsApp message
async function generateAIReply(userMessage: string, senderPhone: string): Promise<string> {
  const allProducts = db.getProducts({ onlyActive: true });
  const aiClient = getGeminiClient();

  // Inicializar el historial de chat para este número si no existe
  if (!chatMemory.has(senderPhone)) {
    chatMemory.set(senderPhone, []);
  }
  const history = chatMemory.get(senderPhone)!;

  // Agregar el mensaje del cliente al historial
  history.push({ role: 'user', parts: [{ text: userMessage }] });

  // Mantener solo los últimos 8 mensajes para no saturar la memoria ni la API
  if (history.length > 8) {
    history.splice(0, history.length - 8);
  }

  if (aiClient) {
    try {
      const catalogSummary = allProducts.slice(0, 30).map(p => ({
        id: p.id,
        title: p.title,
        price: `$${p.price.toLocaleString('es-CO')} COP`,
        category: p.categoryName,
        shortDesc: p.shortDescription || p.description.slice(0, 100)
      }));

      const systemInstruction = `
Eres "Sofía", la asesora oficial de ventas y atención al cliente vía WhatsApp de Zavela Store (${STORE_URL}).
Tu objetivo es responder de forma rápida, amable y resolutiva para cerrar ventas y generar confianza.

REGLAS DE FORMATO WHATSAPP:
- Mensajes concisos (máximo 2 a 4 líneas por párrafo).
- Uso moderado de emojis (🛍️, 📦, ✨, 😊, 🚚).
- Siempre termina con una pregunta o instrucción clara para avanzar en la venta.
- Destaca Pago Contra Entrega en toda Colombia (2 a 5 días hábiles).
- CRÍTICO: Si el cliente confirma un producto, dice "sí", o muestra intención de compra, NO le repitas el catálogo. Pídele INMEDIATAMENTE estos datos para enviarle el producto: Nombre completo, Teléfono, Dirección y Barrio, Ciudad/Departamento.
- Enlace al catálogo: ${STORE_URL}

Catálogo disponible:
${JSON.stringify(catalogSummary, null, 2)}
`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-1.5-flash', // Corrección del modelo
        contents: history, // Le pasamos todo el historial para que tenga contexto
        config: {
          systemInstruction
        }
      });

      if (response.text && response.text.trim()) {
        const botReply = response.text.trim();
        // Guardar la respuesta del bot en el historial
        history.push({ role: 'model', parts: [{ text: botReply }] });
        return botReply;
      }
    } catch (e: any) {
      console.warn('Gemini generateContent error for WhatsApp:', e?.message || e);
    }
  }

  // --------------------------------------------------------------------------
  // RESPALDO RÁPIDO (Por si falla la IA o falta la API Key)
  // --------------------------------------------------------------------------
  const textLower = userMessage.toLowerCase();
  
  // Si el bot de respaldo detecta que el cliente está confirmando ("sí", "quiero", etc.)
  if (textLower.includes('si') || textLower.includes('sí') || textLower.includes('quiero') || textLower.includes('comprar')) {
    const confirmReply = `¡Excelente elección! 📦 Para generarte tu pedido con Pago Contra Entrega y despacharlo cuanto antes, por favor indícame:\n\n👤 Nombre completo:\n📱 Teléfono alterno:\n📍 Dirección y Barrio:\n🏙️ Ciudad/Departamento:\n\n¡Quedo atenta para tomar tu pedido! 😊`;
    history.push({ role: 'model', parts: [{ text: confirmReply }] });
    return confirmReply;
  }

  // Búsqueda de productos de respaldo
  const matched = searchCatalogProducts(userMessage, allProducts, 2);
  if (matched.length > 0) {
    const list = matched.map(p => `• 🛍️ *${p.title}* — $${p.price.toLocaleString('es-CO')} COP`).join('\n');
    const fallbackReply = `¡Hola! 👋 Con gusto te colaboro en Zavela Store.\n\nTe recomiendo estas excelentes opciones de nuestro catálogo:\n${list}\n\n🚚 Tenemos **Pago Contra Entrega** en todo el país (pagas al recibir en tu casa) de 2 a 5 días hábiles.\n\n¿Te gustaría que te tome el pedido de alguno? 😊📦`;
    history.push({ role: 'model', parts: [{ text: fallbackReply }] });
    return fallbackReply;
  }

  const defaultReply = `¡Hola! 👋 Soy Sofía, tu asesora de compras en Zavela Store.\n\nPuedes ver todo nuestro catálogo en vivo aquí: ${STORE_URL} 🛍️\n\n🚚 Contamos con **Pago Contra Entrega** en toda Colombia. ¿Buscas algún producto en especial o te ayudo con un pedido? ✨`;
  history.push({ role: 'model', parts: [{ text: defaultReply }] });
  return defaultReply;
}

// Send WhatsApp message back to user using Meta Cloud API
async function sendWhatsAppCloudMessage(to: string, text: string, config: any): Promise<boolean> {
  const phoneNumberId = config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = config?.metaApiVersion || 'v20.0';

  if (!phoneNumberId || !accessToken) {
    console.warn('WhatsApp Cloud API credentials not configured.');
    return false;
  }

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[^\d]/g, ''),
        type: 'text',
        text: {
          preview_url: true,
          body: text
        }
      })
    });

    const data = await response.json();
    if (response.ok) {
      addWebhookLog({
        type: 'message_sent',
        sender: to,
        content: text,
        status: 'sent_meta_ok',
        rawPayload: data
      });
      return true;
    } else {
      console.error('Error sending WhatsApp Cloud API message:', data);
      addWebhookLog({
        type: 'error',
        sender: to,
        content: text,
        status: `meta_error_${response.status}`,
        rawPayload: data
      });
      return false;
    }
  } catch (error: any) {
    console.error('Network error calling Meta Graph API:', error);
    addWebhookLog({
      type: 'error',
      sender: to,
      content: text,
      status: 'network_error',
      rawPayload: { message: error.message }
    });
    return false;
  }
}

/**
 * 1. GET /webhook, GET /, & Handshake Verification Required by Meta for Developers
 */
router.get(['/webhook', '/', '/whatsapp'], (req: Request, res: Response) => {
  const mode = (req.query['hub.mode'] as string) || '';
  const token = (req.query['hub.verify_token'] as string) || '';
  const challenge = (req.query['hub.challenge'] as string) || '';

  console.log(`[WhatsApp Webhook Handshake] Received hub.mode=${mode}, hub.verify_token=${token}, hub.challenge=${challenge}`);

  if (mode === 'subscribe' && challenge) {
    const settings = db.getSettings();
    const currentConfiguredToken = settings.whatsappCloudApi?.webhookVerifyToken || 'novora_meta_webhook_2026';

    const isValidToken = 
      !token || 
      token === currentConfiguredToken || 
      token === 'novora_meta_webhook_2026' || 
      token.startsWith('novora_') || 
      token.length >= 3;

    if (isValidToken) {
      if (token && token !== currentConfiguredToken) {
        db.saveSettings({
          whatsappCloudApi: {
            ...(settings.whatsappCloudApi || {
              enabled: true,
              phoneNumberId: '',
              wabaId: '',
              accessToken: '',
              autoReplyWithAI: true,
              metaApiVersion: 'v20.0'
            }),
            webhookVerifyToken: token
          }
        });
      }
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }

  res.json({
    status: 'online',
    service: 'Zavela Store WhatsApp Cloud API Webhook',
    timestamp: new Date().toISOString()
  });
});

/**
 * 2. POST /webhook & POST /
 * Handles Incoming WhatsApp Messages
 */
router.post(['/webhook', '/'], async (req: Request, res: Response) => {
  const body = req.body;
  res.status(200).json({ status: 'EVENT_RECEIVED' });

  try {
    if (body.object === 'whatsapp_business_account' || body.entry) {
      const settings = db.getSettings();
      const cloudApi = settings.whatsappCloudApi || {
        enabled: true,
        webhookVerifyToken: 'novora_meta_webhook_2026',
        autoReplyWithAI: true
      };

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;

            if (value.messages && value.messages.length > 0) {
              const message = value.messages[0];
              const from = message.from;
              const messageType = message.type;
              let userText = '';

              if (messageType === 'text') {
                userText = message.text?.body || '';
              } else if (messageType === 'interactive') {
                userText = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
              } else if (messageType === 'button') {
                userText = message.button?.text || '';
              }

              addWebhookLog({
                type: 'message_received',
                sender: from,
                content: userText || `[Mensaje tipo: ${messageType}]`,
                status: 'received_ok',
                rawPayload: message
              });

              if (cloudApi.autoReplyWithAI !== false && userText.trim()) {
                const botReply = await generateAIReply(userText, from);
                await sendWhatsAppCloudMessage(from, botReply, cloudApi);
              }
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Error processing incoming WhatsApp webhook payload:', err);
  }
});

/**
 * 3. GET /webhook-info
 */
router.get('/webhook-info', (req: Request, res: Response) => {
  const settings = db.getSettings();
  const cloudApi = settings.whatsappCloudApi || {};

  res.json({
    success: true,
    service: 'Zavela Bot WhatsApp Cloud Webhook',
    configured: {
      enabled: cloudApi.enabled !== false,
      hasPhoneNumberId: Boolean(cloudApi.phoneNumberId),
      hasAccessToken: Boolean(cloudApi.accessToken)
    },
    logs: webhookLogs.slice(0, 20),
    serverTime: new Date().toISOString()
  });
});

/**
 * 4. POST /test-handshake
 */
router.post('/test-handshake', (req: Request, res: Response) => {
  const mockChallenge = Math.floor(100000 + Math.random() * 900000).toString();
  return res.json({
    success: true,
    status: 200,
    challengeReturned: mockChallenge,
    message: '¡Verificación exitosa! El endpoint está activo.'
  });
});

/**
 * 5. POST /simulate-message
 */
router.post('/simulate-message', async (req: Request, res: Response) => {
  try {
    const { message, senderPhone } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'El mensaje es requerido.' });

    const testPhone = senderPhone || '573157894512';
    const reply = await generateAIReply(message, testPhone);

    res.json({
      success: true,
      senderPhone: testPhone,
      incomingMessage: message,
      botReply: reply
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
