import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useOrder } from '../../features/orders/hooks'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Spinner'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 10

const SUCCESS_STATUSES = ['paid', 'processing', 'shipped', 'delivered']

export function CheckoutReturnPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')

  const [attempts, setAttempts] = useState(0)
  const [timedOut, setTimedOut] = useState(false)

  const { data, isLoading } = useOrder(orderId, {
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

  if (!orderId) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl text-foreground">Xác nhận thanh toán</h1>
        <Card className="mt-6">
          <p className="text-sm text-muted-foreground">
            Không tìm thấy đơn hàng.{' '}
            <Link to="/orders" className="text-primary hover:underline">
              Xem đơn hàng của tôi
            </Link>
          </p>
        </Card>
      </div>
    )
  }

  const status = data?.data?.status

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Xác nhận thanh toán</h1>
      <Card className="mt-6">
        {isLoading || (status === 'pending_payment' && !timedOut) ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Đang xác nhận thanh toán...</span>
          </div>
        ) : status === 'cancelled' ? (
          <p className="text-sm text-muted-foreground">
            Đơn hàng đã bị hủy.{' '}
            <Link to="/orders" className="text-primary hover:underline">
              Xem đơn hàng của tôi
            </Link>
          </p>
        ) : status && SUCCESS_STATUSES.includes(status) ? (
          <p className="text-sm text-muted-foreground">
            Thanh toán thành công! Đơn hàng của bạn đang được xử lý.{' '}
            <Link to={`/orders/${orderId}`} className="text-primary hover:underline">
              Xem chi tiết đơn hàng
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Chúng tôi vẫn đang xác nhận thanh toán của bạn. Vui lòng kiểm tra lại sau.{' '}
            <Link to={`/orders/${orderId}`} className="text-primary hover:underline">
              Xem chi tiết đơn hàng
            </Link>
          </p>
        )}
      </Card>
    </div>
  )
}
