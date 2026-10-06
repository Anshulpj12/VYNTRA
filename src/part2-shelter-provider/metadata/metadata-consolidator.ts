/**
 * VYNTRA Part 2 — Metadata Consolidator
 * 
 * Aggregates all shelter data into a single consolidated metadata document.
 * This metadata is what Part 1's SOS system caches for shelter discovery
 * and what Part 3's scoring algorithm reads for readiness calculation.
 * 
 * @module part2-shelter-provider/metadata/metadata-consolidator
 */

import type {
  ShelterProvider,
  ShelterMetadata,
  Occupant,
  Facility,
  InventoryItem,
  OccupantSummary,
  FacilitySummary,
  InventoryItemSummary,
} from '../../shared/types';

/**
 * Consolidates all shelter component data into a single metadata document.
 * 
 * @param shelter - The shelter provider record
 * @param occupants - All occupant records for this shelter
 * @param facilities - All facility records for this shelter
 * @param inventory - All inventory items for this shelter
 * @returns Consolidated ShelterMetadata
 */
export function consolidateMetadata(
  shelter: ShelterProvider,
  occupants: Occupant[],
  facilities: Facility[],
  inventory: InventoryItem[]
): ShelterMetadata {
  const activeOccupants = occupants.filter((o) => o.status === 'active');

  /* Occupant summaries */
  const currentOccupants: OccupantSummary[] = activeOccupants.map((o) => ({
    personId: o.personId,
    expectedStayDays: o.expectedStayDays,
    admittedAt: o.admittedAt,
  }));

  /* Facility summaries */
  const facilitySummaries: FacilitySummary[] = facilities.map((f) => ({
    facilityId: f.facilityId,
    facilityName: f.facilityName,
    type: f.type,
    totalCapacity: f.totalCapacity,
    currentAvailable: f.currentAvailable,
  }));

  /* Inventory summaries */
  const inventorySummary: InventoryItemSummary[] = inventory.map((i) => ({
    itemName: i.itemName,
    currentQuantity: i.currentQuantity,
    requiredMinimum: i.requiredMinimum,
  }));

  return {
    shelterId: shelter.shelterId,
    shelterName: shelter.shelterName,
    coordinates: shelter.coordinates,
    registeredMobile: shelter.registeredMobile,
    state: shelter.state,
    district: shelter.district,
    city: shelter.location,
    totalBedCapacity: shelter.totalBedCapacity,
    occupiedBeds: activeOccupants.length,
    availableBeds: shelter.totalBedCapacity - activeOccupants.length,
    currentOccupants,
    facilities: facilitySummaries,
    inventorySummary,
    shelterScore: 0, // Calculated by Part 3
    lastUpdatedAt: Date.now(),
  };
}

/**
 * Checks for inventory shortages (items below required minimum).
 * 
 * @param inventory - All inventory items
 * @returns Array of items currently below their required minimum
 */
export function detectShortages(inventory: InventoryItem[]): InventoryItem[] {
  return inventory.filter((item) => item.currentQuantity <= item.requiredMinimum);
}

/**
 * Calculates shelter capacity utilization percentage.
 * 
 * @param metadata - Consolidated shelter metadata
 * @returns Utilization percentage (0–100)
 */
export function calculateUtilization(metadata: ShelterMetadata): number {
  if (metadata.totalBedCapacity <= 0) return 0;
  return Math.round((metadata.occupiedBeds / metadata.totalBedCapacity) * 100);
}
