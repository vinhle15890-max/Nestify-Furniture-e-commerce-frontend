import { apiClient } from '../../lib/apiClient'

export function createOrder(payload, idempotencyKey) {
  return apiClient.post('/orders', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

export function createPaymentSession(orderId, { gateway, return_url }) {
  return apiClient.post(`/orders/${orderId}/payment-session`, { gateway, return_url })
}
