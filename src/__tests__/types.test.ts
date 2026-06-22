import { describe, it, expect } from 'vitest'
import type { SiteContent, MenuItem, BrandStory } from '../types'

describe('types', () => {
  it('a valid content object satisfies SiteContent', () => {
    const item: MenuItem = { name: 'X', tagline: 'hook', description: 'Y', price: '$0' }
    const story: BrandStory = {
      eyebrow: 'Our story',
      heading: 'h',
      paragraphs: ['p1'],
      pullquote: 'q',
      established: 'est',
    }
    const sample: SiteContent = {
      brandName: 'PBV',
      tagline: 't',
      orderLinks: [{ label: 'Uber Eats', url: '#' }],
      openTime: '17:00', closeTime: '21:00', timezone: 'UTC', soldOut: false, soldOutMessage: 'x',
      story,
      menu: [item],
      delivery: { area: 'a', hours: 'h' },
      socials: [{ label: 'IG', href: '#' }],
      deliverySuburbs: [],
      heroImage: '/dough.jpg',
      promoActive: false,
      promoText: '',
      promoCode: '',
    }
    expect(sample.menu[0].name).toBe('X')
    expect(sample.story.paragraphs).toHaveLength(1)
  })
})
