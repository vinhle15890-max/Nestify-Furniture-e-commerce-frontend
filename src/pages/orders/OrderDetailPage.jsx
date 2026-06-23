import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useOrder, useCancelOrder } from '../../features/orders/hooks'
import { useCreatePaymentSession } from '../../features/checkout/hooks'
import { ORDER_STATUS_LABELS } from '../../features/orders/statusLabels'
import { redirectToExternal } from '../../lib/navigation'
import { Card } from '../../components/Card'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { formatPrice, formatDate } from '../../lib/format'
import { useToastStore } from '../../store/toastStore'

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
      <div className="mx-auto flex max-w-3xl justify-center px-4 py-24">
        <Spinner />
      </div>
    )
  }

  const order = data?.data

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl text-foreground">Đơn hàng</h1>
        <Card className="mt-6">
          <p className="text-sm text-muted-foreground">
            Không tìm thấy đơn hàng.{' '}
            <Link to="/orders" className="text-primary hover:underline">
              Quay lại đơn hàng của tôi
            </Link>
          </p>
        </Card>
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
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-foreground">Đơn hàng #{order.id}</h1>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.created_at)}</p>

      <Card className="mt-6 flex flex-col gap-2">
        <h2 className="font-display text-xl text-foreground">Địa chỉ giao hàng</h2>
        <p className="text-sm text-foreground">
          {address?.recipient_name} · {address?.phone}
        </p>
        <p className="text-sm text-muted-foreground">
          {[address?.address_line1, address?.address_line2, address?.city, address?.province, address?.postal_code]
            .filter(Boolean)
            .join(', ')}
        </p>
      </Card>

      <Card className="mt-6 flex flex-col gap-4">
        <h2 className="font-display text-xl text-foreground">Sản phẩm</h2>
        <ul className="flex flex-col gap-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground">{item.variant_snapshot?.name}</p>
                <p className="text-muted-foreground">
                  {item.variant_snapshot?.sku} · x{item.quantity}
                </p>
              </div>
              <p className="font-medium text-foreground">{formatPrice(item.subtotal)}</p>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between text-foreground">
            <span>Tạm tính</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex items-center justify-between text-foreground">
              <span>Giảm giá</span>
              <span>-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between font-medium text-foreground">
            <span>Tổng cộng</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {order.status === 'delivered' && (
          <p className="border-t border-border pt-4 text-sm text-muted-foreground">
            Đơn hàng đã giao. Hãy để lại đánh giá trên trang sản phẩm.
          </p>
        )}
      </Card>

      {isPendingPayment && (
        <Card className="mt-6 flex flex-col gap-4">
          <h2 className="font-display text-xl text-foreground">Thanh toán</h2>
          <div className="flex items-center gap-3 rounded-control border border-border p-3 text-sm">
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
        </Card>
      )}
    </div>
  )
}
