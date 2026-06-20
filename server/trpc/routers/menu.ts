import { z } from 'zod'
import { router, adminProcedure } from '../trpc'
import { menuItemInput, menuUpdateInput } from '../../validation'

export const menuRouter = router({
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.menuItem.findMany({ orderBy: { sortOrder: 'asc' } }),
  ),

  create: adminProcedure.input(menuItemInput).mutation(({ ctx, input }) =>
    ctx.db.menuItem.create({ data: input }),
  ),

  update: adminProcedure.input(menuUpdateInput).mutation(({ ctx, input }) => {
    const { id, ...data } = input
    return ctx.db.menuItem.update({ where: { id }, data })
  }),

  delete: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(({ ctx, input }) =>
    ctx.db.menuItem.delete({ where: { id: input.id } }),
  ),

  reorder: adminProcedure.input(z.object({ ids: z.array(z.string().min(1)) })).mutation(({ ctx, input }) =>
    ctx.db.$transaction(
      input.ids.map((id, sortOrder) => ctx.db.menuItem.update({ where: { id }, data: { sortOrder } })),
    ),
  ),
})
