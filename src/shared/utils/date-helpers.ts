/**
 * VYNTRA — Timestamp & Date Helpers
 * Robustly converts Firebase Timestamp, IndexedDB-serialized plain objects,
 * ISO strings, or numeric timestamps into JavaScript Date & millisecond timestamps.
 */

export function timestampToMillis(ts: unknown): number {
  if (!ts) return Date.now();
  
  // Firebase Timestamp instance
  if (typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().getTime();
  }
  
  // IndexedDB serialized Firestore Timestamp: { seconds: number, nanoseconds: number }
  if (typeof (ts as { seconds?: number }).seconds === 'number') {
    const s = (ts as { seconds: number }).seconds;
    const ns = (ts as { nanoseconds?: number }).nanoseconds || 0;
    return s * 1000 + Math.round(ns / 1e6);
  }
  
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const parsed = new Date(ts).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  
  return Date.now();
}

export function timestampToDate(ts: unknown): Date {
  return new Date(timestampToMillis(ts));
}
