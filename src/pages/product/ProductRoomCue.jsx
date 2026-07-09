import { BecomingRoomArt } from '../../components/BecomingRoomArt'
import { Button } from '../../components/Button'

/**
 * ProductRoomCue — the Product-Detail "Being Explored" motif (Design DNA §1;
 * Story Bible "Exploratory Commitment"): an outline room with a single furniture
 * silhouette, reminding the shopper the real act here is SEEING this piece in
 * their own space before deciding — not buying now.
 *
 * It reuses the page's existing Planner Preview via `onPreview`, so it adds no
 * new purchase path. Stays in State 1→2: outline only, no `imagined`/`confirmed`
 * color, no false urgency.
 */
export function ProductRoomCue({ productName, onPreview }) {
  return (
    <section className="mt-16 overflow-hidden rounded-card border border-border bg-unbuilt/15">
      <div className="grid grid-cols-1 items-center gap-8 p-8 md:grid-cols-[1.1fr_1fr] md:gap-12 md:p-12">
        <div>
          <p className="eyebrow">Thấy trước khi quyết định</p>
          <h2 className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2.2rem)] leading-tight text-foreground [text-wrap:balance]">
            {productName} sẽ trông thế nào trong căn phòng của bạn?
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            Đặt thử ngay trong chính không gian của bạn — nhìn rõ tỉ lệ và sự vừa vặn
            trước khi đưa ra quyết định.
          </p>
          <Button onClick={onPreview} className="mt-7 px-7 py-3">
            Xem trong không gian của bạn
          </Button>
        </div>
        <div className="pointer-events-none mx-auto w-full max-w-[420px]">
          <BecomingRoomArt level={2} />
        </div>
      </div>
    </section>
  )
}
