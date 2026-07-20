import { Link } from 'react-router-dom'
import { Heart, ImageOff } from 'lucide-react'
import { formatPrice, numericClassName } from '../../lib/format'

function productDifferentiator(product) {
  const attributes = product.attributes
  if (!attributes || Array.isArray(attributes) || typeof attributes !== 'object') return null

  const preferredKeys = ['material', 'chất liệu', 'dimensions', 'kích thước']
  const entry = Object.entries(attributes).find(([key, value]) => (
    preferredKeys.includes(key.toLocaleLowerCase('vi'))
      && ['string', 'number'].includes(typeof value)
      && String(value).trim()
  ))
  return entry ? `${entry[0]}: ${entry[1]}` : null
}

export function DiscoverProductUnit({ product }) {
  const differentiator = productDifferentiator(product)

  return (
    <article data-testid="discover-product-unit" className="group min-w-0">
      <Link
        to={`/p/${product.slug}`}
        aria-label={`Xem ${product.name}`}
        className="block aspect-[4/5] w-full overflow-hidden bg-unbuilt/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        {product.thumbnail ? (
          <img src={product.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:scale-[1.015]" />
        ) : (
          <span className="flex h-full w-full items-center justify-center" aria-hidden="true">
            <ImageOff size={28} className="text-unbuilt" />
          </span>
        )}
      </Link>

      <div className="mt-3 border-t border-unbuilt pt-3">
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/p/${product.slug}`}
            className="min-w-0 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <h2 className="line-clamp-2 text-sm font-medium leading-snug text-ink sm:text-base">{product.name}</h2>
          </Link>
          <Link
            to={`/p/${product.slug}`}
            aria-label={`Chọn phiên bản ${product.name} để lưu vào yêu thích`}
            className="shrink-0 rounded-control p-1 text-ink/55 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <Heart size={18} aria-hidden="true" />
          </Link>
        </div>
        <p className={`mt-1.5 text-sm text-ink/75 ${numericClassName}`}>Từ {formatPrice(product.base_price)}</p>
        {differentiator && <p className="mt-1 line-clamp-1 text-xs text-ink/55">{differentiator}</p>}
      </div>
    </article>
  )
}
