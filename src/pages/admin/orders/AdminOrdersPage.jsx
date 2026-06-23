import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { useAdminOrders } from '../../../features/admin/orders/hooks'
import { ORDER_STATUS_LABELS } from '../../../features/orders/statusLabels'
import { formatPrice, formatDate } from '../../../lib/format'

export function AdminOrdersPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const { data, isLoading } = useAdminOrders(page, status)

  const orders = data?.data ?? []
  const meta = data?.meta ?? { last_page: 1 }

  const handleStatusChange = (event) => {
    setStatus(event.target.value)
    setPage(1)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-foreground">Đơn hàng</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status-filter" className="text-sm font-medium text-foreground">
            Trạng thái
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={handleStatusChange}
            className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Tất cả</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, info]) => (
              <option key={value} value={value}>
                {info.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải đơn hàng..." />
        ) : orders.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">Chưa có đơn hàng nào.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Tổng tiền</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusInfo = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, tone: 'neutral' }
                  return (
                    <tr key={order.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40">
                      <td className="px-4 py-3 text-foreground">#{order.id}</td>
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
                        <Link to={`/admin/orders/${order.id}`} state={{ order }} className="font-medium text-foreground transition-colors hover:text-accent">
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
        <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={setPage} />
      </div>
    </div>
  )
}
