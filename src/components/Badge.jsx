const toneClasses = {
  sale: 'bg-accent text-surface',
  'in-stock': 'bg-secondary text-surface',
  'out-of-stock': 'bg-destructive text-surface',
  neutral: 'bg-border text-foreground',
}

export function Badge({ tone = 'neutral', className = '', children, ...props }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]} ${className}`} {...props}>
      {children}
    </span>
  )
}
