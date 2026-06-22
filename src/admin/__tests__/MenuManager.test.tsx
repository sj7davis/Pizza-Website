import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const listState = { data: [] as unknown[], isLoading: false }
const createMutate = vi.fn().mockResolvedValue({ id: 'new' })
const deleteMutate = vi.fn()
const invalidate = vi.fn()

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ menu: { list: { invalidate } } }),
    menu: {
      list: { useQuery: () => listState },
      create: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutateAsync: async (v: unknown) => { const r = await createMutate(v); o?.onSuccess?.(); return r }, isPending: false }) },
      update: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutateAsync: async (v: unknown) => { o?.onSuccess?.(); return v }, isPending: false }) },
      delete: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutate: (v: unknown) => { deleteMutate(v); o?.onSuccess?.() }, isPending: false }) },
      reorder: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutate: () => o?.onSuccess?.(), isPending: false }) },
    },
  },
}))
vi.mock('../ImageUploadField', () => ({ ImageUploadField: () => <div>image-field</div> }))

import { MenuManager } from '../MenuManager'

beforeEach(() => {
  listState.data = [
    { id: '1', name: 'Margherita', tagline: 't', description: 'd', price: '$22', image: null, available: true, featured: false },
    { id: '2', name: 'Nduja', tagline: 't', description: 'd', price: '$26', image: null, available: false, featured: true },
  ]
  createMutate.mockClear()
  deleteMutate.mockClear()
})

describe('MenuManager', () => {
  it('lists items with names and prices', () => {
    render(<MenuManager />)
    expect(screen.getByText('Margherita')).toBeInTheDocument()
    expect(screen.getByText('$26')).toBeInTheDocument()
  })

  it('opens the add form and creates a new item', async () => {
    render(<MenuManager />)
    fireEvent.click(screen.getByRole('button', { name: /add pizza/i }))
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Capricciosa' } })
    fireEvent.change(screen.getByLabelText(/tagline/i), { target: { value: 'four corners' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'ham etc' } })
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '$28' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() =>
      expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Capricciosa', price: '$28' })),
    )
    expect(await screen.findByText(/saved/i)).toBeInTheDocument()
  })

  it('deletes an item after confirmation', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    render(<MenuManager />)
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(deleteMutate).toHaveBeenCalledWith({ id: '1' })
  })
})
