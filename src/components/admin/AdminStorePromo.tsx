import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Send, Wand2, Copy, RefreshCw } from 'lucide-react';
import type { Product } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';

/**
 * Plantillas de campaña para dar a conocer la TIENDA (no un solo producto): Black Friday, Cyber Monday, Navidad, etc.
 * La imagen se dibuja en un lienzo en el navegador. Se puede descargar (para Instagram, TikTok, WhatsApp) o publicar en Facebook.
 */

interface Theme {
  id: string;
  name: string;
  bgA: string; bgB: string; ink: string; soft: string; accent: string; accentInk: string; logo: string;
  eyebrow: string; headline: string; badge: string; cta: string;
}

const THEMES: Theme[] = [
  { id: 'black_friday', name: 'Black Friday', bgA: '#0a0a0a', bgB: '#241c05', ink: '#ffffff', soft: 'rgba(255,255,255,0.72)', accent: '#facc15', accentInk: '#111111', logo: '/images/z/z-black-friday-256.png',
    eyebrow: 'BLACK FRIDAY', headline: 'Ofertas de Black Friday en Zavela Store', badge: 'HASTA -{n}%', cta: 'Compra en zavelastore.com.co' },
  { id: 'cyber_monday', name: 'Cyber Monday', bgA: '#071433', bgB: '#0f3a8a', ink: '#ffffff', soft: 'rgba(255,255,255,0.75)', accent: '#22d3ee', accentInk: '#06202a', logo: '/images/z/z-standard-256.png',
    eyebrow: 'CYBER MONDAY', headline: 'Ofertas de Cyber Monday en Zavela Store', badge: 'HASTA -{n}%', cta: 'Compra en zavelastore.com.co' },
  { id: 'navidad', name: 'Navidad', bgA: '#7f1d1d', bgB: '#14532d', ink: '#ffffff', soft: 'rgba(255,255,255,0.8)', accent: '#fde68a', accentInk: '#3b1a05', logo: '/images/z/z-navidad-fin-ano-256.png',
    eyebrow: 'NAVIDAD EN ZAVELA', headline: 'Ideas de regalo para esta Navidad', badge: 'HASTA -{n}%', cta: 'Pide en zavelastore.com.co' },
  { id: 'conoce', name: 'Conoce la tienda', bgA: '#f5f3ff', bgB: '#ddd6fe', ink: '#1e1b4b', soft: 'rgba(30,27,75,0.72)', accent: '#6d28d9', accentInk: '#ffffff', logo: '/images/z/z-standard-256.png',
    eyebrow: 'CONOCE ZAVELA STORE', headline: 'Compra hoy. Paga cuando te llegue.', badge: 'PAGO CONTRA ENTREGA', cta: 'Visítanos en zavelastore.com.co' }
];

const DEFAULT_CHIPS = ['Envío gratis', 'Pago contra entrega', 'Garantía 30 días'];

type Format = 'square' | 'story';
const SIZES: Record<Format, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: 'Cuadrado (Facebook, Instagram)' },
  story: { w: 1080, h: 1920, label: 'Historia / Reel (1080×1920)' }
};

const isAdultCat = (p: Product) => /sex|adult|er[oó]tic|\+18/i.test(String((p as any).categoryName || (p as any).categoria || ''));
const mainImage = (p: Product) => (Array.isArray(p.images) && p.images[0]) || (p as any).image || '';

const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-hidden focus:border-violet-500';
const label = 'block text-xs font-bold text-slate-600 mb-1';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

interface DrawCfg {
  theme: Theme; eyebrow: string; headline: string; badge: string; cta: string; chips: string[];
  items: { product: Product; img: ImageBitmap | null }[]; logo: ImageBitmap | null; format: Format;
}

function draw(canvas: HTMLCanvasElement, c: DrawCfg) {
  const { w, h } = SIZES[c.format];
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const t = c.theme;
  const FONT = '"Inter","Helvetica Neue",Arial,sans-serif';
  const story = c.format === 'story';
  const M = 64;

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, t.bgA); g.addColorStop(1, t.bgB);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // brillo decorativo
  const rg = ctx.createRadialGradient(w * 0.85, h * 0.1, 10, w * 0.85, h * 0.1, w * 0.7);
  rg.addColorStop(0, t.accent + '44'); rg.addColorStop(1, 'transparent');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);

  // Encabezado: logo + nombre + etiqueta de campaña
  let y = story ? 96 : 52;
  const logoS = story ? 120 : 92;
  if (c.logo) ctx.drawImage(c.logo, M, y, logoS, logoS);
  ctx.fillStyle = t.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `900 ${story ? 44 : 38}px ${FONT}`;
  ctx.fillText('ZAVELA STORE', M + logoS + 20, y + logoS / 2 - (story ? 4 : 2));
  ctx.font = `600 ${story ? 24 : 21}px ${FONT}`; ctx.fillStyle = t.soft;
  ctx.fillText('Colombia · Envíos a todo el país', M + logoS + 20, y + logoS / 2 + (story ? 36 : 30));

  y += logoS + (story ? 70 : 38);
  // etiqueta
  ctx.font = `900 ${story ? 30 : 26}px ${FONT}`;
  const eb = c.eyebrow.toUpperCase();
  const ebW = ctx.measureText(eb).width + 48;
  ctx.fillStyle = t.accent; roundRect(ctx, M, y, ebW, story ? 64 : 54, 32); ctx.fill();
  ctx.fillStyle = t.accentInk; ctx.textBaseline = 'middle';
  ctx.fillText(eb, M + 24, y + (story ? 33 : 28));
  y += (story ? 64 : 54) + (story ? 36 : 22);

  // Titular
  const hs = story ? 104 : 74;
  ctx.font = `900 ${hs}px ${FONT}`; ctx.fillStyle = t.ink; ctx.textBaseline = 'top';
  const lines = wrap(ctx, c.headline, w - M * 2).slice(0, 3);
  for (const ln of lines) { ctx.fillText(ln, M, y); y += hs * 1.04; }
  y += story ? 26 : 14;

  // Insignia grande (descuento / mensaje)
  if (c.badge.trim()) {
    const bs = story ? 76 : 56;
    ctx.font = `900 ${bs}px ${FONT}`;
    const bw = Math.min(w - M * 2, ctx.measureText(c.badge).width + 64);
    const bh = bs + (story ? 42 : 30);
    ctx.fillStyle = t.accent; roundRect(ctx, M, y, bw, bh, 22); ctx.fill();
    ctx.fillStyle = t.accentInk; ctx.textBaseline = 'middle'; ctx.fillText(c.badge, M + 32, y + bh / 2 + 2);
    y += bh + (story ? 48 : 30);
  }

  // Pie fijo (ctas + beneficios) -> se calcula para saber cuánto espacio queda
  const footH = story ? 150 : 104;
  const chipH = story ? 58 : 46;
  const chipsY = h - M - footH - chipH - (story ? 28 : 18);
  const gridBottom = chipsY - (story ? 36 : 22);

  // Productos
  const items = c.items.slice(0, 4);
  if (items.length) {
    const gap = story ? 28 : 22;
    const cols = story ? (items.length >= 3 ? 2 : items.length) : items.length;
    const rows = Math.ceil(items.length / cols);
    const tw = (w - M * 2 - gap * (cols - 1)) / cols;
    const availH = gridBottom - y;
    const th = Math.min(tw * (story ? 1.08 : 1.18), (availH - gap * (rows - 1)) / rows);
    items.forEach((it, i) => {
      const cx = M + (i % cols) * (tw + gap);
      const cy = y + Math.floor(i / cols) * (th + gap);
      ctx.save();
      roundRect(ctx, cx, cy, tw, th, 28); ctx.clip();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx, cy, tw, th);
      if (it.img) drawCover(ctx, it.img, cx, cy, tw, th);
      ctx.restore();
      // descuento arriba a la derecha
      const d = Number((it.product as any).discountPercentage) || 0;
      if (d > 0) {
        const txt = `-${d}%`;
        ctx.font = `900 ${story ? 36 : 28}px ${FONT}`;
        const pw = ctx.measureText(txt).width + 28, ph = story ? 56 : 44;
        ctx.fillStyle = '#e11d48'; roundRect(ctx, cx + tw - pw - 14, cy + 14, pw, ph, ph / 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(txt, cx + tw - pw - 14 + 14, cy + 14 + ph / 2 + 1);
      }
      // precio abajo a la izquierda
      const price = formatCOP(Number(it.product.price) || 0);
      let ps = story ? 38 : 30;
      ctx.font = `900 ${ps}px ${FONT}`;
      while (ps > 16 && ctx.measureText(price).width + 32 > tw - 28) { ps -= 2; ctx.font = `900 ${ps}px ${FONT}`; }
      const prw = ctx.measureText(price).width + 32, prh = story ? 62 : 50;
      ctx.fillStyle = '#111111'; roundRect(ctx, cx + 14, cy + th - prh - 14, prw, prh, prh / 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.fillText(price, cx + 14 + 16, cy + th - prh / 2 - 14 + 1);
    });
  }

  // Beneficios
  const chips = c.chips.filter(Boolean).slice(0, 4);
  ctx.font = `800 ${story ? 28 : 23}px ${FONT}`;
  let x = M;
  for (const ch of chips) {
    const cw = ctx.measureText(`✓ ${ch}`).width + 36;
    if (x + cw > w - M) break;
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.strokeStyle = t.accent; ctx.lineWidth = 2;
    roundRect(ctx, x, chipsY, cw, chipH, chipH / 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = t.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(`✓ ${ch}`, x + 18, chipsY + chipH / 2 + 1);
    x += cw + 14;
  }

  // Barra final
  const fy = h - M - footH + (story ? 10 : 8);
  ctx.fillStyle = t.accent; roundRect(ctx, M, fy, w - M * 2, footH - (story ? 10 : 8), 30); ctx.fill();
  ctx.fillStyle = t.accentInk; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.font = `900 ${story ? 46 : 38}px ${FONT}`;
  ctx.fillText(c.cta, w / 2, fy + (footH - 10) / 2 + 1, w - M * 2 - 40);
  ctx.textAlign = 'left';
}

const imgCache = new Map<string, ImageBitmap | null>();
async function loadImage(url: string, proxy: boolean): Promise<ImageBitmap | null> {
  if (!url) return null;
  if (imgCache.has(url)) return imgCache.get(url) || null;
  try {
    const res = await fetch(proxy ? `/api/admin/social/image-proxy?url=${encodeURIComponent(url)}` : url);
    if (!res.ok) throw new Error('img');
    const bmp = await createImageBitmap(await res.blob());
    imgCache.set(url, bmp);
    return bmp;
  } catch {
    imgCache.set(url, null);
    return null;
  }
}

export const AdminStorePromo: React.FC<{ products: Product[]; onToast: (m: string) => void; onPublished?: () => void }> = ({ products, onToast, onPublished }) => {
  const [themeId, setThemeId] = useState('black_friday');
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const [format, setFormat] = useState<Format>('square');
  const [eyebrow, setEyebrow] = useState(theme.eyebrow);
  const [headline, setHeadline] = useState(theme.headline);
  const [badge, setBadge] = useState(theme.badge);
  const [cta, setCta] = useState(theme.cta);
  const [chips, setChips] = useState(DEFAULT_CHIPS.join(', '));
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfgRef = useRef<DrawCfg | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoPct, setVideoPct] = useState(0);

  const eligible = useMemo(
    () => products.filter(p => p.active !== false && Number(p.stock) !== 0 && !isAdultCat(p) && mainImage(p)),
    [products]
  );
  const onSale = useMemo(
    () => eligible.filter(p => Number((p as any).discountPercentage) > 0 && (p as any).campaignName),
    [eligible]
  );
  const bestDiscount = useMemo(() => onSale.reduce((m, p) => Math.max(m, Number((p as any).discountPercentage) || 0), 0), [onSale]);

  const applyTheme = (id: string) => {
    const t = THEMES.find(x => x.id === id) || THEMES[0];
    setThemeId(id); setEyebrow(t.eyebrow); setHeadline(t.headline); setBadge(t.badge); setCta(t.cta);
  };

  const badgeText = badge.replace('{n}', String(bestDiscount || 20));
  const chosen = useMemo(() => pickedIds.map(id => eligible.find(p => String(p.id) === id)).filter(Boolean) as Product[], [pickedIds, eligible]);

  // Al abrir: si hay campaña activa, se eligen los 4 productos con más descuento (variados por categoría).
  useEffect(() => {
    if (pickedIds.length || eligible.length === 0) return;
    autoPick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible.length]);

  const autoPick = () => {
    const pool = (onSale.length >= 2 ? onSale : eligible).slice().sort((a, b) => (Number((b as any).discountPercentage) || 0) - (Number((a as any).discountPercentage) || 0));
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of pool) {
      const cat = String((p as any).categoryName || '');
      if (seen.has(cat) && pool.length > 8) continue;
      seen.add(cat); out.push(String(p.id));
      if (out.length === 4) break;
    }
    setPickedIds(out);
  };

  const togglePick = (id: string) => setPickedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 4 ? prev : [...prev, id]);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    const timer = setTimeout(async () => {
      const [logo, ...imgs] = await Promise.all([
        loadImage(theme.logo, false).catch(() => null),
        ...chosen.map(p => loadImage(String(mainImage(p)), String(mainImage(p)).startsWith('http')))
      ]);
      if (cancelled || !canvasRef.current) return;
      const cfg: DrawCfg = {
        theme, eyebrow, headline, badge: badgeText, cta,
        chips: chips.split(',').map(s => s.trim()).filter(Boolean),
        items: chosen.map((p, i) => ({ product: p, img: imgs[i] || null })), logo, format
      };
      cfgRef.current = cfg;
      draw(canvasRef.current, cfg);
      setRendering(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [theme, eyebrow, headline, badgeText, cta, chips, chosen, format]);

  // Texto sugerido para la publicación
  useEffect(() => {
    const lines = [
      `🔥 ${eyebrow}`,
      headline,
      badgeText.trim() ? `👉 ${badgeText}` : '',
      '',
      ...chips.split(',').map(s => s.trim()).filter(Boolean).map(s => `✅ ${s}`),
      '',
      '🛍️ Compra en https://zavelastore.com.co'
    ].filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i > 0));
    setCaption(lines.join('\n'));
  }, [eyebrow, headline, badgeText, chips]);

  const download = () => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = `zavela-${themeId}-${format}.png`;
    a.click();
  };

  const publish = async () => {
    if (!canvasRef.current) return;
    if (!window.confirm('Se publicará esta imagen con el texto en la página de Facebook de la tienda. ¿Continuar?')) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/social/publish-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: canvasRef.current.toDataURL('image/jpeg', 0.92), caption, title: `${eyebrow}: ${headline}` })
      });
      const j = await r.json();
      if (!j.success) {
        alert(`No se pudo publicar en Facebook.\n\n${j.result?.message || j.message || ''}\n${j.result?.technicalDetails || ''}`.trim());
      } else {
        onToast(`🚀 Publicado en Facebook (ID ${j.result.postId}).`);
        onPublished?.();
      }
    } catch (e: any) {
      alert(e?.message || 'No se pudo publicar.');
    } finally { setBusy(false); }
  };

  const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b); });

  const sendToTikTok = async (kind: 'photo' | 'video') => {
    const title = `${eyebrow}: ${headline}`;
    let mediaDataUrl = '';
    if (kind === 'photo') {
      if (!canvasRef.current) return;
      mediaDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.92);
    } else {
      if (!videoBlob) return;
      mediaDataUrl = await blobToDataUrl(videoBlob);
    }
    if (!window.confirm(`Se enviará ${kind === 'video' ? 'este video' : 'esta imagen'} con el texto a la cuenta de TikTok vinculada. ¿Continuar?`)) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/social/tiktok/publish-media', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaDataUrl, kind, caption, title })
      });
      const j = await r.json();
      if (!j.success) alert(`No se pudo publicar en TikTok.\n\n${j.result?.message || j.message || ''}`.trim());
      else { onToast(`🎵 ${j.result.message}`); onPublished?.(); }
    } catch (e: any) {
      alert(e?.message || 'No se pudo publicar en TikTok.');
    } finally { setBusy(false); }
  };

  // Video corto vertical (9:16, ~8 s): la tarjeta de la campaña con zoom suave, destello y cierre. Se graba en el navegador.
  const makeVideo = async () => {
    const base = cfgRef.current;
    if (!base) return;
    if (typeof MediaRecorder === 'undefined') { alert('Este navegador no puede grabar video. Usa Chrome o Edge.'); return; }
    setVideoBusy(true); setVideoPct(0);
    if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(''); setVideoBlob(null); }
    try {
      const card = document.createElement('canvas');
      draw(card, { ...base, format: 'story' });
      const W = card.width, H = card.height;
      const out = document.createElement('canvas'); out.width = W; out.height = H;
      const ctx = out.getContext('2d')!;
      const types = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const mime = types.find(t => (MediaRecorder as any).isTypeSupported?.(t)) || '';
      const stream = (out as any).captureStream(30);
      const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 3_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      const done = new Promise<void>(res => { rec.onstop = () => res(); });
      const DUR = 8000;
      rec.start(250);
      const t0 = performance.now();
      await new Promise<void>(resolve => {
        const frame = () => {
          const el = performance.now() - t0;
          const p = Math.min(1, el / DUR);
          const intro = Math.min(1, el / 700);                       // entrada
          const zoom = 1.12 - 0.12 * intro + 0.07 * p;              // acerca suave
          const panX = Math.sin(p * Math.PI) * 14;
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
          ctx.save();
          ctx.globalAlpha = intro;
          ctx.translate(W / 2 + panX, H / 2);
          ctx.scale(zoom, zoom);
          ctx.drawImage(card, -W / 2, -H / 2);
          ctx.restore();
          // destellos que cruzan la tarjeta (a los 2.5 s y 5.5 s)
          for (const c of [0.31, 0.69]) {
            const q = (p - c) / 0.14;
            if (q > 0 && q < 1) {
              const x = -W * 0.3 + q * W * 1.6;
              const g = ctx.createLinearGradient(x - 160, 0, x + 160, H * 0.25);
              g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            }
          }
          // barra de avance fina abajo
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, H - 10, W * p, 10);
          // salida suave
          if (p > 0.94) { ctx.fillStyle = `rgba(0,0,0,${(p - 0.94) / 0.06})`; ctx.fillRect(0, 0, W, H); }
          setVideoPct(Math.round(p * 100));
          if (el >= DUR) resolve(); else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      rec.stop();
      await done;
      const type = mime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
      const blob = new Blob(chunks, { type });
      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      alert(e?.message || 'No se pudo crear el video.');
    } finally { setVideoBusy(false); }
  };

  const downloadVideo = () => {
    if (!videoUrl || !videoBlob) return;
    const a = document.createElement('a');
    a.href = videoUrl; a.download = `zavela-${themeId}.${videoBlob.type.includes('mp4') ? 'mp4' : 'webm'}`; a.click();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-6">
      <div className="space-y-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">1. Elige la plantilla</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => applyTheme(t.id)}
                className={`rounded-xl border-2 p-2 text-left cursor-pointer ${themeId === t.id ? 'border-violet-600' : 'border-slate-200'}`}>
                <div className="h-10 rounded-lg mb-1.5" style={{ background: `linear-gradient(135deg, ${t.bgA}, ${t.bgB})`, boxShadow: `inset 0 -6px 0 ${t.accent}` }} />
                <span className="text-xs font-bold text-slate-800">{t.name}</span>
              </button>
            ))}
          </div>
          <div>
            <label className={label}>Formato</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(SIZES) as Format[]).map(f => (
                <button key={f} onClick={() => setFormat(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${format === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>{SIZES[f].label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">2. Textos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={label}>Etiqueta</label><input className={input} value={eyebrow} maxLength={34} onChange={e => setEyebrow(e.target.value)} /></div>
            <div><label className={label}>Mensaje grande (usa {'{n}'} para el descuento)</label><input className={input} value={badge} maxLength={30} onChange={e => setBadge(e.target.value)} /></div>
            <div className="sm:col-span-2"><label className={label}>Titular</label><input className={input} value={headline} maxLength={70} onChange={e => setHeadline(e.target.value)} /></div>
            <div><label className={label}>Beneficios (separados por coma)</label><input className={input} value={chips} onChange={e => setChips(e.target.value)} /></div>
            <div><label className={label}>Texto de la barra final</label><input className={input} value={cta} maxLength={40} onChange={e => setCta(e.target.value)} /></div>
          </div>
          {bestDiscount > 0 && <p className="text-[11px] text-slate-500">El "{'{n}'}" toma el descuento más alto de la campaña activa: -{bestDiscount}%.</p>}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-extrabold text-slate-900">3. Productos que se muestran ({chosen.length}/4)</h3>
            <div className="flex gap-2">
              <button onClick={autoPick} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold cursor-pointer"><Wand2 className="w-3.5 h-3.5" /> Elegir los mejores descuentos</button>
              <button onClick={() => setPickedIds([])} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">Quitar todos</button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">No se incluyen productos de la zona +18. Con campaña activa, aparece el precio de campaña y el % de descuento en cada foto.</p>
          <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
            {(onSale.length ? [...onSale, ...eligible.filter(p => !onSale.includes(p))] : eligible).slice(0, 150).map(p => {
              const on = pickedIds.includes(String(p.id));
              const d = Number((p as any).discountPercentage) || 0;
              return (
                <button key={p.id} onClick={() => togglePick(String(p.id))}
                  className={`flex items-center gap-2 text-left rounded-lg border p-1.5 cursor-pointer ${on ? 'border-violet-600 bg-violet-50' : 'border-slate-200'}`}>
                  <img src={String(mainImage(p))} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-md object-cover shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold text-slate-900 truncate">{p.title}</span>
                    <span className="block text-[10px] text-slate-500">{formatCOP(Number(p.price) || 0)}{d > 0 ? ` · -${d}%` : ''}</span>
                  </span>
                  <span className={`w-4 h-4 rounded border shrink-0 ${on ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">4. Texto de la publicación</h3>
          <textarea className={`${input} min-h-[140px] font-mono text-xs`} value={caption} onChange={e => setCaption(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { navigator.clipboard?.writeText(caption); onToast('Texto copiado.'); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer"><Copy className="w-3.5 h-3.5" /> Copiar texto</button>
          </div>
        </div>
      </div>

      <div className="xl:sticky xl:top-4 self-start space-y-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Vista previa</h3>
            {rendering && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
          </div>
          <canvas ref={canvasRef} className="w-full h-auto rounded-xl border border-slate-200 bg-slate-100" style={{ maxHeight: format === 'story' ? 640 : undefined, objectFit: 'contain' }} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={download} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black cursor-pointer"><Download className="w-4 h-4" /> Descargar PNG</button>
            <button onClick={publish} disabled={busy || rendering} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1877F2] text-white text-xs font-black disabled:opacity-60 cursor-pointer"><Send className="w-4 h-4" /> {busy ? 'Publicando…' : 'Publicar en Facebook'}</button>
          </div>
          <button onClick={() => sendToTikTok('photo')} disabled={busy || rendering} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-black text-cyan-300 border border-cyan-400/40 text-xs font-black disabled:opacity-60 cursor-pointer"><Send className="w-4 h-4" /> {busy ? 'Enviando…' : 'Publicar imagen en TikTok'}</button>
          <p className="text-[11px] text-slate-500">Para Instagram o WhatsApp descarga el PNG y súbelo desde la app. Facebook y TikTok se publican desde aquí.</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">Video corto para TikTok</h3>
          <p className="text-[11px] text-slate-500">Crea un video vertical de unos 8 segundos con la campaña elegida (zoom suave, destellos y cierre). Se genera en tu navegador; el texto de la publicación es el del paso 4.</p>
          {videoUrl && <video src={videoUrl} controls loop playsInline className="w-full rounded-xl border border-slate-200 bg-black" style={{ maxHeight: 520 }} />}
          <button onClick={makeVideo} disabled={videoBusy || rendering} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-black disabled:opacity-60 cursor-pointer"><Wand2 className="w-4 h-4" /> {videoBusy ? `Creando video… ${videoPct}%` : (videoUrl ? 'Crear otro video' : 'Crear video (8 s)')}</button>
          {videoUrl && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={downloadVideo} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black cursor-pointer"><Download className="w-4 h-4" /> Descargar video</button>
              <button onClick={() => sendToTikTok('video')} disabled={busy} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-black text-cyan-300 border border-cyan-400/40 text-xs font-black disabled:opacity-60 cursor-pointer"><Send className="w-4 h-4" /> {busy ? 'Enviando…' : 'Publicar video en TikTok'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
