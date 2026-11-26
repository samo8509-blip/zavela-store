/**
 * Video corto vertical (1080×1920) con escenas, voz y música, todo generado en el navegador.
 * Voz: la que genere la IA (servidor) o la grabada con el micrófono. Música: sintetizada aquí (sin derechos) o un archivo propio.
 */
export interface VidTheme { bgA: string; bgB: string; ink: string; soft: string; accent: string; accentInk: string }
export interface VidItem { img: ImageBitmap | null; title: string; price: string; discount: number }
export interface VidCfg {
  theme: VidTheme; eyebrow: string; headline: string; badge: string; cta: string; chips: string[];
  items: VidItem[]; logo: ImageBitmap | null;
  /** Imagen de portada: es lo primero que se ve (y la miniatura en TikTok). */
  cover?: ImageBitmap | null;
}
export const COVER_SECS = 1.6;
const VOICE_START = 0.4;
export interface VidAudio { voice: AudioBuffer | null; music: boolean; musicBuf: AudioBuffer | null; script?: string }

const W = 1080, H = 1920;
const FONT = '"Inter","Helvetica Neue",Arial,sans-serif';
const ease = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const clamp = (t: number) => Math.max(0, Math.min(1, t));

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function bg(ctx: CanvasRenderingContext2D, t: VidTheme, k: number) {
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, t.bgA); g.addColorStop(1, t.bgB);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cx = W * (0.2 + 0.6 * k);
  const rg = ctx.createRadialGradient(cx, H * 0.18, 10, cx, H * 0.18, W * 0.8);
  rg.addColorStop(0, t.accent + '55'); rg.addColorStop(1, 'transparent');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
}
function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, bgc: string, ink: string, align: 'left' | 'center' = 'left') {
  ctx.font = `900 ${size}px ${FONT}`; const w = ctx.measureText(text).width + size * 1.1, h = size * 1.7;
  const px = align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = bgc; rr(ctx, px, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(text, px + size * 0.55, y + h / 2 + 2);
  return { w, h };
}
function header(ctx: CanvasRenderingContext2D, c: VidCfg, a: number) {
  ctx.save(); ctx.globalAlpha = a;
  if (c.logo) ctx.drawImage(c.logo, 64, 90, 110, 110);
  ctx.fillStyle = c.theme.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `900 44px ${FONT}`; ctx.fillText('ZAVELA STORE', 196, 130);
  ctx.font = `600 24px ${FONT}`; ctx.fillStyle = c.theme.soft; ctx.fillText('Colombia · Envíos a todo el país', 196, 172);
  ctx.restore();
}

function sceneIntro(ctx: CanvasRenderingContext2D, c: VidCfg, k: number) {
  bg(ctx, c.theme, k * 0.3);
  const a = ease(k * 4);
  header(ctx, c, a);
  // etiqueta de campaña
  ctx.save(); ctx.globalAlpha = ease((k - 0.1) * 4); ctx.translate((1 - ease((k - 0.1) * 3)) * -200, 0);
  pill(ctx, c.eyebrow.toUpperCase(), 64, 330, 40, c.theme.accent, c.theme.accentInk);
  ctx.restore();
  // titular por líneas
  ctx.font = `900 118px ${FONT}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  const lines = wrapText(ctx, c.headline, W - 128).slice(0, 4);
  lines.forEach((ln, i) => {
    const q = ease((k - 0.18 - i * 0.1) * 3.5);
    ctx.save(); ctx.globalAlpha = q; ctx.fillStyle = c.theme.ink; ctx.fillText(ln, 64, 470 + i * 130 + (1 - q) * 60); ctx.restore();
  });
  // insignia con rebote
  if (c.badge.trim()) {
    const q = ease((k - 0.5) * 3); const s = 0.6 + 0.4 * q + (q >= 1 ? Math.sin((k - 0.8) * 18) * 0.02 : 0);
    ctx.save(); ctx.globalAlpha = q; ctx.translate(64, 1180); ctx.scale(s, s);
    pill(ctx, c.badge, 0, 0, 96, c.theme.accent, c.theme.accentInk); ctx.restore();
  }
  // logo grande al fondo
  if (c.logo) { const s = 360 * (0.85 + 0.15 * ease(k * 2)); ctx.save(); ctx.globalAlpha = 0.9 * ease(k * 2); ctx.drawImage(c.logo, W / 2 - s / 2, 1380, s, s); ctx.restore(); }
}

function sceneProduct(ctx: CanvasRenderingContext2D, c: VidCfg, it: VidItem, k: number, idx: number) {
  bg(ctx, c.theme, (idx * 0.25 + k * 0.2) % 1);
  header(ctx, c, 1);
  const inK = ease(k * 5);
  const size = 900, x = (W - size) / 2, y = 300;
  ctx.save(); ctx.translate((1 - inK) * 900, 0);
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 50; ctx.fillStyle = '#ffffff'; rr(ctx, x, y, size, size, 48); ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); rr(ctx, x, y, size, size, 48); ctx.clip();
  if (it.img) {
    const z = 1 + 0.08 * k; const r = Math.max(size / it.img.width, size / it.img.height) * z;
    const dw = it.img.width * r, dh = it.img.height * r;
    ctx.drawImage(it.img, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
  }
  ctx.restore();
  if (it.discount > 0) {
    const bw = 220, bh = 110; ctx.fillStyle = '#dc2626'; rr(ctx, x + size - bw - 24, y + 24, bw, bh, 28); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `900 64px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`-${it.discount}%`, x + size - bw / 2 - 24, y + 24 + bh / 2 + 3);
  }
  ctx.restore();
  // nombre y precio
  const q = ease((k - 0.15) * 4);
  ctx.save(); ctx.globalAlpha = q; ctx.translate(0, (1 - q) * 50);
  ctx.font = `900 62px ${FONT}`; ctx.fillStyle = c.theme.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  wrapText(ctx, it.title, W - 128).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, 64, 1250 + i * 72));
  const pr = 1400 + 20;
  const pop = 1 + (k > 0.3 && k < 0.45 ? Math.sin((k - 0.3) / 0.15 * Math.PI) * 0.08 : 0);
  ctx.translate(64, pr); ctx.scale(pop, pop);
  pill(ctx, it.price, 0, 0, 92, c.theme.accent, c.theme.accentInk);
  ctx.restore();
  // chips
  ctx.save(); ctx.globalAlpha = ease((k - 0.4) * 4); ctx.font = `700 34px ${FONT}`; ctx.fillStyle = c.theme.soft; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(c.chips.slice(0, 3).map(s => '✓ ' + s).join('   '), 64, 1700); ctx.restore();
}

function sceneOutro(ctx: CanvasRenderingContext2D, c: VidCfg, k: number) {
  bg(ctx, c.theme, 0.8);
  header(ctx, c, 1);
  const chips = c.chips.slice(0, 3);
  chips.forEach((ch, i) => {
    const q = ease((k - i * 0.12) * 4); ctx.save(); ctx.globalAlpha = q; ctx.translate((1 - q) * -300, 0);
    pill(ctx, '✓ ' + ch, 64, 420 + i * 150, 56, 'rgba(255,255,255,0.14)', c.theme.ink); ctx.restore();
  });
  // llamado a la acción con pulso
  const pulse = 1 + Math.sin(k * 20) * 0.03 * ease((k - 0.3) * 3);
  ctx.save(); ctx.globalAlpha = ease((k - 0.3) * 3); ctx.translate(W / 2, 1050); ctx.scale(pulse, pulse);
  const t = c.cta; let fs = 64; ctx.font = `900 ${fs}px ${FONT}`;
  while (ctx.measureText(t).width > W - 200 && fs > 30) { fs -= 2; ctx.font = `900 ${fs}px ${FONT}`; }
  const w = ctx.measureText(t).width + 100, h = 150;
  ctx.fillStyle = c.theme.accent; rr(ctx, -w / 2, -h / 2, w, h, 40); ctx.fill();
  ctx.fillStyle = c.theme.accentInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, 0, 4); ctx.restore();
  if (c.logo) { const s = 420 * (0.9 + 0.1 * ease(k * 2)); ctx.drawImage(c.logo, W / 2 - s / 2, 1250, s, s); }
  ctx.font = `700 36px ${FONT}`; ctx.fillStyle = c.theme.soft; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Pago contra entrega · Envíos a todo el país', W / 2, 1750);
}

function sceneCover(ctx: CanvasRenderingContext2D, img: ImageBitmap, k: number) {
  // Fondo: la misma imagen ampliada y borrosa, oscurecida
  ctx.fillStyle = '#04122b'; ctx.fillRect(0, 0, W, H);
  const r = Math.max(W / img.width, H / img.height) * 1.1;
  ctx.save(); (ctx as any).filter = 'blur(28px) brightness(0.55)';
  ctx.drawImage(img, (W - img.width * r) / 2, (H - img.height * r) / 2, img.width * r, img.height * r);
  ctx.restore();
  // Primer plano: la imagen completa al ancho, con un zoom lento
  const z = 1 + 0.06 * k, w = W * z, h = (W * img.height / img.width) * z;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 60;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); ctx.restore();
}

export interface Timeline { cover: number; intro: number; prods: number[]; outro: number; total: number; voiceStart: number }

/** Parte el guion en frases: [intro, producto 1..n, beneficios, cierre]. */
const sentences = (script: string) => script.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);

/** Busca en el audio de la voz el instante (s) en que termina cada frase, usando las pausas entre frases. */
export function voiceMarks(buf: AudioBuffer, script: string, n: number): number[] {
  const groups = n + 2; // intro + n productos + cierre
  const dur = buf.duration;
  const even = Array.from({ length: n + 1 }, (_, i) => dur * (i + 1) / groups);
  const sents = sentences(script);
  if (sents.length !== n + 3) return even; // guion editado: reparto parejo
  // fin de cada bloque: intro (frase 0), producto i (frase i+1)
  const chars = sents.map(x => x.length), total = chars.reduce((a, b) => a + b, 0);
  const expected: number[] = []; let acc = 0;
  for (let i = 0; i <= n; i++) { acc += chars[i]; expected.push(dur * acc / total); }
  // pausas: tramos con energía muy baja
  const d = buf.getChannelData(0), hop = Math.round(buf.sampleRate * 0.02);
  const env: number[] = []; for (let i = 0; i + hop < d.length; i += hop) { let sum = 0; for (let j = 0; j < hop; j++) sum += d[i + j] * d[i + j]; env.push(Math.sqrt(sum / hop)); }
  const mx = Math.max(...env, 1e-6), thr = mx * 0.05;
  const pauses: number[] = []; let run = 0;
  env.forEach((e, i) => { if (e < thr) run++; else { if (run >= 8) pauses.push(((i - run / 2) * hop) / buf.sampleRate); run = 0; } });
  // Asigna en orden: cada fin de frase es la pausa más cercana a lo esperado, siempre posterior a la anterior
  const out: number[] = []; let prev = 0.3;
  for (const exp of expected) {
    let best = -1, bd = 2.5;
    pauses.forEach((pz, i) => { const dd = Math.abs(pz - exp); if (pz > prev + 1 && dd < bd) { bd = dd; best = i; } });
    const v = best >= 0 ? pauses[best] : Math.max(exp, prev + 1.5);
    out.push(v); prev = v;
  }
  return out;
}

export function buildTimeline(c: VidCfg, a: VidAudio): Timeline {
  const n = Math.min(4, c.items.length);
  const cover = c.cover ? COVER_SECS : 0;
  if (!a.voice || !n) {
    const intro = cover, per = 3, prods = Array.from({ length: n }, (_, i) => intro + 3 + i * per);
    const outro = n ? prods[n - 1] + per : intro + 4;
    return { cover, intro, prods, outro, total: outro + 4, voiceStart: VOICE_START };
  }
  const marks = voiceMarks(a.voice, a.script || '', n);
  const abs = marks.map(m => VOICE_START + m);
  const intro = cover;
  let t0 = Math.max(abs[0], intro + 1.4);
  const prods: number[] = [t0];
  for (let i = 1; i < n; i++) prods.push(Math.max(abs[i], prods[i - 1] + 2.2));
  const outro = Math.max(abs[n], prods[n - 1] + 2.2);
  const total = Math.max(outro + 3, VOICE_START + a.voice.duration + 1.2);
  return { cover, intro, prods, outro, total: Math.min(total, 60), voiceStart: VOICE_START };
}

/** Dibuja el fotograma del segundo t del video. */
export function drawFrame(ctx: CanvasRenderingContext2D, c: VidCfg, t: number, tl: Timeline) {
  const n = tl.prods.length;
  const body = (tt: number) => {
    if (n && tt >= tl.outro) sceneOutro(ctx, c, clamp((tt - tl.outro) / Math.max(1, tl.total - tl.outro)));
    else if (n && tt >= tl.prods[0]) {
      let i = n - 1; while (i > 0 && tt < tl.prods[i]) i--;
      const end = i + 1 < n ? tl.prods[i + 1] : tl.outro;
      sceneProduct(ctx, c, c.items[i], clamp((tt - tl.prods[i]) / (end - tl.prods[i])), i);
    } else if (!n && tt >= tl.outro) sceneOutro(ctx, c, clamp((tt - tl.outro) / Math.max(1, tl.total - tl.outro)));
    else sceneIntro(ctx, c, clamp((tt - tl.intro) / Math.max(0.5, (n ? tl.prods[0] : tl.outro) - tl.intro)));
  };
  if (c.cover && t < tl.cover) {
    const fadeLen = 0.4;
    if (t > tl.cover - fadeLen) { body(tl.intro); ctx.save(); ctx.globalAlpha = (tl.cover - t) / fadeLen; sceneCover(ctx, c.cover, t / tl.cover); ctx.restore(); }
    else sceneCover(ctx, c.cover, t / tl.cover);
  } else body(t);
  const p = clamp(t / tl.total);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, H - 10, W * p, 10);
  if (p > 0.97) { ctx.fillStyle = `rgba(0,0,0,${(p - 0.97) / 0.03})`; ctx.fillRect(0, 0, W, H); }
}

/** Música original sintetizada (ritmo alegre): no tiene derechos de autor. */
function synthMusic(ac: AudioContext, dest: AudioNode, dur: number, vol: number) {
  const master = ac.createGain(); master.gain.value = vol; master.connect(dest);
  master.gain.setValueAtTime(vol, ac.currentTime + Math.max(0, dur - 1.2)); master.gain.linearRampToValueAtTime(0, ac.currentTime + dur);
  const bpm = 112, beat = 60 / bpm, t0 = ac.currentTime + 0.05;
  const chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]]; // Am F C G
  const roots = [110, 87.31, 130.81, 98];
  const noise = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate); const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const beats = Math.floor(dur / beat);
  for (let b = 0; b < beats; b++) {
    const t = t0 + b * beat, ch = Math.floor(b / 4) % 4;
    // bombo en cada pulso
    const k = ac.createOscillator(), kg = ac.createGain(); k.type = 'sine';
    k.frequency.setValueAtTime(140, t); k.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    kg.gain.setValueAtTime(0.9, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.18); k.connect(kg); kg.connect(master); k.start(t); k.stop(t + 0.2);
    // hi-hat a contratiempo
    const hs = ac.createBufferSource(); hs.buffer = noise; const hf = ac.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7000;
    const hg = ac.createGain(); hg.gain.setValueAtTime(0.25, t + beat / 2); hg.gain.exponentialRampToValueAtTime(0.001, t + beat / 2 + 0.05);
    hs.connect(hf); hf.connect(hg); hg.connect(master); hs.start(t + beat / 2); hs.stop(t + beat / 2 + 0.06);
    // bajo
    const bo = ac.createOscillator(), bg2 = ac.createGain(); bo.type = 'triangle'; bo.frequency.value = roots[ch] * (b % 2 ? 2 : 1);
    bg2.gain.setValueAtTime(0.5, t); bg2.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.9); bo.connect(bg2); bg2.connect(master); bo.start(t); bo.stop(t + beat);
    // acorde (cada compás)
    if (b % 4 === 0) chords[ch].forEach(f => {
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f * 2; lp.type = 'lowpass'; lp.frequency.value = 1400;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + beat * 3.8);
      o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + beat * 4);
    });
  }
}

export function videoDuration(a: VidAudio, hasCover = false, n = 4): number {
  const base = (a.voice ? Math.min(55, a.voice.duration + VOICE_START + 1.2) : 3 + 3 + n * 3 + 4) + 0;
  return Math.max(base, (hasCover ? COVER_SECS : 0) + 6);
}

/** Graba el video (con audio si hay). Devuelve el archivo. */
export async function recordVideo(c: VidCfg, a: VidAudio, onProgress: (p: number) => void): Promise<Blob> {
  const tl = buildTimeline(c, a);
  const dur = tl.total * 1000;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const ctx = out.getContext('2d')!;
  const ac = new AudioContext(); await ac.resume();
  const dest = ac.createMediaStreamDestination();
  const hasAudio = Boolean(a.voice || a.music || a.musicBuf);
  const secs = dur / 1000;
  if (a.voice) { const s = ac.createBufferSource(); s.buffer = a.voice; const g = ac.createGain(); g.gain.value = 1; s.connect(g); g.connect(dest); s.start(ac.currentTime + VOICE_START); }
  if (a.musicBuf) {
    const s = ac.createBufferSource(); s.buffer = a.musicBuf; s.loop = true; const g = ac.createGain(); const vol = a.voice ? 0.14 : 0.5; g.gain.value = vol;
    g.gain.setValueAtTime(vol, ac.currentTime + secs - 1.2); g.gain.linearRampToValueAtTime(0, ac.currentTime + secs);
    s.connect(g); g.connect(dest); s.start(ac.currentTime); s.stop(ac.currentTime + secs);
  } else if (a.music) synthMusic(ac, dest, secs, a.voice ? 0.16 : 0.45);

  const vs = (out as any).captureStream(30) as MediaStream;
  const stream = new MediaStream([...vs.getVideoTracks(), ...(hasAudio ? dest.stream.getAudioTracks() : [])]);
  const cands = hasAudio
    ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mime = cands.find(t => (MediaRecorder as any).isTypeSupported?.(t)) || '';
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 3_500_000, audioBitsPerSecond: 128_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise<void>(res => { rec.onstop = () => res(); });
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>(resolve => {
    const frame = () => {
      const el = performance.now() - t0; const p = Math.min(1, el / dur);
      drawFrame(ctx, c, el / 1000, tl); onProgress(Math.round(p * 100));
      if (el >= dur) resolve(); else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  rec.stop(); await done; try { await ac.close(); } catch { /* nada */ }
  return new Blob(chunks, { type: mime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm' });
}
