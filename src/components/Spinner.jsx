export function Spinner({ className = '', label = 'Đang tải...' }) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 ${className}`}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
