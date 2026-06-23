import { Package, ShoppingBag, Users, Star, TrendingUp } from 'lucide-react'
import { Spinner } from '../../components/Spinner'
import { useAdminDashboard } from '../../features/admin/dashboard/hooks'
import { formatPrice } from '../../lib/format'

function Kpi({ label, value, icon: Icon, hint }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon size={18} className="text-accent" />}
      </div>
      <p className="mt-3 font-display text-3xl text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function AdminDashboardPage() {
  const { data, isLoading, isError, error } = useAdminDashboard()

  if (isLoading) {
    return <Spinner label="Đang tải số liệu tổng quan..." />
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error?.message ?? 'Không tải được số liệu tổng quan.'}
      </p>
    )
  }

  const stats = data?.data
  if (!stats) return null

  const funnel = [
    { label: 'Chờ thanh toán', value: stats.orders.pending_payment },
    { label: 'Đã thanh toán', value: stats.orders.paid },
    { label: 'Đang xử lý', value: stats.orders.processing },
    { label: 'Đang giao', value: stats.orders.shipped },
    { label: 'Đã giao', value: stats.orders.delivered },
    { label: 'Đã huỷ', value: stats.orders.cancelled },
  ]
  const maxValue = Math.max(...funnel.map((stage) => stage.value), 1)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow">Bảng điều khiển</p>
        <h2 className="mt-2 font-display text-[clamp(1.8rem,3vw,2.6rem)] text-foreground">Tổng quan</h2>
        <p className="mt-2 text-muted-foreground">Bức tranh nhanh về hoạt động cửa hàng.</p>
      </div>

      {/* Revenue hero + key KPIs */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-card border border-border bg-foreground p-7 text-surface lg:row-span-1">
          <div className="flex items-center gap-2 text-sm text-surface/70">
            <TrendingUp size={18} className="text-accent" />
            Doanh thu
          </div>
          <p className="mt-4 font-display text-[clamp(2rem,3.5vw,3rem)] leading-none">{formatPrice(stats.revenue)}</p>
          <p className="mt-3 text-sm text-surface/60">Tổng doanh thu đã ghi nhận</p>
        </div>

        <Kpi label="Tổng đơn hàng" value={stats.orders.total} icon={ShoppingBag} />
        <Kpi label="Khách hàng" value={stats.customers} icon={Users} />
        <Kpi
          label="Sản phẩm đang bán"
          value={stats.catalog.active_products}
          icon={Package}
          hint={`trên tổng ${stats.catalog.products} sản phẩm`}
        />
        <Kpi label="Đánh giá chờ duyệt" value={stats.pending_reviews} icon={Star} />
      </div>

      {/* Order status funnel — CSS bar chart */}
      <div className="rounded-card border border-border bg-surface p-7">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-foreground">Đơn hàng theo trạng thái</h3>
          <span className="text-sm text-muted-foreground">{stats.orders.total} đơn</span>
        </div>

        <div className="mt-8 flex h-56 items-end gap-3 sm:gap-5">
          {funnel.map((stage) => {
            const pct = Math.round((stage.value / maxValue) * 100)
            return (
              <div key={stage.label} className="flex flex-1 flex-col items-center gap-3">
                <span className="text-sm font-medium text-foreground">{stage.value}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-control bg-secondary/80 transition-all duration-500 ease-out"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="text-center text-[0.7rem] leading-tight text-muted-foreground">{stage.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
