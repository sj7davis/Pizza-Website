// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

const validInput = {
  brandName: 'PBV', tagline: 'tag',
  orderLinks: [{ label: 'Uber Eats', url: 'https://ubereats.com/pbv' }],
  openTime: '17:00', closeTime: '21:00', timezone: 'UTC', soldOut: false, soldOutMessage: 'x',
  story: { eyebrow: 'Our story', heading: 'h', paragraphs: ['p1', 'p2'], pullquote: 'q', established: 'est' },
  delivery: { area: 'Airport West', hours: '5-9pm' },
  socials: [{ label: 'Instagram', href: '#ig' }],
  deliverySuburbs: ['Airport West'],
  heroImage: '/dough.jpg',
}

function caller(db: unknown, user: { id: string; email: string } | null = { id: 'u1', email: 'a@b.c' }) {
  return appRouter.createCaller({ db: db as never, c: {} as never, user })
}

describe('site router', () => {
  it('rejects unauthenticated update', async () => {
    await expect(caller({}, null).site.update(validInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('update upserts the singleton with flattened columns', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 1 })
    await caller({ siteContent: { upsert } }).site.update(validInput)
    const arg = upsert.mock.calls[0][0]
    expect(arg.where).toEqual({ id: 1 })
    expect(arg.create.storyParagraphs).toEqual(['p1', 'p2'])
    expect(arg.create.deliveryArea).toBe('Airport West')
    expect(arg.create.orderLinks).toEqual([{ label: 'Uber Eats', url: 'https://ubereats.com/pbv' }])
    expect(arg.update.storyHeading).toBe('h')
  })

  it('rejects invalid input (empty brandName)', async () => {
    await expect(
      caller({ siteContent: { upsert: vi.fn() } }).site.update({ ...validInput, brandName: '' }),
    ).rejects.toThrow()
  })
})
