import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useRegister } from '../../features/auth/hooks'
import { applyServerErrors } from '../../lib/formErrors'

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
  const registerUser = useRegister()
  const [formError, setFormError] = useState(null)

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
      navigate('/account', { replace: true })
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
      <h1 className="font-display text-3xl text-foreground">Đăng ký</h1>
      <Card className="mt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="text-sm text-destructive">
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
          <Input
            label="Mật khẩu"
            id="password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Xác nhận mật khẩu"
            id="password_confirmation"
            type="password"
            autoComplete="new-password"
            error={errors.password_confirmation?.message}
            {...register('password_confirmation')}
          />
          <Button type="submit" disabled={isSubmitting}>
            Đăng ký
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-primary hover:text-primary-hover">
            Đăng nhập
          </Link>
        </p>
      </Card>
    </div>
  )
}
