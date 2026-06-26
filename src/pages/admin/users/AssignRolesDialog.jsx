import { useEffect, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import { useRoles, useAssignUserRoles } from '../../../features/admin/users/hooks'
import { useToastStore } from '../../../store/toastStore'

export function AssignRolesDialog({
  user,
  open,
  onOpenChange,
  title = 'Phân quyền vai trò',
  saveLabel = 'Lưu',
}) {
  const { data: rolesData, isLoading } = useRoles({ enabled: open })
  const assignRoles = useAssignUserRoles()
  const addToast = useToastStore((state) => state.addToast)

  const [selectedIds, setSelectedIds] = useState([])
  const [error, setError] = useState(null)

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

  function toggle(roleId) {
    setSelectedIds((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId],
    )
  }

  async function handleSave() {
    setError(null)
    try {
      await assignRoles.mutateAsync({ id: user.id, roleIds: selectedIds })
      addToast({ title: 'Đã cập nhật vai trò.', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      // e.g. the "last super_admin" guard returns a Vietnamese ApiError message.
      setError(err.message)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={user ? `${user.name} · ${user.email}` : undefined}
    >
      {isLoading ? (
        <Spinner label="Đang tải vai trò..." />
      ) : (
        <div className="flex flex-col gap-4">
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

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={assignRoles.isPending}>
              {assignRoles.isPending ? 'Đang lưu...' : saveLabel}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
