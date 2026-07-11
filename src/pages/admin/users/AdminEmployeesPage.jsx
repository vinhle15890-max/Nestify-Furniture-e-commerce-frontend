import { useMemo, useState } from 'react'
import { UserPlus, ShieldCheck, Users } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Badge } from '../../../components/Badge'
import { RoleBadge } from '../../../components/RoleBadge'
import { SearchInput } from '../../../components/SearchInput'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { PageHeader } from '../../../components/admin/PageHeader'
import { Panel } from '../../../components/admin/Panel'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useAdminUsers, useRoles } from '../../../features/admin/users/hooks'
import { UserCell } from './UserCell'
import { AssignRolesDialog } from './AssignRolesDialog'
import { AddEmployeeDialog } from './AddEmployeeDialog'
import { LockUserButton } from './LockUserButton'

const thClass = 'px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'

const SORTS = {
  newest: { label: 'Mới nhất', compare: () => 0 },
  name_asc: { label: 'Tên A→Z', compare: (a, b) => a.name.localeCompare(b.name, 'vi') },
  name_desc: { label: 'Tên Z→A', compare: (a, b) => b.name.localeCompare(a.name, 'vi') },
}

export function AdminEmployeesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [sort, setSort] = useState('newest')
  const [editingUser, setEditingUser] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const { data, isLoading, isError, isFetching, refetch } = useAdminUsers({
    page,
    type: 'staff',
    search,
    role: role || undefined,
  })
  const { data: rolesData } = useRoles()

  const roleOptions = (rolesData?.data ?? []).filter((r) => r.name !== 'customer')
  const meta = data?.meta?.pagination ?? { last_page: 1 }

  const rows = useMemo(() => [...(data?.data ?? [])].sort(SORTS[sort].compare), [data, sort])

  function resetToFirstPage(setter) {
    return (value) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Nhân viên"
        description="Quản lý đội ngũ nội bộ và phân quyền vai trò theo từng đầu việc."
        actions={
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <UserPlus size={16} />
            Thêm nhân viên
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 rounded-card border border-border bg-surface p-3 shadow-soft sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Tìm theo tên hoặc email..."
          onDebouncedChange={resetToFirstPage(setSearch)}
          className="sm:max-w-xs sm:flex-1"
        />
        <div className="flex gap-3">
          <select
            value={role}
            onChange={(event) => resetToFirstPage(setRole)(event.target.value)}
            aria-label="Lọc theo vai trò"
            className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
          >
            <option value="">Tất cả vai trò</option>
            {roleOptions.map((r) => (
              <option key={r.id} value={r.name}>
                {r.display_name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sắp xếp"
            className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
          >
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <Panel padded={false} className="mt-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Đang tải nhân viên..." />
          </div>
        ) : isError && !data ? (
          <LoadErrorState compact title="Chưa thể tải nhân viên" description="Bộ lọc hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
        ) : rows.length === 0 ? (
          <EmptyState
            illustration="chair"
            icon={Users}
            title="Chưa có nhân viên"
            description="Không có nhân viên nào khớp bộ lọc. Dùng “Thêm nhân viên” để cấp vai trò cho một người dùng."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <caption className="sr-only">Danh sách nhân viên</caption>
              <thead>
                <tr className="border-b border-border bg-surface-alt/40">
                  <th className={thClass}>Nhân viên</th>
                  <th className={thClass}>Vai trò</th>
                  <th className={thClass}>Trạng thái</th>
                  <th className={thClass}>Email</th>
                  <th className={`${thClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                {rows.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40">
                    <td className="px-4 py-3">
                      <UserCell user={user} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(user.roles ?? []).map((r) => (
                          <RoleBadge key={r} role={r} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={user.status === 'active' ? 'in-stock' : 'neutral'}>
                        {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {user.email_verified_at ? (
                        <span className="text-xs text-secondary">Đã xác thực</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Chưa xác thực</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          className="px-3 py-1.5"
                          aria-label={`Phân quyền cho ${user.name}`}
                          onClick={() => setEditingUser(user)}
                        >
                          Phân quyền
                        </Button>
                        <LockUserButton user={user} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="mt-6">
        <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={setPage} />
      </div>

      <AssignRolesDialog
        user={editingUser}
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null)
        }}
      />
      <AddEmployeeDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
