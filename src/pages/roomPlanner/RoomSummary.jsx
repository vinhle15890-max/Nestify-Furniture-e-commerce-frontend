import { summarizeItems } from '../../features/roomPlanner/summary'
import { formatPrice } from '../../lib/format'

// Bill-of-materials for the planner: what's in the room and what it costs. Pure
// clarity — neutral styling, honest about unknown prices (never fabricates one).
export function RoomSummary({ items }) {
  const { lines, total, hasUnpriced } = summarizeItems(items)
  if (lines.length === 0) return null

  return (
    <div className="shrink-0 rounded-card border border-border bg-surface p-3">
      <p className="mb-2 text-sm font-medium text-foreground">Tổng quan phòng</p>
      <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
        {lines.map((line) => (
          <li key={line.variantId} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {line.name} <span className="text-foreground">×{line.qty}</span>
            </span>
            <span className="shrink-0 tabular-nums text-foreground">
              {line.lineTotal === null ? '—' : formatPrice(line.lineTotal)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
        <span className="text-sm font-medium text-foreground">Tổng tạm tính</span>
        <span className="tabular-nums text-base font-medium text-foreground">{formatPrice(total)}</span>
      </div>
      {hasUnpriced && (
        <p className="mt-1.5 text-xs text-muted-foreground">Tạm tính chưa gồm các món chưa có giá.</p>
      )}
    </div>
  )
}
