import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCursorQuery } from '../../../lib/pagination'
import * as reviewsApi from './api'

export function useAdminReviews() {
  return useCursorQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: (cursor) => reviewsApi.getReviews(cursor),
  })
}

function removeReviewFromCache(queryClient, id) {
  queryClient.setQueriesData({ queryKey: ['admin', 'reviews'] }, (data) => {
    if (!data) return data
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        data: page.data.filter((review) => review.id !== id),
      })),
    }
  })
}

export function useApproveReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => reviewsApi.approveReview(id),
    onSuccess: (_response, id) => removeReviewFromCache(queryClient, id),
  })
}

export function useRejectReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => reviewsApi.rejectReview(id),
    onSuccess: (_response, id) => removeReviewFromCache(queryClient, id),
  })
}
