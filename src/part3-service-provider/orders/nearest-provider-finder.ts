/**
 * VYNTRA — Nearest Provider Finder
 * Selects 1 specific provider or 5 nearest registered Service Providers
 * using Haversine geo-distance calculation.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../shared/firebase/config';
import { PATHS } from '../../shared/firebase/paths';
import { calculateDistance } from '../../shared/utils/geo-distance';
import type { GeoCoordinates, ServiceProvider } from '../../shared/types';
import { getCurrentProvider } from '../registration/registration-store';

export interface ProviderWithDistance extends ServiceProvider {
  distanceKm: number;
}

// Fallback seed providers for offline testing or demo purposes
const SEED_SERVICE_PROVIDERS: ServiceProvider[] = [
  {
    providerId: 'VYNTRA-SVC-JBP01DEP',
    providerGoogleUid: 'uid-jbp01',
    providerName: 'Jabalpur Relief Logistics Depot',
    location: 'Plot 4, Wright Town Central Warehouse',
    state: 'Madhya Pradesh',
    district: 'Jabalpur',
    coordinates: { lat: 23.1685, lng: 79.9338 },
    registeredAt: Date.now(),
    isActive: true,
  },
  {
    providerId: 'VYNTRA-SVC-BHP02MED',
    providerGoogleUid: 'uid-bhp02',
    providerName: 'Bhopal Urgent Aid & Medical Supply',
    location: 'Sector 3, MP Nagar Hub',
    state: 'Madhya Pradesh',
    district: 'Bhopal',
    coordinates: { lat: 23.2599, lng: 77.4126 },
    registeredAt: Date.now(),
    isActive: true,
  },
  {
    providerId: 'VYNTRA-SVC-IND03SAN',
    providerGoogleUid: 'uid-ind03',
    providerName: 'Indore Sanitation & Dignity Fleet',
    location: 'Vijay Nagar Logistics Park',
    state: 'Madhya Pradesh',
    district: 'Indore',
    coordinates: { lat: 22.7196, lng: 75.8577 },
    registeredAt: Date.now(),
    isActive: true,
  },
  {
    providerId: 'VYNTRA-SVC-JAI04REL',
    providerGoogleUid: 'uid-jai04',
    providerName: 'Jaipur Emergency Support Depot',
    location: 'Mansarovar Transport Hub',
    state: 'Rajasthan',
    district: 'Jaipur',
    coordinates: { lat: 26.9124, lng: 75.7873 },
    registeredAt: Date.now(),
    isActive: true,
  },
  {
    providerId: 'VYNTRA-SVC-DEL05RAP',
    providerGoogleUid: 'uid-del05',
    providerName: 'Delhi Central Relief Squadron',
    location: 'Palam Colony Supply Base',
    state: 'Delhi',
    district: 'Central Delhi',
    coordinates: { lat: 28.6139, lng: 77.2090 },
    registeredAt: Date.now(),
    isActive: true,
  },
];

/**
 * Fetches all active service providers from Firestore with offline fallback.
 */
export async function getAllActiveProviders(): Promise<ServiceProvider[]> {
  const providers: ServiceProvider[] = [];

  // Check locally registered provider first
  const current = await getCurrentProvider();
  if (current) {
    providers.push(current);
  }

  // Fetch online providers if available
  if (navigator.onLine) {
    try {
      const q = query(
        collection(db, PATHS.serviceProviders()),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data() as ServiceProvider;
        if (!providers.some((p) => p.providerId === data.providerId)) {
          providers.push(data);
        }
      });
    } catch (e) {
      console.warn('Could not fetch providers from Firestore, falling back to cached/seed providers:', e);
    }
  }

  // Ensure we always have seed providers available for realistic testing & offline mode
  for (const seed of SEED_SERVICE_PROVIDERS) {
    if (!providers.some((p) => p.providerId === seed.providerId)) {
      providers.push(seed);
    }
  }

  return providers;
}

/**
 * Finds the 5 nearest active service providers to a given shelter location.
 */
export async function findFiveNearestProviders(
  shelterCoords: GeoCoordinates
): Promise<ProviderWithDistance[]> {
  const allProviders = await getAllActiveProviders();

  const sorted = allProviders
    .map((provider) => ({
      ...provider,
      distanceKm: Number(calculateDistance(shelterCoords, provider.coordinates).toFixed(2)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return sorted.slice(0, 5);
}
