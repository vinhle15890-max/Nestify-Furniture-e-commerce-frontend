/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import './ProductDescription.css'
import { Star, ImageOff } from 'lucide-react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { ProductDetailSkeleton } from '../../components/LoadingStates'
import { LoadErrorState } from '../../components/LoadErrorState'
import { useProduct, useProductReviews } from '../../features/catalog/hooks'
import { useAddCartItem } from '../../features/cart/hooks'
import { useWishlist, useAddWishlistItem, useRemoveWishlistItem } from '../../features/wishlist/hooks'
import { useOrders } from '../../features/orders/hooks'
import { useCreateReview } from '../../features/reviews/hooks'
import { focusFirstError, formLevelMessage } from '../../lib/formErrors'
import { useJourneyContext, useRecordProductView } from '../../features/personalization/hooks'
import { RecentlyViewedStrip } from '../../components/personalization/RecentlyViewedStrip'
import { useAuthStore } from '../../store/authStore'
import { isStaff } from '../../lib/roles'
import { ProductDecisionRail } from './ProductDecisionRail'
import { ProductSpecifications } from './ProductSpecifications'
import { resolveVariant } from '../../lib/variantOptions'
import { Breadcrumb } from '../../components/Breadcrumb'
import { findCategoryPath } from '../../lib/categoryPath'
import { useCategories } from '../../features/catalog/hooks'
import { useUiStore } from '../../store/uiStore'
import { useToastStore } from '../../store/toastStore'
import { SeoHead } from '../../components/SeoHead'

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

function findProductFact(attributes, aliases) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return null
  const normalizedAliases = aliases.map((alias) => alias.toLocaleLowerCase('vi'))
  const entry = Object.entries(attributes).find(([name]) =>
    normalizedAliases.includes(name.trim().toLocaleLowerCase('vi')),
  )
  return entry?.[1] == null || entry[1] === '' ? null : String(entry[1])
}

const REVIEW_EVIDENCE_LABELS = {
  accurate: 'Màu sắc giống ảnh',
  slightly_different: 'Màu sắc hơi khác ảnh',
  very_different: 'Màu sắc khác nhiều so với ảnh',
  as_expected: 'Kích thước đúng kỳ vọng',
  larger: 'Lớn hơn kỳ vọng',
  smaller: 'Nhỏ hơn kỳ vọng',
  under_month: 'Đã dùng dưới 1 tháng',
  one_to_six_months: 'Đã dùng 1–6 tháng',
  over_six_months: 'Đã dùng trên 6 tháng',
}

function reviewEvidenceItems(evidence) {
  if (!evidence) return []
  const items = [
    REVIEW_EVIDENCE_LABELS[evidence.color_accuracy],
    REVIEW_EVIDENCE_LABELS[evidence.size_fit],
    REVIEW_EVIDENCE_LABELS[evidence.usage_duration],
    evidence.material_quality ? `Chất liệu ${evidence.material_quality}/5` : null,
    evidence.delivery_experience ? `Giao nhận ${evidence.delivery_experience}/5` : null,
  ]
  return items.filter(Boolean)
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
  const journeyQuery = useJourneyContext()
  const activeRoom = journeyQuery.data?.data?.continuation?.type === 'room'
    ? journeyQuery.data.data.continuation.room
    : null
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

  const seo = useMemo(() => {
    if (!product) return null
    const activeVariants = (product.variants ?? []).filter((variant) => variant.is_active !== false)
    const prices = activeVariants.map((variant) => Number(variant.price)).filter(Number.isFinite)
    const inStock = activeVariants.some((variant) => Number(variant.available_stock) > 0)
    const description = product.meta_description?.trim() || stripHtml(product.description).slice(0, 160)
    const image = product.media?.[0]?.url ?? product.thumbnail
    const canonicalPath = `/p/${product.slug}`
    return {
      title: product.meta_title?.trim() || `${product.name} | Nestify`, description, image, canonicalPath,
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'Product', name: product.name, description,
        ...(image ? { image: [image] } : {}), ...(activeVariants[0]?.sku ? { sku: activeVariants[0].sku } : {}),
        ...(product.category?.name ? { category: product.category.name } : {}),
        ...(prices.length ? { offers: { '@type': prices.length > 1 ? 'AggregateOffer' : 'Offer', priceCurrency: 'VND',
          ...(prices.length > 1 ? { lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length } : { price: prices[0] }),
          availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`, url: new URL(canonicalPath, import.meta.env.VITE_SITE_URL || window.location.origin).toString() } } : {}),
      },
    }
  }, [product])

  function handleAddToCart() {
    addCartItem.mutate(
      { variant_id: selectedVariant.id, quantity },
      {
        onSuccess: () => {
          setStockError(null)
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
        onSuccess: () => {},
        onError: (error) => addToast({ title: 'Không thể bỏ khỏi yêu thích', description: formLevelMessage(error), variant: 'error' }),
      })
    } else {
      addWishlistItem.mutate(
        { variant_id: selectedVariant.id },
        {
          onSuccess: () => {},
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

  const [reviewRating, setReviewRating] = useState(0)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewBody, setReviewBody] = useState('')
  const [reviewColorAccuracy, setReviewColorAccuracy] = useState('')
  const [reviewSizeFit, setReviewSizeFit] = useState('')
  const [reviewMaterialQuality, setReviewMaterialQuality] = useState('')
  const [reviewDeliveryExperience, setReviewDeliveryExperience] = useState('')
  const [reviewUsageDuration, setReviewUsageDuration] = useState('')
  const [reviewSubmissionStatus, setReviewSubmissionStatus] = useState(null)
  const [reviewError, setReviewError] = useState(null)
  const [reviewFieldErrors, setReviewFieldErrors] = useState({ rating: null, title: null, body: null })
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
      const response = await createReview.mutateAsync({
        productId: product.id,
        order_id: verifiedOrder.id,
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        body: reviewBody.trim(),
        color_accuracy: reviewColorAccuracy || undefined,
        size_fit: reviewSizeFit || undefined,
        material_quality: reviewMaterialQuality ? Number(reviewMaterialQuality) : undefined,
        delivery_experience: reviewDeliveryExperience ? Number(reviewDeliveryExperience) : undefined,
        usage_duration: reviewUsageDuration || undefined,
      })
      setReviewSubmissionStatus(response.data.status)
      if (response.data.status === 'approved') await reviewsQuery.refetch()
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <ProductDetailSkeleton />
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

  // Before a variant is selected: explicit thumbnail + shared media. After
  // selection: selected variant media + shared media; other variants stay hidden.
  // Thumbnail is an independent role and never changes the attachment scope.
  const visibleMedia = selectedVariant
    ? media.filter((item) => item.variant_id == null || item.variant_id === selectedVariant.id)
    : media
        .filter((item) => item.variant_id == null || item.is_thumbnail)
        .sort((a, b) => Number(b.is_thumbnail) - Number(a.is_thumbnail))
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
      {seo && <SeoHead {...seo} type="product" />}
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

      </section>

      <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,0.9fr)] lg:gap-10 xl:gap-14">
        <section data-testid="product-truth-field" aria-labelledby="product-media-role">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <p id="product-media-role" className="text-sm font-medium text-ink/60">
              {activeMedia?.variant_id === selectedVariant?.id && activeMedia?.variant_id != null
                ? 'Ảnh sản phẩm theo phiên bản'
                : 'Ảnh dùng chung'}
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

        <ProductDecisionRail product={product} variants={variants} variantOptions={variantOptions} selectedOptions={selectedOptions} onSelectOption={(name, label) => setSelectedOptions((prev) => ({ ...prev, [name]: label }))} selectedVariant={selectedVariant} onSelectVariant={setSelectedVariantId} visibleMedia={visibleMedia} outOfStock={outOfStock} price={price} quantity={quantity} onQuantityChange={(next) => { const max = Math.max(stockError ?? availableStock, 1); setQuantity(Math.min(Math.max(next, 1), max)) }} maxQuantity={Math.max(stockError ?? availableStock, 1)} token={token} staff={staff} onAddToCart={handleAddToCart} adding={addCartItem.isPending} isWishlisted={isWishlisted} onToggleWishlist={handleToggleWishlist} wishlistPending={addWishlistItem.isPending || removeWishlistItem.isPending} stockError={stockError} deliveryFact={deliveryFact} returnsFact={returnsFact} />
      </div>

      {activeRoom && (
        <aside aria-label="Ngữ cảnh phòng đang tiếp tục" className="mt-8 flex flex-col gap-4 border-y border-unbuilt py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Bạn đang tiếp tục “{activeRoom.name}”</p>
            <p className="mt-1 text-sm text-muted-foreground">Mở lại phòng để xem sản phẩm này trong đúng không gian bạn đang cân nhắc.</p>
          </div>
          <Link to={`/room-planner/${activeRoom.id}`} className="inline-flex min-h-11 w-fit items-center whitespace-nowrap text-sm font-medium text-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Mở phòng</Link>
        </aside>
      )}

      <ProductSpecifications product={product} selectedVariant={selectedVariant} delivery={deliveryFact} assembly={assemblyFact} warranty={warrantyFact} />

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

        {token && verifiedOrder && !reviewSubmissionStatus && (
          <form
            ref={reviewFormRef}
            onSubmit={handleSubmitReview}
            className="mt-8 max-w-3xl border-y border-border py-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Đơn hàng đã giao</p>
            <h3 className="mt-2 font-display text-2xl text-foreground">Điều gì đúng với căn phòng của bạn?</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Chia sẻ những chi tiết người mua sau cần để hình dung chính xác hơn. Các mục trải nghiệm là không bắt buộc.
            </p>

            <div className="mt-6 flex flex-col gap-1.5">
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
                    className="flex size-11 items-center justify-center rounded-control transition-colors hover:bg-surface-alt active:bg-unbuilt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Màu sắc so với ảnh
                <select value={reviewColorAccuracy} onChange={(event) => setReviewColorAccuracy(event.target.value)} className="min-h-11 rounded-control border border-border-strong bg-surface px-3 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Chọn nếu phù hợp</option>
                  <option value="accurate">Giống ảnh</option>
                  <option value="slightly_different">Hơi khác ảnh</option>
                  <option value="very_different">Khác nhiều</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Kích thước trong không gian
                <select value={reviewSizeFit} onChange={(event) => setReviewSizeFit(event.target.value)} className="min-h-11 rounded-control border border-border-strong bg-surface px-3 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Chọn nếu phù hợp</option>
                  <option value="as_expected">Đúng kỳ vọng</option>
                  <option value="larger">Lớn hơn kỳ vọng</option>
                  <option value="smaller">Nhỏ hơn kỳ vọng</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Chất lượng chất liệu
                <select value={reviewMaterialQuality} onChange={(event) => setReviewMaterialQuality(event.target.value)} className="min-h-11 rounded-control border border-border-strong bg-surface px-3 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Chọn nếu phù hợp</option>
                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Trải nghiệm giao nhận
                <select value={reviewDeliveryExperience} onChange={(event) => setReviewDeliveryExperience(event.target.value)} className="min-h-11 rounded-control border border-border-strong bg-surface px-3 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Chọn nếu phù hợp</option>
                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground sm:col-span-2">
                Thời gian đã sử dụng
                <select value={reviewUsageDuration} onChange={(event) => setReviewUsageDuration(event.target.value)} className="min-h-11 rounded-control border border-border-strong bg-surface px-3 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[calc(50%-0.5rem)]">
                  <option value="">Chọn nếu phù hợp</option>
                  <option value="under_month">Dưới 1 tháng</option>
                  <option value="one_to_six_months">1–6 tháng</option>
                  <option value="over_six_months">Trên 6 tháng</option>
                </select>
              </label>
            </div>

            <div className="mt-6"><Input
              id="review-title"
              label="Tiêu đề (không bắt buộc)"
              value={reviewTitle}
              onChange={(event) => {
                setReviewTitle(event.target.value)
                if (reviewFieldErrors.title) setReviewFieldErrors((prev) => ({ ...prev, title: null }))
              }}
              error={reviewFieldErrors.title}
              maxLength={200}
            /></div>

            <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-foreground" htmlFor="review-body">
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

            <div className="mt-5"><Button type="submit" disabled={reviewRating === 0 || !reviewBody.trim() || createReview.isPending}>
              {createReview.isPending ? 'Đang gửi…' : 'Gửi đánh giá'}
            </Button></div>
          </form>
        )}

        {reviewSubmissionStatus && (
          <p className="mt-8 border-l-2 border-emerging pl-4 text-sm text-muted-foreground" role="status">
            {reviewSubmissionStatus === 'approved'
              ? 'Đánh giá đã được đăng với dấu hiệu Đã mua hàng.'
              : 'Đánh giá đang chờ kiểm duyệt vì hệ thống phát hiện tín hiệu cần xem lại.'}
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            Chưa có đánh giá nào — những cảm nhận đầu tiên sẽ xuất hiện ở đây.
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {reviews.map((review) => (
              <li key={review.id} className="py-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{review.user?.name}</p>
                    {review.verified_purchase && <span className="text-xs font-semibold text-emerging">Đã mua hàng</span>}
                  </div>
                  <span className="flex items-center gap-1 text-sm text-accent">
                    <Star size={14} fill="currentColor" />
                    <span className="text-muted-foreground">{review.rating}/5</span>
                  </span>
                </div>
                {reviewEvidenceItems(review.evidence).length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    {reviewEvidenceItems(review.evidence).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                {review.title && <p className="mt-2 font-display text-lg text-foreground">{review.title}</p>}
                <p className="mt-1.5 leading-relaxed text-foreground">{review.body}</p>
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
