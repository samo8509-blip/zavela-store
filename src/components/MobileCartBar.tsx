import React from 'react';
import { formatCOP } from '../utils/formatters.ts';

interface MobileCartBarProps {
  count: number;
  total: number;
  navVisible: boolean;
  onOpenCart: () => void;
}

/** Barra negra flotante "Ver carrito (n) · total" (solo celular, < md). */
export const MobileCartBar: React.FC<MobileCartBarProps> = ({ count, total, navVisible, onOpenCart }) => {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={onOpenCart}
      className="md:hidden fixed left-3 right-[72px] z-[44] h-12 rounded-full bg-black text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.28)] active:scale-[0.98] transition-transform zs-font"
      style={{ bottom: navVisible ? 'calc(68px + env(safe-area-inset-bottom))' : '16px' }}
    >
      Ver carrito ({count}) · {formatCOP(total)}
    </button>
  );
};

/**
 * En celular, el globo azul del chat WAI ("Chatea con nosotros") se reduce a un círculo
 * con solo el ícono y se sube sobre la barra inferior para no tapar el menú.
 * El widget vive en un shadow DOM abierto: se le inyecta una hoja de estilos.
 */
export function useWaiChatMobileStyle(navVisible: boolean, extraBottom = 0) {
  React.useEffect(() => {
    const bottom = navVisible ? `calc(${68 + extraBottom}px + env(safe-area-inset-bottom))` : '16px';
    const css = `@media (max-width: 767px) {
      .wai { bottom: ${bottom} !important; right: 12px !important; }
      .wai .lanzador { width: 48px !important; min-width: 48px !important; height: 48px !important; padding: 0 !important; border-radius: 50% !important; justify-content: center !important; gap: 0 !important; }
      .wai .lanzador .txt, .wai .lanzador .puntos { display: none !important; }
      .wai .insignia { top: -4px !important; bottom: auto !important; right: -2px !important; }
    }`;
    const apply = (): boolean => {
      const host = Array.from(document.body.children).find((e) => (e as HTMLElement).shadowRoot && (e as HTMLElement).shadowRoot!.querySelector('.wai')) as HTMLElement | undefined;
      if (!host || !host.shadowRoot) return false;
      let st = host.shadowRoot.getElementById('zs-mobile-style') as HTMLStyleElement | null;
      if (!st) {
        st = document.createElement('style');
        st.id = 'zs-mobile-style';
        host.shadowRoot.appendChild(st);
      }
      st.textContent = css;
      return true;
    };
    if (apply()) return;
    const t = window.setInterval(() => { if (apply()) window.clearInterval(t); }, 800);
    const stop = window.setTimeout(() => window.clearInterval(t), 30000);
    return () => { window.clearInterval(t); window.clearTimeout(stop); };
  }, [navVisible, extraBottom]);
}
