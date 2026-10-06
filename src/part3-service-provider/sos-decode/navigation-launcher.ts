/**
 * VYNTRA — Navigation Launcher
 * Generates turn-by-turn navigation intents for Google Maps and device navigators.
 */

import { calculateDistance } from '../../shared/utils/geo-distance';
import type { GeoCoordinates } from '../../shared/types';

/**
 * Builds Google Maps turn-by-turn navigation link with coordinates destination.
 */
export function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Opens navigation in a new window/tab or native maps application.
 */
export function launchNavigation(lat: number, lng: number): void {
  const url = buildGoogleMapsUrl(lat, lng);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Computes direct Euclidean/Haversine distance between emergency location and current base.
 */
export function getDistanceToVictim(
  victimCoords: GeoCoordinates,
  baseCoords?: GeoCoordinates
): number {
  if (!baseCoords) {
    // Default depot baseline if baseCoords not provided
    return Number(
      calculateDistance(victimCoords, { lat: 23.1685, lng: 79.9338 }).toFixed(2)
    );
  }
  return Number(calculateDistance(victimCoords, baseCoords).toFixed(2));
}
