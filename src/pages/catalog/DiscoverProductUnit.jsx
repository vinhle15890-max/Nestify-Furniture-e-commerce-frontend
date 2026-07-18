import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ImageOff } from 'lucide-react'
import { formatPrice } from '../../lib/format'

export function DiscoverProductUnit({
  product,
  held,
  fieldHasHeld,
  onHold,
  onRelease,
  onToggle,
}) {
  const lastPointerType = useRef(null)
  const isNeighbor = fieldHasHeld && !held

  const handlePointerEnter = (event) => {
    if (event.pointerType !== 'touch') onHold()
  }

  const handlePointerLeave = (event) => {
    if (event.pointerType === 'touch') return
    if (!event.currentTarget.contains(document.activeElement)) onRelease()
  }

  const handleFocus = () => {
    if (lastPointerType.current !== 'touch') onHold()
  }

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) onRelease()
  }

  const handleMediaClick = () => {
    if (lastPointerType.current === 'touch') onToggle()
    else onHold()
    lastPointerType.current = null
  }

  return (
    <article
      data-testid="discover-product-unit"
      data-held={held ? 'true' : 'false'}
      data-neighbor={isNeighbor ? 'true' : 'false'}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDownCapture={(event) => {
        lastPointerType.current = event.pointerType
      }}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      className={`min-w-0 transition-[opacity] duration-300 motion-reduce:transition-none ${
        isNeighbor ? 'opacity-80' : 'opacity-100'
      } ${held ? 'mx-1 sm:mx-2' : 'mx-0'}`}
    >
      <button
        type="button"
        onClick={handleMediaClick}
        aria-pressed={held}
        aria-label={held ? `Bỏ ${product.name} khỏi tầm chú ý` : `Giữ ${product.name} trong tầm chú ý`}
        className="block aspect-[4/5] w-full overflow-hidden bg-unbuilt/35 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center" aria-hidden="true">
            <ImageOff size={28} className="text-unbuilt" />
          </span>
        )}
      </button>

      <div
        className={`border-t-2 transition-[margin,padding,border-color] duration-300 motion-reduce:transition-none ${
          held
            ? 'mt-5 border-ink pt-3'
            : 'mt-3 border-transparent pt-1'
        }`}
      >
        {held && (
          <p className="mb-1.5 text-[0.65rem] uppercase tracking-[0.15em] text-ink/50">
            Hình ảnh tham khảo
          </p>
        )}
        <Link
          to={`/p/${product.slug}`}
          className="group/link flex items-start justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <h2
            style={{ fontFamily: held ? 'var(--font-display)' : 'var(--font-sans)' }}
            className={`${
              held
                ? 'text-lg leading-snug text-ink sm:text-xl'
                : 'line-clamp-2 text-sm font-medium leading-snug text-ink/75 sm:text-base'
            }`}
          >
            {product.name}
          </h2>
          {held && <ArrowUpRight size={17} className="mt-1 shrink-0 text-ink/65" aria-hidden="true" />}
        </Link>
        {held && (
          <p className="mt-1.5 text-sm tabular-nums text-ink/70">
            {formatPrice(product.base_price)}
          </p>
        )}
      </div>
    </article>
  )
}
