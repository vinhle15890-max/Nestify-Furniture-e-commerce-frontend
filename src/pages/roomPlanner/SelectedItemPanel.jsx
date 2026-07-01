import { RotateCcw, Trash2 } from 'lucide-react'

export function SelectedItemPanel({ item, onDelete, onResetTransform }) {
  if (!item) return null
  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <p className="mb-3 truncate text-sm font-medium text-foreground">{item.variant.name}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onResetTransform}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-border py-2 text-sm text-foreground hover:border-border-strong"
        >
          <RotateCcw size={15} aria-hidden="true" /> Đặt lại vị trí
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-destructive/40 py-2 text-sm text-destructive hover:bg-destructive/5"
        >
          <Trash2 size={15} aria-hidden="true" /> Xoá
        </button>
      </div>
    </div>
  )
}
