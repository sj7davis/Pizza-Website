import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

type MutationOpts<TErr = { message?: string }> = { onSuccess?: () => void; onError?: (err: TErr) => void }
let capturedLoginOpts: MutationOpts = {}
let capturedForgotOpts: MutationOpts = {}
const loginMutate = vi.fn()
const forgotMutate = vi.fn()

vi.mock('../../lib/trpc', () => ({
  trpc: {
    auth: {
      login: {
        useMutation: (opts: MutationOpts) => {
          capturedLoginOpts = opts ?? {}
          return { mutate: loginMutate, isPending: false }
        },
      },
      requestPasswordReset: {
        useMutation: (opts: MutationOpts) => {
          capturedForgotOpts = opts ?? {}
          return { mutate: forgotMutate, isPending: false }
        },
      },
    },
  },
}))

import { Login } from '../Login'

beforeEach(() => {
  loginMutate.mockReset()
  forgotMutate.mockReset()
  capturedLoginOpts = {}
  capturedForgotOpts = {}
})

describe('Login', () => {
  it('submits the entered credentials and calls onSuccess on success', () => {
    const onSuccess = vi.fn()
    render(<Login onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@pbv.co' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(loginMutate).toHaveBeenCalledWith({ email: 'owner@pbv.co', password: 'pw' })
    act(() => capturedLoginOpts.onSuccess?.())
    expect(onSuccess).toHaveBeenCalled()
  })

  it('normalizes a mixed-case email with surrounding whitespace before submitting', () => {
    render(<Login onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: '  Scott.Davis@X.com  ' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: '  pw  ' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(loginMutate).toHaveBeenCalledWith({ email: 'scott.davis@x.com', password: 'pw' })
  })

  it('shows a generic error when login fails without a server message', () => {
    render(<Login onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'x@y.co' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'no' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    act(() => capturedLoginOpts.onError?.({}))
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i)
  })

  it('surfaces the real server error message (e.g. rate limiting) instead of masking it', () => {
    render(<Login onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'x@y.co' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'no' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    act(() => capturedLoginOpts.onError?.({ message: 'Too many attempts. Try again in 30s.' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/too many attempts/i)
  })

  it('reveals a forgot-password form and always shows the same confirmation message', () => {
    render(<Login onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    const emailInputs = screen.getAllByLabelText(/email/i)
    fireEvent.change(emailInputs[emailInputs.length - 1], {
      target: { value: 'owner@pbv.co' },
    })
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(forgotMutate).toHaveBeenCalledWith({ email: 'owner@pbv.co' })
    act(() => capturedForgotOpts.onSuccess?.())
    expect(screen.getByRole('status')).toHaveTextContent(/if that email is registered/i)
  })

  it('shows the same confirmation message even when the reset request errors', () => {
    render(<Login onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    act(() => capturedForgotOpts.onError?.({}))
    expect(screen.getByRole('status')).toHaveTextContent(/if that email is registered/i)
  })
})
