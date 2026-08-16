import { Button } from './Button'
import { Modal } from './Modal'

/* Hallmark · component: confirmation dialog · genre: editorial · theme: existing Nestify
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: inherited from verified semantic tokens
 * pre-emit critique: P5 · H4 · E5 · S5 · R5 · V4
 */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  consequence,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Quay lại',
  onConfirm,
  pending = false,
  error,
  destructive = false,
}) {
  return (
    <Modal open={open} onOpenChange={(next) => !pending && onOpenChange(next)} title={title} description={description ?? 'Kiểm tra hậu quả trước khi tiếp tục.'}>
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-foreground">{consequence}</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>{cancelLabel}</Button>
          <Button type="button" variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} disabled={pending}>
            {pending ? 'Đang xử lý…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
