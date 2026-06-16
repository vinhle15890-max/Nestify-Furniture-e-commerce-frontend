import { Link, NavLink } from 'react-router-dom'
import { ShoppingCart, Menu, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { CategoryNav } from './CategoryNav'

const focusRing =
  'rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

const navLinkClass = ({ isActive }) =>
  `text-sm tracking-wide transition-colors duration-200 ease-out ${focusRing} ${
    isActive ? 'text-primary' : 'text-foreground hover:text-primary'
  }`

export function Header() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const toggleMobileNav = useUiStore((state) => state.toggleMobileNav)
  const toggleCart = useUiStore((state) => state.toggleCart)

  const isAdmin = user?.roles?.includes('super_admin')

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className={`font-display text-2xl text-foreground ${focusRing}`}>
          Nestify
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" className={navLinkClass} end>
            Trang chủ
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Quản trị
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Giỏ hàng"
            className={`cursor-pointer text-foreground hover:text-primary ${focusRing}`}
            onClick={toggleCart}
          >
            <ShoppingCart size={20} />
          </button>

          {user ? (
            <>
              <Link to="/account" aria-label="Tài khoản" className={`text-foreground hover:text-primary ${focusRing}`}>
                <User size={20} />
              </Link>
              <button
                type="button"
                onClick={logout}
                className={`cursor-pointer text-sm text-foreground hover:text-primary ${focusRing}`}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link to="/login" className={`text-sm text-foreground hover:text-primary ${focusRing}`}>
              Đăng nhập
            </Link>
          )}

          <button
            type="button"
            aria-label="Mở menu"
            className={`cursor-pointer text-foreground hover:text-primary md:hidden ${focusRing}`}
            onClick={toggleMobileNav}
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      <CategoryNav />
    </header>
  )
}
