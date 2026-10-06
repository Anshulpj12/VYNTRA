/**
 * VYNTRA Part 2 — Demo / Test Preset Data
 * 
 * Provides instant test data for offline and local testing mode
 * without requiring Firebase credentials.
 * 
 * @module part2-shelter-provider/mock-data/demo-shelter
 */

import type {
  ShelterProvider,
  Occupant,
  Facility,
  InventoryItem,
} from '../../shared/types';

export function createDemoShelter(): {
  shelter: ShelterProvider;
  occupants: Occupant[];
  facilities: Facility[];
  inventory: InventoryItem[];
} {
  const now = Date.now();
  const dayMs = 86400000;
  const shelterId = 'VYNTRA-SHL-BLR-042';

  const shelter: ShelterProvider = {
    shelterId,
    providerGoogleUid: 'demo-test-provider-uid',
    shelterName: 'Bangalore Central Women Sanctuary & Emergency Desk',
    location: '42 Richmond Circle, Shanthi Nagar, Central District',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    coordinates: {
      lat: 12.9667,
      lng: 77.5956,
    },
    registeredMobile: '+91 98450 12345',
    totalBedCapacity: 30,
    occupiedBeds: 12,
    availableBeds: 18,
    isActive: true,
    registeredAt: now - dayMs * 3,
    lastUpdatedAt: now,
  };

  const occupants: Occupant[] = [
    {
      personId: 'VYNTRA-PRS-4821',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-4821',
      name: 'Ananya Sharma',
      admittedAt: now - dayMs * 2,
      expectedStayDays: 4,
      assignedBedNumber: 1,
      status: 'active',
    },
    {
      personId: 'VYNTRA-USR-8910',
      isExistingAppUser: true,
      existingAppId: 'VYNTRA-USR-8910',
      name: 'Priya Venkat',
      admittedAt: now - dayMs * 1,
      expectedStayDays: 2,
      assignedBedNumber: 2,
      status: 'active',
    },
    {
      personId: 'VYNTRA-PRS-9123',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-9123',
      name: 'Meera Krishnan & Infant',
      admittedAt: now - Math.floor(dayMs * 1.5),
      expectedStayDays: 5,
      assignedBedNumber: 3,
      status: 'active',
    },
    {
      personId: 'VYNTRA-PRS-3310',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-3310',
      name: 'Deepa Nair',
      admittedAt: now - dayMs * 0.5,
      expectedStayDays: 3,
      assignedBedNumber: 4,
      status: 'active',
    },
    {
      personId: 'VYNTRA-PRS-7741',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-7741',
      name: 'Sunita Bai',
      admittedAt: now - dayMs * 2.5,
      expectedStayDays: 7,
      assignedBedNumber: 5,
      status: 'active',
    },
    {
      personId: 'VYNTRA-USR-6102',
      isExistingAppUser: true,
      existingAppId: 'VYNTRA-USR-6102',
      name: 'Fatima Zahra',
      admittedAt: now - dayMs * 0.8,
      expectedStayDays: 3,
      assignedBedNumber: 6,
      status: 'active',
    },
    {
      personId: 'VYNTRA-PRS-5521',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-5521',
      name: 'Kavita Patil',
      admittedAt: now - dayMs * 1.2,
      expectedStayDays: 4,
      assignedBedNumber: 7,
      status: 'active',
    },
    {
      personId: 'VYNTRA-PRS-1980',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-1980',
      name: 'Rajeshwari M',
      admittedAt: now - dayMs * 2,
      expectedStayDays: 6,
      assignedBedNumber: 8,
      status: 'active',
    },
    {
      personId: 'VYNTRA-PRS-8812',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-8812',
      name: 'Laxmi Devi',
      admittedAt: now - dayMs * 0.3,
      expectedStayDays: 3,
      assignedBedNumber: 9,
      status: 'active',
    },
    {
      personId: 'VYNTRA-PRS-4409',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-4409',
      name: 'Shilpa Rao',
      admittedAt: now - dayMs * 1,
      expectedStayDays: 2,
      assignedBedNumber: 10,
      status: 'active',
    },
    {
      personId: 'VYNTRA-PRS-6617',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-6617',
      name: 'Ayesha Begum',
      admittedAt: now - dayMs * 1.8,
      expectedStayDays: 5,
      assignedBedNumber: 11,
      status: 'active',
    },
    {
      personId: 'VYNTRA-PRS-2234',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-2234',
      name: 'Sneha Kulkarni',
      admittedAt: now - dayMs * 0.4,
      expectedStayDays: 3,
      assignedBedNumber: 12,
      status: 'active',
    },
    {
      personId: 'VYNTRA-PRS-1001',
      isExistingAppUser: false,
      shelterAssignedId: 'VYNTRA-PRS-1001',
      name: 'Rekha Murthy',
      admittedAt: now - dayMs * 4,
      expectedStayDays: 3,
      status: 'discharged',
      dischargedAt: now - dayMs * 1,
    },
  ];

  const facilities: Facility[] = [
    {
      facilityId: 'FAC-01-NAPKIN',
      shelterId,
      facilityName: 'Sanitary Napkin Dispensers',
      type: 'women-specific',
      totalCapacity: 4,
      currentAvailable: 4,
      description: 'Touchless sanitary pad dispensing kiosks with hygienic disposal units',
      lastUpdatedAt: now,
    },
    {
      facilityId: 'FAC-02-SHOWERS',
      shelterId,
      facilityName: 'Private Women Shower Stalls',
      type: 'sanitation',
      totalCapacity: 8,
      currentAvailable: 6,
      description: 'Lockable hot water shower cubicles with safe private changing area',
      lastUpdatedAt: now,
    },
    {
      facilityId: 'FAC-03-MED',
      shelterId,
      facilityName: 'Emergency Medical & Triage Station',
      type: 'medical',
      totalCapacity: 2,
      currentAvailable: 1,
      description: 'First responder paramedic station with vital monitors and emergency kit',
      lastUpdatedAt: now,
    },
    {
      facilityId: 'FAC-04-NURSERY',
      shelterId,
      facilityName: 'Quiet Sanctuary & Infant Nursery',
      type: 'general',
      totalCapacity: 10,
      currentAvailable: 6,
      description: 'Noise-attenuated safe room for mothers, pregnant women, and young children',
      lastUpdatedAt: now,
    },
  ];

  const inventory: InventoryItem[] = [
    {
      itemId: 'INV-01-PADS',
      shelterId,
      itemName: 'Sanitary Napkin Packs (XL)',
      category: 'hygiene',
      currentQuantity: 65,
      requiredMinimum: 25,
      lastUpdatedAt: now,
    },
    {
      itemId: 'INV-02-INFANT',
      shelterId,
      itemName: 'Infant Hygiene & Diaper Kits',
      category: 'hygiene',
      currentQuantity: 6,
      requiredMinimum: 15,
      lastUpdatedAt: now,
    },
    {
      itemId: 'INV-03-FIRSTAID',
      shelterId,
      itemName: 'Sterile First-Aid Kits',
      category: 'medical',
      currentQuantity: 14,
      requiredMinimum: 10,
      lastUpdatedAt: now,
    },
    {
      itemId: 'INV-04-BLANKET',
      shelterId,
      itemName: 'Emergency Thermal Fleece Blankets',
      category: 'bedding',
      currentQuantity: 35,
      requiredMinimum: 30,
      lastUpdatedAt: now,
    },
    {
      itemId: 'INV-05-RATIONS',
      shelterId,
      itemName: 'Nutritional Ration Packets (Ready-to-Eat)',
      category: 'provisions',
      currentQuantity: 120,
      requiredMinimum: 50,
      lastUpdatedAt: now,
    },
    {
      itemId: 'INV-06-WATER',
      shelterId,
      itemName: 'Purified Water Jerrycans (20L)',
      category: 'provisions',
      currentQuantity: 8,
      requiredMinimum: 12,
      lastUpdatedAt: now,
    },
  ];

  return { shelter, occupants, facilities, inventory };
}
