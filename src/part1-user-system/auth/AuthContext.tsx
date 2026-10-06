/**
 * VYNTRA — Auth Context Provider
 * Manages Google authentication state, guest mode, unique app ID generation,
 * and offline auth persistence via IndexedDB.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { signInWithPopup, onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../../shared/firebase/config';
import { generateUniqueId } from '../../shared/utils/id-generator';
import { getItem, putItem, STORES } from '../../shared/utils/offline-cache';
import type { VyntraUser } from '../../shared/types';
import { Timestamp } from 'firebase/firestore';

interface AuthState {
  user: User | null;
  vyntraUser: VyntraUser | null;
  loading: boolean;
  isOnline: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [vyntraUser, setVyntraUser] = useState<VyntraUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to Firebase auth state + load cached auth
  useEffect(() => {
    let hasLoadedCache = false;

    const loadCachedAuth = async () => {
      try {
        const cached = await getItem<{ key: string; data: VyntraUser }>(STORES.AUTH, 'current-user');
        if (cached?.data) {
          setVyntraUser(cached.data);
        }
      } catch (err) {
        console.warn('Could not read cached auth:', err);
      } finally {
        hasLoadedCache = true;
      }
    };

    loadCachedAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Try to get existing VYNTRA user from Firestore
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data() as VyntraUser;
            setVyntraUser(data);
            await putItem(STORES.AUTH, { key: 'current-user', data });
          } else {
            // First time login
            const appId = generateUniqueId('USR');
            const newUser: VyntraUser = {
              appId,
              googleUid: firebaseUser.uid,
              role: 'user',
              createdAt: Timestamp.now(),
              lastLoginAt: Timestamp.now(),
            };
            await setDoc(userRef, newUser);
            setVyntraUser(newUser);
            await putItem(STORES.AUTH, { key: 'current-user', data: newUser });
          }
        } catch {
          // Offline or network error — preserve existing cached vyntraUser
        }
      } else {
        // If offline, do NOT clear vyntraUser — preserve offline session
        if (navigator.onLine && hasLoadedCache) {
          // Only clear if explicitly not in offline session
          // We will preserve vyntraUser if it exists in IndexedDB
          const cached = await getItem<{ key: string; data: VyntraUser }>(STORES.AUTH, 'current-user');
          if (!cached?.data) {
            setVyntraUser(null);
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isOnline) {
      setError('Internet connection required for Google sign in. Try Continuing as Emergency Guest.');
      return;
    }
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const appId = generateUniqueId('USR');
        const newUser: VyntraUser = {
          appId,
          googleUid: firebaseUser.uid,
          role: 'user',
          createdAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
        };
        await setDoc(userRef, newUser);
        setVyntraUser(newUser);
        await putItem(STORES.AUTH, { key: 'current-user', data: newUser });
      } else {
        const data = userSnap.data() as VyntraUser;
        await setDoc(userRef, { ...data, lastLoginAt: Timestamp.now() });
        setVyntraUser(data);
        await putItem(STORES.AUTH, { key: 'current-user', data });
      }
    } catch (err) {
      setError('Google Sign-in was not completed or failed.');
      console.warn('Auth notice:', err);
    }
  };

  const signInAsGuest = async () => {
    setError(null);
    try {
      const appId = generateUniqueId('USR');
      const guestUser: VyntraUser = {
        appId,
        googleUid: `guest-${Date.now()}`,
        role: 'user',
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      };
      setVyntraUser(guestUser);
      await putItem(STORES.AUTH, { key: 'current-user', data: guestUser });
    } catch {
      setError('Could not initialize emergency guest mode.');
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.warn('Firebase signout warning:', err);
    } finally {
      setUser(null);
      setVyntraUser(null);
      await putItem(STORES.AUTH, { key: 'current-user', data: null });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      vyntraUser,
      loading,
      isOnline,
      error,
      signInWithGoogle,
      signInAsGuest,
      signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
