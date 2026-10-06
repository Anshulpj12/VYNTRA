/**
 * VYNTRA — Firebase Configuration & Initialization
 * 
 * Configured with live project credentials and offline fallback detection.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBtKYwIisuXxQNIWZz9W4YWkTzjxBjvddU',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'safeshe-fb27e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'safeshe-fb27e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'safeshe-fb27e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '492559789044',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:492559789044:web:d2a17238382e499cbb67a1',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-BRWKSL077K',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Checks whether Firebase credentials are configured with real values
 */
export function isFirebaseConfigured(): boolean {
  return typeof firebaseConfig.apiKey === 'string' &&
    !firebaseConfig.apiKey.includes('YOUR_API_KEY') &&
    firebaseConfig.apiKey.length > 0;
}

// Safe Analytics initialization for browser environments
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics blocked or unsupported (e.g. adblocker or restricted browser)
    });
}

export { analytics };
export default app;
