import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { OrdersPage } from './OrdersPage'
import * as ordersApi from '../../features/orders/api'

vi.mock('../../features/orders/api')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the order list with status badges', async () => {
    ordersApi.getOrders.mockResolvedValue({
      data: [
        { id: 99, status: 'paid', payment_method: 'payos', total: 10000000, created_at: '2026-01-15T10:30:00Z' },
        { id: 98, status: 'pending_payment', payment_method: 'payos', total: 5000000, created_at: '2026-01-10T08:00:00Z' },
      ],
    })
    renderPage()

    expect(await screen.findByText('Đơn hàng #99')).toBeInTheDocument()
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument()
    expect(screen.getByText('Đơn hàng #98')).toBeInTheDocument()
    expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument()
    expect(screen.getByText('10.000.000 ₫')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Đơn hàng #99/ })).toHaveAttribute('href', '/orders/99')
    expect(screen.getByRole('link', { name: 'Thử thanh toán lại' })).toHaveAttribute('href', '/orders/98#payment')
  })

  it('adds one contextual action to each order row from list data', async () => {
    ordersApi.getOrders.mockResolvedValue({
      data: [
        { id: 3, status: 'shipped', payment_method: 'cod', total: 3000000, items: [], created_at: '2026-01-03T00:00:00Z', fulfillment: { carrier_name: 'GHTK', tracking_number: 'GHTK-0099' } },
        { id: 2, status: 'delivered', payment_method: 'payos', total: 2000000, items: [], created_at: '2026-01-02T00:00:00Z', return_request: { status: 'approved' } },
        { id: 1, status: 'processing', payment_method: 'cod', total: 1000000, items: [], created_at: '2026-01-01T00:00:00Z' },
      ],
    })
    renderPage()

    expect(await screen.findByRole('link', { name: 'Xem vận chuyển' })).toHaveAttribute('href', '/orders/3#shipment')
    expect(screen.getByText('Vận chuyển: GHTK · GHTK-0099')).toBeInTheDocument()
    const detailLinks = screen.getAllByRole('link', { name: 'Mở chi tiết' })
    expect(detailLinks).toHaveLength(2)
    expect(detailLinks.map((link) => link.getAttribute('href'))).toEqual(['/orders/2', '/orders/1'])
  })

  it('shows an empty state when there are no orders', async () => {
    ordersApi.getOrders.mockResolvedValue({ data: [] })
    renderPage()

    expect(await screen.findByText(/Bạn chưa có đơn hàng nào/)).toBeInTheDocument()
  })

  it('shows a retryable failure instead of claiming there are no orders', async () => {
    ordersApi.getOrders
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: [] })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể tải đơn hàng')
    expect(screen.queryByText(/Bạn chưa có đơn hàng nào/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText(/Bạn chưa có đơn hàng nào/)).toBeInTheDocument()
    expect(ordersApi.getOrders).toHaveBeenCalledTimes(2)
  })
})
