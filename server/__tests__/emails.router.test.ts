// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

function caller(db: unknown, user: { id: string; email: string } | null = null) {
  return appRouter.createCaller({ db: db as never, c: {} as never, user, resHeaders: new Headers() })
}

describe('emails router', () => {
  it('subscribe stores a new email (public)', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'e1' })
    const db = { emailSignup: { create } }
    const res = await caller(db).emails.subscribe({ email: 'a@b.co' })
    expect(res).toEqual({ ok: true })
    expect(create).toHaveBeenCalledWith({ data: { email: 'a@b.co' } })
  })
  it('subscribe is idempotent on duplicates', async () => {
    const create = vi.fn().mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }))
    const res = await caller({ emailSignup: { create } }).emails.subscribe({ email: 'a@b.co' })
    expect(res).toEqual({ ok: true })
  })
  it('list requires auth', async () => {
    await expect(caller({}, null).emails.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
  it('list returns signups for an owner', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'e1', email: 'a@b.co', createdAt: new Date() }])
    const res = await caller({ emailSignup: { findMany } }, { id: 'u', email: 'o@p.co' }).emails.list()
    expect(res).toHaveLength(1)
  })
})
