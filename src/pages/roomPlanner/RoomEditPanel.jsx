import { useEffect, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '../../components/Button'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

const DIMENSIONS = [
  { key: 'width', label: 'Chiều rộng', min: 2, max: 30 },
  { key: 'depth', label: 'Chiều sâu', min: 2, max: 30 },
  { key: 'height', label: 'Chiều cao', min: 2, max: 5 },
]

const fieldClass =
  'mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function RoomEditPanel() {
  const room = useEditorStore((state) => state.room)
  const itemCount = useEditorStore((state) => state.items.length)
  const resizeRoom = useEditorStore((state) => state.resizeRoom)
  const setEditMode = useEditorStore((state) => state.setEditMode)
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
      className="absolute right-4 top-4 z-10 w-72 border border-border bg-surface/95 p-4 shadow-sm backdrop-blur-sm"
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

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={close}>Huỷ</Button>
        <Button type="submit">Áp dụng</Button>
      </div>
    </form>
  )
}
