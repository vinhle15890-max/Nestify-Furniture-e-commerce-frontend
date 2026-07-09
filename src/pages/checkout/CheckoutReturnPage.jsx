import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useReconcilePayment } from '../../features/checkout/hooks'
import { Spinner } from '../../components/Spinner'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 10

const SUCCESS_STATUSES = ['paid', 'processing', 'shipped', 'delivered']

const linkClass = 'text-foreground underline decoration-accent underline-offset-4 hover:text-accent'

export function CheckoutReturnPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')
  const queryClient = useQueryClient()

  const [attempts, setAttempts] = useState(0)
  const [timedOut, setTimedOut] = useState(false)

  // Each poll asks the backend to reconcile against the gateway (authoritative), rather
  // than passively waiting for the async webhook — so a delayed/missing webhook can't
  // strand a paid order on "chờ thanh toán". reconcile is idempotent, so repeating is safe.
  const { data, isLoading } = useReconcilePayment(orderId, {
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      if (status && status !== 'pending_payment') return false
      if (attempts >= MAX_POLL_ATTEMPTS - 1) {
        setTimedOut(true)
        return false
      }
      setAttempts((current) => current + 1)
      return POLL_INTERVAL_MS
    },
  })

  const settledStatus = data?.data?.status
  // Once the order leaves pending_payment, refresh the app's order views (list + detail).
  useEffect(() => {
    if (orderId && settledStatus && settledStatus !== 'pending_payment') {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
  }, [orderId, settledStatus, queryClient])

  if (!orderId) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-center font-display text-[clamp(1.8rem,3.5vw,2.6rem)] text-foreground">
          Xác nhận thanh toán
        </h1>
        <div className="mt-8 rounded-card border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Không tìm thấy đơn hàng.{' '}
            <Link to="/orders" className={linkClass}>
              Xem đơn hàng của tôi
            </Link>
          </p>
        </div>
      </div>
      </div>
    )
  }

  const status = data?.data?.status
  const pending = isLoading || (status === 'pending_payment' && !timedOut)
  const succeeded = status && SUCCESS_STATUSES.includes(status)

  return (
    <div className="min-h-screen bg-canvas text-ink">
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-center font-display text-[clamp(1.8rem,3.5vw,2.6rem)] text-foreground">
        Xác nhận thanh toán
      </h1>
      <div className="mt-8 rounded-card border border-border bg-surface p-10 text-center">
        {pending ? (
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <Spinner />
            <span>Đang xác nhận thanh toán...</span>
          </div>
        ) : status === 'cancelled' ? (
          <>
            <XCircle size={40} className="mx-auto text-destructive" />
            <p className="mt-4 text-sm text-muted-foreground">
              Đơn hàng đã bị hủy.{' '}
              <Link to="/orders" className={linkClass}>
                Xem đơn hàng của tôi
              </Link>
            </p>
          </>
        ) : succeeded ? (
          <>
            {/* The single `confirmed` (#3D5A45) in the whole system — the one moment
                a purchase is truly complete (State 4 Committed, Component Bible). */}
            <CheckCircle2 size={40} className="mx-auto text-confirmed" />
            <p className="mt-4 font-display text-lg text-foreground">Thanh toán thành công!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Đơn hàng của bạn đang được xử lý.{' '}
              <Link to={`/orders/${orderId}`} className={linkClass}>
                Xem chi tiết đơn hàng
              </Link>
            </p>
          </>
        ) : (
          <>
            <Clock size={40} className="mx-auto text-border-strong" />
            <p className="mt-4 text-sm text-muted-foreground">
              Chúng tôi vẫn đang xác nhận thanh toán của bạn. Vui lòng kiểm tra lại sau.{' '}
              <Link to={`/orders/${orderId}`} className={linkClass}>
                Xem chi tiết đơn hàng
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
    </div>
  )
}
