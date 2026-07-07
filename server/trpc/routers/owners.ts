import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure } from '../trpc'
import { hashPassword, verifyPassword } from '../../auth/password'
import { changePasswordInput, addOwnerInput, resetOwnerPasswordInput } from '../../validation'

export const ownersRouter = router({
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.adminUser.findMany({ select: { id: true, email: true }, orderBy: { createdAt: 'asc' } }),
  ),

  changePassword: adminProcedure.input(changePasswordInput).mutation(async ({ ctx, input }) => {
    const me = await ctx.db.adminUser.findUnique({ where: { id: ctx.user.id } })
    if (!me || !(await verifyPassword(me.passwordHash, input.currentPassword))) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Current password is incorrect' })
    }
    await ctx.db.adminUser.update({
      where: { id: ctx.user.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    })
    return { ok: true }
  }),

  // Reset another owner's password without knowing their current one. Admin-only,
  // for when a staff member is locked out. Clears their sessions so the new
  // password is required on next login.
  resetPassword: adminProcedure.input(resetOwnerPasswordInput).mutation(async ({ ctx, input }) => {
    const target = await ctx.db.adminUser.findUnique({ where: { id: input.id } })
    if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'That account no longer exists' })
    await ctx.db.adminUser.update({
      where: { id: input.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    })
    await ctx.db.session.deleteMany({ where: { userId: input.id } })
    return { ok: true }
  }),

  add: adminProcedure.input(addOwnerInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.adminUser.findUnique({ where: { email: input.email } })
    if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'That email already has an account' })
    const created = await ctx.db.adminUser.create({
      data: { email: input.email, passwordHash: await hashPassword(input.password) },
      select: { id: true, email: true },
    })
    return created
  }),

  remove: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const count = await ctx.db.adminUser.count()
    if (count <= 1) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove the last owner' })
    await ctx.db.adminUser.delete({ where: { id: input.id } })
    return { ok: true }
  }),
})
