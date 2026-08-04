import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CircleAlert, Minus, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useCart, useUpdateCartItem, useRemoveCartItem, useApplyVoucher } from '../../features/cart/hooks'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { VerifyEmailGate } from '../../components/VerifyEmailGate'
import { formatPrice } from '../../lib/format'
import { isStaff } from '../../lib/roles'
import { stockShortfall, cartHasStockShortfall } from '../../lib/stock'
import { FeedbackState } from '../../components/FeedbackState'

const MAX_QUANTITY = 100

const stepperButton =
  'flex h-10 w-10 items-center justify-center rounded-control border border-border-strong text-foreground transition-colors duration-200 hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong'

function productName(item) {
  return item.variant?.product_name ?? item.variant?.name ?? 'Sản phẩm'
}

function visibleAttributes(attributes) {
  if (!attributes || Array.isArray(attributes) || typeof attributes !== 'object') return []

  return Object.entries(attributes).filter(([, value]) => (
    (typeof value === 'string' && value.trim() !== '')
    || typeof value === 'number'
    || typeof value === 'boolean'
  ))
}

function attributeLabel(key) {
  const knownLabels = {
    color: 'Màu',
    colour: 'Màu',
    size: 'Kích thước',
    material: 'Chất liệu',
    finish: 'Hoàn thiện',
  }

  return knownLabels[key] ?? key.replaceAll('_', ' ')
}

function mutationMessage(error, fallback) {
  return error?.message || fallback
}

function groupCartItems(items) {
  const groups = new Map()
  items.forEach((item) => {
    const key = item.room?.id ? `room-${item.room.id}` : 'individual'
    if (!groups.has(key)) groups.set(key, { key, room: item.room ?? null, items: [] })
    groups.get(key).items.push(item)
  })
  return [...groups.values()]
}

function CartBoundary({ title = 'Giỏ hàng', children, action }) {
  return (
    <div className="min-h-screen bg-canvas px-6 py-16 text-ink md:py-20 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-[clamp(2rem,3.2vw,2.75rem)] text-foreground">{title}</h1>
        <div className="mt-10 max-w-2xl border-t-2 border-foreground pt-6">
          <p className="max-w-xl leading-relaxed text-muted-foreground">{children}</p>
          {action}
        </div>
      </div>
    </div>
  )
}

function CartLoading() {
  return (
    <div className="min-h-screen bg-canvas px-6 py-16 text-ink md:py-20 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="font-display text-[clamp(2rem,3.2vw,2.75rem)] text-foreground">Giỏ hàng</h1>
        <div
          role="status"
          aria-label="Đang tải giỏ hàng"
          className="mt-10 border-y-2 border-foreground/25 md:grid md:grid-cols-[minmax(0,1fr)_minmax(10rem,0.28fr)]"
        >
          <div className="space-y-8 py-8 md:pr-10">
            <div className="h-24 max-w-2xl bg-unbuilt/40" />
            <div className="h-24 max-w-xl bg-unbuilt/25" />
          </div>
          <div className="border-t-2 border-foreground/25 py-8 md:border-l-2 md:border-t-0 md:pl-8">
            <div className="h-4 w-24 bg-unbuilt/50" />
            <div className="mt-4 h-8 w-36 bg-unbuilt/35" />
          </div>
          <span className="sr-only">Đang tải giỏ hàng…</span>
        </div>
      </div>
    </div>
  )
}

function ItemStatus({ children, pending = false }) {
  return (
    <p
      role={pending ? 'status' : 'alert'}
      className="flex max-w-2xl items-start gap-2 border-l-2 border-foreground pl-3 text-sm leading-relaxed text-foreground"
    >
      {pending ? null : <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={16} />}
      <span>{children}</span>
    </p>
  )
}

function CartLineItem({
  item,
  quantityDraft,
  stockError,
  mutationError,
  quantityPending,
  removalPending,
  onQuantityDraft,
  onQuantityCommit,
  onRemove,
}) {
  const name = productName(item)
  const quantity = quantityDraft ?? item.quantity
  const maxQuantity = Math.min(stockError ?? item.variant?.available_stock ?? MAX_QUANTITY, MAX_QUANTITY)
  const shortfall = stockError === undefined ? stockShortfall(item) : null
  const attributes = visibleAttributes(item.variant?.attributes)
  const itemPending = quantityPending || removalPending
  const hasDraft = quantityDraft !== undefined && Number(quantityDraft) !== item.quantity

  return (
    <li
      aria-busy={itemPending || undefined}
      className="grid md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.3fr)]"
    >
      <div className="min-w-0 border-t border-border/70 py-5 sm:py-6 md:pr-8 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-10 lg:py-5">
        <div className="flex min-w-0 items-start gap-4 sm:gap-6">
          {item.variant?.product_slug ? (
            <Link
              to={`/p/${item.variant.product_slug}`}
              aria-label={`Mở ${name}`}
              className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <ProductThumb
                src={item.variant?.thumbnail}
                alt={name}
                size="h-24 w-20 sm:w-24"
                className="rounded-none"
              />
            </Link>
          ) : (
            <ProductThumb
              src={item.variant?.thumbnail}
              alt={name}
              size="h-24 w-20 sm:w-24"
              className="rounded-none"
            />
          )}

          <div className="min-w-0 flex-1">
            {item.variant?.product_slug ? (
              <Link
                to={`/p/${item.variant.product_slug}`}
                className="font-display text-xl leading-snug text-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:text-2xl"
              >
                {name}
              </Link>
            ) : (
              <p className="font-display text-xl leading-snug text-foreground sm:text-2xl">{name}</p>
            )}

            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {[item.variant?.name, item.variant?.sku].filter(Boolean).join(' · ')}
            </p>

            {attributes.length > 0 && (
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {attributes.map(([key, value]) => (
                  <div key={key} className="flex gap-1">
                    <dt>{attributeLabel(key)}:</dt>
                    <dd className="text-foreground">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {item.room?.id && item.room?.name && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Được thêm từ phòng đã lưu “{item.room.name}”.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-12 gap-y-5 lg:mt-0 lg:flex-col lg:items-start lg:gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Đơn giá</p>
            <p className="mt-1 font-medium tabular-nums text-foreground">{formatPrice(item.unit_price_snapshot)}</p>
          </div>

          <div>
            <label htmlFor={`cart-quantity-${item.id}`} className="text-sm text-muted-foreground">
              Số lượng
            </label>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                aria-label="Giảm số lượng"
                onClick={() => onQuantityCommit(item, Number(quantity) - 1)}
                disabled={itemPending || Number(quantity) <= 1}
                className={stepperButton}
              >
                <Minus size={16} />
              </button>
              <input
                id={`cart-quantity-${item.id}`}
                type="number"
                aria-label="Số lượng"
                min={1}
                max={Math.max(maxQuantity, 1)}
                value={quantity}
                disabled={itemPending}
                onChange={(event) => onQuantityDraft(item.id, event.target.value)}
                onBlur={() => onQuantityCommit(item, quantity)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
                className="h-10 w-14 rounded-control border border-border-strong bg-canvas text-center tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                aria-label="Tăng số lượng"
                onClick={() => onQuantityCommit(item, Number(quantity) + 1)}
                disabled={itemPending || Number(quantity) >= maxQuantity}
                className={stepperButton}
              >
                <Plus size={16} />
              </button>
            </div>
            {hasDraft && !itemPending && (
              <p role="status" className="mt-1 text-xs text-muted-foreground">Chưa áp dụng</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-l-2 border-foreground/25 py-5 pl-5 md:pl-7 md:text-right lg:py-6">
        <p className="text-sm text-muted-foreground">Thành tiền dòng</p>
        <p className="mt-2  text-xl tabular-nums text-foreground lg:text-2xl">
          {formatPrice(item.subtotal)}
        </p>
      </div>

      <div className="space-y-3 pb-4 pt-3 md:col-span-2 md:pt-0">
        <button
          type="button"
          aria-label={`Xóa ${name}`}
          onClick={() => onRemove(item)}
          disabled={itemPending}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={15} />
          {removalPending ? 'Đang xóa…' : 'Xóa lựa chọn'}
        </button>

        {quantityPending && <ItemStatus pending>Đang cập nhật số lượng…</ItemStatus>}
        {removalPending && <ItemStatus pending>Đang cập nhật giỏ hàng…</ItemStatus>}
        {mutationError && <ItemStatus>{mutationError}</ItemStatus>}
        {stockError !== undefined && (
          <ItemStatus>
            {stockError <= 0
              ? 'Lựa chọn này hiện đã hết hàng. Số lượng trong giỏ chưa bị thay đổi.'
              : `Kho hiện có ${stockError} sản phẩm. Số lượng trong giỏ chưa bị thay đổi.`}
          </ItemStatus>
        )}
        {shortfall && (
          <ItemStatus>
            {shortfall.kind === 'out'
              ? 'Lựa chọn này hiện đã hết hàng. Bạn có thể xóa khỏi giỏ.'
              : `Kho hiện có ${shortfall.available} sản phẩm. Hãy giảm số lượng trước khi tiếp tục.`}
          </ItemStatus>
        )}
      </div>
    </li>
  )
}

export function CartPage() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const cartQuery = useCart()
  const { data, isLoading, isError, isFetching } = cartQuery
  const updateCartItem = useUpdateCartItem()
  const removeCartItem = useRemoveCartItem()
  const applyVoucher = useApplyVoucher()

  const [quantityDrafts, setQuantityDrafts] = useState({})
  const [pendingQuantities, setPendingQuantities] = useState({})
  const [pendingRemovals, setPendingRemovals] = useState({})
  const [stockErrors, setStockErrors] = useState({})
  const [mutationErrors, setMutationErrors] = useState({})
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherResult, setVoucherResult] = useState(null)
  const [voucherError, setVoucherError] = useState(null)
  const [voucherStaleNotice, setVoucherStaleNotice] = useState(false)

  if (!token) {
    return (
      <CartBoundary
        action={(
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 border-b-2 border-foreground pb-1 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Đăng nhập để xem giỏ hàng <ArrowRight size={16} />
          </Link>
        )}
      >
        Giỏ hàng gắn với tài khoản của bạn. Đăng nhập để xem lại các lựa chọn đã lưu.
      </CartBoundary>
    )
  }

  if (!user?.email_verified_at) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-16 text-ink md:py-20">
        <VerifyEmailGate />
      </div>
    )
  }

  if (isStaff(user)) {
    return (
      <CartBoundary>
        Tài khoản quản trị không thể mua hàng. Vui lòng dùng tài khoản khách hàng để tiếp tục tới Checkout.
      </CartBoundary>
    )
  }

  if (isLoading) return <CartLoading />

  if (isError && !data?.data) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-16 text-ink md:py-20 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-[clamp(2rem,3.2vw,2.75rem)] text-foreground">Giỏ hàng</h1>
          <LoadErrorState
            title="Chưa thể tải giỏ hàng"
            description="Có gián đoạn khi tải giỏ hàng. Các sản phẩm của bạn chưa bị thay đổi."
            onRetry={() => cartQuery.refetch()}
            isRetrying={isFetching}
            className="mt-10"
          />
        </div>
      </div>
    )
  }

  const cart = data?.data
  const items = cart?.items ?? []
  const itemGroups = groupCartItems(items)
  const checkoutBlocked = cartHasStockShortfall(items)
  const mutationPending = Object.keys(pendingQuantities).length > 0 || Object.keys(pendingRemovals).length > 0
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  function setItemPending(setter, itemId, pending) {
    setter((previous) => {
      const next = { ...previous }
      if (pending) next[itemId] = true
      else delete next[itemId]
      return next
    })
  }

  function clearItemMutationError(itemId) {
    setMutationErrors((previous) => {
      const next = { ...previous }
      delete next[itemId]
      return next
    })
  }

  function invalidateVoucherPreview() {
    setVoucherError(null)
    if (voucherResult) {
      setVoucherResult(null)
      setVoucherStaleNotice(true)
    }
  }

  function handleQuantityDraft(itemId, value) {
    setQuantityDrafts((previous) => ({ ...previous, [itemId]: value }))
  }

  function updateQuantity(item, nextQuantity) {
    if (pendingQuantities[item.id] || pendingRemovals[item.id]) return

    const parsed = Number(nextQuantity)
    const normalized = Number.isFinite(parsed) ? parsed : item.quantity
    const clamped = Math.min(Math.max(Math.round(normalized), 1), MAX_QUANTITY)

    setQuantityDrafts((previous) => {
      const next = { ...previous }
      delete next[item.id]
      return next
    })

    if (clamped === item.quantity) return

    clearItemMutationError(item.id)
    setItemPending(setPendingQuantities, item.id, true)

    updateCartItem.mutate(
      { itemId: item.id, quantity: clamped },
      {
        onSuccess: (response) => {
          if (response?.data) queryClient.setQueryData(['cart'], response)
          setStockErrors((previous) => {
            const next = { ...previous }
            delete next[item.id]
            return next
          })
          invalidateVoucherPreview()
        },
        onError: (error) => {
          if (error.code === 'INSUFFICIENT_STOCK') {
            const available = error.details?.available ?? 0
            setStockErrors((previous) => ({ ...previous, [item.id]: available }))
          } else {
            setMutationErrors((previous) => ({
              ...previous,
              [item.id]: mutationMessage(error, 'Chưa cập nhật được số lượng. Số lượng trước đó vẫn được giữ lại.'),
            }))
          }
        },
        onSettled: () => setItemPending(setPendingQuantities, item.id, false),
      },
    )
  }

  function removeItem(item) {
    if (pendingQuantities[item.id] || pendingRemovals[item.id]) return

    clearItemMutationError(item.id)
    setItemPending(setPendingRemovals, item.id, true)

    removeCartItem.mutate(item.id, {
      onSuccess: () => {
        queryClient.setQueryData(['cart'], (previous) => {
          if (!previous?.data) return previous
          const nextItems = previous.data.items.filter((current) => current.id !== item.id)
          const nextTotal = nextItems.reduce(
            (sum, current) => sum + Number(current.unit_price_snapshot) * Number(current.quantity),
            0,
          )
          return { ...previous, data: { ...previous.data, items: nextItems, total: nextTotal } }
        })
        invalidateVoucherPreview()
      },
      onError: (error) => {
        setMutationErrors((previous) => ({
          ...previous,
          [item.id]: mutationMessage(error, 'Chưa xóa được lựa chọn này. Sản phẩm vẫn được giữ trong giỏ.'),
        }))
      },
      onSettled: () => setItemPending(setPendingRemovals, item.id, false),
    })
  }

  function handleApplyVoucher(event) {
    event.preventDefault()
    setVoucherError(null)
    setVoucherStaleNotice(false)
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
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="max-w-2xl">
          <h1 className="font-display text-[clamp(2rem,3.2vw,2.75rem)] text-foreground">Giỏ hàng</h1>
          {items.length > 0 && (
            <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
              Kiểm tra lại sản phẩm, số lượng và chi phí trước khi tiếp tục.
            </p>
          )}
        </div>

        {isError && data?.data && (
          <LoadErrorState
            title="Chưa cập nhật được giỏ hàng mới nhất"
            description="Bạn vẫn đang xem dữ liệu đã tải trước đó. Hãy thử cập nhật lại trước khi tiếp tục."
            onRetry={() => cartQuery.refetch()}
            isRetrying={isFetching}
            compact
            background
            className="mt-8"
          />
        )}

        {items.length === 0 ? (
          <FeedbackState className="mt-10 max-w-3xl" title="Giỏ hàng đang trống" description="Bạn có thể quay lại danh sách sản phẩm để tiếp tục khám phá." action={<Link
              to="/c/all"
              className="mt-6 inline-flex items-center gap-2 border-b-2 border-foreground pb-1 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Xem sản phẩm <ArrowRight size={16} />
            </Link>} />
        ) : (
          <div className="mt-5 space-y-10 border-b-2 border-foreground/40 pb-8">
            {itemGroups.map((group) => <section key={group.key} aria-labelledby={`cart-group-${group.key}`}>
              <div className="mb-3 flex items-center gap-4 border-b-2 border-foreground/40 pb-4">
                {group.room?.preview_url && <img src={group.room.preview_url} alt={`Ảnh phòng ${group.room.name}`} className="h-20 w-28 shrink-0 object-cover" />}
                <div><h2 id={`cart-group-${group.key}`} className="text-lg font-medium text-foreground">{group.room ? group.room.name : 'Sản phẩm chọn riêng'}</h2>{group.room && <p className="mt-1 text-sm text-muted-foreground">Các món được thêm cùng nhau từ phòng đã lưu này.</p>}</div>
              </div>
            <ul aria-label={group.room ? `Sản phẩm từ phòng ${group.room.name}` : 'Các lựa chọn riêng trong giỏ hàng'} className="space-y-2">
              {group.items.map((item) => (
                <CartLineItem
                  key={item.id}
                  item={item}
                  quantityDraft={quantityDrafts[item.id]}
                  stockError={stockErrors[item.id]}
                  mutationError={mutationErrors[item.id]}
                  quantityPending={Boolean(pendingQuantities[item.id])}
                  removalPending={Boolean(pendingRemovals[item.id])}
                  onQuantityDraft={handleQuantityDraft}
                  onQuantityCommit={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </ul>
            </section>)}

            <section
              aria-labelledby="cart-consequence-title"
              className="grid border-t-2 border-foreground/40 md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.3fr)]"
            >
              <div className="py-6 md:pr-8">
                <h2 id="cart-consequence-title" className="font-display text-2xl text-foreground">
                  Hệ quả hiện tại
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  {items.length} lựa chọn · {totalQuantity} sản phẩm. Phí giao hàng và phương thức thanh toán được xác định ở Checkout.
                </p>
              </div>

              <div className="border-l-2 border-foreground/25 py-5 pl-5 md:pl-7 md:text-right">
                <p className="text-sm text-muted-foreground">Tổng tiền hàng</p>
                <p className="mt-2  text-2xl tabular-nums text-foreground lg:text-3xl">
                  {formatPrice(cart.total)}
                </p>

                {voucherResult && (
                  <dl className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
                    <div className="flex items-start justify-between gap-4 md:flex-col md:items-end md:gap-1">
                      <dt className="text-muted-foreground">Điều chỉnh từ mã</dt>
                      <dd className="tabular-nums text-foreground">-{formatPrice(voucherResult.discount_amount)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 md:flex-col md:items-end md:gap-1">
                      <dt className="text-muted-foreground">Số tiền xem trước</dt>
                      <dd className="font-medium tabular-nums text-foreground">{formatPrice(voucherResult.final_total)}</dd>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Đây chưa phải tổng thanh toán cuối cùng.
                    </p>
                  </dl>
                )}
              </div>
            </section>

            <section className="grid border-t border-border md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.3fr)]">
              <div className="py-4 md:pr-8">
                <details>
                  <summary className="w-fit cursor-pointer text-sm text-muted-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas">
                    Có mã giảm giá?
                  </summary>
                  <form onSubmit={handleApplyVoucher} className="mt-5 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
                    <Input
                      id="voucher-code"
                      label="Mã giảm giá"
                      value={voucherCode}
                      onChange={(event) => setVoucherCode(event.target.value)}
                      className="w-full"
                    />
                    <Button type="submit" variant="secondary" disabled={!voucherCode || applyVoucher.isPending} className="h-11 shrink-0">
                      {applyVoucher.isPending ? 'Đang áp dụng…' : 'Áp dụng'}
                    </Button>
                  </form>
                  {voucherError && <ItemStatus>{voucherError}</ItemStatus>}
                  {voucherStaleNotice && (
                    <p role="status" className="mt-4 max-w-md border-l-2 border-foreground pl-3 text-sm leading-relaxed text-foreground">
                      Giỏ hàng đã thay đổi. Hãy áp dụng lại mã để xem số tiền mới.
                    </p>
                  )}
                </details>
              </div>
              <div aria-hidden="true" className="hidden border-l-2 border-foreground/25 md:block" />
            </section>

            <div
              data-quiet-zone="reconsideration-interval"
              aria-label="Khoảng cân nhắc trước khi tiếp tục"
              className="h-6 border-t border-border"
            />

            <section className="grid md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.3fr)]">
              <div aria-hidden="true" className="hidden md:block" />
              <div className="border-l-2 border-foreground/25 pb-8 pl-5 md:pl-7 lg:pb-10">
                {checkoutBlocked ? (
                  <div>
                    <button
                      type="button"
                      disabled
                      className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-control border border-foreground/25 px-6 py-3 text-sm font-medium tracking-wide text-muted-foreground opacity-60"
                    >
                      <span>Tiến hành thanh toán</span>
                      <ArrowRight size={17} />
                    </button>
                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                      Hãy giải quyết cảnh báo kho ở lựa chọn liên quan trước khi tiếp tục.
                    </p>
                  </div>
                ) : mutationPending ? (
                  <div>
                    <button
                      type="button"
                      disabled
                      className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-control border border-foreground/25 px-6 py-3 text-sm font-medium tracking-wide text-muted-foreground opacity-60"
                    >
                      <span>Đang cập nhật giỏ hàng…</span>
                      <ArrowRight size={17} />
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/checkout"
                    className="group flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control border border-foreground/35 px-6 py-3 text-sm font-medium tracking-wide text-foreground transition-[background-color,border-color,color,opacity,transform] duration-200 ease-out hover:border-foreground hover:bg-unbuilt/20 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    <span>Tiến hành thanh toán</span>
                    <ArrowRight size={17} className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
