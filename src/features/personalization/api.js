import { apiClient } from '../../lib/apiClient'

export function recordProductView(slug) {
  return apiClient.post(`/products/${slug}/view`)
}

export function getRecentlyViewed(limit = 10) {
  return apiClient.get('/me/recently-viewed', { params: { limit } })
}
