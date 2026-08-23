import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { PageHeader } from '../../../components/admin/PageHeader'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useAdminOrders } from '../../../features/admin/orders/hooks'
import { ORDER_STATUS_LABELS } from '../../../features/orders/statusLabels'
import { formatPrice, formatDate } from '../../../lib/format'

export function AdminOrdersPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const status = searchParams.get('status') ?? ''
  const paymentMethod = searchParams.get('payment_method') ?? ''
  const paymentStatus = searchParams.get('payment_status') ?? ''
  const returnStatus = searchParams.get('return_status') ?? ''
  const { data, isLoading, isError, isFetching, refetch } = useAdminOrders(page, status, paymentMethod, paymentStatus, returnStatus)

  const orders = data?.data ?? []
  const meta = data?.meta?.pagination ?? data?.meta ?? { last_page: 1 }
  const activeFilters = [
    status && `Trạng thái: ${ORDER_STATUS_LABELS[status]?.label ?? status}`,
    paymentMethod === 'cod' && paymentStatus === 'pending' && 'Thanh toán: COD chờ thu',
    returnStatus && `Đổi trả: ${{ requested: 'Chờ xem xét', in_transit: 'Hàng đang gửi về', received: 'Chờ ghi hoàn', refund_pending: 'Chờ chuyển tiền', completed: 'Đã hoàn tất' }[returnStatus] ?? returnStatus}`,
  ].filter(Boolean)

  const updateFilter = (mutate) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      mutate(next)
      next.delete('page')
      return next
    })
  }

  const handleStatusChange = (event) => {
    updateFilter((next) => {
      event.target.value ? next.set('status', event.target.value) : next.delete('status')
    })
  }

  const handlePaymentChange = (event) => {
    updateFilter((next) => {
      if (event.target.value === 'cod_pending') {
        next.set('payment_method', 'cod')
        next.set('payment_status', 'pending')
      } else {
        next.delete('payment_method')
        next.delete('payment_status')
      }
    })
  }

  return (
    <div>
      <PageHeader
        icon={Receipt}
        title="Đơn hàng"
        description="Theo dõi và cập nhật trạng thái đơn hàng của khách."
        actions={<div className="flex flex-wrap gap-2">
          <select
            id="status-filter"
            value={status}
            onChange={handleStatusChange}
            aria-label="Lọc theo trạng thái"
            className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, info]) => (
              <option key={value} value={value}>
                {info.label}
              </option>
            ))}
          </select>
          <select value={returnStatus} onChange={(event) => updateFilter((next) => { event.target.value ? next.set('return_status', event.target.value) : next.delete('return_status') })} aria-label="Lọc theo đổi trả" className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface">
            <option value="">Tất cả đổi trả</option><option value="requested">Chờ xem xét</option><option value="in_transit">Hàng đang gửi về</option><option value="received">Chờ ghi hoàn</option><option value="refund_pending">Chờ chuyển tiền</option><option value="completed">Đã hoàn tất</option>
          </select>
          <select
            value={paymentMethod === 'cod' && paymentStatus === 'pending' ? 'cod_pending' : ''}
            onChange={handlePaymentChange}
            aria-label="Lọc theo thanh toán"
            className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
          >
            <option value="">Tất cả thanh toán</option>
            <option value="cod_pending">COD chờ thu</option>
          </select>
        </div>}
      />

      {activeFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm" aria-label="Bộ lọc đang áp dụng">
          <span className="text-muted-foreground">Đang lọc:</span>
          {activeFilters.map((filter) => <span key={filter} className="rounded-full border border-border bg-surface-alt px-3 py-1 text-foreground">{filter}</span>)}
          <button type="button" onClick={() => setSearchParams({})} className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline">Xóa bộ lọc</button>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải đơn hàng..." />
        ) : isError && !data ? (
          <LoadErrorState title="Chưa thể tải đơn hàng" description="Bộ lọc hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
        ) : orders.length === 0 ? (
          <Card>
            <EmptyState
              illustration="package"
              title={activeFilters.length > 0 ? 'Không có đơn phù hợp' : 'Chưa có đơn hàng nào'}
              description={activeFilters.length > 0 ? 'Hãy thay đổi hoặc xóa bộ lọc đang áp dụng.' : 'Đơn hàng của khách sẽ xuất hiện ở đây.'}
            />
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách đơn hàng</caption>
              <thead>
                <tr className="border-b border-border bg-surface-alt/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Tổng tiền</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusInfo = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, tone: 'neutral' }
                  return (
                    <tr key={order.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40">
                      <td className="px-4 py-3 font-medium text-foreground">{order.order_number ?? `#${order.id}`}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{order.user?.name}</p>
                        <p className="text-muted-foreground">{order.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3 text-foreground">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          state={{ order, returnTo: `${location.pathname}${location.search}` }}
                          aria-label={`Xem đơn hàng ${order.order_number ?? `#${order.id}`}`}
                          className="font-medium text-foreground transition-colors hover:text-accent"
                        >
                          Xem
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={(nextPage) => setSearchParams((current) => { const next = new URLSearchParams(current); nextPage > 1 ? next.set('page', String(nextPage)) : next.delete('page'); return next })} />
      </div>
    </div>
  )
}
