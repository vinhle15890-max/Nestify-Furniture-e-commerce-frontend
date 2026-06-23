import { Link } from 'react-router-dom'
import { Logo } from '../Logo'

const focusRing =
  'rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
        <Link to="/" aria-label="Nestify — trang chủ" className={`inline-flex ${focusRing}`}>
          <Logo className="h-20 w-auto" />
        </Link>
        <p className="mt-4">© {new Date().getFullYear()} Nestify. Mọi quyền được bảo lưu.</p>
      </div>
    </footer>
  )
}
