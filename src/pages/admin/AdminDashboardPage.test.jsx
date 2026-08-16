import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
    manual_refunds: {
      count: 1,
      total_amount: 10000,
      orders: [
        {
          id: 13,
          order_number: 'NES-260815-0013',
          amount: 10000,
          reason: 'Không còn nhu cầu',
          cancelled_at: '2026-08-15T13:00:00Z',
        },
      ],
    },
  },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
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

  it('renders a decorative brand watermark in the revenue hero', async () => {
    const { container } = renderPage()
    expect(await screen.findByText('Doanh thu')).toBeInTheDocument()
    expect(container.querySelector('[data-brand-watermark]')).toBeTruthy()
  })

  it('shows manual PayOS refund reminders with a direct order link', async () => {
    renderPage()

    expect(await screen.findByText('Có khoản hoàn tiền cần xử lý')).toBeInTheDocument()
    expect(screen.getByText('NES-260815-0013')).toBeInTheDocument()
    expect(screen.getByText('Không còn nhu cầu')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /NES-260815-0013/ })).toHaveAttribute(
      'href',
      '/admin/orders/13',
    )
  })
})
