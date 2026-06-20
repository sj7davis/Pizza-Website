import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '../Hero'

describe('Hero', () => {
  it('shows the brand, tagline and an Uber Eats CTA', () => {
    render(<Hero brandName="PBV" tagline="Slow dough." uberEatsUrl="#x" />)
    expect(screen.getByRole('img', { name: /PBV/i })).toBeInTheDocument()
    expect(screen.getByText('Slow dough.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /order on uber eats/i })).toHaveAttribute('href', '#x')
  })
})
