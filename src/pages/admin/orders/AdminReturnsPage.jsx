import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { PageHeader } from '../../../components/admin/PageHeader'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useAdminOrders } from '../../../features/admin/orders/hooks'
import { formatDate } from '../../../lib/format'

const RETURN_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'requested', label: 'Chờ xem xét' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'in_transit', label: 'Đang gửi về' },
  { value: 'received', label: 'Đã nhận hàng' },
  { value: 'refund_pending', label: 'Chờ chuyển tiền' },
  { value: 'completed', label: 'Hoàn tất' },
  { value: 'rejected', label: 'Từ chối' },
]

const RETURN_STATUS = {
  requested: { label: 'Chờ xem xét', tone: 'neutral' },
  approved: { label: 'Đã duyệt', tone: 'sale' },
  in_transit: { label: 'Đang gửi về', tone: 'sale' },
  received: { label: 'Đã nhận hàng', tone: 'neutral' },
  refund_pending: { label: 'Chờ chuyển tiền', tone: 'out-of-stock' },
  completed: { label: 'Hoàn tất', tone: 'in-stock' },
  rejected: { label: 'Từ chối', tone: 'out-of-stock' },
}

export function AdminReturnsPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const status = searchParams.get('status') ?? ''
  const { data, isLoading, isError, isFetching, refetch } = useAdminOrders(page, '', '', '', status, { hasReturn: true })
  const orders = data?.data ?? []
  const meta = data?.meta?.pagination ?? data?.meta ?? { last_page: 1 }

  const selectStatus = (value) => setSearchParams((current) => {
    const next = new URLSearchParams(current)
    value ? next.set('status', value) : next.delete('status')
    next.delete('page')
    return next
  })

  return (
    <div>
      <PageHeader icon={RotateCcw} title="Đổi trả" description="Theo dõi yêu cầu, hàng gửi về, kiểm tra và hoàn tiền trong một luồng riêng." />

      <fieldset className="mt-5 rounded-card border border-border bg-surface p-4 shadow-soft">
        <legend className="px-1 text-sm font-medium text-foreground">Trạng thái đổi trả</legend>
        <div className="flex flex-wrap gap-2">
          {RETURN_FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => selectStatus(filter.value)}
              className={`rounded-control border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${status === filter.value ? 'border-foreground bg-foreground text-surface' : 'border-border bg-surface text-foreground hover:border-border-strong'}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        {isLoading ? <Spinner label="Đang tải yêu cầu đổi trả..." /> : isError && !data ? (
          <LoadErrorState title="Chưa thể tải yêu cầu đổi trả" description="Bộ lọc hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
        ) : orders.length === 0 ? (
          <Card><EmptyState illustration="package" title="Không có yêu cầu phù hợp" description="Hãy chọn trạng thái khác." /></Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách đổi trả</caption>
              <thead><tr className="border-b border-border bg-surface-alt/50 text-xs uppercase tracking-[0.12em] text-muted-foreground"><th className="px-4 py-3">Mã đơn</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Trạng thái đổi trả</th><th className="px-4 py-3">Lý do</th><th className="px-4 py-3">Ngày yêu cầu</th><th className="px-4 py-3"><span className="sr-only">Thao tác</span></th></tr></thead>
              <tbody>{orders.map((order) => {
                const request = order.return_request
                const statusInfo = RETURN_STATUS[request?.status] ?? { label: request?.status ?? 'Chưa rõ', tone: 'neutral' }
                return (
                  <tr key={order.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40">
                    <td className="px-4 py-3 font-medium text-foreground">{order.order_number ?? `#${order.id}`}</td>
                    <td className="px-4 py-3"><p className="font-medium text-foreground">{order.user?.name}</p><p className="text-muted-foreground">{order.user?.email}</p></td>
                    <td className="px-4 py-3"><Badge tone={statusInfo.tone}>{statusInfo.label}</Badge></td>
                    <td className="max-w-80 px-4 py-3 text-foreground">{request?.reason || '—'}</td>
                    <td className="px-4 py-3 text-foreground">{formatDate(request?.requested_at ?? request?.created_at)}</td>
                    <td className="px-4 py-3 text-right"><Link to={`/admin/orders/${order.id}`} state={{ order, returnTo: `${location.pathname}${location.search}` }} className="font-medium text-foreground transition-colors hover:text-accent">Xử lý</Link></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={(nextPage) => setSearchParams((current) => {
          const next = new URLSearchParams(current)
          nextPage > 1 ? next.set('page', String(nextPage)) : next.delete('page')
          return next
        })} />
      </div>
    </div>
  )
}
