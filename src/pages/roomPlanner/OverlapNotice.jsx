import { AlertCircle } from 'lucide-react'
import { findOverlaps } from '../../features/roomPlanner/collision'

// Nhắc điềm tĩnh khi có món chồng nhau — KHÔNG chặn thao tác nào (undo/kéo-lại
// vốn rẻ). Giọng "warm guide": gợi ý, không báo động, không màu đỏ.
export function OverlapNotice({ items }) {
  const count = findOverlaps(items).size
  if (count === 0) return null
  return (
    <div className="flex items-start gap-2 rounded-control border border-border bg-surface-alt px-3 py-2 text-sm text-muted-foreground">
      <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{count} món đang chồng lên nhau. Kéo tách ra để phòng dễ hình dung hơn.</span>
    </div>
  )
}
