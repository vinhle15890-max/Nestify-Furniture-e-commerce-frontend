function payoutAction(order) {
  const refund = (order.refunds ?? []).find((item) => {
    if (!['requested', 'failed'].includes(item.status)) return false
    return !item.payout_destination || item.payout_destination.status === 'correction_required'
  })

  if (!refund) return null

  return {
    kind: 'payout',
    label: refund.payout_destination ? 'Cập nhật tài khoản nhận hoàn' : 'Cung cấp tài khoản nhận hoàn',
    refund,
  }
}

export function customerOrderNextAction(order) {
  const payout = payoutAction(order)
  if (payout) return payout

  if (order.return_request?.status === 'approved') {
    return { kind: 'return_shipment', label: 'Gửi thông tin trả hàng', hash: '#return-request' }
  }

  const pendingPayos = (order.payment_method ?? 'payos') === 'payos' && (
    order.payment?.status === 'pending'
    || (!order.payment && order.status === 'pending_payment')
  )
  if (pendingPayos) return { kind: 'payment', label: 'Thử thanh toán lại', hash: '#payment' }

  if (order.status === 'shipped') return { kind: 'shipment', label: 'Xem vận chuyển', hash: '#shipment' }

  return { kind: 'detail', label: 'Mở chi tiết', hash: '' }
}
