import { describe, it, expect } from 'vitest'
import { pickContent } from '../useContent'
import { content as fallback } from '../../content'

describe('pickContent', () => {
  it('returns the bundled fallback when there is no live data', () => {
    expect(pickContent(undefined, fallback)).toBe(fallback)
  })
  it('returns live site content when present', () => {
    const live = { siteContent: { ...fallback, brandName: 'LIVE' } }
    expect(pickContent(live, fallback).brandName).toBe('LIVE')
  })
})
