import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useCart, useApplyVoucher } from '../../features/cart/hooks'
import { useAddresses } from '../../features/addresses/hooks'
import { useCreateOrder, useCreatePaymentSession } from '../../features/checkout/hooks'
import { resetCheckoutIdempotencyKey } from '../../lib/idempotency'
import { redirectToExternal } from '../../lib/navigation'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { formatPrice } from '../../lib/format'
import { useToastStore } from '../../store/toastStore'

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

  const [addressId, setAddressId] = useState(null)
  const gateway = 'payos' // PayOS is the only payment gateway
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherResult, setVoucherResult] = useState(null)
  const [voucherError, setVoucherError] = useState(null)
  const [orderError, setOrderError] = useState(null)

  const addresses = addressesData?.data ?? []
  const cart = cartData?.data
  const items = cart?.items ?? []

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
      <CheckoutNotice>
        Bạn chưa có địa chỉ giao hàng.{' '}
        <Link
          to="/account/addresses"
          className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent"
        >
          Thêm địa chỉ
        </Link>
      </CheckoutNotice>
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

  async function handleSubmit(event) {
    event.preventDefault()
    setOrderError(null)

    let order
    try {
      const response = await createOrder.mutateAsync({
        address_id: addressId,
        source: 'cart',
        ...(voucherCode.trim() ? { voucher_code: voucherCode.trim() } : {}),
      })
      order = response.data
    } catch (error) {
      setOrderError(error.message)
      return
    }

    try {
      const returnUrl = `${window.location.origin}/checkout/return?order_id=${order.id}`
      const session = await createPaymentSession.mutateAsync({ orderId: order.id, gateway, returnUrl })
      resetCheckoutIdempotencyKey()
      redirectToExternal(session.data.payment_url)
    } catch (error) {
      addToast({ title: 'Không thể tạo phiên thanh toán.', description: error.message, variant: 'error' })
    }
  }

  const isSubmitting = createOrder.isPending || createPaymentSession.isPending

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Thanh toán</h1>

      <form onSubmit={handleSubmit} className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section>
            <h2 className="font-display text-xl text-foreground">Địa chỉ giao hàng</h2>
            <div className="mt-4 flex flex-col gap-3">
              {addresses.map((address) => {
                const selected = addressId === address.id
                return (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-card border p-4 text-sm transition-colors duration-200 ${
                      selected ? 'border-foreground bg-surface-alt' : 'border-border bg-surface hover:border-border-strong'
                    }`}
                  >
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
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">Phương thức thanh toán</h2>
            <div className="mt-4 flex items-center gap-3 rounded-card border border-foreground bg-surface-alt p-4 text-sm">
              <span className="font-medium text-foreground">PayOS</span>
              <span className="text-muted-foreground">Thanh toán online qua cổng PayOS</span>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">Sản phẩm</h2>
            <ul className="mt-4 flex flex-col divide-y divide-border rounded-card border border-border bg-surface px-5">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-4 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.variant?.name}</p>
                    <p className="text-muted-foreground">
                      {item.variant?.sku} · x{item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-foreground">{formatPrice(item.subtotal)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="h-fit rounded-card border border-border bg-surface p-6 lg:sticky lg:top-28">
          <h2 className="font-display text-xl text-foreground">Tóm tắt đơn hàng</h2>

          <div className="mt-5 flex flex-col gap-2.5">
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

          {orderError && <p role="alert" className="mt-3 text-sm text-destructive">{orderError}</p>}

          <Button type="submit" disabled={isSubmitting} className="mt-6 w-full py-3.5">
            {isSubmitting ? 'Đang xử lý...' : 'Đặt hàng'}
          </Button>
        </div>
      </form>
    </div>
  )
}
