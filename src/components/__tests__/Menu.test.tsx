import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Menu } from '../Menu'
import type { MenuItem } from '../../types'

const items: MenuItem[] = [
  { name: 'Margherita', tagline: 'the original', description: 'San Marzano, fior di latte, basil.', price: '$22' },
  { name: 'Nduja', tagline: 'spicy', description: 'Calabrian nduja and hot honey.', price: '$26' },
]

describe('Menu', () => {
  it('renders every menu item as a card with its name and price', () => {
    render(<Menu items={items} />)
    expect(screen.getByRole('heading', { name: 'Margherita' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nduja' })).toBeInTheDocument()
    expect(screen.getByText('$26')).toBeInTheDocument()
  })
})
