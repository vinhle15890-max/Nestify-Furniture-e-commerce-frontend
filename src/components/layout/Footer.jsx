import { Link } from 'react-router-dom'
import { Instagram, Facebook, Youtube } from 'lucide-react'
import { Newsletter } from '../home/Newsletter'

const focusRing =
  'rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

const columns = [
  {
    title: 'Mua sắm',
    links: [
      { label: 'Tất cả sản phẩm', to: '/c/all' },
      { label: 'Sofa', to: '/c/sofa' },
      { label: 'Bàn ăn', to: '/c/ban-an' },
      { label: 'Phòng ngủ', to: '/c/phong-ngu' },
    ],
  },
  {
    title: 'Về Nestify',
    links: [{ label: 'Câu chuyện thương hiệu', to: '/about' }],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Tài khoản', to: '/account' },
      { label: 'Đơn hàng', to: '/orders' },
      { label: 'Yêu thích', to: '/wishlist' },
    ],
  },
]

const socials = [
  { label: 'Instagram', icon: Instagram, href: 'https://instagram.com' },
  { label: 'Facebook', icon: Facebook, href: 'https://facebook.com' },
  { label: 'YouTube', icon: Youtube, href: 'https://youtube.com' },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <Newsletter />
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Link to="/" aria-label="Nestify — trang chủ" className={`inline-flex ${focusRing}`}>
              <span className="font-display text-4xl tracking-tight text-foreground">Nestify</span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Nội thất ấm áp, vượt thời gian — chế tác từ vật liệu tự nhiên cho không gian sống hiện đại.
            </p>
            <div className="mt-6 flex items-center gap-4">
              {socials.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className={`text-muted-foreground transition-colors duration-200 hover:text-accent ${focusRing}`}
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className={`text-sm text-foreground transition-colors duration-200 hover:text-accent ${focusRing}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Nestify. Mọi quyền được bảo lưu.</p>
          <p>Thiết kế tại Việt Nam · Vật liệu tự nhiên</p>
        </div>
      </div>
    </footer>
  )
}
