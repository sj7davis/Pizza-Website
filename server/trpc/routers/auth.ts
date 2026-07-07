import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { getCookie } from 'hono/cookie'
import { router, publicProcedure } from '../trpc'
import { hashPassword, verifyPassword } from '../../auth/password'
import { createSession, deleteSession, SESSION_COOKIE, SESSION_TTL_MS } from '../../auth/session'
import { checkRateLimit } from '../../auth/rateLimit'
import { generateResetToken, hashResetToken, RESET_TTL_MS } from '../../auth/resetToken'
import { sendPasswordResetEmail } from '../../email'

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
      const ip =
        ctx.c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
        ctx.c.req.header('x-real-ip') ||
        'unknown'
      const rl = checkRateLimit(ip)
      if (!rl.ok) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`,
        })
      }
      const email = input.email.trim().toLowerCase()
      const user = await ctx.db.adminUser.findUnique({ where: { email } })
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

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email({ pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ }) }))
    .mutation(async ({ ctx, input }) => {
      const ip =
        ctx.c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
        ctx.c.req.header('x-real-ip') ||
        'unknown'
      const rl = checkRateLimit(ip)
      if (!rl.ok) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`,
        })
      }

      // Never let a lookup/send failure — or its timing — reveal whether the
      // account exists. Always respond identically regardless of outcome.
      try {
        const email = input.email.trim().toLowerCase()
        const user = await ctx.db.adminUser.findUnique({ where: { email } })
        if (user) {
          await ctx.db.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } })
          const { token, tokenHash } = generateResetToken()
          await ctx.db.passwordReset.create({
            data: {
              userId: user.id,
              tokenHash,
              expiresAt: new Date(Date.now() + RESET_TTL_MS),
            },
          })
          const baseUrl = process.env.APP_URL ?? new URL(ctx.c.req.url).origin
          const resetUrl = `${baseUrl}/admin/reset?token=${token}`
          await sendPasswordResetEmail(user.email, resetUrl)
        }
      } catch {
        // Swallow: the response must not vary based on internal failures.
      }

      return { ok: true }
    }),

  resetPassword: publicProcedure
    .input(z.object({ token: z.string().min(1), password: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const tokenHash = hashResetToken(input.token)
      const reset = await ctx.db.passwordReset.findUnique({ where: { tokenHash } })
      const invalid =
        !reset || reset.usedAt != null || reset.expiresAt.getTime() <= Date.now()
      if (invalid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This reset link is invalid or has expired.',
        })
      }

      const passwordHash = await hashPassword(input.password)
      await ctx.db.adminUser.update({
        where: { id: reset.userId },
        data: { passwordHash },
      })
      await ctx.db.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      })
      await ctx.db.session.deleteMany({ where: { userId: reset.userId } })

      return { ok: true }
    }),
})
