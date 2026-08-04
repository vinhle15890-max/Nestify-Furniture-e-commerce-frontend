import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCheckoutIdempotencyKey } from '../../lib/idempotency'
import * as checkoutApi from './api'

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => checkoutApi.createOrder(payload, getCheckoutIdempotencyKey()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

export function useCreatePaymentSession() {
  return useMutation({
    mutationFn: ({ orderId, gateway }) => checkoutApi.createPaymentSession(orderId, { gateway }),
  })
}

// Polls the backend's reconcile endpoint, which authoritatively confirms the payment
// with the gateway. Used by the return page so a delayed/missing webhook doesn't leave
// a paid order stuck on "chờ thanh toán". Returns the order in the usual { data } shape.
export function useReconcilePayment(orderId, options = {}) {
  return useQuery({
    queryKey: ['payment-reconcile', orderId],
    queryFn: () => checkoutApi.reconcilePayment(orderId),
    enabled: !!orderId,
    refetchOnWindowFocus: false,
    gcTime: 0,
    ...options,
  })
}
