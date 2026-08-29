/* Hallmark · audience: store operators/managers · use: act first, analyse second · tone: utilitarian-editorial */
/* Hallmark · macrostructure: Split Workbench · anchor hue: Nestify tokens */
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 · contrast/mobile/tokens: pass */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  ShoppingBag,
  Star,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { PageHeader } from '../../components/admin/PageHeader'
import { useAdminDashboard } from '../../features/admin/dashboard/hooks'
import { formatPrice } from '../../lib/format'

/** Whole-number percentage of n over d (0 when d is 0). */
function pct(n, d) {
  return d ? Math.round((n / d) * 100) : 0
}

function dateInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function reportPreset(days) {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  return { date_from: dateInput(start), date_to: dateInput(end), interval: days > 62 ? 'month' : days > 14 ? 'week' : 'day' }
}

function toggleDisclosureOnKeyboard(event) {
  if (!['Enter', ' '].includes(event.key)) return
  event.preventDefault()
  const details = event.currentTarget.parentElement
  details.open = !details.open
}

/** An actionable queue row that links to the relevant admin screen. */
function ActionRow({ to, icon: Icon, label, count, urgent }) {
  const active = count > 0
  if (!active) return null
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-control px-3 py-3 transition-colors hover:bg-surface-alt"
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-control ${
          active && urgent ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
        }`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="whitespace-nowrap text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {active ? 'Đang chờ thao tác' : 'Không có mục nào'}
        </p>
      </div>
      <span
        className={`font-display text-2xl leading-none ${
          active ? 'text-foreground' : 'text-muted-foreground/50'
        }`}
      >
        {count}
      </span>
      <ArrowUpRight
        size={16}
        className="shrink-0 text-muted-foreground/40 transition-colors group-hover:text-accent"
      />
    </Link>
  )
}

function InsightList({ title, description, rows, to, value, empty = 'Chưa có dữ liệu trong kỳ.' }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-card border border-border bg-surface shadow-soft">
      <div className="border-b border-border px-5 py-4"><h3 className="font-display text-lg text-foreground">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
      {rows.length ? <ol className="divide-y divide-border">{rows.map((row, index) => <li key={row.id}><Link to={to(row)} className="flex min-h-14 items-center gap-3 px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="w-5 text-xs tabular-nums text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{row.name ?? row.code}</span><span className="shrink-0 text-right text-xs font-medium text-foreground">{value(row)}</span></Link></li>)}</ol> : <p className="px-5 py-6 text-sm text-muted-foreground">{empty}</p>}
    </section>
  )
}

export function AdminDashboardPage() {
  const now = new Date()
  const monthStart = dateInput(new Date(now.getFullYear(), now.getMonth(), 1))
  const yearStart = dateInput(new Date(now.getFullYear(), 0, 1))
  const today = dateInput(now)
  const [filters, setFilters] = useState({ date_from: monthStart, date_to: today, interval: 'day' })
  const [dashboardView, setDashboardView] = useState('operations')
  const { data, isLoading, isError, isFetching, refetch } = useAdminDashboard(filters)

  if (isLoading) {
    return <Spinner label="Đang tải số liệu tổng quan..." />
  }

  if (isError) {
    return <LoadErrorState title="Chưa thể tải số liệu tổng quan" description="Hãy thử tải lại bảng điều hành." onRetry={refetch} isRetrying={isFetching} />
  }

  const stats = data?.data
  if (!stats) return null

  const { orders } = stats
  const finance = stats.finance ?? {
    cash_collected: stats.revenue ?? 0,
    refunds: 0,
    net_revenue: stats.revenue ?? 0,
    cod_receivable: 0,
    units_sold: 0,
  }
  const operations = stats.operations ?? {}
  const topSellers = stats.top_sellers ?? []
  const manualRefunds = stats.manual_refunds ?? { count: 0, total_amount: 0, orders: [] }
  const insights = stats.business_insights ?? {
    orders: { new: finance.orders_placed ?? 0, cancelled: 0, refund_pending: manualRefunds.count },
    payment_mix: {}, vouchers: { orders_count: 0, discount_amount: 0 },
    customers: { ordering: 0, new: 0, returning: 0 }, bottom_sellers: [], steady_sellers: [],
    vouchers_most_used: [], vouchers_least_used: [], top_customers: [],
  }

  // Derived metrics (computed client-side from the fixed payload).
  const revenueOrders = finance.orders_delivered ?? 0
  const avgOrderValue = revenueOrders ? (finance.delivered_sales_value ?? finance.delivered_order_value ?? 0) / revenueOrders : 0
  const awaitingConfirmation = operations.ready_for_confirmation ?? orders.pending_confirmation ?? orders.pending_payment ?? 0
  const needsAttention = awaitingConfirmation + (operations.processing ?? 0) + (operations.shipped ?? 0) + (operations.delivery_failed ?? 0) + (operations.cod_collection_due ?? 0) + (operations.payment_exceptions ?? 0) + stats.pending_reviews + manualRefunds.count
  const periodRows = [...(finance.series ?? [])].sort((a, b) => a.period.localeCompare(b.period))

  const funnel = [
    { key: 'pending_confirmation', label: 'Sẵn sàng xác nhận', value: awaitingConfirmation, color: 'bg-accent/70', to: '/admin/orders?confirmation_queue=ready_for_confirmation' },
    { key: 'processing', label: 'Đang xử lý', value: orders.processing, color: 'bg-secondary/85', to: '/admin/orders?status=processing' },
    { key: 'shipped', label: 'Đang giao', value: orders.shipped, color: 'bg-accent', to: '/admin/orders?status=shipped' },
    { key: 'delivery_failed', label: 'Giao thất bại', value: orders.delivery_failed ?? 0, color: 'bg-destructive/50', to: '/admin/orders?status=delivery_failed' },
    { key: 'delivered', label: 'Đã giao', value: orders.delivered, color: 'bg-foreground', to: '/admin/orders?status=delivered' },
    { key: 'cancelled', label: 'Đã huỷ', value: orders.cancelled, color: 'bg-destructive/70', to: '/admin/orders?status=cancelled' },
  ]
  const monitoredActionItems = [
    { to: '/admin/orders?status=cancelled', icon: AlertTriangle, label: 'Hoàn tiền PayOS thủ công', count: manualRefunds.count, urgent: true },
    { to: '/admin/orders?confirmation_queue=ready_for_confirmation', icon: Clock, label: 'Đơn sẵn sàng xác nhận', count: awaitingConfirmation },
    { to: '/admin/orders?confirmation_queue=awaiting_online_payment', icon: Clock, label: 'PayOS đang chờ khách', count: operations.awaiting_online_payment ?? 0 },
    { to: '/admin/orders?status=processing', icon: Package, label: 'Đơn cần chuẩn bị hàng', count: operations.processing ?? 0 },
    { to: '/admin/orders?status=shipped', icon: ShoppingBag, label: 'Đơn đang vận chuyển', count: operations.shipped ?? 0 },
    { to: '/admin/orders?status=delivery_failed', icon: AlertTriangle, label: 'Giao hàng thất bại', count: operations.delivery_failed ?? 0, urgent: true },
    { to: '/admin/orders?payment_method=cod&payment_status=pending&status=shipped', icon: CheckCircle2, label: 'COD đến hạn thu', count: operations.cod_collection_due ?? 0 },
    { to: '/admin/payment-exceptions', icon: AlertTriangle, label: 'Thanh toán ngoại lệ', count: operations.payment_exceptions ?? 0, urgent: true },
    { to: '/admin/reviews', icon: Star, label: 'Đánh giá chờ duyệt', count: stats.pending_reviews, urgent: true },
  ]
  const actionItems = monitoredActionItems.filter((item) => item.count > 0)
  const clearActionItems = monitoredActionItems.filter((item) => item.count === 0)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Bảng điều khiển"
        title="Tổng quan"
        description="Bức tranh nhanh về hoạt động cửa hàng."
      />

      <nav className="grid gap-2 rounded-card border border-border bg-surface p-2 shadow-soft sm:grid-cols-2" aria-label="Khu vực bảng điều khiển">
        <button
          type="button"
          aria-pressed={dashboardView === 'operations'}
          onClick={() => setDashboardView('operations')}
          className={`min-h-12 whitespace-nowrap rounded-control px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${dashboardView === 'operations' ? 'bg-foreground text-surface' : 'text-foreground hover:bg-surface-alt'}`}
        >
          Điều hành hôm nay
        </button>
        <button
          type="button"
          aria-pressed={dashboardView === 'business'}
          onClick={() => setDashboardView('business')}
          className={`min-h-12 whitespace-nowrap rounded-control px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${dashboardView === 'business' ? 'bg-foreground text-surface' : 'text-foreground hover:bg-surface-alt'}`}
        >
          Phân tích kinh doanh
        </button>
      </nav>
      <p className="-mt-2 text-sm text-muted-foreground" role="status">
        {dashboardView === 'operations'
          ? 'Đơn hàng, hoàn tiền và cảnh báo cần thao tác.'
          : 'Tiền bán hàng, sản phẩm nổi bật và xu hướng theo kỳ.'}
      </p>

      {dashboardView === 'business' && <section className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4 shadow-soft" aria-label="Khoảng thời gian báo cáo">
        <div className="flex flex-wrap gap-2" aria-label="Khoảng thời gian nhanh">
          <button type="button" onClick={() => setFilters(reportPreset(7))} className="min-h-11 whitespace-nowrap rounded-control border border-border px-3 text-sm text-foreground hover:bg-surface-alt active:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">7 ngày</button>
          <button type="button" onClick={() => setFilters({ date_from: monthStart, date_to: today, interval: 'day' })} className="min-h-11 whitespace-nowrap rounded-control border border-border px-3 text-sm text-foreground hover:bg-surface-alt active:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Tháng này</button>
          <button type="button" onClick={() => setFilters(reportPreset(90))} className="min-h-11 whitespace-nowrap rounded-control border border-border px-3 text-sm text-foreground hover:bg-surface-alt active:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">90 ngày</button>
          <button type="button" onClick={() => setFilters({ date_from: yearStart, date_to: today, interval: 'month' })} className="min-h-11 whitespace-nowrap rounded-control border border-border px-3 text-sm text-foreground hover:bg-surface-alt active:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Năm nay</button>
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Từ ngày
          <input className="rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground" type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} />
        </label>
        {isFetching && <span className="pb-2 text-sm text-muted-foreground" role="status">Đang cập nhật…</span>}
        <label className="grid gap-1 text-xs text-muted-foreground">
          Đến ngày
          <input className="rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground" type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Gom nhóm
          <select className="rounded-control border border-border bg-background px-3 py-2 text-sm text-foreground" value={filters.interval} onChange={(event) => setFilters((current) => ({ ...current, interval: event.target.value }))}>
            <option value="day">Theo ngày</option>
            <option value="week">Theo tuần</option>
            <option value="month">Theo tháng</option>
          </select>
        </label>
      </section>}

      {dashboardView === 'operations' && manualRefunds.count > 0 && (
        <section
          aria-labelledby="manual-refunds-title"
          className="rounded-card border border-destructive/30 bg-destructive/[0.04] p-5 shadow-soft"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-destructive/10 text-destructive">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="manual-refunds-title" className="font-display text-xl text-foreground">
                Có khoản hoàn tiền cần xử lý
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {manualRefunds.count} đơn · {formatPrice(manualRefunds.total_amount)} đã được ghi nhận,
                cần chuyển trả thủ công qua PayOS.
              </p>
              <div className="mt-4 grid gap-2 lg:grid-cols-2">
                {manualRefunds.orders.map((refund) => (
                  <Link
                    key={refund.id}
                    to={`/admin/orders/${refund.id}`}
                    className="group flex items-center justify-between gap-4 rounded-control border border-border bg-surface px-4 py-3 transition-colors hover:border-destructive/30"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{refund.order_number}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {refund.reason || 'Khách không cung cấp lý do'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {formatPrice(refund.amount)}
                      </span>
                      <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-destructive" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {dashboardView === 'operations' && <section className="rounded-card border border-border bg-surface p-5 shadow-soft" aria-labelledby="action-queue-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 id="action-queue-title" className="font-display text-xl text-foreground">Việc cần làm</h2><p className="mt-1 text-sm text-muted-foreground">Chọn một hàng đợi để bắt đầu xử lý.</p></div>
          {needsAttention > 0 ? <span className="rounded-full bg-destructive px-3 py-1 text-sm font-semibold text-surface">{needsAttention} việc</span> : <Sparkles size={20} className="text-secondary" />}
        </div>
        {actionItems.length > 0 && <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{actionItems.map((item) => <ActionRow key={item.to} {...item} />)}</div>}
        {clearActionItems.length > 0 && <div data-testid="clear-queues-summary" className="mt-4 flex items-start gap-3 border-t border-border pt-4"><CheckCircle2 className="mt-0.5 shrink-0 text-secondary" size={18} /><div><p className="text-sm font-medium text-foreground">Không có việc chờ</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{clearActionItems.map((item) => item.label).join(' · ')}</p></div></div>}
      </section>}

      {dashboardView === 'business' && <section className="overflow-hidden rounded-card border border-border bg-surface shadow-soft" aria-labelledby="period-results-title">
        <div className="border-b border-border px-5 py-4"><h2 id="period-results-title" className="font-display text-xl text-foreground">Kết quả trong kỳ</h2><p className="mt-1 text-sm text-muted-foreground">Từ {finance.date_from} đến {finance.date_to} · múi giờ Việt Nam.</p></div>
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
          <div data-testid="primary-money-metric" className="bg-surface p-5 lg:p-7"><p className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp size={17} />Tiền thực thu</p><p className="mt-3 font-display text-4xl tabular-nums text-foreground">{formatPrice(finance.net_collected_cash ?? 0)}</p><p className="mt-2 text-xs text-muted-foreground">Đã thu trừ tiền hoàn thực chuyển</p></div>
          <dl data-testid="supporting-period-metrics" className="divide-y divide-border border-t border-border lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-5 px-5 py-4"><div><dt className="text-sm text-muted-foreground">Đơn đã giao</dt><p className="mt-1 text-xs text-muted-foreground">Theo thời điểm giao trong kỳ</p></div><dd className="shrink-0 font-display text-xl tabular-nums text-foreground">{finance.orders_delivered ?? 0}</dd></div>
            <div className="flex items-center justify-between gap-5 px-5 py-4"><div><dt className="text-sm text-muted-foreground">Sản phẩm đã giao</dt><p className="mt-1 text-xs text-muted-foreground">Tổng số lượng item trong đơn đã giao</p></div><dd className="shrink-0 font-display text-xl tabular-nums text-foreground">{finance.units_sold}</dd></div>
            <div className="flex items-center justify-between gap-5 px-5 py-4"><div><dt className="text-sm text-muted-foreground">Giá trị đơn trung bình</dt><p className="mt-1 text-xs text-muted-foreground">Cùng cohort đơn đã giao trong kỳ</p></div><dd className="shrink-0 font-display text-xl tabular-nums text-foreground">{formatPrice(avgOrderValue)}</dd></div>
          </dl>
        </div>
      </section>}

      {dashboardView === 'business' && <section aria-label="Chỉ báo đơn hàng">
        <div className="rounded-card border border-border bg-surface p-5 shadow-soft">
          <h3 className="font-display text-lg text-foreground">Đơn hàng trong kỳ</h3>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div><dt className="text-xs text-muted-foreground">Đơn mới</dt><dd className="mt-1 font-display text-2xl text-foreground">{insights.orders.new}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Đã huỷ</dt><dd className="mt-1 font-display text-2xl text-destructive">{insights.orders.cancelled}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Chờ hoàn tiền</dt><dd className="mt-1 font-display text-2xl text-foreground">{insights.orders.refund_pending}</dd></div>
          </dl>
        </div>
      </section>}

      {dashboardView === 'business' && <details data-testid="product-disclosure" className="group rounded-card border border-border bg-surface shadow-soft">
        <summary onKeyDown={toggleDisclosureOnKeyboard} className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span><span className="block font-display text-xl text-foreground">Quyết định về sản phẩm</span><span className="mt-1 block text-sm text-muted-foreground">Xếp hạng theo dữ liệu giao hàng thực tế trong kỳ.</span></span>
          <ChevronDown size={19} aria-hidden="true" className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-4 border-t border-border p-5 md:grid-cols-2 xl:grid-cols-3">
          <InsightList title="Bán chạy nhất" description="Số sản phẩm thực giao trong kỳ" rows={topSellers.slice(0, 5)} to={(row) => `/admin/products/${row.id}`} value={(row) => `${row.units_sold} đã giao`} />
          <InsightList title="Bán ít nhất" description="Sản phẩm active, xếp từ ít lượt giao nhất" rows={insights.bottom_sellers} to={(row) => `/admin/products/${row.id}`} value={(row) => `${row.units_sold} đã giao`} />
          <InsightList title="Bán ổn định nhất" description="Xếp theo số tuần có phát sinh giao hàng" rows={insights.steady_sellers} to={(row) => `/admin/products/${row.id}`} value={(row) => `${row.active_weeks} tuần · ${row.units_sold} bán`} />
        </div>
      </details>}

      {dashboardView === 'business' && <details data-testid="campaign-disclosure" className="group rounded-card border border-border bg-surface shadow-soft">
        <summary onKeyDown={toggleDisclosureOnKeyboard} className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span><span className="block font-display text-xl text-foreground">Quyết định về chiến dịch</span><span className="mt-1 block text-sm text-muted-foreground">Voucher tính trên đơn hợp lệ; khách hàng xếp theo giá trị đơn đã giao trong kỳ.</span></span>
          <ChevronDown size={19} aria-hidden="true" className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-4 border-t border-border p-5 md:grid-cols-2 xl:grid-cols-3">
          <InsightList title="Voucher dùng nhiều nhất" description="Số đơn hợp lệ sử dụng voucher" rows={insights.vouchers_most_used} to={() => '/admin/vouchers'} value={(row) => `${row.orders_count} đơn · ${formatPrice(row.discount_amount)}`} />
          <InsightList title="Voucher dùng ít nhất" description="Bao gồm voucher active chưa được dùng" rows={insights.vouchers_least_used} to={() => '/admin/vouchers'} value={(row) => `${row.orders_count} đơn`} />
          <InsightList title="Khách mua nhiều nhất" description="Theo tổng giá trị đơn đã giao" rows={insights.top_customers} to={() => '/admin/customers'} value={(row) => `${formatPrice(row.delivered_value)} · ${row.orders_count} đơn`} />
        </div>
      </details>}

      {dashboardView === 'business' && <section className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-xl text-foreground">Đối soát tiền bán hàng</h3>
          <p className="mt-1 text-sm text-muted-foreground">COD chỉ được cộng vào tiền thực thu sau khi giao và xác nhận thu đủ.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-muted-foreground"><tr><th className="px-5 py-3">Chỉ số</th><th className="px-5 py-3 text-right">Giá trị</th><th className="px-5 py-3">Ý nghĩa</th></tr></thead>
            <tbody className="divide-y divide-border">
              <tr><td className="px-5 py-3">Giá trị đơn phát sinh</td><td className="px-5 py-3 text-right font-medium">{formatPrice(finance.order_value ?? 0)}</td><td className="px-5 py-3 text-muted-foreground">Đơn tạo trong kỳ, chưa trừ tiền chưa thu</td></tr>
              <tr><td className="px-5 py-3">Tiền đã thu</td><td className="px-5 py-3 text-right font-medium">{formatPrice(finance.cash_collected)}</td><td className="px-5 py-3 text-muted-foreground">Theo thời điểm thanh toán</td></tr>
              <tr><td className="px-5 py-3">Nghĩa vụ hoàn đang mở</td><td className="px-5 py-3 text-right font-medium">{formatPrice(finance.current_refund_obligation ?? finance.refund_pending_transfer ?? 0)}</td><td className="px-5 py-3 text-muted-foreground">Snapshot hiện tại, không phụ thuộc kỳ lọc</td></tr>
              <tr><td className="px-5 py-3">Tiền đã chuyển hoàn</td><td className="px-5 py-3 text-right font-medium">{formatPrice(finance.refund_transferred ?? finance.refunds)}</td><td className="px-5 py-3 text-muted-foreground">Theo thời điểm xác nhận chuyển tiền</td></tr>
              <tr><td className="px-5 py-3">COD chờ thu</td><td className="px-5 py-3 text-right font-medium">{formatPrice(finance.cod_receivable)}</td><td className="px-5 py-3 text-muted-foreground">Khoản phải thu, chưa phải doanh thu</td></tr>
            </tbody>
          </table>
        </div>
      </section>}

      {dashboardView === 'business' && <div className="min-w-0">
        <section className="min-w-0 overflow-hidden rounded-card border border-border bg-surface shadow-soft">
          <div className="border-b border-border px-5 py-4"><h3 className="font-display text-xl text-foreground">Đối chiếu tiền theo kỳ</h3><p className="mt-1 text-sm text-muted-foreground">Tiền được xếp theo thời điểm thực thu hoặc xác nhận đã chuyển hoàn.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-surface-alt text-left text-muted-foreground"><tr><th className="px-4 py-3">Kỳ bắt đầu</th><th className="px-4 py-3 text-right">Đã thu</th><th className="px-4 py-3 text-right">Đã hoàn</th><th className="px-4 py-3 text-right">Tiền thực thu</th></tr></thead>
              <tbody className="divide-y divide-border">{periodRows.length ? periodRows.map((row) => <tr key={row.period}><td className="px-4 py-3 font-medium text-foreground">{row.period}</td><td className="px-4 py-3 text-right tabular-nums">{formatPrice(row.cash_collected ?? 0)}</td><td className="px-4 py-3 text-right tabular-nums">{formatPrice(row.refunds ?? 0)}</td><td className="px-4 py-3 text-right tabular-nums">{formatPrice(row.net_collected_cash ?? row.net_revenue ?? 0)}</td></tr>) : <tr><td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">Chưa có giao dịch tiền trong kỳ này.</td></tr>}</tbody>
            </table>
          </div>
        </section>

      </div>}

      {/* Order status funnel — colour-coded CSS bar chart */}
      {dashboardView === 'operations' && <div className="rounded-card border border-border bg-surface p-7 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl text-foreground">Đơn hàng theo trạng thái</h3>
            <p className="mt-1 text-sm text-muted-foreground">Phân bổ {orders.total} đơn theo vòng đời</p>
          </div>
          <Link
            to="/admin/orders"
            className="hidden items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover sm:inline-flex"
          >
            Xem đơn hàng
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {funnel.map((stage) => {
            const sharePct = pct(stage.value, orders.total)
            return (
              <Link key={stage.key} to={stage.to} className="rounded-control border border-border p-4 transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-center justify-between gap-4"><span className="text-sm font-medium text-foreground">{stage.label}</span><span className="font-display text-2xl text-foreground">{stage.value}</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-alt"><div className={`h-full rounded-full ${stage.color}`} style={{ width: `${Math.max(stage.value ? 3 : 0, sharePct)}%` }} /></div>
                <p className="mt-2 text-xs text-muted-foreground">{sharePct}% tổng đơn · Mở danh sách</p>
              </Link>
            )
          })}
        </div>
      </div>}
    </div>
  )
}
