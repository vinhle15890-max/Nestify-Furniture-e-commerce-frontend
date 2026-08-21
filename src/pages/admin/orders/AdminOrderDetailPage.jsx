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
import { useAdminOrder, useUpdateOrderStatus, useRefundOrder, useCompleteManualRefund, useCollectCod } from '../../../features/admin/orders/hooks'
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
  const completeManualRefund = useCompleteManualRefund()
  const collectCod = useCollectCod()
  const addToast = useToastStore((state) => state.addToast)
  const user = useAuthStore((state) => state.user)

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [refundResult, setRefundResult] = useState(null)
  const [refundError, setRefundError] = useState(null)
  const [pendingRefund, setPendingRefund] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelError, setCancelError] = useState(null)
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [payoutReference, setPayoutReference] = useState('')
  const [payoutNote, setPayoutNote] = useState('')
  const [payoutError, setPayoutError] = useState(null)
  const [collectOpen, setCollectOpen] = useState(false)
  const [collectError, setCollectError] = useState(null)
  const [shippingOpen, setShippingOpen] = useState(false)
  const [carrierName, setCarrierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [shippingError, setShippingError] = useState(null)

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
  const transitions = (ADMIN_ORDER_TRANSITIONS[order.status] ?? [])
    .filter((next) => !(order.payment_method === 'cod' && order.status === 'shipped' && next === 'delivered'))
  const payment = order.payment
  const remainingRefund = payment
    ? Math.max(0, Number(payment.amount) - Number(payment.refunded_amount))
    : 0
  const refundRecordedByCancellation = order.cancellation?.refund_recorded === true
  const manualRefundCompleted = Boolean(payment?.manual_refund?.completed_at)
  const canRefund = ['paid', 'success', 'partially_refunded'].includes(payment?.status) && remainingRefund > 0
  const mayRefund = canRefund && can(user, 'refund')
  const orderLabel = order.order_number ?? `#${order.id}`
  const requiresManualRefund = order.payment_method === 'payos'
    && ['paid', 'success'].includes(order.payment?.status)

  const handleCollectCod = async () => {
    setCollectError(null)
    try {
      await collectCod.mutateAsync({ id: order.id, collected_amount: Number(order.total) })
      setCollectOpen(false)
      addToast({ title: 'Đã xác nhận giao hàng và thu đủ tiền COD.', variant: 'success' })
    } catch (error) {
      setCollectError(error.message)
    }
  }

  const handleTransition = async (nextStatus, metadata = {}) => {
    try {
      await updateOrderStatus.mutateAsync({ id: order.id, status: nextStatus, ...metadata })
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
    if (nextStatus === 'shipped') {
      setShippingError(null)
      setShippingOpen(true)
      return
    }
    handleTransition(nextStatus)
  }

  const handleConfirmShipping = async () => {
    if (!carrierName.trim()) {
      setShippingError('Vui lòng nhập đơn vị vận chuyển.')
      return
    }
    setShippingError(null)
    const error = await handleTransition('shipped', {
      carrier_name: carrierName.trim(),
      tracking_number: trackingNumber.trim() || null,
    })
    if (!error) setShippingOpen(false)
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

  const handleCompletePayout = async (event) => {
    event.preventDefault()
    if (completeManualRefund.isPending) return
    setPayoutError(null)

    try {
      await completeManualRefund.mutateAsync({
        id: order.id,
        reference: payoutReference.trim(),
        ...(payoutNote.trim() ? { note: payoutNote.trim() } : {}),
      })
      setPayoutOpen(false)
      addToast({ title: 'Đã xác nhận chuyển tiền hoàn cho khách.', variant: 'success' })
    } catch (error) {
      setPayoutError(error.message)
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

      <Card className="flex flex-col gap-3">
        <h3 className="font-display text-xl text-foreground">Thanh toán</h3>
        <p className="text-sm text-foreground">
          {order.payment_method === 'cod' ? 'COD' : 'PayOS'} · {order.payment?.status === 'paid' ? 'Đã thanh toán' : order.payment?.status === 'waived' ? 'Không cần thu tiền' : 'Chưa thanh toán'}
        </p>
        {order.payment?.paid_at && <p className="text-sm text-muted-foreground">Ghi nhận: {formatDate(order.payment.paid_at)}</p>}
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
          {manualRefundCompleted ? (
            <div className="rounded-control border border-secondary/30 bg-secondary/[0.06] p-3 text-sm text-foreground">
              <p className="font-medium">Đã chuyển tiền hoàn cho khách</p>
              <p className="mt-1 text-muted-foreground">
                Mã tham chiếu: {payment.manual_refund.reference} · {formatDate(payment.manual_refund.completed_at)}
              </p>
              {payment.manual_refund.note && <p className="mt-1 text-muted-foreground">{payment.manual_refund.note}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-control border border-border bg-surface-alt p-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>Khoản hoàn đã được ghi nhận nhưng vẫn cần chuyển trả thủ công qua PayOS.</p>
              {can(user, 'refund') && (
                <Button type="button" onClick={() => setPayoutOpen(true)} className="shrink-0">
                  Xác nhận đã chuyển tiền
                </Button>
              )}
            </div>
          )}
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

      {order.payment_method === 'cod' && order.status === 'shipped' && order.payment?.status === 'pending' && (
        <Card className="flex flex-col gap-3">
          <h3 className="font-display text-xl text-foreground">Giao hàng và thu COD</h3>
          <p className="text-sm text-muted-foreground">Chỉ xác nhận sau khi khách đã nhận hàng và cửa hàng thu đủ {formatPrice(order.total)}.</p>
          <div><Button type="button" onClick={() => setCollectOpen(true)}>Xác nhận giao và thu đủ tiền</Button></div>
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

      <Modal open={shippingOpen} onOpenChange={setShippingOpen} title="Bàn giao đơn vị vận chuyển" description={`Đơn hàng ${orderLabel}`}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">Nhập thông tin vận chuyển trước khi chuyển đơn sang “Đang giao”. Mã vận đơn có thể bổ sung sau nếu đơn vị vận chuyển chưa cấp.</p>
          <Input id="carrier-name" label="Đơn vị vận chuyển" value={carrierName} onChange={(event) => setCarrierName(event.target.value)} maxLength={100} required />
          <Input id="tracking-number" label="Mã vận đơn (không bắt buộc)" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} maxLength={100} />
          {shippingError && <p role="alert" className="text-sm text-destructive">{shippingError}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShippingOpen(false)} disabled={updateOrderStatus.isPending}>Quay lại</Button>
            <Button type="button" onClick={handleConfirmShipping} disabled={updateOrderStatus.isPending}>{updateOrderStatus.isPending ? 'Đang cập nhật...' : 'Xác nhận đang giao'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={collectOpen} onOpenChange={setCollectOpen} title="Xác nhận giao hàng và thu COD" description={`Đơn hàng ${orderLabel}`}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">Hệ thống sẽ ghi nhận đã giao và đã thu đủ {formatPrice(order.total)}. Thao tác này làm phát sinh doanh thu COD.</p>
          {collectError && <p role="alert" className="text-sm text-destructive">{collectError}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCollectOpen(false)} disabled={collectCod.isPending}>Quay lại</Button>
            <Button type="button" onClick={handleCollectCod} disabled={collectCod.isPending}>Xác nhận</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={payoutOpen}
        onOpenChange={(open) => {
          if (completeManualRefund.isPending) return
          setPayoutOpen(open)
          if (!open) setPayoutError(null)
        }}
        title="Xác nhận đã chuyển tiền"
        description={`Khoản hoàn của đơn ${orderLabel}`}
      >
        <form onSubmit={handleCompletePayout} className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            Chỉ xác nhận sau khi giao dịch hoàn tiền đã hoàn tất trên PayOS hoặc tài khoản ngân hàng.
            Thao tác sẽ đóng nhắc việc trên dashboard và được lưu vào nhật ký kiểm toán.
          </p>
          <Input id="payout-reference" label="Mã giao dịch hoặc tham chiếu" value={payoutReference} onChange={(event) => setPayoutReference(event.target.value)} maxLength={255} required />
          <Input id="payout-note" label="Ghi chú (không bắt buộc)" value={payoutNote} onChange={(event) => setPayoutNote(event.target.value)} maxLength={500} />
          {payoutError && <p role="alert" className="text-sm text-destructive">{payoutError}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setPayoutOpen(false)} disabled={completeManualRefund.isPending}>Quay lại</Button>
            <Button type="submit" disabled={completeManualRefund.isPending || !payoutReference.trim()}>
              {completeManualRefund.isPending ? 'Đang xác nhận...' : 'Xác nhận đã chuyển tiền'}
            </Button>
          </div>
        </form>
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
