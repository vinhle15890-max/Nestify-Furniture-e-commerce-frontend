import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ShoppingCart, Menu, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { useCart } from '../../features/cart/hooks'
import { isStaff } from '../../lib/roles'
import { Logo } from '../Logo'
import { CategoryNav } from './CategoryNav'

const focusRing =
  'rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function Header() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isHome) {
      setScrolled(false)
      return
    }
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  const overlay = isHome && !scrolled

  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const toggleMobileNav = useUiStore((state) => state.toggleMobileNav)
  const toggleCart = useUiStore((state) => state.toggleCart)
  const isAdmin = isStaff(user)

  const { data: cartData } = useCart()
  const cartCount = (cartData?.data?.items ?? []).reduce((sum, item) => sum + item.quantity, 0)

  const headerClass = `${isHome ? 'fixed' : 'sticky'} inset-x-0 top-0 z-40 transition-colors duration-300 ease-out ${
    overlay ? 'bg-transparent' : 'border-b border-border bg-surface/90 backdrop-blur-md'
  }`

  const tone = overlay ? 'text-white' : 'text-foreground'
  const interactive = overlay ? 'hover:text-white/70' : 'hover:text-accent'

  const navLinkClass = ({ isActive }) =>
    `text-sm tracking-wide transition-colors duration-200 ease-out ${focusRing} ${tone} ${
      isActive ? (overlay ? 'text-white' : 'text-accent') : interactive
    }`

  return (
    <header className={headerClass}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5 lg:px-10">
        <Link to="/" aria-label="Nestify — trang chủ" className={`flex items-center ${focusRing}`}>
          {overlay ? (
            <span className="font-display text-2xl tracking-tight text-white">Nestify</span>
          ) : (
            <Logo className="h-10 w-auto" />
          )}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/" className={navLinkClass} end>
            Trang chủ
          </NavLink>
          <NavLink to="/c/all" className={navLinkClass}>
            Sản phẩm
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Quản trị
            </NavLink>
          )}
        </nav>

        <div className={`flex items-center gap-4 ${tone}`}>
          <button
            type="button"
            aria-label={cartCount > 0 ? `Giỏ hàng, ${cartCount} sản phẩm` : 'Giỏ hàng'}
            className={`relative cursor-pointer ${interactive} ${focusRing}`}
            onClick={toggleCart}
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {user ? (
            <>
              <Link to="/account" aria-label="Tài khoản" className={`${interactive} ${focusRing}`}>
                <User size={20} />
              </Link>
              <button
                type="button"
                onClick={logout}
                className={`hidden cursor-pointer text-sm ${interactive} ${focusRing} sm:inline`}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link to="/login" className={`text-sm ${interactive} ${focusRing}`}>
              Đăng nhập
            </Link>
          )}

          <button
            type="button"
            aria-label="Mở menu"
            className={`cursor-pointer ${interactive} ${focusRing} md:hidden`}
            onClick={toggleMobileNav}
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {!overlay && <CategoryNav />}
    </header>
  )
}
