import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { Heart } from 'lucide-react'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { formatPrice } from '../../lib/format'
import { useProduct, useProductReviews } from '../../features/catalog/hooks'
import { useAddCartItem } from '../../features/cart/hooks'
import { useAddWishlistItem } from '../../features/wishlist/hooks'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { useToastStore } from '../../store/toastStore'

export function ProductPage() {
  const { productSlug } = useParams()
  const { data, isLoading } = useProduct(productSlug)
  const product = data?.data
  const token = useAuthStore((state) => state.token)
  const openCart = useUiStore((state) => state.openCart)
  const addToast = useToastStore((state) => state.addToast)
  const addCartItem = useAddCartItem()
  const addWishlistItem = useAddWishlistItem()
  const [stockError, setStockError] = useState(null)

  const media = useMemo(
    () => [...(product?.media ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [product],
  )
  const variants = product?.variants ?? []

  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!product) return
    setSelectedMediaIndex(0)
    setSelectedVariantId(product.variants?.[0]?.id ?? null)
    setQuantity(1)
  }, [product])

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0]
  const price = selectedVariant?.price ?? product?.base_price
  const availableStock = selectedVariant?.available_stock ?? 0
  const outOfStock = availableStock < 1

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(current, 1), Math.max(availableStock, 1)))
  }, [availableStock])

  useEffect(() => {
    setStockError(null)
  }, [selectedVariantId])

  function handleAddToCart() {
    addCartItem.mutate(
      { variant_id: selectedVariant.id, quantity },
      {
        onSuccess: () => {
          setStockError(null)
          addToast({ title: 'Đã thêm vào giỏ hàng', variant: 'success' })
          openCart()
        },
        onError: (error) => {
          if (error.code === 'INSUFFICIENT_STOCK') {
            const available = error.details?.available ?? 0
            setStockError(available)
            setQuantity(Math.max(available, 1))
          } else {
            addToast({ title: 'Không thể thêm vào giỏ hàng', description: error.message, variant: 'error' })
          }
        },
      },
    )
  }

  function handleAddToWishlist() {
    addWishlistItem.mutate(
      { variant_id: selectedVariant.id },
      {
        onSuccess: () => addToast({ title: 'Đã thêm vào yêu thích', variant: 'success' }),
        onError: (error) => addToast({ title: 'Không thể thêm vào yêu thích', description: error.message, variant: 'error' }),
      },
    )
  }

  const reviewsQuery = useProductReviews(productSlug)
  const reviews = useMemo(
    () => reviewsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [reviewsQuery.data],
  )

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl justify-center px-4 py-24">
        <Spinner />
      </div>
    )
  }

  if (!product) return null

  const activeMedia = media[selectedMediaIndex]
  const sanitizedDescription = DOMPurify.sanitize(product.description ?? '')

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {product.category && (
        <Link to={`/c/${product.category.slug}`} className="text-sm text-muted-foreground hover:text-primary">
          {product.category.name}
        </Link>
      )}

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-card border border-border bg-background">
            {activeMedia &&
              (activeMedia.type === 'video' ? (
                <video src={activeMedia.url} controls className="h-full w-full object-cover" />
              ) : (
                <img src={activeMedia.url} alt={product.name} className="h-full w-full object-cover" />
              ))}
          </div>

          {media.length > 1 && (
            <div className="mt-3 flex gap-2">
              {media.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedMediaIndex(index)}
                  aria-label={`Xem ${item.type === 'video' ? 'video' : 'ảnh'} ${index + 1}`}
                  className={`h-16 w-16 overflow-hidden rounded-control border ${
                    index === selectedMediaIndex ? 'border-primary' : 'border-border'
                  }`}
                >
                  {item.type === 'video' ? (
                    <video src={item.url} className="h-full w-full object-cover" />
                  ) : (
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl text-foreground">{product.name}</h1>
          <p className="mt-2 text-2xl font-medium text-primary">{formatPrice(price)}</p>

          {variants.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-foreground">Phiên bản</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    aria-pressed={variant.id === selectedVariant?.id}
                    className={`rounded-control border px-3 py-2 text-sm ${
                      variant.id === selectedVariant?.id
                        ? 'border-primary text-primary'
                        : 'border-border text-foreground hover:border-primary'
                    }`}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            {outOfStock ? 'Hết hàng' : `Còn ${availableStock} sản phẩm`}
          </p>

          {selectedVariant?.model_3d_url && (
            <a
              href={selectedVariant.model_3d_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-primary hover:underline"
            >
              Xem mô hình 3D
            </a>
          )}

          <div className="mt-6 flex items-center gap-4">
            <label className="flex flex-col gap-1 text-sm text-foreground">
              Số lượng
              <input
                type="number"
                min={1}
                max={Math.max(stockError ?? availableStock, 1)}
                value={quantity}
                disabled={outOfStock}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  const max = Math.max(stockError ?? availableStock, 1)
                  setQuantity(Math.min(Math.max(next, 1), max))
                }}
                className="w-20 rounded-control border border-border bg-surface px-3 py-2"
              />
            </label>

            {token ? (
              <>
                <Button onClick={handleAddToCart} disabled={outOfStock || addCartItem.isPending}>
                  Thêm vào giỏ
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Thêm vào yêu thích"
                  onClick={handleAddToWishlist}
                  disabled={addWishlistItem.isPending}
                >
                  <Heart size={18} />
                </Button>
              </>
            ) : (
              <Link to="/login" className="text-sm text-primary hover:underline">
                Đăng nhập để mua hàng
              </Link>
            )}
          </div>

          {stockError !== null && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              Chỉ còn {stockError} sản phẩm trong kho
            </p>
          )}

          {sanitizedDescription && (
            <div
              className="prose mt-8 max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          )}
        </div>
      </div>

      <section className="mt-16">
        <h2 className="font-display text-2xl text-foreground">Đánh giá</h2>

        {reviews.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Chưa có đánh giá nào.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-card border border-border bg-surface p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{review.user?.name}</p>
                  <p className="text-sm text-muted-foreground">{review.rating}/5</p>
                </div>
                {review.title && <p className="mt-1 font-medium text-foreground">{review.title}</p>}
                <p className="mt-1 text-sm text-foreground">{review.body}</p>
              </li>
            ))}
          </ul>
        )}

        {reviewsQuery.hasNextPage && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => reviewsQuery.fetchNextPage()}
              disabled={reviewsQuery.isFetchingNextPage}
            >
              {reviewsQuery.isFetchingNextPage ? 'Đang tải...' : 'Tải thêm đánh giá'}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
