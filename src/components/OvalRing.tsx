import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Product } from '../types/index.ts';

/**
 * Carrusel ovalado: los productos giran en un anillo.
 * - Los de adelante se ven nítidos y los de atrás se ven translúcidos y en espejo, un poco más arriba y más pequeños.
 * - Gira solo hacia la izquierda; con el dedo o el mouse se puede arrastrar en cualquier dirección.
 */
export interface OvalRingHandle { step: (dir: 1 | -1) => void }

const AUTO_RAD_PER_SEC = 0.13;
const RESUME_MS = 2500;
const TAU = Math.PI * 2;

interface Props {
  products: Product[];
  renderProduct: (p: Product) => React.ReactNode;
  apiRef?: React.Ref<OvalRingHandle>;
}

export const OvalRing: React.FC<Props> = ({ products, renderProduct, apiRef }) => {
  const n = products.length;
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const angleRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const velRef = useRef(0);
  const pauseUntil = useRef(0);
  const hoverRef = useRef(false);
  const dragRef = useRef<{ x: number; moved: boolean; id: number } | null>(null);
  const movedRef = useRef(false);
  const inViewRef = useRef(true);
  const geoRef = useRef({ rx: 120, ry: 20 });

  const [dims, setDims] = useState({ w: 360, cardW: 165, cardH: 300 });

  // Medidas: ancho del contenedor y alto real de las tarjetas.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const w = box.clientWidth || 360;
      const cardW = Math.round(Math.min(250, Math.max(140, w < 640 ? w * 0.46 : w < 1024 ? w * 0.3 : w * 0.21)));
      let h = 0;
      cardRefs.current.forEach(c => { if (c) h = Math.max(h, c.offsetHeight); });
      setDims(prev => (prev.w === w && prev.cardW === cardW && Math.abs(prev.cardH - (h || prev.cardH)) < 2 ? prev : { w, cardW, cardH: h || prev.cardH }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    cardRefs.current.forEach(c => c && ro.observe(c));
    return () => ro.disconnect();
  }, [n, dims.cardW]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { inViewRef.current = e.isIntersecting; }, { threshold: 0.05 });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  useImperativeHandle(apiRef, () => ({
    step: (dir: 1 | -1) => {
      const stepRad = TAU / n;
      const base = targetRef.current ?? angleRef.current;
      // dir 1 = siguiente: los productos pasan hacia la izquierda.
      targetRef.current = Math.round(base / stepRad) * stepRad - dir * stepRad;
      velRef.current = 0;
      pauseUntil.current = performance.now() + RESUME_MS + 800;
    },
  }), [n]);

  // Posiciona cada tarjeta según su ángulo.
  const layout = () => {
    const { rx, ry } = geoRef.current;
    for (let i = 0; i < n; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const th = angleRef.current + (i * TAU) / n;
      const s = Math.sin(th);
      const c = Math.cos(th);
      const depth = (c + 1) / 2;
      const scale = 0.6 + 0.4 * depth;
      const flip = Math.max(-1, Math.min(1, c * 3)); // pasa por 0 (tarjeta de canto) y se vuelve espejo por detrás
      const opacity = c >= 0 ? 0.78 + 0.22 * c : 0.3 + 0.48 * (1 + c) * 0.55;
      el.style.transform = `translate3d(${(s * rx).toFixed(1)}px, ${(-c * ry).toFixed(1)}px, 0) scale(${(scale * (Math.abs(flip) < 0.02 ? 0.02 : flip)).toFixed(3)}, ${scale.toFixed(3)})`;
      el.style.opacity = String(Math.max(0, Math.min(1, opacity)).toFixed(3));
      el.style.zIndex = String(Math.round((c + 1) * 50));
      el.style.pointerEvents = c > 0.25 ? 'auto' : 'none';
    }
  };

  useEffect(() => {
    const rx = Math.max(60, ((dims.w - dims.cardW) / 2) * 0.96);
    const ry = Math.max(14, Math.min(44, dims.cardH * 0.12));
    geoRef.current = { rx, ry };
    layout();
  }, [dims, n]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      const dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
      last = t;
      if (inViewRef.current) {
        if (targetRef.current !== null) {
          const diff = targetRef.current - angleRef.current;
          angleRef.current += diff * Math.min(1, dt * 7);
          if (Math.abs(diff) < 0.0005) { angleRef.current = targetRef.current; targetRef.current = null; }
        } else if (!dragRef.current && Math.abs(velRef.current) > 0.0005) {
          angleRef.current += velRef.current * dt * 60;
          velRef.current *= Math.pow(0.94, dt * 60);
        } else if (!dragRef.current && !hoverRef.current && performance.now() > pauseUntil.current) {
          angleRef.current -= AUTO_RAD_PER_SEC * dt;
        }
        if (angleRef.current > 1e4 || angleRef.current < -1e4) angleRef.current %= TAU;
        layout();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = { x: e.clientX, moved: false, id: e.pointerId };
    movedRef.current = false;
    targetRef.current = null;
    velRef.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      movedRef.current = true;
      try { (e.currentTarget as HTMLElement).setPointerCapture(d.id); } catch {}
    }
    if (d.moved) {
      const dTheta = dx / geoRef.current.rx; // arrastrar a la izquierda = los de adelante van a la izquierda
      angleRef.current += dTheta;
      velRef.current = dTheta * 0.6;
      d.x = e.clientX;
      layout();
    }
  };
  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    pauseUntil.current = performance.now() + RESUME_MS;
  };

  const boxH = Math.round(dims.cardH + geoRef.current.ry * 2 + 36);

  return (
    <div
      ref={boxRef}
      className="relative w-full select-none overflow-hidden"
      style={{ height: boxH, touchAction: 'pan-y', cursor: 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
      onClickCapture={(e) => { if (movedRef.current) { e.stopPropagation(); e.preventDefault(); movedRef.current = false; } }}
    >
      {/* Sombra ovalada del "piso" del anillo */}
      <div
        aria-hidden
        className="absolute left-1/2 pointer-events-none"
        style={{
          bottom: 4,
          width: Math.min(dims.w * 0.8, 760),
          height: 26,
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse at center, rgba(15,23,42,0.22) 0%, rgba(15,23,42,0) 70%)',
        }}
      />
      {products.map((p, i) => (
        <div
          key={`${p.id || p.slug}-${i}`}
          ref={(el) => { cardRefs.current[i] = el; }}
          className="absolute top-3"
          style={{ left: '50%', width: dims.cardW, marginLeft: -dims.cardW / 2, willChange: 'transform, opacity' }}
        >
          {renderProduct(p)}
        </div>
      ))}
    </div>
  );
};
