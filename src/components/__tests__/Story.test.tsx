import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Story } from '../Story'

describe('Story', () => {
  it('renders heading and body', () => {
    render(<Story heading="Slow dough." body="48 hours." />)
    expect(screen.getByRole('heading', { name: 'Slow dough.' })).toBeInTheDocument()
    expect(screen.getByText('48 hours.')).toBeInTheDocument()
  })
})
