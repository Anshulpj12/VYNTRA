/**
 * VYNTRA — Service Provider Registration Service
 * Handles provider creation, Firebase synchronization, and offline fallback.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase/config';
import { PATHS } from '../../shared/firebase/paths';
import { generateUniqueId } from '../../shared/utils/id-generator';
import type { ServiceProvider, GeoCoordinates } from '../../shared/types';
import { Timestamp } from 'firebase/firestore';
import { saveCurrentProvider } from './registration-store';

export interface RegistrationInput {
  providerName: string;
  location: string;
  state: string;
  district: string;
  coordinates: GeoCoordinates;
  providerGoogleUid: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates registration input data on the client side.
 */
export function validateProviderInput(input: RegistrationInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.providerName || input.providerName.trim().length < 3) {
    errors.providerName = 'Provider name must be at least 3 characters long.';
  }

  if (!input.location || input.location.trim().length < 3) {
    errors.location = 'Depot location address is required.';
  }

  if (!input.state || input.state.trim().length === 0) {
    errors.state = 'State is required.';
  }

  if (!input.district || input.district.trim().length === 0) {
    errors.district = 'District is required.';
  }

  if (
    typeof input.coordinates.lat !== 'number' ||
    typeof input.coordinates.lng !== 'number' ||
    isNaN(input.coordinates.lat) ||
    isNaN(input.coordinates.lng) ||
    input.coordinates.lat < -90 ||
    input.coordinates.lat > 90 ||
    input.coordinates.lng < -180 ||
    input.coordinates.lng > 180
  ) {
    errors.coordinates = 'Valid geographical coordinates (lat/lng) are required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Registers a new Service Provider.
 * Generates VYNTRA-SVC-<8-char> ID, saves to Firestore and caches locally.
 */
export async function registerServiceProvider(
  input: RegistrationInput
): Promise<{ success: boolean; provider?: ServiceProvider; error?: string }> {
  const validation = validateProviderInput(input);
  if (!validation.isValid) {
    const firstErr = Object.values(validation.errors)[0];
    return { success: false, error: firstErr };
  }

  const providerId = generateUniqueId('SVC');
  const now = Timestamp.now();

  const provider: ServiceProvider = {
    providerId,
    providerGoogleUid: input.providerGoogleUid,
    providerName: input.providerName.trim(),
    location: input.location.trim(),
    state: input.state.trim(),
    district: input.district.trim(),
    coordinates: {
      lat: Number(input.coordinates.lat.toFixed(6)),
      lng: Number(input.coordinates.lng.toFixed(6)),
    },
    registeredAt: now,
    isActive: true,
  };

  // 1. Cache locally first (Offline-first pattern)
  await saveCurrentProvider(provider);

  // 2. Sync to Firebase if online
  if (navigator.onLine) {
    try {
      const providerDocRef = doc(db, PATHS.serviceProvider(providerId));
      await setDoc(providerDocRef, provider);
    } catch (err) {
      console.warn('Firebase sync delayed (offline or permission issue):', err);
      // We do not fail registration because local cache succeeded
    }
  }

  return { success: true, provider };
}
