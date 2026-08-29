import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useOrder, useCancelOrder, useSubmitRefundPayoutDetails } from '../../features/orders/hooks'
import { useCreatePaymentSession } from '../../features/checkout/hooks'
import { ORDER_STATUS_LABELS } from '../../features/orders/statusLabels'
import { redirectToExternal } from '../../lib/navigation'
import { BackLink } from '../../components/BackLink'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { BecomingModal } from '../../components/BecomingModal'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { formatPrice, formatDate } from '../../lib/format'
import { useToastStore } from '../../store/toastStore'
import { customerOrderNextAction } from './customerOrderNextAction'

// Orders can be cancelled by their owner any time before they ship.
const CANCELLABLE_STATUSES = ['pending_confirmation', 'pending_payment', 'paid', 'processing']

const sectionClass = 'rounded-card border border-border bg-surface p-6'
const CANCELLATION_REASONS = ['Đặt nhầm', 'Muốn đổi sản phẩm', 'Không còn nhu cầu']
const SUPPORT_PHONE = '0945691309'

export function OrderDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { data, error, isLoading, isError, isFetching, refetch } = useOrder(id)
  const cancelOrder = useCancelOrder()
  const submitRefundPayoutDetails = useSubmitRefundPayoutDetails(id)
  const createPaymentSession = useCreatePaymentSession()
  const addToast = useToastStore((state) => state.addToast)
  const gateway = 'payos' // PayOS is the only payment gateway
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [payoutRefund, setPayoutRefund] = useState(null)
  const [payoutBank, setPayoutBank] = useState('')
  const [payoutHolder, setPayoutHolder] = useState('')
  const [payoutAccount, setPayoutAccount] = useState('')
  const [payoutError, setPayoutError] = useState(null)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto flex max-w-3xl justify-center px-6 py-32">
          <Spinner />
        </div>
      </div>
    )
  }

  const order = data?.data

  if (isError && error?.status !== 404) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Đơn hàng</h1>
          <LoadErrorState className="mt-8" title="Chưa thể tải chi tiết đơn hàng" description="Trạng thái đơn hàng chưa thể xác minh. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
      <div className="mx-auto max-w-3xl">
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
      </div>
    )
  }

  const statusInfo = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, tone: 'neutral' }
  const paymentMethod = order.payment_method ?? 'payos'
  const isPendingPayment = paymentMethod === 'payos' && (
    order.payment?.status === 'pending'
    || (!order.payment && order.status === 'pending_payment')
  )
  const isFullyDiscounted = Number(order.total) === 0
  const canCancel = CANCELLABLE_STATUSES.includes(order.status)
  // A cancelled order refunds money only when an online payment was captured.
  const willRefund = !isFullyDiscounted && (
    order.payment?.status === 'paid'
    || (!order.payment && paymentMethod === 'payos' && order.status === 'paid')
  )
  const address = order.shipping_address
  const nextAction = customerOrderNextAction(order)

  async function handleCancel() {
    try {
      await cancelOrder.mutateAsync({ id: order.id, reason: cancelReason.trim() || undefined })
      setCancelOpen(false)
      setCancelReason('')
      addToast({ title: 'Đã hủy đơn hàng.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể hủy đơn hàng.', description: error.message, variant: 'error' })
    }
  }

  async function handleRetryPayment() {
    try {
      const session = await createPaymentSession.mutateAsync({ orderId: order.id, gateway })
      redirectToExternal(session.data.payment_url)
    } catch (error) {
      if (error.code === 'ORDER_ALREADY_PAID') {
        queryClient.invalidateQueries({ queryKey: ['orders', id] })
      }
      addToast({ title: 'Không thể tạo phiên thanh toán.', description: error.message, variant: 'error' })
    }
  }


  function openPayoutDetails(refund) {
    setPayoutRefund(refund)
    setPayoutBank(refund.payout_destination?.bank_name ?? '')
    setPayoutHolder(refund.payout_destination?.account_holder_name ?? '')
    setPayoutAccount('')
    setPayoutError(null)
  }

  async function handlePayoutDetails(event) {
    event.preventDefault()
    if (!payoutRefund || submitRefundPayoutDetails.isPending) return
    setPayoutError(null)
    try {
      await submitRefundPayoutDetails.mutateAsync({
        refundId: payoutRefund.id,
        bank_name: payoutBank.trim(),
        account_holder_name: payoutHolder.trim(),
        account_number: payoutAccount.trim(),
      })
      setPayoutRefund(null)
      setPayoutAccount('')
      addToast({ title: 'Đã gửi thông tin nhận hoàn để Nestify xác minh.', variant: 'success' })
    } catch (error) {
      setPayoutError(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 lg:px-10">
      <BackLink to="/orders">Đơn hàng của tôi</BackLink>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] text-foreground">
          Đơn hàng {order.order_number ?? `#${order.id}`}
        </h1>
        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatDate(order.created_at)}
        {isFullyDiscounted ? (
          <> · Đã áp dụng mã giảm giá toàn bộ</>
        ) : order.payment_method && (
          <> · {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán online (PayOS)'}</>
        )}
      </p>

      <section data-testid="customer-next-action" aria-labelledby="customer-next-action-title" className={`mt-6 ${sectionClass}`}>
        <h2 id="customer-next-action-title" className="font-display text-xl text-foreground">Bạn cần làm gì tiếp theo</h2>
        <p className="mt-2 text-sm text-muted-foreground">{nextAction.label}</p>
        <div className="mt-4">
          {nextAction.kind === 'payment' ? (
            <Button onClick={handleRetryPayment} disabled={createPaymentSession.isPending}>
              {createPaymentSession.isPending ? 'Đang xử lý...' : nextAction.label}
            </Button>
          ) : nextAction.kind === 'payout' ? (
            <Button type="button" onClick={() => openPayoutDetails(nextAction.refund)}>{nextAction.label}</Button>
          ) : nextAction.kind === 'detail' ? (
            <span className="text-sm text-muted-foreground">Không có thao tác bắt buộc ở thời điểm này.</span>
          ) : (
            <a href={nextAction.hash} className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 text-sm font-medium text-foreground hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{nextAction.label}</a>
          )}
        </div>
      </section>

      {/* Ownership echo (Ch5) — deliberately typographic. The order status above
          carries the operational truth; this line adds narrative continuity
          without simulating a room the customer may never have created. */}
      {!isPendingPayment && order.status !== 'cancelled' && (
        <div className="mt-5 flex items-center gap-3" data-order-ownership-echo>
          <span aria-hidden="true" className="h-2 w-10 shrink-0 rounded-full bg-primary" />
          <p className="text-sm font-medium leading-relaxed text-emerging">
            Quyết định của bạn đang dần thành hình.
          </p>
        </div>
      )}

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
                  {item.room?.name && <p className="mt-1 text-xs text-emerging">Từ phòng “{item.room.name}”</p>}
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

      </div>

      {order.status === 'shipped' && (
        <section id="shipment" className={`mt-6 scroll-mt-24 ${sectionClass}`} aria-labelledby="shipment-heading">
          <h2 id="shipment-heading" className="font-display text-xl text-foreground">Vận chuyển</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.fulfillment?.carrier_name || 'Đơn vị vận chuyển chưa được cung cấp'}
            {order.fulfillment?.tracking_number ? ` · ${order.fulfillment.tracking_number}` : ''}
          </p>
        </section>
      )}

      {order.status === 'delivered' && (
        <section className={`mt-6 ${sectionClass}`} aria-labelledby="order-reviews-heading">
          <h2 id="order-reviews-heading" className="font-display text-xl text-foreground">Đánh giá sản phẩm</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Chia sẻ trải nghiệm thực tế để người mua sau hình dung rõ hơn trước khi chọn.
          </p>
          <ul className="mt-5 divide-y divide-border border-y border-border">
            {order.items.map((item) => {
              const snapshot = item.variant_snapshot ?? {}
              const title = snapshot.product_name ?? snapshot.name
              return (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductThumb src={snapshot.thumbnail} alt="" size="h-12 w-12" />
                    <p className="min-w-0 font-medium text-foreground">{title}</p>
                  </div>
                  {item.review ? (
                    <span className="inline-flex min-h-11 shrink-0 items-center px-4 text-sm font-medium text-muted-foreground">
                      Đã đánh giá
                    </span>
                  ) : snapshot.product_slug ? (
                    <Link
                      to={`/p/${snapshot.product_slug}#reviews`}
                      className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-control border border-border-strong px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-alt active:bg-unbuilt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Viết đánh giá
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sản phẩm không còn được hiển thị</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {(order.refunds ?? []).length > 0 && (
        <section id="refund-payout" className={`mt-6 scroll-mt-24 ${sectionClass}`} aria-labelledby="refund-destination-heading">
          <h2 id="refund-destination-heading" className="font-display text-xl text-foreground">Thông tin nhận hoàn tiền</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Nestify chỉ chuyển tiền vào tài khoản bạn xác nhận tại đây. Thông tin giao hàng không được dùng để suy đoán tài khoản ngân hàng.</p>
          <div className="mt-4 flex flex-col gap-3">
            {(order.refunds ?? []).map((refund) => {
              const destination = refund.payout_destination
              const maySubmit = ['requested', 'failed'].includes(refund.status)
                && (!destination || destination.status === 'correction_required')
              return (
                <div key={refund.id} className="rounded-control border border-border bg-surface-alt p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">Khoản hoàn #{refund.id} · {formatPrice(refund.amount)}</p>
                      {!destination && <p className="mt-1 text-muted-foreground">Đang chờ bạn cung cấp tài khoản nhận tiền.</p>}
                      {destination?.status === 'submitted' && <p className="mt-1 text-muted-foreground">Nestify đang xác minh thông tin nhận hoàn.</p>}
                      {destination?.status === 'verified' && <p className="mt-1 font-medium text-secondary">Tài khoản nhận hoàn đã được xác minh.</p>}
                      {destination?.status === 'correction_required' && <p className="mt-1 text-destructive">Cần cập nhật: {destination.correction_reason}</p>}
                    </div>
                    {maySubmit && <Button type="button" onClick={() => openPayoutDetails(refund)}>{destination ? 'Cập nhật tài khoản' : 'Cung cấp tài khoản'}</Button>}
                  </div>
                  {destination && <dl className="mt-3 grid gap-1 border-t border-border pt-3 text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-4">
                    <dt>Ngân hàng</dt><dd className="text-foreground sm:text-right">{destination.bank_name}</dd>
                    <dt>Chủ tài khoản</dt><dd className="text-foreground sm:text-right">{destination.account_holder_name}</dd>
                    <dt>Số tài khoản</dt><dd className="text-foreground sm:text-right">{destination.account_number_masked}</dd>
                  </dl>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {order.status === 'delivered' && (
        <section id="after-sales-support" className={`mt-6 scroll-mt-24 ${sectionClass}`} aria-labelledby="after-sales-support-heading">
          {/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V5 */}
          <h2 id="after-sales-support-heading" className="font-display text-xl text-foreground">Hỗ trợ sau khi nhận hàng</h2>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">Nếu sản phẩm cần được kiểm tra hoặc trao đổi phương án đổi trả, hãy gọi trực tiếp cho Nestify và cung cấp mã đơn <span className="font-medium text-foreground">{order.order_number ?? `#${order.id}`}</span>. Nhân viên sẽ xác nhận tình trạng và hướng dẫn trước khi bạn gửi hàng.</p>
            <a href={`tel:${SUPPORT_PHONE}`} className="inline-flex min-h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-control border border-border-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-alt active:bg-unbuilt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Gọi {SUPPORT_PHONE}
            </a>
          </div>
        </section>
      )}

      {isPendingPayment && (
        <div id="payment" className={`mt-6 scroll-mt-24 flex flex-col gap-4 ${sectionClass}`}>
          <h2 className="font-display text-xl text-foreground">Thanh toán</h2>
          <div className="flex items-center gap-3 rounded-control border border-foreground bg-surface-alt p-3 text-sm">
            <span className="font-medium text-foreground">PayOS</span>
            <span className="text-muted-foreground">Thanh toán online qua cổng PayOS</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button variant="secondary" onClick={() => setCancelOpen(true)} disabled={cancelOrder.isPending}>
              Hủy đơn
            </Button>
          </div>
        </div>
      )}

      {/* A confirmed-but-not-yet-shipped order can still be cancelled (paid orders are refunded). */}
      {canCancel && !isPendingPayment && (
        <div className={`mt-6 flex flex-wrap items-center justify-between gap-4 ${sectionClass}`}>
          <p className="text-sm text-muted-foreground">
            Đơn hàng chưa giao — bạn có thể hủy{willRefund ? ' và được hoàn tiền' : ''}.
          </p>
          <Button variant="secondary" onClick={() => setCancelOpen(true)} disabled={cancelOrder.isPending}>
            Hủy đơn
          </Button>
        </div>
      )}

      <BecomingModal
        open={payoutRefund !== null}
        onOpenChange={(open) => { if (!submitRefundPayoutDetails.isPending && !open) setPayoutRefund(null) }}
        title="Tài khoản nhận hoàn tiền"
        description={payoutRefund ? `Khoản hoàn #${payoutRefund.id} · ${formatPrice(payoutRefund.amount)}` : ''}
      >
        <form onSubmit={handlePayoutDetails} className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">Kiểm tra kỹ tên chủ tài khoản và số tài khoản. Sau khi Nestify xác minh và bắt đầu chuyển tiền, thông tin này không thể thay đổi.</p>
          <label className="text-sm"><span className="text-muted-foreground">Ngân hàng</span><input value={payoutBank} onChange={(event) => setPayoutBank(event.target.value)} minLength={2} maxLength={120} required className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
          <label className="text-sm"><span className="text-muted-foreground">Tên chủ tài khoản</span><input value={payoutHolder} onChange={(event) => setPayoutHolder(event.target.value)} minLength={2} maxLength={150} required autoComplete="name" className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
          <label className="text-sm"><span className="text-muted-foreground">Số tài khoản</span><input value={payoutAccount} onChange={(event) => setPayoutAccount(event.target.value.replace(/\D/g, ''))} minLength={6} maxLength={20} inputMode="numeric" pattern="[0-9]{6,20}" required className="mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
          {payoutError && <p role="alert" className="text-sm text-destructive">{payoutError}</p>}
          <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setPayoutRefund(null)} disabled={submitRefundPayoutDetails.isPending}>Đóng</Button><Button type="submit" disabled={submitRefundPayoutDetails.isPending || payoutBank.trim().length < 2 || payoutHolder.trim().length < 2 || !/^[0-9]{6,20}$/.test(payoutAccount)}>{submitRefundPayoutDetails.isPending ? 'Đang gửi...' : 'Xác nhận tài khoản nhận hoàn'}</Button></div>
        </form>
      </BecomingModal>

      <BecomingModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Hủy đơn hàng"
        description="Bạn có chắc muốn hủy đơn hàng này? Thao tác không thể hoàn tác."
      >
        <p className="mb-4 rounded-control border border-border bg-surface-alt p-3 text-sm text-foreground">
          {willRefund
            ? 'Đơn PayOS đã thanh toán sẽ được ghi nhận hoàn tiền. Sau khi hủy, hãy cung cấp tài khoản nhận hoàn ngay trong trang chi tiết đơn hàng này.'
            : paymentMethod === 'cod'
              ? 'Đơn COD chưa thu tiền nên không có khoản hoàn tiền.'
              : 'Đơn PayOS này chưa phát sinh khoản tiền cần hoàn.'}
        </p>
        <label className="block text-sm">
          <span className="text-muted-foreground">Lý do hủy (không bắt buộc)</span>
          <span className="mt-2 flex flex-wrap gap-2">
            {CANCELLATION_REASONS.map((reason) => <button key={reason} type="button" onClick={() => setCancelReason(reason)} className="min-h-9 rounded-full border border-border px-3 text-xs text-foreground hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{reason}</button>)}
          </span>
          <textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ví dụ: đặt nhầm, đổi ý..."
            className="mt-1 w-full rounded-control border border-border bg-surface p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCancelOpen(false)}>
            Đóng
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelOrder.isPending}>
            {cancelOrder.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
          </Button>
        </div>
      </BecomingModal>
    </div>
    </div>
  )
}
