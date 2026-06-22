import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const subscribe = vi.fn().mockResolvedValue({ ok: true })
vi.mock('../../lib/trpc', () => ({
  trpc: { emails: { subscribe: { useMutation: () => ({ mutateAsync: subscribe, isPending: false }) } } },
}))
import { EmailSignup } from '../EmailSignup'
beforeEach(() => subscribe.mockClear())

describe('EmailSignup', () => {
  it('submits the email and confirms', async () => {
    render(<EmailSignup />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.co' } })
    fireEvent.click(screen.getByRole('button', { name: /notify me|sign up|join/i }))
    await waitFor(() => expect(subscribe).toHaveBeenCalledWith({ email: 'a@b.co' }))
    expect(await screen.findByText(/thanks|you're on the list/i)).toBeInTheDocument()
  })
})
