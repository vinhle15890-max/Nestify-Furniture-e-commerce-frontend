import { apiClient } from '../../../lib/apiClient'

export function getOrders({ page, status } = {}) {
  const params = { page }
  if (status) params.status = status

  return apiClient.get('/admin/orders', { params })
}

export function updateOrderStatus(id, status) {
  return apiClient.patch(`/admin/orders/${id}/status`, { status })
}

export function refundOrder(id, payload) {
  return apiClient.post(`/admin/orders/${id}/refund`, payload)
}
