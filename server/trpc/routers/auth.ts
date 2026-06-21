import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { getCookie } from 'hono/cookie'
import { router, publicProcedure } from '../trpc'
import { hashPassword, verifyPassword } from '../../auth/password'
import { createSession, deleteSession, SESSION_COOKIE, SESSION_TTL_MS } from '../../auth/session'

// A dummy hash verified when the email is unknown, so login takes comparable
// time whether or not the account exists (prevents email enumeration via timing).
let dummyHashPromise: Promise<string> | null = null
function getDummyHash(): Promise<string> {
  return (dummyHashPromise ??= hashPassword('pbv-unused-dummy-password'))
}

/** Serialize the session cookie. Written to the tRPC response via resHeaders. */
function sessionCookie(token: string, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (process.env.COOKIE_SECURE === 'true') parts.push('Secure')
  return parts.join('; ')
}

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
      // Always run a verify (even when the user is missing) to keep timing uniform.
      const hash = user?.passwordHash ?? (await getDummyHash())
      const passwordOk = await verifyPassword(hash, input.password)
      if (!user || !passwordOk) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
      }
      const token = await createSession(ctx.db, user.id)
      ctx.resHeaders?.append(
        'Set-Cookie',
        sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)),
      )
      return { id: user.id, email: user.email }
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = getCookie(ctx.c, SESSION_COOKIE)
    await deleteSession(ctx.db, token)
    ctx.resHeaders?.append('Set-Cookie', sessionCookie('', 0))
    return { ok: true }
  }),
})
