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

import { BrandEditor } from '../BrandEditor'

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
    promoActive: false,
    promoText: '',
    promoCode: '',
  }
})

describe('BrandEditor', () => {
  it('prefills order link, hours and sold-out fields', () => {
    render(<BrandEditor />)
    expect(screen.getByLabelText(/order link 1 label/i)).toHaveValue('Uber Eats')
    expect(screen.getByLabelText(/order link 1 url/i)).toHaveValue('#ue')
    expect(screen.getByLabelText(/opens \(24h/i)).toHaveValue('17:00')
    expect(screen.getByLabelText(/sold out/i)).not.toBeChecked()
  })

  it('saves the assembled input and shows Saved', async () => {
    render(<BrandEditor />)
    fireEvent.change(screen.getByLabelText(/order link 1 url/i), { target: { value: 'https://ubereats.com/pbb' } })
    fireEvent.click(screen.getByLabelText(/sold out/i))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const arg = updateMutate.mock.calls[0][0]
    expect(arg.orderLinks[0]).toEqual({ label: 'Uber Eats', url: 'https://ubereats.com/pbb' })
    expect(arg.soldOut).toBe(true)
    expect(arg.openTime).toBe('17:00')
    expect(await screen.findByText(/saved/i)).toBeInTheDocument()
  })

  it('shows an error when saving fails', async () => {
    updateMutate.mockRejectedValue(new Error('bad'))
    render(<BrandEditor />)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i)
  })

  it('adds a delivery suburb as a chip and saves it', async () => {
    render(<BrandEditor />)
    expect(screen.getByText('Airport West')).toBeInTheDocument() // existing chip
    fireEvent.change(screen.getByLabelText(/add delivery suburb/i), { target: { value: 'Niddrie' } })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(screen.getByText('Niddrie')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    expect(updateMutate.mock.calls[0][0].deliverySuburbs).toEqual(
      expect.arrayContaining(['Airport West', 'Niddrie']),
    )
  })
})
