import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  payment_method: 'payos',
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
  it('keeps saved-room evidence attached to room-derived order items', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: { ...baseOrder, items: [{ ...baseOrder.items[0], room: { id: 9, name: 'Phòng khách', preview_url: null } }] } })
    renderPage()
    expect(await screen.findByText('Từ phòng “Phòng khách”')).toBeInTheDocument()
  })
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows cancel and retry actions for a pending-payment order', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: baseOrder })
    renderPage()

    expect(await screen.findByText('Đơn hàng #99')).toBeInTheDocument()
    expect(screen.getByText('Ghế Sofa Nâu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hủy đơn' })).toBeInTheDocument()
    const nextAction = screen.getByTestId('customer-next-action')
    expect(within(nextAction).getByRole('button', { name: 'Thử thanh toán lại' })).toBeInTheDocument()
    expect(screen.getByText(/Thanh toán online \(PayOS\)/)).toBeInTheDocument()
    expect(screen.queryByText(/Hãy để lại đánh giá/)).not.toBeInTheDocument()
  })

  it('lets the customer submit a payout destination for their refund', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: {
      ...baseOrder,
      status: 'cancelled',
      payment_method: 'payos',
      refunds: [{ id: 7, amount: 500000, status: 'requested', payout_destination: null }],
    } })
    ordersApi.submitRefundPayoutDetails.mockResolvedValue({ data: { status: 'submitted', account_number_masked: '******6789' } })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Cung cấp tài khoản nhận hoàn' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cung cấp tài khoản' }))
    const dialog = screen.getByRole('dialog', { name: 'Tài khoản nhận hoàn tiền' })
    await userEvent.type(within(dialog).getByText('Ngân hàng').closest('label').querySelector('input'), 'MB Bank')
    await userEvent.type(within(dialog).getByText('Tên chủ tài khoản').closest('label').querySelector('input'), 'NGUYEN VAN A')
    await userEvent.type(within(dialog).getByText('Số tài khoản').closest('label').querySelector('input'), '0123456789')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận tài khoản nhận hoàn' }))

    await waitFor(() => expect(ordersApi.submitRefundPayoutDetails).toHaveBeenCalledWith(7, {
      bank_name: 'MB Bank', account_holder_name: 'NGUYEN VAN A', account_number: '0123456789',
    }))
  })

  it('shows a correction reason without exposing the full account number', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: {
      ...baseOrder,
      status: 'cancelled',
      refunds: [{ id: 7, amount: 500000, status: 'requested', payout_destination: {
        status: 'correction_required', bank_name: 'MB Bank', account_holder_name: 'NGUYEN VAN A',
        account_number_masked: '******6789', correction_reason: 'Tên chủ tài khoản không khớp.',
      } }],
    } })
    renderPage()

    expect(await screen.findByText(/Tên chủ tài khoản không khớp/)).toBeInTheDocument()
    expect(screen.getByText('******6789')).toBeInTheDocument()
    expect(screen.queryByText('0123456789')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cập nhật tài khoản nhận hoàn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cập nhật tài khoản' })).toBeInTheDocument()
  })

  it('hides cancel and retry actions and links delivered products to their review form', async () => {
    ordersApi.getOrder.mockResolvedValue({
      data: {
        ...baseOrder,
        status: 'delivered',
        items: [{
          ...baseOrder.items[0],
          variant_snapshot: {
            ...baseOrder.items[0].variant_snapshot,
            product_name: 'Sofa Mây',
            product_slug: 'sofa-may',
          },
        }],
      },
    })
    renderPage()

    expect(await screen.findByText('Đơn hàng #99')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hủy đơn' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thử thanh toán lại' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Đánh giá sản phẩm' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Viết đánh giá' })).toHaveAttribute('href', '/p/sofa-may#reviews')
    expect(screen.getByText('Quyết định của bạn đang dần thành hình.')).toBeInTheDocument()
    expect(screen.queryByText(/Những món này đang trên đường/)).not.toBeInTheDocument()
  })

  it('routes delivered-order support to the official phone instead of a self-service return form', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: { ...baseOrder, status: 'delivered', return_request: null } })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Hỗ trợ sau khi nhận hàng' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gọi 0945691309' })).toHaveAttribute('href', 'tel:0945691309')
    expect(screen.queryByRole('button', { name: 'Yêu cầu đổi trả' })).not.toBeInTheDocument()
  })

  it('replaces the review link when the product was already reviewed from another order', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: {
      ...baseOrder,
      status: 'delivered',
      items: [{
        ...baseOrder.items[0],
        review: { id: 41, status: 'approved' },
        variant_snapshot: { ...baseOrder.items[0].variant_snapshot, product_name: 'Sofa Mây', product_slug: 'sofa-may' },
      }],
    } })
    renderPage()

    expect((await screen.findAllByText('Sofa Mây')).length).toBeGreaterThan(0)
    expect(screen.getByText('Đã đánh giá')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Viết đánh giá' })).not.toBeInTheDocument()
  })

  it('surfaces shipment as the next action without merging payment status', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: {
      ...baseOrder,
      status: 'shipped',
      payment_method: 'cod',
      payment: { status: 'pending' },
      fulfillment: { carrier_name: 'GHTK', tracking_number: 'GH-0099' },
    } })
    renderPage()

    expect(await screen.findByRole('link', { name: 'Xem vận chuyển' })).toHaveAttribute('href', '#shipment')
    expect(screen.getByText('GHTK · GH-0099')).toBeInTheDocument()
    expect(screen.getByText('Đang giao')).toBeInTheDocument()
    expect(screen.getByText(/Thanh toán khi nhận hàng \(COD\)/)).toBeInTheDocument()
  })

  it('does not offer a broken review link when a delivered product no longer has a slug', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: { ...baseOrder, status: 'delivered' } })
    renderPage()

    expect(await screen.findByText('Sản phẩm không còn được hiển thị')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Viết đánh giá' })).not.toBeInTheDocument()
  })

  it('shows the cancel action for a paid order with a refund note, and cancels with a reason', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: { ...baseOrder, status: 'paid', payment_method: 'payos' } })
    ordersApi.cancelOrder.mockResolvedValue({ data: { ...baseOrder, status: 'cancelled' } })
    renderPage()

    await screen.findByText('Đơn hàng #99')
    await userEvent.click(screen.getByRole('button', { name: 'Hủy đơn' }))

    // Paid orders warn about the refund.
    expect(screen.getByText(/cung cấp tài khoản nhận hoàn/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Không còn nhu cầu' }))
    expect(screen.getByPlaceholderText(/đặt nhầm/)).toHaveValue('Không còn nhu cầu')
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy' }))

    expect(ordersApi.cancelOrder).toHaveBeenCalledWith(99, 'Không còn nhu cầu')
  })

  it('shows the cancel action for a COD processing order without a refund note', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: { ...baseOrder, status: 'processing', payment_method: 'cod' } })
    renderPage()

    await screen.findByText('Đơn hàng #99')
    await userEvent.click(screen.getByRole('button', { name: 'Hủy đơn' }))

    expect(screen.queryByText(/sẽ được hoàn tiền/)).not.toBeInTheDocument()
    expect(screen.getByText('Đơn COD chưa thu tiền nên không có khoản hoàn tiền.')).toBeInTheDocument()
    // Cancelling with no reason sends undefined.
    ordersApi.cancelOrder.mockResolvedValue({ data: { ...baseOrder, status: 'cancelled' } })
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy' }))
    expect(ordersApi.cancelOrder).toHaveBeenCalledWith(99, undefined)
  })

  it('shows a fully discounted PayOS order without claiming an online refund', async () => {
    ordersApi.getOrder.mockResolvedValue({
      data: { ...baseOrder, status: 'processing', payment_method: 'payos', discount_amount: 10000000, total: 0 },
    })
    renderPage()

    expect(await screen.findByText(/Đã áp dụng mã giảm giá toàn bộ/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hủy đơn' }))
    expect(screen.queryByText(/sẽ được hoàn tiền/)).not.toBeInTheDocument()
  })

  it('cancels a pending-payment order through the confirm dialog', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: baseOrder })
    ordersApi.cancelOrder.mockResolvedValue({ data: { ...baseOrder, status: 'cancelled' } })
    renderPage()

    await screen.findByText('Đơn hàng #99')
    await userEvent.click(screen.getByRole('button', { name: 'Hủy đơn' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy' }))

    expect(ordersApi.cancelOrder).toHaveBeenCalledWith(99, undefined)
  })

  it('refetches and hides retry when the order is already paid', async () => {
    ordersApi.getOrder.mockResolvedValue({ data: baseOrder })
    checkoutApi.createPaymentSession.mockRejectedValue(
      new ApiError('ORDER_ALREADY_PAID', 'Đơn hàng đã được thanh toán.', null, 409),
    )
    renderPage()

    await screen.findByText('Đơn hàng #99')

    ordersApi.getOrder.mockResolvedValue({ data: { ...baseOrder, status: 'paid' } })
    await userEvent.click(screen.getByRole('button', { name: 'Thử thanh toán lại' }))

    expect(navigation.redirectToExternal).not.toHaveBeenCalled()
    await screen.findByText('Đã thanh toán')
    expect(screen.queryByRole('button', { name: 'Thử thanh toán lại' })).not.toBeInTheDocument()
  })
})
