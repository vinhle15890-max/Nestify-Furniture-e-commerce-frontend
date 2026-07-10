import { Navigate } from 'react-router-dom'
import { useEffectiveUser } from '../../store/previewStore'
import { can } from '../../lib/roles'
import { firstAllowedPath } from './adminNav'
import { PermissionDenied } from './PermissionDenied'
import { AdminDashboardPage } from './AdminDashboardPage'

// Index element for /admin. The dashboard needs `view_dashboard`; a staffer
// without it is sent to the first section they CAN reach (combined behaviour:
// the index redirects, but deep-links to a forbidden section show 403). A
// staffer with no admin permission at all sees the 403 page. Effective user so
// "Xem với vai trò" previews the same index behaviour that role would get.
export function AdminHome() {
  const user = useEffectiveUser()

  if (can(user, 'view_dashboard')) {
    return <AdminDashboardPage />
  }
  const target = firstAllowedPath(user)
  if (target) {
    return <Navigate to={target} replace />
  }
  return <PermissionDenied missing="view_dashboard" />
}
