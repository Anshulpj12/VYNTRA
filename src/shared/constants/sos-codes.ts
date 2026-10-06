/**
 * VYNTRA — SOS Condition Codes
 * 
 * Shared condition codes used identically by Part 1 (encoding)
 * and Part 3 (decoding). Do NOT modify without coordination.
 * 
 * @module shared/constants/sos-codes
 */

/** SOS condition code mapping */
export const SOS_CONDITION_CODES = {
  PG: 'Pregnancy',
  MN: 'Menstruation',
  VM: 'Vomiting',
  MD: 'Medical Difficulty',
  WC: 'Wheelchair Required',
  HC: 'Healthcare Support Needed',
  SN: 'Sanitation Required',
  AD: 'Acute Distress',
  CC: 'Child Care Required',
  EA: 'Elderly Assistance',
} as const;

/** Type for valid condition code keys */
export type SOSConditionCode = keyof typeof SOS_CONDITION_CODES;

/** All valid condition codes as an array */
export const ALL_CONDITION_CODES: SOSConditionCode[] = Object.keys(
  SOS_CONDITION_CODES
) as SOSConditionCode[];
