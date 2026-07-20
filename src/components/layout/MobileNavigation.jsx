import { useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Link, useLocation } from 'react-router-dom'
import { Search, ShoppingCart, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { isStaff } from '../../lib/roles'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

function NavigationLink({ to, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`block rounded-control py-2 text-lg text-foreground ${focusRing}`}
    >
      {children}
    </Link>
  )
}

export function MobileNavigation() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const open = useUiStore((state) => state.isMobileNavOpen)
  const close = useUiStore((state) => state.closeMobileNav)
  const openCart = useUiStore((state) => state.openCart)

  useEffect(() => {
    close()
  }, [location.pathname, location.search, close])

  const handleCart = () => {
    close()
    // The cart remains a drawer so the user keeps their current browsing context.
    openCart()
  }

  const handleLogout = () => {
    close()
    logout()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/45" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,26rem)] flex-col overflow-y-auto bg-surface px-6 pb-8 pt-6 text-ink shadow-card focus:outline-none">
          <div className="flex items-center justify-between border-b border-border pb-5">
            <Dialog.Title className="text-base font-semibold text-foreground">Menu</Dialog.Title>
            <Dialog.Description className="sr-only">
              Điều hướng cửa hàng, phòng của bạn, tài khoản, tìm kiếm và giỏ hàng.
            </Dialog.Description>
            <Dialog.Close
              aria-label="Đóng menu"
              className={`rounded-control p-2 text-muted-foreground hover:text-foreground ${focusRing}`}
            >
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <nav aria-label="Điều hướng di động" className="flex-1 divide-y divide-border">
            <section aria-labelledby="mobile-discover" className="py-6">
              <h2 id="mobile-discover" className="text-sm font-medium text-muted-foreground">Khám phá</h2>
              <div className="mt-2">
                <NavigationLink to="/c/all" onClick={close}>Tất cả sản phẩm</NavigationLink>
                <NavigationLink to="/" onClick={close}>Trang chủ</NavigationLink>
              </div>
            </section>

            <section aria-labelledby="mobile-room" className="py-6">
              <h2 id="mobile-room" className="text-sm font-medium text-muted-foreground">Phòng của bạn</h2>
              <div className="mt-2">
                <NavigationLink to="/room-planner" onClick={close}>Thiết kế phòng</NavigationLink>
                {user && <NavigationLink to="/account/rooms" onClick={close}>Phòng đã lưu</NavigationLink>}
              </div>
            </section>

            <section aria-labelledby="mobile-account" className="py-6">
              <h2 id="mobile-account" className="text-sm font-medium text-muted-foreground">Tài khoản</h2>
              <div className="mt-2">
                {user ? (
                  <>
                    <NavigationLink to="/account" onClick={close}>{user.name || 'Tài khoản của bạn'}</NavigationLink>
                    <NavigationLink to="/orders" onClick={close}>Đơn hàng</NavigationLink>
                    <NavigationLink to="/wishlist" onClick={close}>Sản phẩm yêu thích</NavigationLink>
                    {isStaff(user) && <NavigationLink to="/admin" onClick={close}>Quản trị</NavigationLink>}
                    <button type="button" onClick={handleLogout} className={`rounded-control py-2 text-left text-base text-muted-foreground hover:text-foreground ${focusRing}`}>
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <>
                    <NavigationLink to="/login" onClick={close}>Đăng nhập</NavigationLink>
                    <NavigationLink to="/register" onClick={close}>Tạo tài khoản</NavigationLink>
                  </>
                )}
              </div>
            </section>
          </nav>

          <div className="grid grid-cols-2 gap-3 border-t border-border pt-5">
            <Link to="/c/all" onClick={close} className={`inline-flex items-center justify-center gap-2 rounded-control border border-border px-4 py-3 text-sm font-medium text-foreground ${focusRing}`}>
              <Search size={17} aria-hidden="true" /> Tìm kiếm
            </Link>
            <button type="button" onClick={handleCart} className={`inline-flex items-center justify-center gap-2 rounded-control bg-primary px-4 py-3 text-sm font-medium text-surface ${focusRing}`}>
              <ShoppingCart size={17} aria-hidden="true" /> Giỏ hàng
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
