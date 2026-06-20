import { describe, it, expect } from 'vitest'
import { content } from '../content'

describe('content', () => {
  it('exposes core brand fields', () => {
    expect(content.brandName).toBe('PBV')
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
  it('defines an Uber Eats url field', () => {
    expect(typeof content.uberEatsUrl).toBe('string')
  })
})
