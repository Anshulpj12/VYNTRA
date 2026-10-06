/**
 * VYNTRA — State Code Ranges
 * Each state has a predefined numerical range for district codes.
 * Used by World Chat for geographic organization.
 */

export interface StateCodeRange {
  stateCode: string;
  stateName: string;
  rangeStart: number;
  rangeEnd: number;
}

export const STATE_CODE_RANGES: StateCodeRange[] = [
  { stateCode: 'AP', stateName: 'Andhra Pradesh', rangeStart: 100, rangeEnd: 130 },
  { stateCode: 'AR', stateName: 'Arunachal Pradesh', rangeStart: 131, rangeEnd: 155 },
  { stateCode: 'AS', stateName: 'Assam', rangeStart: 156, rangeEnd: 190 },
  { stateCode: 'BR', stateName: 'Bihar', rangeStart: 191, rangeEnd: 230 },
  { stateCode: 'CT', stateName: 'Chhattisgarh', rangeStart: 231, rangeEnd: 260 },
  { stateCode: 'GA', stateName: 'Goa', rangeStart: 261, rangeEnd: 265 },
  { stateCode: 'GJ', stateName: 'Gujarat', rangeStart: 266, rangeEnd: 300 },
  { stateCode: 'HR', stateName: 'Haryana', rangeStart: 301, rangeEnd: 325 },
  { stateCode: 'HP', stateName: 'Himachal Pradesh', rangeStart: 326, rangeEnd: 340 },
  { stateCode: 'JH', stateName: 'Jharkhand', rangeStart: 341, rangeEnd: 365 },
  { stateCode: 'KA', stateName: 'Karnataka', rangeStart: 366, rangeEnd: 400 },
  { stateCode: 'KL', stateName: 'Kerala', rangeStart: 401, rangeEnd: 415 },
  { stateCode: 'MP', stateName: 'Madhya Pradesh', rangeStart: 416, rangeEnd: 470 },
  { stateCode: 'MH', stateName: 'Maharashtra', rangeStart: 471, rangeEnd: 510 },
  { stateCode: 'MN', stateName: 'Manipur', rangeStart: 511, rangeEnd: 525 },
  { stateCode: 'ML', stateName: 'Meghalaya', rangeStart: 526, rangeEnd: 540 },
  { stateCode: 'MZ', stateName: 'Mizoram', rangeStart: 541, rangeEnd: 550 },
  { stateCode: 'NL', stateName: 'Nagaland', rangeStart: 551, rangeEnd: 565 },
  { stateCode: 'OD', stateName: 'Odisha', rangeStart: 566, rangeEnd: 600 },
  { stateCode: 'PB', stateName: 'Punjab', rangeStart: 601, rangeEnd: 625 },
  { stateCode: 'RJ', stateName: 'Rajasthan', rangeStart: 626, rangeEnd: 660 },
  { stateCode: 'SK', stateName: 'Sikkim', rangeStart: 661, rangeEnd: 665 },
  { stateCode: 'TN', stateName: 'Tamil Nadu', rangeStart: 666, rangeEnd: 705 },
  { stateCode: 'TG', stateName: 'Telangana', rangeStart: 706, rangeEnd: 740 },
  { stateCode: 'TR', stateName: 'Tripura', rangeStart: 741, rangeEnd: 750 },
  { stateCode: 'UP', stateName: 'Uttar Pradesh', rangeStart: 751, rangeEnd: 830 },
  { stateCode: 'UK', stateName: 'Uttarakhand', rangeStart: 831, rangeEnd: 845 },
  { stateCode: 'WB', stateName: 'West Bengal', rangeStart: 846, rangeEnd: 870 },
  { stateCode: 'DL', stateName: 'Delhi', rangeStart: 871, rangeEnd: 880 },
  { stateCode: 'JK', stateName: 'Jammu & Kashmir', rangeStart: 881, rangeEnd: 905 },
  { stateCode: 'LA', stateName: 'Ladakh', rangeStart: 906, rangeEnd: 910 },
];

/** Get the state range for a given state code */
export function getStateRange(stateCode: string): StateCodeRange | undefined {
  return STATE_CODE_RANGES.find((s) => s.stateCode === stateCode);
}

/** Check if a district code falls within the valid range for a state */
export function isCodeInStateRange(stateCode: string, districtCode: number): boolean {
  const range = getStateRange(stateCode);
  if (!range) return false;
  return districtCode >= range.rangeStart && districtCode <= range.rangeEnd;
}

/** Get list of all state names (for dropdown) */
export function getStateList(): { code: string; name: string }[] {
  return STATE_CODE_RANGES.map((s) => ({ code: s.stateCode, name: s.stateName }));
}
