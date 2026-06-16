import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { CheckoutReturnPage } from './CheckoutReturnPage'
import * as ordersApi from '../../features/orders/api'

vi.mock('../../features/orders/api')

function renderPage(initialPath) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <CheckoutReturnPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CheckoutReturnPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a fallback message when order_id is missing', () => {
    renderPage('/checkout/return')
    expect(screen.getByText(/Không tìm thấy đơn hàng/)).toBeInTheDocument()
  })

  it('shows a success message and stops polling once payment is confirmed', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: { id: 99, status: 'paid' } })
    renderPage('/checkout/return?order_id=99')

    expect(await screen.findByText(/Thanh toán thành công/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem chi tiết đơn hàng' })).toHaveAttribute('href', '/orders/99')
    expect(ordersApi.getOrder).toHaveBeenCalledTimes(1)
  })

  it('shows a cancelled message when the order was cancelled', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: { id: 99, status: 'cancelled' } })
    renderPage('/checkout/return?order_id=99')

    expect(await screen.findByText(/Đơn hàng đã bị hủy/)).toBeInTheDocument()
  })

  it('times out and shows a still-confirming message if payment stays pending', async () => {
    vi.useFakeTimers()
    ordersApi.getOrder.mockResolvedValue({ data: { id: 99, status: 'pending_payment' } })
    renderPage('/checkout/return?order_id=99')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })

    expect(screen.getByText(/vẫn đang xác nhận thanh toán/)).toBeInTheDocument()
  })
})
