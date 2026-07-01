import { apiClient } from '../../../lib/apiClient'

// params: { page, type: 'staff'|'customer', search, role }
export function getUsers(params) {
  return apiClient.get('/admin/users', { params })
}

export function getRoles() {
  return apiClient.get('/admin/roles')
}

export function assignUserRoles(id, roleIds) {
  return apiClient.patch(`/admin/users/${id}/roles`, { role_ids: roleIds })
}

export function updateUserStatus(id, status) {
  return apiClient.patch(`/admin/users/${id}/status`, { status })
}
