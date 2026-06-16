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
    <div className="mx-auto max-w-md px-4 py-12">
      <Link to="/" aria-label="Nestify — trang chủ" className="mb-8 flex justify-center">
        <Logo className="h-24 w-auto" />
      </Link>
      <h1 className="font-display text-3xl text-foreground">Xác thực email</h1>
      <Card className="mt-6">
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
        ) : null}

        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/account" className="text-primary hover:text-primary-hover">
            Đến tài khoản
          </Link>
        </p>
      </Card>
    </div>
  )
}
