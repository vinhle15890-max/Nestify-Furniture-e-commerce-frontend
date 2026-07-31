import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { VerifyEmailGate } from '../components/VerifyEmailGate'
import { SeoHead } from '../components/SeoHead'

export function ProtectedRoute() {
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!user?.email_verified_at) {
    return <VerifyEmailGate />
  }

  return <><SeoHead title="Khu vực tài khoản | Nestify" description="Khu vực riêng tư của tài khoản Nestify." noindex /><Outlet /></>
}
