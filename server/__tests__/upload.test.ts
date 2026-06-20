// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validateUpload, UPLOAD_DIR, MAX_UPLOAD_BYTES } from '../upload'

describe('validateUpload', () => {
  it('accepts a small jpeg/png/webp', () => {
    expect(validateUpload('image/jpeg', 1000).ok).toBe(true)
    expect(validateUpload('image/png', 1000).ok).toBe(true)
    expect(validateUpload('image/webp', 1000).ok).toBe(true)
  })
  it('rejects a non-image type', () => {
    const r = validateUpload('application/pdf', 1000)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/type/i)
  })
  it('rejects files over the size limit', () => {
    const r = validateUpload('image/jpeg', MAX_UPLOAD_BYTES + 1)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/large|size/i)
  })
  it('exposes an uploads directory under server/', () => {
    expect(UPLOAD_DIR).toMatch(/uploads/)
  })
})
