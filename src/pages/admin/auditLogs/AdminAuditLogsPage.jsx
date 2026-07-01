import { useState } from 'react'
import { ScrollText } from 'lucide-react'
import { Card } from '../../../components/Card'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { PageHeader } from '../../../components/admin/PageHeader'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useAdminAuditLogs } from '../../../features/admin/auditLogs/hooks'
import { formatDate } from '../../../lib/format'

export function AdminAuditLogsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminAuditLogs(page)

  const logs = data?.data ?? []
  const meta = data?.meta?.pagination ?? { last_page: 1 }

  return (
    <div>
      <PageHeader
        icon={ScrollText}
        title="Nhật ký hệ thống"
        description="Lịch sử các thao tác quản trị quan trọng."
      />

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải nhật ký..." />
        ) : logs.length === 0 ? (
          <Card>
            <EmptyState
              illustration="search"
              title="Chưa có nhật ký nào"
              description="Hoạt động quản trị sẽ được ghi lại ở đây."
            />
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3">Người dùng</th>
                  <th className="px-4 py-3">Hành động</th>
                  <th className="px-4 py-3">Đối tượng</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{log.user?.name}</p>
                      <p className="text-muted-foreground">{log.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">{log.action}</td>
                    <td className="px-4 py-3 text-foreground">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="px-4 py-3 text-foreground">{log.ip_address}</td>
                    <td className="px-4 py-3 text-foreground">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-foreground transition-colors hover:text-accent">Chi tiết</summary>
                        <pre className="mt-2 max-w-xs overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                          {JSON.stringify({ old_values: log.old_values, new_values: log.new_values }, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={setPage} />
      </div>
    </div>
  )
}
