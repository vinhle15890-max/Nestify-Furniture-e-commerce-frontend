import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Badge } from '../../../components/Badge'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/admin/PageHeader'
import { Panel } from '../../../components/admin/Panel'
import { EmptyState } from '../../../components/admin/EmptyState'
import { useRoles } from '../../../features/admin/users/hooks'
import { useDeleteRole } from '../../../features/admin/roles/hooks'
import { useToastStore } from '../../../store/toastStore'
import { usePreviewStore } from '../../../store/previewStore'
import { firstAllowedPath } from '../adminNav'
import { RoleFormDialog } from './RoleFormDialog'
import { RolePermissionMatrix } from './RolePermissionMatrix'

const thClass = 'px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground'

export function AdminRolesPage() {
  const { data, isLoading, isError, isFetching, refetch } = useRoles()
  const deleteRole = useDeleteRole()
  const addToast = useToastStore((state) => state.addToast)
  const setPreviewRole = usePreviewStore((state) => state.setPreviewRole)
  const navigate = useNavigate()

  const [editing, setEditing] = useState(undefined) // undefined=đóng, null=tạo mới, role=sửa
  const [deleting, setDeleting] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [view, setView] = useState('table') // 'table' | 'matrix'

  const roles = data?.data ?? []

  function handlePreview(role) {
    setPreviewRole(role)
    const target = firstAllowedPath({ permissions: role.permissions ?? [] })
    navigate(target ?? '/admin')
  }

  async function confirmDelete() {
    if (!deleting || deleteRole.isPending) return
    setDeleteError(null)
    try {
      await deleteRole.mutateAsync(deleting.id)
      addToast({ title: 'Đã xoá vai trò.', variant: 'success' })
      setDeleting(null)
    } catch (err) {
      const count = err?.details?.users_count
      setDeleteError(
        err?.code === 'ROLE_IN_USE' && count != null
          ? `Còn ${count} nhân viên giữ vai trò này, hãy gỡ trước khi xoá.`
          : err?.code === 'NETWORK_ERROR'
            ? 'Chưa thể xoá vai trò. Vui lòng kiểm tra kết nối và thử lại.'
            : err?.message ?? 'Chưa thể xoá vai trò. Vui lòng thử lại.',
      )
    }
  }

  return (
    <div>
      <PageHeader
        icon={KeyRound}
        title="Vai trò"
        description="Tạo và tinh chỉnh vai trò cùng tập quyền cho đội ngũ nội bộ."
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-control border border-border p-0.5">
              <button
                type="button"
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
                className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === 'table' ? 'bg-foreground text-surface' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Bảng
              </button>
              <button
                type="button"
                onClick={() => setView('matrix')}
                aria-pressed={view === 'matrix'}
                className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === 'matrix' ? 'bg-foreground text-surface' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ma trận
              </button>
            </div>
            <Button onClick={() => setEditing(null)} className="gap-2">
              <Plus size={16} />
              Tạo vai trò
            </Button>
          </div>
        }
      />

      <Panel className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải vai trò..." />
        ) : isError && !data ? (
          <LoadErrorState title="Chưa thể tải vai trò" description="Hãy thử tải lại danh sách phân quyền." onRetry={refetch} isRetrying={isFetching} />
        ) : roles.length === 0 ? (
          <EmptyState title="Chưa có vai trò" description="Tạo vai trò đầu tiên để phân quyền." />
        ) : view === 'matrix' ? (
          <RolePermissionMatrix roles={roles} onEdit={setEditing} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <caption className="sr-only">Danh sách vai trò</caption>
              <thead>
                <tr className="border-b border-border">
                  <th className={thClass}>Vai trò</th>
                  <th className={thClass}>Số quyền</th>
                  <th className={thClass}>Người dùng</th>
                  <th className={thClass}><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{role.display_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{role.name}</span>
                      {role.locked && (
                        <Badge tone="neutral" className="ml-2">
                          Hệ thống
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{role.permissions?.length ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{role.users_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {role.name !== 'customer' && (
                          <Button
                            variant="ghost"
                            onClick={() => handlePreview(role)}
                            aria-label={`Xem thử vai trò ${role.display_name}`}
                          >
                            <Eye size={15} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          onClick={() => setEditing(role)}
                          aria-label={`${role.locked ? 'Xem' : 'Sửa'} vai trò ${role.display_name}`}
                        >
                          <Pencil size={15} />
                        </Button>
                        {!role.locked && (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setDeleting(role)
                              setDeleteError(null)
                            }}
                            aria-label={`Xoá vai trò ${role.display_name}`}
                            className="text-destructive"
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <RoleFormDialog
        role={editing ?? null}
        open={editing !== undefined}
        onOpenChange={(next) => !next && setEditing(undefined)}
      />

      <Modal
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next && !deleteRole.isPending) setDeleting(null)
        }}
        title="Xoá vai trò"
        description={deleting ? `Xoá vai trò "${deleting.display_name}"? Hành động không thể hoàn tác.` : undefined}
      >
        <div className="flex flex-col gap-4">
          {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteRole.isPending}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteRole.isPending}>
              {deleteRole.isPending ? 'Đang xoá...' : 'Xoá'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
