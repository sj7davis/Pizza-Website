import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Menu } from '../Menu'
import type { MenuItem } from '../../types'

const items: MenuItem[] = [
  { name: 'Margherita', tagline: 'classic', description: 'classic', price: '$22' },
  { name: 'Nduja', tagline: 'spicy', description: 'spicy', price: '$26' },
]

describe('Menu', () => {
  it('renders every menu item with its price', () => {
    render(<Menu items={items} />)
    expect(screen.getByText('Margherita')).toBeInTheDocument()
    expect(screen.getByText('Nduja')).toBeInTheDocument()
    expect(screen.getByText('$26')).toBeInTheDocument()
  })
})
