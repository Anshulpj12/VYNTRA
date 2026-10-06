/**
 * VYNTRA — Rate Limiter
 * 
 * Combination-based rate limiting for Firebase queries.
 * Prevents repeated identical requests from overwhelming the backend.
 * 
 * @module shared/utils/rate-limiter
 */

/** Rate limit entry tracking request history */
interface RateLimitEntry {
  count: number;
  firstRequestAt: number;
  lastRequestAt: number;
}

/** Default configuration */
const DEFAULT_WINDOW_MS = 60_000; // 1 minute window
const DEFAULT_MAX_REQUESTS = 10;  // max requests per window

/** In-memory rate limit store keyed by combination string */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Checks whether a request with the given combination key is allowed.
 * Returns true if the request can proceed, false if rate-limited.
 * 
 * @param combinationKey - Unique key representing the request combination
 *                         (e.g., `${state}:${district}:${action}`)
 * @param maxRequests - Maximum allowed requests within the time window
 * @param windowMs - Time window duration in milliseconds
 * @returns Whether the request is allowed
 */
export function isRateLimited(
  combinationKey: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(combinationKey);

  if (!entry) {
    /* First request for this combination */
    rateLimitStore.set(combinationKey, {
      count: 1,
      firstRequestAt: now,
      lastRequestAt: now,
    });
    return false;
  }

  /* Check if window has expired — reset */
  if (now - entry.firstRequestAt > windowMs) {
    rateLimitStore.set(combinationKey, {
      count: 1,
      firstRequestAt: now,
      lastRequestAt: now,
    });
    return false;
  }

  /* Within window — check count */
  if (entry.count >= maxRequests) {
    return true; // Rate limited
  }

  /* Allow and increment */
  entry.count += 1;
  entry.lastRequestAt = now;
  return false;
}

/**
 * Resets the rate limit for a specific combination key.
 * 
 * @param combinationKey - Key to reset
 */
export function resetRateLimit(combinationKey: string): void {
  rateLimitStore.delete(combinationKey);
}

/**
 * Clears all rate limit entries.
 * Useful for testing or app reset.
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
