import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

/**
 * Internal shared Dialog shell — the single source of truth for the modal's
 * structure, a11y (Radix Dialog focus-trap / Escape / aria wiring via
 * Title+Description), and the Close affordance. NOT a public component: use
 * <Modal> (legacy palette) or <BecomingModal> (adds data-theme on Content).
 * Any future a11y/behaviour fix goes here and reaches both variants.
 *
 * Variants tune only what differs:
 *   overlayClassName — the scrim token (the Overlay is a portal sibling of
 *                      Content, so it can't inherit Content's data-theme).
 *   contentClassName — extra classes appended to Dialog.Content.
 *   contentProps     — extra props spread onto Dialog.Content (e.g. data-theme).
 */
export function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  overlayClassName = 'fixed inset-0 z-50 bg-foreground/40',
  contentClassName = '',
  bodyClassName = '',
  footer,
  footerClassName = '',
  contentProps,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClassName} />
        <Dialog.Content
          {...contentProps}
          className={`fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card bg-surface p-6 shadow-soft ${contentClassName}`}
        >
          {title && <Dialog.Title className="font-display text-xl text-foreground">{title}</Dialog.Title>}
          {description && (
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
          )}
          <div className={`mt-4 ${bodyClassName}`}>{children}</div>
          {footer && <div className={footerClassName}>{footer}</div>}
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
