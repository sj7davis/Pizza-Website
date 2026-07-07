import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { generateResetToken, hashResetToken, RESET_TTL_MS } from '../resetToken'

describe('resetToken', () => {
  it('generates a 64-char hex token (32 random bytes)', () => {
    const { token } = generateResetToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates a 64-char hex sha256 tokenHash', () => {
    const { tokenHash } = generateResetToken()
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('pairs the raw token with its deterministic sha256 hash', () => {
    const { token, tokenHash } = generateResetToken()
    const expected = createHash('sha256').update(token).digest('hex')
    expect(tokenHash).toBe(expected)
  })

  it('produces two different tokens on repeated calls', () => {
    const a = generateResetToken()
    const b = generateResetToken()
    expect(a.token).not.toBe(b.token)
    expect(a.tokenHash).not.toBe(b.tokenHash)
  })

  it('hashResetToken is deterministic and matches generateResetToken output', () => {
    const { token, tokenHash } = generateResetToken()
    expect(hashResetToken(token)).toBe(tokenHash)
    expect(hashResetToken(token)).toBe(hashResetToken(token))
  })

  it('RESET_TTL_MS is 60 minutes', () => {
    expect(RESET_TTL_MS).toBe(1000 * 60 * 60)
  })
})
