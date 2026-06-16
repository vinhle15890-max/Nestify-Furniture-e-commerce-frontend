import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as reviewsApi from './api'

export function useCreateReview() {
  return useMutation({
    mutationFn: ({ productId, ...payload }) => reviewsApi.createReview(productId, payload),
  })
}

export function useCreateComment(productSlug) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reviewId, body }) => reviewsApi.createComment(reviewId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productSlug, 'reviews'] }),
  })
}
