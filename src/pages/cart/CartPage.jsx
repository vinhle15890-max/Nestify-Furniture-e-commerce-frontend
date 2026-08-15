import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, CircleAlert, Minus, Plus, Search, Ticket, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useCart, useUpdateCartItem, useRemoveCartItem, useApplyVoucher, useAvailableVouchers } from '../../features/cart/hooks'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { VerifyEmailGate } from '../../components/VerifyEmailGate'
import { formatPrice } from '../../lib/format'
import { isStaff } from '../../lib/roles'
import { stockShortfall, cartHasStockShortfall } from '../../lib/stock'
import { FeedbackState } from '../../components/FeedbackState'

const MAX_QUANTITY = 100
const VOUCHER_RESULT_LIMIT = 6

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
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
              {item.variant?.product_slug ? (
                <Link
                  to={`/p/${item.variant.product_slug}`}
                  className="min-w-0 font-display text-xl leading-snug text-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:text-2xl"
                >
                  {name}
                </Link>
              ) : (
                <p className="min-w-0 font-display text-xl leading-snug text-foreground sm:text-2xl">{name}</p>
              )}
              <button
                type="button"
                aria-label={`Xóa ${name}`}
                onClick={() => onRemove(item)}
                disabled={itemPending}
                className="inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap px-1 text-sm text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-destructive active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" size={15} />
                {removalPending ? 'Đang xóa…' : 'Xóa lựa chọn'}
              </button>
            </div>

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
  const availableVouchersQuery = useAvailableVouchers(Boolean(token && user?.email_verified_at && !isStaff(user)))

  const [quantityDrafts, setQuantityDrafts] = useState({})
  const [pendingQuantities, setPendingQuantities] = useState({})
  const [pendingRemovals, setPendingRemovals] = useState({})
  const [stockErrors, setStockErrors] = useState({})
  const [mutationErrors, setMutationErrors] = useState({})
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherResult, setVoucherResult] = useState(null)
  const [voucherError, setVoucherError] = useState(null)
  const [voucherStaleNotice, setVoucherStaleNotice] = useState(false)
  const [voucherSearch, setVoucherSearch] = useState('')
  const [voucherPage, setVoucherPage] = useState(0)

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
  const voucherPreviewTotal = voucherResult?.final_total
    ?? Math.max(0, Number(cart?.total ?? 0) - Number(voucherResult?.discount_amount ?? 0))
  const itemGroups = groupCartItems(items)
  const checkoutBlocked = cartHasStockShortfall(items)
  const mutationPending = Object.keys(pendingQuantities).length > 0 || Object.keys(pendingRemovals).length > 0
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const availableVouchers = availableVouchersQuery.data?.data ?? []
  const normalizedVoucherSearch = voucherSearch.trim().toLocaleUpperCase('vi-VN')
  const matchingVouchers = normalizedVoucherSearch
    ? availableVouchers.filter((voucher) => voucher.code.toLocaleUpperCase('vi-VN').includes(normalizedVoucherSearch))
    : availableVouchers
  const voucherPageCount = Math.max(1, Math.ceil(matchingVouchers.length / VOUCHER_RESULT_LIMIT))
  const safeVoucherPage = Math.min(voucherPage, voucherPageCount - 1)
  const firstVisibleVoucher = safeVoucherPage * VOUCHER_RESULT_LIMIT
  const visibleVouchers = matchingVouchers.slice(firstVisibleVoucher, firstVisibleVoucher + VOUCHER_RESULT_LIMIT)

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

  function chooseVoucher(code) {
    setVoucherCode(code)
    setVoucherError(null)
    setVoucherStaleNotice(false)
    applyVoucher.mutate(code, {
      onSuccess: (response) => setVoucherResult(response.data),
      onError: (error) => {
        setVoucherResult(null)
        setVoucherError(error.message)
      },
    })
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="mx-auto max-w-7xl px-6 pb-32 pt-8 lg:px-10 lg:pb-36">
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
              aria-labelledby="cart-summary-title"
              className="grid border-t-2 border-foreground/40 md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.3fr)]"
            >
              <div className="py-6 md:pr-8">
                <h2 id="cart-summary-title" className="font-display text-2xl text-foreground">
                  Tóm tắt giỏ hàng
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
                      <dt className="text-muted-foreground">Thành tiền dự kiến</dt>
                      <dd className="font-medium tabular-nums text-foreground">{formatPrice(voucherPreviewTotal)}</dd>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Đây chưa phải tổng thanh toán cuối cùng.
                    </p>
                  </dl>
                )}
              </div>
            </section>

            <section aria-labelledby="available-vouchers-heading" className="grid border-t border-border md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.3fr)]">
              <div className="py-6 md:pr-8">
                <h2 id="available-vouchers-heading" className="flex items-center gap-2 text-lg font-medium text-foreground">
                  <Ticket aria-hidden="true" size={19} /> Mã giảm giá có thể dùng
                </h2>
                {availableVouchersQuery.isLoading ? (
                  <p role="status" className="mt-3 text-sm text-muted-foreground">Đang tìm mã phù hợp với giỏ hàng…</p>
                ) : availableVouchersQuery.isError ? (
                  <button type="button" onClick={() => availableVouchersQuery.refetch()} className="mt-3 text-sm text-foreground underline underline-offset-4">Chưa tải được mã. Thử lại</button>
                ) : availableVouchers.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Hiện chưa có mã giảm giá cho giỏ hàng này.</p>
                ) : (
                  <div className="mt-4">
                    <label htmlFor="voucher-search" className="block text-sm font-medium text-foreground">
                      Tìm mã giảm giá
                    </label>
                    <div className="relative mt-2 max-w-xl">
                      <Search aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="voucher-search"
                        type="search"
                        value={voucherSearch}
                        onChange={(event) => {
                          setVoucherSearch(event.target.value)
                          setVoucherPage(0)
                        }}
                        placeholder="Ví dụ: NEST10"
                        aria-describedby="voucher-search-status"
                        className="min-h-12 w-full rounded-control border border-border-strong bg-canvas py-3 pl-11 pr-4 text-foreground outline outline-2 outline-offset-1 outline-transparent transition-colors placeholder:text-muted-foreground hover:bg-unbuilt/15 focus:border-foreground focus:outline-ring"
                      />
                    </div>
                    <p id="voucher-search-status" className="mt-2 text-sm text-muted-foreground">
                      {matchingVouchers.length > VOUCHER_RESULT_LIMIT
                        ? `Hiển thị ${firstVisibleVoucher + 1}–${firstVisibleVoucher + visibleVouchers.length} trong ${matchingVouchers.length} mã`
                        : `${matchingVouchers.length} mã phù hợp`}
                    </p>

                    {matchingVouchers.length === 0 ? (
                      <p className="mt-4 text-sm text-foreground">Không tìm thấy mã phù hợp. Hãy kiểm tra lại nội dung đã nhập.</p>
                    ) : (
                      <div role="radiogroup" aria-label="Chọn mã giảm giá" className="mt-4 grid gap-3 sm:grid-cols-2">
                        {visibleVouchers.map((voucher) => {
                          const selected = voucherCode === voucher.code && Boolean(voucherResult)
                          return (
                            <button
                              key={voucher.code}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              disabled={applyVoucher.isPending}
                              onClick={() => chooseVoucher(voucher.code)}
                              className="flex min-h-20 min-w-0 items-center justify-between gap-4 rounded-control border border-border-strong bg-canvas px-4 py-3 text-left transition-[background-color,border-color,transform] duration-200 hover:border-foreground hover:bg-unbuilt/20 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                            >
                              <span className="min-w-0"><span className="block font-semibold tracking-wide text-foreground">{voucher.code}</span><span className="mt-1 block text-sm text-muted-foreground">Giảm {formatPrice(voucher.discount_amount)}</span></span>
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-foreground bg-foreground text-canvas' : 'border-border-strong text-transparent'}`}><Check size={15} /></span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {matchingVouchers.length > VOUCHER_RESULT_LIMIT && (
                      <nav aria-label="Trang mã giảm giá" className="mt-4 flex items-center justify-between gap-4">
                        <button
                          type="button"
                          disabled={safeVoucherPage === 0}
                          onClick={() => setVoucherPage((page) => Math.max(0, page - 1))}
                          className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-control px-2 text-sm font-medium text-foreground transition-colors hover:bg-unbuilt/20 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowLeft aria-hidden="true" size={16} /> Trước
                        </button>
                        <span className="text-sm tabular-nums text-muted-foreground">Trang {safeVoucherPage + 1}/{voucherPageCount}</span>
                        <button
                          type="button"
                          disabled={safeVoucherPage >= voucherPageCount - 1}
                          onClick={() => setVoucherPage((page) => Math.min(voucherPageCount - 1, page + 1))}
                          className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-control px-2 text-sm font-medium text-foreground transition-colors hover:bg-unbuilt/20 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Sau <ArrowRight aria-hidden="true" size={16} />
                        </button>
                      </nav>
                    )}
                  </div>
                )}
                  {voucherError && <ItemStatus>{voucherError}</ItemStatus>}
                  {voucherStaleNotice && (
                    <p role="status" className="mt-4 max-w-md border-l-2 border-foreground pl-3 text-sm leading-relaxed text-foreground">
                      Giỏ hàng đã thay đổi. Hãy áp dụng lại mã để xem số tiền mới.
                    </p>
                  )}
              </div>
              <div aria-hidden="true" className="hidden border-l-2 border-foreground/25 md:block" />
            </section>

            <div
              data-quiet-zone="reconsideration-interval"
              aria-label="Khoảng cân nhắc trước khi tiếp tục"
              className="h-6 border-t border-border"
            />

            <aside aria-label="Tiếp tục thanh toán" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-canvas/95 py-3 pl-5 pr-20 shadow-xl backdrop-blur-sm sm:pl-6 sm:pr-24 lg:left-auto lg:right-24 lg:bottom-6 lg:w-[24rem] lg:rounded-control lg:border lg:px-6">
                {checkoutBlocked ? (
                  <div>
                    <button
                      type="button"
                      disabled
                    className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-control bg-foreground/15 px-6 py-3 text-sm font-semibold tracking-wide text-muted-foreground"
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
                    className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-control bg-foreground/15 px-6 py-3 text-sm font-semibold tracking-wide text-muted-foreground"
                    >
                      <span>Đang cập nhật giỏ hàng…</span>
                      <ArrowRight size={17} />
                    </button>
                  </div>
                ) : (
                  <Link
                    to={voucherResult ? `/checkout?voucher=${encodeURIComponent(voucherCode)}` : '/checkout'}
                    className="group flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-control bg-foreground px-6 py-3 text-sm font-semibold tracking-wide text-canvas transition-[opacity,transform] duration-200 ease-out hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    <span>Tiến hành thanh toán</span>
                    <ArrowRight size={17} className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                  </Link>
                )}
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
