/**
 * VYNTRA — Unique ID Generator
 * 
 * Generates unique application IDs in the format:
 * VYNTRA-<PREFIX>-<8-character-alphanumeric>
 * 
 * Prefixes:
 *   USR — User application IDs
 *   SHL — Shelter provider IDs
 *   SVC — Service provider IDs
 *   ORD — Order IDs
 *   PRS — Person IDs (shelter-generated)
 *   FAC — Facility IDs
 *   INV — Inventory item IDs
 *   LOG — Usage log entry IDs
 * 
 * @module shared/utils/id-generator
 */

/** Valid ID prefixes used throughout VYNTRA */
export type IdPrefix = 'USR' | 'SHL' | 'SVC' | 'ORD' | 'PRS' | 'FAC' | 'INV' | 'LOG';

/** Alphanumeric character pool for ID generation */
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a cryptographically random alphanumeric string.
 * Uses Web Crypto API when available, falls back to performance.now() seeded randomness.
 * 
 * @param length - Number of characters to generate
 * @returns Random alphanumeric string
 */
function generateRandomString(length: number): string {
  const result: string[] = [];

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result.push(CHARSET[values[i] % CHARSET.length]);
    }
  } else {
    /* Fallback for environments without Web Crypto */
    const seed = Date.now() + performance.now();
    for (let i = 0; i < length; i++) {
      const index = Math.floor(((seed * (i + 1) * 9301 + 49297) % 233280) / 233280 * CHARSET.length);
      result.push(CHARSET[index % CHARSET.length]);
    }
  }

  return result.join('');
}

/**
 * Generates a unique VYNTRA ID with the specified prefix.
 * 
 * @param prefix - The type prefix (USR, SHL, SVC, ORD, PRS, FAC, INV, LOG)
 * @returns ID in format VYNTRA-<PREFIX>-<8-char-alphanumeric>
 * 
 * @example
 * generateUniqueId('SHL') // → "VYNTRA-SHL-A7K2M9X1"
 * generateUniqueId('PRS') // → "VYNTRA-PRS-B3F5H8J2"
 */
export function generateUniqueId(prefix: IdPrefix): string {
  const randomPart = generateRandomString(8);
  return `VYNTRA-${prefix}-${randomPart}`;
}
