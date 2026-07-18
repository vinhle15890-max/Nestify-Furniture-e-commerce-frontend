import { beforeEach, expect, it, vi } from 'vitest'
import { apiClient } from '../../../lib/apiClient'
import { confirmVariantModel, measureVariantModel, presignVariantModel } from './api'

vi.mock('../../../lib/apiClient', () => ({ apiClient: { post: vi.fn() } }))

beforeEach(() => vi.clearAllMocks())

it('uses the variant-scoped model workflow endpoints', () => {
  presignVariantModel(12)
  measureVariantModel(12, 'token')
  confirmVariantModel(12, { staging_token: 'token', confirmed: false })

  expect(apiClient.post).toHaveBeenNthCalledWith(1, '/admin/variants/12/model/presign')
  expect(apiClient.post).toHaveBeenNthCalledWith(2, '/admin/variants/12/model/measure', { staging_token: 'token' })
  expect(apiClient.post).toHaveBeenNthCalledWith(3, '/admin/variants/12/model/confirm', { staging_token: 'token', confirmed: false })
})
