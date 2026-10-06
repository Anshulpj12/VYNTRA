/**
 * VYNTRA — Offline Cache (IndexedDB Wrapper)
 * 
 * Provides offline-first data persistence using IndexedDB via the `idb` library.
 * Unified storage engine supporting Part 1 (User), Part 2 (Shelter), and Part 3 (Service).
 * 
 * @module shared/utils/offline-cache
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'vyntra-offline-db';
const DB_VERSION = 3;

/** Store names mapped to data types */
export const STORES = {
  /* Part 1 User Stores */
  AUTH: 'auth',
  PROFILE: 'profile',
  CYCLES: 'cycles',
  CHAT_CACHE: 'chat-cache',
  SHELTER_CACHE: 'shelter-cache',
  PENDING_SYNC: 'pending-sync',

  /* Part 2 Shelter Provider Stores */
  SHELTER_PROVIDERS: 'shelter-providers',
  OCCUPANTS: 'occupants',
  FACILITIES: 'facilities',
  INVENTORY: 'inventory',
  USAGE_LOG: 'usage-log',
  METADATA: 'metadata',
  SYNC_QUEUE: 'sync-queue',

  /* Part 3 Service Provider Stores */
  SERVICE_PROVIDERS: 'service-providers',
  ORDERS: 'orders',
} as const;

/** Sync queue entry for pending Firebase writes */
export interface SyncQueueEntry {
  id: string;
  store: string;
  operation: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: number;
  retryCount: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

/** Opens (or creates) the VYNTRA IndexedDB database with all stores */
function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        /* Part 1 Stores */
        if (!db.objectStoreNames.contains(STORES.AUTH)) {
          db.createObjectStore(STORES.AUTH, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORES.PROFILE)) {
          db.createObjectStore(STORES.PROFILE, { keyPath: 'appId' });
        }
        if (!db.objectStoreNames.contains(STORES.CYCLES)) {
          db.createObjectStore(STORES.CYCLES, { keyPath: 'cycleId' });
        }
        if (!db.objectStoreNames.contains(STORES.CHAT_CACHE)) {
          db.createObjectStore(STORES.CHAT_CACHE, { keyPath: 'cacheKey' });
        }
        if (!db.objectStoreNames.contains(STORES.SHELTER_CACHE)) {
          db.createObjectStore(STORES.SHELTER_CACHE, { keyPath: 'shelterId' });
        }
        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          db.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id', autoIncrement: true });
        }

        /* Part 2 Stores */
        if (!db.objectStoreNames.contains(STORES.SHELTER_PROVIDERS)) {
          db.createObjectStore(STORES.SHELTER_PROVIDERS, { keyPath: 'shelterId' });
        }
        if (!db.objectStoreNames.contains(STORES.OCCUPANTS)) {
          const occupantStore = db.createObjectStore(STORES.OCCUPANTS, { keyPath: 'personId' });
          occupantStore.createIndex('byShelter', 'shelterId');
          occupantStore.createIndex('byStatus', 'status');
        }
        if (!db.objectStoreNames.contains(STORES.FACILITIES)) {
          const facilityStore = db.createObjectStore(STORES.FACILITIES, { keyPath: 'facilityId' });
          facilityStore.createIndex('byShelter', 'shelterId');
        }
        if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
          const inventoryStore = db.createObjectStore(STORES.INVENTORY, { keyPath: 'itemId' });
          inventoryStore.createIndex('byShelter', 'shelterId');
        }
        if (!db.objectStoreNames.contains(STORES.USAGE_LOG)) {
          const usageStore = db.createObjectStore(STORES.USAGE_LOG, { keyPath: 'logId' });
          usageStore.createIndex('byItem', 'itemId');
          usageStore.createIndex('byShelter', 'shelterId');
        }
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'shelterId' });
        }
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('byTimestamp', 'timestamp');
        }

        /* Part 3 Stores */
        if (!db.objectStoreNames.contains(STORES.SERVICE_PROVIDERS)) {
          db.createObjectStore(STORES.SERVICE_PROVIDERS, { keyPath: 'providerId' });
        }
        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          const orderStore = db.createObjectStore(STORES.ORDERS, { keyPath: 'orderId' });
          orderStore.createIndex('byStatus', 'status');
          orderStore.createIndex('byShelter', 'requestingShelterId');
        }
      },
    });
  }
  return dbPromise;
}

/* ─── Part 1 Helper Functions ─── */

export async function getItem<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get(storeName, key);
}

export async function putItem<T>(storeName: string, item: T): Promise<void> {
  const db = await getDb();
  await db.put(storeName, item);
}

export async function deleteItem(storeName: string, key: string): Promise<void> {
  const db = await getDb();
  await db.delete(storeName, key);
}

export async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return db.getAll(storeName);
}

export async function addPendingSync(operation: {
  type: 'create' | 'update' | 'delete';
  collection: string;
  docId: string;
  data?: unknown;
}): Promise<void> {
  const db = await getDb();
  await db.add(STORES.PENDING_SYNC, {
    ...operation,
    createdAt: Date.now(),
  });
}

export async function getPendingSyncs(): Promise<unknown[]> {
  const db = await getDb();
  return db.getAll(STORES.PENDING_SYNC);
}

export async function clearPendingSyncs(): Promise<void> {
  const db = await getDb();
  await db.clear(STORES.PENDING_SYNC);
}

/* ─── Part 2 Helper Functions ─── */

export async function saveToCache<T>(storeName: string, data: T): Promise<void> {
  const db = await getDb();
  await db.put(storeName, data);
}

export async function getFromCache<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get(storeName, key) as Promise<T | undefined>;
}

export async function getAllFromCache<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return db.getAll(storeName) as Promise<T[]>;
}

export async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: string
): Promise<T[]> {
  const db = await getDb();
  return db.getAllFromIndex(storeName, indexName, value) as Promise<T[]>;
}

export async function deleteFromCache(storeName: string, key: string): Promise<void> {
  const db = await getDb();
  await db.delete(storeName, key);
}

export async function addToSyncQueue(entry: SyncQueueEntry): Promise<void> {
  const db = await getDb();
  await db.put(STORES.SYNC_QUEUE, entry);
}

export async function getPendingSyncEntries(): Promise<SyncQueueEntry[]> {
  const db = await getDb();
  return db.getAllFromIndex(STORES.SYNC_QUEUE, 'byTimestamp') as Promise<SyncQueueEntry[]>;
}

export async function removeSyncEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORES.SYNC_QUEUE, id);
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await getDb();
  await db.clear(storeName);
}
