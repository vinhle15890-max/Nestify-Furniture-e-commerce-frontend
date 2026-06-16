import { useMutation, useQueryClient } from '@tanstack/react-query'
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
    mutationFn: ({ orderId, gateway, returnUrl }) =>
      checkoutApi.createPaymentSession(orderId, { gateway, return_url: returnUrl }),
  })
}
