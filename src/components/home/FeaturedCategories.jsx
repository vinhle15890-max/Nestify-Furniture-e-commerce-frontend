import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, ImageOff } from 'lucide-react'
import { SectionHeading } from './SectionHeading'
import { Reveal } from '../Reveal'
import { useCategories } from '../../features/catalog/hooks'

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

const CHILD_PREVIEW_LIMIT = 4

// Home = "Not Yet Seen / Possibility" (State 1). Parent categories remain the
// visual entry points; child categories are quieter, explicit paths so the
// complete catalog is visible without flattening its hierarchy.
function CategoryVisual({ category }) {
  const hasImage = Boolean(category.image_url)

  return (
    <>
      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-unbuilt/40">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
        <h3 className={`font-display text-2xl ${hasImage ? 'text-white' : 'text-ink'}`}>
          {category.name}
        </h3>
        <ArrowUpRight
          size={20}
          className={hasImage ? 'shrink-0 text-white' : 'shrink-0 text-ink'}
          aria-hidden="true"
        />
      </div>
    </>
  )
}

const PARENT_LINK_CLASS =
  'group relative block overflow-hidden rounded-card active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'

function CategoryGroup({ category, index }) {
  const children = category.children ?? []
  const [isExpanded, setIsExpanded] = useState(false)
  const childListId = useId()
  const hasMoreChildren = children.length > CHILD_PREVIEW_LIMIT
  const visibleChildren = isExpanded ? children : children.slice(0, CHILD_PREVIEW_LIMIT)
  const hiddenCount = children.length - CHILD_PREVIEW_LIMIT

  return (
    <Reveal as="article" delay={index * 80} className="min-w-0">
      <Link to={`/c/${category.slug}`} className={PARENT_LINK_CLASS}>
        <CategoryVisual category={category} />
      </Link>

      {children.length > 0 && (
        <>
          <div className="mt-4 flex items-center justify-between gap-4 px-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink/50">
              {children.length} loại nội thất
            </p>
          </div>

          <ul
            id={childListId}
            aria-label={`Danh mục con của ${category.name}`}
            className="mt-1 divide-y divide-unbuilt/70"
          >
            {visibleChildren.map((child) => (
              <li key={child.id}>
                <Link
                  to={`/c/${child.slug}`}
                  className="group/child flex min-h-12 items-center justify-between gap-4 rounded-sm px-1 py-3 text-sm font-medium text-ink/75 transition-colors hover:text-ink active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  <span>{child.name}</span>
                  <ArrowUpRight
                    size={16}
                    className="shrink-0 text-unbuilt transition-transform group-hover/child:-translate-y-0.5 group-hover/child:translate-x-0.5 group-hover/child:text-ink"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>

          {hasMoreChildren && (
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={childListId}
              onClick={() => setIsExpanded((current) => !current)}
              className="mt-2 flex min-h-12 w-full items-center justify-between gap-4 rounded-sm px-1 text-sm font-medium text-ink transition-colors hover:text-ink/65 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <span>{isExpanded ? 'Thu gọn' : `Xem thêm ${hiddenCount} danh mục`}</span>
              <ChevronDown
                size={17}
                className={`shrink-0 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>
          )}
        </>
      )}
    </Reveal>
  )
}

function CategorySlider({ items }) {
  const trackRef = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const updateControls = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    setCanPrev(track.scrollLeft > 4)
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    updateControls()
    track.addEventListener('scroll', updateControls, { passive: true })
    window.addEventListener('resize', updateControls)

    return () => {
      track.removeEventListener('scroll', updateControls)
      window.removeEventListener('resize', updateControls)
    }
  }, [updateControls])

  const move = (direction) => {
    const track = trackRef.current
    if (!track || typeof track.scrollBy !== 'function') return

    track.scrollBy({
      left: direction * track.clientWidth * 0.82,
      behavior: 'smooth',
    })
  }

  const controlClass =
    'flex size-12 items-center justify-center rounded-full border border-unbuilt text-ink transition-colors hover:bg-unbuilt/20 active:opacity-70 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'

  return (
    <nav aria-label="Toàn bộ danh mục sản phẩm" className="mt-10">
      <div className="mb-5 flex items-center justify-between gap-6">
        <p className="text-sm text-ink/55">
          {items.length} không gian để khám phá
        </p>
        <div className="flex items-center gap-2" aria-label="Điều khiển danh mục">
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={!canPrev}
            aria-label="Xem danh mục trước"
            className={controlClass}
          >
            <ArrowLeft size={19} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={!canNext}
            aria-label="Xem danh mục tiếp theo"
            className={controlClass}
          >
            <ArrowRight size={19} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory items-start gap-6 overflow-x-auto scroll-smooth pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((category, index) => (
          <div
            key={category.id}
            className="w-[86%] min-w-0 flex-none snap-start sm:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]"
          >
            <CategoryGroup category={category} index={index} />
          </div>
        ))}
      </div>
    </nav>
  )
}

function CategoryDirectory({ items }) {
  if (items.length > 3) {
    return <CategorySlider items={items} />
  }

  return (
    <nav aria-label="Toàn bộ danh mục sản phẩm" className="mt-14">
      <div className="grid items-start gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((category, index) => (
          <CategoryGroup key={category.id} category={category} index={index} />
        ))}
      </div>
    </nav>
  )
}

function CategorySkeleton() {
  return (
    <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[4/3] w-full animate-pulse rounded-card bg-unbuilt/40" />
          <div className="mt-3 h-12 animate-pulse rounded-sm bg-unbuilt/25" />
          <div className="mt-px h-12 animate-pulse rounded-sm bg-unbuilt/25" />
        </div>
      ))}
    </div>
  )
}

export function FeaturedCategories() {
  const { data, isLoading, isError } = useCategories()
  const items = data?.data ?? []

  // Failure Behavior: on error or an empty catalog, drop the section entirely so
  // the homepage keeps flowing — never a heading over an empty/broken directory.
  if (isError || (!isLoading && items.length === 0)) return null

  return (
    <section data-home-section="categories" className="mx-auto max-w-7xl px-6 py-20 md:py-24 lg:px-10">
      <SectionHeading
        eyebrow="Mua theo không gian"
        title="Bắt đầu từ căn phòng bạn đang nghĩ tới"
        intro="Chọn một căn phòng, rồi đi thẳng đến loại nội thất bạn đang tìm."
      />
      {isLoading ? <CategorySkeleton /> : <CategoryDirectory items={items} />}
    </section>
  )
}
