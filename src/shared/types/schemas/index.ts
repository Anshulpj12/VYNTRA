/**
 * VYNTRA — Shared Data Validation Schemas & Helpers
 * 
 * Provides client-side validation logic for all core user, shelter,
 * and service data inputs before committing to Firebase or IndexedDB.
 * 
 * @module shared/types/schemas
 */

import { ALL_CONDITION_CODES } from '../../constants/sos-codes';
import { isCodeInStateRange } from '../../constants/state-codes';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates User Profile Input before profile creation or update.
 */
export function validateUserProfile(data: {
  name?: string;
  age?: number | string;
  gender?: string;
  state?: string;
  district?: string;
  emergencyContact?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  }

  const ageNum = Number(data.age);
  if (!data.age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
    errors.age = 'Please enter a valid age between 1 and 120.';
  }

  if (!data.gender) {
    errors.gender = 'Please select a gender.';
  }

  if (!data.state || data.state.trim().length === 0) {
    errors.state = 'State is required.';
  }

  if (!data.district || data.district.trim().length === 0) {
    errors.district = 'District is required.';
  }

  if (!data.emergencyContact || !/^[0-9+\s-]{10,15}$/.test(data.emergencyContact.trim())) {
    errors.emergencyContact = 'Valid 10-digit emergency contact phone is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates Shelter Provider Registration form input.
 */
export function validateShelterRegistration(data: {
  shelterName?: string;
  state?: string;
  district?: string;
  location?: string;
  registeredMobile?: string;
  totalBedCapacity?: number | string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.shelterName || data.shelterName.trim().length < 3) {
    errors.shelterName = 'Shelter name must be at least 3 characters.';
  }

  if (!data.state) {
    errors.state = 'State is required.';
  }

  if (!data.district) {
    errors.district = 'District is required.';
  }

  if (!data.location || data.location.trim().length < 5) {
    errors.location = 'Specific address/location must be at least 5 characters.';
  }

  if (!data.registeredMobile || !/^[0-9+\s-]{10,15}$/.test(data.registeredMobile.trim())) {
    errors.registeredMobile = 'Valid 10-digit emergency phone number is required.';
  }

  const beds = Number(data.totalBedCapacity);
  if (!data.totalBedCapacity || isNaN(beds) || beds < 1) {
    errors.totalBedCapacity = 'Total bed capacity must be at least 1.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates Service Provider Registration form input.
 */
export function validateServiceProviderRegistration(data: {
  providerName?: string;
  state?: string;
  district?: string;
  location?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.providerName || data.providerName.trim().length < 3) {
    errors.providerName = 'Organization/Depot name must be at least 3 characters.';
  }

  if (!data.state) {
    errors.state = 'State is required.';
  }

  if (!data.district) {
    errors.district = 'District is required.';
  }

  if (!data.location || data.location.trim().length < 5) {
    errors.location = 'Depot dispatch location must be at least 5 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates SOS request parameters before broadcast/SMS.
 */
export function validateSOSRequest(data: {
  lat?: number;
  lng?: number;
  selectedConditions?: string[];
  userId?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (typeof data.lat !== 'number' || typeof data.lng !== 'number' || isNaN(data.lat) || isNaN(data.lng)) {
    errors.coordinates = 'Valid GPS coordinates are required.';
  }

  if (!data.selectedConditions || data.selectedConditions.length === 0) {
    errors.conditions = 'At least one emergency condition must be selected.';
  } else {
    const invalidCodes = data.selectedConditions.filter((c) => !ALL_CONDITION_CODES.includes(c));
    if (invalidCodes.length > 0) {
      errors.conditions = `Unrecognized condition codes: ${invalidCodes.join(', ')}`;
    }
  }

  if (!data.userId || data.userId.trim().length === 0) {
    errors.userId = 'User ID is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates replenishment Order Input from a shelter to service providers.
 */
export function validateOrderInput(data: {
  requestingShelterId?: string;
  items?: Array<{ itemName: string; requestedQuantity: number }>;
  targetMode?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.requestingShelterId) {
    errors.requestingShelterId = 'Requesting Shelter ID is required.';
  }

  if (!data.items || data.items.length === 0) {
    errors.items = 'Order must contain at least one item.';
  } else {
    for (const item of data.items) {
      if (!item.itemName || item.requestedQuantity <= 0) {
        errors.items = 'All items must have a valid name and positive requested quantity.';
        break;
      }
    }
  }

  if (!data.targetMode || (data.targetMode !== 'single' && data.targetMode !== 'five-nearest')) {
    errors.targetMode = 'Target mode must be either "single" or "five-nearest".';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates District Code entry against state ranges.
 */
export function validateDistrictCode(stateCode: string, code: number): ValidationResult {
  const isValid = isCodeInStateRange(stateCode, code);
  return {
    isValid,
    errors: isValid ? {} : { districtCode: `Code ${code} is outside the valid range for state ${stateCode}.` },
  };
}
