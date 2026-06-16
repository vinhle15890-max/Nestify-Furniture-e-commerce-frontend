import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Card } from '../components/Card'

export function ProtectedRoute() {
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!user?.email_verified_at) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl text-foreground">Xác thực email</h1>
        <Card className="mt-6">
          <p className="text-sm text-muted-foreground">
            Vui lòng kiểm tra hộp thư đến và nhấp vào liên kết xác thực email để tiếp tục. Sau khi
            xác thực, hãy tải lại trang này.
          </p>
        </Card>
      </div>
    )
  }

  return <Outlet />
}
