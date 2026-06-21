import { describe, it, expect } from 'vitest'
import { computeOpenStatus } from '../openStatus'

const base = {
  openTime: '17:00',
  closeTime: '21:00',
  timezone: 'UTC',
  soldOut: false,
  soldOutMessage: 'Sold out tonight — back tomorrow at 5pm',
}

describe('computeOpenStatus', () => {
  it('is open inside the window', () => {
    const s = computeOpenStatus({ ...base, now: new Date('2026-06-21T18:30:00Z') })
    expect(s.state).toBe('open')
    expect(s.label).toMatch(/ordering till 9pm/i)
  })
  it('is closed before opening', () => {
    const s = computeOpenStatus({ ...base, now: new Date('2026-06-21T12:00:00Z') })
    expect(s.state).toBe('closed')
    expect(s.label).toMatch(/opens at 5pm/i)
  })
  it('is closed after closing', () => {
    const s = computeOpenStatus({ ...base, now: new Date('2026-06-21T22:00:00Z') })
    expect(s.state).toBe('closed')
    expect(s.label).toMatch(/opens at 5pm/i)
  })
  it('sold-out overrides open hours', () => {
    const s = computeOpenStatus({ ...base, soldOut: true, now: new Date('2026-06-21T18:30:00Z') })
    expect(s.state).toBe('soldout')
    expect(s.label).toBe(base.soldOutMessage)
  })
})
