import { useEffect, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import { PERMISSION_LABELS } from '../adminNav'
import { usePermissions, useCreateRole, useUpdateRole } from '../../../features/admin/roles/hooks'
import { useToastStore } from '../../../store/toastStore'

function labelFor(permission) {
  return PERMISSION_LABELS[permission.slug] ?? permission.display_name ?? permission.slug
}

export function RoleFormDialog({ role, open, onOpenChange }) {
  const isEdit = Boolean(role)
  const locked = Boolean(role?.locked)
  const { data: permData, isLoading } = usePermissions({ enabled: open })
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const addToast = useToastStore((state) => state.addToast)

  const [displayName, setDisplayName] = useState('')
  const [selected, setSelected] = useState([])
  const [error, setError] = useState(null)

  const permissions = permData?.data ?? []

  useEffect(() => {
    if (open) {
      setDisplayName(role?.display_name ?? '')
      setSelected(role?.permissions ?? [])
      setError(null)
    }
  }, [open, role])

  function toggle(slug) {
    setSelected((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    )
  }

  async function handleSave() {
    setError(null)
    const payload = { display_name: displayName.trim(), permissions: selected }
    try {
      if (isEdit) {
        await updateRole.mutateAsync({ id: role.id, ...payload })
        addToast({ title: 'Đã cập nhật vai trò.', variant: 'success' })
      } else {
        await createRole.mutateAsync(payload)
        addToast({ title: 'Đã tạo vai trò.', variant: 'success' })
      }
      onOpenChange(false)
    } catch (err) {
      // Prefer the field-level 422 message (e.g. duplicate name) over the generic
      // "Dữ liệu không hợp lệ." envelope message so the admin sees why it failed.
      const fieldError =
        err?.details?.fields?.name?.[0] ?? err?.details?.fields?.display_name?.[0]
      setError(fieldError ?? err.message)
    }
  }

  const pending = createRole.isPending || updateRole.isPending

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? (locked ? 'Chi tiết vai trò' : 'Sửa vai trò') : 'Tạo vai trò'}
      description={isEdit ? role.name : undefined}
    >
      {isLoading ? (
        <Spinner label="Đang tải quyền..." />
      ) : (
        <div className="flex flex-col gap-4">
          {locked && (
            <p className="rounded-control bg-surface-alt px-3 py-2 text-sm text-muted-foreground">
              {role.name === 'super_admin'
                ? 'Toàn quyền (bypass) — vai trò hệ thống, không thể chỉnh sửa.'
                : 'Vai trò hệ thống, không thể chỉnh sửa.'}
            </p>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Tên hiển thị</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={locked}
              className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-60"
            />
          </label>

          <fieldset className="flex flex-col gap-2" disabled={locked}>
            <legend className="mb-1 text-sm font-medium text-foreground">Quyền</legend>
            {permissions.map((permission) => (
              <label
                key={permission.slug}
                className="flex cursor-pointer items-center gap-3 rounded-control border border-border bg-surface p-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  aria-label={labelFor(permission)}
                  checked={selected.includes(permission.slug)}
                  onChange={() => toggle(permission.slug)}
                  disabled={locked}
                  className="accent-[var(--color-foreground)]"
                />
                <span>
                  <span className="text-foreground">{labelFor(permission)}</span>
                  <span aria-hidden="true" className="ml-2 text-xs text-muted-foreground">{permission.slug}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {locked ? 'Đóng' : 'Hủy'}
            </Button>
            {!locked && (
              <Button onClick={handleSave} disabled={pending || !displayName.trim()}>
                {pending ? 'Đang lưu...' : isEdit ? 'Lưu' : 'Tạo vai trò'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
