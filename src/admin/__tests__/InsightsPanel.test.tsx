import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const clicksByDayData = [
  { date: '2026-06-01', count: 0 },
  { date: '2026-06-02', count: 3 },
]

vi.mock('../../lib/trpc', () => ({
  trpc: {
    analytics: {
      summary: { useQuery: () => ({ data: { total: 5, byPlatform: [{ platform: 'Uber Eats', count: 5 }] }, isLoading: false }) },
      clicksByDay: { useQuery: () => ({ data: clicksByDayData, isLoading: false }) },
    },
    emails: { list: { useQuery: () => ({ data: [{ id: 'e1', email: 'a@b.co', createdAt: new Date().toISOString() }], isLoading: false }) } },
  },
}))
import { InsightsPanel } from '../InsightsPanel'

describe('InsightsPanel', () => {
  it('shows click totals and signups', () => {
    render(<InsightsPanel />)
    expect(screen.getAllByText(/5/).length).toBeGreaterThan(0)
    expect(screen.getByText('Uber Eats')).toBeInTheDocument()
    expect(screen.getByText('a@b.co')).toBeInTheDocument()
  })

  it('renders the clicks-over-time chart section', () => {
    render(<InsightsPanel />)
    expect(screen.getByText(/order clicks — last/i)).toBeInTheDocument()
  })

  it('renders a bar chart svg when data has non-zero counts', () => {
    const { container } = render(<InsightsPanel />)
    const svg = container.querySelector('svg[role="img"]')
    expect(svg).toBeTruthy()
  })

  it('shows day-range toggle buttons', () => {
    render(<InsightsPanel />)
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument()
  })
})
