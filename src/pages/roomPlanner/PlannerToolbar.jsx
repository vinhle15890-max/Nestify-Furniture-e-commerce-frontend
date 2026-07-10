import { Move3d, RotateCw, Maximize, Save, ShoppingCart, ShoppingBag, Share2, Undo2, Redo2, Magnet, Frame, Ruler, Scan, X } from 'lucide-react'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'

const MODES = [
  { key: 'translate', label: 'Di chuyển', icon: Move3d },
  { key: 'rotate', label: 'Xoay', icon: RotateCw },
  { key: 'scale', label: 'Phóng to', icon: Maximize },
]

export function PlannerToolbar({
  name,
  onNameChange,
  gizmoMode,
  onGizmoModeChange,
  onSave,
  saving,
  dirty,
  onAddToCart,
  addingToCart,
  onOrder,
  ordering,
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

      <div className="flex items-center gap-2">
        {/* Undo / redo — mechanical, neutral. */}
        <div className="flex items-center gap-1 rounded-control border border-border p-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Hoàn tác"
            title="Hoàn tác (Ctrl+Z)"
            className="rounded-control p-1.5 text-foreground transition-colors hover:bg-surface-alt disabled:opacity-40"
          >
            <Undo2 size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Làm lại"
            title="Làm lại (Ctrl+Shift+Z)"
            className="rounded-control p-1.5 text-foreground transition-colors hover:bg-surface-alt disabled:opacity-40"
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
                title={`${mode.label} (${index + 1})`}
                className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors ${
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
            title="Bắt điểm 0.25m / 15°"
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors ${
              snap ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'
            }`}
          >
            <Magnet size={15} aria-hidden="true" /> Snap
          </button>
          <button
            type="button"
            onClick={onToggleWallSnap}
            aria-pressed={wallSnap}
            title="Hút cạnh món áp sát tường khi thả gần (≤ 0.5m)"
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors ${
              wallSnap ? 'bg-primary text-surface' : 'text-foreground hover:bg-surface-alt'
            }`}
          >
            <Frame size={15} aria-hidden="true" /> Bắt tường
          </button>
          <button
            type="button"
            onClick={onToggleScaleRef}
            aria-pressed={showScaleRef}
            title="Bóng người 1.7m + cửa làm mốc tỉ lệ"
            className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition-colors ${
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
            title="Chỉnh kích thước phòng & tường (nhìn từ trên)"
            className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-alt"
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
        {/* Mechanical handoff to Cart — NOT `imagined` (Save keeps the single imagined
            peak). The imagined *feeling* carries into the Cart callback, not this button. */}
        <Button
          type="button"
          variant="primary"
          onClick={onAddToCart}
          disabled={addingToCart || saving || itemCount === 0}
        >
          {addingToCart ? <Spinner label="Đang thêm" /> : <><ShoppingCart size={16} /> Thêm vào giỏ</>}
        </Button>
        {/* Express path: carry the room into the existing checkout. `primary`, never
            `confirmed` — the Checkout confirm stays the only Committed-state moment. */}
        <Button type="button" variant="primary" onClick={onOrder} disabled={ordering || itemCount === 0}>
          {ordering ? <Spinner label="Đang chuẩn bị" /> : <><ShoppingBag size={16} /> Đặt cả phòng</>}
        </Button>
      </div>
    </div>
  )
}
