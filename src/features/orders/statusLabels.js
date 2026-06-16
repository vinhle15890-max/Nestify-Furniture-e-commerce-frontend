export const ORDER_STATUS_LABELS = {
  pending_payment: { label: 'Chờ thanh toán', tone: 'neutral' },
  paid: { label: 'Đã thanh toán', tone: 'sale' },
  processing: { label: 'Đang xử lý', tone: 'sale' },
  shipped: { label: 'Đang giao', tone: 'sale' },
  delivered: { label: 'Đã giao', tone: 'in-stock' },
  cancelled: { label: 'Đã hủy', tone: 'out-of-stock' },
}
