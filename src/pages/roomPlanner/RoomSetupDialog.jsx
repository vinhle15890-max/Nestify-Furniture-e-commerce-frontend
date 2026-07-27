import { useState } from 'react'
import { BecomingModal } from '../../components/BecomingModal'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

const FIELDS = [
  { key: 'width', label: 'Chiều rộng (m)' },
  { key: 'depth', label: 'Chiều sâu (m)' },
  { key: 'height', label: 'Chiều cao (m)' },
]

const ROOM_TYPES = [
  { value: 'living_room', label: 'Phòng khách' },
  { value: 'bedroom', label: 'Phòng ngủ' },
  { value: 'dining_room', label: 'Phòng ăn' },
  { value: 'kitchen', label: 'Nhà bếp' },
  { value: 'workspace', label: 'Phòng làm việc' },
  { value: 'nursery', label: 'Phòng trẻ em' },
  { value: 'entryway', label: 'Lối vào' },
  { value: 'other', label: 'Không gian khác' },
]

export function RoomSetupDialog({ open, onOpenChange, initialRoom, onSubmit }) {
  const [values, setValues] = useState(() => ({
    ...initialRoom,
    roomType: initialRoom.roomType ?? 'living_room',
    name: initialRoom.name ?? 'Phòng khách',
  }))
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    const parsed = {
      name: values.name?.trim() ?? '',
      roomType: values.roomType,
      width: Number(values.width),
      depth: Number(values.depth),
      height: Number(values.height),
    }
    if (!parsed.name) {
      setError('Vui lòng đặt tên cho phòng.')
      return
    }
    if (![parsed.width, parsed.depth, parsed.height].every((n) => Number.isFinite(n) && n > 0)) {
      setError('Kích thước phải lớn hơn 0.')
      return
    }
    onSubmit(parsed)
  }

  return (
    <BecomingModal
      open={open}
      onOpenChange={onOpenChange}
      title="Kích thước phòng"
      description="Nhập kích thước để dựng căn phòng theo đúng tỷ lệ."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground" htmlFor="room-type">
            Loại phòng
            <select
              id="room-type"
              value={values.roomType}
              onChange={(event) => {
                const roomType = event.target.value
                const suggestedName = ROOM_TYPES.find((type) => type.value === roomType)?.label
                setValues((current) => ({ ...current, roomType, name: suggestedName ?? current.name }))
              }}
              className="min-h-11 rounded-control border border-unbuilt bg-canvas px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ROOM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground" htmlFor="room-name">
            Tên phòng
            <Input
              id="room-name"
              value={values.name}
              maxLength={255}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
        </div>
        <figure aria-labelledby="room-dimension-guide" className="rounded-card border border-unbuilt bg-canvas p-4">
          <figcaption id="room-dimension-guide" className="mb-3 text-sm font-medium text-foreground">Cách đo phòng</figcaption>
          <div className="relative mx-auto aspect-[2/1] max-w-sm" aria-hidden="true">
            <div className="absolute inset-x-[14%] bottom-[12%] top-[16%] border-b-2 border-l-2 border-r-2 border-foreground/55 [transform:skewY(-8deg)]" />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">Chiều rộng</span>
            <span className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground">Chiều cao</span>
            <span className="absolute right-0 top-[22%] text-xs text-muted-foreground">Chiều sâu</span>
          </div>
        </figure>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3" data-testid="room-dimension-fields">
          {FIELDS.map((field) => (
            <label key={field.key} className="flex flex-col gap-1.5 text-sm font-medium text-foreground" htmlFor={`room-${field.key}`}>
              {field.label}
              <Input
                id={`room-${field.key}`}
                type="number"
                step="0.1"
                value={values[field.key]}
                onChange={(event) => setValues((v) => ({ ...v, [field.key]: event.target.value }))}
              />
            </label>
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit">Tạo phòng</Button>
        </div>
      </form>
    </BecomingModal>
  )
}
