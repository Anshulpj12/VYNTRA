/**
 * VYNTRA — SOS Condition Codes
 * Used by Part 1 (encoding) and Part 3 (decoding).
 * Format: VYNTRA|<lat>,<lng>|<codes-joined-by-dashes>|<userId>|<unix-timestamp>
 */

export const SOS_CONDITIONS: Record<string, string> = {
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
};

export const SOS_CONDITION_CODES = Object.keys(SOS_CONDITIONS);

/** Encode an SOS request into a compact string */
export function encodeSOS(
  lat: number,
  lng: number,
  conditions: string[],
  userId: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const conditionStr = conditions.join('-');
  return `VYNTRA|${lat},${lng}|${conditionStr}|${userId}|${timestamp}`;
}

/** Decode a compact SOS string back into its components */
export function decodeSOS(code: string): {
  lat: number;
  lng: number;
  conditions: { code: string; label: string }[];
  userId: string;
  timestamp: number;
} | null {
  try {
    const parts = code.split('|');
    if (parts.length !== 5 || parts[0] !== 'VYNTRA') return null;

    const [latStr, lngStr] = parts[1].split(',');
    const conditionCodes = parts[2].split('-');
    const conditions = conditionCodes.map((c) => ({
      code: c,
      label: SOS_CONDITIONS[c] || 'Unknown',
    }));

    return {
      lat: parseFloat(latStr),
      lng: parseFloat(lngStr),
      conditions,
      userId: parts[3],
      timestamp: parseInt(parts[4], 10),
    };
  } catch {
    return null;
  }
}
