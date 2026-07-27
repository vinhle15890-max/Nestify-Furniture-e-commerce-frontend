import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ProductCard } from './ProductCard'
import * as wishlistApi from '../features/wishlist/api'
import { useAuthStore } from '../store/authStore'

vi.mock('../features/wishlist/api')

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

function renderCard(product) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/c/phong-khach']}>
        <Routes>
          <Route path="*" element={<><ProductCard product={product} /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const product = {
  id: 1,
  slug: 'ghe-sofa-da',
  name: 'Ghế sofa da',
  base_price: 5990000,
  thumbnail: 'https://example.com/sofa.jpg',
  category: { id: 1, name: 'Phòng khách', slug: 'phong-khach' },
  variants: [
    { id: 43, price: 6990000, is_active: true },
    { id: 42, price: 5990000, is_active: true },
  ],
}

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, user: null })
  })

  it('renders the product name, formatted price, and links to the product page', () => {
    renderCard(product)

    expect(screen.getByRole('link', { name: /Ghế sofa da/ })).toHaveAttribute('href', '/p/ghe-sofa-da')
    expect(screen.getByText('Ghế sofa da')).toBeInTheDocument()
    expect(screen.getByText('5.990.000 ₫')).toBeInTheDocument()
  })

  it('adds to the wishlist directly from the catalog card without navigating', async () => {
    useAuthStore.setState({ token: 'customer-token', user: { id: 7, roles: ['customer'] } })
    wishlistApi.addItem.mockResolvedValue({ data: { id: 9 } })
    renderCard(product)

    await userEvent.click(screen.getByRole('button', { name: 'Thêm Ghế sofa da vào yêu thích' }))

    await waitFor(() => expect(wishlistApi.addItem).toHaveBeenCalledWith({ variant_id: 42 }))
    expect(screen.getByTestId('location')).toHaveTextContent('/c/phong-khach')
  })
})
