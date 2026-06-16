import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
          name: 'Nâu',
          attributes: {},
          price: 5000000,
          available_stock: 5,
          model_3d_url: null,
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
    vi.clearAllMocks()
    wishlistApi.getWishlist.mockResolvedValue(sampleWishlist)
  })

  it('renders wishlist items', async () => {
    renderPage()

    expect(await screen.findByText('Nâu')).toBeInTheDocument()
    expect(screen.getByText('SOFA-NAU')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Báo khi còn hàng' })).not.toBeChecked()
  })

  it('toggles the restock notification', async () => {
    wishlistApi.updateItem.mockResolvedValue({ data: { ...sampleWishlist.data.items[0], notify_on_restock: true } })
    renderPage()

    await screen.findByText('Nâu')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Báo khi còn hàng' }))

    expect(wishlistApi.updateItem).toHaveBeenCalledWith(20, { notify_on_restock: true })
  })

  it('removes an item from the wishlist', async () => {
    wishlistApi.removeItem.mockResolvedValue({})
    renderPage()

    await screen.findByText('Nâu')
    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }))

    expect(wishlistApi.removeItem).toHaveBeenCalledWith(20)
  })

  it('moves an item to the cart', async () => {
    wishlistApi.moveToCart.mockResolvedValue({ data: { message: 'OK' } })
    renderPage()

    await screen.findByText('Nâu')
    await userEvent.click(screen.getByRole('button', { name: 'Chuyển vào giỏ' }))

    await waitFor(() => expect(wishlistApi.moveToCart).toHaveBeenCalledWith(20))
  })

  it('shows an inline error and keeps the item when stock is insufficient', async () => {
    wishlistApi.moveToCart.mockRejectedValue(
      new ApiError('INSUFFICIENT_STOCK', 'Không đủ hàng trong kho', { variant_id: 1, requested: 1, available: 0 }, 409),
    )
    renderPage()

    await screen.findByText('Nâu')
    await userEvent.click(screen.getByRole('button', { name: 'Chuyển vào giỏ' }))

    expect(await screen.findByText('Chỉ còn 0 sản phẩm trong kho')).toBeInTheDocument()
    expect(screen.getByText('Nâu')).toBeInTheDocument()
  })
})
