import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const contentState = {
  promoActive: false,
  promoText: '',
  promoCode: '',
}

vi.mock('../../lib/useContent', () => ({
  useContent: () => contentState,
}))

import { PromoBanner } from '../PromoBanner'

beforeEach(() => {
  contentState.promoActive = false
  contentState.promoText = ''
  contentState.promoCode = ''
  sessionStorage.clear()
})

afterEach(() => {
  sessionStorage.clear()
})

describe('PromoBanner', () => {
  it('renders nothing when promoActive is false', () => {
    contentState.promoActive = false
    contentState.promoText = 'Free delivery!'
    const { container } = render(<PromoBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when promoText is empty', () => {
    contentState.promoActive = true
    contentState.promoText = ''
    const { container } = render(<PromoBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the message when active and text is set', () => {
    contentState.promoActive = true
    contentState.promoText = 'Free delivery this weekend!'
    render(<PromoBanner />)
    expect(screen.getByText('Free delivery this weekend!')).toBeInTheDocument()
  })

  it('shows the promo code pill when promoCode is set', () => {
    contentState.promoActive = true
    contentState.promoText = 'Treat yourself.'
    contentState.promoCode = 'FIRSTBITE'
    render(<PromoBanner />)
    expect(screen.getByText('FIRSTBITE')).toBeInTheDocument()
  })

  it('does not show a code pill when promoCode is empty', () => {
    contentState.promoActive = true
    contentState.promoText = 'Treat yourself.'
    contentState.promoCode = ''
    render(<PromoBanner />)
    expect(screen.queryByText(/use code/i)).toBeNull()
  })

  it('dismiss button hides the banner', () => {
    contentState.promoActive = true
    contentState.promoText = 'Buy one get one!'
    render(<PromoBanner />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('stores dismissal in sessionStorage keyed by message', () => {
    contentState.promoActive = true
    contentState.promoText = 'Half price tonight!'
    render(<PromoBanner />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(sessionStorage.getItem('pbb-promo-dismissed:Half price tonight!')).toBe('1')
  })

  it('stays hidden on re-render when sessionStorage says dismissed', () => {
    contentState.promoActive = true
    contentState.promoText = 'Promo already seen'
    sessionStorage.setItem('pbb-promo-dismissed:Promo already seen', '1')
    const { container } = render(<PromoBanner />)
    expect(container.firstChild).toBeNull()
  })
})
