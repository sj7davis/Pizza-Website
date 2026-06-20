// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('password', () => {
  it('hashes to something other than the plaintext', async () => {
    const hash = await hashPassword('correct horse')
    expect(hash).not.toBe('correct horse')
    expect(hash.length).toBeGreaterThan(20)
  })
  it('verifies a correct password', async () => {
    const hash = await hashPassword('s3cret!')
    expect(await verifyPassword(hash, 's3cret!')).toBe(true)
  })
  it('rejects a wrong password', async () => {
    const hash = await hashPassword('s3cret!')
    expect(await verifyPassword(hash, 'nope')).toBe(false)
  })
})
