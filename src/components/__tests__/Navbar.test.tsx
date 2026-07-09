import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Navbar } from '../Navbar'
import { TestProviders } from '../../test/providers'
import type { HeroCanvas, NavBar } from '../../types'

const mediaQueryMock = vi.fn((_query: string) => false)
vi.mock('../../lib/useMediaQuery', () => ({
  useMediaQuery: (q: string) => mediaQueryMock(q),
}))

const disabledCanvas: HeroCanvas = { enabled: false, desktopHeight: 90, mobileHeight: 64, elements: [] }

const navbar: NavBar = {
  enabled: true,
  showOrder: true,
  links: [
    { id: 'n1', label: 'Menu', href: '#menu' },
    { id: 'n2', label: 'Our Story', href: '#story' },
    { id: 'n3', label: 'Delivery', href: '#delivery' },
  ],
  canvas: disabledCanvas,
}

beforeEach(() => {
  mediaQueryMock.mockReset().mockReturnValue(false)
})

describe('Navbar', () => {
  it('renders links when enabled', () => {
    render(
      <Navbar brandName="PBB" navbar={navbar} orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} />,
      { wrapper: TestProviders },
    )
    expect(screen.getByRole('link', { name: 'Menu' })).toHaveAttribute('href', '#menu')
    expect(screen.getByRole('link', { name: 'Our Story' })).toHaveAttribute('href', '#story')
    expect(screen.getByRole('link', { name: 'Delivery' })).toHaveAttribute('href', '#delivery')
  })

  it('renders nothing when disabled', () => {
    const { container } = render(
      <Navbar brandName="PBB" navbar={{ ...navbar, enabled: false }} orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} />,
      { wrapper: TestProviders },
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows the Order button when showOrder is true and orderLinks exist', () => {
    render(
      <Navbar brandName="PBB" navbar={navbar} orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} />,
      { wrapper: TestProviders },
    )
    const orderLink = screen.getByRole('link', { name: /order/i })
    expect(orderLink).toHaveAttribute('href', '#ue')
    expect(orderLink).toHaveAttribute('target', '_blank')
    expect(orderLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('hides the Order button when showOrder is false', () => {
    render(
      <Navbar brandName="PBB" navbar={{ ...navbar, showOrder: false }} orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} />,
      { wrapper: TestProviders },
    )
    expect(screen.queryByRole('link', { name: /order/i })).toBeNull()
  })

  it('collapses into a hamburger menu on mobile and toggles the panel', () => {
    mediaQueryMock.mockReturnValue(true)
    render(
      <Navbar brandName="PBB" navbar={navbar} orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} />,
      { wrapper: TestProviders },
    )
    const toggle = screen.getByRole('button', { name: /menu/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Menu' })).toBeNull()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const menuLink = screen.getByRole('link', { name: 'Menu' })
    expect(menuLink).toBeInTheDocument()

    fireEvent.click(menuLink)
    expect(screen.queryByRole('link', { name: 'Menu' })).toBeNull()
  })

  describe('freeform canvas mode', () => {
    const canvasNavbar: NavBar = {
      ...navbar,
      canvas: {
        enabled: true,
        desktopHeight: 90,
        mobileHeight: 64,
        elements: [
          {
            id: 'img1',
            type: 'image',
            url: '/promo1.jpg',
            alt: 'Promo one',
            desktop: { x: 0, y: 0, w: 20 },
            mobile: { x: 0, y: 0, w: 40 },
          },
          {
            id: 'img2',
            type: 'image',
            url: '/promo2.jpg',
            alt: 'Promo two',
            desktop: { x: 25, y: 0, w: 20 },
            mobile: { x: 45, y: 0, w: 40 },
          },
        ],
      },
    }

    it('renders the freeform banner with multiple images and not the simple links', () => {
      render(
        <Navbar brandName="PBB" navbar={canvasNavbar} orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} />,
        { wrapper: TestProviders },
      )
      expect(screen.getByRole('img', { name: 'Promo one' })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Promo two' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Menu' })).toBeNull()
      expect(screen.queryByRole('link', { name: 'Our Story' })).toBeNull()
    })

    it('falls back to the simple bar when canvas is disabled', () => {
      render(
        <Navbar brandName="PBB" navbar={navbar} orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} />,
        { wrapper: TestProviders },
      )
      expect(screen.getByRole('link', { name: 'Menu' })).toBeInTheDocument()
      expect(screen.queryByRole('img', { name: 'Promo one' })).toBeNull()
    })

    it('falls back to the simple bar when canvas has no elements even if enabled', () => {
      const emptyCanvasNavbar: NavBar = { ...navbar, canvas: { ...disabledCanvas, enabled: true } }
      render(
        <Navbar brandName="PBB" navbar={emptyCanvasNavbar} orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} />,
        { wrapper: TestProviders },
      )
      expect(screen.getByRole('link', { name: 'Menu' })).toBeInTheDocument()
    })
  })
})
