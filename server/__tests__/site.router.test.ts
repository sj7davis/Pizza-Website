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
  heroBlocks: [{ id: 'b1', type: 'heading' as const, value: 'PBV' }],
  promoActive: false, promoText: '', promoCode: '',
  theme: 'editorial-dark' as const,
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

  it('update round-trips heroBlocks', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 1 })
    const heroBlocks = [
      { id: 'b1', type: 'eyebrow' as const, value: 'Eyebrow text' },
      { id: 'b2', type: 'heading' as const, value: 'PBV' },
      { id: 'b3', type: 'image' as const, url: '/pic.jpg', alt: 'A pizza', width: 'md' as const },
    ]
    await caller({ siteContent: { upsert } }).site.update({ ...validInput, heroBlocks })
    const arg = upsert.mock.calls[0][0]
    expect(arg.create.heroBlocks).toEqual(heroBlocks)
    expect(arg.update.heroBlocks).toEqual(heroBlocks)
  })

  it('update round-trips heroCanvas', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 1 })
    const heroCanvas = {
      enabled: true,
      desktopHeight: 600,
      mobileHeight: 640,
      elements: [
        {
          id: 'e1',
          type: 'heading' as const,
          value: 'PBV',
          desktop: { x: 10, y: 10, w: 60, align: 'left' as const, fontSize: 48 },
          mobile: { x: 5, y: 5, w: 90, align: 'center' as const, fontSize: 32 },
        },
      ],
    }
    await caller({ siteContent: { upsert } }).site.update({ ...validInput, heroCanvas })
    const arg = upsert.mock.calls[0][0]
    expect(arg.create.heroCanvas).toEqual(heroCanvas)
    expect(arg.update.heroCanvas).toEqual(heroCanvas)
  })

  it('defaults heroCanvas to disabled/empty when omitted', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 1 })
    await caller({ siteContent: { upsert } }).site.update(validInput)
    const arg = upsert.mock.calls[0][0]
    expect(arg.create.heroCanvas).toEqual({ enabled: false, desktopHeight: 560, mobileHeight: 620, elements: [] })
  })

  it('rejects invalid input (empty brandName)', async () => {
    await expect(
      caller({ siteContent: { upsert: vi.fn() } }).site.update({ ...validInput, brandName: '' }),
    ).rejects.toThrow()
  })

  it('update round-trips promo fields', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 1 })
    await caller({ siteContent: { upsert } }).site.update({
      ...validInput,
      promoActive: true, promoText: 'Free delivery this weekend!', promoCode: 'FIRSTBITE',
    })
    const arg = upsert.mock.calls[0][0]
    expect(arg.create.promoActive).toBe(true)
    expect(arg.create.promoText).toBe('Free delivery this weekend!')
    expect(arg.create.promoCode).toBe('FIRSTBITE')
    expect(arg.update.promoActive).toBe(true)
  })

  it('update round-trips theme field', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 1 })
    await caller({ siteContent: { upsert } }).site.update({
      ...validInput,
      theme: 'bold-trattoria',
    })
    const arg = upsert.mock.calls[0][0]
    expect(arg.create.theme).toBe('bold-trattoria')
    expect(arg.update.theme).toBe('bold-trattoria')
  })

  it('rejects invalid theme value', async () => {
    await expect(
      caller({ siteContent: { upsert: vi.fn() } }).site.update({
        ...validInput,
        theme: 'neon-chaos' as never,
      }),
    ).rejects.toThrow()
  })
})
