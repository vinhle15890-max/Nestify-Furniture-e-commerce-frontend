import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { Spinner } from '../../../components/Spinner'
import { formatDate, formatPrice } from '../../../lib/format'
import * as paymentExceptionsApi from '../../../features/admin/paymentExceptions/api'

export function AdminPaymentExceptionsPage() {
  const queryClient = useQueryClient()
  const [operationKeys, setOperationKeys] = useState({})
  const [resolvedExceptionIds, setResolvedExceptionIds] = useState(() => new Set())
  const query = useQuery({ queryKey: ['admin', 'payment-exceptions'], queryFn: () => paymentExceptionsApi.getPaymentExceptions() })
  const resolve = useMutation({
    mutationFn: ({ id, key }) => paymentExceptionsApi.resolveByRefund(id, 'Hoàn toàn bộ khoản thanh toán đến sau khi hủy', key),
    onSuccess: (_response, variables) => {
      setResolvedExceptionIds((current) => new Set(current).add(variables.id))
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-exceptions'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })

  if (query.isLoading) return <Spinner label="Đang tải ngoại lệ thanh toán" />
  if (query.isError) return <p role="alert" className="text-sm text-destructive">{query.error.message}</p>
  const items = query.data?.data ?? []

  const requestRefund = (id) => {
    const key = operationKeys[id] ?? crypto.randomUUID()
    setOperationKeys((current) => ({ ...current, [id]: key }))
    resolve.mutate({ id, key })
  }

  return <div className="flex flex-col gap-6">
    <div><h2 className="font-display text-2xl text-foreground">Ngoại lệ thanh toán</h2><p className="mt-1 text-sm text-muted-foreground">Tiền PayOS đã được xác minh nhưng trạng thái giao hàng không thể tự động khôi phục.</p></div>
    {items.length === 0 ? <Card><p className="text-sm text-muted-foreground">Không có ngoại lệ cần xử lý.</p></Card> : items.map((item) => <Card key={item.id} className="flex flex-col gap-3 border-destructive/30">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><Link className="font-medium text-foreground hover:text-accent" to={`/admin/orders/${item.order.id}`}>{item.order.order_number}</Link><p className="text-sm text-muted-foreground">{item.order.customer?.name} · {item.order.customer?.email}</p></div><strong>{formatPrice(item.amount)}</strong></div>
      <p className="text-sm text-foreground">{item.reason}</p>
      <p className="text-sm font-medium text-foreground">{formatDate(item.created_at)} · {item.status === 'refund_pending' ? 'Chờ chuyển tiền hoàn' : 'Chưa xử lý'}</p>
      <details className="group border-t border-border pt-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Chi tiết đối soát</summary>
        <dl className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4">
          <dt>Mã đơn PayOS</dt><dd className="break-all text-foreground">{item.gateway_order_code || '—'}</dd>
          <dt>ID liên kết thanh toán</dt><dd className="break-all text-foreground">{item.gateway_payment_link_id || '—'}</dd>
          <dt>Mã tham chiếu giao dịch</dt><dd className="break-all text-foreground">{item.gateway_transaction_reference || '—'}</dd>
        </dl>
      </details>
      {resolvedExceptionIds.has(item.id) ? (
        <div><Link className="font-medium text-foreground underline underline-offset-4 hover:text-accent" to={`/admin/orders/${item.order.id}#refunds`}>Mở khoản hoàn tiền</Link></div>
      ) : item.status === 'open' ? (
        <div><Button onClick={() => requestRefund(item.id)} disabled={resolve.isPending}>Tạo nghĩa vụ hoàn tiền</Button></div>
      ) : null}
    </Card>)}
  </div>
}
