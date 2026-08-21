import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ordersApi from './api'

export const adminOrderKeys = {
  all: ['admin', 'orders'],
  detail: (id) => ['admin', 'orders', 'detail', id],
}

export function useAdminOrders(page, status) {
  return useQuery({
    queryKey: ['admin', 'orders', { page, status }],
    queryFn: () => ordersApi.getOrders({ page, status }),
    placeholderData: (previousData) => previousData,
  })
}

export function useAdminOrder(id, { initialData } = {}) {
  const validId = Number.isInteger(id) && id > 0

  return useQuery({
    queryKey: adminOrderKeys.detail(id),
    queryFn: () => ordersApi.getOrder(id),
    enabled: validId,
    initialData: initialData ? { data: initialData } : undefined,
    initialDataUpdatedAt: 0,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status, ...metadata }) => Object.keys(metadata).length
      ? ordersApi.updateOrderStatus(id, status, metadata)
      : ordersApi.updateOrderStatus(id, status),
    onSuccess: (response, { id }) => {
      queryClient.setQueryData(adminOrderKeys.detail(id), (current) => {
        if (!current) return response
        return {
          ...current,
          data: { ...current.data, ...response.data },
        }
      })
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all })
    },
  })
}

export function useRefundOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) => ordersApi.refundOrder(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminOrderKeys.all }),
  })
}

export function useCompleteManualRefund() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) => ordersApi.completeManualRefund(id, payload),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useCollectCod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => ordersApi.collectCod(id, payload),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}
