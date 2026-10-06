/**
 * VYNTRA — Shelter Readiness Score Calculator
 * Computes a weighted 0-100 score based on bed capacity, women's sanitation,
 * hygiene inventory, healthcare facilities, and mobility equipment.
 */

import type { ShelterMetadata } from '../../shared/types';

export interface ScoreBreakdown {
  totalScore: number;
  availableBedsScore: number;
  womenSanitationScore: number;
  hygieneResourcesScore: number;
  healthcareScore: number;
  mobilityScore: number;
  emergencySuppliesScore: number;
  maxScore: number;
  ratingTier: 'exceptional' | 'adequate' | 'critical';
}

/**
 * Calculates shelter score from current shelter metadata.
 */
export function calculateShelterScore(metadata: Partial<ShelterMetadata>): ScoreBreakdown {
  const totalBeds = metadata.totalBedCapacity || 1;
  const availableBeds = metadata.availableBeds || 0;

  // 1. Available Bed Capacity Ratio (Max: 25 points)
  const bedRatio = Math.min(1, Math.max(0, availableBeds / totalBeds));
  const availableBedsScore = Math.round(bedRatio * 25);

  // 2. Women's Sanitation Facilities (Max: 20 points)
  const sanitationFacilities = (metadata.facilities || []).filter(
    (f) => f.type === 'sanitation' || f.type === 'women-specific'
  );
  let sanitationScore = 10; // Default baseline if not yet entered
  if (sanitationFacilities.length > 0) {
    const totalCap = sanitationFacilities.reduce((sum, f) => sum + (f.totalCapacity || 1), 0);
    const availCap = sanitationFacilities.reduce((sum, f) => sum + (f.currentAvailable || 0), 0);
    sanitationScore = Math.min(20, Math.round((availCap / Math.max(1, totalCap)) * 20));
  }

  // 3. Hygiene & Dignity Resources (Max: 20 points)
  const inventory = metadata.inventorySummary || [];
  let hygieneScore = 12; // Baseline
  if (inventory.length > 0) {
    const hygieneItems = inventory.filter((i) =>
      /pad|sanitary|hygiene|dignity|menstrual/i.test(i.itemName)
    );
    const targetItems = hygieneItems.length > 0 ? hygieneItems : inventory;
    const ratioSum = targetItems.reduce((acc, item) => {
      const minReq = Math.max(1, item.requiredMinimum);
      return acc + Math.min(1.2, item.currentQuantity / minReq);
    }, 0);
    hygieneScore = Math.min(20, Math.round((ratioSum / targetItems.length) * 20));
  }

  // 4. Healthcare & Medical Facilities (Max: 15 points)
  const medicalFacilities = (metadata.facilities || []).filter(
    (f) => f.type === 'medical'
  );
  let healthcareScore = 8;
  if (medicalFacilities.length > 0) {
    const totalMed = medicalFacilities.reduce((sum, f) => sum + (f.totalCapacity || 1), 0);
    const availMed = medicalFacilities.reduce((sum, f) => sum + (f.currentAvailable || 0), 0);
    healthcareScore = Math.min(15, Math.round((availMed / Math.max(1, totalMed)) * 15));
  }

  // 5. Mobility & Wheelchair Equipment (Max: 10 points)
  const mobilityItems = inventory.filter((i) =>
    /wheelchair|stretcher|crutch|walker/i.test(i.itemName)
  );
  let mobilityScore = 6;
  if (mobilityItems.length > 0) {
    const hasActiveMobility = mobilityItems.some((i) => i.currentQuantity > 0);
    mobilityScore = hasActiveMobility ? 10 : 3;
  }

  // 6. Emergency & Backup Resources (Max: 10 points)
  const emergencyScore = 8;

  const totalScore = Math.min(
    100,
    Math.max(
      0,
      availableBedsScore +
        sanitationScore +
        hygieneScore +
        healthcareScore +
        mobilityScore +
        emergencyScore
    )
  );

  let ratingTier: 'exceptional' | 'adequate' | 'critical' = 'adequate';
  if (totalScore >= 80) ratingTier = 'exceptional';
  else if (totalScore < 50) ratingTier = 'critical';

  return {
    totalScore,
    availableBedsScore,
    womenSanitationScore: sanitationScore,
    hygieneResourcesScore: hygieneScore,
    healthcareScore,
    mobilityScore,
    emergencySuppliesScore: emergencyScore,
    maxScore: 100,
    ratingTier,
  };
}
