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
      payment_method: 'payos',
      payment: { status: 'paid' },
      items: [],
    },
  ],
  meta: { total: 1, page: 1, last_page: 1, per_page: 20 },
}

function renderPage(initialEntry = '/admin/orders') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/orders/:id" element={<div>Trang chi tiết đơn hàng</div>} />
          <Route path="/admin/returns" element={<div>Trang đổi trả riêng</div>} />
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

  it('shows the voucher snapshot beside the discounted order total', async () => {
    ordersApi.getOrders.mockResolvedValue({
      ...ordersResponse,
      data: [{
        ...ordersResponse.data[0],
        voucher_code: 'NESTIFY100',
        discount_amount: 100000,
      }],
    })

    renderPage()

    expect(await screen.findByText('Mã NESTIFY100 · -100.000 ₫')).toBeInTheDocument()
  })

  it('re-queries when the status filter changes', async () => {
    renderPage()
    await screen.findByText('Bao Le')

    await userEvent.click(screen.getByRole('button', { name: 'Đang xử lý' }))

    await waitFor(() =>
      expect(ordersApi.getOrders).toHaveBeenCalledWith({
        page: 1,
        status: 'processing',
        statusGroup: '',
        paymentMethod: '',
        paymentStatus: '',
        paymentQueue: '',
        returnStatus: '',
        hasReturn: false,
      }),
    )
  })

  it('searches orders through the server contract while preserving active filters', async () => {
    renderPage('/admin/orders?status=processing&page=3')
    await screen.findByText('Bao Le')

    await userEvent.type(screen.getByLabelText('Tìm theo mã đơn, khách hàng hoặc vận đơn'), 'GHN-7788')
    await userEvent.click(screen.getByRole('button', { name: 'Tìm đơn' }))

    await waitFor(() => expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
      q: 'GHN-7788',
      status: 'processing',
    })))
    expect(screen.getByRole('button', { name: 'Xóa tìm kiếm' })).toBeInTheDocument()
  })

  it('hydrates and clears an order search from the URL', async () => {
    renderPage('/admin/orders?q=bao%40example.com')

    expect(await screen.findByLabelText('Tìm theo mã đơn, khách hàng hoặc vận đơn')).toHaveValue('bao@example.com')
    expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({ q: 'bao@example.com' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xóa tìm kiếm' }))
    await waitFor(() => expect(ordersApi.getOrders).toHaveBeenLastCalledWith(expect.not.objectContaining({ q: expect.anything() })))
  })

  it('hydrates COD receivable filters from a dashboard drill-down link', async () => {
    renderPage('/admin/orders?payment_method=cod&payment_status=pending')

    await screen.findByText('Bao Le')
    expect(screen.getByRole('button', { name: 'COD cần thu' })).toHaveAttribute('aria-pressed', 'true')
    expect(ordersApi.getOrders).toHaveBeenCalledWith({
      page: 1,
      status: '',
      statusGroup: '',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      paymentQueue: '',
      returnStatus: '',
      hasReturn: false,
    })
  })

  it.each([
    ['/admin/orders?confirmation_queue=awaiting_online_payment&status_group=closed', { statusGroup: 'closed' }],
    ['/admin/orders?confirmation_queue=awaiting_online_payment&status=delivered', { status: 'delivered' }],
  ])('drops a conflicting dashboard confirmation queue from %s', async (url, expectedFilter) => {
    renderPage(url)

    await screen.findByText('Bao Le')
    await waitFor(() => expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({
      ...expectedFilter,
    })))
    expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.not.objectContaining({
      confirmationQueue: expect.anything(),
    }))
  })

  it('keeps pending payment separate from failed collection outcomes', async () => {
    ordersApi.getOrders.mockResolvedValue({
      ...ordersResponse,
      data: [
        { ...ordersResponse.data[0], id: 201, payment_method: 'cod', payment: { status: 'pending' } },
        { ...ordersResponse.data[0], id: 202, payment_method: 'cod', payment: { status: 'failed' } },
        { ...ordersResponse.data[0], id: 203, payment_method: 'payos', payment: { status: 'pending' } },
        { ...ordersResponse.data[0], id: 204, payment_method: 'payos', payment: { status: 'failed' } },
      ],
    })

    renderPage()

    expect(await screen.findByText('COD · Chưa thu tiền')).toBeInTheDocument()
    expect(screen.getByText('COD · Không thu được tiền')).toBeInTheDocument()
    expect(screen.getByText('PayOS · Chờ khách thanh toán')).toBeInTheDocument()
    expect(screen.getByText('PayOS · Thanh toán thất bại / hết hạn')).toBeInTheDocument()
    expect(screen.getByText('PayOS · Thanh toán thất bại / hết hạn').closest('td')).toHaveClass('whitespace-nowrap')
    expect(screen.queryByText(/Chưa thu \/ thất bại/)).not.toBeInTheDocument()
  })

  it('uses one operational filter for completed unsuccessful payment attempts', async () => {
    renderPage()
    await screen.findByText('Bao Le')

    await userEvent.click(screen.getByRole('button', { name: 'Không thành công' }))
    await waitFor(() => expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({
      paymentMethod: '',
      paymentStatus: 'failed',
    })))
  })

  it('separates actionable PayOS payments from cancelled legacy records', async () => {
    ordersApi.getOrders.mockResolvedValue({
      ...ordersResponse,
      data: [{
        ...ordersResponse.data[0],
        status: 'cancelled',
        payment_method: 'payos',
        payment: { status: 'pending', terminal_reason: null },
      }],
    })
    renderPage('/admin/orders?payment_method=payos&payment_status=pending&payment_queue=legacy_cancelled_pending')

    expect(await screen.findByText('PayOS · Đơn cũ cần đối soát')).toBeInTheDocument()
    expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({
      paymentMethod: 'payos',
      paymentStatus: 'pending',
      paymentQueue: 'legacy_cancelled_pending',
    }))
  })

  it('ignores legacy return filters and keeps order management in one place', async () => {
    renderPage('/admin/orders?return_status=requested')
    expect(await screen.findByText('Bao Le')).toBeInTheDocument()
    expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({ returnStatus: '' }))
  })

  it('keeps page and filters in the URL and explains active filters', async () => {
    renderPage('/admin/orders?status=processing&page=3')

    await screen.findByText('Bao Le')
    expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({ page: 3, status: 'processing' }))
    expect(screen.getByRole('button', { name: 'Đang xử lý' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getAllByRole('button', { name: 'Tất cả' })[0])
    await waitFor(() => expect(ordersApi.getOrders).toHaveBeenCalledWith(expect.objectContaining({ page: 1, status: '' })))
  })

  it('preserves the filtered-list URL when opening an order', async () => {
    renderPage('/admin/orders?status=processing&page=2')

    const link = await screen.findByRole('link', { name: 'Xem đơn hàng #101' })
    expect(link).toHaveAttribute('href', '/admin/orders/101')
    await userEvent.click(link)
    expect(await screen.findByText('Trang chi tiết đơn hàng')).toBeInTheDocument()
  })
})
