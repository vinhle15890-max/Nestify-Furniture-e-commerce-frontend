import { Save, Undo2, Redo2, X } from 'lucide-react'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'

export function PlannerToolbar({ name, onNameChange, onSave, saving, dirty, onUndo, onRedo, canUndo, canRedo, onExit }) {
  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onExit} aria-label="Thoát Room Planner" className="shrink-0 rounded-control p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X size={20} aria-hidden="true" /></button>
        <label className="min-w-0">
          <span className="sr-only">Tên phòng</span>
          <input aria-label="Tên phòng" value={name} onChange={(event) => onNameChange(event.target.value)} className="w-full min-w-0 rounded-control border border-transparent bg-transparent px-2 py-1 text-base font-medium text-foreground hover:border-border focus-visible:border-border-strong focus-visible:outline-none" />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <span role="status" className="hidden text-xs text-muted-foreground sm:inline">{dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</span>
        <div className="flex items-center gap-1 border border-border p-1">
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Hoàn tác" className="rounded-control p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"><Undo2 size={16} aria-hidden="true" /></button>
          <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Làm lại" className="rounded-control p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"><Redo2 size={16} aria-hidden="true" /></button>
        </div>
        <Button type="button" variant="imagined" onClick={onSave} disabled={saving || !dirty}>{saving ? <Spinner label="Đang lưu" /> : <><Save size={16} aria-hidden="true" /> Lưu</>}</Button>
      </div>
    </header>
  )
}
