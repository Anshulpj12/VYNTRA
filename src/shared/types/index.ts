import { Timestamp } from 'firebase/firestore';

// ── User Types ──

export interface VyntraUser {
  appId: string;
  googleUid: string;
  role: 'user' | 'shelter-provider' | 'service-provider';
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

export interface UserProfile {
  appId: string;
  name: string;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  age: number;
  state: string;
  district: string;
  homeAddress: string;
  homeCoordinates: GeoCoordinates;
  emergencyContact: string;
  pregnancyStatus?: { isPregnant: boolean; estimatedMonth?: number };
  disabilities?: string[];
  medicalConditions?: string;
  currentlyMenstruating?: boolean;
  specialRequirements?: string;
  profileCompleteness: number;
  lastModifiedAt: Timestamp;
  pendingSync: boolean;
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

// ── Menstrual Cycle Types ──

export interface CycleRecord {
  cycleId: string;
  userId: string;
  startEvent: CycleEvent;
  endEvent?: CycleEvent;
  durationDays?: number;
  notes: CycleNote[];
  isActive: boolean;
}

export interface CycleEvent {
  autoDateTime: Timestamp;
  editedDateTime?: Timestamp;
}

export interface CycleNote {
  noteId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── World Chat Types ──

export interface ChatMessage {
  messageId: string;
  userId: string;
  districtCode: string;
  category: string;
  content: string;
  timestamp: Timestamp;
}

export interface SixHourRecord {
  recordId: string;
  districtCode: string;
  stateCode: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  status: 'active' | 'completed';
  messages: ChatMessage[];
  messageCount: number;
}

// ── SOS Types ──

export interface SOSRequest {
  userId: string;
  coordinates: GeoCoordinates;
  coordinateSource: 'gps' | 'profile';
  selectedConditions: string[];
  compactCode: string;
  selectedShelterId: string;
  shelterMobileNumber: string;
  createdAt: Timestamp;
  sentViaSMS: boolean;
}

// ── Shelter Types ──

export interface ShelterProvider {
  shelterId: string;
  providerGoogleUid: string;
  shelterName: string;
  location: string;
  state: string;
  district: string;
  coordinates: GeoCoordinates;
  registeredMobile: string;
  totalBedCapacity: number;
  occupiedBeds: number;
  availableBeds: number;
  isActive: boolean;
  registeredAt: Timestamp;
  lastUpdatedAt: Timestamp;
}

export interface ShelterMetadata {
  shelterId: string;
  shelterName: string;
  coordinates: GeoCoordinates;
  registeredMobile: string;
  state: string;
  district: string;
  city: string;
  totalBedCapacity: number;
  occupiedBeds: number;
  availableBeds: number;
  currentOccupants: OccupantSummary[];
  facilities: FacilitySummary[];
  inventorySummary: InventoryItemSummary[];
  shelterScore: number;
  lastUpdatedAt: Timestamp;
}

export interface OccupantSummary {
  personId: string;
  expectedStayDays: number;
  admittedAt: Timestamp;
}

export interface FacilitySummary {
  facilityId: string;
  facilityName: string;
  type: 'women-specific' | 'sanitation' | 'medical' | 'general';
  totalCapacity: number;
  currentAvailable: number;
}

export interface InventoryItemSummary {
  itemName: string;
  currentQuantity: number;
  requiredMinimum: number;
}

// ── Occupant Types ──

export interface Occupant {
  personId: string;
  isExistingAppUser: boolean;
  existingAppId?: string;
  shelterAssignedId?: string;
  admittedAt: Timestamp;
  expectedStayDays: number;
  assignedBedNumber?: string;
  status: 'active' | 'discharged';
}

// ── Inventory Types ──

export interface InventoryItem {
  itemId: string;
  shelterId: string;
  itemName: string;
  currentQuantity: number;
  requiredMinimum: number;
  lastUpdatedAt: Timestamp;
  usageRate?: number;
}

export interface UsageLogEntry {
  logId: string;
  itemId: string;
  shelterId: string;
  quantityUsed: number;
  associatedPersonId?: string;
  usedAt: Timestamp;
  notes?: string;
}

// ── Service Provider Types ──

export interface ServiceProvider {
  providerId: string;
  providerGoogleUid: string;
  providerName: string;
  location: string;
  state: string;
  district: string;
  coordinates: GeoCoordinates;
  registeredAt: Timestamp;
  isActive: boolean;
}

// ── Order Types ──

export interface Order {
  orderId: string;
  requestingShelterId: string;
  requestingShelterName: string;
  shelterCoordinates: GeoCoordinates;
  items: OrderItem[];
  targetMode: 'single' | 'five-nearest';
  targetProviderIds: string[];
  acceptedByProviderId?: string;
  status: 'pending' | 'accepted' | 'preparing' | 'dispatched' | 'delivered' | 'confirmed';
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  dispatchedAt?: Timestamp;
  confirmedAt?: Timestamp;
}

export interface OrderItem {
  itemName: string;
  requestedQuantity: number;
}
