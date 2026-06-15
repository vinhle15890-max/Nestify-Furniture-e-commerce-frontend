import * as Dialog from '@radix-ui/react-dialog'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { useCart } from '../../features/cart/hooks'
import { Spinner } from '../Spinner'
import { formatPrice } from '../../lib/format'

export function CartDrawer() {
  const token = useAuthStore((state) => state.token)
  const isCartOpen = useUiStore((state) => state.isCartOpen)
  const closeCart = useUiStore((state) => state.closeCart)
  const { data, isLoading } = useCart()
  const cart = data?.data
  const items = cart?.items ?? []

  return (
    <Dialog.Root open={isCartOpen} onOpenChange={(open) => !open && closeCart()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-sm flex-col bg-surface p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl text-foreground">Giỏ hàng</Dialog.Title>
            <Dialog.Close aria-label="Đóng" className="cursor-pointer text-muted-foreground">
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">
            {!token ? (
              <p className="text-sm text-muted-foreground">
                Vui lòng{' '}
                <Link to="/login" onClick={closeCart} className="text-primary hover:underline">
                  đăng nhập
                </Link>{' '}
                để xem giỏ hàng của bạn.
              </p>
            ) : isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Giỏ hàng trống.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
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
            )}
          </div>

          {token && items.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm font-medium text-foreground">
                <span>Tổng cộng</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <Link
                to="/cart"
                onClick={closeCart}
                className="mt-4 flex w-full items-center justify-center rounded-control bg-primary px-4 py-2 text-sm font-medium text-surface transition-colors duration-200 ease-out hover:bg-primary-hover"
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
