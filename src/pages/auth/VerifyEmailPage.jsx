import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Spinner'
import { useVerifyEmail } from '../../features/auth/hooks'
import { useAuthStore } from '../../store/authStore'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams])
  const { data, error, isLoading, isSuccess, isError } = useVerifyEmail(params)

  useEffect(() => {
    if (!isSuccess) return
    const currentUser = useAuthStore.getState().user
    if (currentUser) {
      useAuthStore.getState().setUser({ ...currentUser, email_verified_at: new Date().toISOString() })
    }
  }, [isSuccess])

  return (
    <AuthLayout
      title="Xác thực email"
      footer={
        <>
          <Link to="/account" className={authLink}>
            Đến tài khoản
          </Link>
          <Link to="/login" className={authLink}>
            Đăng nhập
          </Link>
        </>
      }
    >
      {Object.keys(params).length === 0 ? (
        <p role="alert" className="text-sm text-destructive">
          Liên kết xác thực không hợp lệ.
        </p>
      ) : isLoading ? (
        <Spinner label="Đang xác thực..." />
      ) : isSuccess ? (
        <p role="status" className="text-sm text-secondary">
          {data.data.message}
        </p>
      ) : isError ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      </Card>
    </div>
  )
}
