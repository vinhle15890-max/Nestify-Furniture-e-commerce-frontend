import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../../lib/apiClient'
import { clearPersonalizationHistory, getJourneyContext, getRecentlyViewed, recordProductView, updatePersonalization } from './api'

vi.mock('../../lib/apiClient', () => ({
  apiClient: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('personalization api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('records a product view by slug', () => {
    recordProductView('ghe-sofa')
    expect(apiClient.post).toHaveBeenCalledWith('/products/ghe-sofa/view')
  })

  it('fetches recently viewed with a limit', () => {
    getRecentlyViewed(8)
    expect(apiClient.get).toHaveBeenCalledWith('/me/recently-viewed', { params: { limit: 8 } })
  })

  it('defaults the limit to 10', () => {
    getRecentlyViewed()
    expect(apiClient.get).toHaveBeenCalledWith('/me/recently-viewed', { params: { limit: 10 } })
  })

  it('uses the journey context and privacy control endpoints', () => {
    getJourneyContext()
    updatePersonalization(false)
    clearPersonalizationHistory()
    expect(apiClient.get).toHaveBeenCalledWith('/me/journey-context')
    expect(apiClient.patch).toHaveBeenCalledWith('/me/personalization', { enabled: false })
    expect(apiClient.delete).toHaveBeenCalledWith('/me/personalization/history')
  })
})
