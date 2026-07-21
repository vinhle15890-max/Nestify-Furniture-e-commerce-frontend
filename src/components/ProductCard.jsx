import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { formatPrice } from '../lib/format'

// Product listing card — Discover / "Not Yet Seen" state (Component Bible
// Part 1, State 1): outline-stage tokens only (canvas / ink / unbuilt), no
// heavy shadow, none of the warmer state colors. Image tile placeholder is unbuilt.
export function ProductCard({ product }) {
  return (
    <Link
      to={`/p/${product.slug}`}
      className="group flex flex-col rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-card bg-unbuilt/40">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
          />
        ) : (
          <ImageOff size={28} className="text-unbuilt" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-4">
        <h3 className="text-lg font-medium leading-snug text-ink transition-colors duration-200 group-hover:text-ink/60">
          {product.name}
        </h3>
        <p className="mt-auto pt-1 text-base font-medium text-ink">{formatPrice(product.base_price)}</p>
      </div>
    </Link>
  )
}
