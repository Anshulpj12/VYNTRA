/**
 * VYNTRA — Firebase Firestore Path Constants
 * 
 * Central registry of all Firestore collection and document paths.
 * No part should create ad-hoc collection names outside this file.
 * 
 * @module shared/firebase/paths
 */

/** Firestore path builders for all VYNTRA collections */
export const FIRESTORE_PATHS = {
  /* ─── User Paths ─── */
  users: () => 'users',
  user: (appId: string) => `users/${appId}`,
  userProfile: (appId: string) => `users/${appId}/profile`,
  userCycles: (appId: string) => `users/${appId}/cycles`,
  userCycle: (appId: string, cycleId: string) => `users/${appId}/cycles/${cycleId}`,

  /* ─── Shelter Provider Paths ─── */
  shelterProviders: () => 'shelter-providers',
  shelterProvider: (shelterId: string) => `shelter-providers/${shelterId}`,
  shelterMetadata: (shelterId: string) => `shelter-providers/${shelterId}/metadata`,
  shelterOccupants: (shelterId: string) => `shelter-providers/${shelterId}/occupants`,
  shelterOccupant: (shelterId: string, personId: string) =>
    `shelter-providers/${shelterId}/occupants/${personId}`,
  shelterFacilities: (shelterId: string) => `shelter-providers/${shelterId}/facilities`,
  shelterFacility: (shelterId: string, facilityId: string) =>
    `shelter-providers/${shelterId}/facilities/${facilityId}`,
  shelterInventory: (shelterId: string) => `shelter-providers/${shelterId}/inventory`,
  shelterInventoryItem: (shelterId: string, itemId: string) =>
    `shelter-providers/${shelterId}/inventory/${itemId}`,
  shelterUsageLog: (shelterId: string, itemId: string) =>
    `shelter-providers/${shelterId}/inventory/${itemId}/usage-log`,
  shelterUsageLogEntry: (shelterId: string, itemId: string, logId: string) =>
    `shelter-providers/${shelterId}/inventory/${itemId}/usage-log/${logId}`,

  /* ─── Service Provider Paths ─── */
  serviceProviders: () => 'service-providers',
  serviceProvider: (providerId: string) => `service-providers/${providerId}`,

  /* ─── Order Paths ─── */
  orders: () => 'orders',
  order: (orderId: string) => `orders/${orderId}`,

  /* ─── World Chat Paths ─── */
  worldChatCurrentRecord: (stateCode: string, districtCode: string) =>
    `world-chat/${stateCode}/${districtCode}/current-record`,
  worldChatCompletedRecords: (stateCode: string, districtCode: string) =>
    `world-chat/${stateCode}/${districtCode}/completed-records`,
  worldChatCompletedRecord: (stateCode: string, districtCode: string, periodId: string) =>
    `world-chat/${stateCode}/${districtCode}/completed-records/${periodId}`,

  /* ─── District Code Paths ─── */
  districtCodes: (stateCode: string, districtCode: string) =>
    `district-codes/${stateCode}/${districtCode}`,
} as const;
