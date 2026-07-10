import { Outlet } from 'react-router-dom'
import { useEffectiveUser } from '../store/previewStore'
import { can, canAny } from '../lib/roles'
import { PermissionDenied } from '../pages/admin/PermissionDenied'

// Layout route guard for admin sections. Unlike AdminRoute (coarse isStaff gate),
// this checks a specific permission and, on failure, renders the 403 page in place
// (no redirect) so a deep-linked URL keeps its context. Reads the effective user
// (real user, or the previewed role's permissions during "Xem với vai trò") so a
// preview accurately shows what that role could and couldn't reach.
export function RequirePermission({ slug, anyOf }) {
  const user = useEffectiveUser()
  const allowed = anyOf ? canAny(user, anyOf) : can(user, slug)

  if (!allowed) {
    return <PermissionDenied missing={anyOf ?? slug} />
  }
  return <Outlet />
}
