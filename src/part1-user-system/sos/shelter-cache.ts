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
/**
 * Formats a timestamp into a human-readable "time ago" string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string like "Just now", "2 min ago", etc.
 */
export function formatTimeAgo(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return '';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/** Result object returned by downloadAndCacheSheltersOnline */
export interface CacheDownloadResult {
  success: boolean;
  totalCached: number;
  districtCount: number;
  message: string;
}

/**
 * Converts a raw ShelterProvider document into the ShelterMetadata
 * shape expected by the SOS shelter ranking system.
 *
 * @param provider - Raw shelter provider record from Firebase
 * @returns ShelterMetadata suitable for caching and ranking
 */
function toShelterMetadata(provider: any): ShelterMetadata {
  return {
    shelterId: provider.shelterId || `SHL-${Date.now()}`,
    shelterName: provider.shelterName || 'Emergency Shelter',
    registeredMobile: provider.registeredMobile || '112',
    coordinates: (provider.coordinates as Coordinates) || { lat: 28.6139, lng: 77.2090 },
    state: provider.state || '',
    district: provider.district || '',
    city: provider.city || provider.location || '',
    totalBedCapacity: provider.totalBedCapacity ?? 0,
    occupiedBeds: provider.occupiedBeds ?? 0,
    availableBeds: provider.availableBeds ?? provider.totalBedCapacity ?? 0,
    shelterScore: provider.shelterScore ?? 80,
    currentOccupants: provider.currentOccupants || [],
    facilities: provider.facilities || [],
    inventorySummary: provider.inventorySummary || [],
    lastUpdatedAt: provider.lastUpdatedAt || Date.now(),
  };
}

/**
 * Downloads active shelters from Firebase online and saves them
 * directly into IndexedDB (STORES.SHELTER_CACHE) for offline use.
 *
 * It checks the user's district, but also retrieves active shelters
 * regional/statewide so users have reliable local shelter data saved.
 *
 * @param userDistrict - Optional district name
 * @param userState - Optional state name
 */
export async function downloadAndCacheSheltersOnline(
  userDistrict?: string,
  userState?: string
): Promise<CacheDownloadResult> {
  const districtClean = (userDistrict || '').trim();
  const districtLower = districtClean.toLowerCase();
  const locationLabel = districtClean
    ? (userState ? `${districtClean}, ${userState.trim()}` : districtClean)
    : 'your area';

  /* 1. Offline guard */
  if (!navigator.onLine) {
    const existing = await getAllAvailableShelters(districtClean);
    const districtMatches = districtClean
      ? existing.filter((s) => s.district?.toLowerCase().trim() === districtLower).length
      : existing.length;
    return {
      success: false,
      totalCached: existing.length,
      districtCount: districtMatches,
      message: existing.length > 0
        ? `Offline: Using ${existing.length} shelter${existing.length === 1 ? '' : 's'} saved locally on this device.`
        : 'You are currently offline. Connect to the internet to download shelter data.',
    };
  }

  try {
    const shelterRef = collection(db, 'shelter-providers');
    const seenShelterIds = new Set<string>();
    let savedCount = 0;

    /* A. Query active shelters first */
    try {
      const activeQuery = query(shelterRef, where('isActive', '==', true));
      const activeResult = await withFirestoreTimeout(getDocs(activeQuery), 6000);
      if (activeResult && !activeResult.empty) {
        for (const docSnap of activeResult.docs) {
          const data = docSnap.data() as ShelterProvider;
          if (data && data.shelterId) {
            seenShelterIds.add(data.shelterId);
            const metadata = toShelterMetadata(data);
            await putItem(STORES.SHELTER_CACHE, metadata);
            savedCount++;
          }
        }
      }
    } catch (e) {
      console.warn('[shelter-cache] Active query timed out or failed:', e);
    }

    /* B. Fallback: Query all shelters in shelter-providers collection */
    if (savedCount === 0) {
      try {
        const allResult = await withFirestoreTimeout(getDocs(shelterRef), 6000);
        if (allResult && !allResult.empty) {
          for (const docSnap of allResult.docs) {
            const data = docSnap.data() as ShelterProvider;
            if (data && data.shelterId && !seenShelterIds.has(data.shelterId)) {
              seenShelterIds.add(data.shelterId);
              const metadata = toShelterMetadata(data);
              await putItem(STORES.SHELTER_CACHE, metadata);
              savedCount++;
            }
          }
        }
      } catch (e) {
        console.warn('[shelter-cache] All shelters query timed out or failed:', e);
      }
    }

    /* C. Also pull any metadata documents from shelter-metadata */
    try {
      const metaRef = collection(db, 'shelter-metadata');
      const metaResult = await withFirestoreTimeout(getDocs(metaRef), 4000);
      if (metaResult && !metaResult.empty) {
        for (const docSnap of metaResult.docs) {
          const meta = docSnap.data() as ShelterMetadata;
          if (meta && meta.shelterId && !seenShelterIds.has(meta.shelterId)) {
            seenShelterIds.add(meta.shelterId);
            await putItem(STORES.SHELTER_CACHE, meta);
            savedCount++;
          }
        }
      }
    } catch {
      /* Optional subcollection */
    }

    /* Update timestamps */
    if (districtClean) {
      setLastSyncTimestamp(districtClean);
    }
    setLastSyncTimestamp('all');

    /* Fetch combined local cache count (includes any from METADATA / SHELTER_PROVIDERS stores) */
    const allLocal = await getAllAvailableShelters(districtClean);
    const districtCount = districtClean
      ? allLocal.filter((s) => s.district?.toLowerCase().trim() === districtLower).length
      : allLocal.length;

    const totalCount = allLocal.length;

    return {
      success: true,
      totalCached: totalCount,
      districtCount,
      message: totalCount > 0
        ? `✓ Successfully downloaded and saved ${totalCount} shelter${totalCount === 1 ? '' : 's'} locally (${districtCount} in ${locationLabel})!`
        : `No registered shelters found online yet. Helplines 112 & 1091 are available offline.`,
    };
  } catch (err: any) {
    console.error('[shelter-cache] Download failed:', err);
    const existing = await getAllAvailableShelters(districtClean);
    return {
      success: false,
      totalCached: existing.length,
      districtCount: districtClean
        ? existing.filter((s) => s.district?.toLowerCase().trim() === districtLower).length
        : existing.length,
      message: `Failed to download: ${err?.message || 'Network error'}. ${existing.length} shelters remain in local cache.`,
    };
  }
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
  const result = await downloadAndCacheSheltersOnline(userDistrict, userState);
  return result.success ? result.totalCached : -1;
}

/**
 * Downloads shelter providers for the user's district from Firebase
 * and saves each as a ShelterMetadata entry in IndexedDB.
 *
 * Safe to call repeatedly in background — skips if recently synced.
 *
 * @param userDistrict - The user's district from their profile
 * @param userState - The user's state from their profile
 * @returns The number of shelters synced, or -1 if skipped/failed
 */
export async function syncDistrictShelters(
  userDistrict: string,
  userState: string
): Promise<number> {
  if (!navigator.onLine) {
    return -1;
  }
  if (!isSyncStale(userDistrict)) {
    return -1;
  }
  const result = await downloadAndCacheSheltersOnline(userDistrict, userState);
  return result.success ? result.totalCached : -1;
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
