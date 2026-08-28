import { Navigate } from 'react-router-dom'
import { isStaff } from '../lib/roles'
import { useAuthStore } from '../store/authStore'

/**
 * The domain root is intent-aware: reopening Nestify with a persisted staff
 * session resumes the back office. Storefront browsing remains available from
 * the explicit "Về cửa hàng" action without mixing the two login journeys.
 */
export function HomeEntryRoute({ children }) {
  const customerToken = useAuthStore((state) => state.token)
  const adminToken = useAuthStore((state) => state.adminToken)
  const adminUser = useAuthStore((state) => state.adminUser)

  // With two simultaneous sessions, `/` belongs to the customer storefront.
  // Only a browser holding solely a staff session resumes the back office.
  if (!customerToken && adminToken && isStaff(adminUser)) {
    return <Navigate to="/admin" replace />
  }

  return children
}
