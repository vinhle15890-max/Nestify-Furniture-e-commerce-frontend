import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../../lib/apiClient'
import { getScene, createScene, updateScene } from './api'

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
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
})
