// cPanel MySQL Settings Service (100% Independiente de Firestore)
// Persistencia en la tabla `configuraciones` y `banners` de MySQL cPanel

import { StoreSettings } from '../types/index.ts';

const SETTINGS_API_URL = '/api/admin/settings';
const LOCAL_STORAGE_KEY = 'zavela_store_settings_cache';

// Listeners activos para reactividad sin Firebase
const settingsListeners: Set<(settings: StoreSettings) => void> = new Set();
let cachedSettings: StoreSettings | null = null;

function notifyListeners(settings: StoreSettings) {
  cachedSettings = settings;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
  settingsListeners.forEach(listener => {
    try {
      listener(settings);
    } catch (err) {
      console.warn('[cPanel Settings Listener Warning]:', err);
    }
  });
}

/**
 * Obtiene la configuración de la tienda guardada en MySQL cPanel
 */
export async function getFirestoreSettings(): Promise<StoreSettings | null> {
  try {
    const res = await fetch(SETTINGS_API_URL);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al consultar configuraciones`);
    }
    const json = await res.json();
    if (json.success && json.data) {
      cachedSettings = json.data;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.data));
      } catch {}
      return json.data as StoreSettings;
    }
    return cachedSettings;
  } catch (error) {
    console.warn('[cPanel MySQL] Error al leer configuraciones desde servidor:', error);
    if (!cachedSettings) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) cachedSettings = JSON.parse(raw);
      } catch {}
    }
    return cachedSettings;
  }
}

/**
 * Guarda o actualiza las configuraciones globales de la tienda en MySQL cPanel
 */
export async function saveFirestoreSettings(settings: Partial<StoreSettings>): Promise<void> {
  try {
    const res = await fetch(SETTINGS_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al guardar configuraciones`);
    }

    const json = await res.json();
    const updated = json.data || { ...cachedSettings, ...settings };
    notifyListeners(updated as StoreSettings);
    console.log('✅ Configuración guardada con éxito en cPanel MySQL');
  } catch (error) {
    console.error('[cPanel MySQL] Error al guardar configuraciones en MySQL:', error);
    throw error;
  }
}

/**
 * Escucha cambios en tiempo real en las configuraciones de la tienda (Local & cPanel Poll)
 */
export function subscribeToFirestoreSettings(
  onUpdate: (settings: StoreSettings) => void,
  _onError?: (error: Error) => void
): () => void {
  settingsListeners.add(onUpdate);

  // Entregar inmediatamente la copia en caché si existe
  if (cachedSettings) {
    onUpdate(cachedSettings);
  } else {
    getFirestoreSettings().then(st => {
      if (st) onUpdate(st);
    }).catch(() => {});
  }

  // Polling silencioso cada 45 segundos para sincronización entre pestañas/dispositivos
  const interval = setInterval(async () => {
    try {
      const fresh = await getFirestoreSettings();
      if (fresh) onUpdate(fresh);
    } catch {}
  }, 45000);

  return () => {
    settingsListeners.delete(onUpdate);
    clearInterval(interval);
  };
}

// Aliases canónicos para nueva arquitectura
export const getCpanelSettings = getFirestoreSettings;
export const saveCpanelSettings = saveFirestoreSettings;
export const subscribeToCpanelSettings = subscribeToFirestoreSettings;
