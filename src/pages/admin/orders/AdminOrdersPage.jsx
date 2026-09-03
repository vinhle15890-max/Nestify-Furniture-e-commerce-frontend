import { useEffect, useState } from 'react'
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
import { adminPaymentLabel } from '../../../features/admin/orders/paymentLabels'
import { ORDER_STATUS_LABELS } from '../../../features/orders/statusLabels'
import { formatPrice, formatDate } from '../../../lib/format'

const ORDER_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending_confirmation', label: 'Chờ xác nhận' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipped', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'closed', label: 'Đã hủy', group: true },
]

const PAYMENT_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'cod_pending', label: 'COD cần thu', method: 'cod', status: 'pending' },
  { value: 'payos_pending', label: 'PayOS chờ khách thanh toán', method: 'payos', status: 'pending', queue: 'payos_pending_actionable' },
  { value: 'paid', label: 'Đã thanh toán', status: 'paid' },
  { value: 'failed', label: 'Không thành công', status: 'failed' },
  { value: 'refunded', label: 'Đã chuyển hoàn', status: 'refunded' },
]

function paymentFilterValue(method, status, queue) {
  if (queue === 'payos_pending_actionable') return 'payos_pending'
  if (method === 'cod' && status === 'pending') return 'cod_pending'
  if (method === 'payos' && status === 'pending') return 'payos_pending'
  return status
}

function FilterButton({ active, children, onClick }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-control border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'border-foreground bg-foreground text-surface' : 'border-border bg-surface text-foreground hover:border-border-strong'}`}>
      {children}
    </button>
  )
}

export function AdminOrdersPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const status = searchParams.get('status') ?? ''
  const statusGroup = searchParams.get('status_group') ?? ''
  const paymentMethod = searchParams.get('payment_method') ?? ''
  const paymentStatus = searchParams.get('payment_status') ?? ''
  const paymentQueue = searchParams.get('payment_queue') ?? ''
  const requestedConfirmationQueue = searchParams.get('confirmation_queue') ?? ''
  const query = searchParams.get('q') ?? ''
  const hasExplicitOperationalFilter = Boolean(status || statusGroup || paymentMethod || paymentStatus || paymentQueue)
  const confirmationQueue = hasExplicitOperationalFilter ? '' : requestedConfirmationQueue
  const [searchDraft, setSearchDraft] = useState(query)
  const { data, isLoading, isError, isFetching, refetch } = useAdminOrders(page, status, paymentMethod, paymentStatus, '', { q: query, statusGroup, paymentQueue, confirmationQueue })
  const orders = data?.data ?? []
  const meta = data?.meta?.pagination ?? data?.meta ?? { last_page: 1 }
  const selectedOrderFilter = statusGroup || status
  const selectedPaymentFilter = paymentFilterValue(paymentMethod, paymentStatus, paymentQueue)

  useEffect(() => setSearchDraft(query), [query])

  useEffect(() => {
    if (!requestedConfirmationQueue || !hasExplicitOperationalFilter) return
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('confirmation_queue')
      next.delete('page')
      return next
    }, { replace: true })
  }, [hasExplicitOperationalFilter, requestedConfirmationQueue, setSearchParams])

  const updateFilter = (mutate) => setSearchParams((current) => {
    const next = new URLSearchParams(current)
    mutate(next)
    next.delete('page')
    return next
  })
  const selectOrderFilter = (filter) => updateFilter((next) => {
    next.delete('confirmation_queue')
    next.delete('status')
    next.delete('status_group')
    if (filter.value) next.set(filter.group ? 'status_group' : 'status', filter.value)
  })
  const selectPaymentFilter = (filter) => updateFilter((next) => {
    next.delete('confirmation_queue')
    next.delete('payment_method')
    next.delete('payment_status')
    next.delete('payment_queue')
    if (filter.method) next.set('payment_method', filter.method)
    if (filter.status) next.set('payment_status', filter.status)
    if (filter.queue) next.set('payment_queue', filter.queue)
  })
  const submitSearch = (event) => {
    event.preventDefault()
    updateFilter((next) => {
      const value = searchDraft.trim()
      value ? next.set('q', value) : next.delete('q')
    })
  }

  return <div>
    <PageHeader icon={Receipt} title="Đơn hàng" description="Trạng thái xử lý đơn và trạng thái tiền được theo dõi độc lập." />
    <div className="mt-5 grid gap-4 rounded-card border border-border bg-surface p-4 shadow-soft">
      <form role="search" aria-label="Tìm đơn hàng" onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-medium text-foreground">Tìm theo mã đơn, khách hàng hoặc vận đơn
          <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={100} placeholder="Mã đơn, tên, email hoặc mã vận đơn" className="mt-2 min-h-11 w-full rounded-control border border-border bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="min-h-11 rounded-control bg-foreground px-4 text-sm font-medium text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Tìm đơn</button>
          {query && <button type="button" onClick={() => { setSearchDraft(''); updateFilter((next) => next.delete('q')) }} className="min-h-11 rounded-control border border-border px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Xóa tìm kiếm</button>}
        </div>
      </form>
      <fieldset><legend className="text-sm font-medium text-foreground">Trạng thái đơn hàng</legend><div className="mt-2 flex flex-wrap gap-2">{ORDER_FILTERS.map((filter) => <FilterButton key={filter.value || 'all-orders'} active={selectedOrderFilter === filter.value} onClick={() => selectOrderFilter(filter)}>{filter.label}</FilterButton>)}</div></fieldset>
      <fieldset className="border-t border-border pt-4"><legend className="text-sm font-medium text-foreground">Trạng thái thanh toán</legend><div className="mt-2 flex flex-wrap gap-2">{PAYMENT_FILTERS.map((filter) => <FilterButton key={filter.value || 'all-payments'} active={selectedPaymentFilter === filter.value} onClick={() => selectPaymentFilter(filter)}>{filter.label}</FilterButton>)}</div></fieldset>
    </div>
    <div className="mt-6">
      {isLoading ? <Spinner label="Đang tải đơn hàng..." /> : isError && !data ? <LoadErrorState title="Chưa thể tải đơn hàng" description="Bộ lọc hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} /> : orders.length === 0 ? <Card><EmptyState illustration="package" title="Không có đơn phù hợp" description="Hãy chọn trạng thái khác hoặc xóa bộ lọc." /></Card> : <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
        <table className="w-full text-left text-sm"><caption className="sr-only">Danh sách đơn hàng</caption><thead><tr className="border-b border-border bg-surface-alt/50 text-xs uppercase tracking-[0.12em] text-muted-foreground"><th className="px-4 py-3">Mã đơn</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Đơn hàng</th><th className="px-4 py-3">Thanh toán</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3">Ngày tạo</th><th className="px-4 py-3"><span className="sr-only">Thao tác</span></th></tr></thead>
          <tbody>{orders.map((order) => {
            const statusInfo = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, tone: 'neutral' }
            const reason = order.cancellation?.reason || order.delivery_failure_reason
            return <tr key={order.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40"><td className="px-4 py-3 font-medium text-foreground">{order.order_number ?? `#${order.id}`}</td><td className="px-4 py-3"><p className="font-medium text-foreground">{order.user?.name}</p><p className="text-muted-foreground">{order.user?.email}</p></td><td className="px-4 py-3"><Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>{reason && <p className="mt-1 max-w-56 text-xs text-muted-foreground">Lý do: {reason}</p>}</td><td className="whitespace-nowrap px-4 py-3 text-foreground">{adminPaymentLabel(order)}</td><td className="px-4 py-3 text-foreground"><p>{formatPrice(order.total)}</p>{Number(order.discount_amount) > 0 && <p className="mt-1 text-xs text-muted-foreground">{order.voucher_code ? `Mã ${order.voucher_code}` : 'Mã giảm giá cũ'} · -{formatPrice(order.discount_amount)}</p>}</td><td className="px-4 py-3 text-foreground">{formatDate(order.created_at)}</td><td className="px-4 py-3 text-right"><Link to={`/admin/orders/${order.id}`} state={{ order, returnTo: `${location.pathname}${location.search}` }} aria-label={`Xem đơn hàng ${order.order_number ?? `#${order.id}`}`} className="font-medium text-foreground transition-colors hover:text-accent">Xem</Link></td></tr>
          })}</tbody></table>
      </div>}
    </div>
    <div className="mt-6"><Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={(nextPage) => setSearchParams((current) => { const next = new URLSearchParams(current); nextPage > 1 ? next.set('page', String(nextPage)) : next.delete('page'); return next })} /></div>
  </div>
}
