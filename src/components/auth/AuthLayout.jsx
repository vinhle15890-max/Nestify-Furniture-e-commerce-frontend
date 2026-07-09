import { Link } from 'react-router-dom'
import { Logo } from '../Logo'
import { BecomingRoomArt } from '../BecomingRoomArt'

/**
 * Shared shell for auth screens. On desktop it is a split screen: a warm brand
 * panel (the signature Becoming Room, level 3 — Future Home) beside the form, so
 * the first impression belongs to the same world as the rest of the storefront.
 * On mobile the brand panel is hidden and the form centers on its own.
 */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-2">
      {/* Brand panel — desktop only. */}
      <aside className="hidden bg-unbuilt/15 lg:flex lg:flex-col lg:justify-center lg:px-14 lg:py-16">
        <div className="mx-auto w-full max-w-md">
          <p className="font-display text-[clamp(1.8rem,2.6vw,2.6rem)] leading-tight text-foreground [text-wrap:balance]">
            Không gian sống mang hơi thở của bạn.
          </p>
          <p className="mt-4 max-w-sm text-muted-foreground">
            Thấy trước tổ ấm tương lai của bạn — trước khi quyết định.
          </p>
          <div className="pointer-events-none mt-10 w-full max-w-[440px]">
            <BecomingRoomArt level={3} />
          </div>
        </div>
      </aside>

      {/* Form column. */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-16 md:py-24 lg:min-h-full">
        <div className="mx-auto flex w-full max-w-md flex-col">
          <Link to="/" aria-label="Nestify — trang chủ" className="flex justify-center">
            <Logo className="h-16 w-auto" />
          </Link>
          <h1 className="mt-8 text-center font-display text-[clamp(1.8rem,3.5vw,2.5rem)] leading-tight text-foreground">
            {title}
          </h1>
          {subtitle && <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}

          <div className="mt-8 rounded-card border border-border bg-surface p-8 shadow-soft">{children}</div>

          {footer && <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

export const authLink =
  'rounded text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
