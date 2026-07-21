import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DiscoverProductUnit } from './DiscoverProductUnit'

const product = {
  id: 1,
  slug: 'ghe-lounge',
  name: 'Ghế lounge',
  base_price: 3200000,
  thumbnail: 'https://example.com/lounge.jpg',
  attributes: { 'Chất liệu': 'Gỗ sồi' },
}

describe('DiscoverProductUnit', () => {
  it('keeps comparison essentials visible at rest', () => {
    render(<DiscoverProductUnit product={product} />, { wrapper: MemoryRouter })

    const unit = screen.getByTestId('discover-product-unit')
    expect(within(unit).getByRole('link', { name: 'Ghế lounge' })).toHaveAttribute('href', '/p/ghe-lounge')
    expect(within(unit).getByText('Từ 3.200.000 ₫')).toBeInTheDocument()
    expect(within(unit).getByText('Chất liệu: Gỗ sồi')).toBeInTheDocument()
    expect(within(unit).getByRole('link', { name: /Chọn phiên bản Ghế lounge/ })).toBeInTheDocument()
  })

  it('keeps a stable card when no differentiator is available', () => {
    render(<DiscoverProductUnit product={{ ...product, attributes: null }} />, { wrapper: MemoryRouter })
    expect(screen.getByText('Từ 3.200.000 ₫')).toBeInTheDocument()
    expect(screen.queryByText(/Chất liệu:/)).not.toBeInTheDocument()
  })
})
