// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

function caller(db: unknown, user: { id: string; email: string } | null = null) {
  return appRouter.createCaller({ db: db as never, c: {} as never, user, resHeaders: new Headers() })
}

describe('analytics router', () => {
  it('orderClick logs a click (public)', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'c1' })
    const res = await caller({ orderClick: { create } }).analytics.orderClick({ platform: 'Uber Eats' })
    expect(res).toEqual({ ok: true })
    expect(create).toHaveBeenCalledWith({ data: { platform: 'Uber Eats' } })
  })
  it('summary requires auth', async () => {
    await expect(caller({}, null).analytics.summary()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
  it('summary returns totals per platform', async () => {
    const groupBy = vi.fn().mockResolvedValue([{ platform: 'Uber Eats', _count: { _all: 3 } }])
    const count = vi.fn().mockResolvedValue(3)
    const res = await caller({ orderClick: { groupBy, count } }, { id: 'u', email: 'o@p.co' }).analytics.summary()
    expect(res.total).toBe(3)
    expect(res.byPlatform[0]).toEqual({ platform: 'Uber Eats', count: 3 })
  })
})
