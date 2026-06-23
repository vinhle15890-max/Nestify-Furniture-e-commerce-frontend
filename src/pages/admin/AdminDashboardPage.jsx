import { Card } from '../../components/Card'
import { Spinner } from '../../components/Spinner'
import { useAdminDashboard } from '../../features/admin/dashboard/hooks'
import { formatPrice } from '../../lib/format'

function Stat({ label, value }) {
  return (
    <Card>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl text-foreground">{value}</p>
    </Card>
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

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">Tổng quan hoạt động cửa hàng.</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Doanh thu" value={formatPrice(stats.revenue)} />
        <Stat label="Tổng đơn hàng" value={stats.orders.total} />
        <Stat label="Chờ thanh toán" value={stats.orders.pending_payment} />
        <Stat label="Đã thanh toán" value={stats.orders.paid} />
        <Stat label="Đang xử lý" value={stats.orders.processing} />
        <Stat label="Đang giao" value={stats.orders.shipped} />
        <Stat label="Đã giao" value={stats.orders.delivered} />
        <Stat label="Đã huỷ" value={stats.orders.cancelled} />
        <Stat label="Sản phẩm" value={stats.catalog.products} />
        <Stat label="Sản phẩm đang bán" value={stats.catalog.active_products} />
        <Stat label="Khách hàng" value={stats.customers} />
        <Stat label="Đánh giá chờ duyệt" value={stats.pending_reviews} />
      </div>
    </div>
  )
}
