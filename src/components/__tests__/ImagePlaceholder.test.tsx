import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImagePlaceholder } from '../ImagePlaceholder'

describe('ImagePlaceholder', () => {
  it('exposes an accessible label and renders no <img>', () => {
    const { container } = render(<ImagePlaceholder label="Margherita" />)
    expect(screen.getByRole('img', { name: /Margherita/i })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
