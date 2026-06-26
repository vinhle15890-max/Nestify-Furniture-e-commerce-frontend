import { useEffect, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
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

  const { data, isFetching } = useAdminUsers({ type: 'customer', search: term })
  const { data: rolesData, isLoading: rolesLoading } = useRoles({ enabled: open })
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

  const candidates = data?.data ?? []
  const roles = (rolesData?.data ?? []).filter((role) => role.name !== 'customer')

  function toggle(roleId) {
    setSelectedIds((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId],
    )
  }

  async function handleSave() {
    setError(null)
    try {
      await assignRoles.mutateAsync({ id: selected.id, roleIds: selectedIds })
      addToast({ title: `Đã thêm ${selected.name} làm nhân viên.`, variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
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
            {isFetching ? (
              <div className="flex justify-center py-8">
                <Spinner label="Đang tìm..." />
              </div>
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
          ) : (
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
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={assignRoles.isPending || selectedIds.length === 0} className="gap-2">
              <Check size={16} />
              {assignRoles.isPending ? 'Đang lưu...' : 'Thêm nhân viên'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
