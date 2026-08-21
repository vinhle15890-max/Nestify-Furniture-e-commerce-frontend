export const ORDER_STATUS_LABELS = {
  pending_confirmation: { label: 'Chờ xác nhận', tone: 'neutral' },
  pending_payment: { label: 'Chờ thanh toán', tone: 'neutral' },
  paid: { label: 'Đã thanh toán', tone: 'sale' },
  processing: { label: 'Đang xử lý', tone: 'sale' },
  shipped: { label: 'Đang giao', tone: 'sale' },
  delivered: { label: 'Đã giao', tone: 'in-stock' },
  delivery_failed: { label: 'Giao không thành công', tone: 'out-of-stock' },
  returned_to_store: { label: 'Hàng đã về cửa hàng', tone: 'neutral' },
  cancelled: { label: 'Đã hủy', tone: 'out-of-stock' },
}
