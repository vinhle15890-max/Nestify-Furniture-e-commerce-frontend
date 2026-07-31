import { Link } from 'react-router-dom'
import { BecomingRoomArt } from '../components/BecomingRoomArt'
import { SeoHead } from '../components/SeoHead'

/**
 * 404 — reframed through the signature motif: a room that hasn't been built yet.
 * The empty outline turns a dead-end into an invitation back into the world,
 * rather than a bare error message.
 */
export function NotFoundPage() {
  return (
    <div className="bg-canvas text-ink">
      <SeoHead title="Không tìm thấy trang | Nestify" description="Trang bạn tìm không tồn tại." noindex />
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
        <div className="pointer-events-none w-full max-w-[360px]">
          <BecomingRoomArt level={1} />
        </div>
        <p className="mt-8 eyebrow">Lỗi 404</p>
        <h1 className="mt-4 font-display text-[clamp(1.9rem,4vw,3rem)] leading-tight text-ink">
          Căn phòng này chưa được dựng.
        </h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-ink/70">
          Trang bạn tìm không tồn tại — nhưng không gian của bạn thì luôn sẵn sàng để bắt đầu.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/"
            className="rounded-control bg-ink px-6 py-3 text-sm font-medium tracking-wide text-canvas transition-colors duration-200 ease-out hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Về trang chủ
          </Link>
          <Link
            to="/c/all"
            className="rounded-control border border-ink/25 px-6 py-3 text-sm font-medium tracking-wide text-ink transition-colors duration-200 ease-out hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      </div>
    </div>
  )
}
