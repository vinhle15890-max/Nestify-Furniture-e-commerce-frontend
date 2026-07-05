import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProductPage } from './ProductPage'
import * as catalogApi from '../../features/catalog/api'
import * as cartApi from '../../features/cart/api'
import * as wishlistApi from '../../features/wishlist/api'
import * as ordersApi from '../../features/orders/api'
import * as reviewsApi from '../../features/reviews/api'
import * as personalizationHooks from '../../features/personalization/hooks'
import { useAuthStore } from '../../store/authStore'
import { ApiError } from '../../lib/errors'

vi.mock('../../features/catalog/api')
vi.mock('../../features/cart/api')
vi.mock('../../features/wishlist/api')
vi.mock('../../features/orders/api')
vi.mock('../../features/reviews/api')
vi.mock('../../features/personalization/hooks')

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
      comments: [
        { id: 1, body: 'Đồng ý!', user: { id: 2, name: 'Lan' }, created_at: '2026-01-02T00:00:00Z' },
      ],
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
    catalogApi.getCategories.mockResolvedValue({ data: [] })
    cartApi.addItem.mockResolvedValue({ data: { id: 1, items: [], total: 0 } })
    wishlistApi.addItem.mockResolvedValue({ data: { id: 1 } })
    wishlistApi.removeItem.mockResolvedValue({})
    wishlistApi.getWishlist.mockResolvedValue({ data: { items: [] } })
    ordersApi.getOrders.mockResolvedValue({ data: [] })
    personalizationHooks.useRecordProductView.mockReturnValue({ mutate: vi.fn() })
    personalizationHooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
  })

  it('renders product details, sanitized description, and approved reviews', async () => {
    const { container } = renderPage()

    expect(await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('5.000.000 ₫')).toBeInTheDocument()
    expect(container.querySelector('strong')?.textContent).toBe('sofa')
    expect(container.querySelector('script')).toBeNull()
    expect(await screen.findByText('Rất hài lòng với sản phẩm')).toBeInTheDocument()
  })

  it('sets SEO document title, meta description, and Product JSON-LD', async () => {
    catalogApi.getProduct.mockResolvedValue({
      data: {
        ...productResponse.data,
        meta_title: 'Ghế sofa da bò Ý | Nestify',
        meta_description: 'Ghế sofa da bò Ý cao cấp, bảo hành 5 năm. Mua ngay tại Nestify.',
      },
    })

    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    expect(document.title).toBe('Ghế sofa da bò Ý | Nestify')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('bảo hành 5 năm')

    const ld = document.querySelector('script[type="application/ld+json"][data-nestify-seo]')
    expect(ld).not.toBeNull()
    const data = JSON.parse(ld.textContent)
    expect(data['@type']).toBe('Product')
    expect(data.offers.price).toBe(5000000)
    expect(data.offers.priceCurrency).toBe('VND')
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

  it('hides the add-to-cart button and shows a notice for staff users', async () => {
    useAuthStore.setState({ token: 'abc', user: { id: 9, name: 'Admin', roles: ['super_admin'] } })
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    expect(screen.queryByRole('button', { name: 'Thêm vào giỏ' })).not.toBeInTheDocument()
    expect(screen.getByText('Tài khoản quản trị không thể mua hàng.')).toBeInTheDocument()
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

  it('reflects that the selected variant is already in the wishlist', async () => {
    wishlistApi.getWishlist.mockResolvedValue({ data: { items: [{ id: 77, variant: { id: 1 } }] } })
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    // The button flips to an "already saved" state (pressed + remove label).
    const button = await screen.findByRole('button', { name: 'Bỏ khỏi yêu thích' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Thêm vào yêu thích' })).not.toBeInTheDocument()
  })

  it('removes the variant from the wishlist when the saved button is clicked', async () => {
    wishlistApi.getWishlist.mockResolvedValue({ data: { items: [{ id: 77, variant: { id: 1 } }] } })
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ khỏi yêu thích' }))

    expect(wishlistApi.removeItem).toHaveBeenCalledWith(77)
    expect(wishlistApi.addItem).not.toHaveBeenCalled()
  })

  it('does not show a review form without a delivered order containing this product', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    expect(screen.queryByRole('button', { name: 'Gửi đánh giá' })).not.toBeInTheDocument()
  })

  it('shows a review form for a verified purchase and submits a pending review', async () => {
    ordersApi.getOrders.mockResolvedValue({
      data: [
        {
          id: 55,
          status: 'delivered',
          items: [{ id: 1, variant_id: 1, variant_snapshot: {}, quantity: 1, unit_price: 5000000, subtotal: 5000000 }],
        },
      ],
    })
    reviewsApi.createReview.mockResolvedValue({ data: { id: 10, status: 'pending' } })

    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(await screen.findByRole('button', { name: 'Đánh giá 5 sao' }))
    await userEvent.type(screen.getByLabelText('Nội dung đánh giá'), 'Rất tốt')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))

    expect(reviewsApi.createReview).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ order_id: 55, rating: 5, body: 'Rất tốt' }),
    )
    expect(await screen.findByText(/đang chờ kiểm duyệt/)).toBeInTheDocument()
  })

  it('renders existing comments and submits a new comment', async () => {
    reviewsApi.createComment.mockResolvedValue({ data: { id: 2, body: 'Cảm ơn', user: { id: 1, name: 'Bao' }, created_at: '2026-01-03T00:00:00Z' } })

    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    expect(await screen.findByText('Đồng ý!')).toBeInTheDocument()
    expect(screen.getByText('Lan', { exact: false })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Bình luận'), 'Cảm ơn')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }))

    expect(reviewsApi.createComment).toHaveBeenCalledWith(1, 'Cảm ơn')
  })

  it('records a product view for a logged-in customer', async () => {
    const mutate = vi.fn()
    personalizationHooks.useRecordProductView.mockReturnValue({ mutate })
    personalizationHooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
    useAuthStore.setState({ token: 't', user: { name: 'Bảo', roles: ['customer'] } })

    renderPage('ghe-sofa-da')

    await waitFor(() => expect(mutate).toHaveBeenCalledWith('ghe-sofa-da'))
  })

  it('does not record a view for a guest', async () => {
    const mutate = vi.fn()
    personalizationHooks.useRecordProductView.mockReturnValue({ mutate })
    personalizationHooks.useRecentlyViewed.mockReturnValue({ data: { data: [] } })
    useAuthStore.setState({ token: null, user: null })

    renderPage('ghe-sofa-da')

    await new Promise((r) => setTimeout(r, 0))
    expect(mutate).not.toHaveBeenCalled()
  })
})
