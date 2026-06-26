import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { BackLink } from '../../../components/BackLink'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { useUpdateOrderStatus, useRefundOrder } from '../../../features/admin/orders/hooks'
import { ADMIN_ORDER_TRANSITIONS } from '../../../features/admin/orders/statusTransitions'
import { ORDER_STATUS_LABELS } from '../../../features/orders/statusLabels'
import { useToastStore } from '../../../store/toastStore'
import { formatPrice, formatDate } from '../../../lib/format'

function findOrderInCache(queryClient, orderId) {
  const queries = queryClient.getQueryCache().findAll({ queryKey: ['admin', 'orders'] })
  for (const query of queries) {
    const found = query.state.data?.data?.find((item) => item.id === orderId)
    if (found) return found
  }
  return null
}

export function AdminOrderDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const orderId = Number(id)

  const [order, setOrder] = useState(() => location.state?.order ?? findOrderInCache(queryClient, orderId))
  const updateOrderStatus = useUpdateOrderStatus()
  const refundOrder = useRefundOrder()
  const addToast = useToastStore((state) => state.addToast)

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [refundResult, setRefundResult] = useState(null)
  const [refundError, setRefundError] = useState(null)

  if (!order) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Không tìm thấy đơn hàng.{' '}
          <Link to="/admin/orders" className="font-medium text-foreground transition-colors hover:text-accent">
            Quay lại danh sách đơn hàng
          </Link>
        </p>
      </div>
    )
  }

  const statusInfo = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, tone: 'neutral' }
  const transitions = ADMIN_ORDER_TRANSITIONS[order.status] ?? []
  const canRefund = order.status !== 'pending_payment'

  const handleTransition = async (nextStatus) => {
    try {
      const response = await updateOrderStatus.mutateAsync({ id: order.id, status: nextStatus })
      setOrder((current) => ({ ...current, ...response.data }))
      addToast({ title: 'Đã cập nhật trạng thái đơn hàng.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể cập nhật trạng thái.', description: error.message, variant: 'error' })
    }
  }

  const handleRefund = async (event) => {
    event.preventDefault()
    setRefundError(null)
    setRefundResult(null)

    try {
      const response = await refundOrder.mutateAsync({
        id: order.id,
        amount: Number(amount),
        reason: reason.trim() || undefined,
      })
      setRefundResult(response.data)
    } catch (error) {
      setRefundError(error.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/orders">Quay lại danh sách đơn hàng</BackLink>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-foreground">Đơn hàng {order.order_number ?? `#${order.id}`}</h2>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>

      <Card className="flex flex-col gap-2">
        <h3 className="font-display text-xl text-foreground">Khách hàng</h3>
        <p className="text-sm text-foreground">{order.user?.name}</p>
        <p className="text-sm text-muted-foreground">{order.user?.email}</p>
        <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="font-display text-xl text-foreground">Sản phẩm</h3>
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
      </Card>

      {transitions.length > 0 && (
        <Card className="flex flex-col gap-4">
          <h3 className="font-display text-xl text-foreground">Cập nhật trạng thái</h3>
          <div className="flex flex-wrap gap-4">
            {transitions.map((next) => (
              <Button
                key={next}
                onClick={() => handleTransition(next)}
                disabled={updateOrderStatus.isPending}
                variant={next === 'cancelled' ? 'destructive' : 'primary'}
              >
                {ORDER_STATUS_LABELS[next]?.label ?? next}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {canRefund && (
        <Card className="flex flex-col gap-4">
          <h3 className="font-display text-xl text-foreground">Hoàn tiền</h3>
          <form onSubmit={handleRefund} className="flex flex-col gap-4">
            <Input
              label="Số tiền hoàn"
              id="refund-amount"
              type="number"
              min={1000}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
            <Input
              label="Lý do (không bắt buộc)"
              id="refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />

            {refundError && (
              <p role="alert" className="text-sm text-destructive">
                {refundError}
              </p>
            )}

            {refundResult && (
              <p className="text-sm text-secondary">
                Đã hoàn {formatPrice(refundResult.refunded_amount)} · Trạng thái: {refundResult.status}
              </p>
            )}

            <div>
              <Button type="submit" disabled={refundOrder.isPending}>
                Hoàn tiền
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
