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

export function createReturnRequest(id, reason) {
  return apiClient.post(`/orders/${id}/return-request`, { reason })
}

export function shipReturnRequest(id, payload) {
  return apiClient.patch(`/return-requests/${id}/ship`, payload)
}
