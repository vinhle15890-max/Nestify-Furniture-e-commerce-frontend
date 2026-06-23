import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useCart, useUpdateCartItem, useRemoveCartItem, useApplyVoucher } from '../../features/cart/hooks'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Spinner } from '../../components/Spinner'
import { formatPrice } from '../../lib/format'

const MAX_QUANTITY = 100

export function CartPage() {
  const token = useAuthStore((state) => state.token)
  const { data, isLoading } = useCart()
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
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-3xl text-foreground">Giỏ hàng</h1>
        <Card className="mt-6">
          <p className="text-sm text-muted-foreground">
            Vui lòng{' '}
            <Link to="/login" className="text-primary hover:underline">
              đăng nhập
            </Link>{' '}
            để xem giỏ hàng của bạn.
          </p>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl justify-center px-4 py-24">
        <Spinner />
      </div>
    )
  }

  const cart = data?.data
  const items = cart?.items ?? []

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
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Giỏ hàng</h1>

      {items.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-muted-foreground">
            Giỏ hàng trống.{' '}
            <Link to="/" className="text-primary hover:underline">
              Tiếp tục mua sắm
            </Link>
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <ul className="flex flex-col gap-4 lg:col-span-2">
            {items.map((item) => {
              const quantity = quantities[item.id] ?? item.quantity
              const maxQuantity = Math.min(
                stockErrors[item.id] ?? item.variant?.available_stock ?? MAX_QUANTITY,
                MAX_QUANTITY,
              )

              return (
                <li key={item.id}>
                  <Card>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-foreground">{item.variant?.name}</p>
                        <p className="text-sm text-muted-foreground">{item.variant?.sku}</p>
                        <p className="mt-1 text-sm text-foreground">{formatPrice(item.unit_price_snapshot)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          aria-label="Giảm số lượng"
                          onClick={() => updateQuantity(item, quantity - 1)}
                          disabled={quantity <= 1}
                        >
                          −
                        </Button>
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
                          className="w-16 rounded-control border border-border bg-surface px-2 py-2 text-center"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          aria-label="Tăng số lượng"
                          onClick={() => updateQuantity(item, quantity + 1)}
                          disabled={quantity >= maxQuantity}
                        >
                          +
                        </Button>
                      </div>

                      <p className="font-medium text-foreground">{formatPrice(item.subtotal)}</p>

                      <Button variant="ghost" onClick={() => removeCartItem.mutate(item.id)}>
                        Xóa
                      </Button>
                    </div>

                    {stockErrors[item.id] !== undefined && (
                      <p role="alert" className="mt-2 text-sm text-destructive">
                        Chỉ còn {stockErrors[item.id]} sản phẩm trong kho
                      </p>
                    )}
                  </Card>
                </li>
              )
            })}
          </ul>

          <Card className="flex flex-col gap-4">
            <h2 className="font-display text-xl text-foreground">Tóm tắt đơn hàng</h2>

            <form onSubmit={handleApplyVoucher} className="flex flex-col gap-2">
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

            <Link to="/checkout">
              <Button className="w-full">Tiến hành thanh toán</Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  )
}
