import { Navigate } from 'react-router-dom'
import { isStaff } from '../lib/roles'
import { useAuthStore } from '../store/authStore'

/**
 * The domain root is intent-aware: reopening Nestify with a persisted staff
 * session resumes the back office. Storefront browsing remains available from
 * the explicit "Về cửa hàng" action without mixing the two login journeys.
 */
export function HomeEntryRoute({ children }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (token && isStaff(user)) {
    return <Navigate to="/admin" replace />
  }

  return children
}
