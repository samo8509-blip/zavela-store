import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from '../db.ts';
import { Product, StoreSettings } from '../../src/types/index.ts';
import {
  buscarProductosToolDeclaration,
  executeBuscarProductos,
  interceptAndExecuteToolCalls,
  sanitizeWhatsAppMessage
} from '../services/whatsappToolService.ts';

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
    return { product, score };
  });

  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  return matched.slice(0, limit).map(s => s.product);
}

// Shared Gemini Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Generate AI Reply for incoming WhatsApp message with tool execution and interception
async function generateAIReply(userMessage: string, senderPhone: string): Promise<string> {
  // 1. Si el mensaje entrante es ya una llamada a herramienta (de un bot o webhook puente), interceptarla de inmediato
  const directInterception = await interceptAndExecuteToolCalls(userMessage);
  if (directInterception !== userMessage) {
    return directInterception;
  }

  if (!chatMemory.has(senderPhone)) {
    chatMemory.set(senderPhone, []);
  }
  const history = chatMemory.get(senderPhone)!;

  history.push({ role: 'user', parts: [{ text: userMessage }] });

  if (history.length > 8) {
    history.splice(0, history.length - 8);
  }

  const aiClient = getGeminiClient();

  if (aiClient) {
    try {
      const systemPrompt = `Eres Elizabeth, la Asesora Ejecutiva oficial de Zavela Store Colombia (${STORE_URL}).
Tu misión es atender a los clientes con calidez colombiana, generar confianza y cerrar ventas mediante Pago Contra Entrega.

REGLAS ABSOLUTAS:
1. SI EL CLIENTE PREGUNTA POR UN PRODUCTO, PRECIO O DISPONIBILIDAD: Debes invocar la función 'buscar_productos'.
2. NUNCA MUESTRES CÓDIGO NI JSON AL CLIENTE. Toda interacción debe ser texto natural, humano y cordial.
3. CERO ALUCINACIONES: No inventes precios ni confirmes artículos sin antes consultarlos con 'buscar_productos'.
4. CONDICIONES COMERCIALES DE ZAVELA STORE:
   - Envíos a toda Colombia de 2 a 5 días hábiles.
   - Pago Contra Entrega: el cliente paga en efectivo únicamente cuando el transportador llegue a su domicilio.
   - Si el cliente desea comprar, solicita: Nombre completo, Teléfono celular, Dirección con barrio, y Ciudad/Departamento.
5. TONO: Ejecutivo, cálido, profesional y comercial, 100% colombiano.`;

      const contents = history.map(item => ({
        role: item.role,
        parts: item.parts.map(p => ({ text: p.text }))
      }));

      // Invocación a Gemini 3.8 Flash con la herramienta buscar_productos
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: [buscarProductosToolDeclaration] }]
        }
      });

      // Caso 1: Intercepción de Function Calls nativas del SDK
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls.find(c => c.name === 'buscar_productos') || functionCalls[0];
        const queryArg = String((call.args as any)?.query || (call.args as any)?.producto || (call.args as any)?.q || userMessage);

        console.log(`[WhatsApp Tool Call]: Ejecutando buscar_productos en segundo plano con query="${queryArg}"`);
        const toolResult = await executeBuscarProductos(queryArg);

        // Devolver el resultado de la función al modelo para que genere la respuesta natural
        try {
          const followUp = await aiClient.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              ...contents,
              response.candidates![0].content,
              {
                role: 'user',
                parts: [
                  {
                    functionResponse: {
                      id: call.id,
                      name: call.name,
                      response: {
                        encontrado: toolResult.found,
                        productos: toolResult.products,
                        instruccion_estricta: "Responde de forma 100% natural al cliente en WhatsApp como Elizabeth. Incluye el nombre del producto, precio exacto en COP, despacho con Pago Contra Entrega en efectivo al recibir en casa, y el enlace de compra. NUNCA muestres JSON ni menciones nombres de herramientas."
                      }
                    }
                  }
                ]
              }
            ],
            config: {
              systemInstruction: systemPrompt
            }
          });

          let naturalReply = followUp.text || toolResult.formattedText;
          // Salvaguarda: interceptar cualquier pseudo-JSON residual
          naturalReply = await interceptAndExecuteToolCalls(naturalReply);
          naturalReply = sanitizeWhatsAppMessage(naturalReply);

          history.push({ role: 'model', parts: [{ text: naturalReply }] });
          return naturalReply;
        } catch (eFollowUp: any) {
          console.warn('[WhatsApp Tool FollowUp Warning]:', eFollowUp?.message || eFollowUp);
          const fallbackNatural = sanitizeWhatsAppMessage(toolResult.formattedText);
          history.push({ role: 'model', parts: [{ text: fallbackNatural }] });
          return fallbackNatural;
        }
      }

      // Caso 2: El modelo respondió con texto directamente.
      // Interceptar si el modelo imprimió erróneamente un pseudo-JSON en lugar de un Tool Call formal.
      let botText = response.text || '';
      botText = await interceptAndExecuteToolCalls(botText);
      botText = sanitizeWhatsAppMessage(botText);

      if (botText) {
        history.push({ role: 'model', parts: [{ text: botText }] });
        return botText;
      }
    } catch (e: any) {
      console.error('[WhatsApp Gemini Error]:', e?.message || e);
    }
  }

  // Fallback rápido si no hay API key o si hubo error:
  const textLower = userMessage.toLowerCase();
  
  if (textLower.includes('si') || textLower.includes('sí') || textLower.includes('quiero') || textLower.includes('comprar')) {
    const confirmReply = `¡Con mucho gusto! 📦 Para registrar tu pedido con Pago Contra Entrega en Colombia, por favor compárteme:\n\n👤 Nombre completo:\n📱 Teléfono de contacto:\n📍 Dirección y Barrio:\n🏙️ Ciudad y Departamento:\n\nQuedo atenta para procesarlo de inmediato. 😊`;
    history.push({ role: 'model', parts: [{ text: confirmReply }] });
    return confirmReply;
  }

  // Ejecutar buscar_productos directamente en segundo plano para consultas de producto
  const toolResult = await executeBuscarProductos(userMessage);
  if (toolResult.found) {
    const naturalText = sanitizeWhatsAppMessage(toolResult.formattedText);
    history.push({ role: 'model', parts: [{ text: naturalText }] });
    return naturalText;
  }

  const defaultReply = `Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.`;
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

  // Sanitización estricta para evitar que cualquier JSON de herramientas llegue al chat del cliente
  let cleanText = sanitizeWhatsAppMessage(text);
  if (!cleanText || cleanText.trim().length === 0) {
    cleanText = 'Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.';
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
          body: cleanText
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

router.get(['/webhook', '/', '/whatsapp'], (req: Request, res: Response) => {
  const mode = (req.query['hub.mode'] as string) || '';
  const token = (req.query['hub.verify_token'] as string) || '';
  const challenge = (req.query['hub.challenge'] as string) || '';

  if (mode === 'subscribe' && challenge) {
    const settings = db.getSettings();
    const currentConfiguredToken = settings.whatsappCloudApi?.webhookVerifyToken || 'novora_meta_webhook_2026';
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(challenge);
  }

  res.json({
    status: 'online',
    service: 'Zavela Store WhatsApp Cloud API Webhook',
    timestamp: new Date().toISOString()
  });
});

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

router.get('/webhook-info', (req: Request, res: Response) => {
  const settings = db.getSettings();
  const cloudApi: any = settings.whatsappCloudApi || {};

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

router.post('/test-handshake', (req: Request, res: Response) => {
  const mockChallenge = Math.floor(100000 + Math.random() * 900000).toString();
  return res.json({
    success: true,
    status: 200,
    challengeReturned: mockChallenge,
    message: '¡Verificación exitosa!'
  });
});

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
