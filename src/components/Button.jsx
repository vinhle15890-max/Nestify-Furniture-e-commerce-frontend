import { Link } from 'react-router-dom'

const variantClasses = {
  primary: 'bg-primary text-surface hover:bg-primary-hover',
  secondary: 'border border-foreground/35 text-foreground hover:border-foreground hover:bg-unbuilt/20',
  ghost: 'text-foreground hover:bg-unbuilt/25',
  tertiary: 'px-0 text-foreground hover:text-foreground/65',
  destructive: 'bg-destructive text-surface hover:opacity-90',
  // State 4 "Committed" (Component Bible): the single final Checkout confirm.
  // `confirmed` #3D5A45 must appear in EXACTLY one place site-wide — the
  // "Đặt hàng" button. Do not reuse this variant anywhere else.
  confirmed: 'bg-confirmed text-surface hover:bg-confirmed/90',
  // State 3 "Mentally Real" at its peak (Component Bible): the Room Planner
  // "Lưu phòng" CTA is the one place `imagined` #B5754A is a valid button
  // colour. `text-ink` gives the best available contrast on this mid-tone
  // (~4:1). Do not reuse this variant elsewhere.
  imagined: 'bg-imagined text-ink hover:bg-imagined/90',
}

const baseClasses =
  'group inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-control px-6 py-3 text-sm font-medium tracking-wide transition-[background-color,border-color,color,opacity,transform] duration-200 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

function buttonClasses({ variant = 'primary', className = '' } = {}) {
  return `${baseClasses} ${variantClasses[variant] ?? variantClasses.primary} ${className}`
}

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={buttonClasses({
        variant,
        className: `cursor-pointer disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 ${className}`,
      })}
      {...props}
    >
      {children}
    </button>
  )
}

export function ButtonLink({ variant = 'primary', className = '', children, ...props }) {
  return (
    <Link className={buttonClasses({ variant, className })} {...props}>
      {children}
    </Link>
  )
}
