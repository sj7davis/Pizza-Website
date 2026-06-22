// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { rowToMenuItem, rowsToSiteContent } from '../mappers'

describe('mappers', () => {
  it('rowToMenuItem omits image when null', () => {
    const item = rowToMenuItem({ name: 'Margherita', tagline: 't', description: 'd', price: '$22', image: null, tags: [], featured: false })
    expect(item).toEqual({ name: 'Margherita', tagline: 't', description: 'd', price: '$22' })
    expect('image' in item).toBe(false)
    expect('featured' in item).toBe(false)
  })

  it('rowToMenuItem keeps image when present', () => {
    const item = rowToMenuItem({ name: 'X', tagline: 't', description: 'd', price: '$1', image: '/u/p.jpg', tags: [], featured: false })
    expect(item.image).toBe('/u/p.jpg')
  })

  it('rowToMenuItem includes tags when present', () => {
    const item = rowToMenuItem({ name: 'X', tagline: 't', description: 'd', price: '$1', image: null, tags: ['V'], featured: false })
    expect(item.tags).toEqual(['V'])
  })

  it('rowToMenuItem sets featured when true and omits it when false', () => {
    const featured = rowToMenuItem({ name: 'X', tagline: 't', description: 'd', price: '$1', image: null, tags: [], featured: true })
    expect(featured.featured).toBe(true)
    const plain = rowToMenuItem({ name: 'Y', tagline: 't', description: 'd', price: '$1', image: null, tags: [], featured: false })
    expect('featured' in plain).toBe(false)
  })

  it('rowsToSiteContent assembles story + delivery + socials', () => {
    const site = rowsToSiteContent(
      {
        brandName: 'PBV', tagline: 'tag',
        orderLinks: [{ label: 'Uber Eats', url: '#' }],
        openTime: '17:00', closeTime: '21:00', timezone: 'UTC', soldOut: false, soldOutMessage: 'x',
        storyEyebrow: 'Our story', storyHeading: 'h', storyParagraphs: ['p1', 'p2'],
        storyPullquote: 'q', storyEstablished: 'est',
        deliveryArea: 'Airport West', deliveryHours: '5-9pm',
        socials: [{ label: 'Instagram', href: '#ig' }],
        deliverySuburbs: ['Airport West'],
        heroImage: '/dough.jpg',
        promoActive: false, promoText: '', promoCode: '',
      },
      [{ name: 'Margherita', tagline: 't', description: 'd', price: '$22', image: null, tags: [], featured: false }],
    )
    expect(site.story.paragraphs).toEqual(['p1', 'p2'])
    expect(site.delivery).toEqual({ area: 'Airport West', hours: '5-9pm' })
    expect(site.socials[0]).toEqual({ label: 'Instagram', href: '#ig' })
    expect(site.menu).toHaveLength(1)
  })

  it('rowsToSiteContent includes promo fields', () => {
    const site = rowsToSiteContent(
      {
        brandName: 'PBV', tagline: 'tag',
        orderLinks: [{ label: 'Uber Eats', url: '#' }],
        openTime: '17:00', closeTime: '21:00', timezone: 'UTC', soldOut: false, soldOutMessage: 'x',
        storyEyebrow: 'e', storyHeading: 'h', storyParagraphs: ['p'],
        storyPullquote: 'q', storyEstablished: 'est',
        deliveryArea: 'Airport West', deliveryHours: '5-9pm',
        socials: [], deliverySuburbs: [], heroImage: '/dough.jpg',
        promoActive: true, promoText: 'Free delivery!', promoCode: 'FIRSTBITE',
      },
      [],
    )
    expect(site.promoActive).toBe(true)
    expect(site.promoText).toBe('Free delivery!')
    expect(site.promoCode).toBe('FIRSTBITE')
  })
})
