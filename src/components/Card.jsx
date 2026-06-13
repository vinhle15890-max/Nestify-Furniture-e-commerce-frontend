export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-card border border-border bg-surface p-6 shadow-soft ${className}`} {...props}>
      {children}
    </div>
  )
}
