import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateUserStatus } from './api'
import { apiClient } from '../../../lib/apiClient'

vi.mock('../../../lib/apiClient', () => ({
  apiClient: { patch: vi.fn(() => Promise.resolve({ data: {} })) },
}))

describe('admin users api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updateUserStatus PATCHes the status endpoint with the new status', () => {
    updateUserStatus(7, 'archived')
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/7/status', { status: 'archived' })
  })
})
