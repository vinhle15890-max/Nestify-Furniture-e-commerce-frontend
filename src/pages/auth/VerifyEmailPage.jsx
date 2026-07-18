import { useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthLayout, authLink } from '../../components/auth/AuthLayout'
import { Spinner } from '../../components/Spinner'
import { useVerifyEmail } from '../../features/auth/hooks'
import { useAuthStore } from '../../store/authStore'
import { formLevelMessage } from '../../lib/formErrors'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams])
  const { data, error, isLoading, isSuccess, isError } = useVerifyEmail(params)
  const alertRef = useRef(null)

  useEffect(() => {
    if (!isSuccess) return
    const currentUser = useAuthStore.getState().user
    if (currentUser) {
      useAuthStore.getState().setUser({ ...currentUser, email_verified_at: new Date().toISOString() })
    }
  }, [isSuccess])

  useEffect(() => {
    if (isError && alertRef.current) alertRef.current.focus()
  }, [isError])

  const friendlyMessage = isError ? formLevelMessage(error) : null

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
        <p role="alert" tabIndex="-1" className="text-sm text-destructive">
          Liên kết xác thực không hợp lệ. Vui lòng yêu cầu liên kết xác thực mới từ tài khoản của bạn.
        </p>
      ) : isLoading ? (
        <Spinner label="Đang xác thực..." />
      ) : isSuccess ? (
        <p role="status" className="text-sm text-secondary">
          {data.data.message}
        </p>
      ) : isError ? (
        <p ref={alertRef} role="alert" tabIndex="-1" className="text-sm text-destructive">
          {friendlyMessage}
        </p>
      ) : null}
    </AuthLayout>
  )
}
