/**
 * VYNTRA — Service Provider Registration Store
 * Local caching and offline persistence for Service Provider profile.
 */

import type { ServiceProvider } from '../../shared/types';
import { getItem, putItem } from '../../shared/utils/offline-cache';

const LOCAL_STORAGE_KEY = 'vyntra_service_provider_profile';
const CACHE_STORE = 'profile';

/**
 * Saves current service provider profile to offline storage and localStorage.
 */
export async function saveCurrentProvider(provider: ServiceProvider): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(provider));
  } catch (e) {
    console.warn('Could not save provider to localStorage:', e);
  }

  try {
    await putItem(CACHE_STORE, {
      appId: provider.providerId,
      ...provider,
    });
  } catch (e) {
    console.warn('Could not cache provider in IndexedDB:', e);
  }
}

/**
 * Retrieves the currently registered service provider from local cache.
 */
export async function getCurrentProvider(): Promise<ServiceProvider | null> {
  // Check localStorage first for instant synchronous read
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as ServiceProvider;
    }
  } catch (e) {
    console.warn('Error reading provider from localStorage:', e);
  }

  // Fallback to IndexedDB
  try {
    const cached = await getItem<ServiceProvider & { appId: string }>(CACHE_STORE, 'current-service-provider');
    if (cached) {
      return cached;
    }
  } catch (e) {
    console.warn('Error reading provider from IndexedDB:', e);
  }

  return null;
}

/**
 * Clears stored service provider profile.
 */
export function clearCurrentProvider(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {
    console.warn('Error clearing provider cache:', e);
  }
}
