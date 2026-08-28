import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { isStaff } from '../lib/roles'
import { SeoHead } from '../components/SeoHead'

export function AdminRoute() {
  const token = useAuthStore((state) => state.adminToken)
  const user = useAuthStore((state) => state.adminUser)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // Any staff role (not just super_admin) may enter; each admin route still
  // enforces its own permission server-side.
  if (!isStaff(user)) {
    return <Navigate to="/admin/login" replace />
  }

  return <><SeoHead title="Quản trị | Nestify" description="Khu vực quản trị Nestify." noindex /><Outlet /></>
}
