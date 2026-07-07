import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MiniBarChart } from '../MiniBarChart'

function makeData(n: number, fill = 0) {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, '0')}`,
    count: fill,
  }))
}

describe('MiniBarChart', () => {
  it('renders one rect per data point', () => {
    const data = makeData(7, 3)
    const { container } = render(<MiniBarChart data={data} />)
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(7)
  })

  it('handles all-zero data without throwing', () => {
    const data = makeData(30, 0)
    expect(() => render(<MiniBarChart data={data} />)).not.toThrow()
  })

  it('handles empty data array without throwing', () => {
    expect(() => render(<MiniBarChart data={[]} />)).not.toThrow()
  })

  it('sets an aria-label on the svg', () => {
    const data = [
      { date: '2026-06-01', count: 2 },
      { date: '2026-06-02', count: 5 },
    ]
    render(<MiniBarChart data={data} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
    expect(svg.getAttribute('aria-label')).toMatch(/order clicks per day/i)
  })

  it('aria-label mentions peak count', () => {
    const data = [
      { date: '2026-06-01', count: 4 },
      { date: '2026-06-02', count: 9 },
      { date: '2026-06-03', count: 2 },
    ]
    render(<MiniBarChart data={data} />)
    const svg = screen.getByRole('img')
    expect(svg.getAttribute('aria-label')).toMatch(/peak 9/)
  })

  it('each bar has a tooltip title', () => {
    const data = [{ date: '2026-06-20', count: 4 }]
    const { container } = render(<MiniBarChart data={data} />)
    const titles = container.querySelectorAll('rect title')
    expect(titles.length).toBe(1)
    expect(titles[0].textContent).toMatch(/2026-06-20/)
    expect(titles[0].textContent).toMatch(/4 click/)
  })
})
