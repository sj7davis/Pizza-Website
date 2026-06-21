import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SaveStatus } from '../SaveStatus'

describe('SaveStatus', () => {
  it('shows nothing when idle', () => {
    const { container } = render(<SaveStatus state={{ status: 'idle' }} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('shows saving / saved / error', () => {
    const { rerender } = render(<SaveStatus state={{ status: 'saving' }} />)
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
    rerender(<SaveStatus state={{ status: 'saved' }} />)
    expect(screen.getByText(/saved/i)).toBeInTheDocument()
    rerender(<SaveStatus state={{ status: 'error', message: 'Could not save' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save')
  })
})
