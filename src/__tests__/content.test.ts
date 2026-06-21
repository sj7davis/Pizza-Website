import { describe, it, expect } from 'vitest'
import { content } from '../content'

describe('content', () => {
  it('exposes core brand fields', () => {
    expect(content.brandName).toBe('PBB')
    expect(content.delivery.area).toMatch(/Airport West/i)
    expect(content.delivery.hours).toMatch(/5.*9/)
  })
  it('has at least 3 menu items, each with a tagline and extended description', () => {
    expect(content.menu.length).toBeGreaterThanOrEqual(3)
    for (const item of content.menu) {
      expect(item.tagline.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(20)
    }
  })
  it('tells the Backhaus heritage story', () => {
    expect(content.story.heading.length).toBeGreaterThan(0)
    expect(content.story.paragraphs.length).toBeGreaterThanOrEqual(1)
    expect(content.story.paragraphs.join(' ')).toMatch(/Backhaus/)
    expect(content.story.pullquote.length).toBeGreaterThan(0)
  })
  it('has at least one order link', () => {
    expect(content.orderLinks.length).toBeGreaterThanOrEqual(1)
    expect(content.orderLinks[0].url.length).toBeGreaterThan(0)
  })
  it('defines open/close hours and a timezone', () => {
    expect(content.openTime).toMatch(/^\d{2}:\d{2}$/)
    expect(content.closeTime).toMatch(/^\d{2}:\d{2}$/)
    expect(content.timezone.length).toBeGreaterThan(0)
  })
})
