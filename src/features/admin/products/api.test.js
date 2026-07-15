import { beforeEach, expect, it, vi } from 'vitest'
import { apiClient } from '../../../lib/apiClient'
import { uploadModel } from './api'

vi.mock('../../../lib/apiClient', () => ({ apiClient: { post: vi.fn() } }))

beforeEach(() => vi.clearAllMocks())

it('uploads a model through the existing remote API client', () => {
  const form = new FormData()
  uploadModel(form)
  expect(apiClient.post).toHaveBeenCalledWith('/admin/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
})
