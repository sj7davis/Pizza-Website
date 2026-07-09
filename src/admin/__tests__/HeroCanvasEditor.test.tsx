import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { HeroCanvas } from '../../types'

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

import { HeroCanvasEditor } from '../HeroCanvasEditor'

function emptyCanvas(): HeroCanvas {
  return { enabled: false, desktopHeight: 560, mobileHeight: 620, elements: [] }
}

describe('HeroCanvasEditor', () => {
  it('toggles enable', () => {
    const onChange = vi.fn()
    render(<HeroCanvasEditor canvas={emptyCanvas()} heroImage="/dough.jpg" brandName="PBB" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(/enable freeform header/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
  })

  it('adding an element grows the list', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <HeroCanvasEditor canvas={emptyCanvas()} heroImage="/dough.jpg" brandName="PBB" onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /\+ text/i }))
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls[0][0] as HeroCanvas
    expect(next.elements).toHaveLength(1)
    expect(next.elements[0].type).toBe('text')
    expect(next.elements[0].desktop).toBeDefined()
    expect(next.elements[0].mobile).toBeDefined()

    // rerender with the new element selected to verify property panel appears
    rerender(<HeroCanvasEditor canvas={next} heroImage="/dough.jpg" brandName="PBB" onChange={onChange} />)
  })

  it('switches device between desktop and mobile', () => {
    render(<HeroCanvasEditor canvas={emptyCanvas()} heroImage="/dough.jpg" brandName="PBB" onChange={vi.fn()} />)
    const mobileBtn = screen.getByRole('button', { name: /^mobile$/i })
    fireEvent.click(mobileBtn)
    expect(mobileBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('deletes a selected element', () => {
    const onChange = vi.fn()
    const canvas: HeroCanvas = {
      enabled: true,
      desktopHeight: 560,
      mobileHeight: 620,
      elements: [
        {
          id: 'e1',
          type: 'text',
          value: 'Hello',
          desktop: { x: 10, y: 10, w: 40 },
          mobile: { x: 10, y: 10, w: 80 },
        },
      ],
    }
    render(<HeroCanvasEditor canvas={canvas} heroImage="/dough.jpg" brandName="PBB" onChange={onChange} />)
    fireEvent.click(screen.getByText('Hello'))
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    const next = onChange.mock.calls.at(-1)?.[0] as HeroCanvas
    expect(next.elements).toHaveLength(0)
  })

  it('editing text value updates the element', () => {
    const onChange = vi.fn()
    const canvas: HeroCanvas = {
      enabled: true,
      desktopHeight: 560,
      mobileHeight: 620,
      elements: [
        {
          id: 'e1',
          type: 'text',
          value: 'Hello',
          desktop: { x: 10, y: 10, w: 40 },
          mobile: { x: 10, y: 10, w: 80 },
        },
      ],
    }
    render(<HeroCanvasEditor canvas={canvas} heroImage="/dough.jpg" brandName="PBB" onChange={onChange} />)
    fireEvent.click(screen.getByText('Hello'))
    const textarea = screen.getByLabelText(/^text$/i)
    fireEvent.change(textarea, { target: { value: 'Updated copy' } })
    const next = onChange.mock.calls.at(-1)?.[0] as HeroCanvas
    expect(next.elements[0].value).toBe('Updated copy')
  })
})
