import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

type MutationOpts = { onSuccess?: () => void; onError?: () => void }
let capturedOpts: MutationOpts = {}
const mutate = vi.fn()

vi.mock('../../lib/trpc', () => ({
  trpc: {
    auth: {
      login: {
        useMutation: (opts: MutationOpts) => {
          capturedOpts = opts ?? {}
          return { mutate, isPending: false }
        },
      },
    },
  },
}))

import { Login } from '../Login'

beforeEach(() => {
  mutate.mockReset()
  capturedOpts = {}
})

describe('Login', () => {
  it('submits the entered credentials and calls onSuccess on success', () => {
    const onSuccess = vi.fn()
    render(<Login onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@pbv.co' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(mutate).toHaveBeenCalledWith({ email: 'owner@pbv.co', password: 'pw' })
    act(() => capturedOpts.onSuccess?.())
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows an error when login fails', () => {
    render(<Login onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'x@y.co' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'no' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    act(() => capturedOpts.onError?.())
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid/i)
  })
})
