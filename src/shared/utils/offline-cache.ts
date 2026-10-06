/**
 * VYNTRA — Offline Cache (IndexedDB Wrapper)
 * Uses the 'idb' library for a promise-based IndexedDB API.
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'vyntra-offline';
const DB_VERSION = 1;

// Store names
export const STORES = {
  AUTH: 'auth',
  PROFILE: 'profile',
  CYCLES: 'cycles',
  CHAT_CACHE: 'chat-cache',
  SHELTER_CACHE: 'shelter-cache',
  PENDING_SYNC: 'pending-sync',
} as const;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Auth store — cached auth state
        if (!db.objectStoreNames.contains(STORES.AUTH)) {
          db.createObjectStore(STORES.AUTH, { keyPath: 'key' });
        }
        // Profile store — user profile data
        if (!db.objectStoreNames.contains(STORES.PROFILE)) {
          db.createObjectStore(STORES.PROFILE, { keyPath: 'appId' });
        }
        // Cycles store — menstrual cycle records
        if (!db.objectStoreNames.contains(STORES.CYCLES)) {
          db.createObjectStore(STORES.CYCLES, { keyPath: 'cycleId' });
        }
        // Chat cache — World Chat fetched records
        if (!db.objectStoreNames.contains(STORES.CHAT_CACHE)) {
          db.createObjectStore(STORES.CHAT_CACHE, { keyPath: 'cacheKey' });
        }
        // Shelter cache — downloaded shelter data for SOS
        if (!db.objectStoreNames.contains(STORES.SHELTER_CACHE)) {
          db.createObjectStore(STORES.SHELTER_CACHE, { keyPath: 'shelterId' });
        }
        // Pending sync — offline changes waiting to sync
        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          db.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

/** Get a single item by key from a store */
export async function getItem<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(storeName, key);
}

/** Put (upsert) an item into a store */
export async function putItem<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  await db.put(storeName, item);
}

/** Delete an item by key from a store */
export async function deleteItem(storeName: string, key: string): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, key);
}

/** Get all items from a store */
export async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return db.getAll(storeName);
}

/** Clear all items from a store */
export async function clearStore(storeName: string): Promise<void> {
  const db = await getDB();
  await db.clear(storeName);
}

/** Add an item to the pending sync queue */
export async function addPendingSync(operation: {
  type: 'create' | 'update' | 'delete';
  collection: string;
  docId: string;
  data?: unknown;
}): Promise<void> {
  const db = await getDB();
  await db.add(STORES.PENDING_SYNC, {
    ...operation,
    createdAt: Date.now(),
  });
}

/** Get all pending sync items */
export async function getPendingSyncs(): Promise<unknown[]> {
  const db = await getDB();
  return db.getAll(STORES.PENDING_SYNC);
}

/** Clear all pending syncs after successful sync */
export async function clearPendingSyncs(): Promise<void> {
  const db = await getDB();
  await db.clear(STORES.PENDING_SYNC);
}
