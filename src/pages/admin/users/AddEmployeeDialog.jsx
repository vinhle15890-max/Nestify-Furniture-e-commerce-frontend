import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { SearchInput } from '../../../components/SearchInput'
import { useAdminUsers, useRoles, useAssignUserRoles } from '../../../features/admin/users/hooks'
import { UserCell } from './UserCell'
import { useToastStore } from '../../../store/toastStore'

// Add an employee = take an existing account (a customer / user) and grant it staff
// roles. Two steps: pick the user, then choose the roles. No new account is created —
// only the RBAC roles change.
export function AddEmployeeDialog({ open, onOpenChange }) {
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [error, setError] = useState(null)
  const errorRef = useRef(null)

  const candidatesQuery = useAdminUsers({ type: 'customer', search: term, enabled: open })
  const { data, isLoading, isFetching, isError, refetch } = candidatesQuery
  const rolesQuery = useRoles({ enabled: open })
  const {
    data: rolesData,
    isLoading: rolesLoading,
    isError: rolesError,
    isFetching: rolesFetching,
    refetch: refetchRoles,
  } = rolesQuery
  const assignRoles = useAssignUserRoles()
  const addToast = useToastStore((state) => state.addToast)

  // Reset everything whenever the dialog (re)opens.
  useEffect(() => {
    if (open) {
      setTerm('')
      setSelected(null)
      setSelectedIds([])
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  const candidates = data?.data ?? []
  const roles = (rolesData?.data ?? []).filter((role) => role.name !== 'customer')

  function toggle(roleId) {
    setError(null)
    setSelectedIds((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId],
    )
  }

  async function handleSave() {
    if (assignRoles.isPending || rolesError || !rolesData) return
    setError(null)
    try {
      await assignRoles.mutateAsync({ id: selected.id, roleIds: selectedIds })
      addToast({ title: `Đã thêm ${selected.name} làm nhân viên.`, variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      const fieldError = err?.details?.fields?.role_ids?.[0] ?? err?.details?.fields?.roles?.[0]
      setError(fieldError ?? (err?.code === 'NETWORK_ERROR' ? 'Chưa thể thêm nhân viên. Vui lòng kiểm tra kết nối và thử lại.' : err?.message ?? 'Chưa thể thêm nhân viên.'))
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && assignRoles.isPending) return
        onOpenChange(next)
      }}
      title="Thêm nhân viên"
      description={
        selected
          ? 'Chọn vai trò để cấp cho người dùng này.'
          : 'Tìm một người dùng hiện có để cấp quyền nhân viên.'
      }
    >
      {!selected ? (
        <div className="flex flex-col gap-3">
          <SearchInput placeholder="Tìm theo tên hoặc email..." onDebouncedChange={setTerm} />

          <div className="max-h-72 overflow-y-auto">
            {isLoading || isFetching ? (
              <div className="flex justify-center py-8">
                <Spinner label="Đang tìm..." />
              </div>
            ) : isError ? (
              <LoadErrorState compact title="Chưa thể tìm người dùng" description="Từ khóa hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
            ) : candidates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {term ? 'Không tìm thấy người dùng phù hợp.' : 'Nhập tên hoặc email để tìm.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {candidates.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(user)}
                      className="flex w-full items-center justify-between gap-3 rounded-control border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-surface-alt/50"
                    >
                      <UserCell user={user} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            disabled={assignRoles.isPending}
            className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-accent"
          >
            <ArrowLeft size={15} />
            Chọn người khác
          </button>

          <div className="rounded-control border border-border bg-surface-alt/40 p-3">
            <UserCell user={selected} />
          </div>

          {rolesLoading ? (
            <Spinner label="Đang tải vai trò..." />
          ) : rolesError && !rolesData ? (
            <LoadErrorState compact title="Chưa thể tải danh sách vai trò" description="Người dùng đã chọn vẫn được giữ nguyên. Hãy thử tải lại." onRetry={refetchRoles} isRetrying={rolesFetching} />
          ) : (
            <>
              {rolesError && rolesData && (
                <LoadErrorState compact background title="Danh sách vai trò có thể chưa mới nhất" description="Người dùng đã chọn vẫn được giữ nguyên. Hãy thử tải lại để xác minh." onRetry={refetchRoles} isRetrying={rolesFetching} />
              )}
              <ul className="flex flex-col gap-2">
                {roles.map((role) => (
                  <li key={role.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-control border border-border bg-surface p-3 text-sm transition-colors hover:border-border-strong">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(role.id)}
                        onChange={() => toggle(role.id)}
                        className="accent-[var(--color-foreground)]"
                      />
                      <span>
                        <span className="font-medium text-foreground">{role.display_name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{role.name}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {roles.length === 0 && <p className="text-sm text-muted-foreground">Chưa có vai trò nhân viên nào để gán.</p>}
            </>
          )}

          {error && (
            <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={assignRoles.isPending}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={assignRoles.isPending || selectedIds.length === 0 || rolesError || !rolesData} className="gap-2">
              <Check size={16} />
              {assignRoles.isPending ? 'Đang lưu...' : 'Thêm nhân viên'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
