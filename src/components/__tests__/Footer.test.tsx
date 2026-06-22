import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from '../Footer'
import { TestProviders } from '../../test/providers'

describe('Footer', () => {
  it('repeats the Uber Eats CTA and lists socials', () => {
    render(
      <Footer
        brandName="PBB"
        orderLinks={[{ label: 'Uber Eats', url: '#order' }]}
        socials={[{ label: 'Instagram', href: '#ig' }]}
      />,
      { wrapper: TestProviders },
    )
    expect(screen.getByRole('link', { name: /order on uber eats/i })).toHaveAttribute('href', '#order')
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', '#ig')
  })
})
