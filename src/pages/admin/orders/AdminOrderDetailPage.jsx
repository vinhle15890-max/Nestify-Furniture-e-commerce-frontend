/* Hallmark · macrostructure: Workbench · tone: operational · anchor hue: Nestify tokens */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 · contrast/mobile/tokens: pass */
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
import { useAdminOrder, useUpdateOrderStatus, useRefundOrder, useCompleteManualRefund, useCollectCod, useReviewReturnRequest, useReceiveReturnRequest, useRefundReturnRequest, useCompleteReturnRequest } from '../../../features/admin/orders/hooks'
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

function buildTimeline(order) {
  const events = [{ key: 'created', label: 'Đơn được tạo', occurred_at: order.created_at, actor: order.user?.name }]
  const audited = (order.timeline ?? []).map((event) => ({
    key: `audit-${event.id}`,
    label: event.action === 'order.cod_collected'
      ? 'Đã giao và thu đủ COD'
      : ORDER_STATUS_LABELS[event.status]?.label ?? event.status,
    occurred_at: event.occurred_at,
    actor: event.actor?.name,
    detail: [event.carrier_name, event.tracking_number, event.reason].filter(Boolean).join(' · '),
  }))
  if (audited.length > 0) return [...events, ...audited]

  const fallback = [
    ['shipped', 'Đang giao', order.fulfillment?.shipped_at, [order.fulfillment?.carrier_name, order.fulfillment?.tracking_number].filter(Boolean).join(' · ')],
    ['delivery-failed', 'Giao thất bại', order.fulfillment?.delivery_failed_at],
    ['returned', 'Hàng đã về cửa hàng', order.fulfillment?.returned_to_store_at],
    ['delivered', 'Đã giao', order.fulfillment?.delivered_at],
    ['cancelled', 'Đã hủy', order.cancellation?.cancelled_at, order.cancellation?.reason],
  ].filter(([, , occurredAt]) => occurredAt).map(([key, label, occurred_at, detail]) => ({ key, label, occurred_at, detail }))
  return [...events, ...fallback].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))
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
  const reviewReturnRequest = useReviewReturnRequest(orderId)
  const receiveReturnRequest = useReceiveReturnRequest(orderId)
  const refundReturnRequest = useRefundReturnRequest(orderId)
  const completeReturnRequest = useCompleteReturnRequest(orderId)
  const addToast = useToastStore((state) => state.addToast)
  const user = useAuthStore((state) => state.user)

  const [reason, setReason] = useState('')
  const [refundResult, setRefundResult] = useState(null)
  const [refundError, setRefundError] = useState(null)
  const [pendingRefund, setPendingRefund] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState(null)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnError, setReturnError] = useState(null)
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
  const [pendingTransition, setPendingTransition] = useState(null)
  const [returnResolution, setReturnResolution] = useState('')
  const [returnInspection, setReturnInspection] = useState('')
  const [returnRestock, setReturnRestock] = useState(false)
  const [returnRefundReason, setReturnRefundReason] = useState('')
  const [returnRefundReference, setReturnRefundReference] = useState('')
  const [returnRefundNote, setReturnRefundNote] = useState('')
  const [refundIdempotencyKey, setRefundIdempotencyKey] = useState(null)
  const [returnRefundIdempotencyKey, setReturnRefundIdempotencyKey] = useState(null)

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
  const canRefund = ['paid', 'success'].includes(payment?.status)
    && ['pending_confirmation', 'pending_payment', 'paid', 'processing'].includes(order.status)
    && remainingRefund > 0
  const mayRefund = canRefund && can(user, 'refund')
  const orderLabel = order.order_number ?? `#${order.id}`
  const requiresManualRefund = order.payment_method === 'payos'
    && ['paid', 'success'].includes(order.payment?.status)
  const paymentStatusLabel = {
    paid: 'Đã thanh toán',
    success: 'Đã thanh toán',
    waived: 'Không cần thu tiền',
    pending: 'Chờ thanh toán',
    failed: 'Đã kết thúc, chưa thu tiền',
    partially_refunded: 'Đã hoàn một phần',
    refunded: 'Đã ghi nhận hoàn đủ',
  }[order.payment?.status] ?? 'Chưa thanh toán'
  const timeline = buildTimeline(order)
  const terminalReason = {
    delivered: 'Đơn đã hoàn tất. Nếu khách cần trả hàng, hãy dùng quy trình đổi trả riêng.',
    cancelled: 'Đơn đã hủy là trạng thái kết thúc và không thể chuyển tiếp.',
  }[order.status]

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
    if (nextStatus === 'returned_to_store') {
      setReturnError(null)
      setReturnOpen(true)
      return
    }
    if (nextStatus === 'delivery_failed' || nextStatus === 'delivered') {
      setPendingTransition(nextStatus)
      return
    }
    handleTransition(nextStatus)
  }

  const handleConfirmedTransition = async () => {
    const nextStatus = pendingTransition
    if (!nextStatus) return
    const error = await handleTransition(nextStatus)
    if (!error) setPendingTransition(null)
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
    const error = await handleTransition('cancelled', {
      ...(cancelReason.trim() ? { reason: cancelReason.trim() } : {}),
    })
    if (error) {
      setCancelError(error.message)
      return
    }
    setCancelOpen(false)
  }

  const handleConfirmReturn = async () => {
    setReturnError(null)
    const error = await handleTransition('returned_to_store')
    if (error) {
      setReturnError(error.message)
      return
    }
    setReturnOpen(false)
  }

  const handleRefundReview = (event) => {
    event.preventDefault()
    setRefundError(null)
    setRefundResult(null)

    const payload = { amount: remainingRefund }
    const trimmedReason = reason.trim()
    if (trimmedReason) payload.reason = trimmedReason
    if (!refundIdempotencyKey) setRefundIdempotencyKey(crypto.randomUUID())
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
        idempotencyKey: refundIdempotencyKey,
        ...pendingRefund,
      })
      setRefundResult(response.data)
      setPendingRefund(null)
      setReason('')
      setRefundIdempotencyKey(null)
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

  const handleReturnReview = async (status) => {
    try {
      await reviewReturnRequest.mutateAsync({ id: order.return_request.id, status, resolution_note: returnResolution.trim() })
      setReturnResolution('')
      addToast({ title: status === 'approved' ? 'Đã duyệt yêu cầu đổi trả.' : 'Đã từ chối yêu cầu đổi trả.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể xử lý yêu cầu đổi trả.', description: error.message, variant: 'error' })
    }
  }

  const handleReturnReceipt = async () => {
    try {
      await receiveReturnRequest.mutateAsync({ id: order.return_request.id, inspection_note: returnInspection.trim(), restock: returnRestock })
      setReturnInspection('')
      addToast({ title: 'Đã xác nhận nhận hàng đổi trả.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể xác nhận nhận hàng.', description: error.message, variant: 'error' })
    }
  }

  const handleReturnRefund = async () => {
    try {
      const idempotencyKey = returnRefundIdempotencyKey ?? crypto.randomUUID()
      setReturnRefundIdempotencyKey(idempotencyKey)
      await refundReturnRequest.mutateAsync({ id: order.return_request.id, idempotencyKey, ...(returnRefundReason.trim() ? { reason: returnRefundReason.trim() } : {}) })
      setReturnRefundReason('')
      setReturnRefundIdempotencyKey(null)
      addToast({ title: 'Đã ghi nhận khoản hoàn đổi trả.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể ghi nhận khoản hoàn.', description: error.message, variant: 'error' })
    }
  }

  const handleReturnCompletion = async () => {
    try {
      await completeReturnRequest.mutateAsync({ id: order.return_request.id, reference: returnRefundReference.trim(), ...(returnRefundNote.trim() ? { note: returnRefundNote.trim() } : {}) })
      setReturnRefundReference('')
      setReturnRefundNote('')
      addToast({ title: 'Đã hoàn tất đổi trả và chuyển tiền.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể hoàn tất đổi trả.', description: error.message, variant: 'error' })
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
      <BackLink to={location.state?.returnTo ?? '/admin/orders'}>Quay lại danh sách đơn hàng</BackLink>
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
          {order.payment_method === 'cod' ? 'COD' : 'PayOS'} · {paymentStatusLabel}
        </p>
        {order.payment?.paid_at && <p className="text-sm text-muted-foreground">Ghi nhận: {formatDate(order.payment.paid_at)}</p>}
        {canRefund && !mayRefund && <p className="text-sm text-muted-foreground">Tài khoản hiện tại không có quyền hoàn tiền; cần nhân viên có quyền “refund” xử lý.</p>}
      </Card>

      {(order.payment_exceptions ?? []).filter((item) => item.status !== 'resolved').map((item) => (
        <Card key={item.id} className="flex flex-col gap-3 border-destructive/40 bg-destructive/[0.04]">
          <h3 className="font-display text-xl text-destructive">Thanh toán đến sau khi đơn đã hủy</h3>
          <p className="text-sm text-foreground">PayOS đã xác minh {formatPrice(item.amount)} sau khi đơn trở thành trạng thái kết thúc. Tồn kho và voucher không được tự động khôi phục.</p>
          <div className="mt-1 grid gap-1 text-sm text-muted-foreground">
            <p>Mã yêu cầu PayOS: {item.gateway_order_code || '—'}</p>
            <p>Payment Link ID: {item.gateway_payment_link_id || '—'}</p>
            <p>Tham chiếu giao dịch PayOS: {item.gateway_transaction_reference || '—'}</p>
            <p>Trạng thái xử lý: {item.status === 'refund_pending' ? 'Chờ chuyển tiền hoàn' : 'Cần xử lý'}</p>
          </div>
        </Card>
      ))}

      <Card className="flex flex-col gap-4">
        <div>
          <h3 className="font-display text-xl text-foreground">Tiến trình đơn hàng</h3>
          <p className="mt-1 text-sm text-muted-foreground">Các mốc vận hành được lấy từ nhật ký hệ thống.</p>
        </div>
        <ol className="border-l border-border pl-5">
          {timeline.map((event) => (
            <li key={event.key} className="relative pb-5 last:pb-0">
              <span className="absolute -left-6 top-1.5 size-2.5 rounded-full border-2 border-surface bg-secondary" aria-hidden="true" />
              <p className="font-medium text-foreground">{event.label}</p>
              <p className="text-sm text-muted-foreground">{formatDate(event.occurred_at)}{event.actor ? ` · ${event.actor}` : ''}</p>
              {event.detail && <p className="mt-1 text-sm text-foreground">{event.detail}</p>}
            </li>
          ))}
        </ol>
        {order.payment?.paid_at && <p className="border-t border-border pt-3 text-sm text-muted-foreground">Thanh toán được ghi nhận lúc {formatDate(order.payment.paid_at)}.</p>}
      </Card>

      {order.return_request && (
        <Card className="flex flex-col gap-4">
          <div><h3 className="font-display text-xl text-foreground">Yêu cầu đổi trả</h3><p className="mt-1 text-sm text-muted-foreground">Trạng thái: {{ requested: 'Chờ xem xét', approved: 'Đã duyệt', rejected: 'Đã từ chối', in_transit: 'Hàng đang gửi về', received: 'Đã nhận, chờ ghi hoàn', refund_pending: 'Chờ xác nhận chuyển tiền', completed: 'Đã hoàn tất' }[order.return_request.status]}</p></div>
          <p className="text-sm text-foreground">{order.return_request.reason}</p>
          {order.return_request.status === 'requested' ? <div className="flex flex-col gap-3">
            <label className="text-sm"><span className="text-muted-foreground">Phản hồi cho khách</span><textarea value={returnResolution} onChange={(event) => setReturnResolution(event.target.value)} rows={3} maxLength={1000} className="mt-1 w-full rounded-control border border-border bg-surface p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
            <p className="text-sm text-muted-foreground">Duyệt yêu cầu chưa tự hoàn tiền hoặc cộng tồn; chỉ thực hiện các bước đó sau khi hàng thực tế quay về.</p>
            <div className="flex flex-wrap gap-3"><Button onClick={() => handleReturnReview('approved')} disabled={returnResolution.trim().length < 5 || reviewReturnRequest.isPending}>Duyệt yêu cầu</Button><Button variant="secondary" onClick={() => handleReturnReview('rejected')} disabled={returnResolution.trim().length < 5 || reviewReturnRequest.isPending}>Từ chối</Button></div>
          </div> : order.return_request.status === 'in_transit' ? <div className="flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">Vận đơn gửi trả: {order.return_request.return_carrier} · {order.return_request.return_tracking_number}</p>
            <label className="text-sm"><span className="text-muted-foreground">Kết quả kiểm tra hàng</span><textarea value={returnInspection} onChange={(event) => setReturnInspection(event.target.value)} rows={3} maxLength={1000} className="mt-1 w-full rounded-control border border-border bg-surface p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
            <label className="flex items-start gap-3 text-sm text-foreground"><input type="checkbox" checked={returnRestock} onChange={(event) => setReturnRestock(event.target.checked)} className="mt-1" /><span>Hàng đạt kiểm tra và có thể nhập lại kho bán. Chỉ chọn sau khi đã kiểm đếm thực tế.</span></label>
            <div><Button onClick={handleReturnReceipt} disabled={returnInspection.trim().length < 5 || receiveReturnRequest.isPending}>{receiveReturnRequest.isPending ? 'Đang xác nhận...' : 'Xác nhận đã nhận hàng'}</Button></div>
          </div> : order.return_request.status === 'received' && can(user, 'refund') ? <div className="flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">{order.return_request.inspection_note} · {order.return_request.restocked_at ? 'Đã nhập lại kho.' : 'Không nhập lại kho.'}</p>
            <Input id="return-refund-reason" label="Lý do hoàn tiền (không bắt buộc)" value={returnRefundReason} onChange={(event) => setReturnRefundReason(event.target.value)} maxLength={500} />
            <div><Button onClick={handleReturnRefund} disabled={refundReturnRequest.isPending}>{refundReturnRequest.isPending ? 'Đang ghi nhận...' : `Ghi nhận hoàn ${formatPrice(order.total)}`}</Button></div>
          </div> : order.return_request.status === 'refund_pending' && can(user, 'refund') ? <div className="flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">Đã ghi nhận hoàn {formatPrice(order.return_request.refund_amount)}. Chỉ hoàn tất sau khi tiền thực tế đã chuyển cho khách.</p>
            <Input id="return-refund-reference" label="Mã tham chiếu chuyển tiền" value={returnRefundReference} onChange={(event) => setReturnRefundReference(event.target.value)} maxLength={255} required />
            <Input id="return-refund-note" label="Ghi chú (không bắt buộc)" value={returnRefundNote} onChange={(event) => setReturnRefundNote(event.target.value)} maxLength={500} />
            <div><Button onClick={handleReturnCompletion} disabled={!returnRefundReference.trim() || completeReturnRequest.isPending}>{completeReturnRequest.isPending ? 'Đang hoàn tất...' : 'Xác nhận đã chuyển tiền'}</Button></div>
          </div> : <div className="text-sm text-muted-foreground">{order.return_request.resolution_note && <p>Phản hồi: {order.return_request.resolution_note}</p>}{order.return_request.inspection_note && <p className="mt-2">Kiểm tra: {order.return_request.inspection_note}</p>}{order.return_request.refund_reference && <p className="mt-2">Mã hoàn tiền: {order.return_request.refund_reference}</p>}</div>}
        </Card>
      )}

      {(order.refunds ?? []).length > 0 && (
        <Card className="flex flex-col gap-4">
          <div><h3 className="font-display text-xl text-foreground">Các khoản hoàn tiền</h3><p className="mt-1 text-sm text-muted-foreground">Mỗi dòng là một nghĩa vụ hoàn tiền độc lập; “đã chuyển” chỉ xuất hiện khi có mã tham chiếu.</p></div>
          {(order.refunds ?? []).map((refund) => (
            <div key={refund.id} className="rounded-control border border-border p-3 text-sm">
              <p className="font-medium text-foreground">Hoàn tiền #{refund.id} · {formatPrice(refund.amount)}</p>
              <p className="mt-1 text-muted-foreground">{{ requested: 'Chờ chuyển tiền', processing: 'Đang xử lý', needs_review: 'Kết quả chuyển tiền cần xác minh', succeeded: 'Đã chuyển', failed: 'Thất bại', cancelled: 'Đã hủy', legacy_unknown: 'Dữ liệu cũ — chưa rõ đã chuyển' }[refund.status] ?? refund.status}</p>
              {refund.reason && <p className="mt-1 text-foreground">Lý do: {refund.reason}</p>}
              <p className="mt-1 text-muted-foreground">Yêu cầu: {formatDate(refund.requested_at)}{refund.requested_by?.name ? ` · ${refund.requested_by.name}` : ''}</p>
              {refund.external_reference && <p className="mt-1 text-muted-foreground">Tham chiếu: {refund.external_reference} · {formatDate(refund.completed_at)}</p>}
              {refund.failure_reason && <p className="mt-1 text-destructive">Ghi chú xử lý: {refund.failure_reason}</p>}
              {refund.needs_review_at && <p className="mt-1 font-medium text-destructive">Không được chuyển lại trước khi xác minh giao dịch bên ngoài ({formatDate(refund.needs_review_at)}).</p>}
            </div>
          ))}
        </Card>
      )}

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
              {!can(user, 'refund') && <p className="text-muted-foreground">Cần quyền “refund” để xác nhận khoản tiền đã chuyển.</p>}
            </div>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-4">
          <h3 className="font-display text-xl text-foreground">Cập nhật trạng thái</h3>
          {transitions.length > 0 ? <div className="flex flex-wrap gap-4">
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
          </div> : <p className="text-sm text-muted-foreground">{terminalReason ?? 'Không có bước chuyển trạng thái hợp lệ ở thời điểm này.'}</p>}
        </Card>

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
            <p className="text-sm text-foreground">Hoàn toàn bộ số tiền còn lại: <strong>{formatPrice(remainingRefund)}</strong></p>
            <Input
              label="Lý do (không bắt buộc)"
              id="refund-reason"
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />

            {refundResult && (
              <p role="status" className="text-sm text-secondary">
                Đã tạo khoản hoàn {formatPrice(refundResult.amount)} · Trạng thái: {refundResult.status}
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
        open={pendingTransition !== null}
        onOpenChange={(open) => { if (!updateOrderStatus.isPending && !open) setPendingTransition(null) }}
        title={pendingTransition === 'delivery_failed' ? 'Xác nhận giao hàng thất bại' : 'Xác nhận đã giao hàng'}
        description={`Đơn hàng ${orderLabel}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            {pendingTransition === 'delivery_failed'
              ? 'Hàng vẫn đang ở bên vận chuyển và chưa được cộng lại tồn kho. Sau khi hàng thực tế quay về, cần xác nhận “Hàng đã về cửa hàng”.'
              : 'Chỉ xác nhận khi khách đã nhận hàng. Trạng thái đơn sẽ hoàn tất; trạng thái thanh toán vẫn được quản lý độc lập.'}
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setPendingTransition(null)} disabled={updateOrderStatus.isPending}>Quay lại</Button>
            <Button type="button" onClick={handleConfirmedTransition} disabled={updateOrderStatus.isPending}>{updateOrderStatus.isPending ? 'Đang cập nhật...' : 'Xác nhận'}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onOpenChange={handleCancelOpenChange}
        title="Hủy đơn hàng"
        description={`Đơn hàng ${orderLabel}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            Đơn sẽ chuyển sang “Đã hủy”. Hệ thống nhả voucher và kết thúc khoản COD chưa thu. Với đơn
            đã thanh toán PayOS, hệ thống ghi nhận đủ số tiền cần hoàn để nhân viên đối soát.
          </p>
          <Input
            id="cancel-reason"
            label="Lý do hủy (không bắt buộc)"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            maxLength={500}
          />
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
        open={returnOpen}
        onOpenChange={(open) => {
          if (updateOrderStatus.isPending) return
          setReturnOpen(open)
          if (!open) setReturnError(null)
        }}
        title="Xác nhận hàng đã về cửa hàng"
        description={`Đơn hàng ${orderLabel}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            Chỉ xác nhận sau khi cửa hàng đã nhận và kiểm đếm hàng thực tế. Hệ thống sẽ hoàn số lượng
            của đơn này vào tồn kho đúng một lần; bước hủy sau đó sẽ không cộng kho lần nữa.
          </p>
          {returnError && <p role="alert" className="text-sm text-destructive">{returnError}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setReturnOpen(false)} disabled={updateOrderStatus.isPending}>Quay lại</Button>
            <Button type="button" onClick={handleConfirmReturn} disabled={updateOrderStatus.isPending}>
              {updateOrderStatus.isPending ? 'Đang cập nhật...' : 'Xác nhận hàng đã về'}
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
