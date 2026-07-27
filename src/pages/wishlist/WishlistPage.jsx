import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import {
  useWishlist,
  useUpdateWishlistItem,
  useRemoveWishlistItem,
  useMoveToCart,
} from '../../features/wishlist/hooks'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { BecomingRoomArt } from '../../components/BecomingRoomArt'
import { formatPrice } from '../../lib/format'

function getSavedVariantDetails(variant) {
  const attributes = variant?.attributes

  if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
    const details = Object.entries(attributes)
      .filter(([name, value]) => name && value !== null && value !== undefined && value !== '')
      .map(([name, value]) => `${name}: ${String(value)}`)

    if (details.length > 0) return details
  }

  return variant?.name ? [variant.name] : []
}

export function WishlistPage() {
  const wishlistQuery = useWishlist()
  const { data, isLoading, isError, isFetching } = wishlistQuery
  const updateItem = useUpdateWishlistItem()
  const removeItem = useRemoveWishlistItem()
  const moveToCart = useMoveToCart()

  const [moveErrors, setMoveErrors] = useState({})

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto flex max-w-4xl justify-center px-6 py-32">
          <Spinner />
        </div>
      </div>
    )
  }

  if (isError && !data?.data) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Sản phẩm yêu thích</h1>
          <LoadErrorState
            title="Chưa thể tải sản phẩm yêu thích"
            description="Danh sách đã lưu chưa tải được. Hãy thử lại để tiếp tục cân nhắc các lựa chọn của bạn."
            onRetry={() => wishlistQuery.refetch()}
            isRetrying={isFetching}
            className="mt-10"
          />
        </div>
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
    <div className="min-h-screen bg-canvas text-ink">
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Sản phẩm yêu thích</h1>

      {isError && data?.data && (
        <LoadErrorState
          title="Chưa cập nhật được danh sách mới nhất"
          description="Đang hiển thị các sản phẩm đã tải trước đó."
          onRetry={() => wishlistQuery.refetch()}
          isRetrying={isFetching}
          compact
          background
          className="mt-6"
        />
      )}

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-card border border-border bg-surface px-6 py-14 text-center">
          <div className="pointer-events-none w-full max-w-[300px]">
            <BecomingRoomArt level={1} />
          </div>
          <p className="mt-6 max-w-sm text-muted-foreground">
            Chưa có món nào được lưu — những điều bạn yêu thích sẽ tụ về đây.
          </p>
          <Link
            to="/c/all"
            className="mt-4 text-sm text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <ul className="mt-10 flex flex-col divide-y divide-border">
          {items.map((item) => {
            const savedVariantDetails = getSavedVariantDetails(item.variant)

            return (
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
                        className="text-lg font-medium text-foreground transition-colors duration-200 hover:text-accent"
                      >
                        {item.variant?.product_name ?? item.variant?.name}
                      </Link>
                    ) : (
                      <p className="text-lg font-medium text-foreground">{item.variant?.product_name ?? item.variant?.name}</p>
                    )}
                    {savedVariantDetails.length > 0 && (
                      <div aria-label="Biến thể đã lưu" className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Biến thể đã lưu</span>
                        {savedVariantDetails.map((detail) => (
                          <span
                            key={detail}
                            className="rounded-control border border-border px-2 py-0.5 text-xs text-foreground"
                          >
                            {detail}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.variant?.sku && <p className="mt-1 text-xs text-muted-foreground">Mã: {item.variant.sku}</p>}
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
            )
          })}
        </ul>
      )}
    </div>
    </div>
  )
}
