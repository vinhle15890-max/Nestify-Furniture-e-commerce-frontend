import { apiClient } from '../../lib/apiClient'

export function recordProductView(slug) {
  return apiClient.post(`/products/${slug}/view`)
}

export function getRecentlyViewed(limit = 10) {
  return apiClient.get('/me/recently-viewed', { params: { limit } })
}

export function getJourneyContext() {
  return apiClient.get('/me/journey-context')
}

export function updatePersonalization(enabled) {
  return apiClient.patch('/me/personalization', { enabled })
}

export function clearPersonalizationHistory() {
  return apiClient.delete('/me/personalization/history')
}
