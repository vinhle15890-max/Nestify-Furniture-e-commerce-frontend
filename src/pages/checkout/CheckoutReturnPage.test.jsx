import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { CheckoutReturnPage } from './CheckoutReturnPage'
import * as checkoutApi from '../../features/checkout/api'
import { ApiError } from '../../lib/errors'

vi.mock('../../features/checkout/api')

function renderPage(initialPath, seed) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (seed) {
    queryClient.setQueryData(['payment-reconcile', seed.orderId], seed.data)
  }
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

  it('does not call reconcile for a malformed order_id', () => {
    renderPage('/checkout/return?order_id=99oops')

    expect(screen.getByText(/Mã đơn hàng không hợp lệ/)).toBeInTheDocument()
    expect(checkoutApi.reconcilePayment).not.toHaveBeenCalled()
  })

  it('shows an explicit error and safely retries reconciliation', async () => {
    checkoutApi.reconcilePayment
      .mockRejectedValueOnce(new ApiError('GATEWAY_UNAVAILABLE', 'raw gateway error', null, 503))
      .mockResolvedValueOnce({ data: { id: 99, status: 'paid' }, meta: { payment_status: 'success' } })
    renderPage('/checkout/return?order_id=99')

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể xác minh thanh toán')
    expect(screen.queryByText('raw gateway error')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText(/Thanh toán thành công/)).toBeInTheDocument()
    expect(checkoutApi.reconcilePayment).toHaveBeenCalledTimes(2)
  })

  it('does not hide a reconciliation error behind stale pending data', async () => {
    checkoutApi.reconcilePayment.mockRejectedValue(
      new ApiError('GATEWAY_UNAVAILABLE', 'raw gateway error', null, 503),
    )
    renderPage('/checkout/return?order_id=99', {
      orderId: '99',
      data: { data: { id: 99, status: 'pending_payment' }, meta: { payment_status: 'pending' } },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa thể xác minh thanh toán')
    expect(screen.queryByText(/Đang xác nhận thanh toán/)).not.toBeInTheDocument()
  })

  it('shows a success message and stops polling once payment is confirmed', async () => {
    checkoutApi.reconcilePayment.mockResolvedValue({ data: { id: 99, order_number: 'NES-99', status: 'paid' }, meta: { payment_status: 'success' } })
    renderPage('/checkout/return?order_id=99')

    expect(await screen.findByText(/Thanh toán thành công/)).toBeInTheDocument()
    expect(screen.getByText('Đơn hàng NES-99')).toBeInTheDocument()
    expect(screen.getByText(/không tạo thêm đơn/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem chi tiết đơn hàng' })).toHaveAttribute('href', '/orders/99')
    expect(checkoutApi.reconcilePayment).toHaveBeenCalledTimes(1)
  })

  it('shows a cancelled message when the order was cancelled', async () => {
    checkoutApi.reconcilePayment.mockResolvedValue({ data: { id: 99, status: 'cancelled' } })
    renderPage('/checkout/return?order_id=99')

    expect(await screen.findByText(/Đơn hàng đã bị hủy/)).toBeInTheDocument()
  })

  it('shows a recoverable failed-payment result and stops polling', async () => {
    vi.useFakeTimers()
    checkoutApi.reconcilePayment.mockResolvedValue({
      data: { id: 99, status: 'pending_payment' },
      meta: { payment_status: 'failed' },
    })
    renderPage('/checkout/return?order_id=99')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })

    expect(screen.getByText(/Thanh toán chưa hoàn tất/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem chi tiết đơn hàng' })).toHaveAttribute('href', '/orders/99')
    expect(checkoutApi.reconcilePayment).toHaveBeenCalledTimes(1)
  })

  it('times out and shows a still-confirming message if payment stays pending', async () => {
    vi.useFakeTimers()
    checkoutApi.reconcilePayment.mockResolvedValue({ data: { id: 99, status: 'pending_payment' } })
    renderPage('/checkout/return?order_id=99')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    for (let attempt = 0; attempt < 9; attempt += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
    }

    expect(screen.getByText(/vẫn đang xác nhận thanh toán/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kiểm tra lại trạng thái' })).toBeInTheDocument()
    expect(checkoutApi.reconcilePayment).toHaveBeenCalledTimes(10)

    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại trạng thái' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(checkoutApi.reconcilePayment).toHaveBeenCalledTimes(11)
  })
})
