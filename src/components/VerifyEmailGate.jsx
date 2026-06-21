import { Card } from './Card'
import { Button } from './Button'
import { useResendVerificationEmail } from '../features/auth/hooks'

/**
 * Shown by ProtectedRoute when a logged-in user hasn't verified their email yet.
 * The backend blocks every authenticated route until verification, so this gate
 * explains what to do and lets the user re-send the verification email.
 */
export function VerifyEmailGate() {
  const resend = useResendVerificationEmail()

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-foreground">Xác thực email</h1>
      <Card className="mt-6 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Vui lòng kiểm tra hộp thư đến và nhấp vào liên kết xác thực email để tiếp tục. Sau khi
          xác thực, hãy tải lại trang này.
        </p>

        {resend.isSuccess && (
          <p role="status" className="text-sm text-secondary">
            Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư (kể cả mục spam).
          </p>
        )}
        {resend.isError && (
          <p role="alert" className="text-sm text-destructive">
            {resend.error?.message ?? 'Không gửi được email. Vui lòng thử lại sau.'}
          </p>
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={() => resend.mutate()}
          disabled={resend.isPending}
        >
          {resend.isPending ? 'Đang gửi...' : 'Gửi lại email xác thực'}
        </Button>
      </Card>
    </div>
  )
}
