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
