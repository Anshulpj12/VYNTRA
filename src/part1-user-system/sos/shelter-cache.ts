/**
 * VYNTRA — Shelter Cache Service (Part 1 SOS Module)
 *
 * Downloads shelter provider metadata filtered by the user's district
 * from Firebase when internet is available, then persists it to the
 * IndexedDB `shelter-cache` store for fully offline SOS shelter discovery.
 *
 * Data flow:
 *   Firebase `shelter-providers` (where district == userDistrict)
 *     → Convert to ShelterMetadata
 *     → putItem(STORES.SHELTER_CACHE, ...)
 *     → Available offline for ranking & SMS dispatch
 *
 * @module part1-user-system/sos/shelter-cache
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../shared/firebase/config';
import { withFirestoreTimeout } from '../../shared/firebase/config';
import {
  getAllItems,
  putItem,
  STORES,
} from '../../shared/utils/offline-cache';
import type {
  ShelterProvider,
  ShelterMetadata,
  Coordinates,
} from '../../shared/types';

/* ─── Sync Metadata Tracking ────────────────────────────────────── */

/** Key used to store per-district sync timestamps in localStorage */
const SYNC_TS_PREFIX = 'vyntra_shelter_sync_';

/** Minimum interval between successive syncs for the same district (ms) */
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns the last-synced Unix timestamp for a given district.
 *
 * @param district - The district name to check
 * @returns Millisecond timestamp of last sync, or 0 if never synced
 */
export function getLastSyncTimestamp(district: string): number {
  const raw = localStorage.getItem(`${SYNC_TS_PREFIX}${district.toLowerCase()}`);
  return raw ? parseInt(raw, 10) : 0;
}

/**
 * Records that a successful sync just completed for a district.
 *
 * @param district - The district name that was synced
 */
function setLastSyncTimestamp(district: string): void {
  localStorage.setItem(
    `${SYNC_TS_PREFIX}${district.toLowerCase()}`,
    String(Date.now())
  );
}

/**
 * Checks whether a re-sync is needed for the given district.
 * Returns true if the district has never been synced or the last
 * sync was more than MIN_SYNC_INTERVAL_MS ago.
 *
 * @param district - The district name to evaluate
 * @returns Whether a fresh sync should be attempted
 */
export function isSyncStale(district: string): boolean {
  const lastSync = getLastSyncTimestamp(district);
  if (lastSync === 0) return true;
  return Date.now() - lastSync > MIN_SYNC_INTERVAL_MS;
}

/* ─── Firebase → IndexedDB Sync ─────────────────────────────────── */

/**
 * Converts a raw ShelterProvider document into the ShelterMetadata
 * shape expected by the SOS shelter ranking system.
 *
 * @param provider - Raw shelter provider record from Firebase
 * @returns ShelterMetadata suitable for caching and ranking
 */
function toShelterMetadata(provider: ShelterProvider): ShelterMetadata {
  return {
    shelterId: provider.shelterId,
    shelterName: provider.shelterName,
    registeredMobile: provider.registeredMobile,
    coordinates: provider.coordinates as Coordinates,
    state: provider.state,
    district: provider.district,
    city: provider.location || '',
    totalBedCapacity: provider.totalBedCapacity,
    occupiedBeds: provider.occupiedBeds || 0,
    availableBeds: provider.availableBeds ?? provider.totalBedCapacity,
    shelterScore: 80, // Default score until Part 3 scoring is applied
    currentOccupants: [],
    facilities: [],
    inventorySummary: [],
    lastUpdatedAt: provider.lastUpdatedAt || Date.now(),
  };
}

/**
 * Forces a shelter sync for the given district, bypassing the
 * staleness check. Use this for user-initiated "Get Data" actions.
 *
 * @param userDistrict - The user's district from their profile
 * @param userState - The user's state from their profile
 * @returns The number of shelters synced, or -1 if failed
 */
export async function forceShelterSync(
  userDistrict: string,
  userState: string
): Promise<number> {
  /* Clear the staleness timestamp so syncDistrictShelters won't skip */
  localStorage.removeItem(`${SYNC_TS_PREFIX}${userDistrict.toLowerCase()}`);
  return syncDistrictShelters(userDistrict, userState);
}

/**
 * Downloads shelter providers for the user's district from Firebase
 * and saves each as a ShelterMetadata entry in IndexedDB.
 *
 * This is the primary sync function. It should be called:
 *   1. When the user first opens the SOS conditions screen (background)
 *   2. When the app detects that connectivity has been restored
 *
 * The function is safe to call repeatedly — it checks staleness
 * internally and skips the Firebase query if a recent sync exists.
 *
 * @param userDistrict - The user's district from their profile
 * @param userState - The user's state from their profile
 * @returns The number of shelters synced, or -1 if skipped/failed
 */
export async function syncDistrictShelters(
  userDistrict: string,
  userState: string
): Promise<number> {
  /* Guard: must be online */
  if (!navigator.onLine) {
    return -1;
  }

  /* Guard: don't re-sync too frequently */
  if (!isSyncStale(userDistrict)) {
    return -1;
  }

  /* Guard: need valid district */
  if (!userDistrict || userDistrict.trim().length === 0) {
    return -1;
  }

  try {
    const shelterRef = collection(db, 'shelter-providers');
    const districtLower = userDistrict.toLowerCase().trim();
    const stateLower = userState.toLowerCase().trim();

    /*
     * Query shelters that match the user's district.
     * Firebase Firestore `where` is case-sensitive, so we try
     * an exact match first. If the district was entered with
     * different casing between Part 1 and Part 2, we fall back
     * to fetching all active shelters and filtering client-side.
     */
    const districtQuery = query(
      shelterRef,
      where('district', '==', userDistrict),
      where('isActive', '==', true)
    );

    const result = await withFirestoreTimeout(getDocs(districtQuery), 5000);

    let syncCount = 0;

    if (result) {
      result.forEach((docSnap) => {
        const data = docSnap.data() as ShelterProvider;

        /* Secondary state filter — case-insensitive comparison */
        if (
          data &&
          data.shelterId &&
          data.coordinates &&
          data.state?.toLowerCase().trim() === stateLower
        ) {
          const metadata = toShelterMetadata(data);
          void putItem(STORES.SHELTER_CACHE, metadata);
          syncCount++;
        }
      });
    }

    /*
     * If exact-case district query returned no results, try
     * fetching all active shelters and filtering client-side.
     * This handles casing mismatches like "Bengaluru Urban"
     * vs "bengaluru urban" between the user profile and shelter.
     */
    if (syncCount === 0) {
      try {
        const allActiveQuery = query(
          shelterRef,
          where('isActive', '==', true)
        );
        const allResult = await withFirestoreTimeout(getDocs(allActiveQuery), 5000);
        if (allResult) {
          allResult.forEach((docSnap) => {
            const data = docSnap.data() as ShelterProvider;
            if (
              data &&
              data.shelterId &&
              data.coordinates &&
              data.district?.toLowerCase().trim() === districtLower &&
              data.state?.toLowerCase().trim() === stateLower
            ) {
              const metadata = toShelterMetadata(data);
              void putItem(STORES.SHELTER_CACHE, metadata);
              syncCount++;
            }
          });
        }
      } catch {
        /* Fallback query failed — non-critical */
      }
    }

    /* Also try fetching from shelter metadata sub-collection for richer data */
    try {
      const metadataRef = collection(db, 'shelter-metadata');
      const metaQuery = query(
        metadataRef,
        where('district', '==', userDistrict)
      );
      const metaResult = await withFirestoreTimeout(getDocs(metaQuery), 3000);
      if (metaResult) {
        metaResult.forEach((docSnap) => {
          const meta = docSnap.data() as ShelterMetadata;
          if (
            meta &&
            meta.shelterId &&
            meta.state?.toLowerCase().trim() === stateLower
          ) {
            void putItem(STORES.SHELTER_CACHE, meta);
            syncCount++;
          }
        });
      }
    } catch {
      /* Metadata collection may not exist yet — that's okay */
    }

    setLastSyncTimestamp(userDistrict);
    return syncCount;
  } catch (err) {
    console.warn('[shelter-cache] Sync failed:', err);
    return -1;
  }
}

/* ─── Local Cache Retrieval ──────────────────────────────────────── */

/**
 * Returns all cached shelters from IndexedDB, optionally filtered
 * by the user's district. District-matching shelters are returned
 * first, followed by any others (cross-district fallback).
 *
 * @param district - Optional district to prioritize
 * @returns Array of ShelterMetadata sorted: same-district first
 */
export async function getCachedShelters(
  district?: string
): Promise<ShelterMetadata[]> {
  try {
    const allCached = await getAllItems<ShelterMetadata>(STORES.SHELTER_CACHE);

    if (!allCached || allCached.length === 0) {
      return [];
    }

    if (!district) {
      return allCached;
    }

    const districtLower = district.toLowerCase();

    /* Partition into same-district vs others */
    const sameDistrict: ShelterMetadata[] = [];
    const others: ShelterMetadata[] = [];

    for (const shelter of allCached) {
      if (shelter.district && shelter.district.toLowerCase() === districtLower) {
        sameDistrict.push(shelter);
      } else {
        others.push(shelter);
      }
    }

    /* Same-district shelters first, then fallback others */
    return [...sameDistrict, ...others];
  } catch (err) {
    console.warn('[shelter-cache] Error reading cache:', err);
    return [];
  }
}

/**
 * Also reads from STORES.METADATA and STORES.SHELTER_PROVIDERS to
 * merge any shelter data written by Part 2 into the ranking pool.
 * Deduplicates by shelterId, preferring SHELTER_CACHE entries
 * (which contain the most complete metadata).
 *
 * @param district - Optional district to prioritize
 * @returns Deduplicated array of ShelterMetadata
 */
export async function getAllAvailableShelters(
  district?: string
): Promise<ShelterMetadata[]> {
  const shelterMap = new Map<string, ShelterMetadata>();

  /* 1. Primary: SHELTER_CACHE (district-synced data) */
  try {
    const cached = await getCachedShelters(district);
    for (const s of cached) {
      if (s && s.shelterId) {
        shelterMap.set(s.shelterId, s);
      }
    }
  } catch (err) {
    console.warn('[shelter-cache] Error reading SHELTER_CACHE:', err);
  }

  /* 2. Secondary: METADATA store (Part 2 consolidated metadata) */
  try {
    const metadataItems = await getAllItems<ShelterMetadata>(STORES.METADATA);
    if (metadataItems && Array.isArray(metadataItems)) {
      for (const m of metadataItems) {
        if (m && m.shelterId && !shelterMap.has(m.shelterId)) {
          shelterMap.set(m.shelterId, m);
        }
      }
    }
  } catch (err) {
    console.warn('[shelter-cache] Error reading METADATA:', err);
  }

  /* 3. Tertiary: SHELTER_PROVIDERS store (Part 2 registration data) */
  try {
    const providers = await getAllItems<ShelterProvider>(STORES.SHELTER_PROVIDERS);
    if (providers && Array.isArray(providers)) {
      for (const prov of providers) {
        if (prov && prov.shelterId && !shelterMap.has(prov.shelterId)) {
          shelterMap.set(prov.shelterId, toShelterMetadata(prov));
        }
      }
    }
  } catch (err) {
    console.warn('[shelter-cache] Error reading SHELTER_PROVIDERS:', err);
  }

  const allShelters = Array.from(shelterMap.values());

  /* Sort: same-district first if district is provided */
  if (district) {
    const districtLower = district.toLowerCase();
    allShelters.sort((a, b) => {
      const aMatch = a.district?.toLowerCase() === districtLower ? 0 : 1;
      const bMatch = b.district?.toLowerCase() === districtLower ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  return allShelters;
}
