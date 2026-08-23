import { apiClient } from '../../../lib/apiClient'

export function getOrders({ page, status, paymentMethod, paymentStatus, returnStatus } = {}) {
  const params = { page }
  if (status) params.status = status
  if (paymentMethod) params.payment_method = paymentMethod
  if (paymentStatus) params.payment_status = paymentStatus
  if (returnStatus) params.return_status = returnStatus

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

export function reviewReturnRequest(id, payload) {
  return apiClient.patch(`/admin/return-requests/${id}`, payload)
}

export function receiveReturnRequest(id, payload) {
  return apiClient.patch(`/admin/return-requests/${id}/receive`, payload)
}

export function refundReturnRequest(id, payload) {
  return apiClient.post(`/admin/return-requests/${id}/refund`, payload)
}

export function completeReturnRequest(id, payload) {
  return apiClient.post(`/admin/return-requests/${id}/complete`, payload)
}
