import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Plus, Pencil, CreditCard, Banknote, MapPin } from 'lucide-react'
import { useCart, useApplyVoucher } from '../../features/cart/hooks'
import { useAddresses } from '../../features/addresses/hooks'
import { useCreateOrder, useCreatePaymentSession } from '../../features/checkout/hooks'
import { AddressFormModal } from '../account/AddressFormModal'
import { resetCheckoutIdempotencyKey } from '../../lib/idempotency'
import { redirectToExternal } from '../../lib/navigation'
import { BackLink } from '../../components/BackLink'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { formatPrice } from '../../lib/format'
import { useToastStore } from '../../store/toastStore'
import { useAuthStore } from '../../store/authStore'
import { isStaff } from '../../lib/roles'
import { cartHasStockShortfall } from '../../lib/stock'

function fieldError(error, field) {
  const messages = error?.details?.fields?.[field]
  if (Array.isArray(messages)) return messages[0]
  return typeof messages === 'string' ? messages : null
}

function voucherFailureMessage(error) {
  if (error?.code === 'NETWORK_ERROR') {
    return 'Chưa thể kiểm tra mã giảm giá do kết nối bị gián đoạn. Vui lòng thử lại.'
  }
  if (error?.code === 'VOUCHER_EXHAUSTED') {
    return 'Mã giảm giá đã hết lượt sử dụng. Vui lòng chọn mã khác.'
  }
  if (error?.code === 'VOUCHER_NOT_APPLICABLE') {
    return 'Mã giảm giá không áp dụng được cho giỏ hàng này.'
  }

  return fieldError(error, 'voucher_code')
    ?? 'Chưa thể kiểm tra mã giảm giá. Vui lòng thử lại.'
}

function orderFailureMessage(error) {
  if (error?.code === 'NETWORK_ERROR') {
    return 'Kết nối bị gián đoạn. Chưa thể xác nhận đơn đã được tạo hay chưa. Hãy giữ nguyên thông tin và thử lại; hệ thống sẽ không tạo trùng đơn.'
  }
  if (error?.code === 'STAFF_CANNOT_PURCHASE') {
    return 'Tài khoản này không thể đặt hàng. Vui lòng dùng tài khoản khách hàng.'
  }

  return 'Chưa thể hoàn tất đặt hàng. Vui lòng kiểm tra thông tin và thử lại.'
}

function paymentSessionFailureMessage(error) {
  if (error?.code === 'ORDER_ALREADY_PAID') return null
  if (error?.code === 'TOO_MANY_REQUESTS') {
    return 'Đơn hàng đã được tạo nhưng PayOS đang giới hạn lượt thử. Vui lòng đợi một chút rồi mở lại.'
  }

  return 'Đơn hàng đã được tạo nhưng chưa thể mở PayOS. Bạn có thể thử lại an toàn mà không tạo đơn mới.'
}

function orderLabel(order) {
  return order?.order_number || `#${order?.id}`
}

function CheckoutNotice({ children }) {
  return (
    <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Thanh toán</h1>
      <div className="mt-8 rounded-card border border-border bg-surface p-10 text-center">
        <ShoppingBag size={32} className="mx-auto text-border-strong" />
        <p className="mt-4 text-muted-foreground">{children}</p>
      </div>
    </div>
    </div>
  )
}

function PaymentSessionState({ order, error, isPending, onRetry }) {
  return (
    <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
      <div className="mx-auto max-w-2xl">
        <BackLink to={`/orders/${order.id}`} className="mb-4">Quay lại đơn hàng</BackLink>
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Thanh toán đơn hàng</h1>
        <div className="mt-8 rounded-card border border-border bg-surface p-8 text-center sm:p-10">
          <CreditCard size={32} aria-hidden="true" className="mx-auto text-border-strong" />
          <p className="mt-4 font-medium text-foreground">Đơn hàng {orderLabel(order)} đã được tạo.</p>
          {error ? (
            <div role="alert" className="mt-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Không bấm đặt hàng lại — bước này chỉ mở phiên thanh toán cho đơn hiện có.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              <span>Đang mở PayOS...</span>
            </div>
          )}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {error && (
              <Button type="button" onClick={onRetry} disabled={isPending}>
                {isPending ? 'Đang mở lại...' : 'Thử mở lại PayOS'}
              </Button>
            )}
            <Link
              to={`/orders/${order.id}`}
              className="inline-flex items-center justify-center rounded-control border border-foreground px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Xem chi tiết đơn hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExistingOrderState({ orderId }) {
  return (
    <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Đơn hàng đã tồn tại</h1>
        <div role="alert" className="mt-8 rounded-card border border-border bg-surface p-8 text-center sm:p-10">
          <ShoppingBag size={32} aria-hidden="true" className="mx-auto text-border-strong" />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Yêu cầu trước đã tạo đơn hàng. Để tránh thanh toán hoặc giữ hàng hai lần, hãy kiểm tra đơn hiện có trước khi thử một đơn mới.
          </p>
          <Link
            to={`/orders/${orderId}`}
            className="mt-6 inline-flex items-center justify-center rounded-control bg-primary px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Mở đơn hàng #{orderId}
          </Link>
        </div>
      </div>
    </div>
  )
}

export function CheckoutPage() {
  const cartQuery = useCart()
  const addressesQuery = useAddresses()
  const { data: cartData, isLoading: cartLoading } = cartQuery
  const { data: addressesData, isLoading: addressesLoading } = addressesQuery
  const applyVoucher = useApplyVoucher()
  const createOrder = useCreateOrder()
  const createPaymentSession = useCreatePaymentSession()
  const addToast = useToastStore((state) => state.addToast)
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [addressId, setAddressId] = useState(null)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('payos') // 'payos' (online) | 'cod'
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherResult, setVoucherResult] = useState(null)
  const [voucherError, setVoucherError] = useState(null)
  const [addressError, setAddressError] = useState(null)
  const [orderError, setOrderError] = useState(null)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [paymentSessionError, setPaymentSessionError] = useState(null)
  const [existingOrderId, setExistingOrderId] = useState(null)
  const addressGroupRef = useRef(null)
  const voucherInputRef = useRef(null)
  const orderErrorRef = useRef(null)

  const addresses = addressesData?.data ?? []
  const cart = cartData?.data
  const items = cart?.items ?? []
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  // Proactive gate: block placing the order if a line already exceeds current stock
  // (deep-link into /checkout, or stock dropped while the cart page was open). The BE
  // reserve step is still the authoritative guard; this just fails fast with context.
  const stockBlocked = cartHasStockShortfall(items)

  useEffect(() => {
    const addressList = addressesData?.data
    if (!addressList?.length) {
      if (addressId !== null) setAddressId(null)
      return
    }

    const selectedAddressExists = addressList.some((address) => address.id === addressId)
    if (!selectedAddressExists) {
      const defaultAddress = addressList.find((address) => address.is_default) ?? addressList[0]
      setAddressId(defaultAddress.id)
    }
  }, [addressesData, addressId])

  useEffect(() => {
    if (addressError) {
      addressGroupRef.current?.querySelector('input[type="radio"]')?.focus()
    }
  }, [addressError])

  useEffect(() => {
    if (voucherError) voucherInputRef.current?.focus()
  }, [voucherError])

  useEffect(() => {
    if (orderError) orderErrorRef.current?.focus()
  }, [orderError])

  const hasBackgroundError =
    (cartQuery.isError && Boolean(cartData?.data))
    || (addressesQuery.isError && Boolean(addressesData?.data))
  const hasValidAddress = addresses.some((address) => address.id === addressId)
  const isSubmitting = createOrder.isPending || createPaymentSession.isPending

  if (cartLoading || addressesLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto flex max-w-7xl justify-center px-6 py-32">
          <Spinner />
        </div>
      </div>
    )
  }

  if (isStaff(user)) {
    return (
      <CheckoutNotice>
        Tài khoản quản trị không thể mua hàng. Vui lòng dùng tài khoản khách hàng.
      </CheckoutNotice>
    )
  }

  const cartUnavailable = cartQuery.isError && !cartData?.data
  const addressesUnavailable = addressesQuery.isError && !addressesData?.data

  if (cartUnavailable || addressesUnavailable) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
        <div className="mx-auto max-w-2xl">
          <BackLink to="/cart" className="mb-4">Quay lại giỏ hàng</BackLink>
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Thanh toán</h1>
          <LoadErrorState
            title="Chưa thể chuẩn bị thanh toán"
            description="Chưa tải đủ giỏ hàng và địa chỉ giao hàng. Chưa có đơn hàng hay phiên thanh toán nào được tạo."
            onRetry={() => {
              if (cartUnavailable) cartQuery.refetch()
              if (addressesUnavailable) addressesQuery.refetch()
            }}
            isRetrying={cartQuery.isFetching || addressesQuery.isFetching}
            className="mt-8"
          />
        </div>
      </div>
    )
  }

  // Once an order exists, recovery must stay attached to that order even after
  // the successful checkout transaction clears and refetches the cart.
  if (placedOrder) {
    return (
      <PaymentSessionState
        order={placedOrder}
        error={paymentSessionError}
        isPending={createPaymentSession.isPending}
        onRetry={() => openPaymentSession(placedOrder)}
      />
    )
  }

  if (existingOrderId) {
    return <ExistingOrderState orderId={existingOrderId} />
  }

  if (items.length === 0) {
    return (
      <CheckoutNotice>
        Giỏ hàng của bạn đang trống.{' '}
        <Link to="/cart" className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent">
          Quay lại giỏ hàng
        </Link>
      </CheckoutNotice>
    )
  }

  if (addresses.length === 0) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-20 text-ink lg:px-10">
      <div className="mx-auto max-w-2xl">
        <BackLink to="/cart" className="mb-4">Quay lại giỏ hàng</BackLink>
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Thanh toán</h1>
        <div className="mt-8 rounded-card border border-border bg-surface p-10 text-center">
          <MapPin size={32} className="mx-auto text-border-strong" />
          <p className="mt-4 text-muted-foreground">
            Bạn chưa có địa chỉ giao hàng. Thêm một địa chỉ để tiếp tục thanh toán.
          </p>
          <Button onClick={openCreateAddress} className="mt-6">Thêm địa chỉ</Button>
        </div>
        <AddressFormModal open={addressModalOpen} onOpenChange={setAddressModalOpen} address={editingAddress} />
      </div>
      </div>
    )
  }

  function openCreateAddress() {
    setEditingAddress(null)
    setAddressModalOpen(true)
  }

  function openEditAddress(address) {
    setEditingAddress(address)
    setAddressModalOpen(true)
  }

  function handleApplyVoucher(event) {
    event.preventDefault()
    setVoucherError(null)
    const normalizedCode = voucherCode.trim()

    applyVoucher.mutate(normalizedCode, {
      onSuccess: (response) => setVoucherResult(response.data),
      onError: (error) => {
        setVoucherResult(null)
        setVoucherError(voucherFailureMessage(error))
      },
    })
  }

  function handleVoucherCodeChange(event) {
    setVoucherCode(event.target.value)
    setVoucherResult(null)
    setVoucherError(null)
  }

  async function openPaymentSession(order) {
    setPaymentSessionError(null)

    try {
      const returnUrl = `${window.location.origin}/checkout/return?order_id=${order.id}`
      const session = await createPaymentSession.mutateAsync({ orderId: order.id, gateway: 'payos', returnUrl })
      redirectToExternal(session.data.payment_url)
    } catch (error) {
      if (error.code === 'ORDER_ALREADY_PAID') {
        navigate(`/orders/${order.id}`)
        return
      }

      setPaymentSessionError(paymentSessionFailureMessage(error))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (hasBackgroundError || !hasValidAddress || stockBlocked || isSubmitting) return

    setOrderError(null)
    setAddressError(null)
    setExistingOrderId(null)

    let order
    try {
      const response = await createOrder.mutateAsync({
        address_id: addressId,
        source: 'cart',
        payment_method: paymentMethod,
        ...(voucherCode.trim() ? { voucher_code: voucherCode.trim() } : {}),
      })
      order = response.data
    } catch (error) {
      if (error.code === 'INSUFFICIENT_STOCK') {
        // Stock changed under us at the reserve step. Refresh the cart so the summary
        // reflects the new availability, and name the offending item so the user knows
        // exactly what to fix back in the cart.
        queryClient.invalidateQueries({ queryKey: ['cart'] })
        const shortItem = items.find((item) => item.variant?.id === error.details?.variant_id)
        const name = shortItem?.variant?.product_name ?? shortItem?.variant?.name
        const available = error.details?.available ?? 0
        setOrderError(
          name
            ? `Kho chỉ đủ ${available} sản phẩm cho "${name}". Vui lòng quay lại giỏ hàng để điều chỉnh.`
            : 'Số lượng trong kho vừa thay đổi. Vui lòng quay lại giỏ hàng để điều chỉnh.',
        )
      } else if (error.code === 'DUPLICATE_IDEMPOTENCY_KEY' && error.details?.order_id) {
        setExistingOrderId(error.details.order_id)
      } else if (error.code === 'VALIDATION_FAILED' && fieldError(error, 'address_id')) {
        setAddressError('Địa chỉ giao hàng không còn hợp lệ. Vui lòng chọn lại một địa chỉ.')
      } else if (
        ['VOUCHER_EXHAUSTED', 'VOUCHER_NOT_APPLICABLE'].includes(error.code)
        || (error.code === 'VALIDATION_FAILED' && fieldError(error, 'voucher_code'))
      ) {
        setVoucherResult(null)
        setVoucherError(voucherFailureMessage(error))
      } else {
        setOrderError(orderFailureMessage(error))
      }
      return
    }

    // The order now exists; a retry should start a fresh order, so rotate the key.
    resetCheckoutIdempotencyKey()

    // COD orders are confirmed at placement — no online payment step. Go to the order.
    if (paymentMethod === 'cod') {
      addToast({
        title: 'Đặt hàng thành công!',
        description: 'Bạn sẽ thanh toán khi nhận hàng.',
        variant: 'success',
      })
      navigate(`/orders/${order.id}`)
      return
    }

    setPlacedOrder(order)
    await openPaymentSession(order)
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
    <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">
      <BackLink to="/cart" className="mb-4">Quay lại giỏ hàng</BackLink>
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Thanh toán</h1>
      {hasBackgroundError && (
        <LoadErrorState
          title="Chưa cập nhật được thông tin thanh toán mới nhất"
          description="Bạn đang xem dữ liệu đã tải trước đó. Hãy thử cập nhật lại trước khi đặt hàng."
          onRetry={() => {
            if (cartQuery.isError) cartQuery.refetch()
            if (addressesQuery.isError) addressesQuery.refetch()
          }}
          isRetrying={cartQuery.isFetching || addressesQuery.isFetching}
          compact
          background
          className="mt-6"
        />
      )}

      <form onSubmit={handleSubmit} className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section
            ref={addressGroupRef}
            aria-labelledby="checkout-address-heading"
            aria-describedby={addressError ? 'checkout-address-error' : undefined}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="checkout-address-heading" className="font-display text-xl text-foreground">Địa chỉ giao hàng</h2>
              <button
                type="button"
                onClick={openCreateAddress}
                className="inline-flex items-center gap-1.5 rounded-control text-sm text-foreground transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Plus size={15} />
                Thêm địa chỉ
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {addresses.map((address) => {
                const selected = addressId === address.id
                return (
                  <div
                    key={address.id}
                    className={`flex items-start gap-3 rounded-card border p-4 text-sm transition-colors duration-200 ${
                      selected ? 'border-foreground bg-surface-alt' : 'border-border bg-surface hover:border-border-strong'
                    }`}
                  >
                    <label className="flex flex-1 cursor-pointer items-start gap-3">
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selected}
                        onChange={() => {
                          setAddressId(address.id)
                          setAddressError(null)
                        }}
                        aria-invalid={addressError ? 'true' : undefined}
                        aria-describedby={addressError ? 'checkout-address-error' : undefined}
                        className="mt-1 accent-[var(--color-foreground)]"
                      />
                      <span>
                        <span className="font-medium text-foreground">
                          {address.recipient_name} · {address.phone}
                        </span>
                        <br />
                        <span className="text-muted-foreground">
                          {[address.address_line1, address.address_line2, address.city, address.province, address.postal_code]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => openEditAddress(address)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-control text-muted-foreground transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      aria-label={`Sửa địa chỉ của ${address.recipient_name}`}
                    >
                      <Pencil size={14} />
                      Sửa
                    </button>
                  </div>
                )
              })}
            </div>
            {addressError && (
              <p id="checkout-address-error" role="alert" className="mt-3 text-sm text-destructive">
                {addressError}
              </p>
            )}
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">Phương thức thanh toán</h2>
            <div className="mt-4 flex flex-col gap-3">
              {[
                { value: 'payos', icon: CreditCard, label: 'Thanh toán online (PayOS)', hint: 'Chuyển tới cổng PayOS để thanh toán ngay' },
                { value: 'cod', icon: Banknote, label: 'Thanh toán khi nhận hàng (COD)', hint: 'Trả tiền mặt cho shipper khi nhận hàng' },
              ].map(({ value, icon: Icon, label, hint }) => {
                const selected = paymentMethod === value
                return (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-card border p-4 text-sm transition-colors duration-200 ${
                      selected ? 'border-foreground bg-surface-alt' : 'border-border bg-surface hover:border-border-strong'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={value}
                      checked={selected}
                      onChange={() => setPaymentMethod(value)}
                      className="accent-[var(--color-foreground)]"
                    />
                    <Icon size={20} className={selected ? 'text-foreground' : 'text-muted-foreground'} />
                    <span className="flex flex-col">
                      <span className="font-medium text-foreground">{label}</span>
                      <span className="text-muted-foreground">{hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </section>
        </div>

        <div className="h-fit rounded-card border border-border bg-surface p-6 lg:sticky lg:top-28">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl text-foreground">Tóm tắt đơn hàng</h2>
            <span className="text-sm text-muted-foreground">{totalQuantity} sản phẩm</span>
          </div>

          <ul className="mt-5 flex max-h-72 flex-col divide-y divide-border overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3 text-sm first:pt-0">
                <ProductThumb src={item.variant?.thumbnail} alt={item.variant?.product_name} size="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {item.variant?.product_name ?? item.variant?.name}
                  </p>
                  <p className="truncate text-muted-foreground">
                    {item.variant?.name} · x{item.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-medium text-foreground">{formatPrice(item.subtotal)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-2.5 border-t border-border pt-5">
            <Input
              ref={voucherInputRef}
              id="checkout-voucher-code"
              label="Mã giảm giá"
              value={voucherCode}
              onChange={handleVoucherCodeChange}
              error={voucherError}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleApplyVoucher}
              disabled={!voucherCode.trim() || applyVoucher.isPending}
            >
              {applyVoucher.isPending ? 'Đang áp dụng...' : 'Áp dụng'}
            </Button>
          </div>

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

          {stockBlocked && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Một số sản phẩm trong giỏ đã vượt số lượng còn trong kho.{' '}
              <Link to="/cart" className="underline decoration-accent underline-offset-4 hover:text-accent">
                Quay lại giỏ hàng
              </Link>{' '}
              để điều chỉnh.
            </p>
          )}

          {orderError && (
            <p
              ref={orderErrorRef}
              tabIndex={-1}
              role="alert"
              className="mt-3 rounded-control text-sm text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {orderError}
            </p>
          )}

          {/* State 4 "Committed": the one and only `confirmed` #3D5A45 action
              site-wide. Not `bg-primary`/ink — this is the moment of decision. */}
          <Button
            type="submit"
            variant="confirmed"
            disabled={isSubmitting || stockBlocked || hasBackgroundError || !hasValidAddress}
            className="mt-6 w-full py-3.5"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Đặt hàng'}
          </Button>
        </div>
      </form>

      <AddressFormModal open={addressModalOpen} onOpenChange={setAddressModalOpen} address={editingAddress} />
    </div>
    </div>
  )
}
