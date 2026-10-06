/**
 * VYNTRA — Offline Cache (IndexedDB Wrapper)
 * 
 * Provides offline-first data persistence using IndexedDB via the `idb` library.
 * All data operations write to IndexedDB first, then sync to Firebase when online.
 * 
 * @module shared/utils/offline-cache
 */

import { openDB, type IDBPDatabase } from 'idb';

/** Database name for the VYNTRA application */
const DB_NAME = 'vyntra-offline-db';
const DB_VERSION = 1;

/** Store names mapped to data types */
export const STORES = {
  SHELTER_PROVIDERS: 'shelter-providers',
  OCCUPANTS: 'occupants',
  FACILITIES: 'facilities',
  INVENTORY: 'inventory',
  USAGE_LOG: 'usage-log',
  METADATA: 'metadata',
  SYNC_QUEUE: 'sync-queue',
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

/**
 * Opens (or creates) the VYNTRA IndexedDB database with all required stores.
 * 
 * @returns Promise resolving to the database instance
 */
async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      /* Shelter providers store */
      if (!db.objectStoreNames.contains(STORES.SHELTER_PROVIDERS)) {
        db.createObjectStore(STORES.SHELTER_PROVIDERS, { keyPath: 'shelterId' });
      }

      /* Occupants store (keyed by personId, indexed by shelterId) */
      if (!db.objectStoreNames.contains(STORES.OCCUPANTS)) {
        const occupantStore = db.createObjectStore(STORES.OCCUPANTS, { keyPath: 'personId' });
        occupantStore.createIndex('byShelter', 'shelterId');
        occupantStore.createIndex('byStatus', 'status');
      }

      /* Facilities store */
      if (!db.objectStoreNames.contains(STORES.FACILITIES)) {
        const facilityStore = db.createObjectStore(STORES.FACILITIES, { keyPath: 'facilityId' });
        facilityStore.createIndex('byShelter', 'shelterId');
      }

      /* Inventory store */
      if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
        const inventoryStore = db.createObjectStore(STORES.INVENTORY, { keyPath: 'itemId' });
        inventoryStore.createIndex('byShelter', 'shelterId');
      }

      /* Usage log store */
      if (!db.objectStoreNames.contains(STORES.USAGE_LOG)) {
        const usageStore = db.createObjectStore(STORES.USAGE_LOG, { keyPath: 'logId' });
        usageStore.createIndex('byItem', 'itemId');
        usageStore.createIndex('byShelter', 'shelterId');
      }

      /* Metadata store */
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'shelterId' });
      }

      /* Sync queue for pending Firebase writes */
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        syncStore.createIndex('byTimestamp', 'timestamp');
      }
    },
  });
}

/**
 * Saves data to a specified IndexedDB store (offline-first write).
 * 
 * @param storeName - Target object store name
 * @param data - Data to persist
 */
export async function saveToCache<T>(storeName: string, data: T): Promise<void> {
  const db = await getDb();
  await db.put(storeName, data);
}

/**
 * Retrieves a record by key from a specified store.
 * 
 * @param storeName - Source object store name
 * @param key - Primary key of the record
 * @returns The record if found, undefined otherwise
 */
export async function getFromCache<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get(storeName, key) as Promise<T | undefined>;
}

/**
 * Retrieves all records from a specified store.
 * 
 * @param storeName - Source object store name
 * @returns Array of all records in the store
 */
export async function getAllFromCache<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return db.getAll(storeName) as Promise<T[]>;
}

/**
 * Retrieves records by index value from a specified store.
 * 
 * @param storeName - Source object store name
 * @param indexName - Name of the index to query
 * @param value - Index value to match
 * @returns Array of matching records
 */
export async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: string
): Promise<T[]> {
  const db = await getDb();
  return db.getAllFromIndex(storeName, indexName, value) as Promise<T[]>;
}

/**
 * Deletes a record by key from a specified store.
 * 
 * @param storeName - Target object store name
 * @param key - Primary key of the record to delete
 */
export async function deleteFromCache(storeName: string, key: string): Promise<void> {
  const db = await getDb();
  await db.delete(storeName, key);
}

/**
 * Adds an operation to the sync queue for later Firebase synchronization.
 * 
 * @param entry - The sync queue entry describing the pending operation
 */
export async function addToSyncQueue(entry: SyncQueueEntry): Promise<void> {
  const db = await getDb();
  await db.put(STORES.SYNC_QUEUE, entry);
}

/**
 * Retrieves all pending sync operations ordered by timestamp.
 * 
 * @returns Array of pending sync entries
 */
export async function getPendingSyncEntries(): Promise<SyncQueueEntry[]> {
  const db = await getDb();
  return db.getAllFromIndex(STORES.SYNC_QUEUE, 'byTimestamp') as Promise<SyncQueueEntry[]>;
}

/**
 * Removes a completed sync entry from the queue.
 * 
 * @param id - ID of the sync entry to remove
 */
export async function removeSyncEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORES.SYNC_QUEUE, id);
}

/**
 * Clears all data from a specified store.
 * 
 * @param storeName - Store to clear
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await getDb();
  await db.clear(storeName);
}
