import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import { router, publicProcedure } from '../trpc'
import { verifyPassword } from '../../auth/password'
import { createSession, deleteSession, SESSION_COOKIE, SESSION_TTL_MS } from '../../auth/session'

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email({ pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ }),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.adminUser.findUnique({ where: { email: input.email } })
      if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
      }
      const token = await createSession(ctx.db, user.id)
      setCookie(ctx.c, SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        maxAge: Math.floor(SESSION_TTL_MS / 1000),
      })
      return { id: user.id, email: user.email }
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = getCookie(ctx.c, SESSION_COOKIE)
    await deleteSession(ctx.db, token)
    deleteCookie(ctx.c, SESSION_COOKIE, { path: '/' })
    return { ok: true }
  }),
})
