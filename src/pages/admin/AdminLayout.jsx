import { NavLink, Link, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderTree,
  Package,
  Receipt,
  Ticket,
  Star,
  Users,
  ScrollText,
  ArrowLeft,
} from 'lucide-react'
import { useLogout } from '../../features/auth/hooks'
import { useAuthStore } from '../../store/authStore'

const navGroups = [
  {
    items: [{ to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Danh mục',
    items: [
      { to: '/admin/categories', label: 'Danh mục', icon: FolderTree },
      { to: '/admin/products', label: 'Sản phẩm', icon: Package },
    ],
  },
  {
    title: 'Bán hàng',
    items: [
      { to: '/admin/orders', label: 'Đơn hàng', icon: Receipt },
      { to: '/admin/vouchers', label: 'Voucher', icon: Ticket },
    ],
  },
  {
    title: 'Cộng đồng',
    items: [{ to: '/admin/reviews', label: 'Đánh giá', icon: Star }],
  },
  {
    title: 'Hệ thống',
    items: [
      { to: '/admin/users', label: 'Người dùng', icon: Users },
      { to: '/admin/audit-logs', label: 'Nhật ký', icon: ScrollText },
    ],
  },
]

const allItems = navGroups.flatMap((group) => group.items)

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-control border-l-2 px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
    isActive
      ? 'border-accent bg-surface-alt font-medium text-foreground'
      : 'border-transparent text-muted-foreground hover:bg-surface-alt hover:text-foreground'
  }`

export function AdminLayout() {
  const logout = useLogout()
  const user = useAuthStore((state) => state.user)

  return (
    <div className="flex min-h-dvh bg-background">
      <h1 className="sr-only">Quản trị</h1>

      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="px-6 py-6">
          <Link
            to="/admin"
            className="rounded font-display text-2xl tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Nestify
          </Link>
          <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">Bảng điều khiển</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {navGroups.map((group, index) => (
            <div key={group.title ?? index} className={index === 0 ? '' : 'mt-6'}>
              {group.title && (
                <p className="px-3 pb-2 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                  {group.title}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                      <Icon size={18} />
                      {item.label}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border px-6 py-4">
          {user?.name && <p className="truncate text-sm font-medium text-foreground">{user.name}</p>}
          <div className="mt-2 flex flex-col gap-1.5 text-sm">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-accent">
              <ArrowLeft size={14} />
              Về cửa hàng
            </Link>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="text-left text-muted-foreground transition-colors hover:text-destructive"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-20 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between">
            <Link to="/admin" className="font-display text-xl text-foreground">
              Nestify
            </Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-accent">
              Về cửa hàng
            </Link>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {allItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-control px-3 py-1.5 text-sm transition-colors ${
                    isActive ? 'bg-foreground text-surface' : 'bg-surface-alt text-muted-foreground'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
