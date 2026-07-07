// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'
import { hashPassword } from '../auth/password'

const user = { id: 'u1', email: 'owner@pbb.co' }
function caller(db: unknown, u: typeof user | null = user) {
  return appRouter.createCaller({ db: db as never, c: {} as never, user: u, resHeaders: new Headers() })
}

describe('owners router', () => {
  it('rejects unauthenticated', async () => {
    await expect(caller({}, null).owners.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('lists owners (id + email only)', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'u1', email: 'a@b.co' }])
    const res = await caller({ adminUser: { findMany } }).owners.list()
    expect(res).toEqual([{ id: 'u1', email: 'a@b.co' }])
    expect(findMany).toHaveBeenCalledWith({ select: { id: true, email: true }, orderBy: { createdAt: 'asc' } })
  })

  it('changePassword verifies the current password then updates', async () => {
    const passwordHash = await hashPassword('oldpass1')
    const update = vi.fn().mockResolvedValue({})
    const db = {
      adminUser: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', passwordHash }), update },
    }
    await caller(db).owners.changePassword({ currentPassword: 'oldpass1', newPassword: 'newpass123' })
    expect(update).toHaveBeenCalled()
    expect(update.mock.calls[0][0].where).toEqual({ id: 'u1' })
  })

  it('changePassword rejects a wrong current password', async () => {
    const passwordHash = await hashPassword('oldpass1')
    const db = { adminUser: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', passwordHash }), update: vi.fn() } }
    await expect(
      caller(db).owners.changePassword({ currentPassword: 'WRONG', newPassword: 'newpass123' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('resetPassword updates the target hash and clears their sessions', async () => {
    const update = vi.fn().mockResolvedValue({})
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 })
    const db = {
      adminUser: { findUnique: vi.fn().mockResolvedValue({ id: 'u2', email: 'staff@pbb.co' }), update },
      session: { deleteMany },
    }
    const res = await caller(db).owners.resetPassword({ id: 'u2', newPassword: 'freshpass1' })
    expect(res).toEqual({ ok: true })
    expect(update.mock.calls[0][0].where).toEqual({ id: 'u2' })
    expect(update.mock.calls[0][0].data.passwordHash).toBeTruthy()
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u2' } })
  })

  it('resetPassword rejects an unknown account', async () => {
    const db = { adminUser: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() }, session: { deleteMany: vi.fn() } }
    await expect(caller(db).owners.resetPassword({ id: 'gone', newPassword: 'freshpass1' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('remove refuses to delete the last owner', async () => {
    const db = { adminUser: { count: vi.fn().mockResolvedValue(1), delete: vi.fn() } }
    await expect(caller(db).owners.remove({ id: 'u1' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
})
