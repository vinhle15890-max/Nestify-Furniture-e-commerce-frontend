import { useMutation, useQuery } from '@tanstack/react-query'
import * as reviewsApi from './api'

export function useCreateReview() {
  return useMutation({
    mutationFn: ({ productId, ...payload }) => reviewsApi.createReview(productId, payload),
  })
}

export function useReviewEligibility(productId, options = {}) {
  return useQuery({
    queryKey: ['products', productId, 'review-eligibility'],
    queryFn: () => reviewsApi.getReviewEligibility(productId),
    enabled: !!productId,
    ...options,
  })
}
