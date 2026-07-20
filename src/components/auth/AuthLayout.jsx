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
    <div className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)]">
      <aside className="hidden border-r border-unbuilt bg-unbuilt/10 lg:flex lg:flex-col lg:justify-end lg:px-12 lg:pb-20 lg:pt-28">
        <div className="ml-auto w-full max-w-sm">
          <p className="font-display text-[clamp(1.7rem,2.3vw,2.35rem)] leading-tight text-foreground [text-wrap:balance]">
            Giữ lại những gì bạn đang cân nhắc.
          </p>
          <p className="mt-4 max-w-sm text-muted-foreground">
            Lưu phòng và quay lại đúng nơi bạn đã dừng, khi bạn sẵn sàng.
          </p>
          <div className="pointer-events-none mt-10 w-full max-w-[440px]">
            <BecomingRoomArt level={1} />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col justify-center px-5 py-14 sm:px-8 md:py-24 lg:min-h-full lg:items-start lg:pl-[clamp(4rem,10vw,10rem)]">
        <div className="flex w-full max-w-[26rem] flex-col">
          <Link to="/" aria-label="Nestify — trang chủ" className="flex self-start rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo className="h-12 w-auto" />
          </Link>
          <h1 className="mt-10 font-display text-[clamp(1.8rem,3.5vw,2.5rem)] leading-tight text-foreground">
            {title}
          </h1>
          {subtitle && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}

          <div className="mt-8 border-t border-unbuilt pt-7">{children}</div>

          {footer && <div className="mt-7 flex flex-col items-start gap-2 text-sm">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

export const authLink =
  'rounded text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
