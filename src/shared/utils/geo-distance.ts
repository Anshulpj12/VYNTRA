/**
 * VYNTRA — Geo-Distance Calculator
 * 
 * Haversine formula implementation for calculating distances
 * between two geographical coordinate points.
 * Supports both coordinate object pairs and raw lat/lng arguments.
 * 
 * @module shared/utils/geo-distance
 */

import type { Coordinates, GeoCoordinates } from '../types';

/** Earth's mean radius in kilometers */
const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates distance using coordinate objects or raw lat/lng.
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number;
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
export function calculateDistance(
  a: Coordinates | number,
  b: Coordinates | number,
  c?: number,
  d?: number
): number {
  let lat1: number, lng1: number, lat2: number, lng2: number;

  if (typeof a === 'object' && typeof b === 'object') {
    lat1 = a.lat;
    lng1 = a.lng;
    lat2 = b.lat;
    lng2 = b.lng;
  } else {
    lat1 = a as number;
    lng1 = b as number;
    lat2 = c as number;
    lng2 = d as number;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);

  const val =
    sinHalfLat * sinHalfLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinHalfLng * sinHalfLng;

  const angle = 2 * Math.atan2(Math.sqrt(val), Math.sqrt(1 - val));
  return EARTH_RADIUS_KM * angle;
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

/**
 * Formats a distance value into a human-readable string.
 * 
 * @param distanceKm - Distance in kilometers
 * @returns Formatted string (e.g., "1.2 km" or "850 m")
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
