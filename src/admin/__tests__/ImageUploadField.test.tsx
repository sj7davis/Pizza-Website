import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImageUploadField } from '../ImageUploadField'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('ImageUploadField', () => {
  it('uploads the chosen file and reports the returned url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ url: '/uploads/abc.jpg' }) }),
    )
    const onChange = vi.fn()
    render(<ImageUploadField value={null} onChange={onChange} />)
    const file = new File(['x'], 'pizza.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText(/upload image/i), { target: { files: [file] } })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/uploads/abc.jpg'))
    expect(fetch).toHaveBeenCalledWith('/api/admin/upload', expect.objectContaining({ method: 'POST' }))
  })

  it('shows an error when the upload fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'nope' }) }),
    )
    render(<ImageUploadField value={null} onChange={vi.fn()} />)
    const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText(/upload image/i), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed/i)
  })

  it('clears the image when Remove is clicked', () => {
    const onChange = vi.fn()
    render(<ImageUploadField value="/uploads/x.jpg" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
