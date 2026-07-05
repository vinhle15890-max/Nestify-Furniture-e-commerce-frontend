import { apiClient } from '../../lib/apiClient'

export function getOrders() {
  return apiClient.get('/orders')
}

export function getOrder(id) {
  return apiClient.get(`/orders/${id}`)
}

export function cancelOrder(id, reason) {
  return apiClient.post(`/orders/${id}/cancel`, { reason })
}
