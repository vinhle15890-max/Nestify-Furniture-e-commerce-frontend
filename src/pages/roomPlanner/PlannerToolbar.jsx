import { Move3d, RotateCw, Maximize, Save, X } from 'lucide-react'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'

const MODES = [
  { key: 'translate', label: 'Di chuyển', icon: Move3d },
  { key: 'rotate', label: 'Xoay', icon: RotateCw },
  { key: 'scale', label: 'Phóng to', icon: Maximize },
]

export function PlannerToolbar({ name, onNameChange, gizmoMode, onGizmoModeChange, onSave, saving, dirty, onExit }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onExit} aria-label="Thoát" className="text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <input
          aria-label="Tên phòng"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="rounded-control border border-transparent bg-transparent px-2 py-1 text-base font-medium text-foreground hover:border-border focus-visible:border-border-strong focus-visible:outline-none"
        />
      </div>

      <div className="flex items-center gap-1 rounded-control border border-border p-1">
        {MODES.map((mode) => {
          const Icon = mode.icon
          const active = gizmoMode === mode.key
          return (
            <button
              key={mode.key}
              type="button"
              onClick={() => onGizmoModeChange(mode.key)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors ${
                active ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'
              }`}
            >
              <Icon size={15} aria-hidden="true" /> {mode.label}
            </button>
          )
        })}
      </div>

      <Button type="button" onClick={onSave} disabled={saving || !dirty}>
        {saving ? <Spinner label="Đang lưu" /> : <><Save size={16} /> Lưu</>}
      </Button>
    </div>
  )
}
