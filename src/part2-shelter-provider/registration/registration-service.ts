/**
 * VYNTRA Part 2 — Registration Service
 * 
 * Handles shelter provider registration including:
 * - Creating shelter provider records in IndexedDB (offline-first)
 * - Syncing to Firebase when online
 * - Generating unique shelter IDs
 * 
 * @module part2-shelter-provider/registration/registration-service
 */

import { doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../shared/firebase/config';
import { FIRESTORE_PATHS } from '../../shared/firebase/paths';
import { generateUniqueId } from '../../shared/utils/id-generator';
import { saveToCache, addToSyncQueue, STORES } from '../../shared/utils/offline-cache';
import type { ShelterProvider, Facility } from '../../shared/types';

/** Registration form data before ID generation */
export interface RegistrationFormData {
  shelterName: string;
  location: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  registeredMobile: string;
  totalBedCapacity: number;
  facilities: Array<{
    name: string;
    type: 'women-specific' | 'sanitation' | 'medical' | 'general';
    capacity: number;
    description: string;
  }>;
}

/**
 * Registers a new shelter provider.
 * Writes to IndexedDB first (offline-first), then attempts Firebase sync.
 * 
 * @param formData - The completed registration form data
 * @param googleUid - The authenticated provider's Google UID
 * @returns The created ShelterProvider with generated ID
 */
export async function registerShelter(
  formData: RegistrationFormData,
  googleUid: string
): Promise<ShelterProvider> {
  const now = Date.now();
  const shelterId = generateUniqueId('SHL');

  /* Build the shelter provider record */
  const shelter: ShelterProvider = {
    shelterId,
    providerGoogleUid: googleUid,
    shelterName: formData.shelterName,
    location: formData.location,
    state: formData.state,
    district: formData.district,
    coordinates: {
      lat: formData.latitude,
      lng: formData.longitude,
    },
    registeredMobile: formData.registeredMobile,
    totalBedCapacity: formData.totalBedCapacity,
    occupiedBeds: 0,
    availableBeds: formData.totalBedCapacity,
    isActive: true,
    registeredAt: now,
    lastUpdatedAt: now,
  };

  /* Step 1: Write to IndexedDB (offline-first) */
  await saveToCache(STORES.SHELTER_PROVIDERS, shelter);

  /* Step 2: Create facility records */
  const facilityRecords: Facility[] = formData.facilities.map((f) => ({
    facilityId: generateUniqueId('FAC'),
    shelterId,
    facilityName: f.name,
    type: f.type,
    totalCapacity: f.capacity,
    currentAvailable: f.capacity,
    description: f.description,
    lastUpdatedAt: now,
  }));

  for (const facility of facilityRecords) {
    await saveToCache(STORES.FACILITIES, facility);
  }

  /* Step 3: Attempt Firebase sync only if configured */
  if (isFirebaseConfigured()) {
    try {
      if (navigator.onLine) {
        const syncPromise = (async () => {
          const shelterRef = doc(db, FIRESTORE_PATHS.shelterProvider(shelterId));
          await setDoc(shelterRef, shelter);

          /* Sync facilities */
          for (const facility of facilityRecords) {
            const facRef = doc(db, FIRESTORE_PATHS.shelterFacility(shelterId, facility.facilityId));
            await setDoc(facRef, facility);
          }
        })();

        /* 3-second safety timeout prevents infinite hang */
        await Promise.race([
          syncPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firebase sync timed out')), 3000)
          ),
        ]);

        console.info(`[VYNTRA] Shelter ${shelterId} registered and synced to Firebase`);
      } else {
        /* Queue for later sync */
        await addToSyncQueue({
          id: `reg-${shelterId}`,
          store: STORES.SHELTER_PROVIDERS,
          operation: 'create',
          data: shelter,
          timestamp: now,
          retryCount: 0,
        });

        for (const facility of facilityRecords) {
          await addToSyncQueue({
            id: `fac-${facility.facilityId}`,
            store: STORES.FACILITIES,
            operation: 'create',
            data: facility,
            timestamp: now,
            retryCount: 0,
          });
        }

        console.info(`[VYNTRA] Shelter ${shelterId} saved offline, queued for sync`);
      }
    } catch (error) {
      console.warn('[VYNTRA] Firebase sync skipped or timed out, data safe locally:', error);
    }
  } else {
    console.info(`[VYNTRA] Testing mode: Shelter ${shelterId} activated locally (Firebase bypassed)`);
  }

  return shelter;
}

/**
 * Validates registration form data.
 * Returns an object with field names as keys and error messages as values.
 * 
 * @param data - Partial form data to validate
 * @returns Validation errors (empty object if valid)
 */
export function validateRegistrationForm(
  data: Partial<RegistrationFormData>
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.shelterName?.trim()) {
    errors.shelterName = 'Shelter name is required';
  }

  if (!data.location?.trim()) {
    errors.location = 'Address is required';
  }

  if (!data.state?.trim()) {
    errors.state = 'State is required';
  }

  if (!data.district?.trim()) {
    errors.district = 'District is required';
  }

  if (!data.registeredMobile?.trim()) {
    errors.registeredMobile = 'Mobile number is required';
  } else if (!/^\+?[\d\s-]{10,15}$/.test(data.registeredMobile)) {
    errors.registeredMobile = 'Enter a valid mobile number';
  }

  if (data.latitude === undefined || data.latitude === null) {
    errors.latitude = 'Latitude is required';
  } else if (data.latitude < -90 || data.latitude > 90) {
    errors.latitude = 'Latitude must be between -90 and 90';
  }

  if (data.longitude === undefined || data.longitude === null) {
    errors.longitude = 'Longitude is required';
  } else if (data.longitude < -180 || data.longitude > 180) {
    errors.longitude = 'Longitude must be between -180 and 180';
  }

  if (data.totalBedCapacity === undefined || data.totalBedCapacity <= 0) {
    errors.totalBedCapacity = 'At least 1 bed is required';
  }

  return errors;
}
