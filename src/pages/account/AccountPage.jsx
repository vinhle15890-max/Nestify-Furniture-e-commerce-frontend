import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Box, ChevronRight, Heart, MapPin, Package, UserRound } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { LoadErrorState } from '../../components/LoadErrorState'
import { useLogout, useMe } from '../../features/auth/hooks'
import { useOrders } from '../../features/orders/hooks'
import { useScenes } from '../../features/roomPlanner/hooks'
import { ORDER_STATUS_LABELS } from '../../features/orders/statusLabels'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatPrice, numericClassName } from '../../lib/format'
import { ProfileForm } from './ProfileForm'
import { AccountSkeleton } from '../../components/LoadingStates'

const secondaryLinks = [
  { to: '/account/addresses', label: 'Địa chỉ giao hàng', icon: MapPin },
  { to: '/orders', label: 'Tất cả đơn hàng', icon: Package },
]

export function AccountPage() {
  const storedUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const meQuery = useMe()
  const ordersQuery = useOrders()
  const scenesQuery = useScenes(1)
  const logout = useLogout()

  useEffect(() => {
    if (meQuery.data?.data) setUser(meQuery.data.data)
  }, [meQuery.data, setUser])

  const user = meQuery.data?.data ?? storedUser
  const orders = ordersQuery.data?.data ?? []
  const currentOrder = orders.find((order) => ['pending_payment', 'paid', 'processing', 'shipped'].includes(order.status)) ?? orders[0]
  const rooms = scenesQuery.data?.data ?? []
  const latestRoom = rooms[0]
  const orderStatus = currentOrder
    ? (ORDER_STATUS_LABELS[currentOrder.status] ?? { label: currentOrder.status, tone: 'neutral' })
    : null

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
        {meQuery.isLoading && !user ? <AccountSkeleton /> : <>
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="font-display text-[clamp(1.8rem,3vw,2.5rem)] text-foreground">Xin chào, {user?.name ?? 'bạn'}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{user?.email}</span>
              <Badge tone={user?.email_verified_at ? 'in-stock' : 'out-of-stock'}>{user?.email_verified_at ? 'Đã xác thực' : 'Chưa xác thực'}</Badge>
            </div>
          </div>
          <Button variant="secondary" onClick={() => logout.mutate()}>Đăng xuất</Button>
        </header>

        {meQuery.isError && !user ? (
          <LoadErrorState className="mt-10" title="Chưa thể tải thông tin tài khoản" description="Hãy thử lại để tiếp tục." onRetry={meQuery.refetch} isRetrying={meQuery.isFetching} />
        ) : (
          <>
            <section aria-labelledby="account-continue" className="mt-10 grid gap-5 md:grid-cols-[1.25fr_0.75fr]">
              <div className="min-w-0 border-y-2 border-foreground py-7">
                <h2 id="account-continue" className="text-xl font-semibold text-foreground">Tiếp tục không gian của bạn</h2>
                {scenesQuery.isError && !scenesQuery.data ? (
                  <LoadErrorState className="mt-5" compact title="Chưa thể tải phòng đã lưu" description="Các phòng của bạn vẫn được giữ nguyên." onRetry={scenesQuery.refetch} isRetrying={scenesQuery.isFetching} />
                ) : latestRoom ? (
                  <div className="mt-5 flex items-center gap-4">
                    <div className="h-24 w-32 shrink-0 overflow-hidden rounded-control bg-unbuilt/35">
                      {latestRoom.preview_url && <img src={latestRoom.preview_url} alt={`Ảnh phòng ${latestRoom.name}`} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-medium text-foreground">{latestRoom.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Mở lại đúng nơi bạn đã dừng.</p>
                      <Link to={`/room-planner/${latestRoom.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Tiếp tục thiết kế <ChevronRight size={15} aria-hidden="true" /></Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5"><p className="text-sm text-muted-foreground">Bạn chưa có phòng nào được lưu.</p><Link to="/room-planner" className="mt-3 inline-block text-sm font-medium text-foreground underline underline-offset-4">Tạo phòng đầu tiên</Link></div>
                )}
              </div>

              <div className="border-y border-border py-7">
                <h2 className="text-xl font-semibold text-foreground">Đơn hàng hiện tại</h2>
                {currentOrder ? (
                  <Link to={`/orders/${currentOrder.id}`} className="mt-5 block rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex items-center justify-between gap-3"><span className="font-medium text-foreground">Đơn #{currentOrder.id}</span><Badge tone={orderStatus.tone}>{orderStatus.label}</Badge></div>
                    <p className="mt-2 text-sm text-muted-foreground">{formatDate(currentOrder.created_at)}</p>
                    <p className={`mt-3 font-semibold text-foreground ${numericClassName}`}>{formatPrice(currentOrder.total)}</p>
                  </Link>
                ) : <p className="mt-5 text-sm text-muted-foreground">Bạn chưa có đơn hàng đang xử lý.</p>}
              </div>
            </section>

            <section aria-labelledby="saved-index-title" className="mt-10 border-t border-border pt-7">
              <h2 id="saved-index-title" className="text-lg font-medium text-foreground">Những điều bạn đang giữ lại</h2>
              <div className="mt-4 divide-y divide-unbuilt border-y border-unbuilt">
                <Link to="/account/rooms" className="group flex items-center justify-between py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="flex items-center gap-3"><Box size={19} aria-hidden="true" /><span>Phòng đã lưu</span></span><ChevronRight size={16} aria-hidden="true" /></Link>
                <Link to="/wishlist" className="group flex items-center justify-between py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="flex items-center gap-3"><Heart size={19} aria-hidden="true" /><span>Sản phẩm yêu thích</span></span><ChevronRight size={16} aria-hidden="true" /></Link>
              </div>
            </section>

            <nav aria-label="Quản lý tài khoản" className="mt-12">
              <p className="text-sm text-muted-foreground">Thông tin tài khoản</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
                {secondaryLinks.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="inline-flex items-center gap-2 text-sm text-foreground underline decoration-border-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Icon size={16} aria-hidden="true" />{label}</Link>)}
              </div>
            </nav>

            {user && <details className="mt-8 border-t border-border pt-6"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><UserRound size={17} aria-hidden="true" />Thông tin cá nhân</summary><div className="mt-6 max-w-2xl"><ProfileForm user={user} /></div></details>}
          </>
        )}
        </>}
      </div>
    </div>
  )
}
