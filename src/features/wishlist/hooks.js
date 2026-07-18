import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as wishlistApi from './api'

export function useWishlist(options = {}) {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistApi.getWishlist,
    ...options,
  })
}

export function useAddWishlistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => wishlistApi.addItem(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  })
}

export function useRemoveWishlistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId) => wishlistApi.removeItem(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  })
}

export function useUpdateWishlistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, notify_on_restock }) => wishlistApi.updateItem(itemId, { notify_on_restock }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  })
}

export function useMoveToCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId) => wishlistApi.moveToCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
