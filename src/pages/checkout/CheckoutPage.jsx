import { useEffect, useState } from 'react'
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
import { ProductThumb } from '../../components/ProductThumb'
import { formatPrice } from '../../lib/format'
import { useToastStore } from '../../store/toastStore'
import { useAuthStore } from '../../store/authStore'
import { isStaff } from '../../lib/roles'
import { cartHasStockShortfall } from '../../lib/stock'

function CheckoutNotice({ children }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 lg:px-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Thanh toán</h1>
      <div className="mt-8 rounded-card border border-border bg-surface p-10 text-center">
        <ShoppingBag size={32} className="mx-auto text-border-strong" />
        <p className="mt-4 text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

export function CheckoutPage() {
  const { data: cartData, isLoading: cartLoading } = useCart()
  const { data: addressesData, isLoading: addressesLoading } = useAddresses()
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
  const [orderError, setOrderError] = useState(null)

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
    if (addressId === null && addressList?.length > 0) {
      const defaultAddress = addressList.find((address) => address.is_default) ?? addressList[0]
      setAddressId(defaultAddress.id)
    }
  }, [addressesData, addressId])

  if (cartLoading || addressesLoading) {
    return (
      <div className="mx-auto flex max-w-7xl justify-center px-6 py-32">
        <Spinner />
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
      <div className="mx-auto max-w-2xl px-6 py-20 lg:px-10">
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
    applyVoucher.mutate(voucherCode, {
      onSuccess: (response) => setVoucherResult(response.data),
      onError: (error) => {
        setVoucherResult(null)
        setVoucherError(error.message)
      },
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setOrderError(null)

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
            ? `"${name}" chỉ còn ${available} sản phẩm trong kho. Vui lòng quay lại giỏ hàng để điều chỉnh.`
            : error.message,
        )
      } else {
        setOrderError(error.message)
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

    try {
      const returnUrl = `${window.location.origin}/checkout/return?order_id=${order.id}`
      const session = await createPaymentSession.mutateAsync({ orderId: order.id, gateway: 'payos', returnUrl })
      redirectToExternal(session.data.payment_url)
    } catch (error) {
      addToast({ title: 'Không thể tạo phiên thanh toán.', description: error.message, variant: 'error' })
    }
  }

  const isSubmitting = createOrder.isPending || createPaymentSession.isPending

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">
      <BackLink to="/cart" className="mb-4">Quay lại giỏ hàng</BackLink>
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Thanh toán</h1>

      <form onSubmit={handleSubmit} className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-foreground">Địa chỉ giao hàng</h2>
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
                        onChange={() => setAddressId(address.id)}
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
              id="checkout-voucher-code"
              label="Mã giảm giá"
              value={voucherCode}
              onChange={(event) => setVoucherCode(event.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleApplyVoucher}
              disabled={!voucherCode || applyVoucher.isPending}
            >
              {applyVoucher.isPending ? 'Đang áp dụng...' : 'Áp dụng'}
            </Button>
            {voucherError && <p role="alert" className="text-sm text-destructive">{voucherError}</p>}
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
                  <span className="text-secondary">-{formatPrice(voucherResult.discount_amount)}</span>
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

          {orderError && <p role="alert" className="mt-3 text-sm text-destructive">{orderError}</p>}

          <Button type="submit" disabled={isSubmitting || stockBlocked} className="mt-6 w-full py-3.5">
            {isSubmitting ? 'Đang xử lý...' : 'Đặt hàng'}
          </Button>
        </div>
      </form>

      <AddressFormModal open={addressModalOpen} onOpenChange={setAddressModalOpen} address={editingAddress} />
    </div>
  )
}
