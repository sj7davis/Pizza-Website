import { describe, it, expect } from 'vitest'
import type { SiteContent, MenuItem } from '../types'

describe('types', () => {
  it('a valid content object satisfies SiteContent', () => {
    const item: MenuItem = { name: 'X', description: 'Y', price: '$0' }
    const sample: SiteContent = {
      brandName: 'PBV',
      tagline: 't',
      uberEatsUrl: '#',
      story: { heading: 'h', body: 'b' },
      menu: [item],
      delivery: { area: 'a', hours: 'h' },
      socials: [{ label: 'IG', href: '#' }],
    }
    expect(sample.menu[0].name).toBe('X')
  })
})
