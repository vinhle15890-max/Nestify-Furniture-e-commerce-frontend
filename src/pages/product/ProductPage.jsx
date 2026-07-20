import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import './ProductDescription.css'
import { Heart, Star, ImageOff } from 'lucide-react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { formatPrice, formatDate, numericClassName } from '../../lib/format'
import { useProduct, useProductReviews } from '../../features/catalog/hooks'
import { useAddCartItem } from '../../features/cart/hooks'
import { useWishlist, useAddWishlistItem, useRemoveWishlistItem } from '../../features/wishlist/hooks'
import { useOrders } from '../../features/orders/hooks'
import { useCreateReview, useCreateComment } from '../../features/reviews/hooks'
import { focusFirstError, formLevelMessage } from '../../lib/formErrors'
import { useRecordProductView } from '../../features/personalization/hooks'
import { RecentlyViewedStrip } from '../../components/personalization/RecentlyViewedStrip'
import { useAuthStore } from '../../store/authStore'
import { isStaff } from '../../lib/roles'
import { ProductOptions } from './ProductOptions'
import { ProductEvidencePanel } from './ProductEvidencePanel'
import { resolveVariant } from '../../lib/variantOptions'
import { Breadcrumb } from '../../components/Breadcrumb'
import { findCategoryPath } from '../../lib/categoryPath'
import { useCategories } from '../../features/catalog/hooks'
import { useUiStore } from '../../store/uiStore'
import { useToastStore } from '../../store/toastStore'

// Tags the description editor is allowed to emit — keep the render surface tight.
const DESCRIPTION_ALLOWED_TAGS = ['p', 'br', 'h2', 'h3', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a', 'img', 'blockquote']

function stripHtml(html) {
  return (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Sanitize the stored HTML and make embedded media lazy-load + links safe.
function enhanceDescriptionHtml(html) {
  const clean = DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS: DESCRIPTION_ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'loading', 'decoding'],
  })
  if (typeof DOMParser === 'undefined') return clean
  const doc = new DOMParser().parseFromString(clean, 'text/html')
  doc.querySelectorAll('img').forEach((img) => {
    img.setAttribute('loading', 'lazy')
    img.setAttribute('decoding', 'async')
  })
  doc.querySelectorAll('a[target="_blank"]').forEach((a) => a.setAttribute('rel', 'noopener noreferrer'))
  return doc.body.innerHTML
}

// Append a managed <meta> tag we can clean up later.
function appendMeta(attr, key, content) {
  const el = document.createElement('meta')
  el.setAttribute(attr, key)
  el.setAttribute('content', content ?? '')
  el.setAttribute('data-nestify-seo', 'true')
  document.head.appendChild(el)
  return el
}

function findProductFact(attributes, aliases) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return null
  const normalizedAliases = aliases.map((alias) => alias.toLocaleLowerCase('vi'))
  const entry = Object.entries(attributes).find(([name]) =>
    normalizedAliases.includes(name.trim().toLocaleLowerCase('vi')),
  )
  return entry?.[1] == null || entry[1] === '' ? null : String(entry[1])
}

export function ProductPage() {
  const { productSlug } = useParams()
  const { data, error, isLoading, isError, isFetching, refetch } = useProduct(productSlug)
  const product = data?.data
  const { data: categoriesData } = useCategories()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const staff = isStaff(user)
  const isCustomer = Boolean(token) && !staff
  const recordView = useRecordProductView()
  const openCart = useUiStore((state) => state.openCart)
  const addToast = useToastStore((state) => state.addToast)
  const addCartItem = useAddCartItem()
  const addWishlistItem = useAddWishlistItem()
  const removeWishlistItem = useRemoveWishlistItem()
  const { data: wishlistData } = useWishlist({ enabled: isCustomer })
  const [stockError, setStockError] = useState(null)

  const media = useMemo(
    () => [...(product?.media ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [product],
  )
  const variants = useMemo(() => product?.variants ?? [], [product])
  const variantOptions = useMemo(() => product?.variant_options ?? [], [product])
  const hasOptions = variantOptions.length > 0

  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!product) return
    setSelectedMediaIndex(0)
    setSelectedVariantId(product.variants?.[0]?.id ?? null)
    setSelectedOptions({})
    setQuantity(1)
  }, [product])

  const selectedVariant = hasOptions
    ? resolveVariant(selectedOptions, variants, variantOptions)
    : variants.find((variant) => variant.id === selectedVariantId) ?? variants[0]
  const price = selectedVariant?.price ?? product?.base_price
  const availableStock = selectedVariant?.available_stock ?? 0
  const outOfStock = availableStock < 1

  // Wishlist membership for the CURRENTLY selected variant (each variant is tracked
  // independently), so the heart button reflects saved state and toggles.
  const wishlistItems = wishlistData?.data?.items ?? []
  const wishlistItem = selectedVariant
    ? wishlistItems.find((item) => item.variant?.id === selectedVariant.id)
    : undefined
  const isWishlisted = Boolean(wishlistItem)

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(current, 1), Math.max(availableStock, 1)))
  }, [availableStock])

  useEffect(() => {
    setStockError(null)
    // Changing variant re-filters the gallery — reset to the first visible image.
    setSelectedMediaIndex(0)
  }, [selectedVariantId, selectedVariant?.id])

  useEffect(() => {
    if (!product?.id || !isCustomer) return
    recordView.mutate(productSlug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, isCustomer, productSlug])

  // SEO: drive <title>, meta description, Open Graph, and schema.org/Product
  // JSON-LD from the product's editorial meta fields (falls back to name/desc).
  useEffect(() => {
    if (!product) return undefined

    const title = product.meta_title?.trim() || `${product.name} | Nestify`
    const description = product.meta_description?.trim() || stripHtml(product.description).slice(0, 160)
    const image = product.media?.[0]?.url ?? product.thumbnail
    const url = window.location.href
    const lowestPrice = product.base_price ?? product.variants?.[0]?.price

    const previousTitle = document.title
    document.title = title

    const metas = [
      appendMeta('name', 'description', description),
      appendMeta('property', 'og:title', title),
      appendMeta('property', 'og:description', description),
      appendMeta('property', 'og:type', 'product'),
      appendMeta('property', 'og:url', url),
    ]
    if (image) metas.push(appendMeta('property', 'og:image', image))

    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.setAttribute('data-nestify-seo', 'true')
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      ...(image ? { image: [image] } : {}),
      ...(product.variants?.[0]?.sku ? { sku: product.variants[0].sku } : {}),
      ...(product.category?.name ? { category: product.category.name } : {}),
      ...(lowestPrice != null
        ? {
            offers: {
              '@type': 'Offer',
              priceCurrency: 'VND',
              price: lowestPrice,
              availability: 'https://schema.org/InStock',
              url,
            },
          }
        : {}),
    })
    document.head.appendChild(ld)

    return () => {
      document.title = previousTitle
      metas.forEach((el) => el.remove())
      ld.remove()
    }
  }, [product])

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
            addToast({ title: 'Không thể thêm vào giỏ hàng', description: formLevelMessage(error), variant: 'error' })
          }
        },
      },
    )
  }

  function handleToggleWishlist() {
    if (isWishlisted) {
      removeWishlistItem.mutate(wishlistItem.id, {
        onSuccess: () => addToast({ title: 'Đã bỏ khỏi yêu thích', variant: 'success' }),
        onError: (error) => addToast({ title: 'Không thể bỏ khỏi yêu thích', description: formLevelMessage(error), variant: 'error' }),
      })
    } else {
      addWishlistItem.mutate(
        { variant_id: selectedVariant.id },
        {
          onSuccess: () => addToast({ title: 'Đã thêm vào yêu thích', variant: 'success' }),
          onError: (error) => addToast({ title: 'Không thể thêm vào yêu thích', description: formLevelMessage(error), variant: 'error' }),
        },
      )
    }
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
  const [reviewFieldErrors, setReviewFieldErrors] = useState({ rating: null, title: null, body: null })
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentErrors, setCommentErrors] = useState({})
  const [commentSubmittingId, setCommentSubmittingId] = useState(null)
  const reviewFormRef = useRef(null)

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
    setReviewFieldErrors({ rating: null, title: null, body: null })
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
      if (error?.code === 'VALIDATION_FAILED' && error.details?.fields) {
        const fields = Object.fromEntries(
          Object.entries(error.details.fields).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )
        setReviewFieldErrors({ rating: null, title: null, body: null, ...fields })
      } else {
        setReviewError(formLevelMessage(error))
      }
      focusFirstError(reviewFormRef.current)
    }
  }

  async function handleSubmitComment(event, reviewId) {
    event.preventDefault()
    const body = (commentDrafts[reviewId] ?? '').trim()
    if (!body) return
    setCommentErrors((prev) => ({ ...prev, [reviewId]: {} }))
    setCommentSubmittingId(reviewId)
    try {
      await createComment.mutateAsync({ reviewId, body })
      setCommentDrafts((prev) => ({ ...prev, [reviewId]: '' }))
    } catch (error) {
      if (error?.code === 'VALIDATION_FAILED' && error.details?.fields) {
        setCommentErrors((prev) => ({ ...prev, [reviewId]: { fields: error.details.fields } }))
      } else {
        setCommentErrors((prev) => ({ ...prev, [reviewId]: { message: formLevelMessage(error) } }))
      }
      focusFirstError(event.currentTarget)
    } finally {
      setCommentSubmittingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto flex max-w-7xl justify-center px-6 py-32">
          <Spinner />
        </div>
      </div>
    )
  }

  if (isError && error?.status !== 404) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Sản phẩm</h1>
          <LoadErrorState className="mt-8" title="Chưa thể tải sản phẩm" description="Thông tin sản phẩm chưa thể hiển thị. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
      <div className="mx-auto max-w-3xl">
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
      </div>
    )
  }

  // Gallery filters to the selected variant's media + agnostic (variant_id null)
  // media; media tagged to OTHER variants is hidden. Untagged products (all
  // agnostic) → visibleMedia === media, i.e. unchanged from before.
  const visibleMedia = media.filter(
    (item) => item.variant_id == null || item.variant_id === selectedVariant?.id,
  )
  const activeMedia = visibleMedia[selectedMediaIndex]

  const sanitizedDescription = enhanceDescriptionHtml(product.description)
  const deliveryFact = findProductFact(product.attributes, [
    'Thời gian giao hàng', 'Giao hàng', 'delivery', 'delivery estimate', 'delivery_estimate',
  ])
  const returnsFact = findProductFact(product.attributes, [
    'Đổi trả', 'Chính sách đổi trả', 'Đổi trả và hủy đơn', 'returns', 'return policy', 'return_policy',
  ])
  const assemblyFact = findProductFact(product.attributes, [
    'Lắp ráp', 'Thông tin lắp ráp', 'assembly', 'assembly info', 'assembly_info',
  ])
  const warrantyFact = findProductFact(product.attributes, [
    'Bảo hành', 'Thời hạn bảo hành', 'warranty', 'warranty period', 'warranty_period',
  ])
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : null

  const categoryPath = product?.category
    ? findCategoryPath(categoriesData?.data ?? [], product.category.slug)
    : []
  const breadcrumbItems = [
    { label: 'Trang chủ', to: '/' },
    ...(categoryPath.length > 0
      ? categoryPath.map((c) => ({ label: c.name, to: `/c/${c.slug}` }))
      : product?.category
        ? [{ label: product.category.name, to: `/c/${product.category.slug}` }]
        : []),
    { label: product.name },
  ]

  return (
    <div className="min-h-screen bg-canvas text-ink">
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16 lg:px-10">
      <Breadcrumb items={breadcrumbItems} />

      <section data-testid="product-identity-field" className="mt-6">
        {product.category && (
          <p className="text-sm font-medium text-emerging">
            {product.category.name}
          </p>
        )}
        <h1 className="mt-3 max-w-[72rem] font-display text-[clamp(2.15rem,4vw,3.2rem)] leading-[1.03] tracking-[-0.025em] text-ink">
          {product.name}
        </h1>

        {averageRating && (
          <div className="mt-4 flex items-center gap-2 text-sm text-ink/60">
            <span className="flex text-ink/70">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star key={value} size={15} fill={value <= Math.round(averageRating) ? 'currentColor' : 'none'} />
              ))}
            </span>
            <span>
              {averageRating} · {reviews.length} đánh giá
            </span>
          </div>
        )}

        <div className="mt-5 max-w-3xl">
          {hasOptions ? (
            <>
              <ProductOptions
                options={variantOptions}
                variants={variants}
                selected={selectedOptions}
                onSelect={(name, label) => setSelectedOptions((prev) => ({ ...prev, [name]: label }))}
              />
              {!selectedVariant && (
                <p className="mt-3 text-sm text-ink/65">Vui lòng chọn đầy đủ thuộc tính.</p>
              )}
            </>
          ) : (
            variants.length > 0 && (
              <div>
                <p className="text-sm font-medium text-ink/55">Phiên bản</p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      aria-pressed={variant.id === selectedVariant?.id}
                      className={`rounded-control border px-4 py-2.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
                        variant.id === selectedVariant?.id
                          ? 'border-ink bg-ink text-canvas'
                          : 'border-unbuilt text-ink hover:border-ink'
                      }`}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
          {selectedVariant && (
            <p className="mt-3 text-sm leading-6 text-ink/65">
              {visibleMedia.some((item) => item.variant_id === selectedVariant.id)
                ? 'Bộ ảnh có hình được gắn đúng với phiên bản này.'
                : 'Bộ ảnh hiện là ảnh dùng chung, chưa xác nhận riêng cho phiên bản này.'}
            </p>
          )}
        </div>
      </section>

      <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,0.9fr)] lg:gap-10 xl:gap-14">
        <section data-testid="product-truth-field" aria-labelledby="product-media-role">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <p id="product-media-role" className="text-sm font-medium text-ink/60">
              {activeMedia?.variant_id === selectedVariant?.id && activeMedia?.variant_id != null
                ? 'Ảnh sản phẩm theo phiên bản'
                : 'Ảnh bối cảnh'}
            </p>
            <p className="text-ink/55">Không dùng để suy ra kích thước</p>
          </div>

          <div className="flex aspect-[5/4] items-center justify-center overflow-hidden bg-unbuilt/20 sm:aspect-auto sm:h-[22rem] lg:aspect-[4/3] lg:h-auto">
            {activeMedia ? (
              activeMedia.type === 'video' ? (
                <video src={activeMedia.url} controls className="h-full w-full object-contain" />
              ) : (
                <img
                  src={activeMedia.url}
                  alt={product.name}
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-3 text-ink/55">
                <ImageOff size={32} aria-hidden="true" />
                <p className="text-sm">Chưa có hình ảnh sản phẩm.</p>
              </div>
            )}
          </div>

          {visibleMedia.length > 1 && (
            <div className="mt-4 flex max-w-full gap-3 overflow-x-auto pb-1">
              {visibleMedia.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedMediaIndex(index)}
                  aria-label={`Xem ${item.type === 'video' ? 'video' : 'ảnh'} ${index + 1}`}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-control border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:h-20 sm:w-24 ${
                    index === selectedMediaIndex ? 'border-ink' : 'border-transparent hover:border-unbuilt'
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
        </section>

        <ProductEvidencePanel
          product={product}
          selectedVariant={selectedVariant}
          activeMedia={activeMedia}
          outOfStock={outOfStock}
        />
      </div>

      <section
        data-testid="transaction-runway"
        aria-labelledby="transaction-runway-title"
        className="mt-12 grid gap-8 border-t-2 border-ink/15 pt-8 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:items-end lg:mt-16"
      >
        <div>
          <p className="text-sm font-medium text-ink/55">Mua trực tiếp</p>
          <h2 id="transaction-runway-title" className="sr-only">Mua trực tiếp</h2>
          <p className={`mt-3 text-[clamp(1.55rem,2.5vw,2rem)] font-medium text-ink ${numericClassName}`}>{formatPrice(price)}</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-ink/60">
            Nếu bạn đã có đủ thông tin, lựa chọn mua vẫn luôn sẵn sàng ở đây.
          </p>
        </div>

        <div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink/55">
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
                className={`w-20 rounded-control border border-unbuilt bg-canvas px-3 py-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 ${numericClassName}`}
              />
            </label>

            {token && staff ? (
              <p className="border-l-2 border-unbuilt pl-4 text-sm leading-6 text-ink/65">
                Tài khoản quản trị không thể mua hàng.
              </p>
            ) : token ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || outOfStock || addCartItem.isPending}
                  className="px-6 py-3"
                >
                  Thêm vào giỏ
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={isWishlisted ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
                  aria-pressed={isWishlisted}
                  onClick={handleToggleWishlist}
                  disabled={!selectedVariant || addWishlistItem.isPending || removeWishlistItem.isPending}
                  className="px-4 py-3"
                >
                  <Heart size={18} className={isWishlisted ? 'fill-current text-accent' : ''} />
                </Button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center rounded-control border border-ink px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                Đăng nhập để mua hàng
              </Link>
            )}
          </div>

          {stockError !== null && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Kho chỉ đủ {stockError} sản phẩm cho lựa chọn này
            </p>
          )}

          <dl className="mt-5 grid gap-4 border-t border-unbuilt/70 pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-ink">Giao hàng</dt>
              <dd className="mt-1 text-sm leading-6 text-ink/65">
                {deliveryFact ?? 'Chưa có thời gian giao hàng. Liên hệ Nestify trước khi đặt.'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-ink">Đổi trả và hủy đơn</dt>
              <dd className="mt-1 text-sm leading-6 text-ink/65">
                {returnsFact ?? 'Chính sách cho sản phẩm này chưa được cung cấp.'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="ownership-details-title" className="mt-12 border-t border-border pt-8">
        <h2 id="ownership-details-title" className="text-xl font-medium text-ink">Sau khi sản phẩm được giao</h2>
        <dl className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-ink">Lắp ráp</dt>
            <dd className="mt-1 text-sm leading-6 text-ink/65">
              {assemblyFact ?? 'Thông tin lắp ráp chưa được cung cấp.'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-ink">Bảo hành</dt>
            <dd className="mt-1 text-sm leading-6 text-ink/65">
              {warrantyFact ?? 'Thông tin bảo hành chưa được cung cấp.'}
            </dd>
          </div>
        </dl>
      </section>

      {sanitizedDescription && (
        <section className="mt-16 border-t border-border pt-12">
          <h2 className="font-display text-[clamp(1.6rem,2.6vw,2.2rem)] text-foreground">Mô tả sản phẩm</h2>
          <div
            className="product-description mt-6 max-w-3xl"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        </section>
      )}

      <section className="mt-20 border-t border-border pt-16">
        <h2 className="font-display text-[clamp(1.6rem,2.6vw,2.2rem)] text-foreground">Đánh giá</h2>

        {token && verifiedOrder && !reviewSubmitted && (
          <form
            ref={reviewFormRef}
            onSubmit={handleSubmitReview}
            className="mt-6 flex max-w-xl flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-soft"
          >
            <p className="font-medium text-foreground">Viết đánh giá của bạn</p>

            <div className="flex flex-col gap-1.5">
              <p id="review-rating-label" className="text-sm font-medium text-foreground">
                Số sao
              </p>
              <div
                className="flex gap-1 text-accent"
                role="group"
                aria-labelledby="review-rating-label"
                aria-describedby={reviewFieldErrors.rating ? 'review-rating-error' : undefined}
                aria-invalid={reviewFieldErrors.rating ? 'true' : undefined}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`Đánh giá ${value} sao`}
                    aria-pressed={value <= reviewRating}
                    onClick={() => {
                      setReviewRating(value)
                      if (reviewFieldErrors.rating) setReviewFieldErrors((prev) => ({ ...prev, rating: null }))
                    }}
                    className="transition-transform hover:scale-110"
                  >
                    <Star size={24} fill={value <= reviewRating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              {reviewFieldErrors.rating && (
                <p id="review-rating-error" role="alert" className="text-sm text-destructive">
                  {reviewFieldErrors.rating}
                </p>
              )}
            </div>

            <Input
              id="review-title"
              label="Tiêu đề (không bắt buộc)"
              value={reviewTitle}
              onChange={(event) => {
                setReviewTitle(event.target.value)
                if (reviewFieldErrors.title) setReviewFieldErrors((prev) => ({ ...prev, title: null }))
              }}
              error={reviewFieldErrors.title}
              maxLength={200}
            />

            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground" htmlFor="review-body">
              Nội dung đánh giá
              <textarea
                id="review-body"
                value={reviewBody}
                onChange={(event) => {
                  setReviewBody(event.target.value)
                  if (reviewFieldErrors.body) setReviewFieldErrors((prev) => ({ ...prev, body: null }))
                }}
                maxLength={5000}
                rows={4}
                required
                aria-invalid={reviewFieldErrors.body ? 'true' : undefined}
                aria-describedby={reviewFieldErrors.body ? 'review-body-error' : undefined}
                className="rounded-control border border-border-strong bg-surface px-4 py-3 text-base font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              />
            </label>
            {reviewFieldErrors.body && (
              <p id="review-body-error" role="alert" className="text-sm text-destructive">
                {reviewFieldErrors.body}
              </p>
            )}

            {reviewError && (
              <p role="alert" tabIndex="-1" className="text-sm text-destructive">
                {reviewError}
              </p>
            )}

            <Button type="submit" disabled={reviewRating === 0 || !reviewBody.trim() || createReview.isPending}>
              {createReview.isPending ? 'Đang gửi…' : 'Gửi đánh giá'}
            </Button>
          </form>
        )}

        {reviewSubmitted && (
          <p className="mt-6 text-sm text-muted-foreground">
            Đánh giá của bạn đã được gửi và đang chờ kiểm duyệt.
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            Chưa có đánh giá nào — những cảm nhận đầu tiên sẽ xuất hiện ở đây.
          </p>
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
                        onChange={(event) => {
                          setCommentDrafts((prev) => ({ ...prev, [review.id]: event.target.value }))
                          if (commentErrors[review.id]) setCommentErrors((prev) => ({ ...prev, [review.id]: {} }))
                        }}
                        maxLength={2000}
                        rows={2}
                        aria-invalid={commentErrors[review.id]?.fields?.body ? 'true' : undefined}
                        aria-describedby={commentErrors[review.id]?.fields?.body ? `comment-${review.id}-error` : undefined}
                        className="mt-1.5 block w-full rounded-control border border-border-strong bg-surface px-4 py-2.5 text-sm font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      />
                    </label>
                    {commentErrors[review.id]?.fields?.body && (
                      <p id={`comment-${review.id}-error`} role="alert" className="text-sm text-destructive">
                        {Array.isArray(commentErrors[review.id].fields.body)
                          ? commentErrors[review.id].fields.body[0]
                          : commentErrors[review.id].fields.body}
                      </p>
                    )}
                    {commentErrors[review.id]?.message && (
                      <p role="alert" className="text-sm text-destructive">
                        {commentErrors[review.id].message}
                      </p>
                    )}
                    <div>
                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={!commentDrafts[review.id]?.trim() || commentSubmittingId === review.id}
                      >
                        {commentSubmittingId === review.id ? 'Đang gửi…' : 'Gửi bình luận'}
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

      {isCustomer && <RecentlyViewedStrip excludeSlug={productSlug} />}
    </div>

    </div>
  )
}
