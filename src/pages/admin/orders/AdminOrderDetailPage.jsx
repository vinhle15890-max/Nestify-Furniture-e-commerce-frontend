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
import { useAdminOrder, useUpdateOrderStatus, useUpdateShipmentMetadata, useRefundOrder, useRefundWorkflow, useRefundPayoutDetails, useCollectCod, useReviewReturnRequest, useReceiveReturnRequest, useRefundReturnRequest, useCompleteReturnRequest } from '../../../features/admin/orders/hooks'
import { ADMIN_ORDER_TRANSITIONS } from '../../../features/admin/orders/statusTransitions'
import { ORDER_STATUS_LABELS } from '../../../features/orders/statusLabels'
import { adminPaymentLabel } from '../../../features/admin/orders/paymentLabels'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import { can } from '../../../lib/roles'
import { formatPrice, formatDate } from '../../../lib/format'
import { returnReasonCategoryLabel } from '../../../features/orders/returnReasonCategories'

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

function nextOperationalStep(order) {
  const openException = (order.payment_exceptions ?? []).some((item) => item.status !== 'resolved')
  if (openException) return 'Xử lý ngoại lệ thanh toán trước khi tiếp tục đơn.'
  if (order.return_request) {
    return {
      requested: 'Xem xét yêu cầu đổi trả của khách.',
      approved: 'Chờ khách gửi hàng về cửa hàng.',
      in_transit: 'Theo dõi hàng trả và xác nhận khi nhận thực tế.',
      received: 'Kiểm tra hàng và ghi nhận nghĩa vụ hoàn tiền.',
      refund_pending: 'Chuyển tiền hoàn và lưu mã tham chiếu.',
      completed: 'Đổi trả đã hoàn tất.',
      rejected: 'Yêu cầu đổi trả đã được kết thúc.',
    }[order.return_request.status] ?? 'Kiểm tra yêu cầu đổi trả.'
  }
  if (order.status === 'pending_confirmation') return 'Xác nhận đơn để bắt đầu chuẩn bị hàng.'
  if (order.status === 'processing') return 'Chuẩn bị hàng và nhập thông tin vận chuyển.'
  if (order.status === 'shipped' && order.payment_method === 'cod' && order.payment?.status === 'pending') return 'Theo dõi giao hàng; xác nhận COD sau khi đã thu đủ tiền.'
  if (order.status === 'shipped') return 'Theo dõi vận chuyển và cập nhật kết quả giao hàng.'
  if (order.status === 'delivered' && order.payment_method === 'cod' && order.payment?.status === 'pending') return 'Đối chiếu thực tế và xác nhận đã thu đủ tiền COD.'
  if (order.status === 'delivered') return 'Đơn đã hoàn tất; chỉ xử lý thêm nếu có yêu cầu đổi trả.'
  if (order.status === 'cancelled') return 'Đơn đã kết thúc; kiểm tra khoản hoàn tiền nếu đã thu tiền.'
  return 'Kiểm tra trạng thái và lịch sử đơn trước khi thao tác.'
}

function transitionActionLabel(status) {
  return {
    processing: 'Xác nhận đơn',
    shipped: 'Bàn giao vận chuyển',
    delivered: 'Xác nhận đã giao',
    delivery_failed: 'Ghi nhận giao thất bại',
    returned_to_store: 'Xác nhận hàng đã về cửa hàng',
    cancelled: 'Hủy đơn hàng',
  }[status] ?? ORDER_STATUS_LABELS[status]?.label ?? status
}

function ShippingAddress({ address }) {
  if (!address) return <p className="text-sm text-muted-foreground">Đơn chưa có snapshot địa chỉ nhận hàng.</p>
  const locality = [address.address_line1, address.address_line2, address.city, address.province, address.postal_code].filter(Boolean).join(', ')
  return (
    <div className="grid gap-2 text-sm">
      <p className="font-medium text-foreground">{address.recipient_name}</p>
      <a className="w-fit text-foreground underline-offset-4 hover:underline" href={`tel:${address.phone}`}>{address.phone}</a>
      <p className="max-w-prose text-muted-foreground">{locality}</p>
    </div>
  )
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
  const updateShipmentMetadata = useUpdateShipmentMetadata()
  const refundOrder = useRefundOrder()
  const refundWorkflow = useRefundWorkflow(orderId)
  const refundPayoutDetails = useRefundPayoutDetails(orderId)
  const collectCod = useCollectCod()
  const reviewReturnRequest = useReviewReturnRequest(orderId)
  const receiveReturnRequest = useReceiveReturnRequest(orderId)
  const refundReturnRequest = useRefundReturnRequest(orderId)
  const completeReturnRequest = useCompleteReturnRequest(orderId)
  const addToast = useToastStore((state) => state.addToast)
  // Fallback keeps direct-render/legacy snapshots compatible during the one-time
  // persisted-store migration; AdminRoute still requires a real admin session.
  const user = useAuthStore((state) => state.adminUser ?? state.user)

  const [reason, setReason] = useState('')
  const [refundResult, setRefundResult] = useState(null)
  const [refundError, setRefundError] = useState(null)
  const [pendingRefund, setPendingRefund] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState(null)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnError, setReturnError] = useState(null)
  const [collectOpen, setCollectOpen] = useState(false)
  const [collectError, setCollectError] = useState(null)
  const [shippingOpen, setShippingOpen] = useState(false)
  const [carrierName, setCarrierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [shippingError, setShippingError] = useState(null)
  const [shipmentMetadataOpen, setShipmentMetadataOpen] = useState(false)
  const [shipmentMetadataError, setShipmentMetadataError] = useState(null)
  const [pendingTransition, setPendingTransition] = useState(null)
  const [deliveryFailureReason, setDeliveryFailureReason] = useState('')
  const [returnResolution, setReturnResolution] = useState('')
  const [returnInspection, setReturnInspection] = useState('')
  const [returnRestock, setReturnRestock] = useState(false)
  const [returnRefundReason, setReturnRefundReason] = useState('')
  const [returnRefundReference, setReturnRefundReference] = useState('')
  const [returnRefundNote, setReturnRefundNote] = useState('')
  const [refundIdempotencyKey, setRefundIdempotencyKey] = useState(null)
  const [returnRefundIdempotencyKey, setReturnRefundIdempotencyKey] = useState(null)
  const [refundAction, setRefundAction] = useState(null)
  const [refundActionReference, setRefundActionReference] = useState('')
  const [refundActionNote, setRefundActionNote] = useState('')
  const [refundActionError, setRefundActionError] = useState(null)
  const [payoutCorrectionRefund, setPayoutCorrectionRefund] = useState(null)
  const [payoutCorrectionReason, setPayoutCorrectionReason] = useState('')
  const [payoutCorrectionError, setPayoutCorrectionError] = useState(null)

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
    ? Number(payment.refundable_amount ?? Math.max(0, Number(payment.amount) - Number(payment.refunded_amount) - Number(payment.refund_pending_amount ?? 0)))
    : 0
  const refundRecordedByCancellation = order.cancellation?.refund_recorded === true
  const refunds = order.refunds ?? []
  const refundPriority = ['needs_review', 'processing', 'requested', 'failed', 'succeeded']
  const focusedRefund = refundPriority
    .map((status) => refunds.find((refund) => refund.status === status))
    .find(Boolean) ?? refunds[0]
  const refundNextAction = focusedRefund ? {
    requested: focusedRefund.payout_destination?.status === 'verified' ? 'Bắt đầu chuyển tiền' : 'Xử lý khoản hoàn tiền',
    processing: 'Ghi nhận kết quả chuyển tiền',
    needs_review: 'Xác minh kết quả chuyển tiền',
    failed: focusedRefund.payout_destination?.status === 'verified' ? 'Thử chuyển lại' : 'Xử lý khoản hoàn tiền',
    succeeded: 'Xem khoản hoàn tiền',
  }[focusedRefund.status] ?? 'Xem khoản hoàn tiền' : null
  const canRefund = ['paid', 'success'].includes(payment?.status)
    && ['pending_confirmation', 'pending_payment', 'paid', 'processing'].includes(order.status)
    && remainingRefund > 0
  const mayRefund = canRefund && can(user, 'refund')
  const orderLabel = order.order_number ?? `#${order.id}`
  const requiresManualRefund = order.payment_method === 'payos'
    && ['paid', 'success'].includes(order.payment?.status)
  const timeline = buildTimeline(order)
  const terminalReason = {
    delivered: 'Đơn đã hoàn tất. Nếu khách cần trả hàng, hãy dùng quy trình đổi trả riêng.',
    cancelled: 'Đơn đã hủy là trạng thái kết thúc và không thể chuyển tiếp.',
  }[order.status]
  const nextStep = nextOperationalStep(order)

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
      if (nextStatus === 'delivery_failed') setDeliveryFailureReason('')
      setPendingTransition(nextStatus)
      return
    }
    handleTransition(nextStatus)
  }

  const handleConfirmedTransition = async () => {
    const nextStatus = pendingTransition
    if (!nextStatus) return
    if (nextStatus === 'delivery_failed' && deliveryFailureReason.trim().length < 3) return
    const error = await handleTransition(nextStatus, nextStatus === 'delivery_failed' ? { reason: deliveryFailureReason.trim() } : {})
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

  const openShipmentMetadata = () => {
    setCarrierName(order.fulfillment?.carrier_name ?? '')
    setTrackingNumber(order.fulfillment?.tracking_number ?? '')
    setShipmentMetadataError(null)
    setShipmentMetadataOpen(true)
  }

  const handleShipmentMetadata = async () => {
    if (!carrierName.trim() || !trackingNumber.trim()) {
      setShipmentMetadataError('Vui lòng nhập đơn vị vận chuyển và mã vận đơn.')
      return
    }
    setShipmentMetadataError(null)
    try {
      await updateShipmentMetadata.mutateAsync({
        id: order.id,
        carrier_name: carrierName.trim(),
        tracking_number: trackingNumber.trim(),
      })
      setShipmentMetadataOpen(false)
      addToast({ title: 'Đã bổ sung mã vận đơn.', variant: 'success' })
    } catch (error) {
      setShipmentMetadataError(error.message)
    }
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

  const startRefundTransfer = async (refund) => {
    try {
      await refundWorkflow.mutateAsync({ refundId: refund.id, action: 'processing' })
      addToast({ title: refund.status === 'failed' ? 'Đã mở lại lần chuyển tiền.' : 'Đã bắt đầu xử lý chuyển tiền.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể bắt đầu chuyển tiền.', description: error.message, variant: 'error' })
    }
  }

  const verifyPayoutDestination = async (refund) => {
    try {
      await refundPayoutDetails.mutateAsync({ refundId: refund.id, action: 'verify' })
      addToast({ title: 'Đã xác minh tài khoản nhận hoàn.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể xác minh tài khoản.', description: error.message, variant: 'error' })
    }
  }

  const requestPayoutCorrection = async (event) => {
    event.preventDefault()
    if (!payoutCorrectionRefund || refundPayoutDetails.isPending) return
    setPayoutCorrectionError(null)
    try {
      await refundPayoutDetails.mutateAsync({ refundId: payoutCorrectionRefund.id, action: 'correction', reason: payoutCorrectionReason.trim() })
      setPayoutCorrectionRefund(null)
      setPayoutCorrectionReason('')
      addToast({ title: 'Đã yêu cầu khách cập nhật tài khoản nhận hoàn.', variant: 'success' })
    } catch (error) {
      setPayoutCorrectionError(error.message)
    }
  }

  const openRefundAction = (refund, action) => {
    setRefundAction({ refund, action })
    setRefundActionReference(refund.external_reference ?? '')
    setRefundActionNote('')
    setRefundActionError(null)
  }

  const closeRefundAction = (force = false) => {
    if (refundWorkflow.isPending && !force) return
    setRefundAction(null)
    setRefundActionReference('')
    setRefundActionNote('')
    setRefundActionError(null)
  }

  const submitRefundAction = async (event) => {
    event.preventDefault()
    if (!refundAction || refundWorkflow.isPending) return

    const { refund, action } = refundAction
    const note = refundActionNote.trim()
    const reference = refundActionReference.trim()
    const payload = action === 'succeeded'
      ? { reference, ...(note ? { note } : {}) }
      : action === 'failed'
        ? { failure_reason: note }
        : { note, ...(reference ? { external_reference: reference } : {}) }

    setRefundActionError(null)
    try {
      await refundWorkflow.mutateAsync({ refundId: refund.id, action, payload })
      closeRefundAction(true)
      addToast({
        title: action === 'succeeded'
          ? 'Đã xác nhận tiền hoàn được chuyển.'
          : action === 'failed'
            ? 'Đã ghi nhận lần chuyển tiền thất bại.'
            : 'Đã khóa khoản hoàn để chờ xác minh.',
        variant: action === 'failed' ? 'error' : 'success',
      })
    } catch (error) {
      setRefundActionError(error.message)
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Tạo lúc {formatDate(order.created_at)}</p>
          <h2 className="mt-1 [overflow-wrap:anywhere] font-display text-2xl text-foreground">Đơn hàng {orderLabel}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
          <span className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-foreground">{adminPaymentLabel(order)}</span>
        </div>
      </div>

      <section className="grid overflow-hidden rounded-card border border-border bg-surface shadow-soft sm:grid-cols-2 xl:grid-cols-4" aria-label="Tóm tắt đơn hàng">
        <div className="p-4 sm:border-r sm:border-border"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Đơn hàng</p><p className="mt-2 font-medium text-foreground">{statusInfo.label}</p></div>
        <div className="border-t border-border p-4 sm:border-r sm:border-t-0"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Thanh toán</p><p className="mt-2 font-medium text-foreground">{adminPaymentLabel(order)}</p></div>
        <div className="border-t border-border p-4 xl:border-r xl:border-t-0"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Khách phải trả</p><p className="mt-2 font-display text-xl tabular-nums text-foreground">{formatPrice(order.total)}</p></div>
        <div className="border-t border-border bg-surface-alt/50 p-4 xl:border-t-0"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Việc tiếp theo</p><p className="mt-2 text-sm font-medium text-foreground">{nextStep}</p></div>
      </section>

      <section id="order-actions" aria-labelledby="order-actions-title" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        {order.payment_method === 'cod' && ['shipped', 'delivered'].includes(order.status) && order.payment?.status === 'pending' && (
          <Card className="flex flex-col gap-3 lg:max-w-md">
            <h3 id="order-actions-title" className="font-display text-xl text-foreground">COD chờ thu</h3>
            <p className="text-sm text-muted-foreground">
              {order.status === 'delivered'
                ? `Đơn đã được ghi nhận giao hàng nhưng chưa ghi nhận thu ${formatPrice(order.total)} COD. Hãy đối chiếu thực tế trước khi xác nhận.`
                : `Chỉ xác nhận sau khi khách đã nhận hàng và cửa hàng thu đủ ${formatPrice(order.total)}.`}
            </p>
            <div><Button type="button" onClick={() => setCollectOpen(true)}>{order.status === 'shipped' ? `Xác nhận giao và thu đủ ${formatPrice(order.total)}` : 'Xác nhận đã thu đủ tiền COD'}</Button></div>
          </Card>
        )}

        <Card className="flex flex-col gap-4">
          <div>
            {!(order.payment_method === 'cod' && ['shipped', 'delivered'].includes(order.status) && order.payment?.status === 'pending') && <h3 id="order-actions-title" className="font-display text-xl text-foreground">Thao tác tiếp theo</h3>}
            <p className="mt-1 text-sm text-muted-foreground">Chỉ các thao tác hợp lệ ở trạng thái hiện tại được hiển thị.</p>
          </div>
          {transitions.length > 0 || (order.status === 'shipped' && !order.fulfillment?.tracking_number) ? <div className="flex flex-wrap gap-3">
            {transitions.map((next) => (
              <Button
                key={next}
                onClick={() => handleStatusAction(next)}
                disabled={updateOrderStatus.isPending}
                variant={next === 'cancelled' ? 'destructive' : 'primary'}
              >
                {transitionActionLabel(next)}
              </Button>
            ))}
            {order.status === 'shipped' && !order.fulfillment?.tracking_number && (
              <Button type="button" variant="secondary" onClick={openShipmentMetadata}>
                Bổ sung mã vận đơn
              </Button>
            )}
          </div> : <p className="text-sm text-muted-foreground">{terminalReason ?? 'Không có bước chuyển trạng thái hợp lệ ở thời điểm này.'}</p>}
        </Card>

        {mayRefund && (
          <Card className="flex flex-col gap-4 lg:max-w-md">
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
              <div><Button type="submit" disabled={refundOrder.isPending}>Tạo nghĩa vụ hoàn tiền</Button></div>
            </form>
          </Card>
        )}

        {refundNextAction && (
          <Card className="flex flex-col gap-3 lg:max-w-md">
            <h3 className="font-display text-xl text-foreground">Khoản hoàn tiền</h3>
            <p className="text-sm text-muted-foreground">Hoàn tiền #{focusedRefund.id} cần được xử lý theo trạng thái hiện tại.</p>
            <div>
              <a href="#refunds" className="inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-6 py-3 text-sm font-medium tracking-wide text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {refundNextAction}
              </a>
            </div>
          </Card>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h3 className="font-display text-xl text-foreground">Khách đặt hàng</h3>
          <p className="font-medium text-foreground">{order.user?.name || '—'}</p>
          <a className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" href={`mailto:${order.user?.email}`}>{order.user?.email || '—'}</a>
        </Card>
        <Card className="flex flex-col gap-3">
          <h3 className="font-display text-xl text-foreground">Người nhận hàng</h3>
          <ShippingAddress address={order.shipping_address} />
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <h3 className="font-display text-xl text-foreground">Sản phẩm</h3>
        <ul className="flex flex-col gap-3">
          {(order.items ?? []).map((item) => (
            <li key={item.id} className="grid gap-3 border-b border-border pb-3 text-sm last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{item.variant_snapshot?.name}</p>
                <p className="text-muted-foreground">
                  SKU: {item.variant_snapshot?.sku || '—'}
                </p>
              </div>
              <p className="text-muted-foreground sm:text-right">{formatPrice(item.unit_price)} × {item.quantity}</p>
              <p className="font-medium tabular-nums text-foreground sm:min-w-28 sm:text-right">{formatPrice(item.subtotal)}</p>
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
              <span>Giảm giá{order.voucher_code ? ` · ${order.voucher_code}` : ' · Không còn dữ liệu mã'}</span>
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
          {adminPaymentLabel(order)}
        </p>
        {order.payment?.paid_at && <p className="text-sm text-muted-foreground">Ghi nhận: {formatDate(order.payment.paid_at)}</p>}
        <dl className="grid gap-2 border-t border-border pt-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <dt className="text-muted-foreground">Số tiền thanh toán</dt><dd className="font-medium text-foreground sm:text-right">{formatPrice(order.payment?.amount ?? order.total)}</dd>
          <dt className="text-muted-foreground">Đã ghi nhận thu</dt><dd className="text-foreground sm:text-right">{formatPrice(order.payment?.paid_amount ?? 0)}</dd>
          <dt className="text-muted-foreground">Đã chuyển hoàn</dt><dd className="text-foreground sm:text-right">{formatPrice(order.payment?.refunded_amount ?? 0)}</dd>
          <dt className="text-muted-foreground">Nghĩa vụ đang mở</dt><dd className="text-foreground sm:text-right">{formatPrice(order.payment?.refund_pending_amount ?? 0)}</dd>
        </dl>
        {order.notes && <div className="border-t border-border pt-3"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Ghi chú của khách</p><p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{order.notes}</p></div>}
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

      <Card id="order-actions" className="flex flex-col gap-4">
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
        <div id="return-request" tabIndex={-1} ref={(node) => { if (node && location.hash === '#return-request' && document.activeElement !== node) node.focus({ preventScroll: true }) }} className="scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Card className="flex flex-col gap-4">
          <div><h3 className="font-display text-xl text-foreground">Yêu cầu đổi trả</h3><p className="mt-1 text-sm text-muted-foreground">Trạng thái: {{ requested: 'Chờ xem xét', approved: 'Đã duyệt', rejected: 'Đã từ chối', in_transit: 'Hàng đang gửi về', received: 'Đã nhận, chờ ghi hoàn', refund_pending: 'Chờ xác nhận chuyển tiền', completed: 'Đã hoàn tất' }[order.return_request.status]}</p></div>
          {order.return_request.reason_category && <p className="text-xs font-medium text-muted-foreground">Nhóm lý do: {returnReasonCategoryLabel(order.return_request.reason_category) ?? order.return_request.reason_category}</p>}
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
        </div>
      )}

      {(refunds.length > 0 || refundRecordedByCancellation) && (
        <Card id="refunds" className="flex flex-col gap-4 scroll-mt-24">
          <div><h3 className="font-display text-xl text-foreground">Khoản hoàn tiền</h3><p className="mt-1 text-sm text-muted-foreground">Mỗi dòng là một nghĩa vụ hoàn tiền độc lập; “đã chuyển” chỉ xuất hiện khi có mã tham chiếu.</p></div>
          {refunds.length === 0 && <p className="text-sm text-muted-foreground">Chưa có phiếu hoàn tiền trong dữ liệu đơn hàng.</p>}
          {refunds.map((refund) => (
            <div key={refund.id} className="rounded-control border border-border p-3 text-sm">
              <p className="font-medium text-foreground">Hoàn tiền #{refund.id} · {formatPrice(refund.amount)}</p>
              <p className="mt-1 text-muted-foreground">{{ requested: 'Chờ chuyển tiền', processing: 'Đang xử lý', needs_review: 'Kết quả chuyển tiền cần xác minh', succeeded: 'Đã chuyển', failed: 'Thất bại', cancelled: 'Đã hủy', legacy_unknown: 'Dữ liệu cũ — chưa rõ đã chuyển' }[refund.status] ?? refund.status}</p>
              {refund.reason && <p className="mt-1 text-foreground">Lý do: {refund.reason}</p>}
              <p className="mt-1 text-muted-foreground">Yêu cầu: {formatDate(refund.requested_at)}{refund.requested_by?.name ? ` · ${refund.requested_by.name}` : ''}</p>
              {refund.external_reference && <p className="mt-1 text-muted-foreground">Tham chiếu: {refund.external_reference} · {formatDate(refund.completed_at)}</p>}
              {refund.failure_reason && <p className="mt-1 text-destructive">Ghi chú xử lý: {refund.failure_reason}</p>}
              {refund.needs_review_at && <p className="mt-1 font-medium text-destructive">Không được chuyển lại trước khi xác minh giao dịch bên ngoài ({formatDate(refund.needs_review_at)}).</p>}
              {!refund.payout_destination && ['requested', 'failed'].includes(refund.status) && <p className="mt-2 rounded-control border border-border bg-surface-alt p-3 text-muted-foreground">Đang chờ khách cung cấp tài khoản nhận hoàn.</p>}
              {refund.payout_destination && <div className="mt-3 rounded-control border border-border bg-surface-alt p-3">
                <p className="font-medium text-foreground">Tài khoản nhận hoàn · {{ submitted: 'Chờ xác minh', verified: 'Đã xác minh', correction_required: 'Chờ khách sửa' }[refund.payout_destination.status]}</p>
                <dl className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-4">
                  {refund.payout_destination.account_holder_name && <><dt>Người nhận</dt><dd className="text-foreground sm:text-right">{refund.payout_destination.account_holder_name}</dd></>}
                  <dt>Ngân hàng</dt><dd className="text-foreground sm:text-right">{refund.payout_destination.bank_name}</dd>
                  <dt>Số tài khoản</dt><dd className="font-mono text-foreground sm:text-right">{refund.payout_destination.account_number ?? refund.payout_destination.account_number_masked}</dd>
                </dl>
                {refund.payout_destination.correction_reason && <p className="mt-2 text-destructive">Yêu cầu sửa: {refund.payout_destination.correction_reason}</p>}
                {refund.payout_destination.verified_at && <p className="mt-2 text-muted-foreground">Xác minh: {formatDate(refund.payout_destination.verified_at)}{refund.payout_destination.verified_by?.name ? ` · ${refund.payout_destination.verified_by.name}` : ''}</p>}
                {can(user, 'refund') && refund.payout_destination.status === 'submitted' && <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3"><Button type="button" onClick={() => verifyPayoutDestination(refund)} disabled={refundPayoutDetails.isPending}>Xác minh tài khoản</Button><Button type="button" variant="secondary" onClick={() => { setPayoutCorrectionRefund(refund); setPayoutCorrectionReason(''); setPayoutCorrectionError(null) }} disabled={refundPayoutDetails.isPending}>Yêu cầu sửa</Button></div>}
              </div>}
              {can(user, 'refund') && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {['requested', 'failed'].includes(refund.status) && refund.payout_destination?.status === 'verified' && (
                    <Button type="button" onClick={() => startRefundTransfer(refund)} disabled={refundWorkflow.isPending}>
                      {refund.status === 'failed' ? 'Thử chuyển lại' : 'Bắt đầu chuyển tiền'}
                    </Button>
                  )}
                  {refund.status === 'processing' && <div className="w-full">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => openRefundAction(refund, 'needs_review')} disabled={refundWorkflow.isPending}>Chưa rõ kết quả</Button>
                      <Button type="button" variant="destructive" onClick={() => openRefundAction(refund, 'failed')} disabled={refundWorkflow.isPending}>Ghi nhận thất bại</Button>
                    </div>
                    <div data-refund-success-action className="mt-3 border-t border-border pt-3">
                      <Button type="button" onClick={() => openRefundAction(refund, 'succeeded')} disabled={refundWorkflow.isPending}>Xác nhận đã chuyển</Button>
                    </div>
                  </div>}
                  {refund.status === 'needs_review' && (
                    <Button type="button" onClick={() => openRefundAction(refund, 'succeeded')} disabled={refundWorkflow.isPending}>Xác nhận kết quả đã chuyển</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {refundRecordedByCancellation && payment && (
        <Card className="flex flex-col gap-3">
          <h3 className="font-display text-xl text-foreground">Yêu cầu hoàn tiền của khách</h3>
          <p className="text-sm text-muted-foreground">Yêu cầu này được xử lý trong block hoàn tiền chuẩn của đơn hàng.</p>
          <a href="#refunds" className="w-fit text-sm font-medium text-foreground underline underline-offset-4 hover:text-accent">Mở khoản hoàn tiền</a>
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
          {pendingTransition === 'delivery_failed' && (
            <Input
              id="delivery-failure-reason"
              label="Lý do giao không thành công"
              value={deliveryFailureReason}
              onChange={(event) => setDeliveryFailureReason(event.target.value)}
              minLength={3}
              maxLength={500}
              required
            />
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setPendingTransition(null)} disabled={updateOrderStatus.isPending}>Quay lại</Button>
            <Button type="button" onClick={handleConfirmedTransition} disabled={updateOrderStatus.isPending || (pendingTransition === 'delivery_failed' && deliveryFailureReason.trim().length < 3)}>{updateOrderStatus.isPending ? 'Đang cập nhật...' : 'Xác nhận'}</Button>
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

      <Modal
        open={shipmentMetadataOpen}
        onOpenChange={(open) => {
          if (updateShipmentMetadata.isPending) return
          setShipmentMetadataOpen(open)
          if (!open) setShipmentMetadataError(null)
        }}
        title="Bổ sung mã vận đơn"
        description={`Đơn hàng ${orderLabel}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">Thông tin này chỉ bổ sung bằng chứng vận chuyển; trạng thái đơn vẫn là “Đang giao”.</p>
          <Input id="shipment-carrier-name" label="Đơn vị vận chuyển" value={carrierName} onChange={(event) => setCarrierName(event.target.value)} maxLength={100} required />
          <Input id="shipment-tracking-number" label="Mã vận đơn" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} maxLength={100} required />
          {shipmentMetadataError && <p role="alert" className="text-sm text-destructive">{shipmentMetadataError}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShipmentMetadataOpen(false)} disabled={updateShipmentMetadata.isPending}>Quay lại</Button>
            <Button type="button" onClick={handleShipmentMetadata} disabled={updateShipmentMetadata.isPending}>{updateShipmentMetadata.isPending ? 'Đang lưu...' : 'Lưu mã vận đơn'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={collectOpen} onOpenChange={setCollectOpen} title="Xác nhận đã thu đủ tiền COD" description={`Đơn hàng ${orderLabel}`}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">Hệ thống sẽ ghi nhận đã thu đủ {formatPrice(order.total)}. Nếu đơn vẫn đang giao, đơn đồng thời chuyển sang “Đã giao”; nếu đơn đã giao thì chỉ sửa sự thật thanh toán.</p>
          {collectError && <p role="alert" className="text-sm text-destructive">{collectError}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCollectOpen(false)} disabled={collectCod.isPending}>Quay lại</Button>
            <Button type="button" onClick={handleCollectCod} disabled={collectCod.isPending}>Xác nhận</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={payoutCorrectionRefund !== null}
        onOpenChange={(open) => { if (!refundPayoutDetails.isPending && !open) setPayoutCorrectionRefund(null) }}
        title="Yêu cầu khách sửa tài khoản"
        description={payoutCorrectionRefund ? `Hoàn tiền #${payoutCorrectionRefund.id}` : ''}
      >
        <form onSubmit={requestPayoutCorrection} className="flex flex-col gap-4">
          <p className="text-sm text-foreground">Nêu rõ thông tin nào chưa hợp lệ. Khách phải nhập lại đầy đủ; số tài khoản cũ không được dùng để chuyển tiền.</p>
          <label className="text-sm text-foreground"><span className="text-muted-foreground">Lý do yêu cầu sửa</span><textarea value={payoutCorrectionReason} onChange={(event) => setPayoutCorrectionReason(event.target.value)} rows={3} minLength={5} maxLength={1000} required className="mt-1 w-full resize-y rounded-control border border-border bg-surface p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
          {payoutCorrectionError && <p role="alert" className="text-sm text-destructive">{payoutCorrectionError}</p>}
          <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setPayoutCorrectionRefund(null)} disabled={refundPayoutDetails.isPending}>Quay lại</Button><Button type="submit" disabled={refundPayoutDetails.isPending || payoutCorrectionReason.trim().length < 5}>{refundPayoutDetails.isPending ? 'Đang gửi...' : 'Gửi yêu cầu sửa'}</Button></div>
        </form>
      </Modal>

      <Modal
        open={refundAction !== null}
        onOpenChange={(open) => { if (!open) closeRefundAction() }}
        title={{
          succeeded: 'Xác nhận đã chuyển tiền',
          failed: 'Ghi nhận chuyển tiền thất bại',
          needs_review: 'Ghi nhận kết quả chưa rõ',
        }[refundAction?.action] ?? 'Cập nhật khoản hoàn'}
        description={refundAction ? `Hoàn tiền #${refundAction.refund.id} · ${formatPrice(refundAction.refund.amount)}` : ''}
      >
        {refundAction && (
          <form onSubmit={submitRefundAction} className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              {refundAction.action === 'succeeded'
                ? 'Chỉ xác nhận khi đã kiểm tra tiền thực tế được chuyển. Mã tham chiếu là bằng chứng bắt buộc.'
                : refundAction.action === 'failed'
                  ? 'Khoản hoàn vẫn được giữ lại để có thể thử chuyển lại trên cùng phiếu sau khi xử lý nguyên nhân.'
                  : 'Dùng khi đã thao tác bên ngoài nhưng chưa biết giao dịch thành công hay thất bại. Hệ thống sẽ giữ số tiền và không cho chuyển lại.'}
            </p>
            {refundAction.action !== 'failed' && (
              <Input
                id="refund-action-reference"
                label={refundAction.action === 'succeeded' ? 'Mã giao dịch hoặc tham chiếu' : 'Mã tham chiếu (nếu có)'}
                value={refundActionReference}
                onChange={(event) => setRefundActionReference(event.target.value)}
                maxLength={255}
                required={refundAction.action === 'succeeded'}
              />
            )}
            <label className="text-sm text-foreground">
              <span className="text-muted-foreground">{refundAction.action === 'failed' ? 'Lý do thất bại' : refundAction.action === 'needs_review' ? 'Thông tin cần xác minh' : 'Ghi chú (không bắt buộc)'}</span>
              <textarea
                value={refundActionNote}
                onChange={(event) => setRefundActionNote(event.target.value)}
                rows={3}
                maxLength={1000}
                required={refundAction.action !== 'succeeded'}
                className="mt-1 w-full resize-y rounded-control border border-border bg-surface p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            {refundActionError && <p role="alert" className="text-sm text-destructive">{refundActionError}</p>}
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeRefundAction} disabled={refundWorkflow.isPending}>Quay lại</Button>
              <Button
                type="submit"
                variant={refundAction.action === 'failed' ? 'destructive' : 'primary'}
                disabled={refundWorkflow.isPending || (refundAction.action === 'succeeded' ? !refundActionReference.trim() : !refundActionNote.trim())}
              >
                {refundWorkflow.isPending ? 'Đang lưu...' : refundAction.action === 'succeeded' ? 'Xác nhận đã chuyển' : refundAction.action === 'failed' ? 'Lưu thất bại' : 'Chuyển sang cần xác minh'}
              </Button>
            </div>
          </form>
        )}
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
