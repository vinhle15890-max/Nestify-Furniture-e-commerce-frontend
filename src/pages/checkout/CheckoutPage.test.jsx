import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { CheckoutPage } from './CheckoutPage'
import * as cartApi from '../../features/cart/api'
import * as addressesApi from '../../features/addresses/api'
import * as checkoutApi from '../../features/checkout/api'
import * as navigation from '../../lib/navigation'
import { useAuthStore } from '../../store/authStore'
import { ApiError } from '../../lib/errors'

vi.mock('../../features/cart/api')
vi.mock('../../features/addresses/api')
vi.mock('../../features/checkout/api')
vi.mock('../../lib/navigation')

const sampleCart = {
  data: {
    id: 1,
    items: [
      {
        id: 10,
        variant: { id: 1, sku: 'SOFA-NAU', name: 'Nâu', attributes: {}, price: 5000000, available_stock: 5, model_3d_url: null, is_active: true },
        quantity: 2,
        unit_price_snapshot: 5000000,
        subtotal: 10000000,
      },
    ],
    total: 10000000,
  },
}

const sampleAddresses = {
  data: [
    {
      id: 1,
      recipient_name: 'Bao',
      phone: '0123456789',
      address_line1: '123 Đường A',
      address_line2: null,
      city: 'TP.HCM',
      province: 'TP.HCM',
      postal_code: '70000',
      is_default: true,
    },
    {
      id: 2,
      recipient_name: 'Bao Phụ',
      phone: '0987654321',
      address_line1: '456 Đường B',
      address_line2: null,
      city: 'Hà Nội',
      province: 'Hà Nội',
      postal_code: '10000',
      is_default: false,
    },
  ],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao' } })
    cartApi.getCart.mockResolvedValue(sampleCart)
    addressesApi.getAddresses.mockResolvedValue(sampleAddresses)
  })

  it('shows an empty-cart shell when the cart has no items', async () => {
    cartApi.getCart.mockResolvedValue({ data: { id: 1, items: [], total: 0 } })
    renderPage()

    expect(await screen.findByText(/Giỏ hàng của bạn đang trống/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Quay lại giỏ hàng' })).toBeInTheDocument()
  })

  it('lets the user add an address inline (without leaving checkout) when they have none', async () => {
    addressesApi.getAddresses.mockResolvedValue({ data: [] })
    renderPage()

    expect(await screen.findByText(/Bạn chưa có địa chỉ giao hàng/)).toBeInTheDocument()

    // The "add address" affordance is an inline button that opens the address modal,
    // not a link that navigates away from checkout.
    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ' }))
    expect(await screen.findByRole('heading', { name: 'Thêm địa chỉ mới' })).toBeInTheDocument()
  })

  it('renders address options with the default address selected', async () => {
    renderPage()

    await screen.findByText('Nâu')

    const defaultOption = screen.getByRole('radio', { name: /Bao · 0123456789/ })
    const otherOption = screen.getByRole('radio', { name: /Bao Phụ · 0987654321/ })
    expect(defaultOption).toBeChecked()
    expect(otherOption).not.toBeChecked()
  })

  it('shows a voucher preview in the order summary', async () => {
    cartApi.applyVoucher.mockResolvedValue({ data: { discount_amount: 1000000, final_total: 9000000 } })
    renderPage()

    await screen.findByText('Nâu')

    await userEvent.type(screen.getByLabelText('Mã giảm giá'), 'GIAM10')
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))

    expect(cartApi.applyVoucher).toHaveBeenCalledWith('GIAM10')
    expect(await screen.findByText('9.000.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('-1.000.000 ₫')).toBeInTheDocument()
  })

  it('creates an order, opens a payment session, and redirects on submit', async () => {
    checkoutApi.createOrder.mockResolvedValue({ data: { id: 99, status: 'pending_payment' } })
    checkoutApi.createPaymentSession.mockResolvedValue({
      data: { payment_url: 'https://pay.example/session/99', gateway: 'payos', expires_at: '2026-01-01T00:00:00Z' },
    })
    renderPage()

    await screen.findByText('Nâu')

    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    expect(checkoutApi.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ address_id: 1, source: 'cart' }),
      expect.any(String),
    )
    expect(await screen.findByText('Nâu')).toBeInTheDocument()
    expect(checkoutApi.createPaymentSession).toHaveBeenCalledWith(99, expect.objectContaining({ gateway: 'payos' }))
    expect(navigation.redirectToExternal).toHaveBeenCalledWith('https://pay.example/session/99')
  })

  it('places a COD order and skips the payment session', async () => {
    checkoutApi.createOrder.mockResolvedValue({ data: { id: 77, status: 'processing', payment_method: 'cod' } })
    renderPage()

    await screen.findByText('Nâu')

    await userEvent.click(screen.getByRole('radio', { name: /COD/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    expect(checkoutApi.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ address_id: 1, source: 'cart', payment_method: 'cod' }),
      expect.any(String),
    )
    // COD is confirmed at placement — no online payment step.
    expect(checkoutApi.createPaymentSession).not.toHaveBeenCalled()
    expect(navigation.redirectToExternal).not.toHaveBeenCalled()
  })

  it('shows a precise, item-named error on insufficient stock and does not create a payment session', async () => {
    checkoutApi.createOrder.mockRejectedValue(
      new ApiError('INSUFFICIENT_STOCK', 'Sản phẩm không đủ số lượng trong kho.', { variant_id: 1, requested: 2, available: 1 }, 409),
    )
    renderPage()

    await screen.findByText('Nâu')

    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    expect(await screen.findByText(/Kho chỉ đủ 1 sản phẩm cho "Nâu"/)).toBeInTheDocument()
    expect(checkoutApi.createPaymentSession).not.toHaveBeenCalled()
  })

  it('blocks placing the order when a cart line already exceeds available stock', async () => {
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

    expect(screen.getByText(/vượt số lượng còn trong kho/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đặt hàng' })).toBeDisabled()

    // The submit is disabled, so no order is attempted.
    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))
    expect(checkoutApi.createOrder).not.toHaveBeenCalled()
  })
})
