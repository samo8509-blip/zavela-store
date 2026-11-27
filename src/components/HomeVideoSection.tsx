import React from 'react';
import { Volume2, VolumeX, Play, Check } from 'lucide-react';

/**
 * Video de campaña en la portada. Solo aparece si el administrador puso uno.
 * - No descarga nada del video hasta que el cliente llega a esta sección (preload="none" + imagen de portada).
 * - Se reproduce solo y sin sonido cuando está a la vista; se pausa al salir. Con ahorro de datos, espera a que el cliente lo toque.
 * - Botón de sonido para activar la voz y la música.
 */
interface Props {
  onCta: () => void;
}

export const HomeVideoSection: React.FC<Props> = ({ onCta }) => {
  const [info, setInfo] = React.useState<{ title: string; version: number } | null>(null);
  const [muted, setMuted] = React.useState(true);
  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const saveData = React.useRef(false);

  React.useEffect(() => {
    saveData.current = Boolean((navigator as any)?.connection?.saveData);
    let cancelled = false;
    // Se consulta con calma (después de que la portada ya cargó) para no competir con los productos
    const t = window.setTimeout(() => {
      fetch('/api/home-video/info')
        .then(r => r.json())
        .then(j => { if (!cancelled && j?.exists) setInfo({ title: String(j.title || ''), version: Number(j.version) || 0 }); })
        .catch(() => {});
    }, 1200);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, []);

  React.useEffect(() => {
    const box = boxRef.current;
    const v = videoRef.current;
    if (!box || !v || !info || typeof IntersectionObserver === 'undefined') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!saveData.current && !reduce) v.play().then(() => setPlaying(true)).catch(() => {});
      } else {
        v.pause();
        setPlaying(false);
      }
    }, { threshold: 0.5 });
    io.observe(box);
    return () => io.disconnect();
  }, [info]);

  if (!info || failed) return null;

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
  };
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
    else { v.pause(); setPlaying(false); }
  };

  return (
    <section
      aria-label="Video de ofertas"
      className="zs-font flex flex-col items-center text-center gap-3 sm:gap-4 lg:flex-row lg:items-center lg:text-left lg:gap-10 lg:bg-white lg:rounded-[28px] lg:p-8 lg:border lg:border-black/5 lg:max-w-4xl lg:mx-auto lg:w-full"
    >
      {/* Celular: titular arriba. Computador: el titular pasa a la derecha */}
      {info.title && (
        <h2 className="lg:hidden zs-display text-black text-xl sm:text-3xl leading-tight">{info.title}</h2>
      )}
      <div ref={boxRef} className="relative w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[240px] lg:shrink-0 aspect-[9/16] rounded-[28px] overflow-hidden bg-black shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <video
          ref={videoRef}
          src={`/api/home-video?v=${info.version}`}
          poster="/zavela-portada.jpg"
          muted={muted}
          loop
          playsInline
          preload="none"
          onError={() => setFailed(true)}
          onClick={togglePlay}
          className="w-full h-full object-cover cursor-pointer"
        />
        {!playing && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Reproducir video"
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/90 flex items-center justify-center cursor-pointer shadow-lg"
          >
            <Play className="w-7 h-7 text-black ml-1" fill="currentColor" />
          </button>
        )}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
      <div className="flex flex-col items-center lg:items-start gap-3 lg:gap-4 min-w-0">
        {info.title && (
          <h2 className="max-lg:hidden zs-display text-black text-3xl leading-tight">{info.title}</h2>
        )}
        <ul className="max-lg:hidden space-y-2 text-base text-black">
          {['Pagas al recibir, sin tarjeta', 'Envío gratis a toda Colombia', 'Sigue tu pedido con número de guía'].map(t => (
            <li key={t} className="flex items-center gap-2">
              <Check className="w-5 h-5 shrink-0" style={{ color: 'var(--shop-violet)' }} />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onCta}
          className="font-semibold px-6 py-3 rounded-full text-sm sm:text-base cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-95"
          style={{ background: 'var(--zv-cta, #ff5a4f)', color: 'var(--zv-cta-ink, #fff)' }}
        >
          Ver las ofertas
        </button>
      </div>
    </section>
  );
};
