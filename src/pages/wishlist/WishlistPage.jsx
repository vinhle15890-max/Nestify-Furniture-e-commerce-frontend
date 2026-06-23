import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useWishlist,
  useUpdateWishlistItem,
  useRemoveWishlistItem,
  useMoveToCart,
} from '../../features/wishlist/hooks'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { formatPrice } from '../../lib/format'

export function WishlistPage() {
  const { data, isLoading } = useWishlist()
  const updateItem = useUpdateWishlistItem()
  const removeItem = useRemoveWishlistItem()
  const moveToCart = useMoveToCart()

  const [moveErrors, setMoveErrors] = useState({})

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl justify-center px-4 py-24">
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
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Sản phẩm yêu thích</h1>

      {items.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-muted-foreground">
            Danh sách yêu thích trống.{' '}
            <Link to="/" className="text-primary hover:underline">
              Tiếp tục mua sắm
            </Link>
          </p>
        </Card>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{item.variant?.name}</p>
                    <p className="text-sm text-muted-foreground">{item.variant?.sku}</p>
                    <p className="mt-1 text-sm text-foreground">{formatPrice(item.variant?.price)}</p>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={item.notify_on_restock}
                      onChange={(event) =>
                        updateItem.mutate({ itemId: item.id, notify_on_restock: event.target.checked })
                      }
                    />
                    Báo khi còn hàng
                  </label>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleMoveToCart(item)}
                      disabled={moveToCart.isPending}
                    >
                      Chuyển vào giỏ
                    </Button>
                    <Button variant="ghost" onClick={() => removeItem.mutate(item.id)}>
                      Xóa
                    </Button>
                  </div>
                </div>

                {moveErrors[item.id] !== undefined && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    Chỉ còn {moveErrors[item.id]} sản phẩm trong kho
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
