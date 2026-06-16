import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useForgotPassword } from '../../features/auth/hooks'
import { applyServerErrors } from '../../lib/formErrors'

const schema = yup.object({
  email: yup.string().email('Email không hợp lệ.').required('Vui lòng nhập email.'),
})

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword()
  const [formError, setFormError] = useState(null)
  const [message, setMessage] = useState(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: { email: '' } })

  const onSubmit = async (values) => {
    setFormError(null)
    setMessage(null)
    try {
      const { data } = await forgotPassword.mutateAsync(values)
      setMessage(data.message)
    } catch (error) {
      if (applyServerErrors(error, setError)) return
      setFormError(error.message)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Link to="/" aria-label="Nestify — trang chủ" className="mb-8 flex justify-center">
        <Logo className="h-24 w-auto" />
      </Link>
      <h1 className="font-display text-3xl text-foreground">Quên mật khẩu</h1>
      <Card className="mt-6">
        {message ? (
          <p role="status" className="text-sm text-secondary">
            {message}
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu cho bạn.
            </p>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <Input
              label="Email"
              id="email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Button type="submit" disabled={isSubmitting}>
              Gửi liên kết đặt lại
            </Button>
          </form>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:text-primary-hover">
            Quay lại đăng nhập
          </Link>
        </p>
      </Card>
    </div>
  )
}
