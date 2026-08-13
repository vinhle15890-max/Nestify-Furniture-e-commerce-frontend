import { formatDimension } from '../../lib/format'

const ratio = (value, total) => `${Math.min(100, Math.max(2, (value / total) * 100))}%`

export function DimensionComparisonFallback({ room, items }) {
  return (
    <section aria-labelledby="dimension-fallback-title" className="h-full overflow-y-auto bg-canvas p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-medium text-emerging">Độ vừa vặn</p>
        <h1 id="dimension-fallback-title" className="mt-2 font-display text-2xl text-foreground">Xem món đồ chiếm bao nhiêu chỗ</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Thiết bị này chưa thể mở căn phòng trực quan. Bạn vẫn có thể so sánh kích thước món đồ với chiều rộng và chiều sâu của phòng.</p>
        <div className="mt-6 border border-border bg-surface p-4">
          <p className="text-sm font-medium text-foreground">Phòng {formatDimension(room.width, 'm')} × {formatDimension(room.depth, 'm')}</p>
          <div className="mt-4 h-2 w-full bg-unbuilt" aria-hidden="true"><div className="h-full bg-emerging" style={{ width: ratio(0.9, room.width) }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">Mốc cửa tiêu chuẩn tham khảo: rộng 0,9 m</p>
        </div>
        {items.length === 0 ? <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">Chưa có món nào trong phòng. Hãy mở lại liên kết trên máy tính để tiếp tục thử nội thất.</p> : (
          <ul className="mt-6 space-y-5">
            {items.map((item) => {
              if (!item.footprintConfirmed) {
                return <li key={item.localId} className="border-t border-border pt-4"><h2 className="text-sm font-medium text-foreground">{item.variant.name}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Kích thước của món này chưa được xác nhận nên Nestify chưa dùng khối tạm thời để tính độ vừa vặn.</p></li>
              }
              const semanticWidth = Number(item.variant.width_cm) / 100
              const semanticDepth = Number(item.variant.depth_cm) / 100
              const hasSemanticDimensions = item.variant.model_scale_confirmed === true
                && Number.isFinite(semanticWidth) && semanticWidth > 0
                && Number.isFinite(semanticDepth) && semanticDepth > 0
              const occupied = Math.min(100, (item.footprint.x * item.footprint.z) / (room.width * room.depth) * 100)
              const shownWidth = hasSemanticDimensions ? semanticWidth : item.footprint.x
              const shownDepth = hasSemanticDimensions ? semanticDepth : item.footprint.z
              return <li key={item.localId} className="border-t border-border pt-4"><div className="flex items-baseline justify-between gap-4"><h2 className="text-sm font-medium text-foreground">{item.variant.name}</h2><span className="text-xs tabular-nums text-muted-foreground">{occupied.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% mặt sàn</span></div><p className="mt-1 text-xs text-muted-foreground">{formatDimension(shownWidth, 'm')} rộng × {formatDimension(shownDepth, 'm')} sâu</p><div className="mt-3 space-y-2"><div><span className="text-xs text-muted-foreground">Phần chiếm theo chiều ngang phòng</span><div className="mt-1 h-2 bg-unbuilt"><div className="h-full bg-primary" style={{ width: ratio(item.footprint.x, room.width) }} /></div></div><div><span className="text-xs text-muted-foreground">Phần chiếm theo chiều sâu phòng</span><div className="mt-1 h-2 bg-unbuilt"><div className="h-full bg-primary" style={{ width: ratio(item.footprint.z, room.depth) }} /></div></div></div></li>
            })}
          </ul>
        )}
        <p className="mt-8 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">Kích thước và màu sắc trên màn hình giúp bạn hình dung trước; hãy đối chiếu thông tin sản phẩm trước khi quyết định.</p>
      </div>
    </section>
  )
}
