import { BecomingModal } from '../../components/BecomingModal'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { RoomSummary } from './RoomSummary'
import { formatPrice, formatStock } from '../../lib/format'

const reasonCopy = {
  out_of_stock: 'Tạm hết hàng — bạn có thể lưu lại để chờ hàng về.',
  discontinued: 'Sản phẩm này không còn được bán.',
}

export function ReviewRoomDialog({ open, onOpenChange, items, review, loading, error, onContinue, pending, onRemove, removingPlacementId, removeError, onSaveForLater, savingVariantId, savedVariantIds = [] }) {
  const canContinue = review?.can_continue === true
  return (
    <BecomingModal open={open} onOpenChange={onOpenChange} title="Xem lại phòng" description="Kiểm tra các món bạn đã đặt trước khi chuyển sang giỏ hàng.">
      <RoomSummary items={items} />
      {loading && <p role="status" className="mt-4 text-sm text-muted-foreground">Đang kiểm tra giá và tình trạng hiện tại…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">Chưa thể kiểm tra tình trạng sản phẩm. Hãy thử đóng và mở lại phần xem phòng.</p>}
      {review?.items && <ul className="mt-5 divide-y divide-border border-y border-border">{review.items.map((item) => {
        const removing = removingPlacementId === item.placement_id
        const canSaveForLater = item.reason === 'out_of_stock' && item.variant_id != null
        const saving = savingVariantId === item.variant_id
        const saved = savedVariantIds.includes(item.variant_id)
        return <li key={item.placement_id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3"><div className="min-w-0"><p className="text-sm font-medium text-foreground">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.variant_name ?? 'Phiên bản không còn khả dụng'} · {formatStock(item.available_stock)}</p>{!item.purchasable && <><p className="mt-1 text-xs text-destructive">{reasonCopy[item.reason] ?? 'Món này hiện chưa thể mua.'}</p><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">{canSaveForLater && <Button type="button" variant="secondary" className="min-h-11" aria-label={`Lưu ${item.product_name} vào yêu thích để chờ hàng`} disabled={saving || saved || pending} onClick={() => onSaveForLater?.(item.variant_id)}>{saving ? <Spinner label={`Đang lưu ${item.product_name}`} /> : saved ? 'Đã lưu để chờ hàng' : 'Lưu để chờ hàng'}</Button>}<Button type="button" variant="ghost" className="min-h-11 px-0 text-destructive hover:bg-transparent" aria-label={`Xóa ${item.product_name} khỏi phòng`} disabled={removing || pending} onClick={() => onRemove?.(item.placement_id)}>{removing ? <Spinner label={`Đang xóa ${item.product_name}`} /> : 'Xóa khỏi phòng'}</Button></div></>}</div><span className="text-sm tabular-nums text-foreground">{item.price == null ? '—' : formatPrice(item.price)}</span></li>
      })}</ul>}
      {removeError && <p role="alert" className="mt-3 text-sm text-destructive">{removeError}</p>}
      <div className="mt-6 flex justify-end">
        <Button type="button" onClick={onContinue} disabled={pending || loading || !canContinue}>
          {pending ? <Spinner label="Đang chuẩn bị giỏ hàng" /> : 'Tiếp tục đến giỏ hàng'}
        </Button>
      </div>
    </BecomingModal>
  )
}
