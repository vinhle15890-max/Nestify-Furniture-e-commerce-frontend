import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { Heart, Star, ChevronRight, Box } from 'lucide-react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { formatPrice, formatDate } from '../../lib/format'
import { useProduct, useProductReviews } from '../../features/catalog/hooks'
import { useAddCartItem } from '../../features/cart/hooks'
import { useAddWishlistItem } from '../../features/wishlist/hooks'
import { useOrders } from '../../features/orders/hooks'
import { useCreateReview, useCreateComment } from '../../features/reviews/hooks'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { useToastStore } from '../../store/toastStore'

export function ProductPage() {
  const { productSlug } = useParams()
  const { data, isLoading, isError } = useProduct(productSlug)
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
  const variants = useMemo(() => product?.variants ?? [], [product])

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

  const { data: ordersData } = useOrders({ enabled: !!token })
  const createReview = useCreateReview()
  const createComment = useCreateComment(productSlug)

  const [reviewRating, setReviewRating] = useState(0)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewBody, setReviewBody] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewError, setReviewError] = useState(null)
  const [commentDrafts, setCommentDrafts] = useState({})

  const variantIds = useMemo(() => new Set(variants.map((variant) => variant.id)), [variants])
  const verifiedOrder = useMemo(
    () =>
      ordersData?.data?.find(
        (order) => order.status === 'delivered' && order.items.some((item) => variantIds.has(item.variant_id)),
      ),
    [ordersData, variantIds],
  )

  async function handleSubmitReview(event) {
    event.preventDefault()
    setReviewError(null)
    try {
      await createReview.mutateAsync({
        productId: product.id,
        order_id: verifiedOrder.id,
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        body: reviewBody.trim(),
      })
      setReviewSubmitted(true)
    } catch (error) {
      setReviewError(error.message)
    }
  }

  function handleSubmitComment(event, reviewId) {
    event.preventDefault()
    const body = (commentDrafts[reviewId] ?? '').trim()
    if (!body) return

    createComment.mutate(
      { reviewId, body },
      { onSuccess: () => setCommentDrafts((prev) => ({ ...prev, [reviewId]: '' })) },
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-7xl justify-center px-6 py-32">
        <Spinner />
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 lg:px-10">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Sản phẩm</h1>
        <div className="mt-8 rounded-card border border-border bg-surface p-8 text-center">
          <p className="text-muted-foreground">
            Không tìm thấy sản phẩm.{' '}
            <Link to="/c/all" className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent">
              Xem tất cả sản phẩm
            </Link>
          </p>
        </div>
      </div>
    )
  }

  const activeMedia = media[selectedMediaIndex]
  const sanitizedDescription = DOMPurify.sanitize(product.description ?? '')
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16 lg:px-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-accent">
          Trang chủ
        </Link>
        {product.category && (
          <>
            <ChevronRight size={14} className="text-border-strong" />
            <Link to={`/c/${product.category.slug}`} className="transition-colors hover:text-accent">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight size={14} className="text-border-strong" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="group aspect-[4/5] overflow-hidden rounded-card bg-surface-alt">
            {activeMedia &&
              (activeMedia.type === 'video' ? (
                <video src={activeMedia.url} controls className="h-full w-full object-cover" />
              ) : (
                <img
                  src={activeMedia.url}
                  alt={product.name}
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-105"
                />
              ))}
          </div>

          {media.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {media.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedMediaIndex(index)}
                  aria-label={`Xem ${item.type === 'video' ? 'video' : 'ảnh'} ${index + 1}`}
                  className={`h-20 w-20 overflow-hidden rounded-control border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    index === selectedMediaIndex ? 'border-foreground' : 'border-transparent hover:border-border-strong'
                  }`}
                >
                  {item.type === 'video' ? (
                    <video src={item.url} className="h-full w-full object-cover" />
                  ) : (
                    <img src={item.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:py-4">
          {product.category && (
            <p className="eyebrow">{product.category.name}</p>
          )}
          <h1 className="mt-3 font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-tight text-foreground">
            {product.name}
          </h1>

          {averageRating && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex text-accent">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star key={value} size={15} fill={value <= Math.round(averageRating) ? 'currentColor' : 'none'} />
                ))}
              </span>
              <span>
                {averageRating} · {reviews.length} đánh giá
              </span>
            </div>
          )}

          <p className="mt-5 text-3xl font-medium text-foreground">{formatPrice(price)}</p>

          <div className="mt-8 h-px w-full bg-border" />

          {variants.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Phiên bản</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    aria-pressed={variant.id === selectedVariant?.id}
                    className={`rounded-control border px-4 py-2.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      variant.id === selectedVariant?.id
                        ? 'border-foreground bg-foreground text-surface'
                        : 'border-border-strong text-foreground hover:border-foreground'
                    }`}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className={`mt-5 text-sm ${outOfStock ? 'text-destructive' : 'text-secondary'}`}>
            {outOfStock ? 'Hết hàng' : `Còn ${availableStock} sản phẩm`}
          </p>

          {selectedVariant?.model_3d_url && (
            <a
              href={selectedVariant.model_3d_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-accent"
            >
              <Box size={16} />
              Xem mô hình 3D
            </a>
          )}

          <div className="mt-8 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
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
                className="w-24 rounded-control border border-border-strong bg-surface px-4 py-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
              />
            </label>

            {token ? (
              <>
                <Button
                  onClick={handleAddToCart}
                  disabled={outOfStock || addCartItem.isPending}
                  className="px-8 py-3.5"
                >
                  Thêm vào giỏ
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Thêm vào yêu thích"
                  onClick={handleAddToWishlist}
                  disabled={addWishlistItem.isPending}
                  className="px-4 py-3.5"
                >
                  <Heart size={18} />
                </Button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center rounded-control bg-primary px-8 py-3.5 text-sm font-medium text-surface transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Đăng nhập để mua hàng
              </Link>
            )}
          </div>

          {stockError !== null && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Chỉ còn {stockError} sản phẩm trong kho
            </p>
          )}

          {sanitizedDescription && (
            <div className="mt-10 border-t border-border pt-8">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Mô tả</p>
              <div
                className="prose mt-4 max-w-none leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
            </div>
          )}
        </div>
      </div>

      <section className="mt-20 border-t border-border pt-16">
        <h2 className="font-display text-[clamp(1.6rem,2.6vw,2.2rem)] text-foreground">Đánh giá</h2>

        {token && verifiedOrder && !reviewSubmitted && (
          <form
            onSubmit={handleSubmitReview}
            className="mt-6 flex max-w-xl flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-soft"
          >
            <p className="font-medium text-foreground">Viết đánh giá của bạn</p>

            <div className="flex gap-1 text-accent">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Đánh giá ${value} sao`}
                  aria-pressed={value <= reviewRating}
                  onClick={() => setReviewRating(value)}
                  className="transition-transform hover:scale-110"
                >
                  <Star size={24} fill={value <= reviewRating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>

            <Input
              id="review-title"
              label="Tiêu đề (không bắt buộc)"
              value={reviewTitle}
              onChange={(event) => setReviewTitle(event.target.value)}
              maxLength={200}
            />

            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground" htmlFor="review-body">
              Nội dung đánh giá
              <textarea
                id="review-body"
                value={reviewBody}
                onChange={(event) => setReviewBody(event.target.value)}
                maxLength={5000}
                rows={4}
                required
                className="rounded-control border border-border-strong bg-surface px-4 py-3 text-base font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              />
            </label>

            {reviewError && (
              <p role="alert" className="text-sm text-destructive">
                {reviewError}
              </p>
            )}

            <Button type="submit" disabled={reviewRating === 0 || !reviewBody.trim() || createReview.isPending}>
              {createReview.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Button>
          </form>
        )}

        {reviewSubmitted && (
          <p className="mt-6 text-sm text-muted-foreground">
            Đánh giá của bạn đã được gửi và đang chờ kiểm duyệt.
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="mt-6 text-muted-foreground">Chưa có đánh giá nào.</p>
        ) : (
          <ul className="mt-8 flex flex-col gap-5">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-card border border-border bg-surface p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{review.user?.name}</p>
                  <span className="flex items-center gap-1 text-sm text-accent">
                    <Star size={14} fill="currentColor" />
                    <span className="text-muted-foreground">{review.rating}/5</span>
                  </span>
                </div>
                {review.title && <p className="mt-2 font-display text-lg text-foreground">{review.title}</p>}
                <p className="mt-1.5 leading-relaxed text-foreground">{review.body}</p>

                {review.comments?.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                    {review.comments.map((comment) => (
                      <li key={comment.id} className="border-l-2 border-border-strong pl-4 text-sm">
                        <p className="font-medium text-foreground">
                          {comment.user?.name}{' '}
                          <span className="font-normal text-muted-foreground">· {formatDate(comment.created_at)}</span>
                        </p>
                        <p className="text-muted-foreground">{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {token && (
                  <form
                    onSubmit={(event) => handleSubmitComment(event, review.id)}
                    className="mt-4 flex flex-col gap-2 border-t border-border pt-4"
                  >
                    <label className="text-sm text-foreground" htmlFor={`comment-${review.id}`}>
                      Bình luận
                      <textarea
                        id={`comment-${review.id}`}
                        value={commentDrafts[review.id] ?? ''}
                        onChange={(event) =>
                          setCommentDrafts((prev) => ({ ...prev, [review.id]: event.target.value }))
                        }
                        maxLength={2000}
                        rows={2}
                        className="mt-1.5 block w-full rounded-control border border-border-strong bg-surface px-4 py-2.5 text-sm font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      />
                    </label>
                    <div>
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={!commentDrafts[review.id]?.trim() || createComment.isPending}
                      >
                        Gửi bình luận
                      </Button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {reviewsQuery.hasNextPage && (
          <div className="mt-8 flex justify-center">
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
