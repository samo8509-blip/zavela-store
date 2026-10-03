// Firestore Settings Service (Modular SDK v9+)
// Persistencia y sincronización en tiempo real de configuraciones de la tienda y WhatsApp AI Agent

import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { StoreSettings } from '../types/index.ts';

const SETTINGS_COLLECTION = 'settings';
const GENERAL_SETTINGS_DOC = 'general';

/**
 * Obtiene la configuración de la tienda guardada en Firestore
 */
export async function getFirestoreSettings(): Promise<StoreSettings | null> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as StoreSettings;
    }
    return null;
  } catch (error) {
    console.warn('Error al leer configuraciones de Firestore:', error);
    return null;
  }
}

/**
 * Guarda o actualiza las configuraciones globales de la tienda en Cloud Firestore
 */
export async function saveFirestoreSettings(settings: Partial<StoreSettings>): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC);
    
    // Limpiar campos undefined antes de guardar
    const cleanData: Record<string, any> = {};
    for (const [key, val] of Object.entries(settings)) {
      if (val !== undefined) {
        cleanData[key] = val;
      }
    }

    cleanData.updatedAt = serverTimestamp();

    await setDoc(docRef, cleanData, { merge: true });
    console.log('✅ Configuraciones y número de WhatsApp guardados en Cloud Firestore');
  } catch (error) {
    console.error('Error al guardar configuraciones en Firestore:', error);
    throw error;
  }
}

/**
 * Escucha cambios en tiempo real en las configuraciones de la tienda
 */
export function subscribeToFirestoreSettings(
  onUpdate: (settings: StoreSettings) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC);

  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        onUpdate(data);
      }
    },
    (error) => {
      console.warn('Error en listener de configuraciones Firestore:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}
