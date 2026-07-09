import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

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

vi.mock('../ImageUploadField', () => ({
  ImageUploadField: ({ onChange }: { onChange: (url: string | null) => void }) => (
    <button type="button" onClick={() => onChange('/test.jpg')}>image-field</button>
  ),
}))

import { HeaderBuilder } from '../HeaderBuilder'

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
    promoActive: false,
    promoText: '',
    promoCode: '',
    theme: 'editorial-dark',
  }
})

describe('HeaderBuilder', () => {
  it('renders existing blocks', () => {
    render(<HeaderBuilder />)
    expect(screen.getByDisplayValue('Pizza by Backhaus · Delivered')).toBeInTheDocument()
    expect(screen.getByDisplayValue('PBB')).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it('adds a block and the list grows', () => {
    render(<HeaderBuilder />)
    fireEvent.click(screen.getByRole('button', { name: /\+ divider/i }))
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
  })

  it('deletes a block', () => {
    render(<HeaderBuilder />)
    fireEvent.click(screen.getAllByRole('button', { name: /^delete/i })[0])
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
  })

  it('saves and calls site.update with heroBlocks', async () => {
    render(<HeaderBuilder />)
    fireEvent.click(screen.getByRole('button', { name: /\+ divider/i }))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const arg = updateMutate.mock.calls[0][0]
    expect(arg.heroBlocks).toHaveLength(3)
    expect(arg.heroBlocks[0]).toMatchObject({ type: 'eyebrow', value: 'Pizza by Backhaus · Delivered' })
    expect(arg.heroBlocks[2]).toMatchObject({ type: 'divider' })
    // full payload includes existing site fields
    expect(arg.brandName).toBe('PBB')
    expect(arg.orderLinks).toEqual([{ label: 'Uber Eats', url: '#ue' }])
    expect(await screen.findByText(/saved/i)).toBeInTheDocument()
  })
})
