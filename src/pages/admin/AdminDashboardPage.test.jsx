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
      orders_delivered: 2,
      delivered_order_value: 900000,
      cod_receivable: 500000,
      units_sold: 3,
      series: [{ period: '2026-08-17', cash_collected: 160000, refunds: 10000, net_revenue: 150000 }],
    },
    inventory: { on_hand: 40, reserved: 5, available: 35, stock_in: 8, stock_out: 3, low_stock: 2, out_of_stock: 1, series: [{ period: '2026-08-17', stock_in: 8, stock_out: 3 }] },
    top_sellers: [{ id: 7, name: 'Ghế bán chạy', units_sold: 3, delivered_value: 900000 }],
    business_insights: {
      orders: { new: 5, cancelled: 1, refund_pending: 1 },
      payment_mix: { payos: { amount: 100000, payments_count: 1 }, cod: { amount: 60000, payments_count: 1 } },
      vouchers: { orders_count: 2, discount_amount: 30000 },
      customers: { ordering: 3, new: 2, returning: 1 },
      bottom_sellers: [{ id: 11, name: 'Tủ chưa bán', slug: 'tu-chua-ban', units_sold: 0 }],
      steady_sellers: [{ id: 7, name: 'Ghế bán chạy', units_sold: 3, active_weeks: 2 }],
      inventory_leaders: [{ id: 12, name: 'Sofa tồn nhiều', on_hand: 30, available: 28, units_sold: 1 }],
      vouchers_most_used: [{ id: 2, code: 'HOME30', orders_count: 5, discount_amount: 30000 }],
      vouchers_least_used: [{ id: 3, code: 'SLOW10', orders_count: 0, discount_amount: 0 }],
      top_customers: [{ id: 4, name: 'Nguyễn An', orders_count: 3, delivered_value: 800000, voucher_orders: 2 }],
    },
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

async function openBusinessView() {
  await userEvent.click(await screen.findByRole('button', { name: /Phân tích kinh doanh/ }))
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dashboardApi.getDashboard.mockResolvedValue(dashboardResponse)
  })

  it('renders aggregated stats from the dashboard endpoint', async () => {
    renderPage()
    await openBusinessView()

    expect(await screen.findByText('Đơn hàng trong kỳ')).toBeInTheDocument()
    // revenue formatted as VND
    expect(screen.getAllByText(/150[.,]000/).length).toBeGreaterThan(0)
    expect(screen.getByText('Tủ chưa bán')).toBeInTheDocument()
    expect(screen.queryByText('Sofa tồn nhiều')).not.toBeInTheDocument()
    expect(screen.getByText('HOME30')).toBeInTheDocument()
    expect(screen.getByText('SLOW10')).toBeInTheDocument()
    expect(screen.getByText('Nguyễn An')).toBeInTheDocument()
    expect(screen.queryByText('Cơ cấu tiền đã thu')).not.toBeInTheDocument()
    expect(screen.queryByText('Khách hàng và voucher')).not.toBeInTheDocument()
  })

  it('shows the operational period results without a decorative hero', async () => {
    renderPage()
    await openBusinessView()
    expect((await screen.findAllByText('Tiền thực thu')).length).toBeGreaterThan(0)
    expect(screen.getByText('Kết quả trong kỳ')).toBeInTheDocument()
    expect(screen.getByText('Sản phẩm đã giao')).toBeInTheDocument()
    expect(screen.getByText('Giá trị đơn trung bình')).toBeInTheDocument()
    expect(screen.getByText(/450[.,]000/)).toBeInTheDocument()
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

  it('does not advertise the internal inventory workbench on the dashboard', async () => {
    renderPage()
    expect(await screen.findByText('Việc cần làm')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Biến thể cần bổ sung hàng/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Tồn kho và biến động trong kỳ')).not.toBeInTheDocument()
  })

  it('keeps product decisions focused on delivered sales and period reconciliation on money', async () => {
    renderPage()
    expect(screen.queryByText('Sản phẩm bán chạy')).not.toBeInTheDocument()
    await openBusinessView()
    expect(screen.getByText('Đối chiếu tiền theo kỳ')).toBeInTheDocument()
    expect(screen.getByText('2026-08-17')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Ghế bán chạy/ })[0]).toHaveAttribute('href', '/admin/products/7')
    expect(screen.queryByText('Tồn kho nhiều nhất')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Nhập' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Xuất' })).not.toBeInTheDocument()
  })

  it('shows current Flash Sale capacity separately from delivered period revenue', async () => {
    renderPage()
    await openBusinessView()

    expect(await screen.findByText('Vận hành Flash Sale')).toBeInTheDocument()
    expect(screen.getByText('Đã phân bổ / quota')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sofa Flash' })).toHaveAttribute('href', '/admin/products/8')
    expect(screen.getByText('Đang chạy')).toBeInTheDocument()
  })

  it('applies a seven-day preset through the dashboard API filters', async () => {
    renderPage()
    await openBusinessView()
    await userEvent.click(screen.getByRole('button', { name: '7 ngày' }))

    expect(dashboardApi.getDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ interval: 'day' }))
  })

  it('supports a current-year revenue report grouped by month', async () => {
    renderPage()
    await openBusinessView()
    await userEvent.click(screen.getByRole('button', { name: 'Năm nay' }))

    expect(dashboardApi.getDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ interval: 'month' }))
  })

  it('drills operations queues into matching order filters', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: /Đơn cần chuẩn bị hàng/ })).toHaveAttribute('href', '/admin/orders?status=processing')
    expect(screen.getByRole('link', { name: /COD cần xác nhận thu tiền/ })).toHaveAttribute('href', '/admin/orders?payment_method=cod&payment_status=pending')
    expect(screen.getByRole('link', { name: /Yêu cầu đổi trả cần xem/ })).toHaveAttribute('href', '/admin/returns?status=requested')
    expect(screen.getByRole('link', { name: /Hàng trả đã nhận, chờ ghi hoàn/ })).toHaveAttribute('href', '/admin/returns?status=received')
    expect(screen.getByRole('link', { name: /Đổi trả chờ chuyển tiền/ })).toHaveAttribute('href', '/admin/returns?status=refund_pending')
    expect(screen.getByRole('link', { name: /Đã giao.*Mở danh sách/ })).toHaveAttribute('href', '/admin/orders?status=delivered')
  })
})
