import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import * as cartApi from './api'

export function useCart() {
  const token = useAuthStore((state) => state.token)

  return useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
    enabled: !!token,
  })
}

export function useAddCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => cartApi.addItem(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, quantity }) => cartApi.updateItem(itemId, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId) => cartApi.removeItem(itemId),
    onSuccess: (response) => {
      if (response?.data) queryClient.setQueryData(['cart'], response)
    },
  })
}

export function useRestoreCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (token) => cartApi.restoreRemovedItem(token),
    onSuccess: (response) => queryClient.setQueryData(['cart'], response),
  })
}

export function useApplyVoucher() {
  return useMutation({
    mutationFn: (code) => cartApi.applyVoucher(code),
  })
}

export function useAvailableVouchers(enabled = true) {
  return useQuery({
    queryKey: ['cart', 'available-vouchers'],
    queryFn: cartApi.getAvailableVouchers,
    enabled,
  })
}
