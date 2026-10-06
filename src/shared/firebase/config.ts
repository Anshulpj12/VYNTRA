/**
 * VYNTRA — Firebase Configuration & Initialization
 * 
 * Central Firebase app initialization. All parts import from here.
 * Replace the placeholder config values with actual Firebase project credentials.
 * 
 * @module shared/firebase/config
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

/**
 * Firebase project configuration.
 * Replace these values with your actual Firebase project credentials.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

/** Initialized Firebase app instance */
export const firebaseApp = initializeApp(firebaseConfig);

/** Firebase Auth instance */
export const auth = getAuth(firebaseApp);

/** Google Auth provider for login */
export const googleProvider = new GoogleAuthProvider();

/** Firestore database instance */
export const db = getFirestore(firebaseApp);

/**
 * Checks if real Firebase credentials are configured.
 * Returns false when placeholder or empty values are present.
 */
export function isFirebaseConfigured(): boolean {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  const proj = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  return Boolean(
    key &&
    key !== 'YOUR_API_KEY' &&
    !key.startsWith('YOUR_') &&
    proj &&
    proj !== 'YOUR_PROJECT_ID' &&
    !proj.startsWith('YOUR_')
  );
}

/**
 * Enable Firestore offline persistence.
 * Called once during app initialization.
 */
export async function enableOfflinePersistence(): Promise<void> {
  if (!isFirebaseConfigured()) {
    console.info('[VYNTRA] Firebase not configured — running in offline/testing mode');
    return;
  }
  try {
    await enableIndexedDbPersistence(db);
    console.info('[VYNTRA] Firestore offline persistence enabled');
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'failed-precondition') {
      console.warn('[VYNTRA] Offline persistence failed: multiple tabs open');
    } else if (error.code === 'unimplemented') {
      console.warn('[VYNTRA] Offline persistence not supported in this browser');
    }
  }
}
