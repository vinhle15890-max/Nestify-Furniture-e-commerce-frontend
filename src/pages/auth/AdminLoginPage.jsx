import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout, authLink } from '../../components/auth/AuthLayout'
import { Input } from '../../components/Input'
import { PasswordInput } from '../../components/auth/PasswordInput'
import { Button } from '../../components/Button'
import { useAdminLogin } from '../../features/auth/hooks'
import { applyServerErrors, focusFirstError, formLevelMessage } from '../../lib/formErrors'

const schema = yup.object({
  email: yup.string().email('Email không hợp lệ.').required('Vui lòng nhập email.'),
  password: yup.string().required('Vui lòng nhập mật khẩu.'),
})

export function AdminLoginPage() {
  const navigate = useNavigate()
  const login = useAdminLogin()
  const [formError, setFormError] = useState(null)
  const formRef = useRef(null)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(schema), defaultValues: { email: '', password: '' } })

  async function onSubmit(values) {
    setFormError(null)
    try {
      await login.mutateAsync(values)
      navigate('/admin', { replace: true })
    } catch (error) {
      if (applyServerErrors(error, setError)) return focusFirstError(formRef.current)
      setFormError(error.code === 'UNAUTHENTICATED' ? 'Email, mật khẩu hoặc quyền truy cập không hợp lệ.' : error.code === 'ACCOUNT_INACTIVE' ? 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.' : formLevelMessage(error))
      focusFirstError(formRef.current)
    }
  }

  return <div data-theme="legacy"><AuthLayout variant="login" title="Đăng nhập quản trị" subtitle="Khu vực dành cho đội ngũ vận hành Nestify." footer={<><Link to="/forgot-password" className={authLink}>Quên mật khẩu?</Link><Link to="/" className={authLink}>Về cửa hàng</Link></>}>
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError && <p role="alert" tabIndex="-1" className="text-sm text-destructive">{formError}</p>}
      <Input label="Email nhân viên" id="admin-email" type="email" autoComplete="email" reserveMessageSpace error={errors.email?.message} {...register('email')} />
      <PasswordInput label="Mật khẩu" id="admin-password" autoComplete="current-password" reserveMessageSpace error={errors.password?.message} {...register('password')} />
      <Button type="submit" disabled={isSubmitting} className="mt-3 w-full py-3.5 sm:w-auto sm:min-w-44">{isSubmitting ? 'Đang đăng nhập…' : 'Vào trang quản trị'}</Button>
    </form>
  </AuthLayout></div>
}
