import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

type MutationOpts = { onSuccess?: () => void; onError?: (err: { message?: string }) => void }
let capturedOpts: MutationOpts = {}
const mutate = vi.fn()

vi.mock('../../lib/trpc', () => ({
  trpc: {
    auth: {
      resetPassword: {
        useMutation: (opts: MutationOpts) => {
          capturedOpts = opts ?? {}
          return { mutate, isPending: false }
        },
      },
    },
  },
}))

import { ResetPassword } from '../ResetPassword'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPassword />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mutate.mockReset()
  capturedOpts = {}
})

describe('ResetPassword', () => {
  it('shows an invalid-link message when there is no token in the URL', () => {
    renderAt('/admin/reset')
    expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument()
  })

  it('shows an error when the passwords do not match', () => {
    renderAt('/admin/reset?token=abc123')
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'different123' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/do not match/i)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('submits the token and password when they match', () => {
    renderAt('/admin/reset?token=abc123')
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(mutate).toHaveBeenCalledWith({ token: 'abc123', password: 'password123' })
  })

  it('shows a success message after the reset succeeds', () => {
    renderAt('/admin/reset?token=abc123')
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    act(() => capturedOpts.onSuccess?.())
    expect(screen.getByText(/you can now sign in/i)).toBeInTheDocument()
  })

  it('shows the server error message on failure', () => {
    renderAt('/admin/reset?token=abc123')
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    act(() => capturedOpts.onError?.({ message: 'This reset link is invalid or has expired.' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid or has expired/i)
  })
})
