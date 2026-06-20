// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'
import { hashPassword } from '../auth/password'

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
    const c = { header: vi.fn() } as never
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
    const c = { header: vi.fn() } as never
    const caller = appRouter.createCaller({ db, c, user: null })
    const res = await caller.auth.login({ email: 'a@b.c', password: 'rightpass' })
    expect(res).toEqual({ id: 'u1', email: 'a@b.c' })
    expect(create).toHaveBeenCalled()
  })
})
