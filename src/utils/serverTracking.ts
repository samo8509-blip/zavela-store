/** Visitas reales: se mandan al servidor (una por producto y sesión). No cuenta al administrador ni a los asesores. */
function isStaff(): boolean {
  try {
    return Boolean(
      sessionStorage.getItem('zavela_admin_token') || localStorage.getItem('zavela_admin_token') ||
      sessionStorage.getItem('zavela_advisor_token') || localStorage.getItem('zavela_advisor_token')
    );
  } catch { return false; }
}

function post(url: string, body: unknown) {
  try {
    const data = JSON.stringify(body);
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }))) return;
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true }).catch(() => {});
  } catch { /* nunca debe romper la tienda */ }
}

export function sendProductView(productId: string) {
  if (!productId || isStaff()) return;
  try {
    const k = `zv_seen_${productId}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, '1');
  } catch { /* sin sessionStorage: igual se envía; el servidor limita repetidas */ }
  post('/api/track/view', { productId });
}

export function sendProductTime(productId: string, seconds: number) {
  if (!productId || seconds < 3 || isStaff()) return;
  post('/api/track/time', { productId, seconds: Math.round(seconds) });
}

/**
 * Origen de la visita: se calcula una vez por sesión al abrir la tienda.
 * - Si el enlace trae etiquetas (utm_source / utm_medium / utm_campaign) se usan tal cual: así se separa el anuncio pagado de lo orgánico.
 * - Si viene de Facebook sin etiquetas (parámetro fbclid) se cuenta como "facebook" sin etiqueta.
 * - Si no, se mira de qué sitio llegó; sin sitio = directo.
 */
export function sendVisitSource() {
  if (isStaff()) return;
  try {
    if (sessionStorage.getItem('zv_visit_sent')) return;
    sessionStorage.setItem('zv_visit_sent', '1');
  } catch { /* igual se envía; el servidor limita repetidas */ }
  try {
    const q = new URLSearchParams(window.location.search);
    let source = (q.get('utm_source') || '').trim();
    let medium = (q.get('utm_medium') || '').trim();
    const campaign = (q.get('utm_campaign') || '').trim();
    if (!source) {
      const ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
      const own = window.location.hostname.replace(/^www\./, '');
      if (q.get('fbclid')) { source = 'facebook'; medium = medium || 'clic-sin-etiqueta'; }
      else if (ref && ref !== own) {
        if (/facebook|fb\.com|fb\.me/.test(ref)) { source = 'facebook'; medium = medium || 'referido'; }
        else if (/instagram/.test(ref)) { source = 'instagram'; medium = medium || 'referido'; }
        else if (/tiktok/.test(ref)) { source = 'tiktok'; medium = medium || 'referido'; }
        else if (/google/.test(ref)) { source = 'google'; medium = medium || 'referido'; }
        else if (/whatsapp|wa\.me/.test(ref)) { source = 'whatsapp'; medium = medium || 'referido'; }
        else { source = ref; medium = medium || 'referido'; }
      } else { source = 'directo'; }
    }
    post('/api/track/visit', { source, medium, campaign });
  } catch { /* nunca debe romper la tienda */ }
}
