/* Hallmark · pre-emit critique: P5 H5 E4 S5 R4 V5 · asymmetric return ledger · contrast: pass */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react'
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

function ReturnShell({ children }) {
  return (
    <main className="min-h-screen overflow-x-clip bg-canvas px-5 py-10 text-ink sm:px-8 sm:py-16">
      <div className="mx-auto w-full max-w-5xl min-w-0">
        <p className="text-sm text-muted-foreground">Nestify · Đối chiếu thanh toán</p>
        {children}
      </div>
    </main>
  )
}

function InvalidReturn({ invalid = false }) {
  return (
    <ReturnShell>
      <div className="mt-7 grid gap-8 border-y-2 border-foreground/25 py-8 md:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)] md:items-end">
        <h1 className="min-w-0 font-display text-[clamp(2rem,5vw,4rem)] leading-[1.08] text-foreground [overflow-wrap:anywhere]">
          Chưa có đơn hàng để đối chiếu.
        </h1>
        <div role={invalid ? 'alert' : undefined} className="text-sm leading-relaxed text-muted-foreground">
          <p>{invalid ? 'Mã đơn hàng không hợp lệ. Chúng tôi chưa gửi yêu cầu xác minh nào.' : 'Không tìm thấy đơn hàng trong đường dẫn trở về.'}</p>
          <Link to="/orders" className={`${linkClass} mt-5 inline-flex min-h-11 items-center gap-2 whitespace-nowrap`}>
            Xem đơn hàng của tôi <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </ReturnShell>
  )
}

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
    return <InvalidReturn />
  }

  if (!orderId) {
    return <InvalidReturn invalid />
  }

  const timedOut = status === 'pending_payment'
    && paymentStatus === 'pending'
    && followUpAttempts >= MAX_FOLLOW_UP_ATTEMPTS
    && !isFetching
  const succeeded = status && SUCCESS_STATUSES.includes(status)

  const orderLabel = data?.data?.order_number || `#${orderId}`

  return (
    <ReturnShell>
      <header className="mt-5 grid min-w-0 gap-6 border-b-2 border-foreground pb-7 md:grid-cols-[minmax(0,1.45fr)_minmax(14rem,0.55fr)] md:items-end">
        <h1 className="min-w-0 font-display text-[clamp(2.25rem,6vw,5rem)] leading-[1.04] text-foreground [overflow-wrap:anywhere]">
          Kết quả cho căn phòng đang thành hình.
        </h1>
        <div className="border-l-2 border-foreground/30 pl-4 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Đơn hàng {orderLabel}</p>
          <p className="mt-1">Nestify đang đọc trạng thái từ hệ thống thanh toán; trang này không tạo thêm đơn.</p>
        </div>
      </header>

      <section aria-live="polite" aria-busy={isLoading || isFetching || undefined} className="grid min-w-0 gap-8 py-8 md:grid-cols-[minmax(15rem,0.65fr)_minmax(0,1.35fr)] md:py-12">
        <div className="border-t border-border pt-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck aria-hidden="true" size={17} /> Đối chiếu an toàn với PayOS
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Bạn có thể đóng trang này và xem lại đơn bất cứ lúc nào. Trạng thái Order mới là kết luận được Nestify sử dụng.
          </p>
        </div>

        <div className="min-w-0 border-y-2 border-foreground/25 py-8 sm:py-10">
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
              <XCircle size={36} aria-hidden="true" className="text-destructive" />
              <h2 className="mt-4 font-display text-2xl text-foreground">Đơn hàng đã bị hủy.</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Không có bước thanh toán nào cần tiếp tục.{' '}
                <Link to="/orders" className={linkClass}>Xem đơn hàng của tôi</Link>
              </p>
            </>
          ) : succeeded ? (
            <>
              <div className="pointer-events-none -mt-4 mb-4 w-full max-w-[280px]">
                <BecomingRoomArt level={3} />
              </div>
              <CheckCircle2 size={36} aria-hidden="true" className="text-confirmed" />
              <h2 className="mt-4 font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-foreground">Thanh toán thành công.</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Căn phòng bạn hình dung giờ đã trên đường thành hiện thực.
              </p>
              <Link to={`/orders/${orderId}`} className={`${linkClass} mt-6 inline-flex min-h-11 items-center gap-2 whitespace-nowrap`}>
                Xem chi tiết đơn hàng <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </>
          ) : paymentStatus === 'failed' ? (
            <>
              <XCircle size={36} aria-hidden="true" className="text-destructive" />
              <h2 className="mt-4 font-display text-2xl text-foreground">Thanh toán chưa hoàn tất.</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Đơn hàng vẫn được giữ theo trạng thái hiện tại. Mở chi tiết đơn hàng để thử thanh toán lại hoặc chọn bước tiếp theo.
              </p>
              <Link to={`/orders/${orderId}`} className={`${linkClass} mt-4 inline-block`}>
                Xem chi tiết đơn hàng
              </Link>
            </>
          ) : timedOut ? (
            <>
              <Clock size={36} aria-hidden="true" className="text-border-strong" />
              <h2 className="mt-4 font-display text-2xl text-foreground">Kết quả cần thêm thời gian.</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Chúng tôi vẫn đang xác nhận thanh toán của bạn. Chưa có kết luận thất bại và đơn hàng không bị tạo lại.
              </p>
              <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row">
                <Button type="button" onClick={retryReconciliation} disabled={isFetching}>
                  {isFetching ? 'Đang xác minh...' : 'Xác minh lại'}
                </Button>
                <Link to={`/orders/${orderId}`} className={`${linkClass} inline-flex items-center justify-center px-3 py-2`}>
                  Xem chi tiết đơn hàng
                </Link>
              </div>
            </>
          ) : status === 'pending_payment' ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Spinner />
              <span>Đang xác nhận thanh toán...</span>
            </div>
          ) : (
            <>
              <Clock size={36} aria-hidden="true" className="text-border-strong" />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Chưa thể kết luận trạng thái thanh toán. Bạn có thể xác minh lại hoặc mở đơn hàng để kiểm tra.
              </p>
              <Button type="button" onClick={retryReconciliation} disabled={isFetching} className="mt-5">
                {isFetching ? 'Đang xác minh...' : 'Xác minh lại'}
              </Button>
            </>
          )}
        </div>
      </section>
    </ReturnShell>
  )
}
