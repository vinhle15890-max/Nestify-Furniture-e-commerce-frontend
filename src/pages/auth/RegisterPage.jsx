import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout, authLink } from '../../components/auth/AuthLayout'
import { Input } from '../../components/Input'
import { PasswordInput } from '../../components/auth/PasswordInput'
import { Button } from '../../components/Button'
import { useRegister } from '../../features/auth/hooks'
import { applyServerErrors, focusFirstError, formLevelMessage } from '../../lib/formErrors'

const schema = yup.object({
  name: yup.string().required('Vui lòng nhập họ tên.').max(255, 'Họ tên tối đa 255 ký tự.'),
  email: yup.string().email('Email không hợp lệ.').required('Vui lòng nhập email.'),
  password: yup
    .string()
    .required('Vui lòng nhập mật khẩu.')
    .min(10, 'Mật khẩu phải có ít nhất 10 ký tự.'),
  password_confirmation: yup
    .string()
    .required('Vui lòng xác nhận mật khẩu.')
    .oneOf([yup.ref('password')], 'Mật khẩu xác nhận không khớp.'),
})

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const registerUser = useRegister()
  const [formError, setFormError] = useState(null)
  const formRef = useRef(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: '', email: '', password: '', password_confirmation: '' },
  })

  const onSubmit = async (values) => {
    setFormError(null)
    try {
      await registerUser.mutateAsync(values)
      const from = location.state?.from
      navigate(from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/account', { replace: true })
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
      title="Đăng ký"
      subtitle="Lưu phòng, giữ lại lựa chọn và tiếp tục khi bạn sẵn sàng."
      footer={
        <p className="text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link to="/login" className={authLink}>
            Đăng nhập
          </Link>
        </p>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {formError && (
          <p role="alert" tabIndex="-1" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Input label="Họ tên" id="name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordInput
          label="Mật khẩu"
          id="password"
          guidance="Dùng ít nhất 10 ký tự. Một cụm từ dài sẽ dễ nhớ và khó đoán hơn."
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label="Xác nhận mật khẩu"
          id="password_confirmation"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />
        <Button type="submit" disabled={isSubmitting} className="mt-2 py-3.5">
          {isSubmitting ? 'Đang đăng ký…' : 'Đăng ký'}
        </Button>
      </form>
    </AuthLayout>
  )
}
