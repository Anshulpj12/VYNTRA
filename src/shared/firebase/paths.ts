/**
 * VYNTRA — Firestore Collection Path Constants
 * Single source of truth for all database paths.
 */

export const PATHS = {
  // User data
  users: 'users',
  userProfile: (appId: string) => `users/${appId}/profile`,
  userCycles: (appId: string) => `users/${appId}/cycles`,
  userCycle: (appId: string, cycleId: string) => `users/${appId}/cycles/${cycleId}`,

  // Shelter provider data
  shelterProviders: 'shelter-providers',
  shelterProvider: (shelterId: string) => `shelter-providers/${shelterId}`,
  shelterMetadata: (shelterId: string) => `shelter-providers/${shelterId}/metadata`,
  shelterOccupants: (shelterId: string) => `shelter-providers/${shelterId}/occupants`,
  shelterOccupant: (shelterId: string, personId: string) => `shelter-providers/${shelterId}/occupants/${personId}`,
  shelterFacilities: (shelterId: string) => `shelter-providers/${shelterId}/facilities`,
  shelterFacility: (shelterId: string, facilityId: string) => `shelter-providers/${shelterId}/facilities/${facilityId}`,
  shelterInventory: (shelterId: string) => `shelter-providers/${shelterId}/inventory`,
  shelterInventoryItem: (shelterId: string, itemId: string) => `shelter-providers/${shelterId}/inventory/${itemId}`,
  shelterUsageLog: (shelterId: string, itemId: string) => `shelter-providers/${shelterId}/inventory/${itemId}/usage-log`,

  // Service provider data
  serviceProviders: 'service-providers',
  serviceProvider: (providerId: string) => `service-providers/${providerId}`,

  // Orders
  orders: 'orders',
  order: (orderId: string) => `orders/${orderId}`,

  // World Chat
  worldChatCurrentRecord: (stateCode: string, districtCode: string) =>
    `world-chat/${stateCode}/${districtCode}/current-record`,
  worldChatCompletedRecords: (stateCode: string, districtCode: string) =>
    `world-chat/${stateCode}/${districtCode}/completed-records`,
  worldChatCompletedRecord: (stateCode: string, districtCode: string, periodId: string) =>
    `world-chat/${stateCode}/${districtCode}/completed-records/${periodId}`,

  // District codes
  districtCodes: 'district-codes',
  districtCode: (stateCode: string, districtCode: string) =>
    `district-codes/${stateCode}/${districtCode}`,
} as const;
