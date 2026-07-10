import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../../../lib/apiClient'
import * as rolesApi from './api'

vi.mock('../../../lib/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

beforeEach(() => vi.clearAllMocks())

describe('roles api', () => {
  it('getPermissions GET /admin/permissions', () => {
    rolesApi.getPermissions()
    expect(apiClient.get).toHaveBeenCalledWith('/admin/permissions')
  })
  it('createRole POST /admin/roles', () => {
    const payload = { display_name: 'Kho', permissions: ['manage_orders'] }
    rolesApi.createRole(payload)
    expect(apiClient.post).toHaveBeenCalledWith('/admin/roles', payload)
  })
  it('updateRole PATCH /admin/roles/:id', () => {
    rolesApi.updateRole(7, { display_name: 'X', permissions: [] })
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/roles/7', { display_name: 'X', permissions: [] })
  })
  it('deleteRole DELETE /admin/roles/:id', () => {
    rolesApi.deleteRole(7)
    expect(apiClient.delete).toHaveBeenCalledWith('/admin/roles/7')
  })
})
