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

  it('remove refuses to delete the last owner', async () => {
    const db = { adminUser: { count: vi.fn().mockResolvedValue(1), delete: vi.fn() } }
    await expect(caller(db).owners.remove({ id: 'u1' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
})
