import { describe, it, expect } from 'vitest'
import { content } from '../content'

describe('content', () => {
  it('exposes core brand fields', () => {
    expect(content.brandName).toBe('PBV')
    expect(content.delivery.area).toMatch(/Airport West/i)
    expect(content.delivery.hours).toMatch(/5.*9/)
  })
  it('has at least 3 menu items', () => {
    expect(content.menu.length).toBeGreaterThanOrEqual(3)
  })
  it('defines an Uber Eats url field', () => {
    expect(typeof content.uberEatsUrl).toBe('string')
  })
})
