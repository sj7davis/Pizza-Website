import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderStatus } from '../OrderStatus'

describe('OrderStatus', () => {
  it('renders the label with a state attribute', () => {
    render(<OrderStatus status={{ state: 'open', label: 'Open now — ordering till 9pm', minutesUntilChange: 90 }} />)
    const el = screen.getByText(/open now/i)
    expect(el).toBeInTheDocument()
    expect(el.closest('[data-state]')).toHaveAttribute('data-state', 'open')
  })
})
