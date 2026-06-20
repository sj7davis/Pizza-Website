import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Story } from '../Story'
import type { BrandStory } from '../../types'

const story: BrandStory = {
  eyebrow: 'Our story',
  heading: 'From the Backhaus bench',
  paragraphs: ['First paragraph about Backhaus sourdough.', 'Second paragraph.'],
  pullquote: 'Same sourdough, now with fire.',
  established: 'Backhaus — est. 2019',
}

describe('Story', () => {
  it('renders heading, each paragraph and the pull-quote', () => {
    render(<Story story={story} />)
    expect(screen.getByRole('heading', { name: 'From the Backhaus bench' })).toBeInTheDocument()
    expect(screen.getByText('First paragraph about Backhaus sourdough.')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
    expect(screen.getByText('Same sourdough, now with fire.')).toBeInTheDocument()
  })
})
