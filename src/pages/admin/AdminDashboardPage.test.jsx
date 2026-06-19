import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminDashboardPage } from './AdminDashboardPage'
import * as dashboardApi from '../../features/admin/dashboard/api'

vi.mock('../../features/admin/dashboard/api')

const dashboardResponse = {
  data: {
    orders: {
      total: 5,
      pending_payment: 1,
      paid: 2,
      processing: 0,
      shipped: 0,
      delivered: 1,
      cancelled: 1,
    },
    revenue: 150000,
    catalog: { products: 3, active_products: 3 },
    customers: 4,
    pending_reviews: 1,
  },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminDashboardPage />
    </QueryClientProvider>,
  )
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dashboardApi.getDashboard.mockResolvedValue(dashboardResponse)
  })

  it('renders aggregated stats from the dashboard endpoint', async () => {
    renderPage()

    expect(await screen.findByText('Tổng đơn hàng')).toBeInTheDocument()
    // revenue formatted as VND
    expect(screen.getByText(/150[.,]000/)).toBeInTheDocument()
    expect(screen.getByText('Khách hàng')).toBeInTheDocument()
    expect(screen.getByText('Đánh giá chờ duyệt')).toBeInTheDocument()
  })
})
