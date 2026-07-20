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
      { label: 'Giao hàng', href: 'mailto:support@nestify.vn?subject=H%E1%BB%97%20tr%E1%BB%A3%20giao%20h%C3%A0ng' },
      { label: 'Đổi trả và hủy đơn', href: 'mailto:support@nestify.vn?subject=H%E1%BB%97%20tr%E1%BB%A3%20%C4%91%E1%BB%95i%20tr%E1%BA%A3' },
      { label: 'Quyền riêng tư', href: 'mailto:support@nestify.vn?subject=Quy%E1%BB%81n%20ri%C3%AAng%20t%C6%B0' },
      { label: 'Liên hệ', href: 'mailto:support@nestify.vn' },
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
                      {item.to ? (
                        <Link to={item.to} className={`text-sm text-foreground transition-colors hover:text-muted-foreground ${focusRing}`}>{item.label}</Link>
                      ) : (
                        <a href={item.href} className={`text-sm text-foreground transition-colors hover:text-muted-foreground ${focusRing}`}>{item.label}</a>
                      )}
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
