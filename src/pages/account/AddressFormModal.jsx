import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Modal } from '../../components/Modal'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { useCreateAddress, useUpdateAddress } from '../../features/addresses/hooks'
import { useToastStore } from '../../store/toastStore'
import { applyServerErrors } from '../../lib/formErrors'

const schema = yup.object({
  recipient_name: yup.string().required('Vui lòng nhập tên người nhận.').max(100, 'Tối đa 100 ký tự.'),
  phone: yup.string().required('Vui lòng nhập số điện thoại.').max(20, 'Tối đa 20 ký tự.'),
  address_line1: yup.string().required('Vui lòng nhập địa chỉ.').max(255, 'Tối đa 255 ký tự.'),
  address_line2: yup.string().max(255, 'Tối đa 255 ký tự.'),
  city: yup.string().required('Vui lòng nhập thành phố.').max(100, 'Tối đa 100 ký tự.'),
  province: yup.string().required('Vui lòng nhập tỉnh/thành.').max(100, 'Tối đa 100 ký tự.'),
  postal_code: yup.string().max(20, 'Tối đa 20 ký tự.'),
})

const emptyValues = {
  recipient_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  province: '',
  postal_code: '',
}

function toFormValues(address) {
  return {
    recipient_name: address.recipient_name ?? '',
    phone: address.phone ?? '',
    address_line1: address.address_line1 ?? '',
    address_line2: address.address_line2 ?? '',
    city: address.city ?? '',
    province: address.province ?? '',
    postal_code: address.postal_code ?? '',
  }
}

export function AddressFormModal({ open, onOpenChange, address }) {
  const isEditing = !!address
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const addToast = useToastStore((state) => state.addToast)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (open) {
      reset(address ? toFormValues(address) : emptyValues)
    }
  }, [open, address, reset])

  const onSubmit = async (values) => {
    try {
      if (isEditing) {
        await updateAddress.mutateAsync({ id: address.id, ...values })
        addToast({ title: 'Đã cập nhật địa chỉ.', variant: 'success' })
      } else {
        await createAddress.mutateAsync(values)
        addToast({ title: 'Đã thêm địa chỉ mới.', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      if (applyServerErrors(error, setError)) return
      addToast({ title: 'Có lỗi xảy ra.', description: error.message, variant: 'error' })
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={isEditing ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          label="Tên người nhận"
          id="recipient_name"
          error={errors.recipient_name?.message}
          {...register('recipient_name')}
        />
        <Input label="Số điện thoại" id="phone" error={errors.phone?.message} {...register('phone')} />
        <Input
          label="Địa chỉ"
          id="address_line1"
          error={errors.address_line1?.message}
          {...register('address_line1')}
        />
        <Input
          label="Địa chỉ (dòng 2, không bắt buộc)"
          id="address_line2"
          error={errors.address_line2?.message}
          {...register('address_line2')}
        />
        <Input label="Thành phố" id="city" error={errors.city?.message} {...register('city')} />
        <Input label="Tỉnh/Thành" id="province" error={errors.province?.message} {...register('province')} />
        <Input
          label="Mã bưu điện (không bắt buộc)"
          id="postal_code"
          error={errors.postal_code?.message}
          {...register('postal_code')}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
        </Button>
      </form>
    </Modal>
  )
}
