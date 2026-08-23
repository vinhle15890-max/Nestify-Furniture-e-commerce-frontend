/* Hallmark · macrostructure: Workbench · tone: operational · anchor hue: Nestify tokens */
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 · contrast/mobile/tokens: pass */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  ShoppingBag,
  Users,
  Star,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { PageHeader } from '../../components/admin/PageHeader'
import { BrandIllustration } from '../../components/admin/BrandIllustration'
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

/** A KPI card with a tinted icon chip, headline value and an optional context line. */
function Kpi({ label, value, icon: Icon, tone = 'ink', hint, progress }) {
  const chip = {
    ink: 'bg-foreground/[0.06] text-foreground',
    brass: 'bg-accent/10 text-accent',
    olive: 'bg-secondary/10 text-secondary',
    terracotta: 'bg-destructive/10 text-destructive',
  }[tone]
  const bar = {
    ink: 'bg-foreground',
    brass: 'bg-accent',
    olive: 'bg-secondary',
    terracotta: 'bg-destructive',
  }[tone]

  return (
    <div className="group rounded-card border border-border bg-surface p-5 shadow-soft transition-shadow duration-300 hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span className={`grid size-9 shrink-0 place-items-center rounded-control ${chip}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-[2rem] leading-none text-foreground">{value}</p>
      {progress != null && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-alt">
          <div
            className={`h-full rounded-full ${bar}`}
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>
      )}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** A single metric inside the revenue hero strip. */
function HeroStat({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-display text-xl text-surface">{value}</p>
      <p className="mt-1 text-xs text-surface/55">{label}</p>
    </div>
  )
}

/** An actionable queue row that links to the relevant admin screen. */
function ActionRow({ to, icon: Icon, label, count, urgent }) {
  const active = count > 0
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

export function AdminDashboardPage() {
  const now = new Date()
  const monthStart = dateInput(new Date(now.getFullYear(), now.getMonth(), 1))
  const today = dateInput(now)
  const [filters, setFilters] = useState({ date_from: monthStart, date_to: today, interval: 'day' })
  const { data, isLoading, isError, isFetching, refetch } = useAdminDashboard(filters)

  if (isLoading) {
    return <Spinner label="Đang tải số liệu tổng quan..." />
  }

  if (isError) {
    return <LoadErrorState title="Chưa thể tải số liệu tổng quan" description="Hãy thử tải lại bảng điều hành." onRetry={refetch} isRetrying={isFetching} />
  }

  const stats = data?.data
  if (!stats) return null

  const { orders, catalog } = stats
  const finance = stats.finance ?? {
    cash_collected: stats.revenue ?? 0,
    refunds: 0,
    net_revenue: stats.revenue ?? 0,
    cod_receivable: 0,
    units_sold: 0,
  }
  const operations = stats.operations ?? {}
  const inventory = stats.inventory ?? { on_hand: 0, reserved: 0, available: 0, stock_in: 0, stock_out: 0, series: [] }
  const topSellers = stats.top_sellers ?? []
  const flashSales = stats.flash_sales ?? { active_variants: 0, total_quota: 0, allocated_units: 0, released_units: 0, remaining_units: 0, delivered_units: 0, delivered_revenue: 0, variants: [] }
  const manualRefunds = stats.manual_refunds ?? { count: 0, total_amount: 0, orders: [] }

  // Derived metrics (computed client-side from the fixed payload).
  const revenueOrders = orders.delivered
  const avgOrderValue = revenueOrders ? finance.net_revenue / revenueOrders : 0
  const fulfilledRate = pct(orders.delivered, orders.total)
  const activeRate = pct(catalog.active_products, catalog.products)
  const awaitingConfirmation = orders.pending_confirmation ?? orders.pending_payment ?? 0
  const needsAttention = awaitingConfirmation + (operations.processing ?? 0) + (operations.shipped ?? 0) + (operations.delivery_failed ?? 0) + (operations.cod_receivable_count ?? 0) + (operations.low_stock ?? 0) + (operations.return_requests_pending ?? 0) + (operations.return_refunds_pending ?? 0) + (operations.return_payouts_pending ?? 0) + stats.pending_reviews + manualRefunds.count
  const periods = new Map()
  for (const row of finance.series ?? []) periods.set(row.period, { ...row })
  for (const row of inventory.series ?? []) periods.set(row.period, { ...(periods.get(row.period) ?? { period: row.period }), ...row })
  const periodRows = [...periods.values()].sort((a, b) => a.period.localeCompare(b.period))

  const funnel = [
    { key: 'pending_confirmation', label: 'Chờ xác nhận', value: awaitingConfirmation, color: 'bg-accent/70' },
    { key: 'processing', label: 'Xử lý', value: orders.processing, color: 'bg-secondary/85' },
    { key: 'shipped', label: 'Đang giao', value: orders.shipped, color: 'bg-accent' },
    { key: 'delivery_failed', label: 'Giao thất bại', value: orders.delivery_failed ?? 0, color: 'bg-destructive/50' },
    { key: 'delivered', label: 'Đã giao', value: orders.delivered, color: 'bg-foreground' },
    { key: 'cancelled', label: 'Đã huỷ', value: orders.cancelled, color: 'bg-destructive/70' },
  ]
  const maxValue = Math.max(...funnel.map((stage) => stage.value), 1)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Bảng điều khiển"
        title="Tổng quan"
        description="Bức tranh nhanh về hoạt động cửa hàng."
      />

      <section className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4 shadow-soft" aria-label="Khoảng thời gian báo cáo">
        <div className="flex flex-wrap gap-2" aria-label="Khoảng thời gian nhanh">
          <button type="button" onClick={() => setFilters(reportPreset(7))} className="min-h-11 whitespace-nowrap rounded-control border border-border px-3 text-sm text-foreground hover:bg-surface-alt active:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">7 ngày</button>
          <button type="button" onClick={() => setFilters({ date_from: monthStart, date_to: today, interval: 'day' })} className="min-h-11 whitespace-nowrap rounded-control border border-border px-3 text-sm text-foreground hover:bg-surface-alt active:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Tháng này</button>
          <button type="button" onClick={() => setFilters(reportPreset(90))} className="min-h-11 whitespace-nowrap rounded-control border border-border px-3 text-sm text-foreground hover:bg-surface-alt active:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">90 ngày</button>
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
      </section>

      {manualRefunds.count > 0 && (
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

      {/* Revenue hero + actionable queue */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-card border border-border bg-foreground p-7 text-surface shadow-card lg:col-span-2">
          <BrandIllustration
            name="lamp"
            decorative
            data-brand-watermark
            size={170}
            className="animate-rise pointer-events-none absolute -bottom-8 -right-4 text-accent/20"
          />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2 text-sm text-surface/70">
              <TrendingUp size={18} className="text-accent" />
              Tiền thực thu
            </div>
            <p className="mt-4 font-display text-[clamp(2.25rem,4vw,3.25rem)] leading-none">
              {formatPrice(finance.net_revenue)}
            </p>
            <p className="mt-3 text-sm text-surface/60">
              Đã thu {formatPrice(finance.cash_collected)} · hoàn {formatPrice(finance.refunds)}
            </p>

            <div className="mt-auto grid grid-cols-3 gap-4 border-t border-surface/15 pt-6 sm:max-w-md">
              <HeroStat label="Sản phẩm đã giao" value={finance.units_sold} />
              <HeroStat label="Giá trị đơn TB" value={formatPrice(avgOrderValue)} />
              <HeroStat label="Tỉ lệ hoàn tất" value={`${fulfilledRate}%`} />
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-card border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-foreground">Cần xử lý</h3>
            {needsAttention > 0 ? (
              <span className="grid size-6 place-items-center rounded-full bg-destructive text-xs font-semibold text-surface">
                {needsAttention}
              </span>
            ) : (
              <Sparkles size={18} className="text-secondary" />
            )}
          </div>
          <div className="mt-3 flex flex-1 flex-col justify-center">
            {needsAttention > 0 ? (
              <div className="-mx-3 flex flex-col">
                <ActionRow
                  to="/admin/orders?status=cancelled"
                  icon={AlertTriangle}
                  label="Hoàn tiền PayOS thủ công"
                  count={manualRefunds.count}
                  urgent
                />
                <ActionRow
                  to="/admin/orders?status=pending_confirmation"
                  icon={Clock}
                  label="Đơn chờ xác nhận"
                  count={awaitingConfirmation}
                />
                <ActionRow to="/admin/orders?status=processing" icon={Package} label="Đơn đang xử lý" count={operations.processing ?? 0} />
                <ActionRow to="/admin/orders?status=shipped" icon={ShoppingBag} label="Đơn đang giao" count={operations.shipped ?? 0} />
                <ActionRow to="/admin/orders?status=delivery_failed" icon={AlertTriangle} label="Giao hàng thất bại" count={operations.delivery_failed ?? 0} urgent />
                <ActionRow to="/admin/orders?payment_method=cod&payment_status=pending" icon={CheckCircle2} label="COD chờ thu" count={operations.cod_receivable_count ?? 0} />
                <ActionRow to="/admin/orders?return_status=requested" icon={Package} label="Yêu cầu đổi trả" count={operations.return_requests_pending ?? 0} urgent />
                <ActionRow to="/admin/orders?return_status=received" icon={CheckCircle2} label="Đổi trả chờ ghi hoàn" count={operations.return_refunds_pending ?? 0} urgent />
                <ActionRow to="/admin/orders?return_status=refund_pending" icon={CheckCircle2} label="Đổi trả chờ chuyển tiền" count={operations.return_payouts_pending ?? 0} urgent />
                <ActionRow
                  to="/admin/reviews"
                  icon={Star}
                  label="Đánh giá chờ duyệt"
                  count={stats.pending_reviews}
                  urgent
                />
                <ActionRow
                  to="/admin/inventory"
                  icon={Package}
                  label="Biến thể sắp hết hàng"
                  count={operations.low_stock ?? 0}
                  urgent
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-secondary/10 text-secondary">
                  <CheckCircle2 size={22} />
                </span>
                <p className="text-sm font-medium text-foreground">Đã xử lý hết</p>
                <p className="text-xs text-muted-foreground">Không có mục nào đang chờ.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Tổng đơn hàng"
          value={orders.total}
          icon={ShoppingBag}
          tone="brass"
          hint={`${orders.delivered} đơn đã giao thành công`}
        />
        <Kpi label="Khách hàng" value={stats.customers} icon={Users} tone="olive" />
        <Kpi
          label="Sản phẩm đang bán"
          value={catalog.active_products}
          icon={Package}
          tone="ink"
          progress={activeRate}
          hint={`${activeRate}% trên tổng ${catalog.products} sản phẩm`}
        />
        <Kpi
          label="COD chờ thu"
          value={formatPrice(finance.cod_receivable)}
          icon={CheckCircle2}
          tone="olive"
          hint="Không tính vào doanh thu cho tới khi đã thu tiền"
        />
      </div>

      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
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
              <tr><td className="px-5 py-3">Tiền đã hoàn</td><td className="px-5 py-3 text-right font-medium">{formatPrice(finance.refunds)}</td><td className="px-5 py-3 text-muted-foreground">Theo thời điểm hoàn tiền</td></tr>
              <tr><td className="px-5 py-3">COD chờ thu</td><td className="px-5 py-3 text-right font-medium">{formatPrice(finance.cod_receivable)}</td><td className="px-5 py-3 text-muted-foreground">Khoản phải thu, chưa phải doanh thu</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-xl text-foreground">Vận hành Flash Sale</h3>
          <p className="mt-1 text-sm text-muted-foreground">Quota và suất giữ là số hiện tại; đã giao và doanh thu chỉ tính trong kỳ đang chọn.</p>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-surface p-5"><p className="text-sm text-muted-foreground">Biến thể đang chạy</p><p className="mt-2 font-display text-3xl tabular-nums text-foreground">{flashSales.active_variants}</p></div>
          <div className="bg-surface p-5"><p className="text-sm text-muted-foreground">Đã phân bổ / quota</p><p className="mt-2 font-display text-3xl tabular-nums text-foreground">{flashSales.allocated_units} <span className="text-base text-muted-foreground">/ {flashSales.total_quota}</span></p></div>
          <div className="bg-surface p-5"><p className="text-sm text-muted-foreground">Còn lại</p><p className="mt-2 font-display text-3xl tabular-nums text-foreground">{flashSales.remaining_units}</p></div>
          <div className="bg-surface p-5"><p className="text-sm text-muted-foreground">Doanh thu đã giao trong kỳ</p><p className="mt-2 font-display text-3xl tabular-nums text-foreground">{formatPrice(flashSales.delivered_revenue)}</p></div>
        </div>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-surface-alt text-left text-muted-foreground"><tr><th className="px-5 py-3">Sản phẩm / biến thể</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Quota</th><th className="px-4 py-3 text-right">Đã giữ</th><th className="px-4 py-3 text-right">Đã hoàn</th><th className="px-4 py-3 text-right">Còn lại</th><th className="px-4 py-3 text-right">Đã giao trong kỳ</th><th className="px-5 py-3 text-right">Doanh thu</th></tr></thead>
            <tbody className="divide-y divide-border">
              {flashSales.variants.length ? flashSales.variants.map((variant) => <tr key={variant.id}>
                <td className="px-5 py-3"><Link to={`/admin/products/${variant.product_id}`} className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{variant.product_name}</Link><p className="mt-0.5 text-xs text-muted-foreground">{variant.variant_name || variant.sku}</p></td>
                <td className="px-4 py-3 text-muted-foreground">{{ active: 'Đang chạy', scheduled: 'Sắp diễn ra', ended: 'Đã kết thúc', sold_out: 'Hết suất' }[variant.status] ?? variant.status}</td>
                <td className="px-4 py-3 text-right tabular-nums">{variant.quota}</td><td className="px-4 py-3 text-right tabular-nums">{variant.allocated_units}</td><td className="px-4 py-3 text-right tabular-nums">{variant.released_units}</td><td className="px-4 py-3 text-right tabular-nums">{variant.remaining_units}</td><td className="px-4 py-3 text-right tabular-nums">{variant.delivered_units}</td><td className="px-5 py-3 text-right tabular-nums">{formatPrice(variant.delivered_revenue)}</td>
              </tr>) : <tr><td colSpan="8" className="px-5 py-8 text-center text-muted-foreground">Chưa có biến thể Flash Sale để vận hành.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-xl text-foreground">Tồn kho và biến động trong kỳ</h3>
          <p className="mt-1 text-sm text-muted-foreground">Tồn hiện tại là ảnh chụp lúc mở báo cáo; nhập/xuất chỉ tính movement trong khoảng đã chọn.</p>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-3">
          <div className="bg-surface p-5"><p className="text-sm text-muted-foreground">Tồn tại kho</p><p className="mt-2 font-display text-3xl tabular-nums text-foreground">{inventory.on_hand}</p></div>
          <div className="bg-surface p-5"><p className="text-sm text-muted-foreground">Đang giữ cho đơn</p><p className="mt-2 font-display text-3xl tabular-nums text-foreground">{inventory.reserved}</p></div>
          <div className="bg-surface p-5"><p className="text-sm text-muted-foreground">Có thể bán</p><p className="mt-2 font-display text-3xl tabular-nums text-foreground">{inventory.available}</p></div>
        </div>
        <div className="grid gap-3 border-t border-border px-5 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p><span className="text-muted-foreground">Nhập kho: </span><strong className="tabular-nums text-foreground">{inventory.stock_in ?? 0}</strong></p>
          <p><span className="text-muted-foreground">Xuất kho: </span><strong className="tabular-nums text-foreground">{inventory.stock_out ?? 0}</strong></p>
          <p><span className="text-muted-foreground">Sắp hết: </span><strong className="tabular-nums text-foreground">{inventory.low_stock ?? 0}</strong></p>
          <p><span className="text-muted-foreground">Hết hàng: </span><strong className="tabular-nums text-foreground">{inventory.out_of_stock ?? 0}</strong></p>
        </div>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <section className="min-w-0 overflow-hidden rounded-card border border-border bg-surface shadow-soft">
          <div className="border-b border-border px-5 py-4"><h3 className="font-display text-xl text-foreground">Đối chiếu theo kỳ</h3><p className="mt-1 text-sm text-muted-foreground">Tiền theo lúc thu/hoàn; kho theo thời điểm movement được ghi.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="bg-surface-alt text-left text-muted-foreground"><tr><th className="px-4 py-3">Kỳ bắt đầu</th><th className="px-4 py-3 text-right">Đã thu</th><th className="px-4 py-3 text-right">Đã hoàn</th><th className="px-4 py-3 text-right">Doanh thu ròng</th><th className="px-4 py-3 text-right">Nhập</th><th className="px-4 py-3 text-right">Xuất</th></tr></thead>
              <tbody className="divide-y divide-border">{periodRows.length ? periodRows.map((row) => <tr key={row.period}><td className="px-4 py-3 font-medium text-foreground">{row.period}</td><td className="px-4 py-3 text-right tabular-nums">{formatPrice(row.cash_collected ?? 0)}</td><td className="px-4 py-3 text-right tabular-nums">{formatPrice(row.refunds ?? 0)}</td><td className="px-4 py-3 text-right tabular-nums">{formatPrice(row.net_revenue ?? 0)}</td><td className="px-4 py-3 text-right tabular-nums">{row.stock_in ?? 0}</td><td className="px-4 py-3 text-right tabular-nums">{row.stock_out ?? 0}</td></tr>) : <tr><td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">Chưa có giao dịch tiền hoặc kho trong kỳ này.</td></tr>}</tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-card border border-border bg-surface shadow-soft">
          <div className="border-b border-border px-5 py-4"><h3 className="font-display text-xl text-foreground">Sản phẩm bán chạy</h3><p className="mt-1 text-sm text-muted-foreground">Xếp theo số lượng trong đơn đã giao.</p></div>
          {topSellers.length ? <ol className="divide-y divide-border">{topSellers.map((product, index) => <li key={product.id}><Link to={`/admin/products/${product.id}`} className="flex min-h-14 items-center gap-3 px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="w-6 text-sm tabular-nums text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate font-medium text-foreground">{product.name}</span><span className="shrink-0 text-right"><strong className="block tabular-nums text-foreground">{product.units_sold}</strong><span className="text-xs text-muted-foreground">đã giao</span></span></Link></li>)}</ol> : <p className="px-5 py-8 text-sm text-muted-foreground">Chưa có sản phẩm được giao trong kỳ này.</p>}
        </section>
      </div>

      {/* Order status funnel — colour-coded CSS bar chart */}
      <div className="rounded-card border border-border bg-surface p-7 shadow-soft">
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

        <div className="mt-8 flex h-56 items-end gap-3 sm:gap-5">
          {funnel.map((stage) => {
            const heightPct = Math.round((stage.value / maxValue) * 100)
            const sharePct = pct(stage.value, orders.total)
            return (
              <div key={stage.key} className="flex flex-1 flex-col items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{stage.value}</span>
                <div className="flex w-full flex-1 items-end overflow-hidden rounded-t-control bg-surface-alt/70">
                  <div
                    className={`w-full rounded-t-control ${stage.color}`}
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-center text-[0.72rem] font-medium leading-tight text-foreground">
                    {stage.label}
                  </span>
                  <span className="text-[0.68rem] text-muted-foreground">{sharePct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
