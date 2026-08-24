import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ordersApi from './api'

export const adminOrderKeys = {
  all: ['admin', 'orders'],
  detail: (id) => ['admin', 'orders', 'detail', id],
}

export function useAdminOrders(page, status, paymentMethod, paymentStatus, returnStatus, { statusGroup = '', paymentQueue = '', hasReturn = false } = {}) {
  return useQuery({
    queryKey: ['admin', 'orders', { page, status, statusGroup, paymentMethod, paymentStatus, paymentQueue, returnStatus, hasReturn }],
    queryFn: () => ordersApi.getOrders({ page, status, statusGroup, paymentMethod, paymentStatus, paymentQueue, returnStatus, hasReturn }),
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
    mutationFn: ({ id, idempotencyKey, ...payload }) => ordersApi.refundOrder(id, payload, idempotencyKey),
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

export function useRefundWorkflow(orderId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ refundId, action, payload = {} }) => {
      if (action === 'processing') return ordersApi.startRefund(refundId)
      if (action === 'succeeded') return ordersApi.completeRefund(refundId, payload)
      if (action === 'failed') return ordersApi.failRefund(refundId, payload)
      if (action === 'needs_review') return ordersApi.markRefundNeedsReview(refundId, payload)
      throw new Error('Thao tác hoàn tiền không hợp lệ.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(orderId) })
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useRefundPayoutDetails(orderId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ refundId, action, reason }) => action === 'verify'
      ? ordersApi.verifyRefundPayoutDetails(refundId)
      : ordersApi.requestRefundPayoutCorrection(refundId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(orderId) })
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

export function useReviewReturnRequest(orderId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => ordersApi.reviewReturnRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(orderId) })
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all })
    },
  })
}

export function useReceiveReturnRequest(orderId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => ordersApi.receiveReturnRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(orderId) })
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

function useReturnMoneyMutation(orderId, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(orderId) })
      queryClient.invalidateQueries({ queryKey: adminOrderKeys.all })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useRefundReturnRequest(orderId) {
  return useReturnMoneyMutation(orderId, ({ id, idempotencyKey, ...payload }) => ordersApi.refundReturnRequest(id, payload, idempotencyKey))
}

export function useCompleteReturnRequest(orderId) {
  return useReturnMoneyMutation(orderId, ({ id, ...payload }) => ordersApi.completeReturnRequest(id, payload))
}
