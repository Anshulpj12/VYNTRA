/**
 * VYNTRA — Unique ID Generator
 * Produces IDs in the format: VYNTRA-<PREFIX>-<8-char-alphanumeric>
 * 
 * Prefixes: USR (user), SHL (shelter), SVC (service provider), ORD (order), PRS (person)
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateRandomChars(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => CHARS[byte % CHARS.length]).join('');
}

export function generateUniqueId(prefix: 'USR' | 'SHL' | 'SVC' | 'ORD' | 'PRS'): string {
  return `VYNTRA-${prefix}-${generateRandomChars(8)}`;
}
