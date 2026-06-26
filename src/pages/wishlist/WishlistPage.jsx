import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import {
  useWishlist,
  useUpdateWishlistItem,
  useRemoveWishlistItem,
  useMoveToCart,
} from '../../features/wishlist/hooks'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ProductThumb } from '../../components/ProductThumb'
import { formatPrice } from '../../lib/format'

export function WishlistPage() {
  const { data, isLoading } = useWishlist()
  const updateItem = useUpdateWishlistItem()
  const removeItem = useRemoveWishlistItem()
  const moveToCart = useMoveToCart()

  const [moveErrors, setMoveErrors] = useState({})

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl justify-center px-6 py-32">
        <Spinner />
      </div>
    )
  }

  const items = data?.data?.items ?? []

  function handleMoveToCart(item) {
    setMoveErrors((prev) => {
      const next = { ...prev }
      delete next[item.id]
      return next
    })
    moveToCart.mutate(item.id, {
      onError: (error) => {
        if (error.code === 'INSUFFICIENT_STOCK') {
          setMoveErrors((prev) => ({ ...prev, [item.id]: error.details?.available ?? 0 }))
        }
      },
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Sản phẩm yêu thích</h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-card border border-border bg-surface p-12 text-center">
          <Heart size={36} className="mx-auto text-border-strong" />
          <p className="mt-4 text-muted-foreground">
            Danh sách yêu thích trống.{' '}
            <Link to="/c/all" className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent">
              Tiếp tục mua sắm
            </Link>
          </p>
        </div>
      ) : (
        <ul className="mt-10 flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="py-6 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="flex min-w-0 items-center gap-4">
                  {item.variant?.product_slug ? (
                    <Link to={`/p/${item.variant.product_slug}`} className="rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                      <ProductThumb src={item.variant?.thumbnail} alt={item.variant?.product_name} size="h-20 w-20" />
                    </Link>
                  ) : (
                    <ProductThumb src={item.variant?.thumbnail} alt={item.variant?.product_name} size="h-20 w-20" />
                  )}
                  <div className="min-w-0">
                    {item.variant?.product_slug ? (
                      <Link
                        to={`/p/${item.variant.product_slug}`}
                        className="font-display text-lg text-foreground transition-colors duration-200 hover:text-accent"
                      >
                        {item.variant?.product_name ?? item.variant?.name}
                      </Link>
                    ) : (
                      <p className="font-display text-lg text-foreground">{item.variant?.product_name ?? item.variant?.name}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{item.variant?.name} · {item.variant?.sku}</p>
                    <p className="mt-1 text-sm text-foreground">{formatPrice(item.variant?.price)}</p>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={item.notify_on_restock}
                    onChange={(event) =>
                      updateItem.mutate({ itemId: item.id, notify_on_restock: event.target.checked })
                    }
                    className="accent-[var(--color-foreground)]"
                  />
                  Báo khi còn hàng
                </label>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => handleMoveToCart(item)} disabled={moveToCart.isPending}>
                    Chuyển vào giỏ
                  </Button>
                  <button
                    type="button"
                    onClick={() => removeItem.mutate(item.id)}
                    className="flex items-center gap-1.5 rounded-control px-2 text-sm text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Trash2 size={15} />
                    Xóa
                  </button>
                </div>
              </div>

              {moveErrors[item.id] !== undefined && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  Chỉ còn {moveErrors[item.id]} sản phẩm trong kho
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
