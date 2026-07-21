import { Frame, Ruler, Scan, Share2, ShoppingBag, Magnet, Move3d, RotateCw } from 'lucide-react'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'

const controlClass = 'flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function PlannerViewMenu({ snap, onToggleSnap, wallSnap, onToggleWallSnap, showScaleRef, onToggleScaleRef, onEnterRoomEdit }) {
  return (
    <section aria-label="Tùy chọn hiển thị" className="absolute left-4 top-4 z-10 w-48 border border-border bg-surface/95 p-2 shadow-sm">
      <p className="px-3 pb-1 pt-1 text-xs font-medium text-muted-foreground">Góc nhìn và căn chỉnh</p>
      <button type="button" onClick={onToggleSnap} aria-pressed={snap} aria-label="Snap" className={`${controlClass} ${snap ? 'bg-primary text-surface' : 'hover:bg-surface-alt'}`}><Magnet size={15} aria-hidden="true" /> Snap</button>
      <button type="button" onClick={onToggleWallSnap} aria-pressed={wallSnap} aria-label="Bắt tường" className={`${controlClass} ${wallSnap ? 'bg-primary text-surface' : 'hover:bg-surface-alt'}`}><Frame size={15} aria-hidden="true" /> Bắt tường</button>
      <button type="button" onClick={onToggleScaleRef} aria-pressed={showScaleRef} aria-label="Hiện mốc tỉ lệ người và cửa" className={`${controlClass} ${showScaleRef ? 'bg-primary text-surface' : 'hover:bg-surface-alt'}`}><Ruler size={15} aria-hidden="true" /> Mốc tỉ lệ</button>
      <button type="button" onClick={onEnterRoomEdit} aria-label="Chỉnh phòng" className={`${controlClass} hover:bg-surface-alt`}><Scan size={15} aria-hidden="true" /> Chỉnh phòng</button>
    </section>
  )
}

export function PlannerContextControls({ gizmoMode, onGizmoModeChange }) {
  return (
    <div aria-label="Điều khiển vật thể đang chọn" className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 border border-border bg-surface/95 p-1 shadow-sm">
      <button type="button" aria-label="Di chuyển. Phím tắt 1" aria-pressed={gizmoMode === 'translate'} onClick={() => onGizmoModeChange('translate')} className={`${controlClass} w-auto ${gizmoMode === 'translate' ? 'bg-primary text-surface' : 'hover:bg-surface-alt'}`}><Move3d size={15} aria-hidden="true" /> Di chuyển</button>
      <button type="button" aria-label="Xoay. Phím tắt 2" aria-pressed={gizmoMode === 'rotate'} onClick={() => onGizmoModeChange('rotate')} className={`${controlClass} w-auto ${gizmoMode === 'rotate' ? 'bg-primary text-surface' : 'hover:bg-surface-alt'}`}><RotateCw size={15} aria-hidden="true" /> Xoay</button>
    </div>
  )
}

export function PlannerCompletionArea({ onShare, sharing, onReview, reviewing, saving, itemCount }) {
  return (
    <section aria-label="Hoàn tất phòng" className="border-t border-border bg-surface p-4">
      <p className="mb-3 text-xs leading-5 text-muted-foreground">Khi bố cục đã rõ, bạn có thể chia sẻ hoặc xem lại toàn bộ phòng trước khi sang giỏ hàng.</p>
      <div className="grid gap-2">
        <Button type="button" variant="secondary" onClick={onShare} disabled={sharing || itemCount === 0}>
          {sharing ? <Spinner label="Đang tạo liên kết" /> : <><Share2 size={16} aria-hidden="true" /> Chia sẻ</>}
        </Button>
        <Button type="button" onClick={onReview} disabled={reviewing || saving || itemCount === 0}>
          {reviewing ? <Spinner label="Đang chuẩn bị" /> : <><ShoppingBag size={16} aria-hidden="true" /> Xem lại phòng</>}
        </Button>
      </div>
    </section>
  )
}
