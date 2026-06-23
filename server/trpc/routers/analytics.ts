import { z } from 'zod'
import { router, publicProcedure, adminProcedure } from '../trpc'
import { orderClickInput } from '../../validation'

export const analyticsRouter = router({
  orderClick: publicProcedure.input(orderClickInput).mutation(async ({ ctx, input }) => {
    await ctx.db.orderClick.create({ data: { platform: input.platform } })
    return { ok: true }
  }),

  summary: adminProcedure.query(async ({ ctx }) => {
    const [grouped, total] = await Promise.all([
      ctx.db.orderClick.groupBy({ by: ['platform'], _count: { _all: true } }),
      ctx.db.orderClick.count(),
    ])
    const byPlatform = grouped
      .map((g) => ({ platform: g.platform, count: g._count._all }))
      .sort((a, b) => b.count - a.count)
    return { total, byPlatform }
  }),

  clicksByDay: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const gte = new Date(now)
      gte.setUTCDate(gte.getUTCDate() - input.days + 1)
      gte.setUTCHours(0, 0, 0, 0)

      const rows = await ctx.db.orderClick.findMany({
        where: { createdAt: { gte } },
        select: { createdAt: true },
      })

      // bucket rows by UTC date string YYYY-MM-DD
      const counts: Record<string, number> = {}
      for (const row of rows) {
        const day = row.createdAt.toISOString().slice(0, 10)
        counts[day] = (counts[day] ?? 0) + 1
      }

      // build continuous day array oldest → newest
      const result: { date: string; count: number }[] = []
      for (let i = 0; i < input.days; i++) {
        const d = new Date(gte)
        d.setUTCDate(d.getUTCDate() + i)
        const date = d.toISOString().slice(0, 10)
        result.push({ date, count: counts[date] ?? 0 })
      }

      return result
    }),
})
