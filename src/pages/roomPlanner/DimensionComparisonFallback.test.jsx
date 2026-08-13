import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { DimensionComparisonFallback } from './DimensionComparisonFallback'

it('provides a real sizing comparison without overstating visual fidelity', () => {
  render(<DimensionComparisonFallback room={{ width: 4, depth: 5 }} items={[{ localId: 1, variant: { name: 'Sofa' }, footprint: { x: 2, z: 1 }, footprintConfirmed: true }]} />)
  expect(screen.getByText('Sofa')).toBeInTheDocument()
  expect(screen.getByText('10% mặt sàn')).toBeInTheDocument()
  expect(screen.getByText(/kích thước và màu sắc trên màn hình giúp bạn hình dung trước/i)).toBeInTheDocument()
})

it('does not present the provisional one-metre footprint as a real measurement', () => {
  render(<DimensionComparisonFallback room={{ width: 4, depth: 5 }} items={[{ localId: 1, variant: { name: 'Sofa' }, footprint: { x: 1, z: 1 }, footprintConfirmed: false }]} />)
  expect(screen.getByText(/kích thước của món này chưa được xác nhận/i)).toBeInTheDocument()
  expect(screen.queryByText('5% mặt sàn')).not.toBeInTheDocument()
})
