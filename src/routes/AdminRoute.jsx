import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { isStaff } from '../lib/roles'
import { SeoHead } from '../components/SeoHead'

export function AdminRoute() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Any staff role (not just super_admin) may enter; each admin route still
  // enforces its own permission server-side.
  if (!isStaff(user)) {
    return <Navigate to="/" replace />
  }

  return <><SeoHead title="Quản trị | Nestify" description="Khu vực quản trị Nestify." noindex /><Outlet /></>
}
