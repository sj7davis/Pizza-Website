import { router, publicProcedure, adminProcedure } from '../trpc'
import { emailInput } from '../../validation'
import { sendWelcomeEmail } from '../../email'

export const emailsRouter = router({
  subscribe: publicProcedure.input(emailInput).mutation(async ({ ctx, input }) => {
    try {
      await ctx.db.emailSignup.create({ data: { email: input.email } })
      await sendWelcomeEmail(input.email)
    } catch (e: unknown) {
      // Unique-constraint (already subscribed) is fine; swallow it.
      if (!(typeof e === 'object' && e && 'code' in e && (e as { code?: string }).code === 'P2002')) throw e
    }
    return { ok: true }
  }),

  list: adminProcedure.query(({ ctx }) =>
    ctx.db.emailSignup.findMany({ orderBy: { createdAt: 'desc' } }),
  ),
})
