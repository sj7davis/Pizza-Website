// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'
import { hashPassword } from '../auth/password'
import { hashResetToken } from '../auth/resetToken'
import { resetRateLimits } from '../auth/rateLimit'

vi.mock('../email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}))
import { sendPasswordResetEmail } from '../email'

describe('auth router', () => {
  it('me returns null when unauthenticated', async () => {
    const caller = appRouter.createCaller({ db: {} as never, c: {} as never, user: null })
    expect(await caller.auth.me()).toBeNull()
  })

  it('me returns the user when authenticated', async () => {
    const caller = appRouter.createCaller({ db: {} as never, c: {} as never, user: { id: 'u1', email: 'a@b.c' } })
    expect(await caller.auth.me()).toEqual({ id: 'u1', email: 'a@b.c' })
  })

  it('login rejects bad credentials', async () => {
    const db = { adminUser: { findUnique: vi.fn().mockResolvedValue(null) } } as never
    const c = { header: vi.fn(), req: { header: vi.fn() } } as never
    const caller = appRouter.createCaller({ db, c, user: null })
    await expect(caller.auth.login({ email: 'x@y.z', password: 'bad' }))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('login succeeds with a correct password and creates a session', async () => {
    const passwordHash = await hashPassword('rightpass')
    const create = vi.fn().mockResolvedValue({ id: 'sess_1' })
    const db = {
      adminUser: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.c', passwordHash }) },
      session: { create },
    } as never
    const c = { header: vi.fn(), req: { header: vi.fn() } } as never
    const resHeaders = new Headers()
    const caller = appRouter.createCaller({ db, c, user: null, resHeaders })
    const res = await caller.auth.login({ email: 'a@b.c', password: 'rightpass' })
    expect(res).toEqual({ id: 'u1', email: 'a@b.c' })
    expect(create).toHaveBeenCalled()
    // The session cookie must actually be written to the response headers.
    expect(resHeaders.get('Set-Cookie')).toMatch(/pbv_session=sess_1/)
  })

  it('login normalizes a mixed-case email before lookup (case-insensitive login)', async () => {
    const passwordHash = await hashPassword('rightpass')
    const findUnique = vi.fn().mockResolvedValue({ id: 'u1', email: 'scott.davis@x.com', passwordHash })
    const db = {
      adminUser: { findUnique },
      session: { create: vi.fn().mockResolvedValue({ id: 'sess_1' }) },
    } as never
    const c = { header: vi.fn(), req: { header: vi.fn() } } as never
    const resHeaders = new Headers()
    const caller = appRouter.createCaller({ db, c, user: null, resHeaders })
    await caller.auth.login({ email: 'Scott.Davis@X.com', password: 'rightpass' })
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'scott.davis@x.com' } })
  })

  describe('requestPasswordReset', () => {
    it('returns { ok: true } for an unknown email without throwing or sending mail', async () => {
      resetRateLimits()
      const db = {
        adminUser: { findUnique: vi.fn().mockResolvedValue(null) },
        passwordReset: { deleteMany: vi.fn(), create: vi.fn() },
      } as never
      const c = { header: vi.fn(), req: { header: vi.fn(), url: 'http://localhost/api/trpc' } } as never
      const caller = appRouter.createCaller({ db, c, user: null })
      const res = await caller.auth.requestPasswordReset({ email: 'nobody@x.com' })
      expect(res).toEqual({ ok: true })
      expect(sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('for a known email creates a reset row and sends the email, still returning { ok: true }', async () => {
      resetRateLimits()
      const deleteMany = vi.fn()
      const create = vi.fn().mockResolvedValue({ id: 'pr_1' })
      const db = {
        adminUser: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'owner@pbv.co' }) },
        passwordReset: { deleteMany, create },
      } as never
      const c = { header: vi.fn(), req: { header: vi.fn(), url: 'http://localhost/api/trpc' } } as never
      const caller = appRouter.createCaller({ db, c, user: null })
      const res = await caller.auth.requestPasswordReset({ email: 'owner@pbv.co' })
      expect(res).toEqual({ ok: true }) // identical shape to the unknown-email case: no enumeration
      expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', usedAt: null } })
      expect(create).toHaveBeenCalled()
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('owner@pbv.co', expect.stringContaining('/admin/reset?token='))
    })
  })

  describe('resetPassword', () => {
    it('updates the passwordHash, marks the reset used, and clears sessions for a valid token', async () => {
      const tokenHash = hashResetToken('sometoken')
      const update = vi.fn()
      const resetUpdate = vi.fn()
      const sessionDeleteMany = vi.fn()
      const db = {
        passwordReset: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'pr_1',
            userId: 'u1',
            tokenHash,
            usedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
          }),
          update: resetUpdate,
        },
        adminUser: { update },
        session: { deleteMany: sessionDeleteMany },
      } as never
      const c = { header: vi.fn(), req: { header: vi.fn() } } as never
      const caller = appRouter.createCaller({ db, c, user: null })
      const res = await caller.auth.resetPassword({ token: 'sometoken', password: 'newpassword123' })
      expect(res).toEqual({ ok: true })
      expect(update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { passwordHash: expect.any(String) } })
      expect(resetUpdate).toHaveBeenCalledWith({ where: { id: 'pr_1' }, data: { usedAt: expect.any(Date) } })
      expect(sessionDeleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    })

    it('throws BAD_REQUEST for an unknown token', async () => {
      const db = { passwordReset: { findUnique: vi.fn().mockResolvedValue(null) } } as never
      const c = { header: vi.fn(), req: { header: vi.fn() } } as never
      const caller = appRouter.createCaller({ db, c, user: null })
      await expect(caller.auth.resetPassword({ token: 'nope', password: 'newpassword123' }))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('throws BAD_REQUEST for an already-used token', async () => {
      const db = {
        passwordReset: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'pr_1',
            userId: 'u1',
            tokenHash: hashResetToken('used'),
            usedAt: new Date(),
            expiresAt: new Date(Date.now() + 60_000),
          }),
        },
      } as never
      const c = { header: vi.fn(), req: { header: vi.fn() } } as never
      const caller = appRouter.createCaller({ db, c, user: null })
      await expect(caller.auth.resetPassword({ token: 'used', password: 'newpassword123' }))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })

    it('throws BAD_REQUEST for an expired token', async () => {
      const db = {
        passwordReset: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'pr_1',
            userId: 'u1',
            tokenHash: hashResetToken('expired'),
            usedAt: null,
            expiresAt: new Date(Date.now() - 1000),
          }),
        },
      } as never
      const c = { header: vi.fn(), req: { header: vi.fn() } } as never
      const caller = appRouter.createCaller({ db, c, user: null })
      await expect(caller.auth.resetPassword({ token: 'expired', password: 'newpassword123' }))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' })
    })
  })
})
