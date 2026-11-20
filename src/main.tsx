import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Adjunta la sesión (administrador o asesor) a las llamadas a /api del mismo sitio.
// El servidor decide si la ruta es pública o exige sesión.
try {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : (input as Request).url;
      const path = url.startsWith('http') ? new URL(url).pathname : url;
      const sameOrigin = !url.startsWith('http') || new URL(url).origin === window.location.origin;
      if (sameOrigin && path.startsWith('/api/')) {
        const adminTok = sessionStorage.getItem('zavela_admin_token') || localStorage.getItem('zavela_admin_token');
        const advisorTok = sessionStorage.getItem('zavela_advisor_token') || localStorage.getItem('zavela_advisor_token');
        // Dentro del portal del asesor se usa SIEMPRE la sesión del asesor (así solo ve sus propias ventas).
        const token = (window as any).__zavelaRole === 'advisor' ? (advisorTok || adminTok) : (adminTok || advisorTok);
        if (token) {
          const headers = new Headers(init?.headers || (typeof input === 'object' && 'headers' in input ? (input as Request).headers : undefined));
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          return nativeFetch(input, { ...init, headers });
        }
      }
    } catch {}
    return nativeFetch(input, init);
  };
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
