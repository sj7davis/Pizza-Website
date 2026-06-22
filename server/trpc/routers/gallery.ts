import { z } from 'zod'
import { router, publicProcedure, adminProcedure } from '../trpc'
import { galleryCreateInput, galleryUpdateInput, galleryReorderInput } from '../../validation'

export const galleryRouter = router({
  listPublic: publicProcedure.query(({ ctx }) =>
    ctx.db.galleryImage
      .findMany({ orderBy: { sortOrder: 'asc' } })
      .then((rows) => rows.map(({ id, url, caption }) => ({ id, url, caption }))),
  ),

  list: adminProcedure.query(({ ctx }) =>
    ctx.db.galleryImage.findMany({ orderBy: { sortOrder: 'asc' } }),
  ),

  create: adminProcedure.input(galleryCreateInput).mutation(async ({ ctx, input }) => {
    const agg = await ctx.db.galleryImage.aggregate({ _max: { sortOrder: true } })
    const sortOrder = (agg._max.sortOrder ?? -1) + 1
    return ctx.db.galleryImage.create({ data: { ...input, sortOrder } })
  }),

  update: adminProcedure.input(galleryUpdateInput).mutation(({ ctx, input }) => {
    const { id, ...data } = input
    return ctx.db.galleryImage.update({ where: { id }, data })
  }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) =>
    ctx.db.galleryImage.delete({ where: { id: input.id } }),
  ),

  reorder: adminProcedure.input(galleryReorderInput).mutation(({ ctx, input }) =>
    ctx.db.$transaction(
      input.ids.map((id, sortOrder) => ctx.db.galleryImage.update({ where: { id }, data: { sortOrder } })),
    ),
  ),
})
