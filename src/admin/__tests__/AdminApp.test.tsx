import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const meState = { data: undefined as unknown, isLoading: false }
vi.mock('../../lib/trpc', () => ({
  trpc: {
    auth: {
      me: { useQuery: () => meState },
      login: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      logout: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      requestPasswordReset: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      resetPassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() } } }),
  },
}))
vi.mock('../Dashboard', () => ({ Dashboard: () => <div>DASHBOARD</div> }))

import { AdminApp } from '../AdminApp'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminApp />
    </MemoryRouter>,
  )
}

describe('AdminApp', () => {
  it('shows Login when signed out', () => {
    meState.data = null
    meState.isLoading = false
    renderAt('/')
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
  it('shows the Dashboard when signed in', () => {
    meState.data = { id: 'u1', email: 'owner@pbv.co' }
    meState.isLoading = false
    renderAt('/')
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
  })
  it('shows the reset password page without a session', () => {
    meState.data = null
    meState.isLoading = false
    renderAt('/reset?token=abc123')
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument()
  })
})
