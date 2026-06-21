import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const meState = { data: undefined as unknown, isLoading: false }
vi.mock('../../lib/trpc', () => ({
  trpc: {
    auth: { me: { useQuery: () => meState }, login: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }, logout: { useMutation: () => ({ mutateAsync: vi.fn() }) } },
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() } } }),
  },
}))
vi.mock('../Dashboard', () => ({ Dashboard: () => <div>DASHBOARD</div> }))

import { AdminApp } from '../AdminApp'

describe('AdminApp', () => {
  it('shows Login when signed out', () => {
    meState.data = null
    meState.isLoading = false
    render(<AdminApp />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
  it('shows the Dashboard when signed in', () => {
    meState.data = { id: 'u1', email: 'owner@pbv.co' }
    meState.isLoading = false
    render(<AdminApp />)
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
  })
})
