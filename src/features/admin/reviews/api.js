import { apiClient } from '../../../lib/apiClient'

export function getReviews(cursor) {
  const params = {}
  if (cursor) params.cursor = cursor

  return apiClient.get('/admin/reviews', { params })
}

export function approveReview(id) {
  return apiClient.patch(`/admin/reviews/${id}/approve`)
}

export function rejectReview(id) {
  return apiClient.patch(`/admin/reviews/${id}/reject`)
}
