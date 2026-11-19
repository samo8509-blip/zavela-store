/**
 * Colores del logo Z según la temporada activa.
 * Se usan en el logo de la cabecera y en el ícono de la pestaña del navegador (favicon).
 * Estándar (azul neón) devuelve null: el logo conserva sus colores originales.
 */
export type LogoScheme = [string, string, string]; // inicio · medio · final del degradado

const SCHEMES: Record<string, LogoScheme> = {
  'black-friday': ['#FDE047', '#F59E0B', '#EA580C'],
  'navidad-fin-ano': ['#FCA5A5', '#EF4444', '#16A34A'],
  'halloween': ['#FDBA74', '#F97316', '#7C3AED'],
  'san-valentin': ['#FDA4AF', '#F43F5E', '#BE123C'],
  'amor-amistad': ['#FDE68A', '#F472B6', '#8B5CF6'],
  'madre': ['#F9A8D4', '#EC4899', '#A855F7']
};

export const DEFAULT_SCHEME: LogoScheme = ['#00E5FF', '#2563EB', '#7C3AED'];

export function getLogoScheme(themeId?: string): LogoScheme | null {
  return (themeId && SCHEMES[themeId]) || null;
}

const hex2rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** ¿Es un color de la familia azul/cian/violeta del logo original? */
export function isLogoBlue(hex: string): boolean {
  const [h, s] = rgb2hsl(...(hex2rgb(hex) as [number, number, number]));
  return h >= 175 && h <= 290 && s > 0.45;
}

/** Lleva un color del logo original (cian→azul→violeta) al degradado de la temporada, conservando brillo y sombras. */
export function tintHex(hex: string, scheme: LogoScheme | null): string {
  if (!scheme || !/^#[0-9a-fA-F]{6}$/.test(hex) || !isLogoBlue(hex)) return hex;
  const [h, , l] = rgb2hsl(...(hex2rgb(hex) as [number, number, number]));
  const t = Math.max(0, Math.min(1, (h - 185) / (280 - 185)));
  const [a, b, c] = scheme.map(hex2rgb);
  const [from, to, k] = t < 0.5 ? [a, b, t * 2] : [b, c, (t - 0.5) * 2];
  const mix = from.map((v, i) => v + (to[i] - v) * k);
  const [bh, bs, bl] = rgb2hsl(mix[0], mix[1], mix[2]);
  const [r, g, bb] = hsl2rgb(bh, Math.max(bs, 0.6), l * 0.8 + bl * 0.2);
  return rgb2hex(r, g, bb);
}

export function logoGlow(scheme: LogoScheme | null): string {
  return (scheme ? scheme[1] : '#00C3FF');
}

/** Ícono de pestaña: Z de cristal neón sobre fondo azul noche, en los colores de la temporada. */
export function buildFaviconSvg(scheme: LogoScheme | null = null): string {
  const [c1, c2, c3] = scheme || DEFAULT_SCHEME;
  const path = 'M70 76 H190 L70 182 H196';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
<defs>
<linearGradient id="g" x1="60" y1="60" x2="200" y2="200" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
<radialGradient id="bg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#0B2A57"/><stop offset="1" stop-color="#050B1A"/></radialGradient>
<filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
</defs>
<rect width="256" height="256" rx="58" fill="url(#bg)"/>
<path d="${path}" fill="none" stroke="${c2}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" opacity=".55" filter="url(#b)"/>
<path d="${path}" fill="none" stroke="url(#g)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${path}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="translate(-4 -6)"/>
</svg>`;
}

/** Cambia el ícono de la pestaña según la temporada. */
export function applyFavicon(themeId?: string): void {
  if (typeof document === 'undefined') return;
  try {
    const href = 'data:image/svg+xml;utf8,' + encodeURIComponent(buildFaviconSvg(getLogoScheme(themeId)));
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]'));
    if (!links.length) {
      const l = document.createElement('link');
      l.rel = 'icon'; l.type = 'image/svg+xml'; l.href = href;
      document.head.appendChild(l);
      return;
    }
    links.forEach(l => { l.type = 'image/svg+xml'; l.href = href; });
  } catch {}
}
