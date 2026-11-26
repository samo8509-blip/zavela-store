import { Router } from 'express';
import { pool } from '../mysqlPool.ts';
import { db } from '../db.ts';
import { buildAuthUrl, newState, consumeState, completeLogin, tiktokConfigured, getTmpMedia } from '../services/tiktokService.ts';

const router = Router();

/** Admin: devuelve el enlace de TikTok para autorizar la cuenta. */
router.get('/api/admin/social/tiktok/auth-url', (_req, res) => {
  if (!tiktokConfigured()) {
    return res.status(400).json({ success: false, message: 'Faltan las variables TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET en Render.' });
  }
  res.json({ success: true, url: buildAuthUrl(newState()) });
});

/** Público (la abre TikTok): solo sirve con el "state" que generó el administrador. */
router.get('/api/admin/social/tiktok/callback', async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;
  try {
    if (error) throw new Error(String(error));
    if (!code || !state || !consumeState(String(state))) throw new Error('Solicitud no válida o vencida. Vuelve a intentar desde el panel.');
    await completeLogin(String(code));
    res.redirect('/admin?tiktok=ok');
  } catch (e: any) {
    res.redirect('/admin?tiktok=error&msg=' + encodeURIComponent(String(e?.message || 'error').slice(0, 120)));
  }
});

/** Público (enlace imposible de adivinar, dura 1 hora): campañas y videos que TikTok debe descargar. Admite Range. */
router.get('/media/tiktok/tmp/:name', (req, res) => {
  const m = getTmpMedia(req.params.name);
  if (!m) return res.status(404).end();
  const total = m.buf.length;
  res.set('Content-Type', m.mime);
  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', 'private, max-age=600');
  const r = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (r && (r[1] || r[2])) {
    const start = r[1] ? parseInt(r[1], 10) : Math.max(0, total - parseInt(r[2], 10));
    const end = r[1] && r[2] ? Math.min(parseInt(r[2], 10), total - 1) : total - 1;
    if (start > end || start >= total) { res.status(416).set('Content-Range', `bytes */${total}`); return res.end(); }
    res.status(206).set('Content-Range', `bytes ${start}-${end}/${total}`).set('Content-Length', String(end - start + 1));
    return res.end(m.buf.subarray(start, end + 1));
  }
  res.set('Content-Length', String(total));
  res.end(m.buf);
});

/** Público: TikTok descarga aquí las fotos del producto (las originales viven en otro dominio que no podemos verificar). */
router.get('/media/tiktok/:id/:n.:ext', async (req, res) => {
  try {
    const id = String(req.params.id);
    const n = Math.max(0, Math.min(9, parseInt(req.params.n, 10) || 0));
    const all: any[] = (db.getProducts() as any[]);
    let p: any = all.find(x => String(x.id) === id);
    if (!p) {
      const [rows]: any = await pool.query('SELECT * FROM productos WHERE id = ? LIMIT 1', [id]);
      if (rows?.[0]) { const { mapSqlRowToProduct } = await import('./products.ts'); p = mapSqlRowToProduct(rows[0]); }
    }
    const imgs: string[] = p ? (Array.isArray(p.images) ? p.images : [p.image]).filter(Boolean) : [];
    const src = imgs[n];
    if (!src || !/^https:\/\//i.test(src)) return res.status(404).end();
    const r = await fetch(src);
    if (!r.ok) return res.status(404).end();
    const buf = Buffer.from(await r.arrayBuffer());
    res.set('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buf);
  } catch {
    res.status(404).end();
  }
});

export default router;
