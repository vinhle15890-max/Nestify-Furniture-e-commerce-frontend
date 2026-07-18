import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScaleLegend } from './ScaleLegend'

describe('ScaleLegend', () => {
  it('hiện kích thước phòng + 1 ô = 1 m', () => {
    render(<ScaleLegend room={{ width: 4, depth: 5, height: 2.8 }} />)
    expect(screen.getByText(/Phòng 4 × 5 × 2\.8 m/)).toBeInTheDocument()
    expect(screen.getByText(/1 ô = 1 m/)).toBeInTheDocument()
  })
})
