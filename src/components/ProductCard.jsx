import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'

export function ProductCard({ product }) {
  return (
    <Link
      to={`/p/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-soft transition-transform duration-200 ease-out hover:-translate-y-1"
    >
      <div className="aspect-square w-full overflow-hidden bg-background">
        {product.thumbnail && (
          <img
            src={product.thumbnail}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.category?.name && (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.category.name}</p>
        )}
        <h3 className="font-display text-lg text-foreground">{product.name}</h3>
        <p className="mt-auto text-base font-medium text-primary">{formatPrice(product.base_price)}</p>
      </div>
    </Link>
  )
}
