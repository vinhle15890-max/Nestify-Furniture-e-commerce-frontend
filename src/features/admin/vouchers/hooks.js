import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOffsetQuery } from '../../../lib/pagination'
import * as vouchersApi from './api'

export function useAdminVouchers(page) {
  return useOffsetQuery({
    queryKey: ['admin', 'vouchers'],
    queryFn: vouchersApi.getVouchers,
    page,
  })
}

export function useCreateVoucher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => vouchersApi.createVoucher(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] }),
  })
}

export function useUpdateVoucher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) => vouchersApi.updateVoucher(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] }),
  })
}

export function useDeleteVoucher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => vouchersApi.deleteVoucher(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] }),
  })
}

export const useAssignableVouchers = (enabled = true) => useQuery({
  queryKey: ['admin', 'vouchers', 'assignable'],
  queryFn: vouchersApi.getAssignableVouchers,
  enabled,
})

export function useGrantVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ voucherId, userId }) => vouchersApi.grantVoucher(voucherId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] }),
  })
}
