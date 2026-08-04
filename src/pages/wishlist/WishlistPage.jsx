/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
/* Hallmark · macrostructure: consideration-ledger · theme: Nestify studied-DNA · slop: pass */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import {
  useWishlist,
  useUpdateWishlistItem,
  useRemoveWishlistItem,
  useMoveToCart,
} from '../../features/wishlist/hooks'
import { Button, ButtonLink } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { BecomingRoomArt } from '../../components/BecomingRoomArt'
import { formatPrice, numericClassName } from '../../lib/format'

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

function itemCountLabel(count) {
  return `${count} lựa chọn cho căn phòng`
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
        <div className="mx-auto flex max-w-7xl justify-center px-6 py-32">
          <Spinner />
        </div>
      </div>
    )
  }

  if (isError && !data?.data) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">
          <h1 className="max-w-[16ch] font-display text-[clamp(2.2rem,5vw,4.5rem)] leading-[1.05] text-foreground [overflow-wrap:anywhere]">
            Những lựa chọn đang cân nhắc
          </h1>
          <LoadErrorState
            title="Chưa thể tải các lựa chọn đã lưu"
            description="Danh sách chưa tải được. Hãy thử lại để tiếp tục từ nơi bạn đã dừng."
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
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">
        {isError && data?.data && (
          <LoadErrorState
            title="Chưa cập nhật được danh sách mới nhất"
            description="Đang hiển thị các lựa chọn đã tải trước đó."
            onRetry={() => wishlistQuery.refetch()}
            isRetrying={isFetching}
            compact
            background
            className="mb-8"
          />
        )}

        {items.length === 0 ? (
          <section className="grid min-w-0 gap-10 border-t border-unbuilt pt-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end lg:gap-16">
            <div className="min-w-0">
              <h1 className="max-w-[16ch] font-display text-[clamp(2.2rem,5vw,4.5rem)] leading-[1.05] text-foreground [overflow-wrap:anywhere]">
                Một khoảng trống cho điều bạn đang tìm
              </h1>
              <p className="mt-6 max-w-[58ch] leading-relaxed text-muted-foreground">
                Chưa có lựa chọn nào được lưu. Khi một món đồ khiến bạn muốn xem lại, hãy giữ nó ở đây trước khi quyết định.
              </p>
              <Link
                to="/c/all"
                className="mt-8 inline-flex min-h-12 items-center whitespace-nowrap rounded-control border border-foreground/35 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-unbuilt/20 active:bg-unbuilt/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Khám phá sản phẩm
              </Link>
            </div>
            <div className="pointer-events-none mx-auto w-full max-w-[520px] lg:mr-0">
              <BecomingRoomArt level={1} />
            </div>
          </section>
        ) : (
          <div className="grid min-w-0 gap-12 lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.6fr)] lg:gap-16 xl:gap-24">
            <header className="min-w-0 lg:sticky lg:top-28 lg:self-start">
              <p className="text-sm font-medium text-emerging">{itemCountLabel(items.length)}</p>
              <h1 className="mt-4 max-w-[12ch] font-display text-[clamp(2.2rem,4.5vw,4.25rem)] leading-[1.04] text-foreground [overflow-wrap:anywhere]">
                Những lựa chọn đang cân nhắc
              </h1>
              <p className="mt-6 max-w-[52ch] leading-relaxed text-muted-foreground">
                Lưu lại chưa phải là cam kết. Hãy xem từng món trong đúng phiên bản bạn đã chọn, thử trong phòng khi có thể, rồi quyết định theo nhịp của bạn.
              </p>
              <Link
                to="/c/all"
                className="mt-8 inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-foreground underline decoration-emerging underline-offset-4 transition-colors hover:text-emerging active:text-foreground/70 focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Tìm thêm một lựa chọn
              </Link>
            </header>

            <ul className="min-w-0 divide-y divide-unbuilt border-y border-unbuilt">
              {items.map((item) => {
                const variant = item.variant
                const savedVariantDetails = getSavedVariantDetails(variant)
                const availableStock = Number(variant?.available_stock)
                const isAvailable = variant?.is_active !== false
                const inStock = isAvailable && Number.isFinite(availableStock) && availableStock > 0
                const productName = variant?.product_name ?? variant?.name ?? 'Sản phẩm đã lưu'
                const productHref = variant?.product_slug ? `/p/${variant.product_slug}` : null
                const plannerHref = variant?.model_3d_url && variant?.product_slug
                  ? `/room-planner?product=${encodeURIComponent(variant.product_slug)}&variant=${variant.id}`
                  : null

                return (
                  <li key={item.id} className="grid min-w-0 gap-6 py-8 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
                    <div className="min-w-0">
                      {productHref ? (
                        <Link
                          to={productHref}
                          className="block rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <ProductThumb
                            src={variant?.thumbnail}
                            alt={productName}
                            size="aspect-[4/3] h-auto w-full"
                          />
                        </Link>
                      ) : (
                        <ProductThumb src={variant?.thumbnail} alt={productName} size="aspect-[4/3] h-auto w-full" />
                      )}
                      <p className={`mt-3 text-sm font-medium ${inStock ? 'text-foreground' : 'text-emerging'}`}>
                        {inStock ? 'Có sẵn để tiếp tục' : isAvailable ? 'Đang tạm hết hàng' : 'Phiên bản đã dừng bán'}
                      </p>
                    </div>

                    <div className="flex min-w-0 flex-col">
                      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                        <div className="min-w-0">
                          {productHref ? (
                            <Link
                              to={productHref}
                              className="font-display text-[clamp(1.4rem,2.5vw,2rem)] leading-tight text-foreground transition-colors hover:text-emerging active:text-foreground/70 focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {productName}
                            </Link>
                          ) : (
                            <h2 className="font-display text-[clamp(1.4rem,2.5vw,2rem)] leading-tight text-foreground">{productName}</h2>
                          )}
                          {variant?.name && variant.name !== productName && (
                            <p className="mt-2 text-sm text-muted-foreground">{`Phiên bản: ${variant.name}`}</p>
                          )}
                        </div>
                        <p className={`shrink-0 text-lg font-medium text-foreground ${numericClassName}`}>
                          {formatPrice(variant?.price)}
                        </p>
                      </div>

                      {savedVariantDetails.length > 0 && (
                        <dl aria-label="Biến thể đã lưu" className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                          {savedVariantDetails.map((detail) => {
                            const [name, ...valueParts] = detail.split(':')
                            const value = valueParts.join(':').trim()
                            return (
                              <div key={detail} className="flex min-w-0 justify-between gap-3 border-b border-unbuilt/70 pb-2">
                                <dt className="text-muted-foreground">{value ? name : 'Lựa chọn'}</dt>
                                <dd className="text-right text-foreground">{value || detail}</dd>
                              </div>
                            )
                          })}
                        </dl>
                      )}

                      {isAvailable && !inStock && (
                        <label className="mt-5 flex min-h-11 items-center gap-3 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={item.notify_on_restock}
                            onChange={(event) => updateItem.mutate({ itemId: item.id, notify_on_restock: event.target.checked })}
                            className="size-4 accent-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          Báo khi còn hàng
                        </label>
                      )}

                      <div className="mt-auto flex flex-wrap items-center gap-3 pt-7">
                        {plannerHref && (
                          <ButtonLink to={plannerHref} className="px-5">
                            Thử trong phòng
                          </ButtonLink>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => handleMoveToCart(item)}
                          disabled={!inStock || moveToCart.isPending}
                          className="px-5"
                        >
                          Chuyển vào giỏ
                        </Button>
                        <button
                          type="button"
                          onClick={() => removeItem.mutate(item.id)}
                          disabled={removeItem.isPending}
                          className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-control px-3 text-sm text-muted-foreground transition-colors hover:text-destructive active:bg-unbuilt/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                          Xóa
                        </button>
                      </div>

                      {moveErrors[item.id] !== undefined && (
                        <p role="alert" className="mt-4 text-sm text-destructive">
                          Số lượng hiện có: {moveErrors[item.id]}. Sản phẩm vẫn được giữ trong danh sách.
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
