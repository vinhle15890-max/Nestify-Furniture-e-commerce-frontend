import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { can, canAny } from '../lib/roles'
import { PermissionDenied } from '../pages/admin/PermissionDenied'

// Layout route guard for admin sections. Unlike AdminRoute (coarse isStaff gate),
// this checks a specific permission and, on failure, renders the 403 page in place
// (no redirect) so a deep-linked URL keeps its context.
export function RequirePermission({ slug, anyOf }) {
  const user = useAuthStore((state) => state.user)
  const allowed = anyOf ? canAny(user, anyOf) : can(user, slug)

  if (!allowed) {
    return <PermissionDenied missing={anyOf ?? slug} />
  }
  return <Outlet />
}
