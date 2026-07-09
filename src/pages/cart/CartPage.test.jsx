import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { CartPage } from './CartPage'
import * as cartApi from '../../features/cart/api'
import { useAuthStore } from '../../store/authStore'
import { ApiError } from '../../lib/errors'

vi.mock('../../features/cart/api')

const sampleCart = {
  data: {
    id: 1,
    items: [
      {
        id: 10,
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
        quantity: 2,
        unit_price_snapshot: 5000000,
        subtotal: 10000000,
      },
    ],
    total: 10000000,
  },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cartApi.getCart.mockResolvedValue(sampleCart)
  })

  it('shows a login prompt for guests', () => {
    useAuthStore.setState({ token: null, user: null })
    renderPage()

    expect(screen.getByText(/đăng nhập/)).toBeInTheDocument()
    expect(cartApi.getCart).not.toHaveBeenCalled()
  })

  it('renders cart items for authenticated users', async () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao' } })
    renderPage()

    expect(await screen.findByText('Nâu')).toBeInTheDocument()
    expect(screen.getByText(/SOFA-NAU/)).toBeInTheDocument()
    expect(screen.getAllByText('10.000.000 ₫')).toHaveLength(2)
  })

  it('shows the imagined room callback only for room-sourced items', async () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao' } })
    cartApi.getCart.mockResolvedValue({
      data: {
        id: 1,
        items: [
          {
            id: 10,
            variant: { id: 1, sku: 'SOFA-NAU', name: 'Nâu', available_stock: 5, is_active: true },
            room: { id: 7, name: 'Phòng khách' },
            quantity: 1,
            unit_price_snapshot: 5000000,
            subtotal: 5000000,
          },
          {
            id: 11,
            variant: { id: 2, sku: 'BAN-GO', name: 'Gỗ', available_stock: 5, is_active: true },
            quantity: 1,
            unit_price_snapshot: 2000000,
            subtotal: 2000000,
          },
        ],
        total: 7000000,
      },
    })
    renderPage()

    expect(await screen.findByText(/Đã xác nhận vừa với phòng “Phòng khách” bạn đã tạo/)).toBeInTheDocument()
    // The room-less item must not fabricate a callback (Bible: no fake confirmation).
    expect(screen.getAllByText(/Đã xác nhận vừa với phòng/)).toHaveLength(1)
  })

  it('increments quantity and removes an item', async () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao' } })
    cartApi.updateItem.mockResolvedValue(sampleCart)
    cartApi.removeItem.mockResolvedValue({})
    renderPage()

    await screen.findByText('Nâu')

    await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }))
    expect(cartApi.updateItem).toHaveBeenCalledWith(10, { quantity: 3 })

    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }))
    expect(cartApi.removeItem).toHaveBeenCalledWith(10)
  })

  it('shows an inline message and clamps quantity on insufficient stock', async () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao' } })
    cartApi.updateItem.mockRejectedValue(
      new ApiError('INSUFFICIENT_STOCK', 'Không đủ hàng trong kho', { variant_id: 1, requested: 3, available: 1 }, 409),
    )
    renderPage()

    await screen.findByText('Nâu')

    await userEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }))

    expect(await screen.findByText('Kho chỉ đủ 1 sản phẩm cho lựa chọn này')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Số lượng' })).toHaveValue(1)
  })

  it('warns and blocks checkout when a saved line exceeds current stock', async () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao' } })
    cartApi.getCart.mockResolvedValue({
      data: {
        id: 1,
        items: [
          {
            id: 10,
            variant: { id: 1, sku: 'SOFA-NAU', name: 'Nâu', attributes: {}, price: 5000000, available_stock: 1, model_3d_url: null, is_active: true },
            quantity: 2,
            unit_price_snapshot: 5000000,
            subtotal: 10000000,
          },
        ],
        total: 10000000,
      },
    })
    renderPage()

    await screen.findByText('Nâu')

    expect(screen.getByText(/Kho chỉ đủ 1 sản phẩm cho lựa chọn này — vui lòng giảm số lượng/)).toBeInTheDocument()
    // The checkout affordance becomes a disabled button, not a link to /checkout.
    expect(screen.getByRole('button', { name: 'Tiến hành thanh toán' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'Tiến hành thanh toán' })).not.toBeInTheDocument()
  })

  it('applies a voucher to the order summary without changing the cart total', async () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao' } })
    cartApi.applyVoucher.mockResolvedValue({ data: { discount_amount: 1000000, final_total: 9000000 } })
    renderPage()

    await screen.findByText('Nâu')

    await userEvent.type(screen.getByLabelText('Mã giảm giá'), 'GIAM10')
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))

    expect(cartApi.applyVoucher).toHaveBeenCalledWith('GIAM10')
    expect(await screen.findByText('9.000.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('-1.000.000 ₫')).toBeInTheDocument()
    expect(screen.getAllByText('10.000.000 ₫')).toHaveLength(2)
  })
})
