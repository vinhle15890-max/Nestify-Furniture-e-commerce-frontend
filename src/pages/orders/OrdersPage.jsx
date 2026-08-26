import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Package } from 'lucide-react'
import { useOrders } from '../../features/orders/hooks'
import { ORDER_STATUS_LABELS } from '../../features/orders/statusLabels'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { Pagination } from '../../components/Pagination'
import { formatPrice, formatDate } from '../../lib/format'
import { customerOrderNextAction } from './customerOrderNextAction'

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const ordersQuery = useOrders(page)
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
      <div className="mt-8"><Pagination page={page} lastPage={data?.meta?.last_page ?? 1} onPageChange={(nextPage) => setSearchParams(nextPage > 1 ? { page: String(nextPage) } : {})} /></div>

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
            const nextAction = customerOrderNextAction(order)
            return (
              <li key={order.id} className="rounded-card border border-border bg-surface p-6 transition-colors duration-200 hover:border-border-strong">
                <div className="flex flex-wrap items-center justify-between gap-4">
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
                      <Link to={`/orders/${order.id}`} className="font-display text-lg text-foreground hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        Đơn hàng {order.order_number ?? `#${order.id}`}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)} · {totalQuantity} sản phẩm
                      </p>
                      {order.status === 'shipped' && (order.fulfillment?.carrier_name || order.fulfillment?.tracking_number) && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Vận chuyển: {[order.fulfillment.carrier_name, order.fulfillment.tracking_number].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-foreground">{formatPrice(order.total)}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end border-t border-border pt-4">
                  <Link to={`/orders/${order.id}${nextAction.hash}`} className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border-strong px-4 text-sm font-medium text-foreground hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {nextAction.label}
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
    </div>
  )
}
