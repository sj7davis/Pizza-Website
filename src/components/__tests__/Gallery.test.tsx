import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const queryState = { data: [] as unknown[], isLoading: false }

vi.mock('../../lib/trpc', () => ({
  trpc: {
    gallery: {
      listPublic: {
        useQuery: () => queryState,
      },
    },
  },
}))

import { Gallery } from '../Gallery'

describe('Gallery', () => {
  it('renders nothing when data is empty', () => {
    queryState.data = []
    queryState.isLoading = false
    const { container } = render(<Gallery />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing while loading', () => {
    queryState.data = []
    queryState.isLoading = true
    const { container } = render(<Gallery />)
    expect(container.firstChild).toBeNull()
  })

  it('renders images when data is present', () => {
    queryState.isLoading = false
    queryState.data = [
      { id: '1', url: '/pizza1.jpg', caption: 'Margherita' },
      { id: '2', url: '/pizza2.jpg', caption: 'Nduja' },
    ]
    render(<Gallery />)
    const imgs = screen.getAllByRole('img')
    expect(imgs).toHaveLength(2)
    expect(screen.getByText('Margherita')).toBeInTheDocument()
    expect(screen.getByText('Nduja')).toBeInTheDocument()
  })

  it('renders the "From the oven" section heading', () => {
    queryState.isLoading = false
    queryState.data = [{ id: '1', url: '/pizza1.jpg', caption: 'Test' }]
    render(<Gallery />)
    expect(screen.getByText('From the oven')).toBeInTheDocument()
  })

  it('renders prev/next arrow buttons when more than one image', () => {
    queryState.isLoading = false
    queryState.data = [
      { id: '1', url: '/pizza1.jpg', caption: 'Margherita' },
      { id: '2', url: '/pizza2.jpg', caption: 'Nduja' },
    ]
    render(<Gallery />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('hides arrow buttons when only one image', () => {
    queryState.isLoading = false
    queryState.data = [{ id: '1', url: '/pizza1.jpg', caption: 'Solo' }]
    render(<Gallery />)
    expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
  })
})
