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
})
