import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '../Hero'
import { TestProviders } from '../../test/providers'
import type { HeroCanvas } from '../../types'

function layout(overrides: Partial<HeroCanvas['elements'][number]['desktop']> = {}) {
  return { x: 10, y: 10, w: 40, align: 'left' as const, ...overrides }
}

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

  it('renders a visible canvas element, absolutely positioned, when canvas is enabled', () => {
    const canvas: HeroCanvas = {
      enabled: true,
      desktopHeight: 500,
      mobileHeight: 600,
      elements: [
        {
          id: 'e1',
          type: 'text',
          value: 'Freeform copy',
          desktop: layout({ x: 12, y: 30, w: 50 }),
          mobile: layout(),
        },
      ],
    }
    render(
      <Hero brandName="PBB" tagline="Slow dough." orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} canvas={canvas} />,
      { wrapper: TestProviders },
    )
    const el = screen.getByText('Freeform copy')
    expect(el).toBeInTheDocument()
    const positioned = el.closest('.hero-canvas__el') as HTMLElement
    expect(positioned).not.toBeNull()
    expect(positioned.style.position).toBe('absolute')
    expect(positioned.style.left).toBe('12%')
    expect(positioned.style.top).toBe('30%')
  })

  it('does not render a canvas element hidden on the current device', () => {
    const canvas: HeroCanvas = {
      enabled: true,
      desktopHeight: 500,
      mobileHeight: 600,
      elements: [
        {
          id: 'e1',
          type: 'text',
          value: 'Should not appear',
          desktop: layout({ hidden: true }),
          mobile: layout(),
        },
      ],
    }
    render(
      <Hero brandName="PBB" tagline="Slow dough." orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} canvas={canvas} />,
      { wrapper: TestProviders },
    )
    expect(screen.queryByText('Should not appear')).toBeNull()
  })

  it('canvas takes precedence over blocks when both are present', () => {
    const canvas: HeroCanvas = {
      enabled: true,
      desktopHeight: 500,
      mobileHeight: 600,
      elements: [
        { id: 'e1', type: 'text', value: 'Canvas wins', desktop: layout(), mobile: layout() },
      ],
    }
    render(
      <Hero
        brandName="PBB"
        tagline="Slow dough."
        orderLinks={[{ label: 'Uber Eats', url: '#ue' }]}
        blocks={[{ id: 'b1', type: 'eyebrow', value: 'Stacked block text' }]}
        canvas={canvas}
      />,
      { wrapper: TestProviders },
    )
    expect(screen.getByText('Canvas wins')).toBeInTheDocument()
    expect(screen.queryByText('Stacked block text')).toBeNull()
  })

  it('falls back to blocks when canvas is disabled', () => {
    const canvas: HeroCanvas = {
      enabled: false,
      desktopHeight: 500,
      mobileHeight: 600,
      elements: [{ id: 'e1', type: 'text', value: 'Canvas copy', desktop: layout(), mobile: layout() }],
    }
    render(
      <Hero
        brandName="PBB"
        tagline="Slow dough."
        orderLinks={[{ label: 'Uber Eats', url: '#ue' }]}
        blocks={[{ id: 'b1', type: 'eyebrow', value: 'Stacked block text' }]}
        canvas={canvas}
      />,
      { wrapper: TestProviders },
    )
    expect(screen.getByText('Stacked block text')).toBeInTheDocument()
    expect(screen.queryByText('Canvas copy')).toBeNull()
  })

  it('falls back to classic layout when canvas has no elements', () => {
    const canvas: HeroCanvas = { enabled: true, desktopHeight: 500, mobileHeight: 600, elements: [] }
    render(
      <Hero brandName="PBB" tagline="Slow dough." orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} canvas={canvas} />,
      { wrapper: TestProviders },
    )
    expect(screen.getByText('Slow dough.')).toBeInTheDocument()
  })
})
