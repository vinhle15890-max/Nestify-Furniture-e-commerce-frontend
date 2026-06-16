import { Link } from 'react-router-dom'
import { useOrders } from '../../features/orders/hooks'
import { ORDER_STATUS_LABELS } from '../../features/orders/statusLabels'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { formatPrice, formatDate } from '../../lib/format'

export function OrdersPage() {
  const { data, isLoading } = useOrders()

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl justify-center px-4 py-24">
        <Spinner />
      </div>
    )
  }

  const orders = data?.data ?? []

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Đơn hàng của tôi</h1>

      {orders.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-muted-foreground">
            Bạn chưa có đơn hàng nào.{' '}
            <Link to="/" className="text-primary hover:underline">
              Tiếp tục mua sắm
            </Link>
          </p>
        </Card>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {orders.map((order) => {
            const statusInfo = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, tone: 'neutral' }
            return (
              <li key={order.id}>
                <Link to={`/orders/${order.id}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">Đơn hàng #{order.id}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                    <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                    <p className="font-medium text-foreground">{formatPrice(order.total)}</p>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
