// Standard raised surface for admin content (tables, toolbars, cards).
export function Panel({ className = '', padded = true, children }) {
  return (
    <div className={`overflow-hidden rounded-card border border-border bg-surface shadow-soft ${padded ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  )
}
