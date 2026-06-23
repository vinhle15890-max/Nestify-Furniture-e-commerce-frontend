import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthLayout, authLink } from '../../components/auth/AuthLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useResetPassword } from '../../features/auth/hooks'
import { applyServerErrors } from '../../lib/formErrors'

const schema = yup.object({
  password: yup
    .string()
    .required('Vui lòng nhập mật khẩu mới.')
    .min(10, 'Mật khẩu phải có ít nhất 10 ký tự.'),
  password_confirmation: yup
    .string()
    .required('Vui lòng xác nhận mật khẩu.')
    .oneOf([yup.ref('password')], 'Mật khẩu xác nhận không khớp.'),
})

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''
  const resetPassword = useResetPassword()
  const [formError, setFormError] = useState(null)
  const [message, setMessage] = useState(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { password: '', password_confirmation: '' },
  })

  const onSubmit = async (values) => {
    setFormError(null)
    setMessage(null)
    try {
      const { data } = await resetPassword.mutateAsync({ token, email, ...values })
      setMessage(data.message)
    } catch (error) {
      if (applyServerErrors(error, setError)) return
      setFormError(error.message)
    }
  }

  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      footer={
        message ? null : (
          <Link to="/login" className={authLink}>
            Quay lại đăng nhập
          </Link>
        )
      }
    >
      {message ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="text-sm text-secondary">
            {message}
          </p>
          <Link to="/login" className={authLink}>
            Đến trang đăng nhập
          </Link>
        </div>
      ) : !token || !email ? (
        <p role="alert" className="text-sm text-destructive">
          Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu liên kết mới.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Input
            label="Mật khẩu mới"
            id="password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Xác nhận mật khẩu mới"
            id="password_confirmation"
            type="password"
            autoComplete="new-password"
            error={errors.password_confirmation?.message}
            {...register('password_confirmation')}
          />
          <Button type="submit" disabled={isSubmitting} className="mt-2 py-3.5">
            Đặt lại mật khẩu
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
