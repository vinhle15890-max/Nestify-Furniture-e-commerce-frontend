// Avatar (initials) + name + email — the shared identity cell for both user tables.
function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

export function UserCell({ user }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">
        {initials(user.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  )
}
