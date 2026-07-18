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
        { id: 99, status: 'paid', total: 10000000, created_at: '2026-01-15T10:30:00Z' },
        { id: 98, status: 'pending_payment', total: 5000000, created_at: '2026-01-10T08:00:00Z' },
      ],
    })
    renderPage()

    expect(await screen.findByText('Đơn hàng #99')).toBeInTheDocument()
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument()
    expect(screen.getByText('Đơn hàng #98')).toBeInTheDocument()
    expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument()
    expect(screen.getByText('10.000.000 ₫')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Đơn hàng #99/ })).toHaveAttribute('href', '/orders/99')
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
