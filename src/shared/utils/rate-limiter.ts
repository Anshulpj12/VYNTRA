/**
 * VYNTRA — Rate Limiter
 * 
 * Combination-based rate limiting for queries and requests.
 * Prevents repeated identical requests from overwhelming the client or backend.
 * 
 * @module shared/utils/rate-limiter
 */

interface RateLimitEntry {
  count: number;
  firstRequestTime: number;
  lastRequestTime: number;
}

const store = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 5;

/**
 * Checks if a request with the given combination key is allowed.
 * 
 * @param combinationKey A unique string representing the search combination
 * @param maxRequests Maximum requests allowed within the window (default: 5)
 * @param windowMs Time window in milliseconds (default: 60000ms / 1 minute)
 * @returns true if the request is allowed, false if rate-limited
 */
export function isRequestAllowed(
  combinationKey: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  const now = Date.now();
  const entry = store.get(combinationKey);

  if (!entry) {
    store.set(combinationKey, { count: 1, firstRequestTime: now, lastRequestTime: now });
    return true;
  }

  // Reset if window has passed
  if (now - entry.firstRequestTime > windowMs) {
    store.set(combinationKey, { count: 1, firstRequestTime: now, lastRequestTime: now });
    return true;
  }

  // Within window — check count
  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count += 1;
  entry.lastRequestTime = now;
  return true;
}

/**
 * Checks whether a request with the given combination key is rate-limited.
 * Inverse of isRequestAllowed.
 * 
 * @returns true if rate-limited (blocked), false if allowed
 */
export function isRateLimited(
  combinationKey: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  return !isRequestAllowed(combinationKey, maxRequests, windowMs);
}

/**
 * Returns the remaining cooldown time in seconds before a rate-limited key can retry.
 */
export function getCooldownSeconds(
  combinationKey: string,
  windowMs: number = DEFAULT_WINDOW_MS
): number {
  const entry = store.get(combinationKey);
  if (!entry) return 0;

  const elapsed = Date.now() - entry.firstRequestTime;
  const remaining = windowMs - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Clears rate limit state for a specific key.
 */
export function clearRateLimit(combinationKey: string): void {
  store.delete(combinationKey);
}

/**
 * Resets the rate limit for a specific combination key (alias for clearRateLimit).
 */
export const resetRateLimit = clearRateLimit;

/**
 * Clears all rate limit entries.
 */
export function clearAllRateLimits(): void {
  store.clear();
}
