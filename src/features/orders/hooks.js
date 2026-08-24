import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ordersApi from './api'

export function useOrders(options = {}) {
  return useQuery({ queryKey: ['orders'], queryFn: ordersApi.getOrders, ...options })
}

export function useOrder(id, options = {}) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !!id,
    ...options,
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }) => ordersApi.cancelOrder(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', id] })
    },
  })
}

export function useCreateReturnRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) => ordersApi.createReturnRequest(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', String(id)] })
    },
  })
}

export function useShipReturnRequest(orderId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => ordersApi.shipReturnRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', String(orderId)] })
    },
  })
}

export function useSubmitRefundPayoutDetails(orderId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ refundId, ...payload }) => ordersApi.submitRefundPayoutDetails(refundId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', String(orderId)] })
    },
  })
}
