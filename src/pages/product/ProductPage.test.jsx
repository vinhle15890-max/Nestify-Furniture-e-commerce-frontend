import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
import { useToastStore } from '../../store/toastStore'
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
    useToastStore.setState({ toasts: [] })
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

  it('uses safe Vietnamese copy when add-to-cart loses its network connection', async () => {
    cartApi.addItem.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào giỏ' }))

    await waitFor(() => {
      expect(useToastStore.getState().toasts.at(-1)).toEqual(expect.objectContaining({
        title: 'Không thể thêm vào giỏ hàng',
        description: 'Đã có lỗi kết nối mạng. Vui lòng thử lại.',
        variant: 'error',
      }))
    })
  })

  it('opens the Planner Preview from the primary "Xem trong không gian" CTA', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    // Primary CTA is the seeing-first action, not add-to-cart.
    await userEvent.click(screen.getByRole('button', { name: 'Xem trong không gian' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Xem trong không gian')).toBeInTheDocument()
    // A variant is selected by default → Continue is enabled (deep-link ready).
    expect(within(dialog).getByRole('button', { name: /Tiếp tục trong Room Planner/ })).toBeEnabled()
    // This product has 2 variants → honest "image may differ" disclaimer shows.
    expect(within(dialog).getByText(/có thể khác với màu\/chất liệu/i)).toBeInTheDocument()
  })

  it('enables Continue for a single-variant product without any selection', async () => {
    // One implicit variant, no option-selection UI → selectedVariant must
    // default to variants[0] so Continue is never disabled forever.
    catalogApi.getProduct.mockResolvedValue({
      data: { ...productResponse.data, variant_options: [], variants: [productResponse.data.variants[0]] },
    })
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Xem trong không gian' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /Tiếp tục trong Room Planner/ })).toBeEnabled()
  })

  it('filters the gallery to the selected variant + shared media, hiding other variants', async () => {
    catalogApi.getProduct.mockResolvedValue({
      data: {
        ...productResponse.data,
        media: [
          { id: 1, product_id: 1, variant_id: 1, url: 'https://example.com/nau.jpg', type: 'image', sort_order: 1 },
          { id: 2, product_id: 1, variant_id: 2, url: 'https://example.com/xam.jpg', type: 'image', sort_order: 2 },
          { id: 3, product_id: 1, variant_id: null, url: 'https://example.com/shared.jpg', type: 'image', sort_order: 3 },
        ],
      },
    })
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    // Default variant Nâu (id 1): active image = its own; thumbnails = nau + shared (xam hidden).
    expect(screen.getByAltText('Ghế sofa da')).toHaveAttribute('src', 'https://example.com/nau.jpg')
    expect(screen.getAllByRole('button', { name: /Xem ảnh/ })).toHaveLength(2)

    // Switch to Xám (id 2): active image switches, xam now visible, nau hidden.
    await userEvent.click(screen.getByRole('button', { name: 'Xám' }))
    expect(screen.getByAltText('Ghế sofa da')).toHaveAttribute('src', 'https://example.com/xam.jpg')
    expect(screen.getAllByRole('button', { name: /Xem ảnh/ })).toHaveLength(2)
  })

  it('Preview uses the variant image and drops the disclaimer when the variant has one', async () => {
    catalogApi.getProduct.mockResolvedValue({
      data: {
        ...productResponse.data,
        media: [
          { id: 1, product_id: 1, variant_id: 1, url: 'https://example.com/nau.jpg', type: 'image', sort_order: 1 },
          { id: 3, product_id: 1, variant_id: null, url: 'https://example.com/shared.jpg', type: 'image', sort_order: 2 },
        ],
      },
    })
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Xem trong không gian' }))
    const dialog = await screen.findByRole('dialog')
    // Variant Nâu has its own image → Preview shows it, no fallback disclaimer.
    expect(within(dialog).getByAltText('Ghế sofa da')).toHaveAttribute('src', 'https://example.com/nau.jpg')
    expect(within(dialog).queryByText(/có thể khác với màu\/chất liệu/i)).not.toBeInTheDocument()
  })

  it('Preview falls back to shared image and keeps the disclaimer when the variant has none', async () => {
    catalogApi.getProduct.mockResolvedValue({
      data: {
        ...productResponse.data,
        media: [
          { id: 3, product_id: 1, variant_id: null, url: 'https://example.com/shared.jpg', type: 'image', sort_order: 1 },
        ],
      },
    })
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Xem trong không gian' }))
    const dialog = await screen.findByRole('dialog')
    // Selected variant has no tagged image → fallback shared image + disclaimer stays.
    expect(within(dialog).getByAltText('Ghế sofa da')).toHaveAttribute('src', 'https://example.com/shared.jpg')
    expect(within(dialog).getByText(/có thể khác với màu\/chất liệu/i)).toBeInTheDocument()
  })

  it('exposes the Planner Preview to guests (no login required to see it first)', async () => {
    useAuthStore.setState({ token: null, user: null })
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    expect(screen.getByRole('button', { name: 'Xem trong không gian' })).toBeEnabled()
    // Purchase path for guests is still the login link, not add-to-cart.
    expect(screen.queryByRole('button', { name: 'Thêm vào giỏ' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Đăng nhập để mua hàng' })).toBeInTheDocument()
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

    expect(await screen.findByText('Kho chỉ đủ 2 sản phẩm cho lựa chọn này')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Số lượng' })).toHaveValue(2)
  })

  it('adds the selected variant to the wishlist', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào yêu thích' }))

    expect(wishlistApi.addItem).toHaveBeenCalledWith({ variant_id: 1 })
  })

  it('uses safe Vietnamese copy when adding to the wishlist loses its connection', async () => {
    wishlistApi.addItem.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào yêu thích' }))

    await waitFor(() => {
      expect(useToastStore.getState().toasts.at(-1)?.description).toBe(
        'Đã có lỗi kết nối mạng. Vui lòng thử lại.',
      )
    })
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

  it('uses safe Vietnamese copy when removing from the wishlist loses its connection', async () => {
    wishlistApi.getWishlist.mockResolvedValue({ data: { items: [{ id: 77, variant: { id: 1 } }] } })
    wishlistApi.removeItem.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ khỏi yêu thích' }))

    await waitFor(() => {
      expect(useToastStore.getState().toasts.at(-1)?.description).toBe(
        'Đã có lỗi kết nối mạng. Vui lòng thử lại.',
      )
    })
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

  // A verified purchase unlocks the review form for these tests.
  function withVerifiedOrder() {
    ordersApi.getOrders.mockResolvedValue({
      data: [
        {
          id: 55,
          status: 'delivered',
          items: [{ id: 1, variant_id: 1, variant_snapshot: {}, quantity: 1, unit_price: 5000000, subtotal: 5000000 }],
        },
      ],
    })
  }

  it('maps a 422 review error to the body field without losing the entered text', async () => {
    withVerifiedOrder()
    reviewsApi.createReview.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ.', { fields: { body: ['Nội dung đánh giá phải có ít nhất 10 ký tự.'] } }, 422),
    )
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(await screen.findByRole('button', { name: 'Đánh giá 5 sao' }))
    const bodyInput = screen.getByLabelText('Nội dung đánh giá')
    await userEvent.type(bodyInput, 'Ngắn')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))

    expect(await screen.findByText('Nội dung đánh giá phải có ít nhất 10 ký tự.')).toBeInTheDocument()
    expect(bodyInput).toHaveAttribute('aria-invalid', 'true')
    expect(bodyInput).toHaveValue('Ngắn')
    expect(screen.queryByText(/đang chờ kiểm duyệt/)).not.toBeInTheDocument()
  })

  it('shows a friendly message and retains the review when the user is not a verified purchase (403)', async () => {
    withVerifiedOrder()
    reviewsApi.createReview.mockRejectedValue(new ApiError('FORBIDDEN', 'Bạn chỉ được đánh giá sản phẩm đã nhận hàng.', null, 403))
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(await screen.findByRole('button', { name: 'Đánh giá 5 sao' }))
    const bodyInput = screen.getByLabelText('Nội dung đánh giá')
    await userEvent.type(bodyInput, 'Rất tốt sản phẩm')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))

    expect(await screen.findByText('Bạn chỉ được đánh giá sản phẩm đã nhận hàng.')).toBeInTheDocument()
    expect(bodyInput).toHaveValue('Rất tốt sản phẩm')
    expect(screen.queryByText(/đang chờ kiểm duyệt/)).not.toBeInTheDocument()
  })

  it('shows a friendly Vietnamese message (not raw axios text) on a review network error', async () => {
    withVerifiedOrder()
    reviewsApi.createReview.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(await screen.findByRole('button', { name: 'Đánh giá 5 sao' }))
    await userEvent.type(screen.getByLabelText('Nội dung đánh giá'), 'Rất tốt sản phẩm')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))

    expect(await screen.findByText('Đã có lỗi kết nối mạng. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.queryByText('Network Error')).not.toBeInTheDocument()
  })

  it('shows pending copy and blocks a duplicate review submit while in flight', async () => {
    withVerifiedOrder()
    let resolveReview
    reviewsApi.createReview.mockReturnValue(
      new Promise((resolve) => {
        resolveReview = resolve
      }),
    )
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    await userEvent.click(await screen.findByRole('button', { name: 'Đánh giá 5 sao' }))
    await userEvent.type(screen.getByLabelText('Nội dung đánh giá'), 'Rất tốt sản phẩm')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))

    const pendingButton = await screen.findByRole('button', { name: 'Đang gửi…' })
    expect(pendingButton).toBeDisabled()
    await userEvent.click(pendingButton)
    expect(reviewsApi.createReview).toHaveBeenCalledTimes(1)

    resolveReview({ data: { id: 10, status: 'pending' } })
    await screen.findByText(/đang chờ kiểm duyệt/)
  })

  it('does not let a comment fail silently — shows an inline alert and retains the draft on a 422', async () => {
    reviewsApi.createComment.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ.', { fields: { body: ['Bình luận phải có ít nhất 3 ký tự.'] } }, 422),
    )
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    const commentBox = await screen.findByLabelText('Bình luận')
    await userEvent.type(commentBox, 'a')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }))

    expect(await screen.findByText('Bình luận phải có ít nhất 3 ký tự.')).toBeInTheDocument()
    expect(commentBox).toHaveAttribute('aria-invalid', 'true')
    expect(commentBox).toHaveValue('a')
  })

  it('does not let a comment fail silently — shows a friendly alert on a network error', async () => {
    reviewsApi.createComment.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    const commentBox = await screen.findByLabelText('Bình luận')
    await userEvent.type(commentBox, 'Cảm ơn')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }))

    expect(await screen.findByText('Đã có lỗi kết nối mạng. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.queryByText('Network Error')).not.toBeInTheDocument()
    expect(commentBox).toHaveValue('Cảm ơn')
  })

  it('shows pending copy and blocks a duplicate comment submit while in flight', async () => {
    let resolveComment
    reviewsApi.createComment.mockReturnValue(
      new Promise((resolve) => {
        resolveComment = resolve
      }),
    )
    renderPage()
    await screen.findByRole('heading', { name: 'Ghế sofa da', level: 1 })

    const commentBox = await screen.findByLabelText('Bình luận')
    await userEvent.type(commentBox, 'Cảm ơn')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }))

    expect(await screen.findByRole('button', { name: 'Đang gửi…' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Đang gửi…' }))
    expect(reviewsApi.createComment).toHaveBeenCalledTimes(1)

    resolveComment({ data: { id: 2, body: 'Cảm ơn', user: { id: 1, name: 'Bao' }, created_at: '2026-01-03T00:00:00Z' } })
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
