/**
 * VYNTRA — Shelter Scoring Weights
 * 
 * Scoring weights for the Shelter Readiness Score (0–100).
 * Used by Part 3 to calculate scores; shared so all parts know the formula.
 * 
 * @module shared/constants/scoring-weights
 */

/** Category weights for shelter readiness scoring (must sum to 100) */
export const SCORING_WEIGHTS = {
  /** Available beds relative to total capacity */
  AVAILABLE_BEDS: 25,
  /** Women's sanitation facilities (washrooms, private showers) */
  WOMENS_SANITATION: 20,
  /** Hygiene resources (sanitary pads, menstrual kits) */
  HYGIENE_RESOURCES: 15,
  /** Healthcare facilities (medical rooms, first-aid stations) */
  HEALTHCARE_FACILITIES: 15,
  /** Wheelchair & mobility equipment */
  MOBILITY_EQUIPMENT: 10,
  /** Medical-support equipment (emergency kits, oxygen) */
  MEDICAL_SUPPORT: 10,
  /** Other emergency resources (blankets, water, food) */
  EMERGENCY_RESOURCES: 5,
} as const;

/** Total weight (should always equal 100) */
export const TOTAL_WEIGHT = Object.values(SCORING_WEIGHTS).reduce(
  (sum, w) => sum + w,
  0
);
