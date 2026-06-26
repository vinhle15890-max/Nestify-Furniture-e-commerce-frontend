import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useOrder, useCancelOrder } from '../../features/orders/hooks'
import { useCreatePaymentSession } from '../../features/checkout/hooks'
import { ORDER_STATUS_LABELS } from '../../features/orders/statusLabels'
import { redirectToExternal } from '../../lib/navigation'
import { BackLink } from '../../components/BackLink'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ProductThumb } from '../../components/ProductThumb'
import { formatPrice, formatDate } from '../../lib/format'
import { useToastStore } from '../../store/toastStore'

const sectionClass = 'rounded-card border border-border bg-surface p-6'

export function OrderDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useOrder(id)
  const cancelOrder = useCancelOrder()
  const createPaymentSession = useCreatePaymentSession()
  const addToast = useToastStore((state) => state.addToast)
  const gateway = 'payos' // PayOS is the only payment gateway

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl justify-center px-6 py-32">
        <Spinner />
      </div>
    )
  }

  const order = data?.data

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 lg:px-10">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Đơn hàng</h1>
        <div className="mt-8 rounded-card border border-border bg-surface p-8 text-center">
          <p className="text-muted-foreground">
            Không tìm thấy đơn hàng.{' '}
            <Link to="/orders" className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent">
              Quay lại đơn hàng của tôi
            </Link>
          </p>
        </div>
      </div>
    )
  }

  const statusInfo = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, tone: 'neutral' }
  const isPendingPayment = order.status === 'pending_payment'
  const address = order.shipping_address

  async function handleCancel() {
    try {
      await cancelOrder.mutateAsync(order.id)
      addToast({ title: 'Đã hủy đơn hàng.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể hủy đơn hàng.', description: error.message, variant: 'error' })
    }
  }

  async function handleRetryPayment() {
    try {
      const returnUrl = `${window.location.origin}/checkout/return?order_id=${order.id}`
      const session = await createPaymentSession.mutateAsync({ orderId: order.id, gateway, returnUrl })
      redirectToExternal(session.data.payment_url)
    } catch (error) {
      if (error.code === 'ORDER_ALREADY_PAID') {
        queryClient.invalidateQueries({ queryKey: ['orders', id] })
      }
      addToast({ title: 'Không thể tạo phiên thanh toán.', description: error.message, variant: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 lg:px-10">
      <BackLink to="/orders">Đơn hàng của tôi</BackLink>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] text-foreground">Đơn hàng #{order.id}</h1>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatDate(order.created_at)}
        {order.payment_method && (
          <> · {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán online (PayOS)'}</>
        )}
      </p>

      <div className={`mt-8 flex flex-col gap-2 ${sectionClass}`}>
        <h2 className="font-display text-xl text-foreground">Địa chỉ giao hàng</h2>
        <p className="text-sm text-foreground">
          {address?.recipient_name} · {address?.phone}
        </p>
        <p className="text-sm text-muted-foreground">
          {[address?.address_line1, address?.address_line2, address?.city, address?.province, address?.postal_code]
            .filter(Boolean)
            .join(', ')}
        </p>
      </div>

      <div className={`mt-6 flex flex-col gap-4 ${sectionClass}`}>
        <h2 className="font-display text-xl text-foreground">Sản phẩm</h2>
        <ul className="flex flex-col divide-y divide-border">
          {order.items.map((item) => {
            const snapshot = item.variant_snapshot ?? {}
            const title = snapshot.product_name ?? snapshot.name
            return (
              <li key={item.id} className="flex items-center gap-4 py-3 text-sm first:pt-0">
                <ProductThumb src={snapshot.thumbnail} alt={title} size="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  {snapshot.product_slug ? (
                    <Link
                      to={`/p/${snapshot.product_slug}`}
                      className="font-medium text-foreground transition-colors duration-200 hover:text-accent"
                    >
                      {title}
                    </Link>
                  ) : (
                    <p className="font-medium text-foreground">{title}</p>
                  )}
                  <p className="text-muted-foreground">
                    {snapshot.name} · x{item.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-medium text-foreground">{formatPrice(item.subtotal)}</p>
              </li>
            )
          })}
        </ul>

        <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Tạm tính</span>
            <span className="text-foreground">{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Giảm giá</span>
              <span className="text-secondary">-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-2.5 text-base font-medium text-foreground">
            <span>Tổng cộng</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {order.status === 'delivered' && (
          <p className="border-t border-border pt-4 text-sm text-muted-foreground">
            Đơn hàng đã giao. Hãy để lại đánh giá trên trang sản phẩm.
          </p>
        )}
      </div>

      {isPendingPayment && (
        <div className={`mt-6 flex flex-col gap-4 ${sectionClass}`}>
          <h2 className="font-display text-xl text-foreground">Thanh toán</h2>
          <div className="flex items-center gap-3 rounded-control border border-foreground bg-surface-alt p-3 text-sm">
            <span className="font-medium text-foreground">PayOS</span>
            <span className="text-muted-foreground">Thanh toán online qua cổng PayOS</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleRetryPayment} disabled={createPaymentSession.isPending}>
              {createPaymentSession.isPending ? 'Đang xử lý...' : 'Thanh toán lại'}
            </Button>
            <Button variant="secondary" onClick={handleCancel} disabled={cancelOrder.isPending}>
              Hủy đơn
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
