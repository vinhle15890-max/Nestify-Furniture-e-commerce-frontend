import { useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { useUpdateUserStatus } from '../../../features/admin/users/hooks'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'

// Nút khóa/mở-khóa một tài khoản + hộp thoại xác nhận. Ẩn trên hàng của chính
// người đang đăng nhập (BE cũng chặn tự-đổi-status, đây là lớp bảo vệ UX).
// onSuccess (tùy chọn): gọi sau khi đổi status thành công — dùng ở drawer để đóng
// panel, tránh hiển thị snapshot cũ (badge/nút không khớp trạng thái vừa đổi).
export function LockUserButton({ user, onSuccess }) {
  const currentUser = useAuthStore((state) => state.user)
  const updateStatus = useUpdateUserStatus()
  const addToast = useToastStore((state) => state.addToast)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (currentUser && user.id === currentUser.id) return null

  const isLocked = user.status === 'archived'
  const nextStatus = isLocked ? 'active' : 'archived'

  async function handleConfirm() {
    try {
      await updateStatus.mutateAsync({ id: user.id, status: nextStatus })
      addToast({ title: isLocked ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.', variant: 'success' })
      setConfirmOpen(false)
      onSuccess?.()
    } catch (err) {
      addToast({ title: err.message, variant: 'error' })
    }
  }

  return (
    <>
      <Button
        variant={isLocked ? 'secondary' : 'destructive'}
        className="px-3 py-1.5"
        aria-label={`${isLocked ? 'Mở khóa' : 'Khóa'} tài khoản ${user.name}`}
        onClick={() => setConfirmOpen(true)}
      >
        {isLocked ? <LockOpen size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
        {isLocked ? 'Mở khóa' : 'Khóa'}
      </Button>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
        description={`${user.name} · ${user.email}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {isLocked
              ? 'Tài khoản sẽ đăng nhập lại được bình thường.'
              : 'Người dùng sẽ bị đăng xuất ngay và không thể đăng nhập cho tới khi được mở khóa.'}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Hủy
            </Button>
            <Button
              variant={isLocked ? 'primary' : 'destructive'}
              onClick={handleConfirm}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending
                ? 'Đang xử lý...'
                : isLocked
                  ? 'Xác nhận mở khóa'
                  : 'Xác nhận khóa'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
