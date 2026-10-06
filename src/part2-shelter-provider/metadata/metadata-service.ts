/**
 * VYNTRA Part 2 — Metadata Service
 * 
 * Handles reading/writing consolidated metadata to Firebase and IndexedDB.
 * Keeps the metadata document in sync with component changes.
 * 
 * @module part2-shelter-provider/metadata/metadata-service
 */

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../shared/firebase/config';
import { FIRESTORE_PATHS } from '../../shared/firebase/paths';
import { saveToCache, getFromCache, STORES } from '../../shared/utils/offline-cache';
import type { ShelterMetadata } from '../../shared/types';

/**
 * Saves consolidated metadata to both IndexedDB and Firebase.
 * 
 * @param metadata - The consolidated shelter metadata
 */
export async function saveMetadata(metadata: ShelterMetadata): Promise<void> {
  /* Always write to IndexedDB first (offline-first) */
  await saveToCache(STORES.METADATA, metadata);

  /* Attempt Firebase sync only if configured */
  if (isFirebaseConfigured()) {
    try {
      if (navigator.onLine) {
        const metadataRef = doc(db, FIRESTORE_PATHS.shelterMetadata(metadata.shelterId));
        await Promise.race([
          setDoc(metadataRef, metadata),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
        ]);
        console.info(`[VYNTRA] Metadata synced for ${metadata.shelterId}`);
      }
    } catch (error) {
      console.warn('[VYNTRA] Metadata Firebase sync skipped or timed out, saved locally:', error);
    }
  }
}

/**
 * Loads metadata from local cache, falling back to Firebase.
 * 
 * @param shelterId - The shelter ID
 * @returns ShelterMetadata or undefined if not found
 */
export async function loadMetadata(shelterId: string): Promise<ShelterMetadata | undefined> {
  /* Try local cache first */
  const cached = await getFromCache<ShelterMetadata>(STORES.METADATA, shelterId);
  if (cached) return cached;

  /* Fall back to Firebase only if configured */
  if (isFirebaseConfigured()) {
    try {
      if (navigator.onLine) {
        const metadataRef = doc(db, FIRESTORE_PATHS.shelterMetadata(shelterId));
        const snapshot = (await Promise.race([
          getDoc(metadataRef),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
        ])) as any;
        if (snapshot && snapshot.exists && snapshot.exists()) {
          const data = snapshot.data() as ShelterMetadata;
          /* Cache locally for offline access */
          await saveToCache(STORES.METADATA, data);
          return data;
        }
      }
    } catch (error) {
      console.warn('[VYNTRA] Failed to load metadata from Firebase:', error);
    }
  }

  return undefined;
}
