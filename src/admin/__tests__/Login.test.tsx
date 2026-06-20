import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const loginMutate = vi.fn()
vi.mock('../../lib/trpc', () => ({
  trpc: { auth: { login: { useMutation: () => ({ mutateAsync: loginMutate, isPending: false }) } } },
}))

import { Login } from '../Login'

beforeEach(() => loginMutate.mockReset())

describe('Login', () => {
  it('submits the entered credentials and calls onSuccess', async () => {
    loginMutate.mockResolvedValue({ id: 'u1', email: 'owner@pbv.co' })
    const onSuccess = vi.fn()
    render(<Login onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@pbv.co' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(loginMutate).toHaveBeenCalledWith({ email: 'owner@pbv.co', password: 'pw' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('shows an error when login fails', async () => {
    loginMutate.mockRejectedValue(new Error('bad'))
    render(<Login onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'x@y.co' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'no' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i)
  })
})
