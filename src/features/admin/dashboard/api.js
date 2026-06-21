import { apiClient } from '../../../lib/apiClient'

export function getDashboard() {
  return apiClient.get('/admin/dashboard')
}
