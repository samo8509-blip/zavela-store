// Firebase SDK v9+ Modular Configuration for Zavela Store
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Configuration object with fallback for development and production
const metaEnv = ((import.meta as any)?.env || {}) as Record<string, string | undefined>;

export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || metaEnv.VITE_FIREBASE_API_KEY || '',
  authDomain: firebaseConfigJson.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: firebaseConfigJson.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID || 'platinum-lodge-79brs',
  storageBucket: firebaseConfigJson.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || 'platinum-lodge-79brs.firebasestorage.app',
  messagingSenderId: firebaseConfigJson.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '174647827170',
  appId: firebaseConfigJson.appId || metaEnv.VITE_FIREBASE_APP_ID || '',
  firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId || '(default)'
};

// Initialize Firebase App instance singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore database instance
// When a specific firestoreDatabaseId is provided, we connect to it directly
export const db: Firestore = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Storage instance
export const storage: FirebaseStorage = getStorage(app);

// Initialize Firebase Auth instance
export const auth: Auth = getAuth(app);

export default { app, db, storage, auth };
