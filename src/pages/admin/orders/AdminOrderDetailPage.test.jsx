import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

function renderPage(order = baseOrder) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({ token: 't', user: { permissions: ['refund'] } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: `/admin/orders/${order.id}`, state: { order } }]}>
        <Routes>
          <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminOrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders order details hydrated from location.state', async () => {
    renderPage()

    expect(await screen.findByText('Đơn hàng #101')).toBeInTheDocument()
    expect(screen.getByText('Bao Le')).toBeInTheDocument()
    expect(screen.getByText('Ghế Sofa Nâu')).toBeInTheDocument()
  })

  it('only renders the valid next-status button for "processing" orders', async () => {
    renderPage()
    await screen.findByText('Đơn hàng #101')

    expect(screen.getByRole('button', { name: 'Đang giao' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đã giao' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đã hủy' })).not.toBeInTheDocument()
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

    await userEvent.click(screen.getByRole('button', { name: 'Đang giao' }))

    await waitFor(() => expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith(101, 'shipped'))
    expect(await screen.findByText('Đã giao')).toBeInTheDocument()
  })

  it('submits a refund and shows the result', async () => {
    ordersApi.refundOrder.mockResolvedValue({
      data: { order_id: 101, payment_id: 5, status: 'refunded', refunded_amount: 1000000 },
    })
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    await userEvent.type(screen.getByLabelText('Số tiền hoàn'), '1000000')
    await userEvent.type(screen.getByLabelText('Lý do (không bắt buộc)'), 'Khách đổi ý')
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tiền' }))

    await waitFor(() =>
      expect(ordersApi.refundOrder).toHaveBeenCalledWith(101, { amount: 1000000, reason: 'Khách đổi ý' }),
    )
    expect(await screen.findByText(/1.000.000/)).toBeInTheDocument()
  })

  it('shows an inline error when the refund exceeds the payment amount', async () => {
    ordersApi.refundOrder.mockRejectedValue(
      new ApiError('REFUND_EXCEEDS_PAYMENT', 'Số tiền hoàn vượt quá số tiền đã thanh toán.', null, 409),
    )
    renderPage({ ...baseOrder, status: 'paid' })
    await screen.findByText('Đơn hàng #101')

    await userEvent.type(screen.getByLabelText('Số tiền hoàn'), '100000000')
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tiền' }))

    expect(await screen.findByText('Số tiền hoàn vượt quá số tiền đã thanh toán.')).toBeInTheDocument()
  })

  it('ẩn nút Hoàn tiền khi user không có quyền refund', () => {
    useAuthStore.setState({ token: 't', user: { permissions: [] } })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[{ pathname: '/admin/orders/101', state: { order: baseOrder } }]}>
          <Routes>
            <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Hoàn tiền' })).toBeNull()
  })

  it('shows a not-found message when no order data is available', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/orders/999']}>
          <Routes>
            <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Không tìm thấy đơn hàng.')).toBeInTheDocument()
  })
})
