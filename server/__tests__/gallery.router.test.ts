// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

const authed = { db: undefined as never, c: {} as never, user: { id: 'u1', email: 'a@b.c' } }

function withDb(db: unknown) {
  return appRouter.createCaller({ ...authed, db: db as never })
}

describe('gallery router', () => {
  it('rejects unauthenticated callers on list', async () => {
    const caller = appRouter.createCaller({ db: {} as never, c: {} as never, user: null })
    await expect(caller.gallery.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('listPublic returns id/url/caption only ordered by sortOrder', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'a', url: '/a.jpg', caption: 'A', sortOrder: 0, createdAt: new Date() },
      { id: 'b', url: '/b.jpg', caption: 'B', sortOrder: 1, createdAt: new Date() },
    ])
    const caller = appRouter.createCaller({ db: { galleryImage: { findMany } } as never, c: {} as never, user: null })
    const res = await caller.gallery.listPublic()
    expect(findMany).toHaveBeenCalledWith({ orderBy: { sortOrder: 'asc' } })
    expect(res).toEqual([
      { id: 'a', url: '/a.jpg', caption: 'A' },
      { id: 'b', url: '/b.jpg', caption: 'B' },
    ])
    // no createdAt or sortOrder in public output
    expect(Object.keys(res[0])).toStrictEqual(['id', 'url', 'caption'])
  })

  it('create assigns sortOrder as max + 1', async () => {
    const aggregate = vi.fn().mockResolvedValue({ _max: { sortOrder: 2 } })
    const create = vi.fn().mockResolvedValue({ id: 'new', url: '/x.jpg', caption: '', sortOrder: 3 })
    const res = await withDb({ galleryImage: { aggregate, create } }).gallery.create({ url: '/x.jpg', caption: '' })
    expect(aggregate).toHaveBeenCalledWith({ _max: { sortOrder: true } })
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ url: '/x.jpg', sortOrder: 3 }) })
    expect(res.id).toBe('new')
  })

  it('create assigns sortOrder 0 when table is empty', async () => {
    const aggregate = vi.fn().mockResolvedValue({ _max: { sortOrder: null } })
    const create = vi.fn().mockResolvedValue({ id: 'first', url: '/y.jpg', caption: '', sortOrder: 0 })
    await withDb({ galleryImage: { aggregate, create } }).gallery.create({ url: '/y.jpg' })
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ sortOrder: 0 }) })
  })

  it('reorder sets sortOrder by array index in a transaction', async () => {
    const update = vi.fn().mockResolvedValue({})
    const $transaction = vi.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
    await withDb({ galleryImage: { update }, $transaction }).gallery.reorder({ ids: ['x', 'y', 'z'] })
    expect($transaction).toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({ where: { id: 'x' }, data: { sortOrder: 0 } })
    expect(update).toHaveBeenCalledWith({ where: { id: 'y' }, data: { sortOrder: 1 } })
    expect(update).toHaveBeenCalledWith({ where: { id: 'z' }, data: { sortOrder: 2 } })
  })

  it('listPublic orders by sortOrder ascending', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const caller = appRouter.createCaller({ db: { galleryImage: { findMany } } as never, c: {} as never, user: null })
    await caller.gallery.listPublic()
    expect(findMany).toHaveBeenCalledWith({ orderBy: { sortOrder: 'asc' } })
  })
})
