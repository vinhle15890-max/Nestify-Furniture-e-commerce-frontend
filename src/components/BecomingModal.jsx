import { ModalShell } from './ModalShell'

/**
 * Becoming-themed modal. Same shared shell as <Modal>, adding exactly one
 * thing: on Dialog.Content — so the portaled subtree
 * (which escapes the app-tree scope to document.body) resolves the Becoming
 * palette instead of :root legacy. The Overlay is a portal sibling of Content,
 * so it can't inherit that scope and takes the ink scrim token directly.
 *
 * Modal.jsx stays the legacy variant for admin dialogs; the shared a11y/
 * behaviour lives in ModalShell, so fixes there reach both.
 */
export function BecomingModal(props) {
  return (
    <ModalShell
      {...props}
      overlayClassName="fixed inset-0 z-50 bg-ink/40"
      contentClassName="text-ink"
      contentProps={{ 'data-theme': 'becoming' }}
    />
  )
}
