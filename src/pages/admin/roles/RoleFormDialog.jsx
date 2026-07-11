import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { PERMISSION_LABELS } from '../adminNav'
import { usePermissions, useCreateRole, useUpdateRole } from '../../../features/admin/roles/hooks'
import { useToastStore } from '../../../store/toastStore'

function labelFor(permission) {
  return PERMISSION_LABELS[permission.slug] ?? permission.display_name ?? permission.slug
}

export function RoleFormDialog({ role, open, onOpenChange }) {
  const isEdit = Boolean(role)
  const locked = Boolean(role?.locked)
  const permissionsQuery = usePermissions({ enabled: open })
  const { data: permData, isLoading, isError, isFetching, refetch } = permissionsQuery
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const addToast = useToastStore((state) => state.addToast)

  const [displayName, setDisplayName] = useState('')
  const [selected, setSelected] = useState([])
  const [error, setError] = useState(null)
  const [nameError, setNameError] = useState(null)
  const nameRef = useRef(null)
  const errorRef = useRef(null)

  const permissions = permData?.data ?? []

  useEffect(() => {
    if (open) {
      setDisplayName(role?.display_name ?? '')
      setSelected(role?.permissions ?? [])
      setError(null)
      setNameError(null)
    }
  }, [open, role])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  function toggle(slug) {
    setError(null)
    setSelected((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    )
  }

  async function handleSave() {
    if (pending || isError || !permData) return
    setError(null)
    setNameError(null)
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
      if (fieldError) {
        setNameError(fieldError)
        nameRef.current?.focus()
      } else {
        const permissionError = err?.details?.fields?.permissions?.[0]
        setError(permissionError ?? (err?.code === 'NETWORK_ERROR' ? 'Chưa thể lưu vai trò. Vui lòng kiểm tra kết nối và thử lại.' : err?.message ?? 'Chưa thể lưu vai trò.'))
      }
    }
  }

  const pending = createRole.isPending || updateRole.isPending

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return
        onOpenChange(next)
      }}
      title={isEdit ? (locked ? 'Chi tiết vai trò' : 'Sửa vai trò') : 'Tạo vai trò'}
      description={isEdit ? role.name : 'Đặt tên và chọn các quyền cho vai trò mới.'}
    >
      {isLoading ? (
        <Spinner label="Đang tải quyền..." />
      ) : isError && !permData ? (
        <LoadErrorState compact title="Chưa thể tải danh sách quyền" description="Không thể chỉnh vai trò cho đến khi danh sách quyền được xác minh." onRetry={refetch} isRetrying={isFetching} />
      ) : (
        <div className="flex flex-col gap-4">
          {isError && permData && (
            <LoadErrorState compact background title="Danh sách quyền có thể chưa mới nhất" description="Bạn có thể tiếp tục với dữ liệu đang có hoặc thử tải lại." onRetry={refetch} isRetrying={isFetching} />
          )}
          {locked && (
            <p className="rounded-control bg-surface-alt px-3 py-2 text-sm text-muted-foreground">
              {role.name === 'super_admin'
                ? 'Toàn quyền (bypass) — vai trò hệ thống, không thể chỉnh sửa.'
                : 'Vai trò hệ thống, không thể chỉnh sửa.'}
            </p>
          )}

          <div className="flex flex-col gap-1 text-sm">
            <label htmlFor="role-display-name" className="font-medium text-foreground">Tên hiển thị</label>
            <input
              ref={nameRef}
              id="role-display-name"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value)
                setError(null)
                setNameError(null)
              }}
              disabled={locked}
              aria-invalid={nameError ? 'true' : undefined}
              aria-describedby={nameError ? 'role-display-name-error' : undefined}
              className={`rounded-control border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-60 ${nameError ? 'border-destructive' : 'border-border'}`}
            />
            {nameError && <span id="role-display-name-error" role="alert" className="text-sm text-destructive">{nameError}</span>}
          </div>

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
            {permissions.length === 0 && (
              <p className="text-sm text-muted-foreground">Chưa có quyền nào trong hệ thống.</p>
            )}
          </fieldset>

          {error && (
            <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-destructive">
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
