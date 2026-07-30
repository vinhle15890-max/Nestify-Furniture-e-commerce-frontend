import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { DimensionComparisonFallback } from './DimensionComparisonFallback'

it('provides a real sizing comparison without overstating visual fidelity', () => {
  render(<DimensionComparisonFallback room={{ width: 4, depth: 5 }} items={[{ localId: 1, variant: { name: 'Sofa' }, footprint: { x: 2, z: 1 } }]} />)
  expect(screen.getByText('Sofa')).toBeInTheDocument()
  expect(screen.getByText('10% mặt sàn')).toBeInTheDocument()
  expect(screen.getByText(/kích thước và màu sắc trên màn hình giúp bạn hình dung trước/i)).toBeInTheDocument()
})
