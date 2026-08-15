import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { BackLink } from '../../../components/BackLink'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Modal } from '../../../components/Modal'
import { Spinner } from '../../../components/Spinner'
import { useAdminOrder, useUpdateOrderStatus, useRefundOrder } from '../../../features/admin/orders/hooks'
import { ADMIN_ORDER_TRANSITIONS } from '../../../features/admin/orders/statusTransitions'
import { ORDER_STATUS_LABELS } from '../../../features/orders/statusLabels'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import { can } from '../../../lib/roles'
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

  const [initialOrder] = useState(() => location.state?.order ?? findOrderInCache(queryClient, orderId))
  const orderQuery = useAdminOrder(orderId, { initialData: initialOrder })
  const order = orderQuery.data?.data
  const updateOrderStatus = useUpdateOrderStatus()
  const refundOrder = useRefundOrder()
  const addToast = useToastStore((state) => state.addToast)
  const user = useAuthStore((state) => state.user)

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [refundResult, setRefundResult] = useState(null)
  const [refundError, setRefundError] = useState(null)
  const [pendingRefund, setPendingRefund] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  const validOrderId = Number.isInteger(orderId) && orderId > 0

  if (validOrderId && !order && orderQuery.isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner label="Đang tải đơn hàng" />
      </div>
    )
  }

  const notFound = !validOrderId
    || (!order && orderQuery.isError && (orderQuery.error?.status === 404 || orderQuery.error?.code === 'NOT_FOUND'))

  if (notFound) {
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

  if (!order && orderQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-sm text-destructive">
          {orderQuery.error?.message ?? 'Không thể tải đơn hàng.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => orderQuery.refetch()}>
            Thử lại
          </Button>
          <Link to="/admin/orders" className="text-sm font-medium text-foreground hover:text-accent">
            Quay lại danh sách đơn hàng
          </Link>
        </div>
      </div>
    )
  }

  if (!order) return null

  const statusInfo = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, tone: 'neutral' }
  const transitions = ADMIN_ORDER_TRANSITIONS[order.status] ?? []
  const payment = order.payment
  const remainingRefund = payment
    ? Math.max(0, Number(payment.amount) - Number(payment.refunded_amount))
    : 0
  const refundRecordedByCancellation = order.cancellation?.refund_recorded === true
  const canRefund = ['success', 'partially_refunded'].includes(payment?.status) && remainingRefund > 0
  const mayRefund = canRefund && can(user, 'refund')
  const orderLabel = order.order_number ?? `#${order.id}`
  const requiresManualRefund = order.payment_method === 'payos'
    && ['paid', 'processing'].includes(order.status)

  const handleTransition = async (nextStatus) => {
    try {
      await updateOrderStatus.mutateAsync({ id: order.id, status: nextStatus })
      addToast({ title: 'Đã cập nhật trạng thái đơn hàng.', variant: 'success' })
      return null
    } catch (error) {
      addToast({ title: 'Không thể cập nhật trạng thái.', description: error.message, variant: 'error' })
      return error
    }
  }

  const handleStatusAction = (nextStatus) => {
    if (nextStatus === 'cancelled') {
      setCancelError(null)
      setCancelOpen(true)
      return
    }
    handleTransition(nextStatus)
  }

  const handleCancelOpenChange = (open) => {
    if (updateOrderStatus.isPending) return
    setCancelOpen(open)
    if (!open) setCancelError(null)
  }

  const handleConfirmCancel = async () => {
    setCancelError(null)
    const error = await handleTransition('cancelled')
    if (error) {
      setCancelError(error.message)
      return
    }
    setCancelOpen(false)
  }

  const handleRefundReview = (event) => {
    event.preventDefault()
    setRefundError(null)
    setRefundResult(null)

    const payload = { amount: Number(amount) }
    const trimmedReason = reason.trim()
    if (trimmedReason) payload.reason = trimmedReason
    setPendingRefund(payload)
  }

  const handleRefundOpenChange = (open) => {
    if (refundOrder.isPending) return
    if (!open) {
      setPendingRefund(null)
      setRefundError(null)
    }
  }

  const handleConfirmRefund = async () => {
    if (!pendingRefund) return
    setRefundError(null)

    try {
      const response = await refundOrder.mutateAsync({
        id: order.id,
        ...pendingRefund,
      })
      setRefundResult(response.data)
      setPendingRefund(null)
      setAmount('')
      setReason('')
      addToast({ title: 'Đã ghi nhận hoàn tiền.', variant: 'success' })
    } catch (error) {
      setRefundError(error.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {orderQuery.isError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-destructive/30 p-3 text-sm text-destructive">
          <span>Không thể làm mới đơn hàng: {orderQuery.error?.message}</span>
          <Button type="button" variant="secondary" onClick={() => orderQuery.refetch()}>
            Thử lại
          </Button>
        </div>
      )}
      <BackLink to="/admin/orders">Quay lại danh sách đơn hàng</BackLink>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-foreground">Đơn hàng {orderLabel}</h2>
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
          {(order.items ?? []).map((item) => (
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

      {refundRecordedByCancellation && payment && (
        <Card className="flex flex-col gap-4">
          <h3 className="font-display text-xl text-foreground">Yêu cầu hoàn tiền của khách</h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Số tiền đã ghi nhận</dt>
            <dd className="font-medium text-foreground sm:text-right">
              {formatPrice(payment.refunded_amount)}
            </dd>
            <dt className="text-muted-foreground">Lý do hủy</dt>
            <dd className="text-foreground sm:text-right">
              {order.cancellation.reason || 'Khách không cung cấp lý do'}
            </dd>
          </dl>
          <p className="rounded-control border border-border bg-surface-alt p-3 text-sm text-foreground">
            Khoản hoàn đã được ghi nhận trong hệ thống nhưng vẫn cần chuyển trả thủ công qua PayOS.
          </p>
        </Card>
      )}

      {transitions.length > 0 && (
        <Card className="flex flex-col gap-4">
          <h3 className="font-display text-xl text-foreground">Cập nhật trạng thái</h3>
          <div className="flex flex-wrap gap-4">
            {transitions.map((next) => (
              <Button
                key={next}
                onClick={() => handleStatusAction(next)}
                disabled={updateOrderStatus.isPending}
                variant={next === 'cancelled' ? 'destructive' : 'primary'}
              >
                {ORDER_STATUS_LABELS[next]?.label ?? next}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {mayRefund && (
        <Card className="flex flex-col gap-4">
          <h3 className="font-display text-xl text-foreground">Hoàn tiền</h3>
          <form onSubmit={handleRefundReview} className="flex flex-col gap-4">
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
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />

            {refundResult && (
              <p role="status" className="text-sm text-secondary">
                Đã hoàn {formatPrice(refundResult.refunded_amount)} · Trạng thái: {refundResult.status}
              </p>
            )}

            <div>
              <Button type="submit" disabled={refundOrder.isPending}>
                Tiếp tục hoàn tiền
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Modal
        open={cancelOpen}
        onOpenChange={handleCancelOpenChange}
        title="Hủy đơn hàng"
        description={`Đơn hàng ${orderLabel}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            Đơn sẽ chuyển sang “Đã hủy”. Hệ thống sẽ hoàn lại phần giữ kho hoặc tồn kho và nhả voucher
            nếu có. Thao tác này không thể hoàn tác trong giao diện.
          </p>
          {requiresManualRefund && (
            <p className="rounded-control border border-border bg-surface-alt p-3 text-sm text-foreground">
              Hủy đơn không tự chuyển tiền cho khách. Khoản PayOS đã thanh toán cần được xử lý hoàn
              tiền riêng.
            </p>
          )}
          {cancelError && (
            <p role="alert" className="text-sm text-destructive">
              {cancelError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleCancelOpenChange(false)}
              disabled={updateOrderStatus.isPending}
            >
              Quay lại
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={updateOrderStatus.isPending}
            >
              {updateOrderStatus.isPending ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={pendingRefund !== null}
        onOpenChange={handleRefundOpenChange}
        title="Xác nhận hoàn tiền"
        description={`Kiểm tra khoản hoàn cho đơn hàng ${orderLabel}`}
      >
        {pendingRefund && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Số tiền</dt>
              <dd className="text-right font-medium text-foreground">{formatPrice(pendingRefund.amount)}</dd>
              <dt className="text-muted-foreground">Lý do</dt>
              <dd className="text-right text-foreground">{pendingRefund.reason ?? 'Không có'}</dd>
            </dl>
            <p className="rounded-control border border-border bg-surface-alt p-3 text-sm text-foreground">
              Hệ thống chỉ ghi nhận khoản hoàn, không chuyển tiền tự động qua PayOS. Nếu khoản này hoàn
              tất số dư còn lại, đơn có thể được hủy và hoàn lại tồn kho/voucher.
            </p>
            {refundError && (
              <p role="alert" className="text-sm text-destructive">
                {refundError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleRefundOpenChange(false)}
                disabled={refundOrder.isPending}
              >
                Quay lại
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmRefund}
                disabled={refundOrder.isPending}
              >
                {refundOrder.isPending
                  ? 'Đang hoàn tiền...'
                  : `Xác nhận hoàn ${formatPrice(pendingRefund.amount)}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
