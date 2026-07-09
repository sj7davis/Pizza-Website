import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const getState = { data: undefined as unknown, isLoading: false }
const updateMutate = vi.fn().mockResolvedValue({})
const invalidate = vi.fn()

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ site: { get: { invalidate } } }),
    site: {
      get: { useQuery: () => getState },
      update: { useMutation: () => ({ mutateAsync: updateMutate, isPending: false }) },
    },
  },
}))

vi.mock('react-rnd', () => ({
  Rnd: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <div data-testid="rnd-el" onClick={onClick}>
      {children}
    </div>
  ),
}))

vi.mock('../ImageUploadField', () => ({
  ImageUploadField: ({ onChange }: { onChange: (url: string | null) => void }) => (
    <button type="button" onClick={() => onChange('/test.jpg')}>image-field</button>
  ),
}))

import { NavbarEditor } from '../NavbarEditor'

beforeEach(() => {
  updateMutate.mockReset().mockResolvedValue({})
  getState.data = {
    brandName: 'PBB', tagline: 'tag',
    orderLinks: [{ label: 'Uber Eats', url: '#ue' }],
    openTime: '17:00', closeTime: '21:00', timezone: 'Australia/Melbourne',
    soldOut: false, soldOutMessage: 'Sold out tonight',
    storyEyebrow: 'Our story', storyHeading: 'Heading', storyParagraphs: ['Para one.', 'Para two.'],
    storyPullquote: 'Quote', storyEstablished: 'est',
    deliveryArea: 'Airport West', deliveryHours: '5-9pm',
    socials: [{ label: 'Instagram', href: '#ig' }],
    deliverySuburbs: ['Airport West'],
    heroImage: '/dough.jpg',
    heroBlocks: [
      { id: 'b1', type: 'eyebrow', value: 'Pizza by Backhaus · Delivered' },
      { id: 'b2', type: 'heading', value: 'PBB' },
    ],
    heroCanvas: { enabled: false, desktopHeight: 560, mobileHeight: 620, elements: [] },
    navbar: {
      enabled: true,
      showOrder: true,
      links: [
        { id: 'n1', label: 'Menu', href: '#menu' },
        { id: 'n2', label: 'Our Story', href: '#story' },
      ],
      canvas: { enabled: false, desktopHeight: 90, mobileHeight: 64, elements: [] },
    },
    promoActive: false,
    promoText: '',
    promoCode: '',
    theme: 'editorial-dark',
  }
})

describe('NavbarEditor', () => {
  it('renders existing links', () => {
    render(<NavbarEditor />)
    expect(screen.getByDisplayValue('Menu')).toBeInTheDocument()
    expect(screen.getByDisplayValue('#menu')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Our Story')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('adding a link grows the list', () => {
    render(<NavbarEditor />)
    fireEvent.click(screen.getByRole('button', { name: /\+ add link/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('removing a link shrinks the list', () => {
    render(<NavbarEditor />)
    fireEvent.click(screen.getAllByLabelText(/remove nav link/i)[0])
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('toggles the enabled checkbox', () => {
    render(<NavbarEditor />)
    const checkbox = screen.getByLabelText(/show navigation bar/i)
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('saves and calls site.update with navbar, heroBlocks and heroCanvas intact', async () => {
    render(<NavbarEditor />)
    fireEvent.click(screen.getByRole('button', { name: /\+ add link/i }))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const arg = updateMutate.mock.calls[0][0]
    expect(arg.navbar.links).toHaveLength(3)
    expect(arg.navbar.enabled).toBe(true)
    expect(arg.navbar.showOrder).toBe(true)
    // heroBlocks/heroCanvas must not be wiped
    expect(arg.heroBlocks).toHaveLength(2)
    expect(arg.heroCanvas).toEqual({ enabled: false, desktopHeight: 560, mobileHeight: 620, elements: [] })
    // full payload includes existing site fields
    expect(arg.brandName).toBe('PBB')
    expect(await screen.findByText(/saved/i)).toBeInTheDocument()
  })

  it('switching to Freeform mode shows the canvas editor and hides the simple link list', () => {
    render(<NavbarEditor />)
    expect(screen.getByText(/links/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /freeform canvas/i }))
    expect(screen.getByLabelText(/enable freeform header/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ add link/i })).toBeNull()
  })

  it('switching back to Simple bar restores the link list', () => {
    render(<NavbarEditor />)
    fireEvent.click(screen.getByRole('button', { name: /freeform canvas/i }))
    fireEvent.click(screen.getByRole('button', { name: /^simple bar$/i }))
    expect(screen.getByRole('button', { name: /\+ add link/i })).toBeInTheDocument()
  })

  it('save includes navbar.canvas when saving in Freeform mode', async () => {
    render(<NavbarEditor />)
    fireEvent.click(screen.getByRole('button', { name: /freeform canvas/i }))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const arg = updateMutate.mock.calls[0][0]
    expect(arg.navbar.canvas).toBeDefined()
    expect(arg.navbar.canvas.enabled).toBe(true)
  })
})
