import { useOffsetQuery } from '../../../lib/pagination'
import * as auditLogsApi from './api'

export function useAdminAuditLogs(page, action = '') {
  return useOffsetQuery({
    queryKey: ['admin', 'audit-logs', { action }],
    queryFn: (p) => auditLogsApi.getAuditLogs(p, action),
    page,
  })
}
