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
  updateMutate.mockClear()
  getState.data = {
    brandName: 'PBB',
    tagline: 'tag',
    orderLinks: [{ label: 'Uber Eats', url: '#' }],
    openTime: '17:00',
    closeTime: '21:00',
    timezone: 'UTC',
    soldOut: false,
    soldOutMessage: 'x',
    storyEyebrow: 'Our story',
    storyHeading: 'Heading',
    storyParagraphs: ['Para one.', 'Para two.'],
    storyPullquote: 'Quote',
    storyEstablished: 'est',
    deliveryArea: 'Airport West',
    deliveryHours: '5-9pm',
    socials: [{ label: 'Instagram', href: '#ig' }],
  }
})

describe('BrandEditor', () => {
  it('prefills the form from site content', () => {
    render(<BrandEditor />)
    expect(screen.getByLabelText(/brand name/i)).toHaveValue('PBB')
    expect(screen.getByLabelText(/story heading/i)).toHaveValue('Heading')
  })

  it('saves the assembled nested input', async () => {
    render(<BrandEditor />)
    fireEvent.change(screen.getByLabelText(/story heading/i), { target: { value: 'New heading' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const arg = updateMutate.mock.calls[0][0]
    expect(arg.story.heading).toBe('New heading')
    expect(arg.story.paragraphs).toEqual(['Para one.', 'Para two.'])
    expect(arg.delivery.area).toBe('Airport West')
    expect(arg.socials[0]).toEqual({ label: 'Instagram', href: '#ig' })
  })
})
