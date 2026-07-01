import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Package } from 'lucide-react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders a brand illustration when `illustration` is given', () => {
    const { container } = render(
      <EmptyState illustration="sofa" title="Chưa có sản phẩm nào" description="Thêm sản phẩm đầu tiên." />,
    )
    const svg = container.querySelector('svg.animate-rise')
    expect(svg).toBeTruthy()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Chưa có sản phẩm nào')).toBeInTheDocument()
  })

  it('falls back to the lucide icon circle when no illustration is given', () => {
    const { container } = render(<EmptyState icon={Package} title="Trống" />)
    // lucide icons render an svg, but without the brand animation class
    expect(container.querySelector('svg.animate-rise')).toBeNull()
    expect(container.querySelector('svg')).toBeTruthy()
    expect(screen.getByText('Trống')).toBeInTheDocument()
  })
})
