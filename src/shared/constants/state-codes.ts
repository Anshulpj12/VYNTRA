/**
 * VYNTRA — State Code Ranges
 * 
 * Predefined numerical code ranges for World Chat district identification.
 * Each state has a non-overlapping numerical range.
 * 
 * @module shared/constants/state-codes
 */

/** State code range definition */
export interface StateCodeRange {
  stateName: string;
  stateCode: string;
  rangeStart: number;
  rangeEnd: number;
}

/** All Indian states/UTs with their assigned code ranges */
export const STATE_CODE_RANGES: StateCodeRange[] = [
  { stateName: 'Andhra Pradesh', stateCode: 'AP', rangeStart: 100, rangeEnd: 199 },
  { stateName: 'Arunachal Pradesh', stateCode: 'AR', rangeStart: 200, rangeEnd: 249 },
  { stateName: 'Assam', stateCode: 'AS', rangeStart: 250, rangeEnd: 349 },
  { stateName: 'Bihar', stateCode: 'BR', rangeStart: 350, rangeEnd: 449 },
  { stateName: 'Chhattisgarh', stateCode: 'CG', rangeStart: 450, rangeEnd: 529 },
  { stateName: 'Goa', stateCode: 'GA', rangeStart: 530, rangeEnd: 549 },
  { stateName: 'Gujarat', stateCode: 'GJ', rangeStart: 550, rangeEnd: 649 },
  { stateName: 'Haryana', stateCode: 'HR', rangeStart: 650, rangeEnd: 729 },
  { stateName: 'Himachal Pradesh', stateCode: 'HP', rangeStart: 730, rangeEnd: 799 },
  { stateName: 'Jharkhand', stateCode: 'JH', rangeStart: 800, rangeEnd: 879 },
  { stateName: 'Karnataka', stateCode: 'KA', rangeStart: 880, rangeEnd: 979 },
  { stateName: 'Kerala', stateCode: 'KL', rangeStart: 980, rangeEnd: 1049 },
  { stateName: 'Madhya Pradesh', stateCode: 'MP', rangeStart: 1050, rangeEnd: 1179 },
  { stateName: 'Maharashtra', stateCode: 'MH', rangeStart: 1180, rangeEnd: 1329 },
  { stateName: 'Manipur', stateCode: 'MN', rangeStart: 1330, rangeEnd: 1369 },
  { stateName: 'Meghalaya', stateCode: 'ML', rangeStart: 1370, rangeEnd: 1409 },
  { stateName: 'Mizoram', stateCode: 'MZ', rangeStart: 1410, rangeEnd: 1439 },
  { stateName: 'Nagaland', stateCode: 'NL', rangeStart: 1440, rangeEnd: 1479 },
  { stateName: 'Odisha', stateCode: 'OD', rangeStart: 1480, rangeEnd: 1579 },
  { stateName: 'Punjab', stateCode: 'PB', rangeStart: 1580, rangeEnd: 1659 },
  { stateName: 'Rajasthan', stateCode: 'RJ', rangeStart: 1660, rangeEnd: 1789 },
  { stateName: 'Sikkim', stateCode: 'SK', rangeStart: 1790, rangeEnd: 1809 },
  { stateName: 'Tamil Nadu', stateCode: 'TN', rangeStart: 1810, rangeEnd: 1929 },
  { stateName: 'Telangana', stateCode: 'TS', rangeStart: 1930, rangeEnd: 2029 },
  { stateName: 'Tripura', stateCode: 'TR', rangeStart: 2030, rangeEnd: 2059 },
  { stateName: 'Uttar Pradesh', stateCode: 'UP', rangeStart: 2060, rangeEnd: 2259 },
  { stateName: 'Uttarakhand', stateCode: 'UK', rangeStart: 2260, rangeEnd: 2329 },
  { stateName: 'West Bengal', stateCode: 'WB', rangeStart: 2330, rangeEnd: 2449 },
  /* Union Territories */
  { stateName: 'Delhi', stateCode: 'DL', rangeStart: 2450, rangeEnd: 2499 },
  { stateName: 'Chandigarh', stateCode: 'CH', rangeStart: 2500, rangeEnd: 2519 },
  { stateName: 'Jammu & Kashmir', stateCode: 'JK', rangeStart: 2520, rangeEnd: 2589 },
  { stateName: 'Ladakh', stateCode: 'LA', rangeStart: 2590, rangeEnd: 2609 },
  { stateName: 'Puducherry', stateCode: 'PY', rangeStart: 2610, rangeEnd: 2629 },
  { stateName: 'Andaman & Nicobar', stateCode: 'AN', rangeStart: 2630, rangeEnd: 2649 },
  { stateName: 'Dadra & Nagar Haveli and Daman & Diu', stateCode: 'DD', rangeStart: 2650, rangeEnd: 2669 },
  { stateName: 'Lakshadweep', stateCode: 'LD', rangeStart: 2670, rangeEnd: 2679 },
];

/**
 * Finds the state code range for a given state code.
 * 
 * @param stateCode - Two-letter state code
 * @returns The matching StateCodeRange or undefined
 */
export function getStateRange(stateCode: string): StateCodeRange | undefined {
  return STATE_CODE_RANGES.find((s) => s.stateCode === stateCode);
}

/** Check if a district code falls within the valid range for a state */
export function isCodeInStateRange(stateCode: string, districtCode: number): boolean {
  const range = getStateRange(stateCode);
  if (!range) return false;
  return districtCode >= range.rangeStart && districtCode <= range.rangeEnd;
}

/** Validates whether a numerical code falls within the valid range for a state */
export const isValidCodeForState = isCodeInStateRange;

/** Get list of all state names (for dropdown) */
export function getStateList(): { code: string; name: string }[] {
  return STATE_CODE_RANGES.map((s) => ({ code: s.stateCode, name: s.stateName }));
}

/** All state names for dropdown selection */
export const ALL_STATES = STATE_CODE_RANGES.map((s) => ({
  name: s.stateName,
  code: s.stateCode,
}));
