import { Router } from 'express';
import { nativePool } from '../mysqlPool.ts';

const router = Router();

/**
 * Visitas reales de productos.
 * - Tabla diaria (una fila por día y producto) en MySQL; si no hay MySQL, queda en configuraciones como respaldo.
 * - El visitante manda una visita por producto y sesión (la tienda lo controla); el servidor además limita a 1 por IP+producto cada 10 min
 *   y descarta robots, para que las cifras no se inflen.
 */
let tableReady = false;
async function ensureTable() {
  if (tableReady || !nativePool) return;
  await nativePool.query(`
    CREATE TABLE IF NOT EXISTS product_views_daily (
      day DATE NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      views INT NOT NULL DEFAULT 0,
      seconds INT NOT NULL DEFAULT 0,
      timed_views INT NOT NULL DEFAULT 0,
      PRIMARY KEY (day, product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tableReady = true;
}

const recent = new Map<string, number>();
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|monitor|uptime|curl|wget|python-requests/i;

function today(): string {
  // Día en hora de Colombia (UTC-5)
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

router.post('/api/track/view', async (req, res) => {
  try {
    const pid = String(req.body?.productId || '').slice(0, 64);
    if (!pid || !/^[\w.\-]+$/.test(pid)) return res.json({ ok: false });
    const ua = String(req.headers['user-agent'] || '');
    if (!ua || BOT.test(ua)) return res.json({ ok: true, skipped: 'bot' });
    const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const key = `${ip}|${pid}`;
    const now = Date.now();
    if ((recent.get(key) || 0) > now - 10 * 60 * 1000) return res.json({ ok: true, skipped: 'repetida' });
    recent.set(key, now);
    if (recent.size > 20000) for (const [k, v] of recent) if (v < now - 10 * 60 * 1000) recent.delete(k);

    if (!nativePool) return res.json({ ok: true, skipped: 'sin-base-de-datos' });
    await ensureTable();
    await nativePool.query(
      'INSERT INTO product_views_daily (day, product_id, views) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE views = views + 1',
      [today(), pid]
    );
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

/** Tiempo en el producto (segundos) al salir. Se promedia en el panel. */
router.post('/api/track/time', async (req, res) => {
  try {
    const pid = String(req.body?.productId || '').slice(0, 64);
    const sec = Math.round(Number(req.body?.seconds) || 0);
    if (!pid || !/^[\w.\-]+$/.test(pid) || sec < 2 || sec > 1800) return res.json({ ok: false });
    if (!nativePool) return res.json({ ok: true, skipped: 'sin-base-de-datos' });
    await ensureTable();
    await nativePool.query(
      'INSERT INTO product_views_daily (day, product_id, seconds, timed_views) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE seconds = seconds + VALUES(seconds), timed_views = timed_views + 1',
      [today(), pid, sec]
    );
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

/** Solo administrador (apiGuard): visitas por producto en un rango. range = today | 7d | 30d | all */
router.get('/api/admin/metrics/views', async (req, res) => {
  try {
    const range = String(req.query.range || 'today');
    if (!nativePool) return res.json({ success: true, available: false, products: [], totalViews: 0 });
    await ensureTable();
    const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 0;
    const from = days ? new Date(Date.now() - 5 * 3600 * 1000 - (days - 1) * 86400000).toISOString().slice(0, 10) : '2000-01-01';
    const [rows]: any = await nativePool.query(
      'SELECT product_id, SUM(views) AS views, SUM(seconds) AS seconds, SUM(timed_views) AS timed FROM product_views_daily WHERE day >= ? GROUP BY product_id ORDER BY views DESC',
      [from]
    );
    const products = (rows as any[]).map(r => ({
      productId: String(r.product_id),
      views: Number(r.views) || 0,
      avgSeconds: Number(r.timed) > 0 ? Math.round(Number(r.seconds) / Number(r.timed)) : 0
    }));
    res.json({ success: true, available: true, from, products, totalViews: products.reduce((a, p) => a + p.views, 0) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'No se pudieron leer las visitas.' });
  }
});

export default router;
