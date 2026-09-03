// Becoming Room is near-monochrome, so status tones can't lean on distinct hues:
// `imagined`/`confirmed` are restricted (never on list badges) and `emerging` is a
// true mid-tone that fails AA as a fill-with-text. So the four lifecycle groups are
// kept distinct — and AA-safe — via fill-vs-outline instead of hue alone. The
// outline→solid progression also mirrors the "becoming" arc (in-motion → done).
//   neutral      = waiting / unknown → filled `unbuilt`
//   sale         = in progress       → outlined `emerging` (not yet solid)
//   in-stock     = affirmed / done   → solid `ink`
//   out-of-stock = negative terminal → solid `destructive`
const toneClasses = {
  sale: 'border border-emerging bg-transparent text-foreground',
  'in-stock': 'border border-transparent bg-foreground text-surface',
  'out-of-stock': 'border border-transparent bg-destructive text-surface',
  neutral: 'border border-transparent bg-border text-foreground',
}

export function Badge({ tone = 'neutral', className = '', children, ...props }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]} ${className}`} {...props}>
      {children}
    </span>
  )
}
