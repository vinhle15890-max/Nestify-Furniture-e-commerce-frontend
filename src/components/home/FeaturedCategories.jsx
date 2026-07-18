import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { useCategories } from '../../features/catalog/hooks'

// Home = "Not Yet Seen / Possibility" (State 1). Outline-stage tokens only
// (canvas / ink / unbuilt) — no warm imagined/confirmed colors here. A category
// with no image falls back to the unbuilt placeholder tile (the same "not-yet-
// decided" treatment ProductCard uses), which reads as a temporary image rather
// than a broken one.
function CategoryVisual({ category }) {
  const hasImage = Boolean(category.image_url)

  return (
    <>
      <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-unbuilt/40">
        {hasImage ? (
          <img
            src={category.image_url}
            alt={category.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
          />
        ) : (
          <ImageOff size={32} className="text-unbuilt" aria-hidden="true" />
        )}
      </div>
      {hasImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
      )}
      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className={`font-display text-2xl ${hasImage ? 'text-white' : 'text-ink'}`}>
          {category.name}
        </h3>
      </div>
    </>
  )
}

const CARD_CLASS =
  'group relative block overflow-hidden rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'

// ≤ 4 categories: the original full-width editorial grid.
function CategoryGrid({ items }) {
  return (
    <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((category, index) => (
        <Reveal
          key={category.id}
          as={Link}
          to={`/c/${category.slug}`}
          delay={index * 80}
          className={CARD_CLASS}
        >
          <CategoryVisual category={category} />
        </Reveal>
      ))}
    </div>
  )
}

// > 4 categories: a scroll-snap carousel with prev/next buttons. Buttons hide
// themselves at each end (and on touch-first small screens, where swiping is
// the natural gesture).
function CategoryCarousel({ items }) {
  const trackRef = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const updateArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanPrev(scrollLeft > 4)
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows])

  const scrollByDir = (dir) => {
    const el = trackRef.current
    if (!el || typeof el.scrollBy !== 'function') return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  const arrowClass =
    'absolute top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-unbuilt bg-canvas/90 p-3 text-ink shadow-sm backdrop-blur transition hover:bg-canvas disabled:pointer-events-none disabled:opacity-0 sm:flex'

  return (
    <div className="relative mt-14">
      <div
        ref={trackRef}
        aria-label="Danh sách danh mục"
        className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((category) => (
          <Link
            key={category.id}
            to={`/c/${category.slug}`}
            className={`${CARD_CLASS} w-[72%] flex-none snap-start sm:w-[calc(50%-0.625rem)] lg:w-[calc(25%-0.9375rem)]`}
          >
            <CategoryVisual category={category} />
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByDir(-1)}
        disabled={!canPrev}
        aria-label="Xem danh mục trước"
        className={`${arrowClass} left-0 -translate-x-1/2`}
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => scrollByDir(1)}
        disabled={!canNext}
        aria-label="Xem danh mục tiếp theo"
        className={`${arrowClass} right-0 translate-x-1/2`}
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  )
}

function CategorySkeleton() {
  return (
    <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] w-full animate-pulse rounded-card bg-unbuilt/40" />
      ))}
    </div>
  )
}

export function FeaturedCategories() {
  const { data, isLoading, isError } = useCategories()
  const items = data?.data ?? []

  // Failure Behavior: on error or an empty catalog, drop the section entirely so
  // the homepage keeps flowing — never a heading over an empty/broken grid.
  if (isError || (!isLoading && items.length === 0)) return null

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 lg:px-10">
      <SectionHeading
        eyebrow="Danh mục"
        title="Khám phá theo không gian"
        intro="Bắt đầu từ nơi bạn sống — chọn một không gian để hình dung."
      />
      {isLoading ? (
        <CategorySkeleton />
      ) : items.length > 4 ? (
        <CategoryCarousel items={items} />
      ) : (
        <CategoryGrid items={items} />
      )}
    </section>
  )
}
