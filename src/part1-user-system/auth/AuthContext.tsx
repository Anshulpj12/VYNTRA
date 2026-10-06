/**
 * VYNTRA — Auth Context Provider
 * Manages Google authentication state, guest mode, unique app ID generation,
 * and offline auth persistence via IndexedDB.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  signInWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type User,
} from 'firebase/auth';
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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
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

  const signInWithEmail = async (email: string, password: string) => {
    if (!isOnline) {
      setError('Internet connection required for email login.');
      return;
    }
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = result.user;

      const userRef = doc(db, 'users', firebaseUser.uid);
      let userData: VyntraUser;
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userData = userSnap.data() as VyntraUser;
          await setDoc(userRef, { ...userData, lastLoginAt: Timestamp.now() });
        } else {
          const appId = generateUniqueId('USR');
          userData = {
            appId,
            googleUid: firebaseUser.uid,
            role: 'user',
            createdAt: Timestamp.now(),
            lastLoginAt: Timestamp.now(),
          };
          await setDoc(userRef, userData);
        }
      } catch {
        const appId = generateUniqueId('USR');
        userData = {
          appId,
          googleUid: firebaseUser.uid,
          role: 'user',
          createdAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
        };
      }
      setVyntraUser(userData);
      await putItem(STORES.AUTH, { key: 'current-user', data: userData });
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      if (
        authErr.code === 'auth/user-not-found' ||
        authErr.code === 'auth/wrong-password' ||
        authErr.code === 'auth/invalid-credential'
      ) {
        setError('Incorrect email or password. Please try again.');
      } else if (authErr.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (authErr.code === 'auth/too-many-requests') {
        setError('Too many unsuccessful attempts. Please try again later.');
      } else {
        setError(authErr.message || 'Email sign-in failed.');
      }
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!isOnline) {
      setError('Internet connection required to create an account.');
      return;
    }
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = result.user;

      const appId = generateUniqueId('USR');
      const newUser: VyntraUser = {
        appId,
        googleUid: firebaseUser.uid,
        role: 'user',
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      };

      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        await setDoc(userRef, newUser);
      } catch (err) {
        console.warn('Firestore write warning:', err);
      }
      setVyntraUser(newUser);
      await putItem(STORES.AUTH, { key: 'current-user', data: newUser });
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      if (authErr.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (authErr.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else if (authErr.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(authErr.message || 'Failed to create account.');
      }
      throw err;
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
      signInWithEmail,
      signUpWithEmail,
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
