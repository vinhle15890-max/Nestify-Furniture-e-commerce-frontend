import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AdminOrdersPage } from './AdminOrdersPage'
import * as ordersApi from '../../../features/admin/orders/api'

vi.mock('../../../features/admin/orders/api')

const ordersResponse = {
  data: [
    {
      id: 101,
      status: 'processing',
      total: 7500000,
      created_at: '2026-01-10T08:00:00Z',
      user: { id: 1, name: 'Bao Le', email: 'bao@example.com' },
      items: [],
    },
  ],
  meta: { total: 1, page: 1, last_page: 1, per_page: 20 },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/orders']}>
        <Routes>
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/orders/:id" element={<div>Trang chi tiết đơn hàng</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ordersApi.getOrders.mockResolvedValue(ordersResponse)
  })

  it('renders the order list with customer info', async () => {
    renderPage()

    expect(await screen.findByText('Bao Le')).toBeInTheDocument()
    expect(screen.getByText('bao@example.com')).toBeInTheDocument()
    expect(screen.getByText('7.500.000 ₫')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Danh sách đơn hàng' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Thao tác' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem đơn hàng #101' })).toBeInTheDocument()
  })

  it('re-queries when the status filter changes', async () => {
    renderPage()
    await screen.findByText('Bao Le')

    await userEvent.selectOptions(screen.getByLabelText('Lọc theo trạng thái'), 'processing')

    await waitFor(() =>
      expect(ordersApi.getOrders).toHaveBeenCalledWith({ page: 1, status: 'processing' }),
    )
  })
})
