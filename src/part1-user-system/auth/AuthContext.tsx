/**
 * VYNTRA — Auth Context Provider
 * 
 * Manages authentication (Google, Email/Password, Guest) and multi-role switching.
 * Persists role selection and per-role data (UserProfile, ShelterProvider, ServiceProvider)
 * in both IndexedDB (offline-first) and Firestore (background sync).
 * 
 * On login, existing user data is loaded automatically — no re-filling forms.
 * On role switch, the new role is persisted and role-specific data is loaded.
 * 
 * @module part1-user-system/auth/AuthContext
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  signInWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, withFirestoreTimeout } from '../../shared/firebase/config';
import { generateUniqueId } from '../../shared/utils/id-generator';
import { getItem, putItem, getAllFromCache, STORES } from '../../shared/utils/offline-cache';
import type { VyntraUser, UserProfile, ShelterProvider, ServiceProvider } from '../../shared/types';
import { Timestamp } from 'firebase/firestore';
import { FIRESTORE_PATHS } from '../../shared/firebase/paths';

/** The three possible roles in the system */
export type UserRole = 'user' | 'shelter-provider' | 'service-provider';

/** Per-role data loaded from IndexedDB/Firestore */
export interface RoleData {
  userProfile: UserProfile | null;
  shelterProvider: ShelterProvider | null;
  serviceProvider: ServiceProvider | null;
}

interface AuthState {
  /** Firebase Auth user object */
  user: User | null;
  /** VYNTRA application user (with appId, role, timestamps) */
  vyntraUser: VyntraUser | null;
  /** Whether auth is still loading */
  loading: boolean;
  /** Network connectivity status */
  isOnline: boolean;
  /** Current auth error message */
  error: string | null;
  /** The currently active role */
  activeRole: UserRole;
  /** Per-role data loaded from cache/Firestore */
  roleData: RoleData;
  /** Whether role-specific data is being loaded */
  roleDataLoading: boolean;

  /* ─── Auth Actions ─── */
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;

  /* ─── Role Actions ─── */
  /** Switch active role, persist to Firestore/cache, and load role data */
  setActiveRole: (role: UserRole) => Promise<void>;
  /** Refresh/reload data for the current role from cache */
  refreshRoleData: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Loads all role-specific data from IndexedDB cache and localStorage.
 * Restores userProfile, shelterProvider, and serviceProvider simultaneously.
 */
async function loadAllRoleDataFromCache(appId: string, googleUid: string): Promise<RoleData> {
  const data: RoleData = {
    userProfile: null,
    shelterProvider: null,
    serviceProvider: null,
  };

  try {
    // 1. User Profile: IndexedDB -> localStorage -> all cached profiles
    let profile = await getItem<UserProfile>(STORES.PROFILE, appId);
    if (!profile) {
      try {
        const raw = localStorage.getItem('vyntra_active_profile') || localStorage.getItem(`vyntra_profile_${appId}`);
        if (raw) profile = JSON.parse(raw);
      } catch {}
    }
    if (!profile) {
      const allProfiles = await getAllFromCache<UserProfile>(STORES.PROFILE);
      profile = allProfiles.find((p) => p.appId === appId || (p as { googleUid?: string }).googleUid === googleUid) || (allProfiles.length > 0 ? allProfiles[0] : undefined);
    }
    if (profile) data.userProfile = profile;

    // 2. Shelter Provider: IndexedDB -> localStorage -> all cached shelters
    let shelter: ShelterProvider | null = null;
    const allShelters = await getAllFromCache<ShelterProvider>(STORES.SHELTER_PROVIDERS);
    shelter = allShelters.find((s) => s.providerGoogleUid === googleUid) || (allShelters.length > 0 ? allShelters[0] : null);

    if (!shelter) {
      try {
        const raw = localStorage.getItem('vyntra_shelter_provider');
        if (raw) shelter = JSON.parse(raw);
        else {
          const stateRaw = localStorage.getItem('vyntra_shelter_state');
          if (stateRaw) {
            const parsed = JSON.parse(stateRaw);
            if (parsed?.shelter) shelter = parsed.shelter;
          }
        }
      } catch {}
    }
    if (shelter) data.shelterProvider = shelter;

    // 3. Service Provider: IndexedDB -> localStorage -> all cached providers
    let provider: ServiceProvider | null = null;
    const allProviders = await getAllFromCache<ServiceProvider>(STORES.SERVICE_PROVIDERS);
    provider = allProviders.find((p) => p.providerGoogleUid === googleUid) || (allProviders.length > 0 ? allProviders[0] : null);

    if (!provider) {
      try {
        const raw = localStorage.getItem('vyntra_service_provider_profile');
        if (raw) provider = JSON.parse(raw);
      } catch {}
    }
    if (provider) data.serviceProvider = provider;
  } catch (err) {
    console.warn('[VYNTRA Auth] Could not load role data from cache:', err);
  }

  return data;
}

/**
 * Attempts to load role-specific data from Firestore if not found in cache.
 */
async function loadAllRoleDataFromFirestore(
  appId: string,
  googleUid: string
): Promise<Partial<RoleData>> {
  const data: Partial<RoleData> = {};

  try {
    // 1. Read user doc from users/{googleUid}
    if (googleUid) {
      const userRef = doc(db, 'users', googleUid);
      const snap = await withFirestoreTimeout(getDoc(userRef), 2500);
      if (snap && snap.exists()) {
        const uData = snap.data();
        if (uData.profile) data.userProfile = uData.profile as UserProfile;
        if (uData.shelter) data.shelterProvider = uData.shelter as ShelterProvider;
        if (uData.serviceProvider) data.serviceProvider = uData.serviceProvider as ServiceProvider;

        // If shelterId is present but not shelter object
        if (!data.shelterProvider && uData.shelterId) {
          const shlRef = doc(db, FIRESTORE_PATHS.shelterProvider(uData.shelterId));
          const shlSnap = await withFirestoreTimeout(getDoc(shlRef), 2000);
          if (shlSnap && shlSnap.exists()) {
            data.shelterProvider = shlSnap.data() as ShelterProvider;
          }
        }

        // If serviceProviderId is present
        if (!data.serviceProvider && uData.serviceProviderId) {
          const svcRef = doc(db, FIRESTORE_PATHS.serviceProvider(uData.serviceProviderId));
          const svcSnap = await withFirestoreTimeout(getDoc(svcRef), 2000);
          if (svcSnap && svcSnap.exists()) {
            data.serviceProvider = svcSnap.data() as ServiceProvider;
          }
        }
      }
    }

    // 2. Fallback check for user profile at users/{appId}
    if (!data.userProfile && appId) {
      const appRef = doc(db, 'users', appId);
      const appSnap = await withFirestoreTimeout(getDoc(appRef), 2000);
      if (appSnap && appSnap.exists()) {
        const aData = appSnap.data();
        if (aData.profile) data.userProfile = aData.profile as UserProfile;
      }
    }
  } catch (err) {
    console.warn('[VYNTRA Auth] Firestore role data load skipped:', err);
  }

  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [vyntraUser, setVyntraUser] = useState<VyntraUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [activeRole, setActiveRoleState] = useState<UserRole>('user');
  const [roleData, setRoleData] = useState<RoleData>({
    userProfile: null,
    shelterProvider: null,
    serviceProvider: null,
  });
  const [roleDataLoading, setRoleDataLoading] = useState(false);

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

  /**
   * Load role-specific data for ALL roles concurrently.
   * Restores cache first, then syncs from Firestore if available.
   */
  const loadAllRolesData = useCallback(async (appId: string, googleUid: string) => {
    setRoleDataLoading(true);
    try {
      // Step 1: Read all role data from cache and local storage
      let data = await loadAllRoleDataFromCache(appId, googleUid);

      // Step 2: If online and some roles missing, consult Firestore
      const isMissingAny = !data.userProfile || !data.shelterProvider || !data.serviceProvider;
      if (isMissingAny && navigator.onLine) {
        const firestoreData = await loadAllRoleDataFromFirestore(appId, googleUid);
        data = {
          userProfile: data.userProfile || firestoreData.userProfile || null,
          shelterProvider: data.shelterProvider || firestoreData.shelterProvider || null,
          serviceProvider: data.serviceProvider || firestoreData.serviceProvider || null,
        };

        // Cache restored data locally for future offline resilience
        if (firestoreData.userProfile) {
          await putItem(STORES.PROFILE, firestoreData.userProfile);
          try {
            localStorage.setItem('vyntra_active_profile', JSON.stringify(firestoreData.userProfile));
          } catch {}
        }
        if (firestoreData.shelterProvider) {
          await putItem(STORES.SHELTER_PROVIDERS, firestoreData.shelterProvider);
          try {
            localStorage.setItem('vyntra_shelter_provider', JSON.stringify(firestoreData.shelterProvider));
          } catch {}
        }
        if (firestoreData.serviceProvider) {
          await putItem(STORES.SERVICE_PROVIDERS, firestoreData.serviceProvider);
          try {
            localStorage.setItem('vyntra_service_provider_profile', JSON.stringify(firestoreData.serviceProvider));
          } catch {}
        }
      }

      setRoleData(data);
    } catch (err) {
      console.warn('[VYNTRA Auth] Role data load error:', err);
    } finally {
      setRoleDataLoading(false);
    }
  }, []);

  /**
   * Persist vyntraUser to cache and background-sync to Firestore.
   */
  const persistVyntraUser = useCallback(async (userData: VyntraUser) => {
    await putItem(STORES.AUTH, { key: 'current-user', data: userData });
    // Background Firestore sync — never block
    const userRef = doc(db, 'users', userData.googleUid);
    withFirestoreTimeout(async () => {
      await setDoc(userRef, userData, { merge: true });
    }, 2000).catch(() => {});
  }, []);

  // Listen to Firebase auth state + load cached auth
  useEffect(() => {
    let hasLoadedCache = false;

    const loadCachedAuth = async () => {
      try {
        const cached = await getItem<{ key: string; data: VyntraUser }>(STORES.AUTH, 'current-user');
        if (cached?.data) {
          setVyntraUser(cached.data);
          setActiveRoleState(cached.data.role);
          // Load role data for all roles
          await loadAllRolesData(cached.data.appId, cached.data.googleUid);
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
          // Try to get existing VYNTRA user from Firestore (with safety timeout)
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000);

          if (userSnap && userSnap.exists()) {
            const data = userSnap.data() as VyntraUser;
            setVyntraUser(data);
            setActiveRoleState(data.role);
            await putItem(STORES.AUTH, { key: 'current-user', data });
            // Load role data for all roles
            await loadAllRolesData(data.appId, data.googleUid);
          } else {
            // First time login or Firestore unreachable — create locally
            const appId = generateUniqueId('USR');
            const newUser: VyntraUser = {
              appId,
              googleUid: firebaseUser.uid,
              role: 'user',
              createdAt: Timestamp.now(),
              lastLoginAt: Timestamp.now(),
            };
            setVyntraUser(newUser);
            setActiveRoleState('user');
            await putItem(STORES.AUTH, { key: 'current-user', data: newUser });
            // Background sync to Firestore — never block
            withFirestoreTimeout(async () => {
              await setDoc(userRef, newUser);
            }, 2000).catch(() => {});
            await loadAllRolesData(appId, firebaseUser.uid);
          }
        } catch {
          // Offline or network error — preserve existing cached vyntraUser
        }
      } else {
        // If online, do NOT clear vyntraUser — preserve offline session
        if (navigator.onLine && hasLoadedCache) {
          const cached = await getItem<{ key: string; data: VyntraUser }>(STORES.AUTH, 'current-user');
          if (!cached?.data) {
            setVyntraUser(null);
            setRoleData({
              userProfile: null,
              shelterProvider: null,
              serviceProvider: null,
            });
          }
        }
      }
      setLoading(false);
    });

    const handleRoleUpdate = () => {
      // Re-read current cached user if available
      getItem<{ key: string; data: VyntraUser }>(STORES.AUTH, 'current-user').then((cached) => {
        if (cached?.data) {
          void loadAllRolesData(cached.data.appId, cached.data.googleUid);
        }
      }).catch(() => {});
    };

    window.addEventListener('vyntra-role-data-updated', handleRoleUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('vyntra-role-data-updated', handleRoleUpdate);
    };
  }, [loadAllRolesData]);

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
      const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000);

      if (!userSnap || !userSnap.exists()) {
        const appId = generateUniqueId('USR');
        const newUser: VyntraUser = {
          appId,
          googleUid: firebaseUser.uid,
          role: 'user',
          createdAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
        };
        setVyntraUser(newUser);
        setActiveRoleState('user');
        await putItem(STORES.AUTH, { key: 'current-user', data: newUser });
        // Background sync — never block
        withFirestoreTimeout(async () => {
          await setDoc(userRef, newUser);
        }, 2000).catch(() => {});
        await loadAllRolesData(appId, firebaseUser.uid);
      } else {
        const data = userSnap.data() as VyntraUser;
        setVyntraUser(data);
        setActiveRoleState(data.role);
        await putItem(STORES.AUTH, { key: 'current-user', data });
        // Load existing role data for all roles
        await loadAllRolesData(data.appId, data.googleUid);
        // Background sync lastLogin — never block
        withFirestoreTimeout(async () => {
          await setDoc(userRef, { ...data, lastLoginAt: Timestamp.now() });
        }, 2000).catch(() => {});
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
        const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000);
        if (userSnap && userSnap.exists()) {
          userData = userSnap.data() as VyntraUser;
          // Background sync lastLogin — never block
          withFirestoreTimeout(async () => {
            await setDoc(userRef, { ...userData, lastLoginAt: Timestamp.now() });
          }, 2000).catch(() => {});
        } else {
          const appId = generateUniqueId('USR');
          userData = {
            appId,
            googleUid: firebaseUser.uid,
            role: 'user',
            createdAt: Timestamp.now(),
            lastLoginAt: Timestamp.now(),
          };
          // Background sync — never block
          withFirestoreTimeout(async () => {
            await setDoc(userRef, userData);
          }, 2000).catch(() => {});
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
      setActiveRoleState(userData.role);
      await putItem(STORES.AUTH, { key: 'current-user', data: userData });
      await loadAllRolesData(userData.appId, userData.googleUid);
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
      // Background sync — never block
      withFirestoreTimeout(async () => {
        await setDoc(userRef, newUser);
      }, 2000).catch((err) => {
        console.warn('Firestore write warning:', err);
      });
      setVyntraUser(newUser);
      setActiveRoleState('user');
      await putItem(STORES.AUTH, { key: 'current-user', data: newUser });
      await loadAllRolesData(appId, firebaseUser.uid);
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
      setActiveRoleState('user');
      await putItem(STORES.AUTH, { key: 'current-user', data: guestUser });
      await loadAllRolesData(appId, guestUser.googleUid);
    } catch {
      setError('Could not initialize emergency guest mode.');
    }
  };

  /**
   * Switch the user's active role.
   * Persists the new role to both local cache and Firestore.
   * Then loads role-specific data.
   */
  const setActiveRole = async (role: UserRole) => {
    if (!vyntraUser) return;

    const updatedUser: VyntraUser = {
      ...vyntraUser,
      role,
    };

    setVyntraUser(updatedUser);
    setActiveRoleState(role);

    // Persist updated role
    await persistVyntraUser(updatedUser);

    // Load data for all roles
    await loadAllRolesData(updatedUser.appId, updatedUser.googleUid);
  };

  /**
   * Refresh/reload role data for all roles from cache / Firestore.
   * Call this after profile creation, shelter registration, etc.
   */
  const refreshRoleData = async () => {
    if (!vyntraUser) return;
    await loadAllRolesData(vyntraUser.appId, vyntraUser.googleUid);
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.warn('Firebase signout warning:', err);
    } finally {
      setUser(null);
      setVyntraUser(null);
      setActiveRoleState('user');
      setRoleData({
        userProfile: null,
        shelterProvider: null,
        serviceProvider: null,
      });
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
      activeRole,
      roleData,
      roleDataLoading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signInAsGuest,
      signOut: handleSignOut,
      setActiveRole,
      refreshRoleData,
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
