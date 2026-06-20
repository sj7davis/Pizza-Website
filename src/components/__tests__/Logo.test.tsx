import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from '../Logo'

describe('Logo', () => {
  it('renders the brand letters with a separating dot', () => {
    render(<Logo text="PBV" />)
    expect(screen.getByRole('img', { name: /PBV/i })).toBeInTheDocument()
  })
})
