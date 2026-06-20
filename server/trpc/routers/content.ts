import { router, publicProcedure } from '../trpc'
import { rowsToSiteContent } from '../../mappers'

export const contentRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    const [site, menu] = await Promise.all([
      ctx.db.siteContent.findUnique({ where: { id: 1 } }),
      ctx.db.menuItem.findMany({ where: { available: true }, orderBy: { sortOrder: 'asc' } }),
    ])
    if (!site) throw new Error('Site content not seeded')
    return { siteContent: rowsToSiteContent(site, menu) }
  }),
})
