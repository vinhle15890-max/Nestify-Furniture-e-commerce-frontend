// Centered empty/zero-data state for admin tables and panels.
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-border-strong">
          <Icon size={24} aria-hidden="true" />
        </span>
      )}
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
