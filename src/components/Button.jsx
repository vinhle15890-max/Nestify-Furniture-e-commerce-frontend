const variantClasses = {
  primary: 'bg-primary text-surface hover:bg-primary-hover',
  secondary: 'border border-foreground text-foreground hover:bg-surface',
  ghost: 'text-foreground hover:bg-surface',
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

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors duration-200 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
