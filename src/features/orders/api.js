import { apiClient } from '../../lib/apiClient'

export function getOrders(page = 1) {
  return apiClient.get('/orders', { params: { page } })
}

export function getOrder(id) {
  return apiClient.get(`/orders/${id}`)
}

export function cancelOrder(id, reason) {
  return apiClient.post(`/orders/${id}/cancel`, { reason })
}

export function createReturnRequest(id, payload) {
  return apiClient.post(`/orders/${id}/return-request`, payload)
}

export function shipReturnRequest(id, payload) {
  return apiClient.patch(`/return-requests/${id}/ship`, payload)
}

export function submitRefundPayoutDetails(refundId, payload) {
  return apiClient.put(`/refunds/${refundId}/payout-details`, payload)
}
