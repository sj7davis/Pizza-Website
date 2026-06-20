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
      uberEatsUrl: '#',
      story,
      menu: [item],
      delivery: { area: 'a', hours: 'h' },
      socials: [{ label: 'IG', href: '#' }],
    }
    expect(sample.menu[0].name).toBe('X')
    expect(sample.story.paragraphs).toHaveLength(1)
  })
})
