import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { TestProviders } from '../test/providers'

describe('App', () => {
  it('renders all key sections from content', () => {
    render(<App />, { wrapper: TestProviders })
    expect(screen.getAllByRole('img', { name: /PBV/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Margherita')).toBeInTheDocument()
    expect(screen.getByText(/Airport West/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /order on uber eats/i }).length).toBeGreaterThanOrEqual(2)
  })
})
