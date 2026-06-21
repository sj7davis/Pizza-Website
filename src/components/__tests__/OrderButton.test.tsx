import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderButton } from '../OrderButton'

describe('OrderButton', () => {
  it('links to the url in a new tab', () => {
    render(<OrderButton label="Order on Uber Eats" url="https://ubereats.com/pbb" />)
    const link = screen.getByRole('link', { name: /order on uber eats/i })
    expect(link).toHaveAttribute('href', 'https://ubereats.com/pbb')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
  it('renders a non-link disabled state', () => {
    render(<OrderButton label="Opens at 5pm" url="#" disabled />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Opens at 5pm')).toHaveAttribute('aria-disabled', 'true')
  })
})
