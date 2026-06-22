import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '../Hero'
import { TestProviders } from '../../test/providers'

describe('Hero', () => {
  it('shows the brand, tagline and order links', () => {
    render(
      <Hero
        brandName="PBB"
        tagline="Slow dough."
        orderLinks={[{ label: 'Uber Eats', url: '#ue' }, { label: 'DoorDash', url: '#dd' }]}
      />,
      { wrapper: TestProviders },
    )
    expect(screen.getByRole('img', { name: /PBB/i })).toBeInTheDocument()
    expect(screen.getByText('Slow dough.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /order on uber eats/i })).toHaveAttribute('href', '#ue')
    expect(screen.getByRole('link', { name: /order on doordash/i })).toHaveAttribute('href', '#dd')
  })
  it('disables ordering when ordersDisabled', () => {
    render(<Hero brandName="PBB" tagline="t" orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} ordersDisabled />, {
      wrapper: TestProviders,
    })
    expect(screen.queryByRole('link', { name: /order on uber eats/i })).toBeNull()
  })
})
