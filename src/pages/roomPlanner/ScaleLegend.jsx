// Chú thích tỉ lệ luôn hiện trong editor: kích thước phòng + "1 ô = 1 m" (lưới ô 1m).
// pointer-events-none để không cản thao tác canvas.
export function ScaleLegend({ room }) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 rounded-control border border-border bg-surface/85 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
      Phòng {room.width} × {room.depth} × {room.height} m · Lưới 1 m · Tự căn khi di chuyển (giữ Alt để đặt tự do)
    </div>
  )
}
