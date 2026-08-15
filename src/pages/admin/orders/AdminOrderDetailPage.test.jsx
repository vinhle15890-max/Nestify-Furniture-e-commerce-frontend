import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminOrderDetailPage } from './AdminOrderDetailPage'
import * as ordersApi from '../../../features/admin/orders/api'
import { ApiError } from '../../../lib/errors'
import { useAuthStore } from '../../../store/authStore'

vi.mock('../../../features/admin/orders/api')

const baseOrder = {
  id: 101,
  status: 'processing',
  payment_method: 'payos',
  payment: {
    id: 5,
    gateway: 'payos',
    status: 'success',
    amount: 7500000,
    refunded_amount: 0,
  },
  subtotal: 7500000,
  discount_amount: 0,
  total: 7500000,
  created_at: '2026-01-10T08:00:00Z',
  user: { id: 1, name: 'Bao Le', email: 'bao@example.com' },
  items: [
    {
      id: 1,
      variant_id: 1,
      variant_snapshot: { name: 'Ghế Sofa Nâu', sku: 'SOFA-NAU' },
      quantity: 1,
      unit_price: 7500000,
      subtotal: 7500000,
    },
  ],
}

function renderPage(
  order = baseOrder,
  {
    withState = true,
    path = `/admin/orders/${order.id}`,
    permissions = ['refund'],
    preserveGetOrderMock = false,
  } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({ token: 't', user: { permissions } })
  if (!preserveGetOrderMock) {
    ordersApi.getOrder.mockResolvedValue({ data: order })
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[withState ? { pathname: path, state: { order } } : path]}>
        <Routes>
          <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminOrderDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders location state immediately and reconciles it with canonical server data', async () => {
    let resolveOrder
    ordersApi.getOrder.mockImplementation(() => new Promise((resolve) => { resolveOrder = resolve }))
    renderPage(baseOrder, { preserveGetOrderMock: true })

    expect(await screen.findByText('Đơn hàng #101')).toBeInTheDocument()
    expect(screen.getByText('Bao Le')).toBeInTheDocument()
    expect(screen.getByText('Ghế Sofa Nâu')).toBeInTheDocument()
    expect(ordersApi.getOrder).toHaveBeenCalledWith(101)

    resolveOrder({ data: { ...baseOrder, status: 'shipped' } })
    expect(await screen.findByRole('button', { name: 'Đã giao' })).toBeInTheDocument()
  })

  it('loads a direct order URL without router state or list cache', async () => {
    renderPage(baseOrder, { withState: false })

    expect(await screen.findByText('Đơn hàng #101')).toBeInTheDocument()
    expect(screen.getByText('Bao Le')).toBeInTheDocument()
    expect(ordersApi.getOrder).toHaveBeenCalledWith(101)
  })

  it('keeps an initial snapshot visible when its background refresh fails', async () => {
    ordersApi.getOrder.mockRejectedValue(
      new ApiError('NETWORK_ERROR', 'Mất kết nối đến máy chủ.', null),
    )
    renderPage(baseOrder, { preserveGetOrderMock: true })

    expect(screen.getByText('Đơn hàng #101')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể làm mới đơn hàng')
    expect(screen.getByText('Bao Le')).toBeInTheDocument()
  })

  it('shows a loading state while a direct order request is pending', () => {
    ordersApi.getOrder.mockImplementation(() => new Promise(() => {}))
    renderPage(baseOrder, { withState: false, preserveGetOrderMock: true })

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải đơn hàng')
  })

  it('shows a not-found state only when the detail endpoint returns 404', async () => {
    ordersApi.getOrder.mockRejectedValue(new ApiError('NOT_FOUND', 'Không tìm thấy đơn hàng.', null, 404))
    renderPage(baseOrder, { withState: false, preserveGetOrderMock: true })

    expect(await screen.findByText('Không tìm thấy đơn hàng.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Quay lại danh sách đơn hàng' })).toBeInTheDocument()
  })

  it('shows a recoverable error and retries a temporary detail failure', async () => {
    ordersApi.getOrder
      .mockRejectedValueOnce(new ApiError('NETWORK_ERROR', 'Mất kết nối đến máy chủ.', null))
      .mockResolvedValueOnce({ data: baseOrder })
    renderPage(baseOrder, { withState: false, preserveGetOrderMock: true })

    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối đến máy chủ.')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Đơn hàng #101')).toBeInTheDocument()
    expect(ordersApi.getOrder).toHaveBeenCalledTimes(2)
  })

  it('does not request an invalid route id', async () => {
    renderPage(baseOrder, { withState: false, path: '/admin/orders/abc' })

    expect(await screen.findByText('Không tìm thấy đơn hàng.')).toBeInTheDocument()
    expect(ordersApi.getOrder).not.toHaveBeenCalled()
  })

  it('renders both backend-supported transitions for "processing" orders', async () => {
    renderPage()
    await screen.findByText('Đơn hàng #101')

    expect(screen.getByRole('button', { name: 'Đang giao' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đã hủy' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đã giao' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đang xử lý' })).not.toBeInTheDocument()
  })

  it('shows both valid transitions for "paid" orders', async () => {
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    expect(screen.getByRole('button', { name: 'Đang xử lý' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đã hủy' })).toBeInTheDocument()
  })

  it('shows no transition buttons for terminal statuses', async () => {
    renderPage({ ...baseOrder, status: 'delivered' })
    await screen.findByText('Đơn hàng #101')

    expect(screen.queryByRole('button', { name: 'Đang giao' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đã giao' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đã hủy' })).not.toBeInTheDocument()
  })

  it('transitions the order status when clicking a valid action', async () => {
    ordersApi.updateOrderStatus.mockResolvedValue({ data: { ...baseOrder, status: 'shipped' } })
    renderPage()
    await screen.findByText('Đơn hàng #101')

    ordersApi.getOrder.mockResolvedValue({ data: { ...baseOrder, status: 'shipped' } })
    await userEvent.click(screen.getByRole('button', { name: 'Đang giao' }))

    await waitFor(() => expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith(101, 'shipped'))
    expect(await screen.findByText('Đã giao')).toBeInTheDocument()
  })

  it('opens a cancellation review and sends nothing when the admin goes back', async () => {
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    await userEvent.click(screen.getByRole('button', { name: 'Đã hủy' }))

    const dialog = screen.getByRole('dialog', { name: 'Hủy đơn hàng' })
    expect(within(dialog).getByText(/#101/)).toBeInTheDocument()
    expect(within(dialog).getByText(/không tự chuyển tiền/)).toBeInTheDocument()
    expect(ordersApi.updateOrderStatus).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Quay lại' }))
    expect(screen.queryByRole('dialog', { name: 'Hủy đơn hàng' })).not.toBeInTheDocument()
    expect(ordersApi.updateOrderStatus).not.toHaveBeenCalled()
  })

  it('cancels only after explicit confirmation', async () => {
    const paidOrder = { ...baseOrder, status: 'paid' }
    ordersApi.updateOrderStatus.mockResolvedValue({ data: { ...paidOrder, status: 'cancelled' } })
    renderPage(paidOrder)
    await screen.findByText('Đơn hàng #101')

    await userEvent.click(screen.getByRole('button', { name: 'Đã hủy' }))
    const dialog = screen.getByRole('dialog', { name: 'Hủy đơn hàng' })
    ordersApi.getOrder.mockResolvedValue({ data: { ...paidOrder, status: 'cancelled' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy đơn' }))

    await waitFor(() => expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith(101, 'cancelled'))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Hủy đơn hàng' })).not.toBeInTheDocument())
  })

  it('keeps the cancellation dialog open and announces a transition error', async () => {
    ordersApi.updateOrderStatus.mockRejectedValue(
      new ApiError('INVALID_TRANSITION', 'Không thể hủy đơn ở trạng thái hiện tại.', null, 422),
    )
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    await userEvent.click(screen.getByRole('button', { name: 'Đã hủy' }))
    const dialog = screen.getByRole('dialog', { name: 'Hủy đơn hàng' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy đơn' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không thể hủy đơn ở trạng thái hiện tại.')
    expect(screen.getByRole('dialog', { name: 'Hủy đơn hàng' })).toBeInTheDocument()
  })

  it('blocks duplicate cancellation and dismissal while the request is pending', async () => {
    ordersApi.updateOrderStatus.mockImplementation(() => new Promise(() => {}))
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    await userEvent.click(screen.getByRole('button', { name: 'Đã hủy' }))
    const dialog = screen.getByRole('dialog', { name: 'Hủy đơn hàng' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy đơn' }))

    const pendingButton = await within(dialog).findByRole('button', { name: 'Đang hủy...' })
    expect(pendingButton).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Quay lại' })).toBeDisabled()
    await userEvent.click(pendingButton)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }))

    expect(ordersApi.updateOrderStatus).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Hủy đơn hàng' })).toBeInTheDocument()
  })

  it('reviews a frozen refund payload before submitting and shows the result', async () => {
    ordersApi.refundOrder.mockResolvedValue({
      data: { order_id: 101, payment_id: 5, status: 'refunded', refunded_amount: 1000000 },
    })
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    await userEvent.type(screen.getByLabelText('Số tiền hoàn'), '1000000')
    await userEvent.type(screen.getByLabelText('Lý do (không bắt buộc)'), 'Khách đổi ý')
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục hoàn tiền' }))

    const dialog = screen.getByRole('dialog', { name: 'Xác nhận hoàn tiền' })
    expect(within(dialog).getAllByText(/1.000.000/)).toHaveLength(2)
    expect(within(dialog).getByText('Khách đổi ý')).toBeInTheDocument()
    expect(within(dialog).getByText(/không chuyển tiền tự động qua PayOS/)).toBeInTheDocument()
    expect(ordersApi.refundOrder).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: /Xác nhận hoàn/ }))

    await waitFor(() =>
      expect(ordersApi.refundOrder).toHaveBeenCalledWith(101, { amount: 1000000, reason: 'Khách đổi ý' }),
    )
    expect(await screen.findByText(/1.000.000/)).toBeInTheDocument()
  })

  it('preserves refund form values when the admin goes back', async () => {
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    await userEvent.type(screen.getByLabelText('Số tiền hoàn'), '250000')
    await userEvent.type(screen.getByLabelText('Lý do (không bắt buộc)'), 'Điều chỉnh')
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục hoàn tiền' }))

    const dialog = screen.getByRole('dialog', { name: 'Xác nhận hoàn tiền' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Quay lại' }))

    expect(screen.getByLabelText('Số tiền hoàn')).toHaveValue(250000)
    expect(screen.getByLabelText('Lý do (không bắt buộc)')).toHaveValue('Điều chỉnh')
    expect(ordersApi.refundOrder).not.toHaveBeenCalled()
  })

  it('omits an empty refund reason from the confirmed payload', async () => {
    ordersApi.refundOrder.mockResolvedValue({
      data: { order_id: 101, payment_id: 5, status: 'partially_refunded', refunded_amount: 100000 },
    })
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    await userEvent.type(screen.getByLabelText('Số tiền hoàn'), '100000')
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục hoàn tiền' }))
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Xác nhận hoàn tiền' }))
        .getByRole('button', { name: /Xác nhận hoàn/ }),
    )

    await waitFor(() => expect(ordersApi.refundOrder).toHaveBeenCalledWith(101, { amount: 100000 }))
  })

  it('keeps the refund review open and announces an API error', async () => {
    ordersApi.refundOrder.mockRejectedValue(
      new ApiError('REFUND_EXCEEDS_PAYMENT', 'Số tiền hoàn vượt quá số tiền đã thanh toán.', null, 409),
    )
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    await userEvent.type(screen.getByLabelText('Số tiền hoàn'), '100000000')
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục hoàn tiền' }))
    const dialog = screen.getByRole('dialog', { name: 'Xác nhận hoàn tiền' })
    await userEvent.click(within(dialog).getByRole('button', { name: /Xác nhận hoàn/ }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Số tiền hoàn vượt quá số tiền đã thanh toán.',
    )
    expect(screen.getByRole('dialog', { name: 'Xác nhận hoàn tiền' })).toBeInTheDocument()
  })

  it('blocks duplicate refund and dismissal while the request is pending', async () => {
    ordersApi.refundOrder.mockImplementation(() => new Promise(() => {}))
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    await userEvent.type(screen.getByLabelText('Số tiền hoàn'), '100000')
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục hoàn tiền' }))
    const dialog = screen.getByRole('dialog', { name: 'Xác nhận hoàn tiền' })
    await userEvent.click(within(dialog).getByRole('button', { name: /Xác nhận hoàn/ }))

    const pendingButton = await within(dialog).findByRole('button', { name: 'Đang hoàn tiền...' })
    expect(pendingButton).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Quay lại' })).toBeDisabled()
    await userEvent.click(pendingButton)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }))

    expect(ordersApi.refundOrder).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Xác nhận hoàn tiền' })).toBeInTheDocument()
  })

  it('shows a customer cancellation refund as recorded instead of an empty refund form', async () => {
    renderPage({
      ...baseOrder,
      status: 'cancelled',
      total: 10000,
      payment: {
        id: 5,
        gateway: 'payos',
        status: 'refunded',
        amount: 10000,
        refunded_amount: 10000,
      },
      cancellation: {
        reason: 'Không còn nhu cầu',
        refund_recorded: true,
      },
    })

    expect(await screen.findByText('Yêu cầu hoàn tiền của khách')).toBeInTheDocument()
    expect(screen.getByText('Không còn nhu cầu')).toBeInTheDocument()
    expect(screen.getAllByText(/10.000/)).toHaveLength(2)
    expect(screen.getByText(/cần chuyển trả thủ công qua PayOS/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Số tiền hoàn')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tiếp tục hoàn tiền' })).not.toBeInTheDocument()
  })

  it('ẩn nút Hoàn tiền khi user không có quyền refund', () => {
    renderPage(baseOrder, { permissions: [] })

    expect(screen.queryByRole('button', { name: 'Tiếp tục hoàn tiền' })).toBeNull()
  })

})
