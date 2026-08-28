import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AdminReturnsPage } from './AdminReturnsPage'
import * as ordersApi from '../../../features/admin/orders/api'

vi.mock('../../../features/admin/orders/api')

function renderPage(entry = '/admin/returns') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}><AdminReturnsPage /></MemoryRouter></QueryClientProvider>)
}

describe('AdminReturnsPage', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-08-26T08:00:00Z'))
    ordersApi.getOrders.mockResolvedValue({
      data: [{ id: 7, order_number: 'ORD-7', user: { name: 'Khách A', email: 'a@example.com' }, items: [{ id: 1, variant_snapshot: { product_name: 'Ghế Mây' } }, { id: 2, variant_snapshot: { product_name: 'Bàn Gỗ' } }], return_request: { status: 'requested', reason_category: 'not_as_described', reason: 'Không phù hợp', created_at: '2026-08-24T08:00:00Z' } }],
      meta: { last_page: 1 },
    })
  })

  afterEach(() => vi.useRealTimers())

  it('loads only orders having a return request and exposes visible status filters', async () => {
    renderPage()
    expect(await screen.findByRole('table', { name: 'Danh sách đổi trả' })).toBeInTheDocument()
    expect(screen.getByText('Không phù hợp')).toBeInTheDocument()
    expect(screen.getByText('Không đúng mô tả')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Sản phẩm' })).toBeInTheDocument()
    expect(screen.getByText('Ghế Mây +1')).toBeInTheDocument()
    expect(screen.getByText('Chờ 2 ngày')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xử lý' })).toHaveAttribute('href', '/admin/orders/7#return-request')
    expect(ordersApi.getOrders).toHaveBeenCalledWith({ page: 1, status: '', statusGroup: '', paymentMethod: '', paymentStatus: '', paymentQueue: '', returnStatus: '', hasReturn: true })

    await userEvent.click(screen.getByRole('button', { name: 'Chờ chuyển tiền' }))
    await waitFor(() => expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({ returnStatus: 'refund_pending', hasReturn: true })))
  })

  it.each([
    [[{ id: 1, variant_snapshot: { product_name: 'Ghế Mây' } }], '2026-08-26T06:00:00Z', 'Ghế Mây', 'Chờ 0 ngày'],
    [[], '2026-08-20T08:00:00Z', '—', 'Chờ 6 ngày'],
  ])('renders compact products and waiting age for legacy list shapes', async (items, createdAt, productText, ageText) => {
    ordersApi.getOrders.mockResolvedValue({
      data: [{ id: 8, order_number: 'ORD-8', user: { name: 'Khách B', email: 'b@example.com' }, items, return_request: { status: 'requested', reason: 'Khác', created_at: createdAt } }],
      meta: { last_page: 1 },
    })

    renderPage()
    expect(await screen.findByText(productText)).toBeInTheDocument()
    expect(screen.getByText(ageText)).toBeInTheDocument()
  })
})
