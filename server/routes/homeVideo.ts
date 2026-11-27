import { Router } from 'express';
import { nativePool } from '../mysqlPool.ts';

/**
 * Video de la portada de la tienda.
 * Render gratis no conserva archivos, así que el video (ya comprimido, ~5 MB) se guarda en MySQL en trozos de 512 KB
 * (así no depende del límite de paquete de cada hosting) y se sirve con soporte de Range, que Safari/iPhone exige para reproducir.
 */
const CHUNK = 512 * 1024;
let tableReady = false;

async function ensureTables() {
  if (tableReady || !nativePool) return;
  await nativePool.query(`CREATE TABLE IF NOT EXISTS home_video_meta (
    id TINYINT NOT NULL PRIMARY KEY, size INT NOT NULL, title VARCHAR(160) NOT NULL DEFAULT '', version BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await nativePool.query(`CREATE TABLE IF NOT EXISTS home_video_chunks (
    idx INT NOT NULL PRIMARY KEY, data MEDIUMBLOB NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  tableReady = true;
}

let cache: { version: number; buf: Buffer } | null = null;

export async function getHomeVideoInfo(): Promise<{ exists: boolean; title: string; version: number; size: number }> {
  if (!nativePool) return { exists: false, title: '', version: 0, size: 0 };
  await ensureTables();
  const [rows]: any = await nativePool.query('SELECT size, title, version FROM home_video_meta WHERE id = 1');
  if (!rows?.length) return { exists: false, title: '', version: 0, size: 0 };
  return { exists: true, title: String(rows[0].title || ''), version: Number(rows[0].version), size: Number(rows[0].size) };
}

export async function saveHomeVideo(buf: Buffer, title: string): Promise<void> {
  if (!nativePool) throw new Error('La base de datos no está conectada: no se puede guardar el video.');
  await ensureTables();
  const conn = await nativePool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM home_video_chunks');
    for (let i = 0, idx = 0; i < buf.length; i += CHUNK, idx++) {
      await conn.query('INSERT INTO home_video_chunks (idx, data) VALUES (?, ?)', [idx, buf.subarray(i, i + CHUNK)]);
    }
    await conn.query(
      'REPLACE INTO home_video_meta (id, size, title, version) VALUES (1, ?, ?, ?)',
      [buf.length, String(title || '').slice(0, 160), Date.now()]
    );
    await conn.commit();
    cache = null;
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    conn.release();
  }
}

export async function deleteHomeVideo(): Promise<void> {
  if (!nativePool) return;
  await ensureTables();
  await nativePool.query('DELETE FROM home_video_chunks');
  await nativePool.query('DELETE FROM home_video_meta WHERE id = 1');
  cache = null;
}

async function loadBuffer(): Promise<{ version: number; buf: Buffer } | null> {
  const info = await getHomeVideoInfo();
  if (!info.exists) return null;
  if (cache && cache.version === info.version) return cache;
  const [rows]: any = await nativePool!.query('SELECT data FROM home_video_chunks ORDER BY idx');
  const buf = Buffer.concat(rows.map((r: any) => r.data as Buffer));
  cache = { version: info.version, buf };
  return cache;
}

const router = Router();

router.get('/api/home-video/info', async (_req, res) => {
  try {
    const i = await getHomeVideoInfo();
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ success: true, exists: i.exists, title: i.title, version: i.version });
  } catch {
    res.json({ success: true, exists: false, title: '', version: 0 });
  }
});

router.get('/api/home-video', async (req, res) => {
  try {
    const v = await loadBuffer();
    if (!v) return res.status(404).end();
    const total = v.buf.length;
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('ETag', `"hv-${v.version}"`);
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    if (range) {
      let start = range[1] ? parseInt(range[1], 10) : 0;
      let end = range[2] ? parseInt(range[2], 10) : total - 1;
      if (!range[1] && range[2]) { start = Math.max(0, total - parseInt(range[2], 10)); end = total - 1; } // últimos N bytes
      end = Math.min(end, total - 1);
      if (start > end || start >= total) { res.setHeader('Content-Range', `bytes */${total}`); return res.status(416).end(); }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', String(end - start + 1));
      return res.end(v.buf.subarray(start, end + 1));
    }
    res.setHeader('Content-Length', String(total));
    res.end(v.buf);
  } catch {
    res.status(500).end();
  }
});

export default router;
