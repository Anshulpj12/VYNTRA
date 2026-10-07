/**
 * VYNTRA — Auth Context Provider
 * 
 * Manages authentication (Google, Email/Password, Guest) and multi-role switching.
 * Persists role selection and per-role data (UserProfile, ShelterProvider, ServiceProvider)
 * in both IndexedDB (offline-first) and Firestore (background sync).
 * 
 * ROLE ISOLATION & PER-ROLE DATA:
 * - Each role maintains its own sign-in status (signedInRoles).
 * - Signing into one role does NOT automatically force or sign in other roles.
 * - Profile data for each role is linked under the user's account in Firestore
 *   (users/{uid}.profile, users/{uid}.shelter, users/{uid}.serviceProvider,
 *   as well as direct collection queries in shelter-providers and service-providers).
 * - Re-logging in restores all role-specific data from the database.
 * 
 * @module part1-user-system/auth/AuthContext
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import {
  signInWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { auth, googleProvider, db, withFirestoreTimeout } from '../../shared/firebase/config';
import { generateUniqueId } from '../../shared/utils/id-generator';
import { getItem, putItem, getAllFromCache, STORES } from '../../shared/utils/offline-cache';
import type { VyntraUser, UserProfile, ShelterProvider, ServiceProvider } from '../../shared/types';
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
  /** Roles currently signed in for this session */
  signedInRoles: UserRole[];
  /** Check if a specific role is signed in */
  isRoleSignedIn: (role: UserRole) => boolean;

  /* ─── Auth Actions (return loaded RoleData for immediate deterministic navigation) ─── */
  signInWithGoogle: (forRole?: UserRole) => Promise<RoleData>;
  signInWithEmail: (email: string, password: string, forRole?: UserRole) => Promise<RoleData>;
  signUpWithEmail: (email: string, password: string, forRole?: UserRole) => Promise<RoleData>;
  signInAsGuest: (forRole?: UserRole) => Promise<RoleData>;
  signOut: (fromRole?: UserRole) => Promise<void>;

  /* ─── Role Actions ─── */
  /** Switch active role, persist to Firestore/cache, and load role data */
  setActiveRole: (role: UserRole) => Promise<void>;
  /** Refresh/reload data for all roles from cache / database */
  refreshRoleData: () => Promise<RoleData>;
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
 * Loads role-specific data directly from Firestore database.
 * Ensures user profile, shelter details, and service provider details are loaded upon re-login.
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

        // If shelterId is present but not full shelter object
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

    // 2. Query shelter-providers collection by providerGoogleUid if not found yet
    if (!data.shelterProvider && googleUid) {
      try {
        const q = query(
          collection(db, 'shelter-providers'),
          where('providerGoogleUid', '==', googleUid),
          limit(1)
        );
        const qSnap = await withFirestoreTimeout(getDocs(q), 2500);
        if (qSnap && !qSnap.empty) {
          data.shelterProvider = qSnap.docs[0].data() as ShelterProvider;
          // Backfill to user doc for fast direct retrieval
          const userRef = doc(db, 'users', googleUid);
          setDoc(userRef, {
            shelter: data.shelterProvider,
            shelterId: data.shelterProvider.shelterId
          }, { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.warn('[VYNTRA Auth] Shelter collection query error:', err);
      }
    }

    // 3. Query service-providers collection by providerGoogleUid if not found yet
    if (!data.serviceProvider && googleUid) {
      try {
        const q = query(
          collection(db, 'service-providers'),
          where('providerGoogleUid', '==', googleUid),
          limit(1)
        );
        const qSnap = await withFirestoreTimeout(getDocs(q), 2500);
        if (qSnap && !qSnap.empty) {
          data.serviceProvider = qSnap.docs[0].data() as ServiceProvider;
          // Backfill to user doc for fast direct retrieval
          const userRef = doc(db, 'users', googleUid);
          setDoc(userRef, {
            serviceProvider: data.serviceProvider,
            serviceProviderId: data.serviceProvider.providerId
          }, { merge: true }).catch(() => {});
        }
      } catch (err) {
        console.warn('[VYNTRA Auth] Service collection query error:', err);
      }
    }

    // 4. Fallback check for user profile at users/{appId}
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

  // Track signed-in roles independently
  const [signedInRoles, setSignedInRoles] = useState<UserRole[]>(() => {
    try {
      const raw = localStorage.getItem('vyntra_signed_in_roles');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const isRoleSignedIn = useCallback((role: UserRole) => {
    return signedInRoles.includes(role);
  }, [signedInRoles]);

  const addSignedInRole = useCallback((role: UserRole) => {
    setSignedInRoles((prev) => {
      if (prev.includes(role)) return prev;
      const next = [...prev, role];
      try {
        localStorage.setItem('vyntra_signed_in_roles', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const removeSignedInRole = useCallback((role: UserRole) => {
    setSignedInRoles((prev) => {
      const next = prev.filter((r) => r !== role);
      try {
        localStorage.setItem('vyntra_signed_in_roles', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  /**
   * Flag to prevent onAuthStateChanged from racing with explicit sign-in calls.
   */
  const isSigningInRef = useRef(false);

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
   * Returns the final resolved RoleData object.
   */
  const loadAllRolesData = useCallback(async (appId: string, googleUid: string): Promise<RoleData> => {
    setRoleDataLoading(true);
    let data: RoleData = {
      userProfile: null,
      shelterProvider: null,
      serviceProvider: null,
    };
    try {
      // Step 1: Read all role data from cache and local storage
      data = await loadAllRoleDataFromCache(appId, googleUid);

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
          const profileWithAppId = { ...firestoreData.userProfile, appId };
          await putItem(STORES.PROFILE, profileWithAppId);
          try {
            localStorage.setItem(`vyntra_profile_${appId}`, JSON.stringify(profileWithAppId));
            localStorage.setItem('vyntra_active_profile', JSON.stringify(profileWithAppId));
          } catch {}
        }
        if (firestoreData.shelterProvider) {
          await putItem(STORES.SHELTER_PROVIDERS, firestoreData.shelterProvider);
          try {
            localStorage.setItem('vyntra_shelter_provider', JSON.stringify(firestoreData.shelterProvider));
            localStorage.setItem('vyntra_shelter_state', JSON.stringify({ shelter: firestoreData.shelterProvider, activeTab: 'dashboard' }));
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
    return data;
  }, []);

  /**
   * Persist vyntraUser to cache and background-sync to Firestore.
   */
  const persistVyntraUser = useCallback(async (userData: VyntraUser) => {
    await putItem(STORES.AUTH, { key: 'current-user', data: userData });
    const userRef = doc(db, 'users', userData.googleUid);
    withFirestoreTimeout(async () => {
      await setDoc(userRef, userData, { merge: true });
    }, 2000).catch(() => {});
  }, []);

  /**
   * Internal helper: finalize sign-in, bind to specific role, and load database data.
   */
  const finalizeSignIn = useCallback(async (userData: VyntraUser, targetRole: UserRole): Promise<RoleData> => {
    setVyntraUser(userData);
    setActiveRoleState(targetRole);
    addSignedInRole(targetRole);
    await putItem(STORES.AUTH, { key: 'current-user', data: userData });
    const loadedData = await loadAllRolesData(userData.appId, userData.googleUid);
    return loadedData;
  }, [loadAllRolesData, addSignedInRole]);

  // Listen to Firebase auth state + load cached auth
  useEffect(() => {
    let hasLoadedCache = false;

    const loadCachedAuth = async () => {
      try {
        const cached = await getItem<{ key: string; data: VyntraUser }>(STORES.AUTH, 'current-user');
        if (cached?.data) {
          setVyntraUser(cached.data);
          setActiveRoleState(cached.data.role);
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

      // If a sign-in method is currently executing, let it handle user loading.
      if (isSigningInRef.current) {
        setLoading(false);
        return;
      }

      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000);

          if (userSnap && userSnap.exists()) {
            const data = userSnap.data() as VyntraUser;
            setVyntraUser(data);
            setActiveRoleState(data.role);
            await putItem(STORES.AUTH, { key: 'current-user', data });
            await loadAllRolesData(data.appId, data.googleUid);
          } else {
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
            withFirestoreTimeout(async () => {
              await setDoc(userRef, newUser);
            }, 2000).catch(() => {});
            await loadAllRolesData(appId, firebaseUser.uid);
          }
        } catch {
          // Offline or network error — preserve existing cached vyntraUser
        }
      } else {
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

  /**
   * Sign in with Google specifically for a selected role.
   * Restores user profile / shelter / provider details from Firestore.
   */
  const signInWithGoogle = async (forRole?: UserRole): Promise<RoleData> => {
    if (!isOnline) {
      setError('Internet connection required for Google sign in. Try Continuing as Emergency Guest.');
      throw new Error('Offline');
    }
    setError(null);
    isSigningInRef.current = true;
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const roleToApply = forRole || 'user';

      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000);

      let loadedData: RoleData;

      if (!userSnap || !userSnap.exists()) {
        // First-time user — create with selected role
        const appId = generateUniqueId('USR');
        const newUser: VyntraUser = {
          appId,
          googleUid: firebaseUser.uid,
          role: roleToApply,
          createdAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
        };
        loadedData = await finalizeSignIn(newUser, roleToApply);
        withFirestoreTimeout(async () => {
          await setDoc(userRef, newUser);
        }, 2000).catch(() => {});
      } else {
        // Existing user — update to selected role and load their database data
        const data = userSnap.data() as VyntraUser;
        const updatedUser: VyntraUser = {
          ...data,
          role: roleToApply,
          lastLoginAt: Timestamp.now(),
        };
        loadedData = await finalizeSignIn(updatedUser, roleToApply);
        withFirestoreTimeout(async () => {
          await setDoc(userRef, updatedUser, { merge: true });
        }, 2000).catch(() => {});
      }

      return loadedData;
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      const code = authErr?.code || '';
      console.error('[VYNTRA Auth] Google sign-in error:', code, authErr?.message);
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      let friendlyMsg = `Google Sign-in failed: ${authErr?.message || code || 'Unknown error'}`;

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        friendlyMsg = 'Sign-in popup was closed. Please try again.';
      } else if (code === 'auth/popup-blocked') {
        friendlyMsg = 'Popup was blocked by your browser. Please allow popups for this site and try again.';
      } else if (code === 'auth/unauthorized-domain') {
        friendlyMsg = `Domain "${currentHost}" is not authorized in Firebase. Add "${currentHost}" in Firebase Console → Authentication → Settings → Authorized Domains.`;
      } else if (code === 'auth/operation-not-allowed') {
        friendlyMsg = 'Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in Method → Google.';
      } else if (code === 'auth/network-request-failed') {
        friendlyMsg = 'Network error. Check your internet connection and try again.';
      } else if (code === 'auth/internal-error') {
        friendlyMsg = 'Internal authentication error. Please try again in a moment.';
      }

      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      isSigningInRef.current = false;
    }
  };

  /**
   * Sign in with email/password specifically for a selected role.
   */
  const signInWithEmail = async (email: string, password: string, forRole?: UserRole): Promise<RoleData> => {
    if (!isOnline) {
      setError('Internet connection required for email login.');
      throw new Error('Offline');
    }
    setError(null);
    isSigningInRef.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = result.user;
      const roleToApply = forRole || 'user';

      const userRef = doc(db, 'users', firebaseUser.uid);
      let userData: VyntraUser;
      try {
        const userSnap = await withFirestoreTimeout(getDoc(userRef), 2000);
        if (userSnap && userSnap.exists()) {
          const existing = userSnap.data() as VyntraUser;
          userData = { ...existing, role: roleToApply, lastLoginAt: Timestamp.now() };
          withFirestoreTimeout(async () => {
            await setDoc(userRef, userData, { merge: true });
          }, 2000).catch(() => {});
        } else {
          const appId = generateUniqueId('USR');
          userData = {
            appId,
            googleUid: firebaseUser.uid,
            role: roleToApply,
            createdAt: Timestamp.now(),
            lastLoginAt: Timestamp.now(),
          };
          withFirestoreTimeout(async () => {
            await setDoc(userRef, userData);
          }, 2000).catch(() => {});
        }
      } catch {
        const appId = generateUniqueId('USR');
        userData = {
          appId,
          googleUid: firebaseUser.uid,
          role: roleToApply,
          createdAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
        };
      }
      const loadedData = await finalizeSignIn(userData, roleToApply);
      return loadedData;
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
    } finally {
      isSigningInRef.current = false;
    }
  };

  /**
   * Create account with email/password specifically for a selected role.
   */
  const signUpWithEmail = async (email: string, password: string, forRole?: UserRole): Promise<RoleData> => {
    if (!isOnline) {
      setError('Internet connection required to create an account.');
      throw new Error('Offline');
    }
    setError(null);
    isSigningInRef.current = true;
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = result.user;
      const roleToApply = forRole || 'user';

      const appId = generateUniqueId('USR');
      const newUser: VyntraUser = {
        appId,
        googleUid: firebaseUser.uid,
        role: roleToApply,
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      };

      const userRef = doc(db, 'users', firebaseUser.uid);
      withFirestoreTimeout(async () => {
        await setDoc(userRef, newUser);
      }, 2000).catch((err) => {
        console.warn('Firestore write warning:', err);
      });
      const loadedData = await finalizeSignIn(newUser, roleToApply);
      return loadedData;
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
    } finally {
      isSigningInRef.current = false;
    }
  };

  /**
   * Sign in as emergency guest specifically for a selected role.
   */
  const signInAsGuest = async (forRole?: UserRole): Promise<RoleData> => {
    setError(null);
    const roleToApply = forRole || 'user';
    try {
      const appId = generateUniqueId('USR');
      const guestUser: VyntraUser = {
        appId,
        googleUid: `guest-${Date.now()}`,
        role: roleToApply,
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      };
      const loadedData = await finalizeSignIn(guestUser, roleToApply);
      return loadedData;
    } catch {
      setError('Could not initialize emergency guest mode.');
      throw new Error('Guest init failed');
    }
  };

  /**
   * Switch the user's active role.
   */
  const setActiveRole = async (role: UserRole) => {
    if (!vyntraUser) return;

    const updatedUser: VyntraUser = {
      ...vyntraUser,
      role,
    };

    setVyntraUser(updatedUser);
    setActiveRoleState(role);
    addSignedInRole(role);

    await persistVyntraUser(updatedUser);
    await loadAllRolesData(updatedUser.appId, updatedUser.googleUid);
  };

  /**
   * Refresh/reload role data for all roles from cache / Firestore.
   */
  const refreshRoleData = async (): Promise<RoleData> => {
    if (!vyntraUser) {
      return { userProfile: null, shelterProvider: null, serviceProvider: null };
    }
    return await loadAllRolesData(vyntraUser.appId, vyntraUser.googleUid);
  };

  /**
   * Sign out — either from a specific role or complete sign out.
   */
  const handleSignOut = async (fromRole?: UserRole) => {
    if (fromRole) {
      removeSignedInRole(fromRole);
      return;
    }

    try {
      await auth.signOut();
    } catch (err) {
      console.warn('Firebase signout warning:', err);
    } finally {
      setUser(null);
      setVyntraUser(null);
      setActiveRoleState('user');
      setSignedInRoles([]);
      try {
        localStorage.removeItem('vyntra_signed_in_roles');
      } catch {}
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
      signedInRoles,
      isRoleSignedIn,
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
