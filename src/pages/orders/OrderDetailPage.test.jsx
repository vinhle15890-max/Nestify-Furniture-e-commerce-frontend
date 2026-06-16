import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OrderDetailPage } from './OrderDetailPage'
import * as ordersApi from '../../features/orders/api'
import * as checkoutApi from '../../features/checkout/api'
import * as navigation from '../../lib/navigation'
import { ApiError } from '../../lib/errors'

vi.mock('../../features/orders/api')
vi.mock('../../features/checkout/api')
vi.mock('../../lib/navigation')

const baseOrder = {
  id: 99,
  status: 'pending_payment',
  subtotal: 10000000,
  discount_amount: 0,
  total: 10000000,
  notes: null,
  created_at: '2026-01-15T10:30:00Z',
  shipping_address: {
    recipient_name: 'Bao',
    phone: '0123456789',
    address_line1: '123 Đường A',
    address_line2: null,
    city: 'TP.HCM',
    province: 'TP.HCM',
    postal_code: '70000',
  },
  items: [
    {
      id: 1,
      variant_id: 1,
      variant_snapshot: { name: 'Ghế Sofa Nâu', sku: 'SOFA-NAU' },
      quantity: 2,
      unit_price: 5000000,
      subtotal: 10000000,
    },
  ],
}

function renderPage(orderId = '99') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/orders/${orderId}`]}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows cancel and retry actions for a pending-payment order', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: baseOrder })
    renderPage()

    expect(await screen.findByText('Đơn hàng #99')).toBeInTheDocument()
    expect(screen.getByText('Ghế Sofa Nâu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hủy đơn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thanh toán lại' })).toBeInTheDocument()
    expect(screen.queryByText(/Hãy để lại đánh giá/)).not.toBeInTheDocument()
  })

  it('hides cancel and retry actions and shows a review hint for a delivered order', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: { ...baseOrder, status: 'delivered' } })
    renderPage()

    expect(await screen.findByText('Đơn hàng #99')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hủy đơn' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thanh toán lại' })).not.toBeInTheDocument()
    expect(screen.getByText(/Hãy để lại đánh giá/)).toBeInTheDocument()
  })

  it('cancels the order on confirmation', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: baseOrder })
    ordersApi.cancelOrder.mockResolvedValue({ data: { ...baseOrder, status: 'cancelled' } })
    renderPage()

    await screen.findByText('Đơn hàng #99')

    await userEvent.click(screen.getByRole('button', { name: 'Hủy đơn' }))

    expect(ordersApi.cancelOrder).toHaveBeenCalledWith(99)
  })

  it('refetches and hides retry when the order is already paid', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: baseOrder })
    checkoutApi.createPaymentSession.mockRejectedValue(
      new ApiError('ORDER_ALREADY_PAID', 'Đơn hàng đã được thanh toán.', null, 409),
    )
    renderPage()

    await screen.findByText('Đơn hàng #99')

    ordersApi.getOrder.mockResolvedValue({ data: { ...baseOrder, status: 'paid' } })
    await userEvent.click(screen.getByRole('button', { name: 'Thanh toán lại' }))

    expect(navigation.redirectToExternal).not.toHaveBeenCalled()
    await screen.findByText('Đã thanh toán')
    expect(screen.queryByRole('button', { name: 'Thanh toán lại' })).not.toBeInTheDocument()
  })
})
