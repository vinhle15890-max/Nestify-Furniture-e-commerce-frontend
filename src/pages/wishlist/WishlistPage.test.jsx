import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { WishlistPage } from './WishlistPage'
import * as wishlistApi from '../../features/wishlist/api'
import { ApiError } from '../../lib/errors'

vi.mock('../../features/wishlist/api')

const sampleWishlist = {
  data: {
    id: 1,
    items: [
      {
        id: 20,
        variant: {
          id: 1,
          sku: 'SOFA-NAU',
          name: 'Nâu / 2 chỗ',
          product_name: 'Sofa Mây',
          product_slug: 'sofa-may',
          thumbnail: 'https://example.com/sofa.jpg',
          attributes: { 'Màu sắc': 'Nâu', 'Kích thước': '2 chỗ' },
          price: 5000000,
          available_stock: 5,
          model_3d_url: 'https://example.com/sofa.glb',
          is_active: true,
        },
        notify_on_restock: false,
        added_at: '2026-01-01T00:00:00Z',
      },
    ],
  },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('WishlistPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    wishlistApi.getWishlist.mockResolvedValue(sampleWishlist)
  })

  it('renders wishlist items', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Những lựa chọn đang cân nhắc' })).toBeInTheDocument()
    expect(screen.getByText('1 lựa chọn cho căn phòng')).toBeInTheDocument()
    expect(screen.getByText('Sofa Mây')).toBeInTheDocument()
    expect(await screen.findByText(/Nâu \/ 2 chỗ/)).toBeInTheDocument()
    expect(screen.queryByText(/SOFA-NAU/)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Báo khi còn hàng' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Thử trong phòng' })).toHaveAttribute(
      'href',
      '/room-planner?product=sofa-may&variant=1',
    )
  })

  it('shows the distinguishing attributes of the variant stored on the wishlist item', async () => {
    renderPage()

    const savedVariant = await screen.findByLabelText('Biến thể đã lưu')
    expect(within(savedVariant).getByText('Màu sắc')).toBeInTheDocument()
    expect(within(savedVariant).getByText('Nâu')).toBeInTheDocument()
    expect(within(savedVariant).getByText('Kích thước')).toBeInTheDocument()
    expect(within(savedVariant).getByText('2 chỗ')).toBeInTheDocument()
  })

  it('shows a retryable failure instead of an empty wishlist', async () => {
    wishlistApi.getWishlist
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(sampleWishlist)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể tải các lựa chọn đã lưu')
    expect(screen.queryByText(/Chưa có món nào được lưu/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText(/Nâu \/ 2 chỗ/)).toBeInTheDocument()
    expect(wishlistApi.getWishlist).toHaveBeenCalledTimes(2)
  })

  it('toggles the restock notification', async () => {
    const outOfStockItem = {
      ...sampleWishlist.data.items[0],
      variant: { ...sampleWishlist.data.items[0].variant, available_stock: 0 },
    }
    wishlistApi.getWishlist.mockResolvedValue({ data: { id: 1, items: [outOfStockItem] } })
    wishlistApi.updateItem.mockResolvedValue({ data: { ...outOfStockItem, notify_on_restock: true } })
    renderPage()

    await screen.findByText(/Nâu \/ 2 chỗ/)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Báo khi còn hàng' }))

    expect(wishlistApi.updateItem).toHaveBeenCalledWith(20, { notify_on_restock: true })
    expect(screen.getByRole('button', { name: 'Chuyển vào giỏ' })).toBeDisabled()
  })

  it('keeps a deactivated variant visible but blocks purchase actions', async () => {
    const inactiveItem = {
      ...sampleWishlist.data.items[0],
      variant: { ...sampleWishlist.data.items[0].variant, is_active: false, available_stock: 5 },
    }
    wishlistApi.getWishlist.mockResolvedValue({ data: { id: 1, items: [inactiveItem] } })
    renderPage()

    expect(await screen.findByText('Phiên bản đã dừng bán')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chuyển vào giỏ' })).toBeDisabled()
    expect(screen.queryByRole('checkbox', { name: 'Báo khi còn hàng' })).not.toBeInTheDocument()
  })

  it('removes an item from the wishlist', async () => {
    wishlistApi.removeItem.mockResolvedValue({})
    renderPage()

    await screen.findByText(/Nâu \/ 2 chỗ/)
    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }))

    expect(wishlistApi.removeItem).toHaveBeenCalledWith(20)
  })

  it('moves an item to the cart', async () => {
    wishlistApi.moveToCart.mockResolvedValue({ data: { message: 'OK' } })
    renderPage()

    await screen.findByText(/Nâu \/ 2 chỗ/)
    await userEvent.click(screen.getByRole('button', { name: 'Chuyển vào giỏ' }))

    await waitFor(() => expect(wishlistApi.moveToCart).toHaveBeenCalledWith(20))
  })

  it('shows an inline error and keeps the item when stock is insufficient', async () => {
    wishlistApi.moveToCart.mockRejectedValue(
      new ApiError('INSUFFICIENT_STOCK', 'Không đủ hàng trong kho', { variant_id: 1, requested: 1, available: 0 }, 409),
    )
    renderPage()

    await screen.findByText(/Nâu \/ 2 chỗ/)
    await userEvent.click(screen.getByRole('button', { name: 'Chuyển vào giỏ' }))

    expect(await screen.findByText('Số lượng hiện có: 0. Sản phẩm vẫn được giữ trong danh sách.')).toBeInTheDocument()
    expect(screen.getByText(/Nâu \/ 2 chỗ/)).toBeInTheDocument()
  })
})
