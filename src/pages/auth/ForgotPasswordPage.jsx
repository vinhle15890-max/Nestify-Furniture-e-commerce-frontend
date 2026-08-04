import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Link } from 'react-router-dom'
import { AuthLayout, authLink } from '../../components/auth/AuthLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useForgotPassword } from '../../features/auth/hooks'
import { applyServerErrors, focusFirstError, formLevelMessage } from '../../lib/formErrors'

const schema = yup.object({
  email: yup.string().email('Email không hợp lệ.').required('Vui lòng nhập email.'),
})

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword()
  const [formError, setFormError] = useState(null)
  const [message, setMessage] = useState(null)
  const formRef = useRef(null)

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
      if (applyServerErrors(error, setError)) {
        focusFirstError(formRef.current)
        return
      }
      setFormError(formLevelMessage(error))
      focusFirstError(formRef.current)
    }
  }

  return (
    <AuthLayout
      variant="recovery"
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu cho bạn."
      footer={
        <Link to="/login" className={authLink}>
          Quay lại đăng nhập
        </Link>
      }
    >
      {message ? (
        <p role="status" className="text-sm text-secondary">
          {message}
        </p>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {formError && (
            <p role="alert" tabIndex="-1" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Input
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            reserveMessageSpace
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" disabled={isSubmitting} className="mt-3 w-full py-3.5 sm:w-auto">
            {isSubmitting ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
