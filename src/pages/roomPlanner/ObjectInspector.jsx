import { Copy, RotateCcw, Trash2 } from 'lucide-react'
import { formatDimension } from '../../lib/format'
import { describeModelFidelity } from '../../features/roomPlanner/modelFidelity'
import { rotatedHalfExtents } from '../../features/roomPlanner/collision'

const fieldClass = 'w-full rounded-control border border-border bg-surface px-2 py-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ObjectInspector({ item, room, onTransform, onDelete, onResetTransform, onDuplicate }) {
  if (!item) return <p className="text-sm leading-6 text-muted-foreground">Chọn một món trong phòng để xem kích thước và chỉnh vị trí.</p>
  const modelFidelity = describeModelFidelity(item.variant)
  const halfExtents = rotatedHalfExtents(
    item.footprint,
    item.scale ?? { x: 1, y: 1, z: 1 },
    item.rotation?.y ?? 0,
  )
  const position = item.position ?? { x: 0, y: 0, z: 0 }
  const clearances = room
    ? [
        room.width / 2 - (position.x + halfExtents.hx),
        room.width / 2 - (-position.x + halfExtents.hx),
        room.depth / 2 - (position.z + halfExtents.hz),
        room.depth / 2 - (-position.z + halfExtents.hz),
      ]
    : []
  const nearestClearance = clearances.length > 0 ? Math.max(0, Math.min(...clearances)) : null
  const fitsRoom = room
    ? halfExtents.hx * 2 <= room.width && halfExtents.hz * 2 <= room.depth
    : true
  const commitPosition = (axis, value) => {
    const number = Number(value)
    if (Number.isFinite(number)) onTransform(item.localId, { position: { ...item.position, [axis]: number } })
  }
  const commitRotation = (value) => {
    const degrees = Number(value)
    if (Number.isFinite(degrees)) onTransform(item.localId, { rotation: { ...item.rotation, y: degrees * Math.PI / 180 } })
  }

  return (
    <section aria-labelledby="object-inspector-title">
      <p className="text-xs font-medium text-muted-foreground">Vật thể đang chọn</p>
      <h2 id="object-inspector-title" className="mt-1 truncate text-base font-medium text-foreground">{item.variant.name}</h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{modelFidelity.text}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
        {[['Rộng', item.footprint.x], ['Cao', item.footprint.y], ['Sâu', item.footprint.z]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm tabular-nums text-foreground">{formatDimension(value, 'm')}</dd></div>)}
      </dl>
      {nearestClearance !== null && (
        <div className="mt-3 flex items-baseline justify-between gap-3 text-xs">
          <span className="text-muted-foreground">Khoảng trống gần tường nhất</span>
          <span className="shrink-0 font-medium tabular-nums text-foreground">{formatDimension(nearestClearance, 'm')}</span>
        </div>
      )}
      {!fitsRoom && (
        <p className="mt-3 rounded-control border border-border bg-surface-alt px-3 py-2 text-xs leading-5 text-muted-foreground">
          Kích thước món này lớn hơn mặt sàn phòng theo góc xoay hiện tại.
        </p>
      )}
      <fieldset className="mt-4"><legend className="text-xs font-medium text-muted-foreground">Vị trí trong phòng (m)</legend><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs text-muted-foreground">Ngang X<input aria-label="Vị trí ngang X" type="number" step="0.1" value={item.position.x} onChange={(event) => commitPosition('x', event.target.value)} className={fieldClass} /></label><label className="text-xs text-muted-foreground">Sâu Z<input aria-label="Vị trí sâu Z" type="number" step="0.1" value={item.position.z} onChange={(event) => commitPosition('z', event.target.value)} className={fieldClass} /></label></div></fieldset>
      <label className="mt-3 block text-xs font-medium text-muted-foreground">Góc xoay<input aria-label="Góc xoay" type="number" step="15" value={Math.round(item.rotation.y * 180 / Math.PI)} onChange={(event) => commitRotation(event.target.value)} className={fieldClass} /></label>
      <div className="mt-4 grid gap-2">
        <button type="button" onClick={onDuplicate} className="flex items-center justify-center gap-2 rounded-control border border-border py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Copy size={15} aria-hidden="true" /> Nhân bản</button>
        <button type="button" onClick={onResetTransform} className="flex items-center justify-center gap-2 rounded-control border border-border py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><RotateCcw size={15} aria-hidden="true" /> Đặt lại vị trí</button>
        <button type="button" onClick={onDelete} className="flex items-center justify-center gap-2 rounded-control border border-destructive/40 py-2 text-sm text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 size={15} aria-hidden="true" /> Xoá — có thể hoàn tác</button>
      </div>
    </section>
  )
}
