import { apiClient } from '../../lib/apiClient'

export function createReview(productId, payload) {
  return apiClient.post(`/products/${productId}/reviews`, payload)
}

export function createComment(reviewId, body) {
  return apiClient.post(`/reviews/${reviewId}/comments`, { body })
}
