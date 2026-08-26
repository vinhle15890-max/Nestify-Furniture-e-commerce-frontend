export function adminPaymentLabel(order) {
  const isCod = order.payment_method === 'cod'
  const method = isCod ? 'COD' : 'PayOS'
  const status = order.payment?.status

  if (order.status === 'cancelled' && status === 'pending') {
    const terminalReason = order.payment?.terminal_reason
    const confirmedTerminal = ['reservation_expired', 'order_cancelled'].includes(terminalReason)
    return confirmedTerminal
      ? `${method} · Đã hủy, chưa thu tiền`
      : `${method} · Đơn cũ cần đối soát`
  }

  const label = {
    pending: isCod ? 'Chưa thu tiền' : 'Chờ khách thanh toán',
    paid: isCod ? 'Đã thu tiền' : 'Đã thanh toán',
    success: isCod ? 'Đã thu tiền' : 'Đã thanh toán',
    failed: isCod ? 'Không thu được tiền' : 'Thanh toán thất bại / hết hạn',
    waived: 'Không cần thanh toán',
    refunded: 'Đã chuyển hoàn',
    partially_refunded: 'Đã chuyển hoàn một phần',
  }[status] ?? 'Trạng thái chưa rõ'

  return `${method} · ${label}`
}
