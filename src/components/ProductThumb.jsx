import { useState } from 'react'
import { ImageOff } from 'lucide-react'

/**
 * Square product thumbnail for line items (cart, checkout, orders, wishlist).
 * Falls back to a quiet placeholder when there is no image or it fails to load.
 */
export function ProductThumb({ src, alt = '', size = 'h-16 w-16', className = '' }) {
  const [failed, setFailed] = useState(false)
  const base = `shrink-0 overflow-hidden rounded-control bg-surface-alt ${size} ${className}`

  if (!src || failed) {
    return (
      <div className={`${base} flex items-center justify-center`} aria-hidden="true">
        <ImageOff size={18} className="text-border-strong" />
      </div>
    )
  }

  return (
    <div className={base}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  )
}
