import { useEffect, useState } from 'react'
import { AlertCircle, Move, Plus, RotateCw, Trash2, X } from 'lucide-react'
import { Button } from '../../components/Button'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

const DIMENSIONS = [
  { key: 'width', label: 'Chiều rộng', min: 2, max: 30 },
  { key: 'depth', label: 'Chiều sâu', min: 2, max: 30 },
  { key: 'height', label: 'Chiều cao', min: 2, max: 5 },
]

const fieldClass =
  'mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const OBSTACLE_LABELS = { restricted: 'Vùng không đặt đồ', door_swing: 'Cửa mở' }

export function RoomEditPanel() {
  const room = useEditorStore((state) => state.room)
  const itemCount = useEditorStore((state) => state.items.length)
  const resizeRoom = useEditorStore((state) => state.resizeRoom)
  const setEditMode = useEditorStore((state) => state.setEditMode)
  const obstacles = useEditorStore((state) => state.obstacles)
  const addObstacle = useEditorStore((state) => state.addObstacle)
  const updateObstacle = useEditorStore((state) => state.updateObstacle)
  const removeObstacle = useEditorStore((state) => state.removeObstacle)
  const selectedObstacleId = useEditorStore((state) => state.selectedObstacleId)
  const selectObstacle = useEditorStore((state) => state.selectObstacle)
  const obstacleGizmoMode = useEditorStore((state) => state.obstacleGizmoMode)
  const setObstacleGizmoMode = useEditorStore((state) => state.setObstacleGizmoMode)
  const [values, setValues] = useState(room)
  const [error, setError] = useState('')

  useEffect(() => setValues(room), [room])

  const close = () => setEditMode('furnish')
  const apply = (event) => {
    event.preventDefault()
    const dimensions = Object.fromEntries(
      DIMENSIONS.map(({ key }) => [key, Number(values[key])]),
    )
    const invalid = DIMENSIONS.find(
      ({ key, min, max }) =>
        !Number.isFinite(dimensions[key]) || dimensions[key] < min || dimensions[key] > max,
    )
    if (invalid) {
      setError(`${invalid.label} phải nằm trong khoảng ${invalid.min}–${invalid.max} m.`)
      return
    }
    resizeRoom(dimensions)
    close()
  }

  return (
    <form
      aria-label="Chỉnh kích thước phòng"
      onSubmit={apply}
      className="absolute right-4 top-4 z-10 max-h-[calc(100dvh-2rem)] w-72 overflow-y-auto border border-border bg-surface/95 p-4 shadow-sm backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Kích thước phòng</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Nhập kích thước thực tế theo mét.
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Đóng chỉnh kích thước"
          className="flex size-9 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {DIMENSIONS.map(({ key, label, min, max }) => (
          <label key={key} className="text-xs font-medium text-muted-foreground" htmlFor={`edit-room-${key}`}>
            {label} (m)
            <input
              id={`edit-room-${key}`}
              type="number"
              step="0.1"
              min={min}
              max={max}
              value={values[key]}
              onChange={(event) => {
                setError('')
                setValues((current) => ({ ...current, [key]: event.target.value }))
              }}
              className={fieldClass}
            />
          </label>
        ))}
      </div>

      {itemCount > 0 && (
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          Nếu phòng nhỏ lại, những món nằm sát mép sẽ được đưa vào trong để không xuyên tường.
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}

      <section className="mt-5 border-t border-border pt-4" aria-labelledby="obstacle-heading">
        <p id="obstacle-heading" className="text-sm font-medium text-foreground">Vùng cản trên sàn</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Thêm vùng, rồi kéo trực tiếp trên mặt bằng. Bấm một vùng để chọn lại.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            ['restricted', 'Vùng không đặt đồ'], ['door_swing', 'Cửa mở'],
          ].map(([type, label]) => (
            <button key={type} type="button" onClick={() => addObstacle(type)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-border px-2 text-xs text-foreground hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Plus size={14} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        {obstacles.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Cách chỉnh vùng cản">
            <button type="button" aria-pressed={obstacleGizmoMode === 'translate'} onClick={() => setObstacleGizmoMode('translate')} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${obstacleGizmoMode === 'translate' ? 'border-ink bg-ink text-canvas' : 'border-border text-foreground'}`}><Move size={14} aria-hidden="true" /> Di chuyển</button>
            <button type="button" aria-pressed={obstacleGizmoMode === 'rotate'} onClick={() => setObstacleGizmoMode('rotate')} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${obstacleGizmoMode === 'rotate' ? 'border-ink bg-ink text-canvas' : 'border-border text-foreground'}`}><RotateCw size={14} aria-hidden="true" /> Xoay</button>
          </div>
        )}
        <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
          {obstacles.map((obstacle, index) => (
            <fieldset key={obstacle.id} onClick={() => selectObstacle(obstacle.id)} className={`p-3 ${selectedObstacleId === obstacle.id ? 'border-2 border-ink bg-surface-alt/50' : 'border border-border'}`}>
              <legend className="px-1 text-xs font-medium text-foreground">{OBSTACLE_LABELS[obstacle.type]} {index + 1}{selectedObstacleId === obstacle.id ? ' · đang chọn' : ''}</legend>
              {obstacle.type === 'door_swing' && <p className="mb-2 text-[11px] leading-4 text-muted-foreground">Chấm đậm là bản lề; kéo chấm lại gần mép phòng để tự dính vào tường. Đường thẳng là cửa đóng, cung tròn là khoảng cửa quét qua.</p>}
              {obstacle.type === 'restricted' && <p className="mb-2 text-[11px] leading-4 text-muted-foreground">Đánh dấu mọi phần mặt bằng cần để trống: cột, sàn khuyết, lối đi hoặc vùng thao tác.</p>}
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['x', 'X (m)', 0.1], ['z', 'Z (m)', 0.1],
                  ...(obstacle.type === 'door_swing' ? [] : [['width', 'Rộng (m)', 0.1], ['depth', 'Sâu (m)', 0.1]]),
                ].map(([key, label, step]) => (
                  <label key={key} className="text-[11px] text-muted-foreground">{label}
                    <input type="number" step={step} min={key === 'width' || key === 'depth' ? 0.1 : undefined} value={obstacle[key]} onChange={(event) => updateObstacle(obstacle.id, { [key]: Number(event.target.value) })} className="mt-1 h-9 w-full rounded-control border border-border bg-surface px-2 text-xs tabular-nums text-foreground" />
                  </label>
                ))}
              </div>
              {obstacle.type === 'door_swing' && <label className="mt-2 block text-[11px] text-muted-foreground">Rộng cánh cửa (m)<input type="number" step="0.1" min="0.1" value={obstacle.width} onChange={(event) => { const radius = Number(event.target.value); updateObstacle(obstacle.id, { width: radius, depth: radius }) }} className="mt-1 h-9 w-full rounded-control border border-border bg-surface px-2 text-xs tabular-nums text-foreground" /></label>}
              <div className="mt-2 flex items-end gap-2">
                <label className="flex-1 text-[11px] text-muted-foreground">Góc (°)
                  <input type="number" step="15" value={Math.round((obstacle.rotation * 180) / Math.PI)} onChange={(event) => updateObstacle(obstacle.id, { rotation: (Number(event.target.value) * Math.PI) / 180 })} className="mt-1 h-9 w-full rounded-control border border-border bg-surface px-2 text-xs tabular-nums text-foreground" />
                </label>
                <button type="button" aria-label={`Xoá vùng ${index + 1}`} onClick={() => removeObstacle(obstacle.id)} className="flex size-9 items-center justify-center rounded-control border border-destructive/40 text-destructive"><Trash2 size={14} aria-hidden="true" /></button>
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 mt-5 grid grid-cols-2 gap-2 border-t border-border bg-surface px-4 pb-1 pt-3">
        <Button type="button" variant="secondary" onClick={close}>Huỷ</Button>
        <Button type="submit">Áp dụng</Button>
      </div>
    </form>
  )
}
