import { useState } from 'react'
import { BecomingModal } from '../../components/BecomingModal'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

const FIELDS = [
  { key: 'width', label: 'Chiều rộng (m)' },
  { key: 'depth', label: 'Chiều sâu (m)' },
  { key: 'height', label: 'Chiều cao (m)' },
]

export function RoomSetupDialog({ open, onOpenChange, initialRoom, onSubmit }) {
  const [values, setValues] = useState(initialRoom)
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    const parsed = {
      width: Number(values.width),
      depth: Number(values.depth),
      height: Number(values.height),
    }
    if (![parsed.width, parsed.depth, parsed.height].every((n) => Number.isFinite(n) && n > 0)) {
      setError('Kích thước phải lớn hơn 0.')
      return
    }
    onSubmit(parsed)
  }

  return (
    <BecomingModal open={open} onOpenChange={onOpenChange} title="Kích thước phòng">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit">Tạo phòng</Button>
        </div>
      </form>
    </BecomingModal>
  )
}
