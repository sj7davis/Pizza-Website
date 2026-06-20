import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders all key sections from content', () => {
    render(<App />)
    // PBV logo appears in both Hero and Footer, so expect at least one.
    expect(screen.getAllByRole('img', { name: /PBV/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Margherita')).toBeInTheDocument()             // Menu
    expect(screen.getByText(/Airport West/)).toBeInTheDocument()           // Delivery
    expect(screen.getAllByRole('link', { name: /order on uber eats/i }).length).toBeGreaterThanOrEqual(2)
  })
})
