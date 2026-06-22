import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const listState = { data: [] as unknown[], isLoading: false }
const createMutate = vi.fn().mockResolvedValue({ id: 'new' })
const deleteMutate = vi.fn()
const updateMutate = vi.fn()
const reorderMutate = vi.fn()
const invalidate = vi.fn()

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ gallery: { list: { invalidate } } }),
    gallery: {
      list: { useQuery: () => listState },
      create: {
        useMutation: (o?: { onSuccess?: () => void }) => ({
          mutateAsync: async (v: unknown) => {
            const r = await createMutate(v)
            o?.onSuccess?.()
            return r
          },
          isPending: false,
        }),
      },
      update: {
        useMutation: (o?: { onSuccess?: () => void }) => ({
          mutate: (v: unknown) => { updateMutate(v); o?.onSuccess?.() },
          isPending: false,
        }),
      },
      delete: {
        useMutation: (o?: { onSuccess?: () => void }) => ({
          mutate: (v: unknown) => { deleteMutate(v); o?.onSuccess?.() },
          isPending: false,
        }),
      },
      reorder: {
        useMutation: (o?: { onSuccess?: () => void }) => ({
          mutate: (v: unknown) => { reorderMutate(v); o?.onSuccess?.() },
          isPending: false,
        }),
      },
    },
  },
}))

vi.mock('../ImageUploadField', () => ({
  ImageUploadField: ({ onChange }: { onChange: (url: string | null) => void }) => (
    <button type="button" onClick={() => onChange('/test.jpg')}>image-field</button>
  ),
}))

import { GalleryManager } from '../GalleryManager'

beforeEach(() => {
  listState.data = [
    { id: '1', url: '/pizza1.jpg', caption: 'Margherita', sortOrder: 0, createdAt: new Date() },
    { id: '2', url: '/pizza2.jpg', caption: '', sortOrder: 1, createdAt: new Date() },
  ]
  createMutate.mockClear()
  deleteMutate.mockClear()
  updateMutate.mockClear()
  reorderMutate.mockClear()
  invalidate.mockClear()
})

describe('GalleryManager', () => {
  it('renders the list of photos', () => {
    render(<GalleryManager />)
    const thumbs = screen.getAllByRole('img')
    expect(thumbs).toHaveLength(2)
    expect(screen.getByDisplayValue('Margherita')).toBeInTheDocument()
  })

  it('opens add form and creates a new photo', async () => {
    render(<GalleryManager />)
    fireEvent.click(screen.getByRole('button', { name: /add photo/i }))
    // stub ImageUploadField triggers onChange with /test.jpg
    fireEvent.click(screen.getByRole('button', { name: /image-field/i }))
    fireEvent.click(screen.getByRole('button', { name: /save photo/i }))
    await waitFor(() =>
      expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ url: '/test.jpg' })),
    )
    expect(invalidate).toHaveBeenCalled()
  })

  it('deletes a photo after confirmation', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    render(<GalleryManager />)
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(deleteMutate).toHaveBeenCalledWith({ id: '1' })
  })
})
