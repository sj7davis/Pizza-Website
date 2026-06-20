// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { SESSION_COOKIE, SESSION_TTL_MS, createSession, findValidUser, deleteSession } from '../session'

describe('session', () => {
  it('exposes a cookie name and a positive TTL', () => {
    expect(SESSION_COOKIE).toBe('pbv_session')
    expect(SESSION_TTL_MS).toBeGreaterThan(0)
  })

  it('createSession stores a session with a future expiry and returns its id', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'sess_1' })
    const db = { session: { create } } as never
    const id = await createSession(db, 'user_1')
    expect(id).toBe('sess_1')
    const arg = create.mock.calls[0][0]
    expect(arg.data.userId).toBe('user_1')
    expect(arg.data.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('findValidUser returns the user for an unexpired session', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'sess_1', expiresAt: new Date(Date.now() + 10000), user: { id: 'u1', email: 'a@b.c' },
    })
    const db = { session: { findUnique } } as never
    const user = await findValidUser(db, 'sess_1')
    expect(user).toEqual({ id: 'u1', email: 'a@b.c' })
  })

  it('findValidUser returns null for an expired session', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'sess_1', expiresAt: new Date(Date.now() - 1000), user: { id: 'u1', email: 'a@b.c' },
    })
    const db = { session: { findUnique } } as never
    expect(await findValidUser(db, 'sess_1')).toBeNull()
  })

  it('findValidUser returns null when token is missing/unknown', async () => {
    const db = { session: { findUnique: vi.fn().mockResolvedValue(null) } } as never
    expect(await findValidUser(db, undefined)).toBeNull()
    expect(await findValidUser(db, 'nope')).toBeNull()
  })
})
