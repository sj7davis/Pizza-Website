import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Delivery } from '../Delivery'

describe('Delivery', () => {
  it('renders area and hours', () => {
    render(<Delivery area="Airport West & surrounds" hours="5–9pm, nightly" />)
    expect(screen.getByText(/Airport West & surrounds/)).toBeInTheDocument()
    expect(screen.getByText(/5–9pm, nightly/)).toBeInTheDocument()
  })
})
