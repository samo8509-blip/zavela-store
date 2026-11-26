/**
 * Suscripción al boletín (Club VIP): guarda al suscriptor con su consentimiento y le envía el correo
 * de bienvenida con el cupón BIENVENIDO10. También valida el cupón en el pago.
 * Los suscriptores se guardan en MySQL (configuraciones, clave newsletter_subscribers).
 */
import { Router } from 'express';
import { pool } from '../mysqlPool.ts';
import { db } from '../db.ts';
import { isValidEmail, sendCustomerEmail } from '../services/emailAlerts.ts';

const router = Router();
const KEY = 'newsletter_subscribers';
export const WELCOME_CODE = 'BIENVENIDO10';
export const WELCOME_PERCENT = 10;

export interface Subscriber { email: string; createdAt: string; consentAt: string; consentIp: string; interests: string[]; welcomeSent: boolean; welcomeError?: string; couponUsed?: boolean; unsubscribed?: boolean }

const hits = new Map<string, number[]>();
const esc = (s: string) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export async function readSubscribers(): Promise<Subscriber[]> {
  try {
    const [rows]: any = await pool.query('SELECT valor FROM configuraciones WHERE clave = ?', [KEY]);
    return rows?.[0]?.valor ? JSON.parse(rows[0].valor) : [];
  } catch { return []; }
}
async function writeSubscribers(list: Subscriber[]) {
  await pool.query(
    `INSERT INTO configuraciones (clave, valor, updated_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()`,
    [KEY, JSON.stringify(list.slice(0, 20000))]
  );
}

/** Marca el cupón como usado por ese correo. Devuelve false si no aplica (no suscrito o ya usado). */
export async function consumeWelcomeCoupon(email: string): Promise<boolean> {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  const list = await readSubscribers();
  const s = list.find(x => x.email === e);
  if (!s || s.couponUsed || s.unsubscribed) return false;
  s.couponUsed = true;
  await writeSubscribers(list);
  return true;
}

function welcomeEmail(storeUrl: string, contact: string) {
  const subject = '¡Bienvenido a Zavela Store! Aquí está tu cupón del 10 %';
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#111;color:#fff;padding:22px 28px;font-size:20px;font-weight:700;letter-spacing:2px">ZAVELA <span style="color:#f5b301">STORE</span></td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:22px;margin:0 0 12px">¡Bienvenido a la comunidad de Zavela Store!</h1>
<p style="font-size:15px;line-height:1.55;margin:0 0 16px">Gracias por suscribirte. Aquí recibirás ofertas, lanzamientos y novedades de la tienda. Como bienvenida, este es tu cupón:</p>
<div style="text-align:center;margin:20px 0"><span style="display:inline-block;border:2px dashed #f5b301;border-radius:12px;padding:14px 28px;font-size:26px;font-weight:700;letter-spacing:3px;background:#fffbea">${WELCOME_CODE}</span><div style="font-size:13px;color:#555;margin-top:8px">${WELCOME_PERCENT} % de descuento en tu primera compra</div></div>
<p style="font-size:14px;line-height:1.55;margin:0 0 8px"><strong>Cómo usarlo:</strong> agrega tus productos al carrito y escribe el código en el campo "¿Tienes un cupón?" al finalizar la compra, usando este mismo correo. Es de un solo uso por persona. Pagas contra entrega, en efectivo, cuando recibes.</p>
<p style="text-align:center;margin:22px 0"><a href="${esc(storeUrl)}" style="background:#f5b301;color:#111;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:999px;display:inline-block">Ir a la tienda</a></p>
<p style="font-size:12px;color:#666;line-height:1.5;margin:20px 0 0">Recibes este correo porque autorizaste recibir ofertas de Zavela Store. Puedes retirar tu autorización en cualquier momento en <a href="${esc(storeUrl)}/derechos-datos" style="color:#666">${esc(storeUrl)}/derechos-datos</a> o escribiendo a ${esc(contact)}. Más información en nuestra <a href="${esc(storeUrl)}/politica-de-privacidad" style="color:#666">política de privacidad</a>.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `¡Bienvenido a la comunidad de Zavela Store!\n\nTu cupón: ${WELCOME_CODE} (${WELCOME_PERCENT} % en tu primera compra).\nEscríbelo en "¿Tienes un cupón?" al finalizar la compra, con este mismo correo. Un solo uso por persona.\n\nTienda: ${storeUrl}\nPara retirar tu autorización: ${storeUrl}/derechos-datos o ${contact}`;
  return { subject, html, text };
}

router.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const b = req.body || {};
    if (String(b.website || '').trim()) return res.json({ success: true }); // bots
    const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Escribe un correo válido.' });
    if (b.consent !== true) return res.status(400).json({ success: false, message: 'Debes autorizar el envío de ofertas para suscribirte.' });
    const ip = String(req.ip || '');
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter(t => now - t < 3600_000);
    if (recent.length >= 5) return res.status(429).json({ success: false, message: 'Demasiados intentos. Prueba de nuevo en una hora.' });
    recent.push(now); hits.set(ip, recent);

    const interests = Array.isArray(b.interests) ? b.interests.map((x: any) => String(x).slice(0, 40)).slice(0, 6) : [];
    const list = await readSubscribers();
    let s = list.find(x => x.email === email);
    const isNew = !s;
    if (!s) {
      s = { email, createdAt: new Date().toISOString(), consentAt: new Date().toISOString(), consentIp: ip, interests, welcomeSent: false };
      list.unshift(s);
    } else {
      s.unsubscribed = false; s.interests = interests.length ? interests : s.interests;
    }
    // El correo de bienvenida se envía al suscribirse y se reintenta si la vez anterior falló.
    let sent = s.welcomeSent;
    let reason = '';
    if (!s.welcomeSent) {
      const settings: any = db.getSettings() || {};
      const storeUrl = 'https://zavelastore.com.co';
      const m = welcomeEmail(storeUrl, String(settings.contactEmail || 'contacto@zavelastore.com.co'));
      const r = await sendCustomerEmail(email, m.subject, m.html, m.text);
      s.welcomeSent = r.sent; s.welcomeError = r.sent ? undefined : r.reason;
      sent = r.sent; reason = r.reason || '';
    }
    await writeSubscribers(list);
    try { db.addLog({ type: 'SYSTEM', action: 'Suscripción al boletín', details: `${isNew ? 'nuevo' : 'repetido'}; correo ${sent ? 'enviado' : 'NO enviado: ' + reason}`, status: sent ? 'success' : 'warning' } as any); } catch { /* opcional */ }
    return res.json({ success: true, welcomeEmailSent: sent, alreadySubscribed: !isNew, couponCode: WELCOME_CODE });
  } catch (e: any) {
    console.error('[newsletter] error:', e?.message);
    return res.status(500).json({ success: false, message: 'No pudimos completar tu suscripción. Intenta de nuevo.' });
  }
});

/** El pago consulta si un cupón es válido para ese correo (el descuento real lo recalcula el servidor en el pedido). */
router.post('/api/newsletter/validate-coupon', async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (code !== WELCOME_CODE) return res.json({ success: false, message: 'Ese cupón no existe o ya venció.' });
  if (!isValidEmail(email)) return res.json({ success: false, message: 'Escribe primero tu correo en el formulario para validar el cupón.' });
  const s = (await readSubscribers()).find(x => x.email === email);
  if (!s || s.unsubscribed) return res.json({ success: false, message: 'Ese correo no está suscrito. Suscríbete en la tienda para recibir tu cupón.' });
  if (s.couponUsed) return res.json({ success: false, message: 'Este cupón ya fue usado con ese correo.' });
  return res.json({ success: true, code: WELCOME_CODE, percentage: WELCOME_PERCENT });
});

/** Solo administrador (apiGuard): suscriptores y si su correo de bienvenida salió. */
router.get('/api/admin/newsletter/subscribers', async (_req, res) => {
  const list = await readSubscribers();
  res.json({ success: true, total: list.length, sinBienvenida: list.filter(s => !s.welcomeSent).length, data: list.slice(0, 200) });
});

export default router;
