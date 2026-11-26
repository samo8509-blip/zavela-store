/*
 * Aviso de cookies de Zavela Store.
 * - Las cookies/almacenamiento esenciales no necesitan permiso.
 * - El píxel de TikTok (publicidad y medición) solo se carga si la persona pulsa "Aceptar todas".
 * - Las dos opciones tienen el mismo tamaño y visibilidad.
 * - La elección se guarda en localStorage (zs_cookie_consent = 'all' | 'essential') y se puede cambiar
 *   con window.zsOpenCookiePrefs() (botón "Preferencias de cookies" del pie de la tienda).
 */
(function () {
  var KEY = 'zs_cookie_consent';
  var TS = 'zs_cookie_consent_ts';
  var host;

  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); localStorage.setItem(TS, new Date().toISOString()); } catch (e) {} }

  function apply(choice) {
    if (choice === 'all') {
      try { if (typeof window.__zsStartTikTok === 'function') window.__zsStartTikTok(); } catch (e) {}
    } else {
      try { if (window.ttq && typeof window.ttq.revokeConsent === 'function') window.ttq.revokeConsent(); } catch (e) {}
    }
  }

  function close() { if (host && host.parentNode) host.parentNode.removeChild(host); host = null; }

  function choose(choice) { set(choice); apply(choice); close(); }

  function open() {
    if (host) return;
    host = document.createElement('div');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'false');
    host.setAttribute('aria-labelledby', 'zs-ck-title');
    host.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:520px;margin:0 auto 0 0;background:#fff;color:#1f2933;border:1px solid #9ca3af;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:16px;font:14px/1.5 Inter,system-ui,Arial,sans-serif';
    host.innerHTML =
      '<p id="zs-ck-title" style="margin:0 0 6px;font-weight:800;font-size:15px;color:#111">Tu privacidad en Zavela Store</p>' +
      '<p style="margin:0 0 12px">Usamos cookies esenciales para que la tienda funcione. Con tu permiso también usamos cookies de publicidad y medición (TikTok). ' +
      'Puedes cambiar tu decisión cuando quieras. <a href="/politica-de-cookies" style="color:#4c1d95;font-weight:700">Política de cookies</a> · <a href="/politica-de-privacidad" style="color:#4c1d95;font-weight:700">Privacidad</a></p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button type="button" data-c="essential" style="flex:1 1 150px;padding:11px 14px;border-radius:999px;border:2px solid #111;background:#fff;color:#111;font-weight:800;font-size:14px;cursor:pointer">Solo esenciales</button>' +
      '<button type="button" data-c="all" style="flex:1 1 150px;padding:11px 14px;border-radius:999px;border:2px solid #111;background:#111;color:#fff;font-weight:800;font-size:14px;cursor:pointer">Aceptar todas</button>' +
      '</div>';
    host.addEventListener('click', function (e) {
      var t = e.target;
      var c = t && t.getAttribute && t.getAttribute('data-c');
      if (c) choose(c);
    });
    document.body.appendChild(host);
    var first = host.querySelector('button');
    if (first && first.focus) { try { first.focus({ preventScroll: true }); } catch (e) {} }
  }

  window.zsOpenCookiePrefs = open;

  function start() {
    var c = get();
    if (c === 'all' || c === 'essential') apply(c);
    else open();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
