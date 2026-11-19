/**
 * Derivación de clientes a un asesor humano CONECTADO.
 * Cuando el cliente pide hablar con una persona, se le entrega el WhatsApp del siguiente asesor
 * conectado (reparto rotativo). Si no hay nadie conectado, se le indica el canal oficial.
 * Se avisa al administrador y, si tiene correo, al asesor.
 */
import { pickNextAvailable, getAdvisor, isOnline } from './advisorStore.ts';
import { sendHumanRequestAlert } from './whatsappAlerts.ts';
import { sendAlertEmail } from './emailAlerts.ts';

const WHO = '(asesor|asesora|asesores|persona|personas|humano|humana|vendedor|vendedora|agente|alguien|representante|encargado|encargada|ejecutiv[oa])';
const VERB = '(hablar|conversar|comunic\\w*|contact\\w*|chatear|escribir\\w*|atend\\w*|atienda\\w*|pas[aeo]\\w*|conect\\w*|llam\\w*|quiero|necesito|prefiero|requiero|me\\s+ayude)';
const HANDOFF_RE = new RegExp(`\\b${VERB}\\b[^.?!\\n]{0,45}\\b${WHO}\\b`, 'i');
const EXTRA_RE = /\b(asesor|persona|humano|humana)\s+(real|de\s+verdad)\b|atenci[oó]n\s+(personalizada|humana)|no\s+(quiero|deseo)\s+(hablar\s+con\s+)?(un\s+)?(bot|robot)|con\s+un\s+humano/i;

/** El texto del cliente, sin las líneas de contexto que agrega la tienda ([NOMBRE_CLIENTE]: …). */
const clean = (m: string) => m.replace(/\[[A-Z_]+\]:[^\n]*/g, ' ').trim();

export const wantsHuman = (message: string): boolean => {
  const m = clean(message);
  return m.length > 0 && m.length < 300 && (HANDOFF_RE.test(m) || EXTRA_RE.test(m));
};

// El mismo visitante conserva su asesor 30 min y no se repite el aviso.
const sticky = new Map<string, { advisorId: string; at: number }>();
const STICKY_MS = 30 * 60 * 1000;
let globalHits: number[] = [];

const waNumber = (p: string) => {
  const d = (p || '').replace(/\D/g, '');
  return d.length === 10 && d.startsWith('3') ? `57${d}` : d;
};

export interface HandoffResult {
  reply: string;
  whatsappUrl: string;
  whatsappMessage: string;
  advisorName?: string;
  connected: boolean;
}

export async function handoffToAdvisor(opts: {
  ip: string; customerName?: string; message: string; page?: string; officialNumber: string; viewedProducts?: string[];
}): Promise<HandoffResult> {
  const now = Date.now();
  const customer = opts.customerName && opts.customerName !== 'Invitado' ? opts.customerName : '';
  const interest = (opts.viewedProducts || [])[0];

  let advisor = (() => {
    const s = sticky.get(opts.ip);
    if (s && now - s.at < STICKY_MS) {
      const a = getAdvisor(s.advisorId);
      if (a && isOnline(a)) return a;
    }
    return null;
  })();
  const isRepeat = Boolean(advisor);
  globalHits = globalHits.filter(t => now - t < 60 * 60 * 1000);
  if (!advisor && globalHits.length < 40) {
    advisor = pickNextAvailable();
    if (advisor) { sticky.set(opts.ip, { advisorId: advisor.id, at: now }); globalHits.push(now); }
  }

  const text = (adv?: string) =>
    `Hola${adv ? ` ${adv}` : ''}, soy ${customer || 'un cliente'} de Zavela Store.${interest ? ` Estaba viendo: ${interest}.` : ''} Quiero hablar con un asesor.`;

  if (advisor) {
    const phone = waNumber(advisor.phone || '');
    if (!isRepeat) {
      // Avisos sin bloquear la respuesta al cliente
      void sendHumanRequestAlert({ name: customer, message: `Derivado a ${advisor.name} (${advisor.sellerCode || advisor.id}). ${opts.message}`, page: opts.page }).catch(() => {});
      if (advisor.email) {
        void sendAlertEmail(
          `Cliente para ti: ${customer || 'visitante'}`,
          `Hola ${advisor.name},\n\nUn cliente pidió hablar con una persona y te lo derivamos.\n• Cliente: ${customer || 'No indicado'}\n• Mensaje: ${opts.message.slice(0, 300)}${interest ? `\n• Estaba viendo: ${interest}` : ''}\n\nEscribirá a tu WhatsApp en un momento. Responde lo antes posible.`,
          advisor.email
        ).catch(() => {});
      }
    }
    const first = advisor.name.split(' ')[0];
    return {
      reply: `¡Claro que sí! 😊 Te comunico con **${first}**, uno de nuestros asesores que está en línea ahora mismo. Toca el botón de abajo para escribirle por WhatsApp y te atiende de inmediato.`,
      whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(text(first))}`,
      whatsappMessage: text(first),
      advisorName: advisor.name,
      connected: true
    };
  }

  // Nadie conectado: canal oficial + aviso al administrador
  void sendHumanRequestAlert({ name: customer, message: `Pidió una persona y no había asesores conectados. ${opts.message}`, page: opts.page }).catch(() => {});
  return {
    reply: 'En este momento nuestros asesores no están conectados, pero no te dejamos solo 😊. Escríbenos a nuestra línea oficial de WhatsApp y te respondemos en cuanto un asesor esté disponible (atendemos de 8:00 a.m. a 8:00 p.m.). También puedo ayudarte aquí mismo con cualquier producto.',
    whatsappUrl: `https://wa.me/${opts.officialNumber}?text=${encodeURIComponent(text())}`,
    whatsappMessage: text(),
    connected: false
  };
}
