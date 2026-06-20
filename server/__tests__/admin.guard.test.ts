// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { router, adminProcedure } from '../trpc/trpc'

const probe = router({
  secret: adminProcedure.query(({ ctx }) => ctx.user.email),
})

function caller(user: { id: string; email: string } | null) {
  return probe.createCaller({ db: {} as never, c: {} as never, user })
}

describe('adminProcedure', () => {
  it('rejects when there is no user', async () => {
    await expect(caller(null).secret()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
  it('passes through and exposes the user when authenticated', async () => {
    const email = await caller({ id: 'u1', email: 'owner@pbv.co' }).secret()
    expect(email).toBe('owner@pbv.co')
  })
})
