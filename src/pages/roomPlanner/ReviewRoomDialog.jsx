import { BecomingModal } from '../../components/BecomingModal'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { RoomSummary } from './RoomSummary'
import { formatPrice, formatStock } from '../../lib/format'

export function ReviewRoomDialog({ open, onOpenChange, items, review, loading, error, onContinue, pending }) {
  const canContinue = review?.can_continue === true
  return (
    <BecomingModal open={open} onOpenChange={onOpenChange} title="Xem lại phòng" description="Kiểm tra các món bạn đã đặt trước khi chuyển sang giỏ hàng.">
      <RoomSummary items={items} />
      {loading && <p role="status" className="mt-4 text-sm text-muted-foreground">Đang kiểm tra giá và tình trạng hiện tại…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">Chưa thể kiểm tra tình trạng sản phẩm. Hãy thử đóng và mở lại phần xem phòng.</p>}
      {review?.items && <ul className="mt-5 divide-y divide-border border-y border-border">{review.items.map((item) => <li key={item.placement_id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3"><div><p className="text-sm font-medium text-foreground">{item.product_name}</p><p className="text-xs text-muted-foreground">{item.variant_name ?? 'Phiên bản không còn khả dụng'} · {formatStock(item.available_stock)}</p>{!item.purchasable && <p className="mt-1 text-xs text-destructive">{item.reason === 'out_of_stock' ? 'Tạm hết hàng — cần bỏ món này trước khi tiếp tục.' : 'Sản phẩm này không còn được bán.'}</p>}</div><span className="text-sm tabular-nums text-foreground">{item.price == null ? '—' : formatPrice(item.price)}</span></li>)}</ul>}
      <div className="mt-6 flex justify-end">
        <Button type="button" onClick={onContinue} disabled={pending || loading || !canContinue}>
          {pending ? <Spinner label="Đang chuẩn bị giỏ hàng" /> : 'Tiếp tục đến giỏ hàng'}
        </Button>
      </div>
    </BecomingModal>
  )
}
