import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductCard } from './ProductCard'

describe('ProductCard', () => {
  it('renders the product name, formatted price, category, and links to the product page', () => {
    render(
      <ProductCard
        product={{
          id: 1,
          slug: 'ghe-sofa-da',
          name: 'Ghế sofa da',
          base_price: 5990000,
          thumbnail: 'https://example.com/sofa.jpg',
          category: { id: 1, name: 'Phòng khách', slug: 'phong-khach' },
        }}
      />,
      { wrapper: MemoryRouter },
    )

    expect(screen.getByRole('link', { name: /Ghế sofa da/ })).toHaveAttribute('href', '/p/ghe-sofa-da')
    expect(screen.getByText('Ghế sofa da')).toBeInTheDocument()
    expect(screen.getByText('5.990.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('Phòng khách')).toBeInTheDocument()
  })
})
