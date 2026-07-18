import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useUpdateProfile } from '../../features/auth/hooks'
import { applyServerErrors, focusFirstError, formLevelMessage } from '../../lib/formErrors'

const schema = yup.object({
  name: yup.string().required('Vui lòng nhập họ tên.').max(255, 'Họ tên tối đa 255 ký tự.'),
  current_password: yup.string().when('password', {
    is: (value) => !!value,
    then: (s) => s.required('Vui lòng nhập mật khẩu hiện tại.'),
    otherwise: (s) => s.notRequired(),
  }),
  password: yup
    .string()
    .notRequired()
    .test('min', 'Mật khẩu mới phải có ít nhất 10 ký tự.', (value) => !value || value.length >= 10),
  password_confirmation: yup.string().when('password', {
    is: (value) => !!value,
    then: (s) =>
      s.required('Vui lòng xác nhận mật khẩu mới.').oneOf([yup.ref('password')], 'Mật khẩu xác nhận không khớp.'),
    otherwise: (s) => s.notRequired(),
  }),
})

export function ProfileForm({ user }) {
  const updateProfile = useUpdateProfile()
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(false)
  const formRef = useRef(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  })

  const onSubmit = async (values) => {
    setFormError(null)
    setSuccess(false)
    try {
      await updateProfile.mutateAsync(values)
      setSuccess(true)
      reset({ name: values.name, current_password: '', password: '', password_confirmation: '' })
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
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError && (
        <p role="alert" tabIndex="-1" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-secondary">
          Đã cập nhật thông tin tài khoản.
        </p>
      )}

      <Input label="Họ tên" id="name" autoComplete="name" error={errors.name?.message} {...register('name')} />

      <fieldset className="mt-2 flex flex-col gap-4 border-t border-border pt-4">
        <legend className="text-sm font-medium text-muted-foreground">Đổi mật khẩu (tuỳ chọn)</legend>
        <Input
          label="Mật khẩu hiện tại"
          id="current_password"
          type="password"
          autoComplete="current-password"
          error={errors.current_password?.message}
          {...register('current_password')}
        />
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
      </fieldset>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    </form>
  )
}
