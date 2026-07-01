import { useState } from 'react'
import { Users2, UserRound } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Badge } from '../../../components/Badge'
import { SearchInput } from '../../../components/SearchInput'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { PageHeader } from '../../../components/admin/PageHeader'
import { Panel } from '../../../components/admin/Panel'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useAdminUsers } from '../../../features/admin/users/hooks'
import { UserCell } from './UserCell'
import { CustomerDetailDrawer } from './CustomerDetailDrawer'
import { AssignRolesDialog } from './AssignRolesDialog'
import { LockUserButton } from './LockUserButton'

const thClass = 'px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'

export function AdminCustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [detailUser, setDetailUser] = useState(null)
  const [promoteUser, setPromoteUser] = useState(null)

  const { data, isLoading, isFetching } = useAdminUsers({ page, type: 'customer', search })

  const users = data?.data ?? []
  const meta = data?.meta?.pagination ?? { last_page: 1 }

  function handleSearch(value) {
    setSearch(value)
    setPage(1)
  }

  // Close the drawer first, then open the role dialog → no stacked overlays.
  function handlePromote(user) {
    setDetailUser(null)
    setPromoteUser(user)
  }

  return (
    <div>
      <PageHeader
        icon={Users2}
        title="Khách hàng"
        description="Danh sách tài khoản khách hàng. Mở chi tiết để xem nhanh hoặc thăng thành nhân viên."
      />

      <div className="mt-6 rounded-card border border-border bg-surface p-3 shadow-soft">
        <SearchInput
          placeholder="Tìm theo tên hoặc email..."
          onDebouncedChange={handleSearch}
          className="sm:max-w-xs"
        />
      </div>

      <Panel padded={false} className="mt-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner label="Đang tải khách hàng..." />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            illustration="chair"
            icon={UserRound}
            title="Không có khách hàng"
            description="Không có khách hàng nào khớp tìm kiếm."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt/40">
                  <th className={thClass}>Khách hàng</th>
                  <th className={thClass}>Trạng thái</th>
                  <th className={thClass}>Email</th>
                  <th className={`${thClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40">
                    <td className="px-4 py-3">
                      <UserCell user={user} />
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
                        <Button variant="secondary" className="px-3 py-1.5" onClick={() => setDetailUser(user)}>
                          Chi tiết
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

      <CustomerDetailDrawer
        user={detailUser}
        open={detailUser !== null}
        onOpenChange={(open) => {
          if (!open) setDetailUser(null)
        }}
        onPromote={handlePromote}
      />
      <AssignRolesDialog
        user={promoteUser}
        open={promoteUser !== null}
        onOpenChange={(open) => {
          if (!open) setPromoteUser(null)
        }}
        title="Thăng thành nhân viên"
        saveLabel="Thăng nhân viên"
      />
    </div>
  )
}
