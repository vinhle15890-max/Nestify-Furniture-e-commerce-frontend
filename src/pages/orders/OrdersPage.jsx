import { Link } from 'react-router-dom'
import { ChevronRight, Package } from 'lucide-react'
import { useOrders } from '../../features/orders/hooks'
import { ORDER_STATUS_LABELS } from '../../features/orders/statusLabels'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { formatPrice, formatDate } from '../../lib/format'

export function OrdersPage() {
  const ordersQuery = useOrders()
  const { data, isLoading, isError, isFetching } = ordersQuery

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto flex max-w-4xl justify-center px-6 py-32">
          <Spinner />
        </div>
      </div>
    )
  }

  if (isError && !data?.data) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Đơn hàng của tôi</h1>
          <LoadErrorState
            title="Chưa thể tải đơn hàng"
            description="Lịch sử đơn hàng chưa tải được. Hãy thử lại để xem trạng thái hiện tại."
            onRetry={() => ordersQuery.refetch()}
            isRetrying={isFetching}
            className="mt-10"
          />
        </div>
      </div>
    )
  }

  const orders = data?.data ?? []

  return (
    <div className="min-h-screen bg-canvas text-ink">
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Đơn hàng của tôi</h1>

      {isError && data?.data && (
        <LoadErrorState
          title="Chưa cập nhật được trạng thái đơn hàng mới nhất"
          description="Đang hiển thị lịch sử đã tải trước đó."
          onRetry={() => ordersQuery.refetch()}
          isRetrying={isFetching}
          compact
          background
          className="mt-6"
        />
      )}

      {orders.length === 0 ? (
        <div className="mt-10 rounded-card border border-border bg-surface p-12 text-center">
          <Package size={36} className="mx-auto text-border-strong" />
          <p className="mt-4 text-muted-foreground">
            Bạn chưa có đơn hàng nào.{' '}
            <Link to="/c/all" className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent">
              Tiếp tục mua sắm
            </Link>
          </p>
        </div>
      ) : (
        <ul className="mt-10 flex flex-col gap-4">
          {orders.map((order) => {
            const statusInfo = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, tone: 'neutral' }
            const items = order.items ?? []
            const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
            const previews = items.slice(0, 4)
            return (
              <li key={order.id}>
                <Link
                  to={`/orders/${order.id}`}
                  className="group flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface p-6 transition-colors duration-200 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="flex items-center gap-4">
                    {previews.length > 0 && (
                      <div className="flex -space-x-3">
                        {previews.map((item) => (
                          <ProductThumb
                            key={item.id}
                            src={item.variant_snapshot?.thumbnail}
                            alt={item.variant_snapshot?.product_name}
                            size="h-12 w-12"
                            className="ring-2 ring-surface"
                          />
                        ))}
                      </div>
                    )}
                    <div>
                      <p className="font-display text-lg text-foreground">
                        Đơn hàng {order.order_number ?? `#${order.id}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)} · {totalQuantity} sản phẩm
                      </p>
                    </div>
                  </div>
                  <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-foreground">{formatPrice(order.total)}</p>
                    <ChevronRight size={16} className="text-border-strong transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
    </div>
  )
}
