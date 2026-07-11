import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useReconcilePayment } from '../../features/checkout/hooks'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { BecomingRoomArt } from '../../components/BecomingRoomArt'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 10
const MAX_FOLLOW_UP_ATTEMPTS = MAX_POLL_ATTEMPTS - 1

const SUCCESS_STATUSES = ['paid', 'processing', 'shipped', 'delivered']

const linkClass = 'rounded-control text-foreground underline decoration-accent underline-offset-4 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function isValidOrderId(value) {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value)
}

export function CheckoutReturnPage() {
  const [searchParams] = useSearchParams()
  const requestedOrderId = searchParams.get('order_id')
  const orderId = isValidOrderId(requestedOrderId) ? requestedOrderId : null
  const queryClient = useQueryClient()
  const [followUpAttempts, setFollowUpAttempts] = useState(0)

  const { data, isLoading, isError, isFetching, refetch } = useReconcilePayment(orderId, {
    refetchInterval: false,
  })

  const status = data?.data?.status
  const paymentStatus = data?.meta?.payment_status
    ?? (SUCCESS_STATUSES.includes(status) ? 'success' : status === 'pending_payment' ? 'pending' : null)

  useEffect(() => {
    setFollowUpAttempts(0)
  }, [orderId])

  // Schedule one poll only after the preceding response has settled. This keeps the
  // retry budget deterministic and avoids mutating React state from a query option.
  useEffect(() => {
    const canPoll = orderId
      && !isLoading
      && !isError
      && !isFetching
      && status === 'pending_payment'
      && paymentStatus === 'pending'
      && followUpAttempts < MAX_FOLLOW_UP_ATTEMPTS

    if (!canPoll) return undefined

    const timer = window.setTimeout(() => {
      setFollowUpAttempts((current) => current + 1)
      refetch()
    }, POLL_INTERVAL_MS)

    return () => window.clearTimeout(timer)
  }, [followUpAttempts, isError, isFetching, isLoading, orderId, paymentStatus, refetch, status])

  // Once the order leaves pending_payment, refresh the app's order views.
  useEffect(() => {
    if (orderId && status && status !== 'pending_payment') {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
  }, [orderId, status, queryClient])

  function retryReconciliation() {
    setFollowUpAttempts(0)
    refetch()
  }

  if (!requestedOrderId) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto max-w-md px-6 py-20">
          <h1 className="text-center font-display text-[clamp(1.8rem,3.5vw,2.6rem)] text-foreground">
            Xác nhận thanh toán
          </h1>
          <div className="mt-8 rounded-card border border-border bg-surface p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Không tìm thấy đơn hàng.{' '}
              <Link to="/orders" className={linkClass}>Xem đơn hàng của tôi</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!orderId) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto max-w-md px-6 py-20">
          <h1 className="text-center font-display text-[clamp(1.8rem,3.5vw,2.6rem)] text-foreground">
            Xác nhận thanh toán
          </h1>
          <div role="alert" className="mt-8 rounded-card border border-border bg-surface p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Mã đơn hàng không hợp lệ. Chúng tôi chưa gửi yêu cầu xác minh nào.{' '}
              <Link to="/orders" className={linkClass}>Xem đơn hàng của tôi</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const timedOut = status === 'pending_payment'
    && paymentStatus === 'pending'
    && followUpAttempts >= MAX_FOLLOW_UP_ATTEMPTS
    && !isFetching
  const succeeded = status && SUCCESS_STATUSES.includes(status)

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-center font-display text-[clamp(1.8rem,3.5vw,2.6rem)] text-foreground">
          Xác nhận thanh toán
        </h1>
        <div className="mt-8 rounded-card border border-border bg-surface p-10 text-center">
          {isError ? (
            <LoadErrorState
              compact
              title="Chưa thể xác minh thanh toán"
              description="Chúng tôi chưa xác định kết quả thanh toán. Đơn hàng không bị tạo lại; bạn có thể thử xác minh an toàn."
              onRetry={retryReconciliation}
              isRetrying={isFetching}
            />
          ) : isLoading ? (
            <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
              <Spinner />
              <span>Đang xác nhận thanh toán...</span>
            </div>
          ) : status === 'cancelled' ? (
            <>
              <XCircle size={40} aria-hidden="true" className="mx-auto text-destructive" />
              <p className="mt-4 text-sm text-muted-foreground">
                Đơn hàng đã bị hủy.{' '}
                <Link to="/orders" className={linkClass}>Xem đơn hàng của tôi</Link>
              </p>
            </>
          ) : succeeded ? (
            <>
              <div className="pointer-events-none mx-auto -mt-2 mb-3 w-full max-w-[260px]">
                <BecomingRoomArt level={3} />
              </div>
              <CheckCircle2 size={40} aria-hidden="true" className="mx-auto text-confirmed" />
              <p className="mt-4 font-display text-lg text-foreground">Thanh toán thành công!</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Căn phòng bạn hình dung giờ đã trên đường thành hiện thực.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Đơn hàng của bạn đang được xử lý.{' '}
                <Link to={`/orders/${orderId}`} className={linkClass}>Xem chi tiết đơn hàng</Link>
              </p>
            </>
          ) : paymentStatus === 'failed' ? (
            <>
              <XCircle size={40} aria-hidden="true" className="mx-auto text-destructive" />
              <p className="mt-4 font-medium text-foreground">Thanh toán chưa hoàn tất.</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Đơn hàng vẫn được giữ theo trạng thái hiện tại. Mở chi tiết đơn hàng để thử thanh toán lại hoặc chọn bước tiếp theo.
              </p>
              <Link to={`/orders/${orderId}`} className={`${linkClass} mt-4 inline-block`}>
                Xem chi tiết đơn hàng
              </Link>
            </>
          ) : timedOut ? (
            <>
              <Clock size={40} aria-hidden="true" className="mx-auto text-border-strong" />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Chúng tôi vẫn đang xác nhận thanh toán của bạn. Chưa có kết luận thất bại và đơn hàng không bị tạo lại.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <Button type="button" onClick={retryReconciliation} disabled={isFetching}>
                  {isFetching ? 'Đang xác minh...' : 'Xác minh lại'}
                </Button>
                <Link to={`/orders/${orderId}`} className={`${linkClass} inline-flex items-center justify-center px-3 py-2`}>
                  Xem chi tiết đơn hàng
                </Link>
              </div>
            </>
          ) : status === 'pending_payment' ? (
            <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
              <Spinner />
              <span>Đang xác nhận thanh toán...</span>
            </div>
          ) : (
            <>
              <Clock size={40} aria-hidden="true" className="mx-auto text-border-strong" />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Chưa thể kết luận trạng thái thanh toán. Bạn có thể xác minh lại hoặc mở đơn hàng để kiểm tra.
              </p>
              <Button type="button" onClick={retryReconciliation} disabled={isFetching} className="mt-5">
                {isFetching ? 'Đang xác minh...' : 'Xác minh lại'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
