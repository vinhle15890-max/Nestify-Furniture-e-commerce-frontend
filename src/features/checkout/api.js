import { apiClient } from '../../lib/apiClient'

export function createOrder(payload, idempotencyKey) {
  return apiClient.post('/orders', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

export function createPaymentSession(orderId, { gateway }) {
  return apiClient.post(`/orders/${orderId}/payment-session`, { gateway })
}

// Ask the backend to confirm payment synchronously by querying the gateway — the
// fallback for a delayed/undelivered webhook. Idempotent; returns the fresh order.
export function reconcilePayment(orderId) {
  return apiClient.post(`/orders/${orderId}/payment/reconcile`)
}
