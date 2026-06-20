// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

function makeDb() {
  return {
    siteContent: {
      findUnique: vi.fn().mockResolvedValue({
        brandName: 'PBV', tagline: 'tag', uberEatsUrl: '#',
        storyEyebrow: 'Our story', storyHeading: 'h', storyParagraphs: ['p1'],
        storyPullquote: 'q', storyEstablished: 'est',
        deliveryArea: 'Airport West', deliveryHours: '5-9pm',
        socials: [{ label: 'Instagram', href: '#ig' }],
      }),
    },
    menuItem: {
      findMany: vi.fn().mockResolvedValue([
        { name: 'Margherita', tagline: 't', description: 'd', price: '$22', image: null },
      ]),
    },
  }
}

describe('content.get', () => {
  it('returns mapped site content and queries only available items in order', async () => {
    const db = makeDb()
    const caller = appRouter.createCaller({ db: db as never })
    const res = await caller.content.get()
    expect(res.siteContent.brandName).toBe('PBV')
    expect(res.siteContent.menu).toHaveLength(1)
    expect(db.menuItem.findMany).toHaveBeenCalledWith({
      where: { available: true },
      orderBy: { sortOrder: 'asc' },
    })
  })

  it('throws if site content is not seeded', async () => {
    const db = makeDb()
    db.siteContent.findUnique.mockResolvedValueOnce(null)
    const caller = appRouter.createCaller({ db: db as never })
    await expect(caller.content.get()).rejects.toThrow(/not seeded/)
  })
})
