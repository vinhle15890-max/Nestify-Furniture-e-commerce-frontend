import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'

export function ProductCard({ product }) {
  return (
    <Link
      to={`/p/${product.slug}`}
      className="group flex flex-col rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="aspect-[4/5] w-full overflow-hidden rounded-card bg-surface-alt">
        {product.thumbnail && (
          <img
            src={product.thumbnail}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-4">
        <h3 className="font-display text-lg leading-snug text-foreground transition-colors duration-200 group-hover:text-accent">
          {product.name}
        </h3>
        <p className="mt-auto pt-1 text-base font-medium text-foreground">{formatPrice(product.base_price)}</p>
      </div>
    </Link>
  )
}
