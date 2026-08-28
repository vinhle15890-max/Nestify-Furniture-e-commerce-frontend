import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AdminPaymentExceptionsPage } from './AdminPaymentExceptionsPage'
import * as paymentExceptionsApi from '../../../features/admin/paymentExceptions/api'

vi.mock('../../../features/admin/paymentExceptions/api')

const exception = {
  id: 12,
  amount: 7500000,
  reason: 'Thanh toán đến sau khi đơn đã hủy.',
  status: 'open',
  created_at: '2026-08-24T08:00:00Z',
  gateway_order_code: 'PAYOS-ORDER-12',
  gateway_payment_link_id: 'LINK-12',
  gateway_transaction_reference: 'TX-12',
  order: { id: 101, order_number: 'ORD-101', customer: { name: 'Khách A', email: 'a@example.com' } },
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><AdminPaymentExceptionsPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminPaymentExceptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    paymentExceptionsApi.getPaymentExceptions.mockResolvedValue({ data: [exception] })
    paymentExceptionsApi.resolveByRefund.mockResolvedValue({ data: { id: 6, status: 'requested' } })
  })

  it('keeps gateway identifiers in a collapsed Vietnamese reconciliation disclosure', async () => {
    renderPage()

    expect(await screen.findByText('ORD-101')).toBeInTheDocument()
    expect(screen.getByText('Khách A · a@example.com')).toBeInTheDocument()
    expect(screen.getByText('7.500.000 ₫')).toBeInTheDocument()
    expect(screen.getByText(/Chưa xử lý/)).toBeInTheDocument()

    const summary = screen.getByText('Chi tiết đối soát')
    const disclosure = summary.closest('details')
    expect(disclosure).not.toHaveAttribute('open')
    await userEvent.click(summary)
    expect(disclosure).toHaveAttribute('open')
    expect(within(disclosure).getByText('Mã đơn PayOS')).toBeInTheDocument()
    expect(within(disclosure).getByText('ID liên kết thanh toán')).toBeInTheDocument()
    expect(within(disclosure).getByText('Mã tham chiếu giao dịch')).toBeInTheDocument()
  })

  it('continues to the canonical refund block after resolving an exception', async () => {
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo nghĩa vụ hoàn tiền' }))

    expect(paymentExceptionsApi.resolveByRefund).toHaveBeenCalledWith(12, 'Hoàn toàn bộ khoản thanh toán đến sau khi hủy', expect.any(String))
    expect(await screen.findByRole('link', { name: 'Mở khoản hoàn tiền' })).toHaveAttribute('href', '/admin/orders/101#refunds')
    expect(screen.queryByRole('button', { name: 'Tạo nghĩa vụ hoàn tiền' })).not.toBeInTheDocument()
  })
})
