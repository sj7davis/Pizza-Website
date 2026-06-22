export const MAX_ATTEMPTS = 8
export const WINDOW_MS = 10 * 60 * 1000

interface Bucket {
  count: number
  resetAt: number
}
const buckets = new Map<string, Bucket>()

export function resetRateLimits(): void {
  buckets.clear()
}

export function checkRateLimit(key: string): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, retryAfterSeconds: 0 }
  }
  if (b.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count += 1
  return { ok: true, retryAfterSeconds: 0 }
}
