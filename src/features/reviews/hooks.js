import { useMutation } from '@tanstack/react-query'
import * as reviewsApi from './api'

export function useCreateReview() {
  return useMutation({
    mutationFn: ({ productId, ...payload }) => reviewsApi.createReview(productId, payload),
  })
}
