import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminDashboardPage } from './AdminDashboardPage'
import * as dashboardApi from '../../features/admin/dashboard/api'

vi.mock('../../features/admin/dashboard/api')

const dashboardResponse = {
  data: {
    orders: {
      total: 5,
      pending_confirmation: 1,
      pending_payment: 1,
      paid: 2,
      processing: 0,
      shipped: 0,
      delivered: 1,
      cancelled: 1,
    },
    revenue: 150000,
    finance: {
      date_from: '2026-08-01',
      date_to: '2026-08-23',
      interval: 'week',
      cash_collected: 160000,
      refunds: 10000,
      net_revenue: 150000,
      cod_receivable: 500000,
      units_sold: 3,
      series: [{ period: '2026-08-17', cash_collected: 160000, refunds: 10000, net_revenue: 150000 }],
    },
    inventory: { on_hand: 40, reserved: 5, available: 35, stock_in: 8, stock_out: 3, low_stock: 2, out_of_stock: 1, series: [{ period: '2026-08-17', stock_in: 8, stock_out: 3 }] },
    top_sellers: [{ id: 7, name: 'Ghế bán chạy', units_sold: 3, delivered_value: 900000 }],
    flash_sales: {
      active_variants: 1, total_quota: 10, allocated_units: 4, released_units: 1, remaining_units: 6, delivered_units: 2, delivered_revenue: 1400000,
      variants: [{ id: 9, product_id: 8, product_name: 'Sofa Flash', variant_name: 'Vải kem', status: 'active', quota: 10, allocated_units: 4, released_units: 1, remaining_units: 6, delivered_units: 2, delivered_revenue: 1400000 }],
    },
    operations: { processing: 2, shipped: 1, delivery_failed: 1, cod_receivable_count: 2, low_stock: 2, return_requests_pending: 1, return_refunds_pending: 1, return_payouts_pending: 1 },
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
    expect(screen.getAllByText(/150[.,]000/).length).toBeGreaterThan(0)
    expect(screen.getByText('Khách hàng')).toBeInTheDocument()
    expect(screen.getByText('Đánh giá chờ duyệt')).toBeInTheDocument()
  })

  it('renders a decorative brand watermark in the revenue hero', async () => {
    const { container } = renderPage()
    expect((await screen.findAllByText('Tiền thực thu')).length).toBeGreaterThan(0)
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

  it('links the low-stock queue to inventory operations', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: /Biến thể sắp hết hàng/ })).toHaveAttribute(
      'href',
      '/admin/inventory',
    )
  })

  it('renders inventory period evidence and delivered top sellers', async () => {
    renderPage()

    expect(await screen.findByText('Tồn kho và biến động trong kỳ')).toBeInTheDocument()
    expect(screen.getByText('Đối chiếu theo kỳ')).toBeInTheDocument()
    expect(screen.getByText('2026-08-17')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ghế bán chạy/ })).toHaveAttribute('href', '/admin/products/7')
  })

  it('shows current Flash Sale capacity separately from delivered period revenue', async () => {
    renderPage()

    expect(await screen.findByText('Vận hành Flash Sale')).toBeInTheDocument()
    expect(screen.getByText('Đã phân bổ / quota')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sofa Flash' })).toHaveAttribute('href', '/admin/products/8')
    expect(screen.getByText('Đang chạy')).toBeInTheDocument()
  })

  it('applies a seven-day preset through the dashboard API filters', async () => {
    renderPage()
    await screen.findByText('Tổng đơn hàng')
    await userEvent.click(screen.getByRole('button', { name: '7 ngày' }))

    expect(dashboardApi.getDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ interval: 'day' }))
  })

  it('drills operations queues into matching order filters', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: /Đơn đang xử lý/ })).toHaveAttribute('href', '/admin/orders?status=processing')
    expect(screen.getByRole('link', { name: /COD chờ thu/ })).toHaveAttribute('href', '/admin/orders?payment_method=cod&payment_status=pending')
    expect(screen.getByRole('link', { name: /Yêu cầu đổi trả/ })).toHaveAttribute('href', '/admin/orders?return_status=requested')
    expect(screen.getByRole('link', { name: /Đổi trả chờ ghi hoàn/ })).toHaveAttribute('href', '/admin/orders?return_status=received')
    expect(screen.getByRole('link', { name: /Đổi trả chờ chuyển tiền/ })).toHaveAttribute('href', '/admin/orders?return_status=refund_pending')
  })
})
