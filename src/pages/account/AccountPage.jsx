import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Package, Heart, ChevronRight, ShoppingBag, Box } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { ProductThumb } from '../../components/ProductThumb'
import { useLogout, useMe } from '../../features/auth/hooks'
import { useOrders } from '../../features/orders/hooks'
import { useAddresses } from '../../features/addresses/hooks'
import { ORDER_STATUS_LABELS } from '../../features/orders/statusLabels'
import { useAuthStore } from '../../store/authStore'
import { formatPrice, formatDate } from '../../lib/format'
import { ProfileForm } from './ProfileForm'

const navItems = [
  { to: '/account/rooms', label: 'Phòng của tôi', icon: Box },
  { to: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
  { to: '/orders', label: 'Đơn hàng của tôi', icon: Package },
  { to: '/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
]

const IN_PROGRESS_STATUSES = ['pending_payment', 'paid', 'processing', 'shipped']

const cardClass = 'rounded-card border border-border bg-surface p-6'

export function AccountPage() {
  const storedUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const meQuery = useMe()
  const ordersQuery = useOrders()
  const addressesQuery = useAddresses()
  const logout = useLogout()

  useEffect(() => {
    if (meQuery.data?.data) setUser(meQuery.data.data)
  }, [meQuery.data, setUser])

  const user = meQuery.data?.data ?? storedUser

  const orders = ordersQuery.data?.data ?? []
  const addresses = addressesQuery.data?.data ?? []
  const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0]
  const recentOrders = orders.slice(0, 3)

  const stats = [
    { label: 'Tổng đơn hàng', value: ordersQuery.isError && !ordersQuery.data ? '—' : orders.length },
    { label: 'Đang xử lý', value: ordersQuery.isError && !ordersQuery.data ? '—' : orders.filter((order) => IN_PROGRESS_STATUSES.includes(order.status)).length },
    { label: 'Đã giao', value: ordersQuery.isError && !ordersQuery.data ? '—' : orders.filter((order) => order.status === 'delivered').length },
  ]

  const initial = (user?.name?.trim()?.[0] ?? '?').toUpperCase()

  return (
    <div className="min-h-screen bg-canvas text-ink">
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground font-display text-2xl text-surface">
            {initial}
          </span>
          <div>
            <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-tight text-foreground">
              Xin chào, {user?.name ?? 'bạn'}
            </h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => logout.mutate()}>
          Đăng xuất
        </Button>
      </div>

      {meQuery.isLoading && !user ? (
        <div className="mt-10">
          <Spinner label="Đang tải thông tin tài khoản..." />
        </div>
      ) : meQuery.isError && !user ? (
        <LoadErrorState className="mt-10" title="Chưa thể tải thông tin tài khoản" description="Vui lòng thử lại để tiếp tục quản lý tài khoản." onRetry={meQuery.refetch} isRetrying={meQuery.isFetching} />
      ) : (
        <>
          {meQuery.isError && user && (
            <LoadErrorState className="mt-8" compact background title="Thông tin tài khoản có thể chưa mới nhất" description="Bạn vẫn có thể sử dụng dữ liệu đã lưu hoặc thử tải lại." onRetry={meQuery.refetch} isRetrying={meQuery.isFetching} />
          )}
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="eyebrow">Xác thực email</span>
            <Badge tone={user?.email_verified_at ? 'in-stock' : 'out-of-stock'}>
              {user?.email_verified_at ? 'Đã xác thực' : 'Chưa xác thực'}
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className={cardClass}>
                <p className="font-display text-3xl text-foreground">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className={`mt-6 ${cardClass}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-foreground">Địa chỉ mặc định</h2>
              <Link to="/account/addresses" className="text-sm text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent">
                Quản lý
              </Link>
            </div>
            {addressesQuery.isError && !addressesQuery.data ? (
              <LoadErrorState className="mt-4" compact title="Chưa thể tải địa chỉ mặc định" description="Địa chỉ của bạn chưa bị thay đổi. Hãy thử tải lại." onRetry={addressesQuery.refetch} isRetrying={addressesQuery.isFetching} />
            ) : defaultAddress ? (
              <div className="mt-3 text-sm">
                <p className="font-medium text-foreground">
                  {defaultAddress.recipient_name} · {defaultAddress.phone}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {[defaultAddress.address_line1, defaultAddress.address_line2, defaultAddress.city, defaultAddress.province]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Bạn chưa có địa chỉ.{' '}
                <Link to="/account/addresses" className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent">
                  Thêm địa chỉ
                </Link>
              </p>
            )}
          </div>

          <div className={`mt-6 ${cardClass}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-foreground">Đơn hàng gần đây</h2>
              <Link to="/orders" className="text-sm text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent">
                Xem tất cả
              </Link>
            </div>
            {ordersQuery.isError && !ordersQuery.data ? (
              <LoadErrorState className="mt-4" compact title="Chưa thể tải đơn hàng" description="Số liệu và đơn hàng gần đây chưa thể hiển thị. Hãy thử tải lại." onRetry={ordersQuery.refetch} isRetrying={ordersQuery.isFetching} />
            ) : recentOrders.length > 0 ? (
              <ul className="mt-4 flex flex-col divide-y divide-border">
                {recentOrders.map((order) => {
                  const statusInfo = ORDER_STATUS_LABELS[order.status] ?? { label: order.status, tone: 'neutral' }
                  const firstItem = order.items?.[0]
                  return (
                    <li key={order.id} className="first:pt-0 last:pb-0">
                      <Link
                        to={`/orders/${order.id}`}
                        className="group flex items-center gap-4 py-3 transition-colors focus-visible:outline-none"
                      >
                        <ProductThumb
                          src={firstItem?.variant_snapshot?.thumbnail}
                          alt={firstItem?.variant_snapshot?.product_name}
                          size="h-12 w-12"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground group-hover:text-accent">Đơn hàng #{order.id}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                        </div>
                        <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                        <p className="hidden shrink-0 font-medium text-foreground sm:block">{formatPrice(order.total)}</p>
                        <ChevronRight size={16} className="shrink-0 text-border-strong transition-transform group-hover:translate-x-1" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="mt-4 flex flex-col items-center py-6 text-center">
                <ShoppingBag size={28} className="text-border-strong" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Bạn chưa có đơn hàng nào.{' '}
                  <Link to="/c/all" className="text-foreground underline decoration-accent underline-offset-4 hover:text-accent">
                    Mua sắm ngay
                  </Link>
                </p>
              </div>
            )}
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
            <div className={`mt-6 ${cardClass}`}>
              <h2 className="mb-5 font-display text-xl text-foreground">Thông tin cá nhân</h2>
              <ProfileForm user={user} />
            </div>
          )}
        </>
      )}
    </div>
    </div>
  )
}
