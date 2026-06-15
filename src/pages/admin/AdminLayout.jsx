import { NavLink, Outlet } from 'react-router-dom'

const navLinkClass = ({ isActive }) =>
  `rounded-control px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out ${
    isActive ? 'bg-primary text-surface' : 'text-foreground hover:text-primary'
  }`

const links = [
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/categories', label: 'Danh mục' },
  { to: '/admin/products', label: 'Sản phẩm' },
  { to: '/admin/orders', label: 'Đơn hàng' },
  { to: '/admin/reviews', label: 'Đánh giá' },
  { to: '/admin/vouchers', label: 'Voucher' },
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/audit-logs', label: 'Nhật ký' },
]

export function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Quản trị</h1>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  )
}
