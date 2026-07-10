import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useEffectiveUser } from '../../store/previewStore'
import { visibleGroups, PERMISSION_LABELS } from './adminNav'

// Shown when a staffer deep-links into an admin section they lack permission for.
// We do NOT redirect (keeps the URL/context) — we explain and offer the sections
// they can actually reach. Effective user so this reflects a previewed role's own
// reachable sections during "Xem với vai trò", not the real admin's.
export function PermissionDenied({ missing }) {
  const user = useEffectiveUser()
  const slugs = Array.isArray(missing) ? missing : [missing].filter(Boolean)
  const labels = slugs.map((slug) => PERMISSION_LABELS[slug] ?? slug)
  const groups = visibleGroups(user)
  const allowed = groups.flatMap((group) => group.items)

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-muted-foreground">
        <ShieldAlert size={22} aria-hidden="true" />
      </div>
      <h2 className="font-display text-2xl text-foreground">Bạn không có quyền truy cập</h2>
      {labels.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Mục này cần quyền: <span className="font-medium text-foreground">{labels.join(', ')}</span>.
          Liên hệ quản trị viên nếu bạn cần quyền này.
        </p>
      )}
      {allowed.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground/70">Các mục bạn có thể vào</p>
          <div className="flex flex-col gap-1.5">
            {allowed.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-control px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Tài khoản của bạn chưa được cấp quyền quản trị nào. Vui lòng liên hệ quản trị viên.
        </p>
      )}
    </div>
  )
}
