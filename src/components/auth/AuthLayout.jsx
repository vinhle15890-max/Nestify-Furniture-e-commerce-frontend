import { Link } from 'react-router-dom'
import { Logo } from '../Logo'

/** Shared shell for auth screens: centered brand mark, serif title, surface card. */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
    <div className="mx-auto flex w-full max-w-md flex-col px-6 py-16 md:py-24">
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
  )
}

export const authLink =
  'rounded text-foreground underline decoration-accent underline-offset-4 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
