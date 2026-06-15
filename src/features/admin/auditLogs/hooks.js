import { useOffsetQuery } from '../../../lib/pagination'
import * as auditLogsApi from './api'

export function useAdminAuditLogs(page) {
  return useOffsetQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: auditLogsApi.getAuditLogs,
    page,
  })
}
