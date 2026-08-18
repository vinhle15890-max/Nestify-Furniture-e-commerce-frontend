import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useOrder, useCancelOrder } from '../../features/orders/hooks'
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

// Orders can be cancelled by their owner any time before they ship.
const CANCELLABLE_STATUSES = ['pending_payment', 'paid', 'processing']

const sectionClass = 'rounded-card border border-border bg-surface p-6'

export function OrderDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { data, error, isLoading, isError, isFetching, refetch } = useOrder(id)
  const cancelOrder = useCancelOrder()
  const createPaymentSession = useCreatePaymentSession()
  const addToast = useToastStore((state) => state.addToast)
  const gateway = 'payos' // PayOS is the only payment gateway
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

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
  const isPendingPayment = order.status === 'pending_payment'
  const isFullyDiscounted = Number(order.total) === 0
  const canCancel = CANCELLABLE_STATUSES.includes(order.status)
  // A cancelled order refunds money only when an online payment was captured.
  const willRefund = !isFullyDiscounted && (order.status === 'paid' || (order.status === 'processing' && order.payment_method === 'payos'))
  const address = order.shipping_address

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
                  {snapshot.product_slug ? (
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
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Hủy đơn hàng"
        description="Bạn có chắc muốn hủy đơn hàng này? Thao tác không thể hoàn tác."
      >
        {willRefund && (
          <p className="mb-4 rounded-control border border-border bg-surface-alt p-3 text-sm text-foreground">
            Đơn đã thanh toán sẽ được hoàn tiền; bộ phận CSKH sẽ liên hệ xử lý hoàn tiền cho bạn.
          </p>
        )}
        <label className="block text-sm">
          <span className="text-muted-foreground">Lý do hủy (không bắt buộc)</span>
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
