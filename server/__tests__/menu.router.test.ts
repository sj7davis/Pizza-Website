// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

const authed = { db: undefined as never, c: {} as never, user: { id: 'u1', email: 'a@b.c' } }

function withDb(db: unknown) {
  return appRouter.createCaller({ ...authed, db: db as never })
}

describe('menu router', () => {
  it('rejects unauthenticated callers', async () => {
    const caller = appRouter.createCaller({ db: {} as never, c: {} as never, user: null })
    await expect(caller.menu.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('list returns all items ordered', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: '1', name: 'Margherita' }])
    const res = await withDb({ menuItem: { findMany } }).menu.list()
    expect(res).toHaveLength(1)
    expect(findMany).toHaveBeenCalledWith({ orderBy: { sortOrder: 'asc' } })
  })

  it('create inserts a new item', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'new' })
    const res = await withDb({ menuItem: { create } }).menu.create({
      name: 'Capricciosa', tagline: 'four corners', description: 'ham, mushroom, artichoke, olive', price: '$28',
    })
    expect(res).toEqual({ id: 'new' })
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: 'Capricciosa', price: '$28' }) })
  })

  it('create round-trips featured flag', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'feat' })
    await withDb({ menuItem: { create } }).menu.create({
      name: 'Nduja', tagline: 'heat', description: 'spicy', price: '$26', featured: true,
    })
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ featured: true }) })
  })

  it('update writes the provided fields by id', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'x' })
    await withDb({ menuItem: { update } }).menu.update({ id: 'x', price: '$30' })
    expect(update).toHaveBeenCalledWith({ where: { id: 'x' }, data: expect.objectContaining({ price: '$30' }) })
  })

  it('update round-trips featured flag', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'x' })
    await withDb({ menuItem: { update } }).menu.update({ id: 'x', featured: true })
    expect(update).toHaveBeenCalledWith({ where: { id: 'x' }, data: { featured: true } })
  })

  it('delete removes by id', async () => {
    const del = vi.fn().mockResolvedValue({ id: 'x' })
    await withDb({ menuItem: { delete: del } }).menu.delete({ id: 'x' })
    expect(del).toHaveBeenCalledWith({ where: { id: 'x' } })
  })

  it('reorder sets sortOrder by array position in a transaction', async () => {
    const update = vi.fn().mockResolvedValue({})
    const $transaction = vi.fn().mockImplementation((ops) => Promise.all(ops))
    await withDb({ menuItem: { update }, $transaction }).menu.reorder({ ids: ['a', 'b'] })
    expect($transaction).toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { sortOrder: 0 } })
    expect(update).toHaveBeenCalledWith({ where: { id: 'b' }, data: { sortOrder: 1 } })
  })
})
