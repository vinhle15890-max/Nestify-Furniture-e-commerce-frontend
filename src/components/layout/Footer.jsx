import { Link } from 'react-router-dom'

const focusRing =
  'rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

const groups = [
  {
    title: 'Mua sắm',
    links: [
      { label: 'Tất cả sản phẩm', to: '/c/all' },
      { label: 'Sản phẩm yêu thích', to: '/wishlist' },
      { label: 'Giỏ hàng', to: '/cart' },
      { label: 'Voucher đang mở', to: '/vouchers' },
    ],
  },
  {
    title: 'Phòng của bạn',
    links: [
      { label: 'Thiết kế phòng', to: '/room-planner' },
      { label: 'Phòng đã lưu', to: '/account/rooms' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Giao hàng', to: '/shipping' },
      { label: 'Đổi trả và hủy đơn', to: '/returns' },
      { label: 'Quyền riêng tư', to: '/privacy' },
      { label: 'Liên hệ', to: '/contact' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(16rem,1.15fr)_2fr]">
          <div>
            <Link to="/" aria-label="Nestify — trang chủ" className={`inline-flex ${focusRing}`}>
              <span className="font-display text-4xl tracking-tight text-foreground">Nestify</span>
            </Link>
            <p className="mt-5 max-w-sm leading-relaxed text-muted-foreground">
              Thấy rõ món đồ trong không gian của bạn trước khi quyết định.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <section key={group.title} aria-labelledby={`footer-${group.title}`}>
                <h2 id={`footer-${group.title}`} className="text-sm font-medium text-muted-foreground">{group.title}</h2>
                <ul className="mt-4 space-y-3">
                  {group.links.map((item) => (
                    <li key={item.label}>
                      <Link to={item.to} className={`whitespace-nowrap text-sm text-foreground transition-colors hover:text-muted-foreground ${focusRing}`}>{item.label}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-border pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Nestify. Mọi quyền được bảo lưu.
        </div>
      </div>
    </footer>
  )
}
