import { Move3d, RotateCw, Save, ShoppingBag, Share2, Undo2, Redo2, Magnet, Frame, Ruler, Scan, X } from 'lucide-react'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'

const MODES = [
  { key: 'translate', label: 'Di chuyển', icon: Move3d },
  { key: 'rotate', label: 'Xoay', icon: RotateCw },
]

export function PlannerToolbar({
  name,
  onNameChange,
  gizmoMode,
  onGizmoModeChange,
  onSave,
  saving,
  dirty,
  onReview,
  reviewing,
  onShare,
  sharing,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  snap,
  onToggleSnap,
  wallSnap,
  onToggleWallSnap,
  showScaleRef,
  onToggleScaleRef,
  itemCount,
  onExit,
  onEnterRoomEdit,
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onExit} aria-label="Thoát Room Planner" className="rounded-control text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X size={20} />
        </button>
        <input
          aria-label="Tên phòng"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="rounded-control border border-transparent bg-transparent px-2 py-1 text-base font-medium text-foreground hover:border-border focus-visible:border-border-strong focus-visible:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Undo / redo — mechanical, neutral. */}
        <div className="flex items-center gap-1 rounded-control border border-border p-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Hoàn tác"
            aria-description="Phím tắt Ctrl+Z"
            className="rounded-control p-1.5 text-foreground transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <Undo2 size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Làm lại"
            aria-description="Phím tắt Ctrl+Shift+Z"
            className="rounded-control p-1.5 text-foreground transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <Redo2 size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-control border border-border p-1">
          {MODES.map((mode, index) => {
            const Icon = mode.icon
            const active = gizmoMode === mode.key
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => onGizmoModeChange(mode.key)}
                aria-pressed={active}
                aria-label={`${mode.label}. Phím tắt ${index + 1}`}
                className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'
                }`}
              >
                <Icon size={15} aria-hidden="true" /> {mode.label}
              </button>
            )
          })}
        </div>

        {/* Nhóm hỗ trợ đặt món: bắt điểm lưới / bắt tường / mốc tỉ lệ. */}
        <div className="flex items-center gap-1 rounded-control border border-border p-1">
          <button
            type="button"
            onClick={onToggleSnap}
            aria-pressed={snap}
            aria-label="Snap"
            aria-description="Bắt điểm theo lưới 0,25 mét và góc 15 độ"
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              snap ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'
            }`}
          >
            <Magnet size={15} aria-hidden="true" /> Snap
          </button>
          <button
            type="button"
            onClick={onToggleWallSnap}
            aria-pressed={wallSnap}
            aria-label="Bắt tường"
            aria-description="Đưa cạnh sản phẩm vào tường khi ở gần"
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              wallSnap ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'
            }`}
          >
            <Frame size={15} aria-hidden="true" /> Bắt tường
          </button>
          <button
            type="button"
            onClick={onToggleScaleRef}
            aria-pressed={showScaleRef}
            aria-label="Hiện mốc tỉ lệ người và cửa"
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              showScaleRef ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'
            }`}
          >
            <Ruler size={15} aria-hidden="true" /> Tỉ lệ
          </button>
        </div>

        {/* Chuyển sang chế độ chỉnh kích thước/tường phòng (nhìn từ trên). */}
        <div className="flex items-center gap-1 rounded-control border border-border p-1">
          <button
            type="button"
            onClick={onEnterRoomEdit}
            aria-label="Chỉnh phòng"
            aria-description="Chỉnh kích thước và tường ở góc nhìn từ trên"
            className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Scan size={15} aria-hidden="true" /> Chỉnh phòng
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mechanical action — neutral styling; never `imagined` (Save keeps the single imagined peak). */}
        <Button type="button" variant="secondary" onClick={onShare} disabled={sharing || itemCount === 0}>
          {sharing ? <Spinner label="Đang tạo link" /> : <><Share2 size={16} /> Chia sẻ</>}
        </Button>
        {/* State 3 peak (Mentally Real): saving the room is the one valid `imagined` CTA. */}
        <Button type="button" variant="imagined" onClick={onSave} disabled={saving || !dirty}>
          {saving ? <Spinner label="Đang lưu" /> : <><Save size={16} /> Lưu</>}
        </Button>
        {/* Review is the only commerce exit so room contents stay visible before handoff. */}
        <Button
          type="button"
          variant="primary"
          onClick={onReview}
          disabled={reviewing || saving || itemCount === 0}
        >
          {reviewing ? <Spinner label="Đang chuẩn bị" /> : <><ShoppingBag size={16} /> Xem lại phòng</>}
        </Button>
      </div>
    </div>
  )
}
