import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { handoffToAdvisor } from '../services/humanHandoff.ts';
import { clientIp } from '../services/publicOrder.ts';

/**
 * GET /hablar-con-asesor  (público)
 * Enlace fijo para agentes externos (WAI) que solo pueden entregar un link:
 * al abrirlo se envía al cliente al WhatsApp del siguiente asesor CONECTADO (reparto rotativo).
 * Si no hay nadie conectado muestra una página amable con la línea oficial.
 * Parámetros opcionales: ?n=NombreDelCliente&p=ProductoDeInteres
 */
const router = Router();

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

router.get('/', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  try {
    const s: any = db.getSettings() || {};
    const raw = String(s.whatsappSettings?.phoneNumber || s.whatsappNumber || '').replace(/\D/g, '');
    const official = raw.length === 10 && raw.startsWith('3') ? `57${raw}` : raw;
    const name = String(req.query.n || '').slice(0, 60);
    const product = String(req.query.p || '').slice(0, 100);
    const r = await handoffToAdvisor({
      ip: clientIp(req), customerName: name, message: 'Cliente pidió una persona desde el chat de la tienda (enlace).',
      page: 'Chat WAI', officialNumber: official, viewedProducts: product ? [product] : []
    });
    if (r.connected) return res.redirect(302, r.whatsappUrl);
    const link = official ? r.whatsappUrl : '';
    res.status(200).type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zavela Store · Asesores</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#0b1020;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
.c{max-width:420px;background:#141b34;border:1px solid #27325a;border-radius:20px;padding:28px;text-align:center}
a.b{display:inline-block;margin-top:16px;padding:14px 22px;border-radius:14px;background:#22c55e;color:#04210f;font-weight:800;text-decoration:none}
a.s{display:block;margin-top:14px;color:#8fb4ff;font-size:13px}</style></head><body><div class="c">
<h2 style="margin:0 0 8px">Zavela Store</h2>
<p style="color:#c9d3f5;line-height:1.5">Ahora mismo nuestros asesores no están conectados 😊.<br>Atendemos de 8:00 a.m. a 8:00 p.m. ${link ? 'Escríbenos y te responden en cuanto haya uno disponible.' : 'Intenta de nuevo en unos minutos.'}</p>
${link ? `<a class="b" href="${esc(link)}">Escribir por WhatsApp</a>` : ''}
<a class="s" href="/">Volver a la tienda</a></div></body></html>`);
  } catch {
    res.redirect(302, '/');
  }
});

export default router;
