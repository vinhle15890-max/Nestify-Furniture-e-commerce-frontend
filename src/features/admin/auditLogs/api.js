import { apiClient } from '../../../lib/apiClient'

export function getAuditLogs(page) {
  return apiClient.get('/admin/audit-logs', { params: { page } })
}
