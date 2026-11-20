/**
 * Candado de la API: sesiones firmadas + reglas de qué rutas son públicas.
 *
 * - Los tokens de sesión van firmados (HMAC) y vencen; ya no sirve inventar uno con el prefijo.
 * - Secreto: variable ADMIN_TOKEN_SECRET; si no existe se crea y guarda en .admin_token_secret.
 * - Todo lo que no esté en la lista pública exige sesión de administrador.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import { getPrivateConfig } from '../services/privateConfig.ts';

const TOKEN_PREFIX = 'zavela_adm_';
const ADVISOR_PREFIX = 'zavela_adv_';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

let cachedSecret = '';
function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const env = process.env.ADMIN_TOKEN_SECRET;
  if (env && env.length >= 16) return (cachedSecret = env);
  const stored = getPrivateConfig().tokenSecret;
  if (stored && stored.length >= 32) return (cachedSecret = stored);
  const file = path.join(process.cwd(), '.admin_token_secret');
  try {
    const v = fs.readFileSync(file, 'utf8').trim();
    if (v.length >= 32) return (cachedSecret = v);
  } catch {}
  const fresh = crypto.randomBytes(32).toString('hex');
  try { fs.writeFileSync(file, fresh, { mode: 0o600 }); } catch {}
  return (cachedSecret = fresh);
}

const b64u = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const sign = (body: string) => crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');

function make(prefix: string, payload: Record<string, any>, ttl: number = TTL_MS): string {
  const body = b64u(JSON.stringify({ ...payload, exp: Date.now() + ttl }));
  return `${prefix}${body}.${sign(prefix + body)}`;
}

function check(prefix: string, token: string): Record<string, any> | null {
  if (!token || !token.startsWith(prefix)) return null;
  const rest = token.slice(prefix.length);
  const dot = rest.lastIndexOf('.');
  if (dot < 0) return null;
  const body = rest.slice(0, dot);
  const sig = rest.slice(dot + 1);
  const expected = sign(prefix + body);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return data && data.exp > Date.now() ? data : null;
  } catch { return null; }
}

export const signAdminToken = (user: { id: any; email?: string }) => make(TOKEN_PREFIX, { id: user.id, email: user.email || '' });
export const signAdvisorToken = (advisor: { id: any }) => make(ADVISOR_PREFIX, { id: advisor.id });
export const verifyAdminToken = (t: string) => check(TOKEN_PREFIX, t);
export const verifyAdvisorToken = (t: string) => check(ADVISOR_PREFIX, t);

// Enlace de recuperación de clave: firmado, vence en 1 hora y deja de servir cuando la clave cambia (fp).
const RESET_PREFIX = 'zavela_rst_';
export const signResetToken = (advisorId: string, fp: string) => make(RESET_PREFIX, { id: advisorId, fp }, 60 * 60 * 1000);
export const verifyResetToken = (t: string) => check(RESET_PREFIX, t);

// Enlace de pago que se le envía al cliente (vence en 7 días).
const PAY_PREFIX = 'zavela_pay_';
export const signPayToken = (orderId: string) => make(PAY_PREFIX, { id: orderId }, 7 * 24 * 60 * 60 * 1000);
export const verifyPayToken = (t: string) => check(PAY_PREFIX, t);

function readToken(req: Request): string {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7).trim();
  // Solo para descargas directas de respaldos (enlaces que no pueden llevar cabeceras).
  if (req.method === 'GET' && /^\/api\/(admin\/)?backups?(\/|$)/.test(req.path) && typeof req.query.token === 'string') return req.query.token;
  return '';
}

type Rule = { method: string | '*'; re: RegExp; access: 'public' | 'advisor' | 'admin' };
const rules: Rule[] = [
  // Lo que necesita la tienda pública (lectura) y formularios de visitantes
  { method: 'GET', re: /^\/api\/admin\/settings$/, access: 'public' },          // la ruta entrega versión sin secretos
  { method: 'GET', re: /^\/api\/admin\/categories$/, access: 'public' },
  { method: 'GET', re: /^\/api\/admin\/products(\/[^/]+)?$/, access: 'public' },
  { method: 'GET', re: /^\/api\/admin\/orders$/, access: 'public' },            // seguimiento: la ruta limita lo que devuelve
  { method: 'POST', re: /^\/api\/admin\/maintenance\/notify-lead$/, access: 'public' },
  { method: 'POST', re: /^\/api\/admin\/newsletter\/generate-template$/, access: 'public' },
  { method: 'POST', re: /^\/api\/admin\/advisors\/login$/, access: 'public' },
  { method: 'POST', re: /^\/api\/admin\/advisors\/(forgot|reset)-password$/, access: 'public' },
  { method: 'GET', re: /^\/api\/(advisors|products)\/?$/, access: 'public' },
  { method: 'GET', re: /^\/api\/products\/[^/]+$/, access: 'public' },
  { method: 'GET', re: /^\/api\/orders\/(track\/[^/]+|(?!calendar$)[^/]+)$/, access: 'public' },
  { method: 'POST', re: /^\/api\/orders\/?$/, access: 'public' },
  { method: 'POST', re: /^\/api\/customers\/?$/, access: 'public' },           // registro de clientes
  { method: 'POST', re: /^\/api\/alerts\/(send|human-request|new-order)$/, access: 'public' }, // la ruta limita qué se acepta
  // Portal de asesores
  { method: 'POST', re: /^\/api\/admin\/advisors\/me\/presence$/, access: 'advisor' },
  { method: 'POST', re: /^\/api\/admin\/advisors\/me\/password$/, access: 'advisor' },
  { method: 'GET', re: /^\/api\/admin\/advisors\/me\/(statement|ranking)$/, access: 'advisor' },
  { method: 'GET', re: /^\/api\/advisors\/next$/, access: 'public' },
  { method: '*', re: /^\/api\/admin\/advisor-sales(\/.*)?$/, access: 'advisor' },
  // Protegido (administrador)
  { method: '*', re: /^\/api\/(admin|backups)(\/|$)/, access: 'admin' },
  { method: '*', re: /^\/api\/dropi(\/|$)/, access: 'admin' },
  { method: '*', re: /^\/api\/customers(\/|$)/, access: 'admin' },
  { method: '*', re: /^\/api\/alerts(\/|$)/, access: 'admin' },
  { method: '*', re: /^\/api\/advisors(\/|$)/, access: 'admin' },
  { method: '*', re: /^\/api\/products(\/|$)/, access: 'admin' },
  { method: '*', re: /^\/api\/categories(\/|$)/, access: 'admin' },
  { method: '*', re: /^\/api\/orders(\/|$)/, access: 'admin' },
  { method: '*', re: /^\/api\/whatsapp\/(simulate-message|test-handshake|webhook-info)$/, access: 'admin' }
];

export function apiGuard(req: Request, res: Response, next: NextFunction) {
  const url = req.originalUrl.split('?')[0];
  const rule = rules.find(r => (r.method === '*' || r.method === req.method) && r.re.test(url));
  // GET de categorías públicas (/api/categories) también las lee la tienda
  const isPublicCategories = req.method === 'GET' && /^\/api\/categories\/?$/.test(url);
  const access = isPublicCategories ? 'public' : (rule ? rule.access : 'public');

  const token = readToken(req);
  const admin = verifyAdminToken(token);
  const advisor = verifyAdvisorToken(token);
  (res.locals as any).isAdmin = Boolean(admin);
  (res.locals as any).isAdvisor = Boolean(advisor);

  if (access === 'public') return next();
  if (access === 'advisor' && (admin || advisor)) return next();
  if (access === 'admin' && admin) return next();
  return res.status(401).json({ success: false, message: 'Sesión no válida o expirada. Inicia sesión de nuevo.' });
}
