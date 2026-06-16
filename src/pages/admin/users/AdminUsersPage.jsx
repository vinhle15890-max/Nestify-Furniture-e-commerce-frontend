import { useState } from 'react'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { useAdminUsers } from '../../../features/admin/users/hooks'

const STATUS_LABELS = {
  active: { label: 'Hoạt động', tone: 'in-stock' },
  archived: { label: 'Đã lưu trữ', tone: 'neutral' },
}

export function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminUsers(page)

  const users = data?.data ?? []
  const meta = data?.meta?.pagination ?? { last_page: 1 }

  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">Người dùng</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Danh sách chỉ xem. Phân quyền vai trò sẽ khả dụng khi BE cung cấp danh mục vai trò
        (xem mục câu hỏi mở #2 trong docs/TASKS.md).
      </p>

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải người dùng..." />
        ) : users.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">Chưa có người dùng nào.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-3">Người dùng</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Email xác thực</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const statusInfo = STATUS_LABELS[user.status] ?? { label: user.status, tone: 'neutral' }
                  return (
                    <tr key={user.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {(user.roles ?? []).map((role) => (
                            <Badge key={role} tone="neutral">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">{user.email_verified_at ? 'Đã xác thực' : 'Chưa xác thực'}</td>
                    </tr>
                  )
                })}
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
