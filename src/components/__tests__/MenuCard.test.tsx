import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MenuCard } from '../MenuCard'
import type { MenuItem } from '../../types'

const base: MenuItem = {
  name: 'Margherita',
  tagline: 'the original',
  description: 'San Marzano, fior di latte and basil on sourdough.',
  price: '$22',
}

describe('MenuCard', () => {
  it('with an image, renders an <img> with alt set to the name plus tagline/price/description', () => {
    render(<MenuCard item={{ ...base, image: '/pizza.jpg' }} />)
    const img = screen.getByRole('img', { name: 'Margherita' })
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src', '/pizza.jpg')
    expect(screen.getByText('the original')).toBeInTheDocument()
    expect(screen.getByText('$22')).toBeInTheDocument()
    expect(screen.getByText('San Marzano, fior di latte and basil on sourdough.')).toBeInTheDocument()
  })

  it('without an image, renders the placeholder and no <img>', () => {
    const { container } = render(<MenuCard item={base} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: /Margherita/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Margherita' })).toBeInTheDocument()
  })

  it('renders dietary/spice tags when present', () => {
    render(<MenuCard item={{ name: 'Funghi', tagline: 't', description: 'd', price: '$25', tags: ['V', '🌶️'] }} />)
    expect(screen.getByText('V')).toBeInTheDocument()
    expect(screen.getByText('🌶️')).toBeInTheDocument()
  })
})
