import { formatDimension } from '../../lib/format'

const ratio = (value, total) => `${Math.min(100, Math.max(2, (value / total) * 100))}%`

export function DimensionComparisonFallback({ room, items }) {
  return (
    <section aria-labelledby="dimension-fallback-title" className="h-full overflow-y-auto bg-canvas p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-medium text-emerging">So sánh kích thước 2D</p>
        <h1 id="dimension-fallback-title" className="mt-2 font-display text-2xl text-foreground">Xem món đồ chiếm bao nhiêu chỗ</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Thiết bị này chưa thể mở không gian 3D. Các thanh dưới đây dùng kích thước phòng và footprint hiện có để bạn vẫn có thể đánh giá độ vừa vặn.</p>
        <div className="mt-6 border border-border bg-surface p-4">
          <p className="text-sm font-medium text-foreground">Phòng {formatDimension(room.width, 'm')} × {formatDimension(room.depth, 'm')}</p>
          <div className="mt-4 h-2 w-full bg-unbuilt" aria-hidden="true"><div className="h-full bg-emerging" style={{ width: ratio(0.9, room.width) }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">Mốc cửa tiêu chuẩn tham khảo: rộng 0,9 m</p>
        </div>
        {items.length === 0 ? <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">Chưa có món nào trong phòng. Hãy mở lại liên kết trên thiết bị hỗ trợ 3D để thêm nội thất.</p> : (
          <ul className="mt-6 space-y-5">
            {items.map((item) => {
              const occupied = Math.min(100, (item.footprint.x * item.footprint.z) / (room.width * room.depth) * 100)
              return <li key={item.localId} className="border-t border-border pt-4"><div className="flex items-baseline justify-between gap-4"><h2 className="text-sm font-medium text-foreground">{item.variant.name}</h2><span className="text-xs tabular-nums text-muted-foreground">{occupied.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% mặt sàn</span></div><p className="mt-1 text-xs text-muted-foreground">{formatDimension(item.footprint.x, 'm')} rộng × {formatDimension(item.footprint.z, 'm')} sâu</p><div className="mt-3 space-y-2"><div><span className="text-xs text-muted-foreground">So với chiều rộng phòng</span><div className="mt-1 h-2 bg-unbuilt"><div className="h-full bg-primary" style={{ width: ratio(item.footprint.x, room.width) }} /></div></div><div><span className="text-xs text-muted-foreground">So với chiều sâu phòng</span><div className="mt-1 h-2 bg-unbuilt"><div className="h-full bg-primary" style={{ width: ratio(item.footprint.z, room.depth) }} /></div></div></div></li>
            })}
          </ul>
        )}
        <p className="mt-8 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">Kích thước này phản ánh dữ liệu Planner đang có; Nestify không coi đây là xác nhận model đúng màu, hoàn thiện hoặc đúng tỉ lệ nếu biến thể chưa cung cấp xác nhận đó.</p>
      </div>
    </section>
  )
}
