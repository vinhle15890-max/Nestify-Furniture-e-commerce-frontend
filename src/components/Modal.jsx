import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export function Modal({ open, onOpenChange, title, description, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card bg-surface p-6 shadow-soft">
          {title && <Dialog.Title className="font-display text-xl text-foreground">{title}</Dialog.Title>}
          {description && (
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
          <Dialog.Close
            aria-label="Đóng"
            className="absolute right-4 top-4 cursor-pointer rounded-control text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
