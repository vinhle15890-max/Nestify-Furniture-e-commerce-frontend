import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProductPage } from './ProductPage'
import * as catalogApi from '../../features/catalog/api'
import * as cartApi from '../../features/cart/api'
import * as wishlistApi from '../../features/wishlist/api'
import { useAuthStore } from '../../store/authStore'
import { ApiError } from '../../lib/errors'

vi.mock('../../features/catalog/api')
vi.mock('../../features/cart/api')
vi.mock('../../features/wishlist/api')

function renderPage(slug = 'ghe-sofa-da') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/p/${slug}`]}>
        <Routes>
          <Route path="/p/:productSlug" element={<ProductPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const productResponse = {
  data: {
    id: 1,
    slug: 'ghe-sofa-da',
    name: 'Ghế sofa da',
    description: '<p>Mô tả <strong>sofa</strong></p><script>alert(1)</script>',
    base_price: 5000000,
    attributes: {},
    status: 'published',
    thumbnail: null,
    category: { id: 1, name: 'Phòng khách', slug: 'phong-khach' },
    created_at: '2026-01-01T00:00:00Z',
    variants: [
      {
        id: 1,
        sku: 'SOFA-NAU',
        name: 'Nâu',
        attributes: {},
        price: 5000000,
        available_stock: 5,
        model_3d_url: null,
        is_active: true,
      },
      {
        id: 2,
        sku: 'SOFA-XAM',
        name: 'Xám',
        attributes: {},
        price: 5500000,
        available_stock: 0,
        model_3d_url: null,
        is_active: true,
      },
    ],
    media: [
      { id: 1, product_id: 1, url: 'https://example.com/1.jpg', type: 'image', sort_order: 2 },
      { id: 2, product_id: 1, url: 'https://example.com/2.jpg', type: 'image', sort_order: 1 },
    ],
  },
}

const reviewsResponse = {
  data: [
    {
      id: 1,
      rating: 5,
      title: 'Tuyệt vời',
      body: 'Rất hài lòng với sản phẩm',
      status: 'approved',
      user: { id: 1, name: 'Bao' },
      comments: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  meta: { pagination: { has_more: false, next_cursor: null, limit: 20 } },
}

describe('ProductPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao', roles: ['customer'] } })
    catalogApi.getProduct.mockResolvedValue(productResponse)
    catalogApi.getProductReviews.mockResolvedValue(reviewsResponse)
    cartApi.addItem.mockResolvedValue({ data: { id: 1, items: [], total: 0 } })
    wishlistApi.addItem.mockResolvedValue({ data: { id: 1 } })
  })

  it('renders product details, sanitized description, and approved reviews', async () => {
    const { container } = renderPage()

    expect(await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('5.000.000 ₫')).toBeInTheDocument()
    expect(container.querySelector('strong')?.textContent).toBe('sofa')
    expect(container.querySelector('script')).toBeNull()
    expect(await screen.findByText('Rất hài lòng với sản phẩm')).toBeInTheDocument()
  })

  it('updates the price, stock, and add-to-cart state when a different variant is selected', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    expect(screen.getByText('Còn 5 sản phẩm')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm vào giỏ' })).toBeEnabled()

    await userEvent.click(screen.getByRole('button', { name: 'Xám' }))

    expect(screen.getByText('5.500.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('Hết hàng')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm vào giỏ' })).toBeDisabled()
  })

  it('adds the selected variant to the cart', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào giỏ' }))

    expect(cartApi.addItem).toHaveBeenCalledWith({ variant_id: 1, quantity: 1 })
  })

  it('shows an inline message and clamps quantity on insufficient stock', async () => {
    cartApi.addItem.mockRejectedValue(
      new ApiError('INSUFFICIENT_STOCK', 'Không đủ hàng trong kho', { variant_id: 1, requested: 1, available: 2 }, 409),
    )
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào giỏ' }))

    expect(await screen.findByText('Chỉ còn 2 sản phẩm trong kho')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Số lượng' })).toHaveValue(2)
  })

  it('adds the selected variant to the wishlist', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào yêu thích' }))

    expect(wishlistApi.addItem).toHaveBeenCalledWith({ variant_id: 1 })
  })
})
