import { Minus, Plus } from 'lucide-react'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

const WALLS = [
  { side: 'back', label: 'Lưng' },
  { side: 'left', label: 'Trái' },
  { side: 'right', label: 'Phải' },
]

export function RoomEditPanel() {
  const room = useEditorStore((s) => s.room)
  const resizeRoom = useEditorStore((s) => s.resizeRoom)
  const toggleWall = useEditorStore((s) => s.toggleWall)
  const setEditMode = useEditorStore((s) => s.setEditMode)

  const round1 = (v) => Math.round(v * 10) / 10

  return (
    <div className="absolute left-4 top-4 flex flex-col gap-3 rounded-control border border-border bg-surface/95 p-3 text-sm text-foreground backdrop-blur-sm">
      <div className="font-medium">Đang chỉnh phòng</div>
      <div className="text-xs text-muted-foreground">
        Phòng {round1(room.width)} × {round1(room.depth)} × {round1(room.height)} m
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Chiều cao</span>
        <button type="button" aria-label="Giảm chiều cao" onClick={() => resizeRoom({ height: round1(room.height - 0.1) })} className="rounded-control border border-border p-1 hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Minus size={14} aria-hidden="true" />
        </button>
        <span className="w-10 text-center tabular-nums">{round1(room.height)}m</span>
        <button type="button" aria-label="Tăng chiều cao" onClick={() => resizeRoom({ height: round1(room.height + 0.1) })} className="rounded-control border border-border p-1 hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Tường</span>
        <div className="flex gap-1">
          {WALLS.map(({ side, label }) => {
            const on = room.walls?.[side] ?? true
            return (
              <button
                key={side}
                type="button"
                aria-label={`Bật/tắt tường ${label.toLowerCase()}`}
                aria-pressed={on}
                onClick={() => toggleWall(side)}
                className={`flex-1 rounded-control border px-2 py-1 text-xs transition-colors ${
                  on ? 'border-border-strong bg-surface-alt text-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <button type="button" onClick={() => setEditMode('furnish')} className="rounded-control border border-border-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-alt">
        Xong
      </button>
    </div>
  )
}
