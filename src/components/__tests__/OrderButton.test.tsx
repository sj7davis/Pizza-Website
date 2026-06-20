import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderButton } from '../OrderButton'

describe('OrderButton', () => {
  it('links to the given Uber Eats url in a new tab', () => {
    render(<OrderButton href="https://ubereats.com/store/pbv" />)
    const link = screen.getByRole('link', { name: /order on uber eats/i })
    expect(link).toHaveAttribute('href', 'https://ubereats.com/store/pbv')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
})
