import { apiClient } from '../../../lib/apiClient'

export function getOrders({ page, status, paymentMethod, paymentStatus } = {}) {
  const params = { page }
  if (status) params.status = status
  if (paymentMethod) params.payment_method = paymentMethod
  if (paymentStatus) params.payment_status = paymentStatus

  return apiClient.get('/admin/orders', { params })
}

export function getOrder(id) {
  return apiClient.get(`/admin/orders/${id}`)
}

export function updateOrderStatus(id, status, metadata = {}) {
  return apiClient.patch(`/admin/orders/${id}/status`, { status, ...metadata })
}

export function refundOrder(id, payload) {
  return apiClient.post(`/admin/orders/${id}/refund`, payload)
}

export function completeManualRefund(id, payload) {
  return apiClient.post(`/admin/orders/${id}/refund/complete`, payload)
}

export function collectCod(id, payload) {
  return apiClient.post(`/admin/orders/${id}/collect-cod`, payload)
}
