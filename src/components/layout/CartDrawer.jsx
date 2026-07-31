import * as Dialog from '@radix-ui/react-dialog'
import { Link } from 'react-router-dom'
import { X, ShoppingBag } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { useCart } from '../../features/cart/hooks'
import { Spinner } from '../Spinner'
import { LoadErrorState } from '../LoadErrorState'
import { ProductThumb } from '../ProductThumb'
import { formatPrice } from '../../lib/format'

export function CartDrawer() {
  const token = useAuthStore((state) => state.token)
  const isCartOpen = useUiStore((state) => state.isCartOpen)
  const closeCart = useUiStore((state) => state.closeCart)
  const cartQuery = useCart()
  const { data, isLoading, isError, isFetching } = cartQuery
  const cart = data?.data
  const items = cart?.items ?? []

  return (
    <Dialog.Root open={isCartOpen} onOpenChange={(open) => !open && closeCart()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm" />
        {/* data-theme lives on Content (not an ancestor): Radix portals this
            subtree to document.body, so it can't inherit the app-tree scope. */}
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-surface text-ink shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <Dialog.Title className="text-xl font-semibold text-foreground">Giỏ hàng</Dialog.Title>
            <Dialog.Description className="sr-only">
              Danh sách sản phẩm trong giỏ hàng của bạn.
            </Dialog.Description>
            <Dialog.Close
              aria-label="Đóng"
              className="cursor-pointer rounded-control text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!token ? (
              <p className="text-sm text-muted-foreground">
                Vui lòng{' '}
                <Link
                  to="/login"
                  onClick={closeCart}
                  className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent focus-visible:outline-none"
                >
                  đăng nhập
                </Link>{' '}
                để xem giỏ hàng của bạn.
              </p>
            ) : isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : isError && !cart ? (
              <LoadErrorState
                title="Chưa thể tải giỏ hàng"
                description="Có gián đoạn khi tải giỏ hàng. Các sản phẩm của bạn chưa bị thay đổi."
                onRetry={() => cartQuery.refetch()}
                isRetrying={isFetching}
                compact
              />
            ) : (
              <>
                {isError && cart && (
                  <LoadErrorState
                    title="Chưa cập nhật được giỏ hàng mới nhất"
                    description="Đang hiển thị dữ liệu đã tải trước đó."
                    onRetry={() => cartQuery.refetch()}
                    isRetrying={isFetching}
                    compact
                    background
                    className="mb-4"
                  />
                )}
                {items.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <ShoppingBag size={32} className="text-border-strong" />
                    <p className="mt-4 text-sm text-muted-foreground">Giỏ hàng trống.</p>
                  </div>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 py-4 text-sm first:pt-0">
                        <ProductThumb src={item.variant?.thumbnail} alt={item.variant?.product_name} size="h-14 w-14" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {item.variant?.product_name ?? item.variant?.name}
                          </p>
                          <p className="truncate text-muted-foreground">
                            {item.variant?.name} · x{item.quantity}
                          </p>
                          {/* imagined callback inherited from the Planner; only for room-sourced items. */}
                          {item.room?.name && (
                            <p className="mt-1 truncate text-imagined">
                              Đã xác nhận vừa với phòng “{item.room.name}”.
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 font-medium text-foreground">{formatPrice(item.subtotal)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {token && items.length > 0 && (
            <div className="border-t border-border px-6 py-5">
              <div className="flex items-center justify-between text-base font-medium text-foreground">
                <span>Tổng cộng</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <Link
                to="/cart"
                onClick={closeCart}
                className="mt-4 flex w-full items-center justify-center rounded-control bg-primary px-4 py-3.5 text-sm font-medium text-primary-foreground transition-colors duration-200 ease-out hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Xem giỏ hàng
              </Link>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
