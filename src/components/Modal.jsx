import { ModalShell } from './ModalShell'

/**
 * Public modal (legacy palette). Thin wrapper over the shared ModalShell —
 * same props/behaviour as before the extraction, so existing consumers
 * (incl. admin dialogs) need no changes. Customer-facing, becoming-scoped
 * dialogs use <BecomingModal> instead.
 */
export function Modal(props) {
  return <ModalShell {...props} />
}
