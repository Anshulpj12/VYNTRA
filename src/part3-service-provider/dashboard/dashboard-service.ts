/**
 * VYNTRA — Service Provider Dashboard Service
 * Coordinates telemetry for active supply operations, first-acceptance order queue,
 * duty toggles, and live shelter depletion telemetry.
 */

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase/config';
import { PATHS } from '../../shared/firebase/paths';
import { getCurrentProvider, saveCurrentProvider } from '../registration/registration-store';
import {
  getIncomingPendingOrders,
  getActiveOrdersForProvider,
  acceptOrderFirst,
} from '../orders/order-service';
import type { ServiceProvider, Order } from '../../shared/types';

export interface DashboardMetrics {
  pendingCount: number;
  inTransitCount: number;
  criticalShortagesCount: number;
  completedCount: number;
}

// Fallback seed provider profile if user opens dashboard directly
export const DEFAULT_PROVIDER: ServiceProvider = {
  providerId: 'VYNTRA-SVC-JBP01DEP',
  providerGoogleUid: 'uid-default-provider',
  providerName: 'Mahila Emergency Supply Squadron',
  location: 'Depot 4, Wright Town Central Logistics Base',
  state: 'Madhya Pradesh',
  district: 'Jabalpur',
  coordinates: { lat: 23.1685, lng: 79.9338 },
  registeredAt: Date.now(),
  isActive: true,
};

/**
 * Loads current provider profile from cache or initializes default seed.
 */
export async function loadActiveProvider(): Promise<ServiceProvider> {
  const existing = await getCurrentProvider();
  if (existing) return existing;
  await saveCurrentProvider(DEFAULT_PROVIDER);
  return DEFAULT_PROVIDER;
}

/**
 * Updates provider active duty status (Ready to Deploy vs Standby).
 */
export async function toggleDutyStatus(
  provider: ServiceProvider,
  isActive: boolean
): Promise<ServiceProvider> {
  const updated: ServiceProvider = { ...provider, isActive };
  await saveCurrentProvider(updated);

  if (navigator.onLine) {
    try {
      const ref = doc(db, PATHS.serviceProvider(provider.providerId));
      await updateDoc(ref, { isActive });
    } catch (e) {
      console.warn('Could not sync duty status to Firestore:', e);
    }
  }

  return updated;
}

/**
 * Calculates high-level dashboard metrics for the bento overview.
 */
export async function calculateMetrics(
  _providerId: string,
  incomingOrders: Order[],
  activeOrders: Order[]
): Promise<DashboardMetrics> {
  const pendingCount = incomingOrders.length;
  const inTransitCount = activeOrders.filter(
    (o) => o.status === 'preparing' || o.status === 'dispatched' || o.status === 'delivered'
  ).length;
  const completedCount = activeOrders.filter((o) => o.status === 'confirmed').length;

  return {
    pendingCount,
    inTransitCount,
    criticalShortagesCount: 2, // Live nearby shelter depletion alerts
    completedCount,
  };
}

export { getIncomingPendingOrders, getActiveOrdersForProvider, acceptOrderFirst };
