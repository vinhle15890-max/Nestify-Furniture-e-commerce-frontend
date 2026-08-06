/* Hallmark · pre-emit critique: P5 H4 E4 S5 R4 V4 · checkout workbench · contrast: pass */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CircleAlert, ExternalLink, LockKeyhole, MapPin, ShoppingBag } from 'lucide-react'
import { useCart, useApplyVoucher } from '../../features/cart/hooks'
import { useAddresses } from '../../features/addresses/hooks'
import { useCreateOrder, useCreatePaymentSession } from '../../features/checkout/hooks'
import { useOrder } from '../../features/orders/hooks'
import { ORDER_STATUS_LABELS } from '../../features/orders/statusLabels'
import { AddressFormModal } from '../account/AddressFormModal'
import { resetCheckoutIdempotencyKey } from '../../lib/idempotency'
import { redirectToExternal } from '../../lib/navigation'
import { BackLink } from '../../components/BackLink'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { formatPrice } from '../../lib/format'
import { useAuthStore } from '../../store/authStore'
import { isStaff } from '../../lib/roles'
import { cartHasStockShortfall, stockShortfall } from '../../lib/stock'
import {
  clearCheckoutRecovery,
  readCheckoutRecovery,
  saveCheckoutRecovery,
} from './checkoutRecovery'

const paymentMethods = {
  payos: {
    label: 'Thanh toán online qua PayOS',
    description: 'Đơn được tạo trước; kết quả thanh toán được xác nhận ở bước PayOS.',
  },
  cod: {
    label: 'Thanh toán khi nhận hàng (COD)',
    description: 'Đơn được tạo ở trạng thái xử lý; chưa có thanh toán online.',
  },
}

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
    return 'Kết nối bị gián đoạn. Chưa thể xác định đơn đã được tạo hay chưa. Thông tin đặt hàng được giữ nguyên để bạn thử lại an toàn.'
  }
  if (error?.code === 'STAFF_CANNOT_PURCHASE') {
    return 'Tài khoản này không thể đặt hàng. Vui lòng dùng tài khoản khách hàng.'
  }

  return 'Chưa thể tạo đơn hàng. Không có thanh toán nào được xác nhận; hãy kiểm tra thông tin và thử lại.'
}

function paymentSessionFailureMessage(error) {
  if (error?.code === 'ORDER_ALREADY_PAID') return null
  if (error?.code === 'TOO_MANY_REQUESTS') {
    return 'Đơn hàng đã được tạo, nhưng PayOS đang giới hạn lượt mở phiên. Hãy đợi một chút rồi thử lại trên chính đơn này.'
  }

  return 'Đơn hàng đã được tạo, nhưng chưa thể mở phiên PayOS. Thử lại chỉ mở thanh toán cho đơn hiện có; không tạo thêm đơn.'
}

function orderLabel(order) {
  return order?.order_number || `#${order?.id}`
}

function productName(item) {
  const snapshot = item.variant_snapshot ?? item.variant ?? {}
  return snapshot.product_name ?? snapshot.name ?? 'Sản phẩm'
}

function variantDetail(item) {
  const snapshot = item.variant_snapshot ?? item.variant ?? {}
  return [snapshot.name, snapshot.sku].filter(Boolean).join(' · ')
}

function visibleAttributes(item) {
  const source = item.variant_snapshot?.attributes ?? item.variant?.attributes
  if (!source || Array.isArray(source) || typeof source !== 'object') return []

  return Object.entries(source).filter(([, value]) => (
    (typeof value === 'string' && value.trim() !== '')
    || typeof value === 'number'
    || typeof value === 'boolean'
  ))
}

function attributeLabel(key) {
  const labels = {
    color: 'Màu',
    colour: 'Màu',
    size: 'Kích thước',
    material: 'Chất liệu',
    finish: 'Hoàn thiện',
  }
  return labels[key] ?? key.replaceAll('_', ' ')
}

function addressText(address) {
  return [
    address?.address_line1,
    address?.address_line2,
    address?.city,
    address?.province,
    address?.postal_code,
  ].filter(Boolean).join(', ')
}

function cartBasis(cart) {
  if (!cart) return ''
  const lines = (cart.items ?? []).map((item) => [
    item.id,
    item.variant?.id,
    item.quantity,
    item.unit_price_snapshot,
    item.subtotal,
  ].join(':'))
  return `${cart.id ?? 'cart'}|${lines.join('|')}|${cart.total}`
}

function CheckoutShell({ children, width = 'max-w-6xl' }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas px-5 pb-32 pt-10 text-ink sm:px-6 md:pb-36 md:pt-12 lg:px-10">
      <div className={`mx-auto w-full min-w-0 ${width}`}>{children}</div>
    </div>
  )
}

function CheckoutBoundary({ title = 'Thanh toán', children, icon: Icon = ShoppingBag, action }) {
  return (
    <CheckoutShell width="max-w-3xl">
      <h1 className="font-display text-[clamp(1.9rem,4vw,2.75rem)] text-foreground">{title}</h1>
      <div className="mt-8 border-y-2 border-foreground/30 py-8 sm:py-10">
        <Icon aria-hidden="true" size={26} className="text-border-strong" />
        <div className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{children}</div>
        {action}
      </div>
    </CheckoutShell>
  )
}

function CheckoutLoading() {
  return (
    <CheckoutShell>
      <p className="text-sm text-muted-foreground">Thanh toán</p>
      <div role="status" className="mt-8 border-y-2 border-foreground/25 py-8" aria-label="Đang chuẩn bị đơn hàng">
        <div className="h-24 max-w-3xl bg-unbuilt/35" />
        <div className="mt-7 h-16 max-w-2xl bg-unbuilt/20" />
        <span className="sr-only">Đang chuẩn bị đơn hàng…</span>
      </div>
    </CheckoutShell>
  )
}

function FactStatus({ children, role = 'alert', className = '' }) {
  return (
    <p
      role={role}
      className={`flex max-w-3xl items-start gap-2 border-l-2 border-foreground pl-3 text-sm leading-relaxed text-foreground ${className}`}
    >
      {role === 'alert' && <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={16} />}
      <span>{children}</span>
    </p>
  )
}

function TransactionEvidence({ declaration, stockConflictVariantId }) {
  const { items, goodsTotal, totalQuantity } = declaration

  return (
    <section aria-labelledby="checkout-transaction-heading" data-testid="checkout-transaction-evidence">
      <div className="flex flex-col gap-2 border-b-2 border-foreground pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Đơn hàng của bạn</p>
          <h2 id="checkout-transaction-heading" className="mt-1  text-[clamp(1.65rem,3vw,2.35rem)] leading-tight text-foreground">
            Sản phẩm bạn đã chọn
          </h2>
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">{totalQuantity} sản phẩm</p>
      </div>

      <ul className="divide-y divide-border/70">
        {items.map((item) => {
          const name = productName(item)
          const detail = variantDetail(item)
          const attributes = visibleAttributes(item)
          const snapshot = item.variant_snapshot ?? item.variant ?? {}
          const itemStockShortfall = item.variant ? stockShortfall(item) : null
          const hasCreationConflict = snapshot.id === stockConflictVariantId

          return (
            <li key={item.id} className="min-w-0 py-5 sm:py-6">
              <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:gap-6">
                <ProductThumb
                  src={snapshot.thumbnail}
                  alt={name}
                  size="h-20 w-[4.5rem] sm:h-24 sm:w-[5.5rem]"
                  className="rounded-none"
                />
                <div className="min-w-0">
                  <p className="text-lg font-medium leading-snug text-foreground sm:text-xl">{name}</p>
                  {detail && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>}
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
                  <p className="mt-3 text-sm tabular-nums text-muted-foreground">
                    {item.quantity} × <span className="text-foreground">{formatPrice(item.unit_price_snapshot)}</span>
                  </p>
                </div>
                <div className="col-start-2 min-w-0 sm:col-start-3 sm:row-start-1 sm:text-right">
                  <p className="text-xs text-muted-foreground">Tạm tính</p>
                  <p className="mt-1 font-medium tabular-nums text-foreground">{formatPrice(item.subtotal)}</p>
                </div>
              </div>
              {(itemStockShortfall || hasCreationConflict) && (
                <FactStatus className="mt-4">
                  {itemStockShortfall
                    ? `Bạn đã chọn ${item.quantity}, nhưng số lượng hiện có là ${itemStockShortfall.available}. Chưa có sản phẩm nào được giữ.`
                    : 'Kho đã thay đổi khi tạo đơn. Dòng sản phẩm này cần được điều chỉnh trong giỏ hàng.'}
                </FactStatus>
              )}
            </li>
          )
        })}
      </ul>

      <div className="border-t-2 border-foreground py-5 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-8">
        <div>
          <p className="text-sm text-muted-foreground">Tổng thanh toán</p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Giá trị từ Cart đã tải gần nhất; chưa phải xác nhận thanh toán hay số tiền cuối cùng có phí chưa được cung cấp.
          </p>
        </div>
        <p className="mt-4  text-[clamp(1.7rem,3.2vw,2.4rem)] tabular-nums text-foreground sm:mt-0">
          {formatPrice(goodsTotal)}
        </p>
      </div>
    </section>
  )
}

function AddressClause({
  addresses,
  selectedAddress,
  addressId,
  editing,
  locked,
  error,
  groupRef,
  onEdit,
  onCancel,
  onSelect,
  onCreate,
  onEditAddress,
}) {
  return (
    <section
      ref={groupRef}
      aria-labelledby="checkout-address-heading"
      aria-describedby={error ? 'checkout-address-error' : undefined}
      className="border-t border-border/80 py-4"
    >
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(8.5rem,0.32fr)_minmax(0,1fr)_auto] sm:items-start sm:gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-3">
        <h2 id="checkout-address-heading" className="font-medium text-foreground lg:col-span-2">Giao tới</h2>
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="font-medium text-foreground">{selectedAddress?.recipient_name} · {selectedAddress?.phone}</p>
          <p className="mt-1 break-words text-muted-foreground">{addressText(selectedAddress)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Địa chỉ này sẽ được dùng cho đơn hàng của bạn.
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={onEdit}
            disabled={locked}
            className="w-fit text-sm text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            Thay đổi
          </button>
        )}
      </div>

      {editing && !locked && (
        <div className="mt-5 border-l-2 border-foreground/35 pl-4 sm:ml-[calc(32%+1.5rem)] lg:ml-0">
          <fieldset className="space-y-3">
            <legend className="sr-only">Chọn địa chỉ giao hàng</legend>
            {addresses.map((address) => (
              <label key={address.id} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                <input
                  type="radio"
                  name="address"
                  value={address.id}
                  checked={addressId === address.id}
                  onChange={() => onSelect(address.id)}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'checkout-address-error' : undefined}
                  className="mt-1 accent-[var(--color-foreground)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{address.recipient_name} · {address.phone}</span>
                  <span className="mt-0.5 block break-words text-muted-foreground">{addressText(address)}</span>
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    onEditAddress(address)
                  }}
                  className="shrink-0 text-muted-foreground underline decoration-border-strong underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Sửa địa chỉ của ${address.recipient_name}`}
                >
                  Sửa
                </button>
              </label>
            ))}
          </fieldset>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <button type="button" onClick={onCreate} className="font-medium text-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Thêm địa chỉ
            </button>
            <button type="button" onClick={onCancel} className="text-muted-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Giữ lựa chọn hiện tại
            </button>
          </div>
        </div>
      )}

      {error && <FactStatus className="mt-4" role="alert"><span id="checkout-address-error">{error}</span></FactStatus>}
    </section>
  )
}

function PaymentClause({ method, editing, locked, onEdit, onCancel, onSelect }) {
  const selected = paymentMethods[method] ?? paymentMethods.payos

  return (
    <section aria-labelledby="checkout-payment-heading" className="border-t border-border/80 py-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(8.5rem,0.32fr)_minmax(0,1fr)_auto] sm:items-start sm:gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-3">
        <h2 id="checkout-payment-heading" className="font-medium text-foreground lg:col-span-2">Thanh toán</h2>
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="font-medium text-foreground">{selected.label}</p>
          <p className="mt-1 text-muted-foreground">{selected.description}</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={onEdit}
            disabled={locked}
            className="w-fit text-sm text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            Thay đổi
          </button>
        )}
      </div>

      {editing && !locked && (
        <fieldset className="mt-5 space-y-3 border-l-2 border-foreground/35 pl-4 sm:ml-[calc(32%+1.5rem)] lg:ml-0">
          <legend className="sr-only">Chọn phương thức thanh toán</legend>
          {Object.entries(paymentMethods).map(([value, option]) => (
            <label key={value} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <input
                type="radio"
                name="payment_method"
                value={value}
                checked={method === value}
                onChange={() => onSelect(value)}
                className="mt-1 accent-[var(--color-foreground)]"
              />
              <span>
                <span className="font-medium text-foreground">{option.label}</span>
                <span className="mt-0.5 block text-muted-foreground">{option.description}</span>
              </span>
            </label>
          ))}
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Giữ lựa chọn hiện tại
          </button>
        </fieldset>
      )}
    </section>
  )
}

function CreatedOrderEvidence({ order }) {
  const items = order?.items ?? []
  if (!items.length && order?.total == null) return null

  return (
    <div className="mt-8 border-y-2 border-foreground/30 py-6">
      {items.length > 0 && (
        <ul className="divide-y divide-border/70">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 items-start justify-between gap-5 py-3 first:pt-0">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{productName(item)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{variantDetail(item)} · x{item.quantity}</p>
              </div>
              <p className="shrink-0 text-sm tabular-nums text-foreground">{formatPrice(item.subtotal)}</p>
            </li>
          ))}
        </ul>
      )}
      {order?.total != null && (
        <div className="mt-4 flex items-baseline justify-between gap-6 border-t border-foreground pt-4">
          <span className="text-sm text-muted-foreground">Tổng trên đơn đã tạo</span>
          <span className="text-2xl font-semibold tabular-nums text-foreground">{formatPrice(order.total)}</span>
        </div>
      )}
    </div>
  )
}

function CreatedOrderState({ order, sessionError, sessionPending, sessionAttempted, handoffPending, onRetry }) {
  const isPayos = order?.payment_method === 'payos' || order?.status === 'pending_payment'
  const isAwaitingPayment = isPayos && order?.status === 'pending_payment'
  const status = ORDER_STATUS_LABELS[order?.status]?.label ?? order?.status

  return (
    <CheckoutShell width="max-w-4xl">
      <BackLink to={`/orders/${order.id}`}>Mở đơn hàng</BackLink>
      <div className="mt-7 max-w-3xl">
        <p className="text-sm text-muted-foreground">Sự thật từ Order đã tạo</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.5rem)] leading-tight text-foreground">
          Đơn hàng {orderLabel(order)} đã được tạo.
        </h1>
        {isPayos ? (
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            Đơn hiện tồn tại độc lập với Cart. Thanh toán PayOS chưa được gọi là thành công cho tới khi trạng thái được xác nhận từ hệ thống thanh toán.
          </p>
        ) : (
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            Đơn đã ghi nhận phương thức thanh toán khi nhận hàng và đang ở trạng thái {status || 'xử lý'}. Không có thanh toán online nào được xác nhận.
          </p>
        )}
      </div>

      <CreatedOrderEvidence order={order} />

      {isAwaitingPayment && (
        <section aria-labelledby="created-order-payment-heading" className="mt-8 max-w-3xl border-t border-border/80 pt-6">
          <h2 id="created-order-payment-heading" className="font-medium text-foreground">
            {handoffPending ? 'Đang chuyển đến PayOS' : 'Phiên thanh toán cho đơn hiện có'}
          </h2>
          {handoffPending ? (
            <div role="status" className="mt-4 border-y border-border py-5" aria-live="polite">
              <div className="flex items-start gap-3">
                <Spinner className="mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">PayOS sẽ mở trong giây lát</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Bạn đang thanh toán cho đơn {orderLabel(order)}. Nội dung thanh toán ở bước tiếp theo do PayOS bảo vệ và hiển thị.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <p className="flex items-center gap-2"><LockKeyhole aria-hidden="true" size={16} /> Không nhập lại thông tin đơn hàng</p>
                <p className="flex items-center gap-2"><ExternalLink aria-hidden="true" size={16} /> Bạn sẽ rời Nestify tạm thời</p>
              </div>
            </div>
          ) : sessionPending ? (
            <div role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              <span>Đang tạo phiên PayOS cho đơn {orderLabel(order)}…</span>
            </div>
          ) : sessionError ? (
            <FactStatus className="mt-4">{sessionError}</FactStatus>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {sessionAttempted
                ? 'Phiên PayOS đã được yêu cầu. Nếu chuyển hướng không tiếp tục, bạn có thể mở lại trên chính đơn này.'
                : 'Trang đã khôi phục đơn sau khi quay lại hoặc tải lại. Mở PayOS từ đơn hiện có; không đặt lại.'}
            </p>
          )}
          {!sessionPending && !handoffPending && (
            <div className="mt-5 flex flex-wrap gap-4">
              <Button type="button" onClick={onRetry}>
                {sessionError ? 'Thử mở lại PayOS' : 'Mở PayOS cho đơn này'}
              </Button>
              <Link
                to={`/orders/${order.id}`}
                className="inline-flex items-center text-sm font-medium text-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                Xem chi tiết đơn hàng
              </Link>
            </div>
          )}
        </section>
      )}

      {!isAwaitingPayment && (
        <Link
          to={`/orders/${order.id}`}
          className="mt-7 inline-flex text-sm font-medium text-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Xem trạng thái đơn hàng
        </Link>
      )}
    </CheckoutShell>
  )
}

function RecoveryFailure({ onRetry }) {
  return (
    <CheckoutBoundary
      title="Chưa xác minh được đơn đã tạo"
      action={(
        <div className="mt-6 flex flex-wrap gap-4">
          <Button type="button" onClick={onRetry}>Thử tải lại đơn</Button>
          <Link to="/orders" className="inline-flex items-center text-sm font-medium text-foreground underline decoration-border-strong underline-offset-4">
            Mở danh sách đơn hàng
          </Link>
        </div>
      )}
    >
      Cart đã được thay đổi sau lần đặt hàng trước, nhưng trạng thái đơn chưa tải lại được. Nestify không hiển thị Checkout trống thay cho một đơn có thể đã tồn tại.
    </CheckoutBoundary>
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
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const [recoveryRecord, setRecoveryRecord] = useState(() => readCheckoutRecovery())
  const [placedOrder, setPlacedOrder] = useState(null)
  const recoveredOrderQuery = useOrder(recoveryRecord?.orderId, {
    enabled: Boolean(recoveryRecord?.orderId) && !placedOrder,
    retry: false,
  })

  const [addressId, setAddressId] = useState(null)
  const [addressEditing, setAddressEditing] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('payos')
  const [paymentEditing, setPaymentEditing] = useState(false)
  const [voucherCode] = useState(() => searchParams.get('voucher')?.trim() ?? '')
  const [voucherResult, setVoucherResult] = useState(null)
  const [voucherBasis, setVoucherBasis] = useState(null)
  const [voucherError, setVoucherError] = useState(null)
  const [voucherStaleNotice, setVoucherStaleNotice] = useState(false)
  const [addressError, setAddressError] = useState(null)
  const [orderError, setOrderError] = useState(null)
  const [orderUncertain, setOrderUncertain] = useState(false)
  const [stockConflictVariantId, setStockConflictVariantId] = useState(null)
  const [submittedDeclaration, setSubmittedDeclaration] = useState(null)
  const [paymentSessionError, setPaymentSessionError] = useState(null)
  const [paymentSessionAttempted, setPaymentSessionAttempted] = useState(false)
  const [paymentHandoffPending, setPaymentHandoffPending] = useState(false)
  const [existingOrderId, setExistingOrderId] = useState(null)
  const addressGroupRef = useRef(null)
  const voucherAutoAppliedRef = useRef(false)
  const orderErrorRef = useRef(null)

  const addresses = useMemo(() => addressesData?.data ?? [], [addressesData?.data])
  const cart = cartData?.data
  const items = useMemo(() => cart?.items ?? [], [cart?.items])
  const currentCartBasis = useMemo(() => cartBasis(cart), [cart])
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
    if (voucherResult && voucherBasis && currentCartBasis !== voucherBasis) {
      setVoucherResult(null)
      setVoucherBasis(null)
      setVoucherError(null)
      setVoucherStaleNotice(true)
    }
  }, [currentCartBasis, voucherBasis, voucherResult])

  useEffect(() => {
    if (addressError) {
      addressGroupRef.current?.querySelector('input[type="radio"]')?.focus()
    }
  }, [addressError, addressEditing])

  useEffect(() => {
    if (!voucherCode || !currentCartBasis || voucherAutoAppliedRef.current) return
    voucherAutoAppliedRef.current = true
    applyVoucher.mutate(voucherCode, {
      onSuccess: (response) => {
        setVoucherResult(response.data)
        setVoucherBasis(currentCartBasis)
      },
      onError: (error) => {
        setVoucherResult(null)
        setVoucherBasis(null)
        setVoucherError(voucherFailureMessage(error))
      },
    })
  }, [voucherCode, currentCartBasis, applyVoucher])

  useEffect(() => {
    if (orderError) orderErrorRef.current?.focus()
  }, [orderError])

  useEffect(() => {
    if (!recoveryRecord || placedOrder || existingOrderId || cartLoading || items.length === 0) return
    clearCheckoutRecovery()
    setRecoveryRecord(null)
  }, [recoveryRecord, placedOrder, existingOrderId, cartLoading, items.length])

  const hasBackgroundError =
    (cartQuery.isError && Boolean(cartData?.data))
    || (addressesQuery.isError && Boolean(addressesData?.data))
  const hasValidAddress = addresses.some((address) => address.id === addressId)
  const declarationLocked = Boolean(submittedDeclaration)
  const selectedAddress = declarationLocked
    ? submittedDeclaration.address
    : addresses.find((address) => address.id === addressId)
  const visiblePaymentMethod = declarationLocked
    ? submittedDeclaration.paymentMethod
    : paymentMethod
  const liveDeclaration = useMemo(() => ({
    items,
    goodsTotal: cart?.total ?? 0,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    address: addresses.find((address) => address.id === addressId) ?? null,
    addressId,
    paymentMethod,
    voucherCode: voucherCode.trim(),
    voucherResult,
    cartBasis: currentCartBasis,
  }), [items, cart?.total, addresses, addressId, paymentMethod, voucherCode, voucherResult, currentCartBasis])
  const visibleDeclaration = submittedDeclaration ?? liveDeclaration
  const authoritativeOrder = placedOrder ?? recoveredOrderQuery.data?.data
  const recoveryIsForCurrentCart = recoveryRecord && items.length === 0

  if (isStaff(user)) {
    return (
      <CheckoutBoundary>
        Tài khoản quản trị không thể mua hàng. Vui lòng dùng tài khoản khách hàng.
      </CheckoutBoundary>
    )
  }

  if (recoveryRecord && recoveryIsForCurrentCart && !authoritativeOrder && recoveredOrderQuery.isPending) {
    return <CheckoutLoading />
  }

  if (recoveryRecord && recoveryIsForCurrentCart && !authoritativeOrder && recoveredOrderQuery.isError) {
    return <RecoveryFailure onRetry={() => recoveredOrderQuery.refetch()} />
  }

  if (authoritativeOrder) {
    return (
      <CreatedOrderState
        order={authoritativeOrder}
        sessionError={paymentSessionError}
        sessionPending={createPaymentSession.isPending}
        sessionAttempted={paymentSessionAttempted}
        handoffPending={paymentHandoffPending}
        onRetry={() => openPaymentSession(authoritativeOrder)}
      />
    )
  }

  if (existingOrderId) {
    return (
      <CheckoutBoundary title="Đơn hàng đã tồn tại">
        <p role="alert">
          Yêu cầu này đã gắn với đơn #{existingOrderId}. Để tránh tạo hoặc thanh toán hai lần, hãy mở đơn hiện có.
        </p>
        <Link
          to={`/orders/${existingOrderId}`}
          className="mt-6 inline-flex text-sm font-medium text-foreground underline decoration-border-strong underline-offset-4"
        >
          Mở đơn hàng #{existingOrderId}
        </Link>
      </CheckoutBoundary>
    )
  }

  if (cartLoading || addressesLoading) return <CheckoutLoading />

  const cartUnavailable = cartQuery.isError && !cartData?.data
  const addressesUnavailable = addressesQuery.isError && !addressesData?.data

  if (cartUnavailable || addressesUnavailable) {
    return (
      <CheckoutShell width="max-w-3xl">
        <BackLink to="/cart">Quay lại giỏ hàng</BackLink>
        <h1 className="mt-4 font-display text-[clamp(1.9rem,4vw,2.75rem)] text-foreground">Thanh toán</h1>
        <LoadErrorState
          title="Chưa thể chuẩn bị đơn hàng"
          description="Chưa tải đủ giỏ hàng và địa chỉ. Chưa có đơn hay phiên thanh toán nào được tạo."
          onRetry={() => {
            if (cartUnavailable) cartQuery.refetch()
            if (addressesUnavailable) addressesQuery.refetch()
          }}
          isRetrying={cartQuery.isFetching || addressesQuery.isFetching}
          className="mt-8"
        />
      </CheckoutShell>
    )
  }

  if (items.length === 0) {
    return (
      <CheckoutBoundary
        action={(
          <Link to="/cart" className="mt-6 inline-flex text-sm font-medium text-foreground underline decoration-border-strong underline-offset-4">
            Quay lại giỏ hàng
          </Link>
        )}
      >
        Giỏ hàng đang trống. Hãy chọn sản phẩm trước khi thanh toán.
      </CheckoutBoundary>
    )
  }

  if (addresses.length === 0) {
    return (
      <CheckoutBoundary
        icon={MapPin}
        action={<Button type="button" onClick={openCreateAddress} className="mt-6">Thêm địa chỉ</Button>}
      >
        Bạn chưa có địa chỉ giao hàng. Hãy thêm địa chỉ trước khi tạo đơn.
        <AddressFormModal open={addressModalOpen} onOpenChange={setAddressModalOpen} address={editingAddress} />
      </CheckoutBoundary>
    )
  }

  function openCreateAddress() {
    if (declarationLocked) return
    setEditingAddress(null)
    setAddressModalOpen(true)
  }

  function openEditAddress(address) {
    if (declarationLocked) return
    setEditingAddress(address)
    setAddressModalOpen(true)
  }

  async function openPaymentSession(order) {
    setPaymentSessionError(null)
    setPaymentSessionAttempted(true)

    try {
      const session = await createPaymentSession.mutateAsync({ orderId: order.id, gateway: 'payos' })
      setPaymentHandoffPending(true)
      await new Promise((resolve) => window.setTimeout(resolve, 500))
      redirectToExternal(session.data.payment_url)
    } catch (error) {
      if (error.code === 'ORDER_ALREADY_PAID') {
        clearCheckoutRecovery()
        navigate(`/orders/${order.id}`)
        return
      }

      setPaymentHandoffPending(false)
      setPaymentSessionError(paymentSessionFailureMessage(error))
    }
  }

  function reviseUncertainDeclaration() {
    resetCheckoutIdempotencyKey()
    setSubmittedDeclaration(null)
    setOrderUncertain(false)
    setOrderError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (hasBackgroundError || !hasValidAddress || stockBlocked || createOrder.isPending || createPaymentSession.isPending) return

    const declaration = submittedDeclaration ?? liveDeclaration
    if (!declaration.address || !paymentMethods[declaration.paymentMethod]) return

    setSubmittedDeclaration(declaration)
    setAddressModalOpen(false)
    setAddressEditing(false)
    setPaymentEditing(false)
    setOrderError(null)
    setOrderUncertain(false)
    setAddressError(null)
    setStockConflictVariantId(null)
    setExistingOrderId(null)

    let order
    try {
      const response = await createOrder.mutateAsync({
        address_id: declaration.addressId,
        source: 'cart',
        payment_method: declaration.paymentMethod,
        ...(declaration.voucherCode ? { voucher_code: declaration.voucherCode } : {}),
      })
      order = response.data
    } catch (error) {
      if (error.code === 'INSUFFICIENT_STOCK') {
        queryClient.invalidateQueries({ queryKey: ['cart'] })
        setStockConflictVariantId(error.details?.variant_id ?? null)
        setOrderError('Kho đã thay đổi khi tạo đơn. Chưa có đơn nào được xác nhận; hãy điều chỉnh dòng được đánh dấu trong giỏ hàng.')
        setSubmittedDeclaration(null)
      } else if (error.code === 'DUPLICATE_IDEMPOTENCY_KEY' && error.details?.order_id) {
        const orderId = error.details.order_id
        setExistingOrderId(orderId)
        saveCheckoutRecovery(orderId)
      } else if (error.code === 'VALIDATION_FAILED' && fieldError(error, 'address_id')) {
        setAddressError('Địa chỉ giao hàng không còn hợp lệ. Vui lòng chọn lại một địa chỉ.')
        setAddressEditing(true)
        setSubmittedDeclaration(null)
      } else if (
        ['VOUCHER_EXHAUSTED', 'VOUCHER_NOT_APPLICABLE'].includes(error.code)
        || (error.code === 'VALIDATION_FAILED' && fieldError(error, 'voucher_code'))
      ) {
        setVoucherResult(null)
        setVoucherBasis(null)
        setVoucherError(voucherFailureMessage(error))
        setSubmittedDeclaration(null)
      } else {
        const uncertain = error.code === 'NETWORK_ERROR'
        setOrderUncertain(uncertain)
        setOrderError(orderFailureMessage(error))
        if (!uncertain) setSubmittedDeclaration(null)
      }
      return
    }

    resetCheckoutIdempotencyKey()
    setRecoveryRecord(saveCheckoutRecovery(order.id))
    setPlacedOrder(order)

    if (declaration.paymentMethod === 'payos') {
      await openPaymentSession(order)
    }
  }

  return (
    <CheckoutShell>
      <BackLink to="/cart">Quay lại giỏ hàng</BackLink>
      <header className="mt-5 max-w-3xl">
        <h1 className="text-lg font-medium text-foreground">Đơn hàng của bạn</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Xem lại đúng giao dịch và những gì còn có thể sửa trước khi tạo đơn.
        </p>
      </header>

      {hasBackgroundError && (
        <LoadErrorState
          title="Chưa cập nhật được đơn hàng mới nhất"
          description="Bạn đang xem dữ liệu đã tải trước đó. Tạo đơn bị khóa cho tới khi Cart và địa chỉ được cập nhật lại."
          onRetry={() => {
            if (cartQuery.isError) cartQuery.refetch()
            if (addressesQuery.isError) addressesQuery.refetch()
          }}
          isRetrying={cartQuery.isFetching || addressesQuery.isFetching}
          compact
          background
          className="mt-7"
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-7 min-w-0 max-w-full lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.72fr)] lg:items-start lg:gap-x-12"
        data-testid="checkout-editable-declaration"
        data-checkout-width-safe="true"
        aria-busy={createOrder.isPending || undefined}
      >
        <TransactionEvidence declaration={visibleDeclaration} stockConflictVariantId={stockConflictVariantId} />

        <div className="mt-8 max-w-5xl lg:col-start-2 lg:row-start-1 lg:mt-0">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground lg:hidden">
            Chỉ các giá trị đang được đề nghị xuất hiện ở trạng thái nghỉ.
          </p>

          <AddressClause
            addresses={addresses}
            selectedAddress={selectedAddress}
            addressId={declarationLocked ? submittedDeclaration.addressId : addressId}
            editing={addressEditing}
            locked={declarationLocked}
            error={addressError}
            groupRef={addressGroupRef}
            onEdit={() => setAddressEditing(true)}
            onCancel={() => setAddressEditing(false)}
            onSelect={(id) => {
              setAddressId(id)
              setAddressError(null)
              setAddressEditing(false)
            }}
            onCreate={openCreateAddress}
            onEditAddress={openEditAddress}
          />

          <PaymentClause
            method={visiblePaymentMethod}
            editing={paymentEditing}
            locked={declarationLocked}
            onEdit={() => setPaymentEditing(true)}
            onCancel={() => setPaymentEditing(false)}
            onSelect={(method) => {
              setPaymentMethod(method)
              setPaymentEditing(false)
            }}
          />

          {voucherCode && (
            <section aria-labelledby="checkout-voucher-heading" className="border-t border-border/80 py-4">
              <h2 id="checkout-voucher-heading" className="font-medium text-foreground">Mã giảm giá từ giỏ hàng</h2>
              {applyVoucher.isPending && <p role="status" className="mt-2 text-sm text-muted-foreground">Đang xác minh lại {voucherCode}…</p>}
              {voucherResult && <p className="mt-2 text-sm text-foreground"><span className="font-semibold">{voucherCode}</span> · giảm {formatPrice(voucherResult.discount_amount)}</p>}
              {voucherError && <FactStatus className="mt-3">{voucherError} <Link to="/cart" className="underline underline-offset-4">Chọn lại trong giỏ hàng.</Link></FactStatus>}
              {voucherStaleNotice && <FactStatus role="status" className="mt-3">Giỏ hàng đã thay đổi; mã này không còn được dùng. <Link to="/cart" className="underline underline-offset-4">Chọn lại trong giỏ hàng.</Link></FactStatus>}
            </section>
          )}

        <section aria-labelledby="checkout-certainty-heading" className="mt-4 max-w-5xl border-t-2 border-foreground pt-5">
          <div className="max-w-3xl">
            <h2 id="checkout-certainty-heading" className="text-xl font-semibold text-foreground">Trước khi tạo đơn hàng</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Phí giao hàng và thuế chưa được cung cấp. Số tiền đang hiển thị gồm sản phẩm và mã giảm giá dự kiến. Với PayOS, thanh toán được xác nhận ở bước tiếp theo; với COD, đơn hàng được tiếp nhận để xử lý.
            </p>
          </div>

          {createOrder.isPending && (
            <FactStatus role="status" className="mt-5">
              Đang tạo đơn với địa chỉ, phương thức thanh toán và mã giảm giá bạn vừa kiểm tra. Bạn chưa thể thay đổi thông tin trong lúc này.
            </FactStatus>
          )}

          {stockBlocked && (
            <FactStatus className="mt-5">
              Một số sản phẩm vượt quá số lượng hiện có. Chưa có sản phẩm nào được giữ.{' '}
              <Link to="/cart" className="underline decoration-border-strong underline-offset-4">Quay lại giỏ hàng để điều chỉnh.</Link>
            </FactStatus>
          )}

          {orderError && (
            <FactStatus className="mt-5">
              <span ref={orderErrorRef} tabIndex={-1}>{orderError}</span>
            </FactStatus>
          )}

          <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 border-t border-border bg-canvas/95 py-3 pl-5 pr-20 shadow-xl backdrop-blur-sm sm:pl-6 sm:pr-24 lg:left-auto lg:right-24 lg:bottom-6 lg:w-[24rem] lg:rounded-control lg:border lg:px-6">
            <Button
              type="submit"
              variant="confirmed"
              disabled={createOrder.isPending || stockBlocked || hasBackgroundError || !hasValidAddress}
              className="w-full px-7 py-3 sm:w-auto"
            >
              {createOrder.isPending
                ? 'Đang tạo đơn…'
                : orderUncertain
                  ? 'Thử đặt lại đơn này'
                  : 'Đặt hàng'}
            </Button>
            {orderUncertain && declarationLocked && (
              <button
                type="button"
                onClick={reviseUncertainDeclaration}
                className="text-sm text-muted-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Chỉnh lại và tạo một ý định mới
              </button>
            )}
          </div>
        </section>
        </div>
      </form>

      <AddressFormModal
        open={addressModalOpen && !declarationLocked}
        onOpenChange={setAddressModalOpen}
        address={editingAddress}
      />
    </CheckoutShell>
  )
}
