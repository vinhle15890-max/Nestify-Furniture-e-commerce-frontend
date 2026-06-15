import { apiClient } from '../../../lib/apiClient'

export function getUsers(page) {
  return apiClient.get('/admin/users', { params: { page } })
}
