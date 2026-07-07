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

  describe('clicksByDay', () => {
    it('requires auth', async () => {
      await expect(caller({}, null).analytics.clicksByDay({ days: 7 })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('returns an array with length === days', async () => {
      const findMany = vi.fn().mockResolvedValue([])
      const res = await caller({ orderClick: { findMany } }, { id: 'u', email: 'o@p.co' }).analytics.clicksByDay({ days: 14 })
      expect(res).toHaveLength(14)
    })

    it('fills zero-count days so the series is continuous', async () => {
      // 30-day window; mock returns 2 rows on specific dates
      const findMany = vi.fn().mockResolvedValue([])
      const res = await caller({ orderClick: { findMany } }, { id: 'u', email: 'o@p.co' }).analytics.clicksByDay({ days: 30 })
      // every entry must have count === 0 (all zeros when findMany returns [])
      expect(res.every((d) => d.count === 0)).toBe(true)
      expect(res).toHaveLength(30)
    })

    it('puts counts on the correct days and fills gaps', async () => {
      const days = 7
      // build fake rows: 2 clicks 6 days ago, 1 click 2 days ago
      const now = new Date()

      const sixDaysAgo = new Date(now)
      sixDaysAgo.setUTCDate(sixDaysAgo.getUTCDate() - 6)
      sixDaysAgo.setUTCHours(10, 0, 0, 0)

      const twoDaysAgo = new Date(now)
      twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2)
      twoDaysAgo.setUTCHours(15, 0, 0, 0)

      const rows = [
        { createdAt: sixDaysAgo },
        { createdAt: sixDaysAgo },
        { createdAt: twoDaysAgo },
      ]

      const findMany = vi.fn().mockResolvedValue(rows)
      const res = await caller({ orderClick: { findMany } }, { id: 'u', email: 'o@p.co' }).analytics.clicksByDay({ days })

      // length equals days
      expect(res).toHaveLength(days)

      // dates are continuous oldest → newest
      for (let i = 1; i < res.length; i++) {
        const prev = new Date(res[i - 1].date)
        const curr = new Date(res[i].date)
        const diffMs = curr.getTime() - prev.getTime()
        expect(diffMs).toBe(86400000) // exactly 1 day apart
      }

      const sixAgoDate = sixDaysAgo.toISOString().slice(0, 10)
      const twoAgoDate = twoDaysAgo.toISOString().slice(0, 10)

      const sixEntry = res.find((d) => d.date === sixAgoDate)
      const twoEntry = res.find((d) => d.date === twoAgoDate)

      expect(sixEntry?.count).toBe(2)
      expect(twoEntry?.count).toBe(1)

      // all other days should be zero
      const otherDays = res.filter((d) => d.date !== sixAgoDate && d.date !== twoAgoDate)
      expect(otherDays.every((d) => d.count === 0)).toBe(true)
    })

    it('defaults to 30 days', async () => {
      const findMany = vi.fn().mockResolvedValue([])
      // call without explicit days — use default
      const res = await caller({ orderClick: { findMany } }, { id: 'u', email: 'o@p.co' }).analytics.clicksByDay({})
      expect(res).toHaveLength(30)
    })
  })
})
