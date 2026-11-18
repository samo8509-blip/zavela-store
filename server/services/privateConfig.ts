/**
 * Configuración privada del servidor guardada en MySQL (tabla `configuraciones`, clave `private_config`).
 * Sirve cuando no se pueden definir variables de entorno (p. ej. AI Studio):
 *   - smtp: cuenta de envío de correo de las alertas
 *   - tokenSecret: clave de firma de sesiones (se genera sola la primera vez)
 *   - alertEmail: correo que recibe las alertas
 * Nunca se envía al navegador: las rutas solo devuelven datos enmascarados.
 * Las variables de entorno, si existen, tienen prioridad.
 */
import crypto from 'node:crypto';
import { pool } from '../mysqlPool.ts';

export interface SmtpConfig { host?: string; port?: number; user?: string; pass?: string }
export interface PrivateConfig { smtp?: SmtpConfig; tokenSecret?: string; alertEmail?: string }

const KEY = 'private_config';
let cache: PrivateConfig = {};

export const getPrivateConfig = (): PrivateConfig => cache;

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout MySQL')), ms))]);

export async function loadPrivateConfig(): Promise<void> {
  try {
    const [rows]: any = await withTimeout(pool.query('SELECT valor FROM configuraciones WHERE clave = ?', [KEY]), 8000);
    if (Array.isArray(rows) && rows[0]?.valor) cache = JSON.parse(rows[0].valor) || {};
  } catch (e: any) {
    console.warn('[PrivateConfig] No se pudo leer de MySQL:', e?.message);
  }
}

export async function savePrivateConfig(patch: PrivateConfig): Promise<boolean> {
  cache = { ...cache, ...patch };
  try {
    await withTimeout(pool.query(
      `INSERT INTO configuraciones (clave, valor, updated_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()`,
      [KEY, JSON.stringify(cache)]
    ), 8000);
    return true;
  } catch (e: any) {
    console.warn('[PrivateConfig] No se pudo guardar en MySQL:', e?.message);
    return false;
  }
}

/** Crea y guarda una clave de firma persistente si no hay una (ni en variable de entorno ni en MySQL). */
export async function ensureTokenSecret(): Promise<void> {
  if ((process.env.ADMIN_TOKEN_SECRET || '').length >= 16) return;
  if ((cache.tokenSecret || '').length >= 32) return;
  await savePrivateConfig({ tokenSecret: crypto.randomBytes(32).toString('hex') });
}
