import { apiClient } from '../../../lib/apiClient'

export function getAuditLogs(page, action = '') {
  return apiClient.get('/admin/audit-logs', {
    params: { page, action: action || undefined },
  })
}
