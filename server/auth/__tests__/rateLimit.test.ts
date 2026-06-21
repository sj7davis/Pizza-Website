// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, resetRateLimits, MAX_ATTEMPTS } from '../rateLimit'

beforeEach(() => resetRateLimits())

describe('checkRateLimit', () => {
  it('allows up to MAX_ATTEMPTS then blocks', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(checkRateLimit('1.2.3.4').ok).toBe(true)
    }
    const blocked = checkRateLimit('1.2.3.4')
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })
  it('tracks IPs independently', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) checkRateLimit('a')
    expect(checkRateLimit('a').ok).toBe(false)
    expect(checkRateLimit('b').ok).toBe(true)
  })
})
