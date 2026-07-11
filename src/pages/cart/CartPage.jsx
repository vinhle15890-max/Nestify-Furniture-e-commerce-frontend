import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useCart, useUpdateCartItem, useRemoveCartItem, useApplyVoucher } from '../../features/cart/hooks'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { BecomingRoomArt } from '../../components/BecomingRoomArt'
import { formatPrice } from '../../lib/format'
import { stockShortfall, cartHasStockShortfall } from '../../lib/stock'

const MAX_QUANTITY = 100

const stepperButton =
  'flex h-10 w-10 items-center justify-center rounded-control border border-border-strong text-foreground transition-colors duration-200 hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-40 disabled:hover:border-border-strong'

export function CartPage() {
  const token = useAuthStore((state) => state.token)
  const cartQuery = useCart()
  const { data, isLoading, isError, isFetching } = cartQuery
  const updateCartItem = useUpdateCartItem()
  const removeCartItem = useRemoveCartItem()
  const applyVoucher = useApplyVoucher()

  const [quantities, setQuantities] = useState({})
  const [stockErrors, setStockErrors] = useState({})
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherResult, setVoucherResult] = useState(null)
  const [voucherError, setVoucherError] = useState(null)

  if (!token) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Giỏ hàng</h1>
        <div className="mt-8 rounded-card border border-border bg-surface p-10 text-center">
          <ShoppingBag size={32} className="mx-auto text-border-strong" />
          <p className="mt-4 text-muted-foreground">
            Vui lòng{' '}
            <Link to="/login" className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent">
              đăng nhập
            </Link>{' '}
            để xem giỏ hàng của bạn.
          </p>
        </div>
      </div>
      </div>
    )
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

  if (isError && !data?.data) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Giỏ hàng</h1>
          <LoadErrorState
            title="Chưa thể tải giỏ hàng"
            description="Có gián đoạn khi tải giỏ hàng. Các sản phẩm của bạn chưa bị thay đổi."
            onRetry={() => cartQuery.refetch()}
            isRetrying={isFetching}
            className="mt-8"
          />
        </div>
      </div>
    )
  }

  const cart = data?.data
  const items = cart?.items ?? []
  const checkoutBlocked = cartHasStockShortfall(items)

  function updateQuantity(item, nextQuantity) {
    const clamped = Math.min(Math.max(nextQuantity, 1), MAX_QUANTITY)
    setQuantities((prev) => ({ ...prev, [item.id]: clamped }))
    updateCartItem.mutate(
      { itemId: item.id, quantity: clamped },
      {
        onSuccess: () => {
          setStockErrors((prev) => {
            const next = { ...prev }
            delete next[item.id]
            return next
          })
        },
        onError: (error) => {
          if (error.code === 'INSUFFICIENT_STOCK') {
            const available = error.details?.available ?? 0
            setStockErrors((prev) => ({ ...prev, [item.id]: available }))
            setQuantities((prev) => ({ ...prev, [item.id]: Math.max(available, 1) }))
          }
        },
      },
    )
  }

  function handleApplyVoucher(event) {
    event.preventDefault()
    setVoucherError(null)
    applyVoucher.mutate(voucherCode, {
      onSuccess: (response) => setVoucherResult(response.data),
      onError: (error) => {
        setVoucherResult(null)
        setVoucherError(error.message)
      },
    })
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
    <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Giỏ hàng</h1>
      {isError && data?.data && (
        <LoadErrorState
          title="Chưa cập nhật được giỏ hàng mới nhất"
          description="Bạn vẫn có thể xem dữ liệu đã tải trước đó hoặc thử cập nhật lại."
          onRetry={() => cartQuery.refetch()}
          isRetrying={isFetching}
          compact
          background
          className="mt-6"
        />
      )}
      {items.length > 0 && (
        <p className="mt-2 text-muted-foreground">Những gì sắp thuộc về không gian của bạn.</p>
      )}

      {items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-card border border-border bg-surface px-6 py-14 text-center">
          <div className="pointer-events-none w-full max-w-[300px]">
            <BecomingRoomArt level={1} />
          </div>
          <p className="mt-6 max-w-sm text-lg text-foreground">Giỏ hàng của bạn còn trống.</p>
          <p className="mt-2 max-w-sm text-muted-foreground">
            Hãy tìm những món đầu tiên cho căn phòng của bạn.
          </p>
          <Link
            to="/c/all"
            className="mt-6 inline-flex items-center rounded-control bg-primary px-7 py-3.5 text-sm font-medium text-surface transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <ul className="flex flex-col divide-y divide-border lg:col-span-2">
            {items.map((item) => {
              const quantity = quantities[item.id] ?? item.quantity
              const maxQuantity = Math.min(
                stockErrors[item.id] ?? item.variant?.available_stock ?? MAX_QUANTITY,
                MAX_QUANTITY,
              )
              // Payload-derived shortfall (the saved quantity already exceeds current
              // stock, e.g. others bought while this sat in the cart). Suppressed when a
              // live update-failure message is already shown for this line.
              const shortfall = stockErrors[item.id] === undefined ? stockShortfall(item) : null

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
                            className="font-display text-lg text-foreground transition-colors duration-200 hover:text-accent"
                          >
                            {item.variant?.product_name ?? item.variant?.name}
                          </Link>
                        ) : (
                          <p className="font-display text-lg text-foreground">{item.variant?.product_name ?? item.variant?.name}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{item.variant?.name} · {item.variant?.sku}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{formatPrice(item.unit_price_snapshot)}</p>
                        {/* Reaffirmation, not persuasion: `imagined` inherited from the Planner,
                            one step before `confirmed` at Checkout. Only when the item genuinely
                            came from a saved room — no fabricated callback otherwise. */}
                        {item.room?.name && (
                          <p className="mt-1.5 text-sm text-imagined">
                            Đã xác nhận vừa với phòng “{item.room.name}” bạn đã tạo.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Giảm số lượng"
                        onClick={() => updateQuantity(item, quantity - 1)}
                        disabled={quantity <= 1}
                        className={stepperButton}
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        aria-label="Số lượng"
                        min={1}
                        max={Math.max(maxQuantity, 1)}
                        value={quantity}
                        onChange={(event) => {
                          const next = Number(event.target.value)
                          setQuantities((prev) => ({ ...prev, [item.id]: next }))
                        }}
                        onBlur={() => updateQuantity(item, quantity)}
                        className="h-10 w-14 rounded-control border border-border-strong bg-surface text-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                      <button
                        type="button"
                        aria-label="Tăng số lượng"
                        onClick={() => updateQuantity(item, quantity + 1)}
                        disabled={quantity >= maxQuantity}
                        className={stepperButton}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <p className="min-w-[7rem] text-right font-medium text-foreground">{formatPrice(item.subtotal)}</p>

                    <button
                      type="button"
                      onClick={() => removeCartItem.mutate(item.id)}
                      className="flex items-center gap-1.5 rounded-control text-sm text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Trash2 size={15} />
                      Xóa
                    </button>
                  </div>

                  {stockErrors[item.id] !== undefined && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      Kho chỉ đủ {stockErrors[item.id]} sản phẩm cho lựa chọn này
                    </p>
                  )}

                  {shortfall && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {shortfall.kind === 'out'
                        ? 'Sản phẩm đã hết hàng — vui lòng xóa khỏi giỏ.'
                        : `Kho chỉ đủ ${shortfall.available} sản phẩm cho lựa chọn này — vui lòng giảm số lượng.`}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="h-fit rounded-card border border-border bg-surface p-6 lg:sticky lg:top-28">
            <h2 className="font-display text-xl text-foreground">Tóm tắt đơn hàng</h2>

            <form onSubmit={handleApplyVoucher} className="mt-5 flex flex-col gap-2.5">
              <Input
                id="voucher-code"
                label="Mã giảm giá"
                value={voucherCode}
                onChange={(event) => setVoucherCode(event.target.value)}
              />
              <Button type="submit" variant="secondary" disabled={!voucherCode || applyVoucher.isPending}>
                {applyVoucher.isPending ? 'Đang áp dụng...' : 'Áp dụng'}
              </Button>
              {voucherError && <p role="alert" className="text-sm text-destructive">{voucherError}</p>}
            </form>

            <div className="mt-5 flex flex-col gap-2.5 border-t border-border pt-5 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Tổng tiền hàng</span>
                <span className="text-foreground">{formatPrice(cart.total)}</span>
              </div>

              {voucherResult && (
                <>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Giảm giá</span>
                    <span className="text-ink">-{formatPrice(voucherResult.discount_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2.5 text-base font-medium text-foreground">
                    <span>Thành tiền</span>
                    <span>{formatPrice(voucherResult.final_total)}</span>
                  </div>
                </>
              )}
            </div>

            {checkoutBlocked ? (
              <div className="mt-6">
                <Button className="w-full py-3.5" disabled>Tiến hành thanh toán</Button>
                <p role="alert" className="mt-2 text-sm text-destructive">
                  Một số sản phẩm vượt quá số lượng còn trong kho. Vui lòng điều chỉnh giỏ hàng để tiếp tục.
                </p>
              </div>
            ) : (
              <Link to="/checkout" className="mt-6 block">
                <Button className="w-full py-3.5">Tiến hành thanh toán</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
