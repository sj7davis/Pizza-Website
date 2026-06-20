// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { app } from '../index'

describe('health', () => {
  it('GET /api/health responds ok', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
