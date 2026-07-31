import { Box, Ruler, Scan, Share2, ShoppingBag, Move3d, RotateCw, Square } from 'lucide-react'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
const controlClass = 'flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function PlannerViewMenu({ viewMode, onViewModeChange, showScaleRef, onToggleScaleRef, onEnterRoomEdit }) {
  return (
    <section aria-label="Công cụ xem phòng" className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] items-center gap-1 overflow-x-auto border border-border bg-surface/95 p-1 shadow-sm">
      <button type="button" onClick={() => onViewModeChange('perspective')} aria-pressed={viewMode === 'perspective'} aria-label="Góc nhìn trong phòng" className={`${controlClass} w-auto whitespace-nowrap ${viewMode === 'perspective' ? 'bg-primary text-primary-foreground' : 'hover:bg-surface-alt'}`}><Box size={15} aria-hidden="true" /> Trong phòng</button>
      <button type="button" onClick={() => onViewModeChange('top')} aria-pressed={viewMode === 'top'} aria-label="Nhìn từ trên" className={`${controlClass} w-auto whitespace-nowrap ${viewMode === 'top' ? 'bg-primary text-primary-foreground' : 'hover:bg-surface-alt'}`}><Square size={15} aria-hidden="true" /> Từ trên</button>
      <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
      <button type="button" onClick={onEnterRoomEdit} aria-label="Chỉnh kích thước phòng" className={`${controlClass} w-auto whitespace-nowrap hover:bg-surface-alt`}><Scan size={15} aria-hidden="true" /> Kích thước</button>
      <button type="button" onClick={onToggleScaleRef} aria-pressed={showScaleRef} aria-label="Hiện mốc tỉ lệ người và cửa" className={`${controlClass} w-auto whitespace-nowrap ${showScaleRef ? 'bg-primary text-primary-foreground' : 'hover:bg-surface-alt'}`}><Ruler size={15} aria-hidden="true" /> Mốc người</button>
    </section>
  )
}

export function PlannerContextControls({ gizmoMode, onGizmoModeChange }) {
  return (
    <div aria-label="Điều khiển vật thể đang chọn" className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 border border-border bg-surface/95 p-1 shadow-sm">
      <div className="flex items-center justify-center gap-1">
        <button type="button" aria-label="Di chuyển. Phím tắt 1" aria-pressed={gizmoMode === 'translate'} onClick={() => onGizmoModeChange('translate')} className={`${controlClass} w-auto ${gizmoMode === 'translate' ? 'bg-primary text-primary-foreground' : 'hover:bg-surface-alt'}`}><Move3d size={15} aria-hidden="true" /> Di chuyển</button>
        <button type="button" aria-label="Xoay. Phím tắt 2" aria-pressed={gizmoMode === 'rotate'} onClick={() => onGizmoModeChange('rotate')} className={`${controlClass} w-auto ${gizmoMode === 'rotate' ? 'bg-primary text-primary-foreground' : 'hover:bg-surface-alt'}`}><RotateCw size={15} aria-hidden="true" /> Xoay</button>
      </div>
      <p className="px-2 pb-1 pt-0.5 text-center text-[11px] leading-4 text-muted-foreground">
        {gizmoMode === 'translate' ? 'Kéo trực tiếp món đồ · Phím mũi tên để căn chính xác' : 'Kéo vòng xoay · phím [ ] để xoay 15°'}
      </p>
    </div>
  )
}

export function PlannerCompletionArea({ onShare, sharing, onReview, reviewing, saving, itemCount }) {
  return (
    <section aria-label="Hoàn tất phòng" className="border-t border-border bg-surface p-4">
      <p className="mb-3 text-xs leading-5 text-muted-foreground">Khi căn phòng đã gần với điều bạn hình dung, hãy xem lại các món trước khi chuyển sang giỏ hàng.</p>
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
