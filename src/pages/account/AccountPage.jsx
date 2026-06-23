import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Package, Heart, ChevronRight } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { useLogout, useMe } from '../../features/auth/hooks'
import { useAuthStore } from '../../store/authStore'
import { ProfileForm } from './ProfileForm'

const navItems = [
  { to: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
  { to: '/orders', label: 'Đơn hàng của tôi', icon: Package },
  { to: '/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
]

export function AccountPage() {
  const storedUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const { data, isLoading } = useMe()
  const logout = useLogout()

  useEffect(() => {
    if (data?.data) setUser(data.data)
  }, [data, setUser])

  const user = data?.data ?? storedUser

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] text-foreground">Tài khoản</h1>
        <Button variant="secondary" onClick={() => logout.mutate()}>
          Đăng xuất
        </Button>
      </div>

      <div className="mt-10 rounded-card border border-border bg-surface p-6">
        {isLoading && !user ? (
          <Spinner label="Đang tải thông tin tài khoản..." />
        ) : user ? (
          <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
            <div>
              <p className="eyebrow">Email</p>
              <p className="mt-1 text-base text-foreground">{user.email}</p>
            </div>
            <div>
              <p className="eyebrow">Xác thực email</p>
              <Badge tone={user.email_verified_at ? 'in-stock' : 'out-of-stock'} className="mt-1.5">
                {user.email_verified_at ? 'Đã xác thực' : 'Chưa xác thực'}
              </Badge>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-5 transition-colors duration-200 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex items-center gap-3">
              <Icon size={20} className="text-accent" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </span>
            <ChevronRight size={16} className="text-border-strong transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        ))}
      </div>

      {user && (
        <div className="mt-6 rounded-card border border-border bg-surface p-6">
          <h2 className="mb-5 font-display text-xl text-foreground">Thông tin cá nhân</h2>
          <ProfileForm user={user} />
        </div>
      )}
    </div>
  )
}
