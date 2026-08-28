import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { useCreateStaff, useRoles } from '../../../features/admin/users/hooks'
import { useToastStore } from '../../../store/toastStore'

export function AddEmployeeDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ name: '', email: '', role_id: '' })
  const [error, setError] = useState(null)
  const errorRef = useRef(null)
  const rolesQuery = useRoles({ enabled: open })
  const createStaff = useCreateStaff()
  const addToast = useToastStore((state) => state.addToast)
  const roles = (rolesQuery.data?.data ?? []).filter((role) => role.name !== 'customer')

  useEffect(() => {
    if (open) {
      setForm({ name: '', email: '', role_id: '' })
      setError(null)
    }
  }, [open])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    if (createStaff.isPending) return
    setError(null)
    try {
      const response = await createStaff.mutateAsync({ ...form, role_id: Number(form.role_id) })
      addToast({
        title: response.meta?.invitation_sent ? 'Đã tạo tài khoản và gửi email đặt mật khẩu.' : 'Đã tạo tài khoản; email mời chưa gửi được.',
        variant: response.meta?.invitation_sent ? 'success' : 'warning',
      })
      onOpenChange(false)
    } catch (err) {
      const fields = err?.details?.fields ?? {}
      setError(fields.email?.[0] ?? fields.role_id?.[0] ?? fields.name?.[0] ?? err?.message ?? 'Chưa thể tạo tài khoản nhân viên.')
    }
  }

  return <Modal open={open} onOpenChange={(next) => { if (!next && createStaff.isPending) return; onOpenChange(next) }} title="Tạo tài khoản nhân viên" description="Nhân viên sẽ nhận email để tự thiết lập mật khẩu. Không thay đổi tài khoản khách hàng hiện có.">
    {rolesQuery.isLoading ? <Spinner label="Đang tải vai trò..." /> : rolesQuery.isError ? <LoadErrorState compact title="Chưa thể tải vai trò" description="Hãy tải lại trước khi tạo tài khoản." onRetry={rolesQuery.refetch} isRetrying={rolesQuery.isFetching} /> : <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input id="staff-name" label="Họ tên" value={form.name} onChange={update('name')} required />
      <Input id="staff-email" label="Email" type="email" value={form.email} onChange={update('email')} required />
      <label className="grid gap-1.5 text-sm text-foreground" htmlFor="staff-role">Vai trò
        <select id="staff-role" value={form.role_id} onChange={update('role_id')} required className="rounded-control border border-border bg-surface px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Chọn vai trò</option>
          {roles.map((role) => <option key={role.id} value={role.id}>{role.display_name}</option>)}
        </select>
      </label>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={createStaff.isPending}>Hủy</Button>
        <Button type="submit" disabled={createStaff.isPending || !form.name || !form.email || !form.role_id} className="gap-2"><Check size={16} />{createStaff.isPending ? 'Đang tạo...' : 'Tạo và gửi lời mời'}</Button>
      </div>
    </form>}
  </Modal>
}
