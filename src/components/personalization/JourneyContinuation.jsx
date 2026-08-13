import { ArrowRight, Box, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useJourneyContext } from '../../features/personalization/hooks'
import { isStaff } from '../../lib/roles'
import { useAuthStore } from '../../store/authStore'
import { ProductCard } from '../ProductCard'

const DISCOVERY_LIMIT = 4

function customerFirstName(name) {
  return name?.trim().split(/\s+/).at(-1) || 'bạn'
}

function JourneyContent({ user }) {
  const journeyQuery = useJourneyContext()
  const context = journeyQuery.data?.data
  const continuation = context?.continuation
  const latestScene = continuation?.type === 'room' ? continuation.room : null
  const latestViewed = continuation?.type === 'product' ? continuation.product : null
  const wishlistCount = context?.signals?.wishlist_count ?? 0
  const discoveries = (context?.discovery ?? []).slice(0, DISCOVERY_LIMIT)
  const discoveryCategory = discoveries[0]?.reason?.category?.slug

  if (journeyQuery.isLoading) {
    return (
      <section aria-label="Đang chuẩn bị hành trình của bạn" className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div role="status" className="h-48 rounded-card bg-unbuilt/25">
          <span className="sr-only">Đang chuẩn bị hành trình của bạn…</span>
        </div>
      </section>
    )
  }

  if (!context?.enabled || !continuation) return null

  return (
    <section data-home-section="personalized" aria-labelledby="journey-title" className="bg-surface-alt/45 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="eyebrow">Tiếp nối</p>
          <h2 id="journey-title" className="mt-2 font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight text-foreground">
            {customerFirstName(user?.name)}, tiếp tục từ nơi bạn đã dừng lại
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
            Những gì bạn đã tạo, lưu và xem gần đây được giữ cùng nhau để lần quay lại này rõ ràng hơn.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]">
          {latestScene ? (
            <article className="grid min-w-0 overflow-hidden rounded-card border border-border bg-canvas sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="aspect-[4/3] bg-unbuilt/30 sm:aspect-auto">
                {latestScene.preview_url ? (
                  <img src={latestScene.preview_url} alt={`Phòng ${latestScene.name}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full min-h-48 items-center justify-center"><Box aria-hidden="true" size={38} strokeWidth={1.25} className="text-muted-foreground" /></div>
                )}
              </div>
              <div className="flex min-w-0 flex-col justify-between p-6 sm:p-8">
                <div>
                  <p className="text-sm text-muted-foreground">Không gian gần nhất</p>
                  <h3 className="mt-2 font-display text-2xl text-foreground">{latestScene.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {latestScene.items?.length ?? 0} món đang được đặt trong phòng. Bạn có thể mở lại và tiếp tục thử mà không mất bố cục đã lưu.
                  </p>
                </div>
                <Link to={`/room-planner/${latestScene.id}`} className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap border-b-2 border-foreground pb-1 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  Mở lại phòng <ArrowRight aria-hidden="true" size={16} />
                </Link>
              </div>
            </article>
          ) : latestViewed ? (
            <article className="rounded-card border border-border bg-canvas p-6 sm:p-8">
              <p className="text-sm text-muted-foreground">Điểm bạn vừa dừng lại</p>
              <h3 className="mt-2 font-display text-2xl text-foreground">{latestViewed?.name}</h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Xem lại thông tin, biến thể và kích thước trước khi quyết định có thử món này trong phòng hay không.</p>
              <Link to={`/p/${latestViewed.slug}`} className="mt-7 inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 border-foreground pb-1 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                Xem lại sản phẩm <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </article>
          ) : (
            <article className="rounded-card border border-border bg-canvas p-6 sm:p-8">
              <p className="text-sm text-muted-foreground">Những điều bạn đang giữ lại</p>
              <h3 className="mt-2 font-display text-2xl text-foreground">Các lựa chọn đang cân nhắc</h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Mở lại danh sách đã lưu để so sánh hoặc thử một món trong căn phòng của bạn.</p>
              <Link to="/account/wishlist" className="mt-7 inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 border-foreground pb-1 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                Xem các lựa chọn <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </article>
          )}

          <aside aria-label="Những lựa chọn đang cân nhắc" className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <Heart aria-hidden="true" size={20} className="text-muted-foreground" />
            <p className="mt-4 text-3xl tabular-nums text-foreground">{wishlistCount}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">lựa chọn bạn đang giữ lại để cân nhắc</p>
            <Link to="/account/wishlist" className="mt-6 inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-sm font-medium text-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Xem các lựa chọn <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </aside>
        </div>

        {discoveries.length > 0 && (
          <div className="mt-14 border-t border-border pt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-display text-2xl text-foreground">Có thể hợp với điều bạn đang xem</h3>
                <p className="mt-2 text-sm text-muted-foreground">Dựa trên danh mục của sản phẩm bạn xem gần nhất; các món đã xem hoặc đã lưu được loại khỏi đây.</p>
              </div>
              <Link to={`/c/${discoveryCategory}`} className="inline-flex min-h-11 w-fit items-center whitespace-nowrap text-sm text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Xem danh mục</Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
              {discoveries.map(({ product }) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export function JourneyContinuation() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const eligible = Boolean(token) && Boolean(user?.email_verified_at) && !isStaff(user)

  if (!eligible) return null
  return <JourneyContent user={user} />
}
