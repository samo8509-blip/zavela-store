/**
 * Envío de alertas por correo (SMTP) sin dependencias externas.
 *
 * Configuración por variables de entorno del servidor (nunca desde el navegador):
 *   SMTP_HOST      p. ej. mail.zavelastore.com.co  (o smtp.gmail.com)
 *   SMTP_PORT      465 (SSL, por defecto) o 587 (STARTTLS)
 *   SMTP_SECURE    opcional: 'true' fuerza SSL directo en un puerto distinto de 465
 *   SMTP_USER      p. ej. alertas@zavelastore.com.co
 *   SMTP_PASS      contraseña de esa cuenta (o contraseña de aplicación de Gmail)
 *   ALERT_EMAIL_FROM  opcional; por defecto SMTP_USER
 *   ALERT_EMAIL_TO    opcional; el correo destino también se puede definir en el admin
 */
import net from 'node:net';
import tls from 'node:tls';
import { db } from '../db.ts';
import { getPrivateConfig } from './privateConfig.ts';

export interface EmailResult {
  sent: boolean;
  reason?: string;
}

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

export function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(String(v || '').trim());
}

export function maskEmail(v: string): string {
  const [u, d] = String(v || '').split('@');
  if (!u || !d) return '';
  return `${u.slice(0, 2)}${'*'.repeat(Math.max(2, u.length - 2))}@${d}`;
}

export function getAlertEmailTo(): string {
  const stored = getPrivateConfig().alertEmail;
  if (stored && isValidEmail(stored)) return stored.trim();
  try {
    const cfg = (db.getSettings() as any).whatsappAlerts?.alertEmail;
    if (cfg && isValidEmail(cfg)) return String(cfg).trim();
  } catch {}
  const env = process.env.ALERT_EMAIL_TO || '';
  return isValidEmail(env) ? env.trim() : '';
}

/** Cuenta de envío: variables de entorno si existen; si no, la guardada desde el admin (MySQL). */
export function getSmtp() {
  const c = getPrivateConfig().smtp || {};
  return {
    host: process.env.SMTP_HOST || c.host || '',
    port: Number(process.env.SMTP_PORT) || Number(c.port) || 465,
    user: process.env.SMTP_USER || c.user || '',
    pass: process.env.SMTP_PASS || c.pass || ''
  };
}

/** Clave de Resend (envío por HTTPS, no necesita puertos de correo). */
export function getResendKey(): string {
  return process.env.RESEND_API_KEY || getPrivateConfig().resendKey || '';
}

/** Hay alguna vía de envío lista: Resend (HTTPS) o SMTP. */
export function isSmtpConfigured(): boolean {
  const c = getSmtp();
  return Boolean(getResendKey() || (c.host && c.user && c.pass));
}

const errText = (e: any): string => {
  const parts = [e?.message, e?.code, ...(Array.isArray(e?.errors) ? e.errors.map((x: any) => x?.code || x?.message) : [])]
    .filter(Boolean);
  return Array.from(new Set(parts)).join(' / ') || 'sin detalle';
};

async function resendSend(key: string, to: string, subject: string, text: string): Promise<void> {
  const from = process.env.ALERT_EMAIL_FROM || 'Alertas Zavela <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) {
    let msg = '';
    try { msg = (await r.json())?.message || ''; } catch {}
    throw new Error(`Resend ${r.status}: ${String(msg).slice(0, 160)}`);
  }
}

const clean = (s: string) => String(s || '').replace(/[\r\n]+/g, ' ').trim();
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const wrap76 = (s: string) => s.replace(/(.{76})/g, '$1\r\n');

/** Cliente SMTP mínimo: conecta, autentica (AUTH LOGIN) y envía un correo de texto. */
function smtpSend(opts: {
  host: string; port: number; secure: boolean; user: string; pass: string; from: string; to: string; subject: string; text: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    let socket: net.Socket | tls.TLSSocket;
    let buf = '';
    let waiter: ((code: number, text: string) => void) | null = null;
    let done = false;

    const fail = (e: Error) => { if (!done) { done = true; try { socket?.destroy(); } catch {} reject(e); } };
    const timer = setTimeout(() => fail(new Error('Tiempo de espera agotado con el servidor de correo.')), 20000);

    const attach = (s: net.Socket | tls.TLSSocket) => {
      socket = s;
      s.setEncoding('utf8');
      s.on('data', (d: string) => {
        buf += d;
        // Una respuesta termina en una línea "NNN texto" (sin guion tras el código).
        const lines = buf.split(/\r?\n/);
        if (lines[lines.length - 1] === '') lines.pop(); else return;
        const last = lines[lines.length - 1] || '';
        if (/^\d{3} /.test(last) || /^\d{3}$/.test(last)) {
          const text = buf; buf = '';
          const w = waiter; waiter = null;
          if (w) w(Number(last.slice(0, 3)), text);
        }
      });
      s.on('error', fail);
      s.on('close', () => { if (!done && waiter) fail(new Error('El servidor cerró la conexión.')); });
    };

    const read = () => new Promise<{ code: number; text: string }>((res) => { waiter = (code, text) => res({ code, text }); });
    const cmd = async (line: string, ok: number[]) => {
      const p = read();
      socket.write(line + '\r\n');
      const r = await p;
      if (!ok.includes(r.code)) throw new Error(`SMTP ${r.code}: ${r.text.trim().slice(0, 160)}`);
      return r;
    };

    const run = async () => {
      const greet = read();
      await greet.then(r => { if (r.code !== 220) throw new Error(`SMTP ${r.code}`); });
      await cmd('EHLO zavelastore.com.co', [250]);
      if (!opts.secure) {
        await cmd('STARTTLS', [220]);
        const upgraded = tls.connect({ socket: socket as net.Socket, host: opts.host, servername: opts.host });
        await new Promise<void>((r, j) => { upgraded.once('secureConnect', () => r()); upgraded.once('error', j); });
        buf = ''; waiter = null;
        attach(upgraded);
        await cmd('EHLO zavelastore.com.co', [250]);
      }
      await cmd('AUTH LOGIN', [334]);
      await cmd(b64(opts.user), [334]);
      await cmd(b64(opts.pass), [235]);
      await cmd(`MAIL FROM:<${opts.from}>`, [250]);
      await cmd(`RCPT TO:<${opts.to}>`, [250, 251]);
      await cmd('DATA', [354]);
      const msg = [
        `From: Alertas Zavela Store <${opts.from}>`,
        `To: <${opts.to}>`,
        `Subject: =?UTF-8?B?${b64(clean(opts.subject))}?=`,
        `Date: ${new Date().toUTCString()}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        wrap76(b64(opts.text)),
        '.'
      ].join('\r\n');
      await cmd(msg, [250]);
      try { socket.write('QUIT\r\n'); } catch {}
    };

    const onConnect = (s: net.Socket | tls.TLSSocket) => {
      attach(s);
      run().then(() => { if (!done) { done = true; clearTimeout(timer); socket.end(); resolve(); } }).catch(e => { clearTimeout(timer); fail(e); });
    };

    if (opts.secure) {
      const s = tls.connect({ host: opts.host, port: opts.port, servername: opts.host });
      s.once('secureConnect', () => onConnect(s));
      s.once('error', fail);
    } else {
      const s = net.connect({ host: opts.host, port: opts.port });
      s.once('connect', () => onConnect(s));
      s.once('error', fail);
    }
  });
}

/** Envía una alerta por correo al destinatario configurado. Nunca lanza: devuelve el resultado. */
export async function sendAlertEmail(subject: string, text: string, toOverride?: string): Promise<EmailResult> {
  const to = toOverride && isValidEmail(toOverride) ? toOverride.trim() : getAlertEmailTo();
  if (!to) return { sent: false, reason: 'No hay correo de destino configurado.' };
  if (!isSmtpConfigured()) return { sent: false, reason: 'Aún no hay cuenta de envío configurada.' };
  const resendKey = getResendKey();
  if (resendKey) {
    try {
      await resendSend(resendKey, to, `[Alertas Zavela] ${subject}`, text);
      return { sent: true };
    } catch (e: any) {
      console.warn('[Alertas por correo] Resend falló:', errText(e));
      return { sent: false, reason: `Error enviando con Resend: ${errText(e)}` };
    }
  }
  const cfg = getSmtp();
  const user = cfg.user;
  const from = (process.env.ALERT_EMAIL_FROM && isValidEmail(process.env.ALERT_EMAIL_FROM) ? process.env.ALERT_EMAIL_FROM : user).trim();
  try {
    await smtpSend({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465 || process.env.SMTP_SECURE === 'true',
      user,
      pass: cfg.pass,
      from,
      to,
      subject: `[Alertas Zavela] ${subject}`,
      text
    });
    return { sent: true };
  } catch (e: any) {
    console.warn('[Alertas por correo] No se pudo enviar:', errText(e));
    return { sent: false, reason: `Error enviando el correo: ${errText(e)}` };
  }
}
