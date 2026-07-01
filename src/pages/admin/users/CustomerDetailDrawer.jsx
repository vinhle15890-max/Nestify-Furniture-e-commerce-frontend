import * as Dialog from '@radix-ui/react-dialog'
import { X, BadgeCheck, Clock, UserCog } from 'lucide-react'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { RoleBadge } from '../../../components/RoleBadge'
import { UserCell } from './UserCell'
import { LockUserButton } from './LockUserButton'

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{children}</span>
    </div>
  )
}

// Slide-over with a customer's details + the quick "Promote to employee" action.
// Promotion is delegated upward (onPromote) so the role dialog opens cleanly after the
// drawer closes, avoiding stacked overlays.
export function CustomerDetailDrawer({ user, open, onOpenChange, onPromote }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-sm flex-col bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <Dialog.Title className="font-display text-xl text-foreground">Chi tiết khách hàng</Dialog.Title>
            <Dialog.Description className="sr-only">Thông tin tài khoản khách hàng.</Dialog.Description>
            <Dialog.Close
              aria-label="Đóng"
              className="cursor-pointer rounded-control text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <X size={20} />
            </Dialog.Close>
          </div>

          {user && (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <UserCell user={user} />

              <div className="mt-6">
                <Field label="Trạng thái">
                  <Badge tone={user.status === 'active' ? 'in-stock' : 'neutral'}>
                    {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                  </Badge>
                </Field>
                <Field label="Email">
                  {user.email_verified_at ? (
                    <span className="inline-flex items-center gap-1 text-secondary">
                      <BadgeCheck size={15} /> Đã xác thực
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock size={15} /> Chưa xác thực
                    </span>
                  )}
                </Field>
                <Field label="Vai trò">
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {(user.roles ?? []).length > 0 ? (
                      user.roles.map((role) => <RoleBadge key={role} role={role} />)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </Field>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-border px-6 py-5">
            <Button onClick={() => onPromote(user)} className="w-full gap-2">
              <UserCog size={16} />
              Thăng thành nhân viên
            </Button>
            {user && <LockUserButton user={user} onSuccess={() => onOpenChange(false)} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
