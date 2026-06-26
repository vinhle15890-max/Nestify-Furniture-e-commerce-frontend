// Role → label + tint. Tints are drawn from the design tokens (ink / brass / olive /
// terracotta) so the badges stay on-brand while still reading as distinct categories.
const ROLE_META = {
  super_admin:   { label: 'Super Admin',      className: 'bg-destructive/10 text-destructive ring-destructive/25' },
  admin:         { label: 'Quản trị viên',    className: 'bg-accent/12 text-accent-hover ring-accent/25' },
  store_manager: { label: 'Quản lý cửa hàng', className: 'bg-secondary/12 text-secondary ring-secondary/25' },
  order_staff:   { label: 'NV đơn hàng',       className: 'bg-primary/8 text-foreground ring-border-strong' },
  catalog_staff: { label: 'NV sản phẩm',       className: 'bg-primary/8 text-foreground ring-border-strong' },
  moderator:     { label: 'Kiểm duyệt',        className: 'bg-primary/8 text-foreground ring-border-strong' },
  customer:      { label: 'Khách hàng',        className: 'bg-border/60 text-muted-foreground ring-border' },
}

const FALLBACK = { className: 'bg-border/60 text-muted-foreground ring-border' }

export function RoleBadge({ role }) {
  const meta = ROLE_META[role] ?? { ...FALLBACK, label: role }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}
