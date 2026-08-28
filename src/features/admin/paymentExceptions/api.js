import { apiClient } from '../../../lib/apiClient'

export function getPaymentExceptions(status = '') {
  return apiClient.get('/admin/payment-exceptions', { params: status ? { status } : {} })
}

export function resolveByRefund(id, note, idempotencyKey) {
  return apiClient.post(`/admin/payment-exceptions/${id}/resolve-refund`, note ? { note } : {}, { headers: { 'Idempotency-Key': idempotencyKey } })
}
