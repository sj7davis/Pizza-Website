import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const ownersList = { data: [{ id: 'u1', email: 'owner@pbb.co' }], isLoading: false }
const changePw = vi.fn().mockResolvedValue({ ok: true })
const addOwner = vi.fn().mockResolvedValue({ id: 'u2', email: 'new@pbb.co' })
const removeOwner = vi.fn().mockResolvedValue({ ok: true })
const resetPw = vi.fn().mockResolvedValue({ ok: true })
const invalidate = vi.fn()

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ owners: { list: { invalidate } } }),
    owners: {
      list: { useQuery: () => ownersList },
      changePassword: { useMutation: () => ({ mutateAsync: changePw, isPending: false }) },
      resetPassword: { useMutation: () => ({ mutateAsync: resetPw, isPending: false }) },
      add: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutateAsync: async (v: unknown) => { const r = await addOwner(v); o?.onSuccess?.(); return r }, isPending: false }) },
      remove: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutate: (v: unknown) => { removeOwner(v); o?.onSuccess?.() }, isPending: false }) },
    },
  },
}))

import { AccountPanel } from '../AccountPanel'

beforeEach(() => { changePw.mockClear(); addOwner.mockClear(); resetPw.mockClear() })

describe('AccountPanel', () => {
  it('lists owners', () => {
    render(<AccountPanel />)
    expect(screen.getByText('owner@pbb.co')).toBeInTheDocument()
  })
  it('changes password', async () => {
    render(<AccountPanel />)
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => expect(changePw).toHaveBeenCalledWith({ currentPassword: 'oldpass1', newPassword: 'newpass123' }))
  })
  it('adds an owner', async () => {
    render(<AccountPanel />)
    fireEvent.change(screen.getByLabelText(/new owner email/i), { target: { value: 'new@pbb.co' } })
    fireEvent.change(screen.getByLabelText(/new owner password/i), { target: { value: 'welcome123' } })
    fireEvent.click(screen.getByRole('button', { name: /add owner/i }))
    await waitFor(() => expect(addOwner).toHaveBeenCalledWith({ email: 'new@pbb.co', password: 'welcome123' }))
  })
  it('resets another owner password', async () => {
    render(<AccountPanel />)
    fireEvent.click(screen.getByRole('button', { name: /reset password for owner@pbb.co/i }))
    fireEvent.change(screen.getByLabelText(/new password for owner@pbb.co/i), { target: { value: 'freshpass1' } })
    fireEvent.click(screen.getByRole('button', { name: /^set password$/i }))
    await waitFor(() => expect(resetPw).toHaveBeenCalledWith({ id: 'u1', newPassword: 'freshpass1' }))
  })
})
