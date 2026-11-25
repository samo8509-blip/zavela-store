import React, { useEffect, useState } from 'react';
import { X, Share, SquarePlus } from 'lucide-react';

interface InstallAppPromptProps {
  enabled: boolean;
  /** Solo se muestra cuando no estorba (portada, carrito vacío). */
  visible: boolean;
}

const DISMISS_KEY = 'zs_pwa_dismissed_at';
const DISMISS_DAYS = 14;

const isStandalone = () =>
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
  (navigator as any).standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Aviso para instalar la tienda como "app" (PWA). Solo celular.
 * - Android/Chrome: botón "Instalar" con el aviso nativo del navegador.
 * - iPhone: pasos de Safari (Compartir → Agregar a pantalla de inicio).
 */
export const InstallAppPrompt: React.FC<InstallAppPromptProps> = ({ enabled, visible }) => {
  const [deferred, setDeferred] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [closed, setClosed] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // Registro del service worker (necesario para que sea instalable)
  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) return;
    const p = window.location.pathname;
    if (p.startsWith('/admin') || p.startsWith('/advisor') || p.startsWith('/asesor')) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled || isStandalone()) return;
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (at && Date.now() - at < DISMISS_DAYS * 86400000) { setClosed(true); return; }
    } catch {}
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const onInstalled = () => { setClosed(true); setDeferred(null); };
    window.addEventListener('appinstalled', onInstalled);
    const t = window.setTimeout(() => setReady(true), 10000);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(t);
    };
  }, [enabled]);

  const dismiss = () => {
    setClosed(true);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {}
    setDeferred(null);
    dismiss();
  };

  const ios = isIOS();
  const canShow = enabled && visible && ready && !closed && !isStandalone() && (deferred || ios);
  if (!canShow) return null;

  return (
    <div
      className="md:hidden fixed left-3 right-3 z-[47] bg-white rounded-3xl border border-[var(--shop-border)] shadow-[0_12px_32px_rgba(0,0,0,0.18)] p-4 zs-font"
      style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
      role="dialog"
      aria-label="Instalar Zavela Store"
    >
      <button type="button" onClick={dismiss} aria-label="Cerrar" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#f2f4f5] flex items-center justify-center">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3 pr-8">
        <img src="/images/pwa/icon-192.png" alt="" className="w-12 h-12 rounded-2xl border border-[var(--shop-border)] bg-white shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-black">Instala Zavela en tu celular</div>
          <div className="text-xs text-[color:var(--shop-muted)]">Entra más rápido, como una app. Sin descargas pesadas.</div>
        </div>
      </div>

      {deferred ? (
        <button
          type="button"
          onClick={install}
          className="mt-3 w-full h-11 rounded-full text-sm font-semibold active:scale-95 transition-transform"
          style={{ background: 'var(--zv-cta, #ff5a4f)', color: 'var(--zv-cta-ink, #fff)' }}
        >
          Instalar
        </button>
      ) : (
        <>
          {showSteps ? (
            <ol className="mt-3 text-xs text-black space-y-2">
              <li className="flex items-center gap-2"><Share className="w-4 h-4 shrink-0" /> Toca el botón <strong>Compartir</strong> de Safari.</li>
              <li className="flex items-center gap-2"><SquarePlus className="w-4 h-4 shrink-0" /> Elige <strong>Agregar a pantalla de inicio</strong>.</li>
              <li className="flex items-center gap-2"><span className="w-4 text-center shrink-0">✓</span> Toca <strong>Agregar</strong>. Listo.</li>
            </ol>
          ) : (
            <button
              type="button"
              onClick={() => setShowSteps(true)}
              className="mt-3 w-full h-11 rounded-full text-sm font-semibold active:scale-95 transition-transform"
              style={{ background: 'var(--zv-cta, #ff5a4f)', color: 'var(--zv-cta-ink, #fff)' }}
            >
              Cómo instalarla
            </button>
          )}
        </>
      )}
    </div>
  );
};
