import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    ordersApi.getOrders.mockResolvedValue({
      data: [{ id: 7, order_number: 'ORD-7', user: { name: 'Khách A', email: 'a@example.com' }, return_request: { status: 'requested', reason: 'Không phù hợp', created_at: '2026-08-24T08:00:00Z' } }],
      meta: { last_page: 1 },
    })
  })

  it('loads only orders having a return request and exposes visible status filters', async () => {
    renderPage()
    expect(await screen.findByRole('table', { name: 'Danh sách đổi trả' })).toBeInTheDocument()
    expect(screen.getByText('Không phù hợp')).toBeInTheDocument()
    expect(ordersApi.getOrders).toHaveBeenCalledWith({ page: 1, status: '', statusGroup: '', paymentMethod: '', paymentStatus: '', paymentQueue: '', returnStatus: '', hasReturn: true })

    await userEvent.click(screen.getByRole('button', { name: 'Chờ chuyển tiền' }))
    await waitFor(() => expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({ returnStatus: 'refund_pending', hasReturn: true })))
  })
})
