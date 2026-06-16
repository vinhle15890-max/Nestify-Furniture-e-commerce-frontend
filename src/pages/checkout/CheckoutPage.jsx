import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart, useApplyVoucher } from '../../features/cart/hooks'
import { useAddresses } from '../../features/addresses/hooks'
import { useCreateOrder, useCreatePaymentSession } from '../../features/checkout/hooks'
import { resetCheckoutIdempotencyKey } from '../../lib/idempotency'
import { redirectToExternal } from '../../lib/navigation'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { formatPrice } from '../../lib/format'
import { useToastStore } from '../../store/toastStore'

const GATEWAYS = [
  { value: 'payos', label: 'PayOS' },
  { value: 'stripe', label: 'Stripe' },
]

export function CheckoutPage() {
  const { data: cartData, isLoading: cartLoading } = useCart()
  const { data: addressesData, isLoading: addressesLoading } = useAddresses()
  const applyVoucher = useApplyVoucher()
  const createOrder = useCreateOrder()
  const createPaymentSession = useCreatePaymentSession()
  const addToast = useToastStore((state) => state.addToast)

  const [addressId, setAddressId] = useState(null)
  const [gateway, setGateway] = useState('payos')
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
      <div className="mx-auto flex max-w-6xl justify-center px-4 py-24">
        <Spinner />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-3xl text-foreground">Thanh toán</h1>
        <Card className="mt-6">
          <p className="text-sm text-muted-foreground">
            Giỏ hàng của bạn đang trống.{' '}
            <Link to="/cart" className="text-primary hover:underline">
              Quay lại giỏ hàng
            </Link>
          </p>
        </Card>
      </div>
    )
  }

  if (addresses.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-3xl text-foreground">Thanh toán</h1>
        <Card className="mt-6">
          <p className="text-sm text-muted-foreground">
            Bạn chưa có địa chỉ giao hàng.{' '}
            <Link to="/account/addresses" className="text-primary hover:underline">
              Thêm địa chỉ
            </Link>
          </p>
        </Card>
      </div>
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
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Thanh toán</h1>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-xl text-foreground">Địa chỉ giao hàng</h2>
            <div className="flex flex-col gap-2">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className="flex cursor-pointer items-start gap-3 rounded-control border border-border p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="address"
                    value={address.id}
                    checked={addressId === address.id}
                    onChange={() => setAddressId(address.id)}
                    className="mt-1"
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
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-xl text-foreground">Phương thức thanh toán</h2>
            <div className="flex flex-col gap-2">
              {GATEWAYS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-control border border-border p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="gateway"
                    value={option.value}
                    checked={gateway === option.value}
                    onChange={() => setGateway(option.value)}
                  />
                  <span className="font-medium text-foreground">{option.label}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="font-display text-xl text-foreground">Sản phẩm</h2>
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 text-sm">
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
          </Card>
        </div>

        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-foreground">Tóm tắt đơn hàng</h2>

          <div className="flex flex-col gap-2">
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

          <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between text-foreground">
              <span>Tổng tiền hàng</span>
              <span>{formatPrice(cart.total)}</span>
            </div>

            {voucherResult && (
              <>
                <div className="flex items-center justify-between text-foreground">
                  <span>Giảm giá</span>
                  <span>-{formatPrice(voucherResult.discount_amount)}</span>
                </div>
                <div className="flex items-center justify-between font-medium text-foreground">
                  <span>Thành tiền</span>
                  <span>{formatPrice(voucherResult.final_total)}</span>
                </div>
              </>
            )}
          </div>

          {orderError && <p role="alert" className="text-sm text-destructive">{orderError}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang xử lý...' : 'Đặt hàng'}
          </Button>
        </Card>
      </form>
    </div>
  )
}
