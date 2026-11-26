/**
 * TikTok: inicio de sesión (Login Kit) y publicación de fotos (Content Posting API, Direct Post).
 * Variables en Render: TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET (nunca en el código).
 * Opcional: TIKTOK_REDIRECT_URI (por defecto la de zavelastore.com.co).
 */
import crypto from 'node:crypto';
import { pool } from '../mysqlPool.ts';

const API = 'https://open.tiktokapis.com';
export const TIKTOK_SITE = (process.env.PUBLIC_SITE_URL || 'https://zavelastore.com.co').replace(/\/$/, '');
export const TIKTOK_REDIRECT = process.env.TIKTOK_REDIRECT_URI || `${TIKTOK_SITE}/api/admin/social/tiktok/callback`;
const SCOPES = 'user.info.basic,video.publish';

export const tiktokConfigured = () => Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);

// "state" anti-falsificación: solo vale el que generó el administrador, una vez y por 10 minutos.
const pendingStates = new Map<string, number>();
export function newState(): string {
  const s = crypto.randomBytes(16).toString('hex');
  pendingStates.set(s, Date.now() + 10 * 60 * 1000);
  for (const [k, v] of pendingStates) if (v < Date.now()) pendingStates.delete(k);
  return s;
}
export function consumeState(s: string): boolean {
  const exp = pendingStates.get(s);
  pendingStates.delete(s);
  return !!exp && exp > Date.now();
}

export function buildAuthUrl(state: string): string {
  const q = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY || '',
    scope: SCOPES,
    response_type: 'code',
    redirect_uri: TIKTOK_REDIRECT,
    state
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${q.toString()}`;
}

async function tokenRequest(params: Record<string, string>): Promise<any> {
  const r = await fetch(`${API}/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || '',
      client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
      ...params
    }).toString()
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error || !j.access_token) throw new Error(j.error_description || j.error || `TikTok respondió ${r.status}`);
  return j;
}

async function saveTokens(t: any, extra: Record<string, any> = {}) {
  const prev = (await pool.getSocialConnection('tiktok')) || {};
  const conn = {
    ...prev,
    ...extra,
    platform: 'tiktok',
    connected: true,
    status: 'connected',
    autoPostEnabled: prev.autoPostEnabled ?? true,
    accessToken: t.access_token,
    refreshToken: t.refresh_token || prev.refreshToken,
    openId: t.open_id || prev.openId,
    accountId: t.open_id || prev.accountId,
    expiresAt: Date.now() + Number(t.expires_in || 86400) * 1000,
    refreshExpiresAt: Date.now() + Number(t.refresh_expires_in || 31536000) * 1000,
    scope: t.scope || prev.scope,
    lastSyncAt: new Date().toISOString()
  };
  await pool.setSocialConnection('tiktok', conn);
  return conn;
}

export async function completeLogin(code: string) {
  const t = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: TIKTOK_REDIRECT });
  let name = '';
  try {
    const r = await fetch(`${API}/v2/user/info/?fields=open_id,display_name`, { headers: { Authorization: `Bearer ${t.access_token}` } });
    const j: any = await r.json();
    name = j?.data?.user?.display_name || '';
  } catch { /* el nombre es solo informativo */ }
  return saveTokens(t, name ? { accountName: name } : {});
}

/** Devuelve un token vigente; si venció (dura 24 h) lo renueva con el refresh token. */
export async function getValidToken(): Promise<{ token: string; conn: any }> {
  let conn: any = await pool.getSocialConnection('tiktok');
  if (!conn?.connected || !conn.accessToken) throw new Error('TikTok no está vinculado.');
  if (conn.expiresAt && conn.expiresAt - Date.now() < 5 * 60 * 1000) {
    if (!conn.refreshToken) throw new Error('La sesión de TikTok venció: vuelve a vincular la cuenta.');
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: conn.refreshToken });
    conn = await saveTokens(t);
  }
  return { token: conn.accessToken, conn };
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Publica el producto como publicación de fotos. Las fotos se sirven desde zavelastore.com.co (dominio verificado en TikTok). */
export async function publishProductPhotos(product: any, caption?: string): Promise<{ success: boolean; message: string; publishId?: string }> {
  if (!tiktokConfigured()) return { success: false, message: 'Faltan TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET en Render.' };
  try {
    const { token } = await getValidToken();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' };
    const imgs: string[] = (Array.isArray(product.images) ? product.images : [product.image]).filter(Boolean).slice(0, 10);
    if (!imgs.length) return { success: false, message: 'El producto no tiene fotos.' };
    const photos = imgs.map((u, i) => {
      const m = /\.(jpe?g|webp|png)(?:\?|$)/i.exec(u);
      return `${TIKTOK_SITE}/media/tiktok/${encodeURIComponent(String(product.id))}/${i}.${(m ? m[1] : 'jpg').toLowerCase()}`;
    });

    // Privacidad: TikTok solo permite las opciones que devuelve para la cuenta (en pruebas, solo "SELF_ONLY").
    const ci = await fetch(`${API}/v2/post/publish/creator_info/query/`, { method: 'POST', headers, body: '{}' });
    const cj: any = await ci.json().catch(() => ({}));
    if (cj?.error?.code && cj.error.code !== 'ok') return { success: false, message: `TikTok: ${cj.error.message || cj.error.code}` };
    const options: string[] = cj?.data?.privacy_level_options || ['SELF_ONLY'];
    const privacy = options.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : options[0];

    const title = clip(String(product.title || product.nombre || 'Producto'), 90);
    const description = clip(String(caption || title), 3900);
    const r = await fetch(`${API}/v2/post/publish/content/init/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        post_info: { title, description, privacy_level: privacy, disable_comment: false, auto_add_music: true },
        source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: photos },
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO'
      })
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok || (j?.error?.code && j.error.code !== 'ok')) {
      return { success: false, message: `TikTok: ${j?.error?.message || j?.error?.code || r.status}` };
    }
    const note = privacy === 'SELF_ONLY' ? ' (queda privada: la app aún no pasó la auditoría de TikTok)' : '';
    return { success: true, message: `Enviado a TikTok${note}.`, publishId: j?.data?.publish_id };
  } catch (e: any) {
    return { success: false, message: e?.message || 'No se pudo publicar en TikTok.' };
  }
}
