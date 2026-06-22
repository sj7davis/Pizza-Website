import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../lib/trpc', () => ({
  trpc: {
    analytics: { summary: { useQuery: () => ({ data: { total: 5, byPlatform: [{ platform: 'Uber Eats', count: 5 }] }, isLoading: false }) } },
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
})
