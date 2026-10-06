/**
 * VYNTRA — Haversine Geo-Distance Calculator
 * Calculates the distance in kilometers between two geographic coordinates.
 */

import type { GeoCoordinates } from '../types';

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates distance between two coordinates using the Haversine formula.
 * @returns Distance in kilometers
 */
export function calculateDistance(from: GeoCoordinates, to: GeoCoordinates): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Sorts an array of items by distance from a reference point.
 */
export function sortByDistance<T extends { coordinates: GeoCoordinates }>(
  items: T[],
  from: GeoCoordinates
): (T & { distanceKm: number })[] {
  return items
    .map((item) => ({
      ...item,
      distanceKm: calculateDistance(from, item.coordinates),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
