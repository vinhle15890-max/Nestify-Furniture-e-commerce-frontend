import { apiClient } from '../../../lib/apiClient'

export function getDashboard(filters = {}) {
  return apiClient.get('/admin/dashboard', { params: filters })
}
