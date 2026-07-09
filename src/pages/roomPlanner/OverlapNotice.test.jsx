import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OverlapNotice } from './OverlapNotice'

const solid = (localId, x) => ({
  localId,
  position: { x, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  footprint: { x: 2, y: 1, z: 1 },
})

describe('OverlapNotice', () => {
  it('không có chồng lấn → không hiện gì', () => {
    const { container } = render(<OverlapNotice items={[solid(1, 0), solid(2, 9)]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('có chồng lấn → hiện nhắc điềm tĩnh với số lượng', () => {
    render(<OverlapNotice items={[solid(1, 0), solid(2, 1)]} />)
    expect(screen.getByText(/chồng lên nhau/i)).toBeInTheDocument()
    expect(screen.getByText(/^2 món/)).toBeInTheDocument()
  })

  it('items rỗng → không hiện gì', () => {
    const { container } = render(<OverlapNotice items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
