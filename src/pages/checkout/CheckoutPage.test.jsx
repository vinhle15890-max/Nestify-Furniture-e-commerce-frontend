import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { CheckoutPage } from './CheckoutPage'
import { checkoutRecoveryStorageKey } from './checkoutRecovery'
import * as cartApi from '../../features/cart/api'
import * as addressesApi from '../../features/addresses/api'
import * as checkoutApi from '../../features/checkout/api'
import * as ordersApi from '../../features/orders/api'
import * as navigation from '../../lib/navigation'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { ApiError } from '../../lib/errors'

vi.mock('../../features/cart/api')
vi.mock('../../features/addresses/api')
vi.mock('../../features/checkout/api')
vi.mock('../../features/orders/api')
vi.mock('../../lib/navigation')

const sampleCart = {
  data: {
    id: 1,
    items: [
      {
        id: 10,
        variant: {
          id: 1,
          sku: 'SOFA-NAU',
          product_name: 'Sofa Mây',
          name: 'Nâu',
          attributes: { color: 'Nâu' },
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

const createdPayosOrder = {
  id: 99,
  order_number: 'NES-260713-0099',
  status: 'pending_payment',
  payment_method: 'payos',
  subtotal: 10000000,
  discount_amount: 0,
  total: 10000000,
  items: [
    {
      id: 501,
      variant_snapshot: { id: 1, product_name: 'Sofa Mây', name: 'Nâu', sku: 'SOFA-NAU' },
      quantity: 2,
      unit_price: 5000000,
      subtotal: 10000000,
    },
  ],
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function renderPage(route = '/checkout') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <CheckoutPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return { ...view, queryClient }
}

async function openAddressEditor() {
  const address = screen.getByRole('region', { name: 'Giao tới' })
  await userEvent.click(within(address).getByRole('button', { name: 'Thay đổi' }))
  return address
}

async function openPaymentEditor() {
  const payment = screen.getByRole('region', { name: 'Thanh toán' })
  await userEvent.click(within(payment).getByRole('button', { name: 'Thay đổi' }))
  return payment
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    useUiStore.setState({ checkoutIdempotencyKey: null })
    useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'Bao', email_verified_at: '2026-01-01' } })
    cartApi.getCart.mockResolvedValue(sampleCart)
    addressesApi.getAddresses.mockResolvedValue(sampleAddresses)
  })

  it('shows a truthful empty-Cart boundary without a commitment action', async () => {
    cartApi.getCart.mockResolvedValue({ data: { id: 1, items: [], total: 0 } })
    renderPage()

    expect(await screen.findByText(/Giỏ hàng đang trống/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Quay lại giỏ hàng' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đặt hàng' })).not.toBeInTheDocument()
  })

  it('blocks commitment and retries when prerequisite truth fails to load', async () => {
    cartApi.getCart
      .mockRejectedValueOnce(new ApiError('SERVER_ERROR', 'Máy chủ chưa phản hồi.', {}, 500))
      .mockResolvedValueOnce(sampleCart)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể chuẩn bị đơn hàng')
    expect(screen.queryByRole('button', { name: 'Đặt hàng' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('button', { name: 'Đặt hàng' })).toBeInTheDocument()
    expect(checkoutApi.createOrder).not.toHaveBeenCalled()
  })

  it('keeps missing address evidence explicit and adds an address inline', async () => {
    addressesApi.getAddresses.mockResolvedValue({ data: [] })
    renderPage()

    expect(await screen.findByText(/chưa có địa chỉ giao hàng/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Thêm địa chỉ' }))
    expect(await screen.findByRole('heading', { name: 'Thêm địa chỉ mới' })).toBeInTheDocument()
  })

  it('shows only the selected address at rest and reveals alternatives on explicit change', async () => {
    renderPage()
    await screen.findByText('Sofa Mây')

    expect(screen.getByText(/Bao · 0123456789/)).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Bao Phụ/ })).not.toBeInTheDocument()

    const address = await openAddressEditor()
    await userEvent.click(within(address).getByRole('radio', { name: /Bao Phụ/ }))

    expect(within(address).getByText(/Bao Phụ · 0987654321/)).toBeInTheDocument()
    expect(within(address).queryByRole('radio')).not.toBeInTheDocument()
  })

  it('shows only the selected payment clause at rest and reveals alternatives on explicit change', async () => {
    renderPage()
    await screen.findByText('Sofa Mây')

    expect(screen.getByText('Thanh toán online qua PayOS')).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /COD/ })).not.toBeInTheDocument()

    const payment = await openPaymentEditor()
    await userEvent.click(within(payment).getByRole('radio', { name: /COD/ }))
    expect(within(payment).getByText('Thanh toán khi nhận hàng (COD)')).toBeInTheDocument()
    expect(within(payment).queryByRole('radio')).not.toBeInTheDocument()
  })

  it('revalidates a Cart-selected voucher without rendering another voucher editor', async () => {
    cartApi.applyVoucher.mockResolvedValue({ data: { discount_amount: 1000000, final_total: 9000000 } })
    renderPage('/checkout?voucher=GIAM10')

    expect(await screen.findByText('GIAM10')).toBeInTheDocument()
    expect(screen.getByText(/giảm 1.000.000/)).toBeInTheDocument()
    const transaction = screen.getByTestId('checkout-transaction-evidence')
    expect(within(transaction).getAllByText('Tạm tính')).toHaveLength(2)
    expect(within(transaction).getByText('Giảm giá')).toBeInTheDocument()
    expect(within(transaction).getByText('Thành tiền')).toBeInTheDocument()
    expect(within(transaction).getByText(/^-1\.000\.000/, { selector: 'dd' })).toBeInTheDocument()
    expect(within(transaction).getByText(/^9\.000\.000/, { selector: 'dd' })).toBeInTheDocument()
    expect(cartApi.applyVoucher).toHaveBeenCalledWith('GIAM10')
    expect(screen.queryByLabelText('Mã muốn kiểm tra')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đặt hàng' }).closest('div')).toHaveClass('fixed', 'pr-20', 'lg:right-24')
  })

  it.skip('orders narrow DOM flow as transaction evidence, address, payment, voucher, certainty, action', async () => {
    renderPage()
    await screen.findByText('Sofa Mây')

    const nodes = [
      screen.getByTestId('checkout-transaction-evidence'),
      screen.getByRole('region', { name: 'Giao tới' }),
      screen.getByRole('region', { name: 'Thanh toán' }),
      screen.getByRole('region', { name: 'Mã giảm giá' }),
      screen.getByRole('region', { name: 'Trước khi tạo đơn hàng' }),
      screen.getByRole('button', { name: 'Đặt hàng' }),
    ]

    nodes.slice(0, -1).forEach((node, index) => {
      expect(node.compareDocumentPosition(nodes[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  it.skip('invalidates a voucher preview when the Cart basis changes in place', async () => {
    cartApi.applyVoucher.mockResolvedValue({ data: { discount_amount: 1000000, final_total: 9000000 } })
    const { queryClient } = renderPage()
    await screen.findByText('Sofa Mây')

    await userEvent.type(screen.getByLabelText('Mã muốn kiểm tra'), 'GIAM10')
    await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }))
    expect(await screen.findByText('Giảm giá dự kiến')).toBeInTheDocument()

    act(() => {
      queryClient.setQueryData(['cart'], {
        data: {
          ...sampleCart.data,
          items: [{ ...sampleCart.data.items[0], quantity: 1, subtotal: 5000000 }],
          total: 5000000,
        },
      })
    })

    expect(await screen.findByText(/Kết quả xem trước trước đó không còn được dùng/)).toBeInTheDocument()
    expect(screen.queryByText('Giảm giá dự kiến')).not.toBeInTheDocument()
  })

  it.skip('attaches a safe voucher failure to the voucher field and focuses it', async () => {
    cartApi.applyVoucher.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
    renderPage()
    await screen.findByText('Sofa Mây')

    const input = screen.getByLabelText('Mã muốn kiểm tra')
    await userEvent.type(input, 'GIAM10')
    await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }))

    expect(await screen.findByText(/Chưa thể kiểm tra mã giảm giá/)).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(input).toHaveFocus())
  })

  it.skip('freezes every payload-coupled clause to the submitted declaration while creating an order', async () => {
    const pendingOrder = deferred()
    checkoutApi.createOrder.mockReturnValue(pendingOrder.promise)
    renderPage()
    await screen.findByText('Sofa Mây')

    const address = await openAddressEditor()
    await userEvent.click(within(address).getByRole('radio', { name: /Bao Phụ/ }))
    const payment = await openPaymentEditor()
    await userEvent.click(within(payment).getByRole('radio', { name: /COD/ }))
    await userEvent.type(screen.getByLabelText('Mã muốn kiểm tra'), 'GIAM10')

    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    expect(screen.getByTestId('checkout-editable-declaration')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText(/Bao Phụ · 0987654321/)).toBeInTheDocument()
    expect(screen.getByText('Thanh toán khi nhận hàng (COD)')).toBeInTheDocument()
    expect(screen.getByLabelText('Mã muốn kiểm tra')).toHaveValue('GIAM10')
    expect(screen.getAllByRole('button', { name: 'Thay đổi' }).every((button) => button.disabled)).toBe(true)
    expect(screen.getByLabelText('Mã muốn kiểm tra')).toBeDisabled()
    expect(checkoutApi.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ address_id: 2, payment_method: 'cod', voucher_code: 'GIAM10' }),
      expect.any(String),
    )

    await act(async () => pendingOrder.resolve({ data: { id: 77, order_number: 'NES-77', status: 'processing', payment_method: 'cod' } }))
    expect(await screen.findByText(/Đơn hàng NES-77 đã được tạo/)).toBeInTheDocument()
  })

  it('blocks duplicate commitment while the first order mutation is pending', async () => {
    const pendingOrder = deferred()
    checkoutApi.createOrder.mockReturnValue(pendingOrder.promise)
    renderPage()
    await screen.findByText('Sofa Mây')

    const action = screen.getByRole('button', { name: 'Đặt hàng' })
    await userEvent.dblClick(action)

    expect(checkoutApi.createOrder).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Đang tạo đơn…' })).toBeDisabled()

    await act(async () => pendingOrder.reject(new ApiError('SERVER_ERROR', 'No', null, 500)))
  })

  it('preserves an uncertain submitted declaration for an idempotent retry', async () => {
    checkoutApi.createOrder
      .mockRejectedValueOnce(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
      .mockResolvedValueOnce({ data: { id: 77, order_number: 'NES-77', status: 'processing', payment_method: 'cod' } })
    renderPage()
    await screen.findByText('Sofa Mây')

    const payment = await openPaymentEditor()
    await userEvent.click(within(payment).getByRole('radio', { name: /COD/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    expect(await screen.findByText(/Chưa thể xác định đơn đã được tạo/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử đặt lại đơn này' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Thay đổi' }).every((button) => button.disabled)).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Thử đặt lại đơn này' }))
    expect(checkoutApi.createOrder).toHaveBeenCalledTimes(2)
    expect(await screen.findByText(/Đơn hàng NES-77 đã được tạo/)).toBeInTheDocument()
  })

  it('creates a PayOS order without implying payment success', async () => {
    checkoutApi.createOrder.mockResolvedValue({ data: createdPayosOrder })
    checkoutApi.createPaymentSession.mockResolvedValue({
      data: { payment_url: 'https://pay.example/session/99', gateway: 'payos', expires_at: '2026-01-01T00:00:00Z' },
    })
    renderPage()
    await screen.findByText('Sofa Mây')

    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    expect(await screen.findByText(/Đơn hàng NES-260713-0099 đã được tạo/)).toBeInTheDocument()
    expect(screen.getByText('Đang chuyển đến PayOS')).toBeInTheDocument()
    expect(screen.getByText(/Bạn sẽ rời Nestify tạm thời/)).toBeInTheDocument()
    expect(screen.getByText(/chưa được gọi là thành công/)).toBeInTheDocument()
    expect(screen.queryByText(/thanh toán thành công/i)).not.toBeInTheDocument()
    await waitFor(() => expect(navigation.redirectToExternal).toHaveBeenCalledWith('https://pay.example/session/99'))
  })

  it('shows a COD created-order state without implying online payment', async () => {
    checkoutApi.createOrder.mockResolvedValue({
      data: { ...createdPayosOrder, id: 77, order_number: 'NES-77', status: 'processing', payment_method: 'cod' },
    })
    renderPage()
    await screen.findByText('Sofa Mây')

    const payment = await openPaymentEditor()
    await userEvent.click(within(payment).getByRole('radio', { name: /COD/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    expect(await screen.findByText(/Đơn hàng NES-77 đã được tạo/)).toBeInTheDocument()
    expect(screen.getByText(/Không có thanh toán online nào được xác nhận/)).toBeInTheDocument()
    expect(checkoutApi.createPaymentSession).not.toHaveBeenCalled()
    expect(navigation.redirectToExternal).not.toHaveBeenCalled()
  })

  it('does not open PayOS when a voucher reduces the created order total to zero', async () => {
    checkoutApi.createOrder.mockResolvedValue({
      data: { ...createdPayosOrder, status: 'processing', total: 0 },
    })
    renderPage('/checkout?voucher=FREE100')
    await screen.findByText('Sofa Mây')

    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    expect(await screen.findByText(/Mã giảm giá đã thanh toán toàn bộ giá trị đơn/)).toBeInTheDocument()
    expect(checkoutApi.createPaymentSession).not.toHaveBeenCalled()
    expect(navigation.redirectToExternal).not.toHaveBeenCalled()
  })

  it('preserves a created PayOS order and retries only payment-session initialization', async () => {
    checkoutApi.createOrder.mockResolvedValue({ data: createdPayosOrder })
    checkoutApi.createPaymentSession
      .mockRejectedValueOnce(new ApiError('NETWORK_ERROR', 'Network Error', null, undefined))
      .mockResolvedValueOnce({ data: { payment_url: 'https://pay.example/session/99' } })
    renderPage()
    await screen.findByText('Sofa Mây')

    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))
    expect(await screen.findByText(/chưa thể mở phiên PayOS/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Thử mở lại PayOS' }))

    expect(checkoutApi.createOrder).toHaveBeenCalledTimes(1)
    expect(checkoutApi.createPaymentSession).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(navigation.redirectToExternal).toHaveBeenCalledWith('https://pay.example/session/99'))
  })

  it('rehydrates an existing created Order after refresh even though Cart is empty', async () => {
    sessionStorage.setItem(checkoutRecoveryStorageKey, JSON.stringify({ orderId: 99 }))
    cartApi.getCart.mockResolvedValue({ data: { id: 1, items: [], total: 0 } })
    ordersApi.getOrder.mockResolvedValue({ data: createdPayosOrder })
    renderPage()

    expect(await screen.findByText(/Đơn hàng NES-260713-0099 đã được tạo/)).toBeInTheDocument()
    expect(screen.queryByText(/Giỏ hàng đang trống/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mở PayOS cho đơn này' })).toBeInTheDocument()
    expect(ordersApi.getOrder).toHaveBeenCalledWith(99)
  })

  it('routes an idempotency conflict to the existing order instead of creating another', async () => {
    checkoutApi.createOrder.mockRejectedValue(new ApiError(
      'DUPLICATE_IDEMPOTENCY_KEY',
      'Khóa đã được dùng.',
      { order_id: 88 },
      409,
    ))
    renderPage()
    await screen.findByText('Sofa Mây')

    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    expect(await screen.findByText(/Yêu cầu này đã gắn với đơn #88/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mở đơn hàng #88' })).toHaveAttribute('href', '/orders/88')
    expect(checkoutApi.createOrder).toHaveBeenCalledTimes(1)
  })

  it('attaches a reserve-time stock conflict to affected transaction evidence', async () => {
    checkoutApi.createOrder.mockRejectedValue(new ApiError(
      'INSUFFICIENT_STOCK',
      'Sản phẩm không đủ số lượng trong kho.',
      { variant_id: 1, requested: 2, available: 1 },
      409,
    ))
    renderPage()
    await screen.findByText('Sofa Mây')

    await userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }))

    expect(await screen.findByText(/Dòng sản phẩm này cần được điều chỉnh/)).toBeInTheDocument()
    expect(screen.getAllByText(/Kho đã thay đổi khi tạo đơn/)).toHaveLength(2)
    expect(checkoutApi.createPaymentSession).not.toHaveBeenCalled()
  })

  it('blocks order creation when current Cart evidence already exceeds observed stock', async () => {
    cartApi.getCart.mockResolvedValue({
      data: {
        ...sampleCart.data,
        items: [{
          ...sampleCart.data.items[0],
          variant: { ...sampleCart.data.items[0].variant, available_stock: 1 },
        }],
      },
    })
    renderPage()
    await screen.findByText('Sofa Mây')

    expect(screen.getAllByText(/số lượng hiện có/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Đặt hàng' })).toBeDisabled()
    expect(checkoutApi.createOrder).not.toHaveBeenCalled()
  })

  it('marks the declaration as width-safe and contains no fixed desktop panel width', async () => {
    renderPage()
    await screen.findByText('Sofa Mây')

    const declaration = screen.getByTestId('checkout-editable-declaration')
    expect(declaration).toHaveAttribute('data-checkout-width-safe', 'true')
    expect(declaration.className).toContain('min-w-0')
    expect(declaration.className).toContain('max-w-full')
    expect(declaration.querySelector('[class*="min-w-["]')).toBeNull()
  })
})
