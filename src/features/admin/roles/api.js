import { apiClient } from '../../../lib/apiClient'

export function getPermissions() {
  return apiClient.get('/admin/permissions')
}

export function createRole(payload) {
  return apiClient.post('/admin/roles', payload)
}

export function updateRole(id, payload) {
  return apiClient.patch(`/admin/roles/${id}`, payload)
}

export function deleteRole(id) {
  return apiClient.delete(`/admin/roles/${id}`)
}
