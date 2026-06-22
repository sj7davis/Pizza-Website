import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// DeliveryChecker itself is pure (suburb match logic only), but its out-of-area
// branch renders EmailSignup, which calls trpc.emails.subscribe.useMutation().
// That hook needs a tRPC context provider to avoid throwing; mock it here so
// this test can stay focused on the pure suburb-matching behaviour.
vi.mock('../../lib/trpc', () => ({
  trpc: { emails: { subscribe: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) } } },
}))
import { DeliveryChecker } from '../DeliveryChecker'

const suburbs = ['Airport West', 'Niddrie', 'Essendon']

describe('DeliveryChecker', () => {
  it('confirms a covered suburb', () => {
    render(<DeliveryChecker suburbs={suburbs} />)
    fireEvent.change(screen.getByLabelText(/suburb/i), { target: { value: 'niddrie' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(/yes/i)).toBeInTheDocument()
  })
  it('shows an out-of-area message + signup for an uncovered suburb', () => {
    render(<DeliveryChecker suburbs={suburbs} />)
    fireEvent.change(screen.getByLabelText(/suburb/i), { target: { value: 'Fitzroy' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(/not yet|don.t deliver/i)).toBeInTheDocument()
  })
})
