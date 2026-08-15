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
            className={`h-full rounded-full ${bar} transition-all duration-700 ease-out`}
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
        <p className="text-sm font-medium text-foreground">{label}</p>
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
  const { data, isLoading, isError, isFetching, refetch } = useAdminDashboard()

  if (isLoading) {
    return <Spinner label="Đang tải số liệu tổng quan..." />
  }

  if (isError) {
    return <LoadErrorState title="Chưa thể tải số liệu tổng quan" description="Hãy thử tải lại bảng điều hành." onRetry={refetch} isRetrying={isFetching} />
  }

  const stats = data?.data
  if (!stats) return null

  const { orders, catalog } = stats
  const manualRefunds = stats.manual_refunds ?? { count: 0, total_amount: 0, orders: [] }

  // Derived metrics (computed client-side from the fixed payload).
  const revenueOrders = orders.paid + orders.processing + orders.shipped + orders.delivered
  const avgOrderValue = revenueOrders ? stats.revenue / revenueOrders : 0
  const fulfilledRate = pct(orders.delivered, orders.total)
  const activeRate = pct(catalog.active_products, catalog.products)
  const needsAttention = orders.pending_payment + stats.pending_reviews + manualRefunds.count

  const funnel = [
    { key: 'pending_payment', label: 'Chờ TT', value: orders.pending_payment, color: 'bg-accent/70' },
    { key: 'paid', label: 'Đã TT', value: orders.paid, color: 'bg-secondary/60' },
    { key: 'processing', label: 'Xử lý', value: orders.processing, color: 'bg-secondary/85' },
    { key: 'shipped', label: 'Đang giao', value: orders.shipped, color: 'bg-accent' },
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
              Doanh thu
            </div>
            <p className="mt-4 font-display text-[clamp(2.25rem,4vw,3.25rem)] leading-none">
              {formatPrice(stats.revenue)}
            </p>
            <p className="mt-3 text-sm text-surface/60">Tổng doanh thu đã ghi nhận</p>

            <div className="mt-auto grid grid-cols-3 gap-4 border-t border-surface/15 pt-6 sm:max-w-md">
              <HeroStat label="Đơn ghi nhận DT" value={revenueOrders} />
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
                  to="/admin/orders"
                  icon={Clock}
                  label="Đơn chờ thanh toán"
                  count={orders.pending_payment}
                />
                <ActionRow
                  to="/admin/reviews"
                  icon={Star}
                  label="Đánh giá chờ duyệt"
                  count={stats.pending_reviews}
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
          label="Đơn đã giao"
          value={orders.delivered}
          icon={CheckCircle2}
          tone="olive"
          hint={`Tỉ lệ hoàn tất ${fulfilledRate}%`}
        />
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
                    className={`w-full rounded-t-control ${stage.color} transition-all duration-700 ease-out`}
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
