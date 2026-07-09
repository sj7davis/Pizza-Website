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

  it('renders block content in order when blocks are provided', () => {
    render(
      <Hero
        brandName="PBB"
        tagline="Slow dough."
        orderLinks={[{ label: 'Uber Eats', url: '#ue' }]}
        blocks={[
          { id: 'b1', type: 'eyebrow', value: 'Fresh from the oven' },
          { id: 'b2', type: 'heading', value: 'PBB' },
          { id: 'b3', type: 'image', url: '/pizza.jpg', alt: 'A wood-fired pizza' },
          { id: 'b4', type: 'buttons' },
        ]}
      />,
      { wrapper: TestProviders },
    )
    expect(screen.getByText('Fresh from the oven')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /PBB/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /a wood-fired pizza/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /order on uber eats/i })).toHaveAttribute('href', '#ue')
    // fallback tagline should NOT render since blocks took over
    expect(screen.queryByText('Slow dough.')).toBeNull()
  })

  it('falls back to the classic hardcoded layout when blocks is empty/undefined', () => {
    render(
      <Hero brandName="PBB" tagline="Slow dough." orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} blocks={[]} />,
      { wrapper: TestProviders },
    )
    expect(screen.getByText('Slow dough.')).toBeInTheDocument()
    expect(screen.getByText(/Pizza by Backhaus · Delivered/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /order on uber eats/i })).toHaveAttribute('href', '#ue')
  })
})
