import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { useRoles, useAssignUserRoles } from '../../../features/admin/users/hooks'
import { useToastStore } from '../../../store/toastStore'

export function AssignRolesDialog({
  user,
  open,
  onOpenChange,
  title = 'Phân quyền vai trò',
  saveLabel = 'Lưu',
}) {
  const { data: rolesData, isLoading, isError, isFetching, refetch } = useRoles({ enabled: open })
  const assignRoles = useAssignUserRoles()
  const addToast = useToastStore((state) => state.addToast)

  const [selectedIds, setSelectedIds] = useState([])
  const [error, setError] = useState(null)
  const errorRef = useRef(null)

  // The dialog assigns *staff* roles; "customer" is the default storefront role, not a
  // job to grant, so it's hidden from the options.
  const roles = (rolesData?.data ?? []).filter((role) => role.name !== 'customer')

  // Re-seed the selection once the dialog opens AND roles are loaded, from the user's
  // current roles intersected with the *visible* options. assignRoles replaces the full
  // set, so seeding only visible (non-customer) roles makes "promote" correctly drop the
  // customer role instead of silently keeping a hidden, un-uncheckable selection.
  useEffect(() => {
    if (open && user && rolesData) {
      const visibleIds = new Set(roles.map((role) => role.id))
      setSelectedIds((user.role_ids ?? []).filter((id) => visibleIds.has(id)))
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, rolesData])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  function toggle(roleId) {
    setError(null)
    setSelectedIds((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId],
    )
  }

  async function handleSave() {
    if (assignRoles.isPending || isError || !rolesData) return
    setError(null)
    try {
      await assignRoles.mutateAsync({ id: user.id, roleIds: selectedIds })
      addToast({ title: 'Đã cập nhật vai trò.', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      // e.g. the "last super_admin" guard returns a Vietnamese ApiError message.
      const fieldError = err?.details?.fields?.role_ids?.[0] ?? err?.details?.fields?.roles?.[0]
      setError(fieldError ?? (err?.code === 'NETWORK_ERROR' ? 'Chưa thể cập nhật vai trò. Vui lòng kiểm tra kết nối và thử lại.' : err?.message ?? 'Chưa thể cập nhật vai trò.'))
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && assignRoles.isPending) return
        onOpenChange(next)
      }}
      title={title}
      description={user ? `${user.name} · ${user.email}` : undefined}
    >
      {isLoading ? (
        <Spinner label="Đang tải vai trò..." />
      ) : isError && !rolesData ? (
        <LoadErrorState compact title="Chưa thể tải danh sách vai trò" description="Vai trò hiện tại của người dùng chưa bị thay đổi. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
      ) : (
        <div className="flex flex-col gap-4">
          {isError && rolesData && (
            <LoadErrorState compact background title="Danh sách vai trò có thể chưa mới nhất" description="Lựa chọn hiện tại vẫn được giữ nguyên. Hãy thử tải lại để xác minh." onRetry={refetch} isRetrying={isFetching} />
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
          {roles.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có vai trò nhân viên nào để gán.</p>
          )}

          {error && (
            <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={assignRoles.isPending || roles.length === 0}>
              {assignRoles.isPending ? 'Đang lưu...' : saveLabel}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
