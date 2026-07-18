import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout, authLink } from '../../components/auth/AuthLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useLogin } from '../../features/auth/hooks'
import { applyServerErrors, focusFirstError, formLevelMessage } from '../../lib/formErrors'

const schema = yup.object({
  email: yup.string().email('Email không hợp lệ.').required('Vui lòng nhập email.'),
  password: yup.string().required('Vui lòng nhập mật khẩu.'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useLogin()
  const [formError, setFormError] = useState(null)
  const formRef = useRef(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: { email: '', password: '' } })

  const onSubmit = async (values) => {
    setFormError(null)
    try {
      await login.mutateAsync(values)
      navigate(location.state?.from?.pathname ?? '/account', { replace: true })
    } catch (error) {
      if (applyServerErrors(error, setError)) {
        focusFirstError(formRef.current)
        return
      }

      if (error.code === 'UNAUTHENTICATED') {
        setFormError('Email hoặc mật khẩu không đúng.')
      } else if (error.code === 'ACCOUNT_INACTIVE') {
        setFormError('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.')
      } else {
        setFormError(formLevelMessage(error))
      }
      focusFirstError(formRef.current)
    }
  }

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Chào mừng trở lại Nestify."
      footer={
        <>
          <Link to="/forgot-password" className={authLink}>
            Quên mật khẩu?
          </Link>
          <p className="text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link to="/register" className={authLink}>
              Đăng ký
            </Link>
          </p>
        </>
      }
    >
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
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Mật khẩu"
          id="password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" disabled={isSubmitting} className="mt-2 py-3.5">
          {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>
    </AuthLayout>
  )
}
