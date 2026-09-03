/* Hallmark · component: product card · genre: editorial · theme: Nestify Design DNA */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 · contrast/mobile/tokens: pass */
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Heart, ImageOff } from 'lucide-react'
import { formatPrice } from '../lib/format'
import { formLevelMessage } from '../lib/formErrors'
import { queryClient } from '../lib/queryClient'
import { isStaff } from '../lib/roles'
import * as wishlistApi from '../features/wishlist/api'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'

// Product listing card — Discover / "Not Yet Seen" state (Component Bible
// Part 1, State 1): outline-stage tokens only (canvas / ink / unbuilt), no
// heavy shadow, none of the warmer state colors. Image tile placeholder is unbuilt.
export function ProductCard({ product }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, user } = useAuthStore()
  const addToast = useToastStore((state) => state.addToast)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  // Public catalog responses already contain active variants. Save the same
  // lowest-priced variant represented by the card's base price so discovery
  // does not force a purchase-time option choice.
  const wishlistVariant = product.variants
    ?.filter((variant) => variant.is_active !== false)
    .reduce((selected, variant) => {
      if (!selected || Number(variant.price) < Number(selected.price)) return variant
      if (Number(variant.price) === Number(selected.price) && variant.id < selected.id) return variant
      return selected
    }, null)
  async function handleWishlist() {
    if (!token) {
      navigate('/login', { state: { from: location } })
      return
    }

    if (isStaff(user) || !wishlistVariant || saved) return

    setSaving(true)
    try {
      await wishlistApi.addItem({ variant_id: wishlistVariant.id })
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    } catch (error) {
      addToast({
        title: 'Không thể thêm vào yêu thích',
        description: formLevelMessage(error),
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="relative flex flex-col">
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
          <h3 className="pr-12 text-lg font-medium leading-snug text-ink transition-colors duration-200 group-hover:text-ink/60">
            {product.name}
          </h3>
          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1 tabular-nums">
            <p className="text-base font-medium text-ink">{formatPrice(product.base_price)}</p>
            {wishlistVariant?.is_on_sale && Number(wishlistVariant.regular_price) > Number(product.base_price) && (
              <del className="text-sm text-ink/50">{formatPrice(wishlistVariant.regular_price)}</del>
            )}
          </div>
        </div>
      </Link>
      {wishlistVariant && !isStaff(user) && (
        <button
          type="button"
          aria-label={`${saved ? 'Đã thêm' : 'Thêm'} ${product.name} vào yêu thích`}
          aria-pressed={saved}
          disabled={saving || saved}
          onClick={handleWishlist}
          className="absolute bottom-7 right-0 inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-unbuilt/40 active:bg-unbuilt/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-default disabled:opacity-60"
        >
          <Heart size={19} className={saved ? 'fill-current' : ''} aria-hidden="true" />
        </button>
      )}
    </article>
  )
}
