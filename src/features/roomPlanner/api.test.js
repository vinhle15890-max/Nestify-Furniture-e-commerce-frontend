import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../../lib/apiClient'
import { claimRoomDraft, createScene, getRoomDraft, getScene, updateScene } from './api'

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}))

describe('roomPlanner/api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getScene calls GET /room-scenes/:id', () => {
    getScene(7)
    expect(apiClient.get).toHaveBeenCalledWith('/room-scenes/7')
  })

  it('createScene posts the payload', () => {
    const payload = { name: 'P', width: 4, depth: 5, height: 2.8, items: [] }
    createScene(payload)
    expect(apiClient.post).toHaveBeenCalledWith('/room-scenes', payload)
  })

  it('updateScene patches /room-scenes/:id', () => {
    const payload = { name: 'P', items: [] }
    updateScene(9, payload)
    expect(apiClient.patch).toHaveBeenCalledWith('/room-scenes/9', payload)
  })

  it('keeps the room draft bearer secret out of API URLs', () => {
    const token = 'A'.repeat(64)

    getRoomDraft(token)
    claimRoomDraft(token)

    expect(apiClient.get).toHaveBeenCalledWith('/room-drafts/current', { headers: { 'X-Room-Draft-Token': token } })
    expect(apiClient.post).toHaveBeenCalledWith('/room-drafts/claim', null, { headers: { 'X-Room-Draft-Token': token } })
  })
})
