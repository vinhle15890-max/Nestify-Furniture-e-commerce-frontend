import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Modal } from '../../../components/Modal'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { useCreateVoucher, useUpdateVoucher } from '../../../features/admin/vouchers/hooks'
import { useToastStore } from '../../../store/toastStore'
import { applyServerErrors } from '../../../lib/formErrors'

// Treat an empty string as "no value" so optional numeric fields can be cleared.
const optionalNumber = (value, originalValue) => (originalValue === '' ? undefined : value)

const schema = yup.object({
  code: yup.string().required('Vui lòng nhập mã voucher.').max(50, 'Tối đa 50 ký tự.'),
  type: yup.string().required('Vui lòng chọn loại voucher.').oneOf(['fixed', 'percentage']),
  value: yup
    .number()
    .transform(optionalNumber)
    .typeError('Giá trị phải là số.')
    .required('Vui lòng nhập giá trị.')
    .min(0, 'Giá trị phải lớn hơn hoặc bằng 0.'),
  max_discount: yup
    .number()
    .transform(optionalNumber)
    .typeError('Giảm tối đa phải là số.')
    .min(0, 'Giá trị phải lớn hơn hoặc bằng 0.')
    .nullable(),
  min_order_value: yup
    .number()
    .transform(optionalNumber)
    .typeError('Giá trị phải là số.')
    .min(0, 'Giá trị phải lớn hơn hoặc bằng 0.')
    .nullable(),
  max_usage_total: yup
    .number()
    .transform(optionalNumber)
    .typeError('Phải là số.')
    .required('Vui lòng nhập số lượt sử dụng tối đa.')
    .integer('Phải là số nguyên.')
    .min(1, 'Tối thiểu 1.'),
  max_usage_per_user: yup
    .number()
    .transform(optionalNumber)
    .typeError('Phải là số.')
    .required('Vui lòng nhập số lượt sử dụng mỗi người.')
    .integer('Phải là số nguyên.')
    .min(1, 'Tối thiểu 1.'),
  starts_at: yup.string(),
  expires_at: yup.string().test(
    'after-starts',
    'Ngày hết hạn phải sau hoặc bằng ngày bắt đầu.',
    function (value) {
      const { starts_at } = this.parent
      if (!value || !starts_at) return true
      return new Date(value) >= new Date(starts_at)
    },
  ),
  status: yup.string().oneOf(['active', 'inactive']),
})

const emptyValues = {
  code: '',
  type: 'fixed',
  value: '',
  max_discount: '',
  min_order_value: '',
  max_usage_total: '',
  max_usage_per_user: '',
  starts_at: '',
  expires_at: '',
  status: 'active',
}

function toDateInput(value) {
  return value ? value.slice(0, 10) : ''
}

function toFormValues(voucher) {
  return {
    code: voucher.code ?? '',
    type: voucher.type ?? 'fixed',
    value: voucher.value ?? '',
    max_discount: voucher.max_discount ?? '',
    min_order_value: voucher.min_order_value ?? '',
    max_usage_total: voucher.max_usage_total ?? '',
    max_usage_per_user: voucher.max_usage_per_user ?? '',
    starts_at: toDateInput(voucher.starts_at),
    expires_at: toDateInput(voucher.expires_at),
    status: voucher.status ?? 'active',
  }
}

export function VoucherFormModal({ open, onOpenChange, voucher }) {
  const isEditing = !!voucher
  const createVoucher = useCreateVoucher()
  const updateVoucher = useUpdateVoucher()
  const addToast = useToastStore((state) => state.addToast)

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: emptyValues })

  const type = useWatch({ control, name: 'type' })

  useEffect(() => {
    if (open) {
      reset(voucher ? toFormValues(voucher) : emptyValues)
    }
  }, [open, voucher, reset])

  const onSubmit = async (values) => {
    const payload = {
      code: values.code,
      type: values.type,
      value: Number(values.value),
      max_discount: values.type === 'percentage' && values.max_discount !== '' ? Number(values.max_discount) : null,
      min_order_value: values.min_order_value !== '' ? Number(values.min_order_value) : null,
      max_usage_total: Number(values.max_usage_total),
      max_usage_per_user: Number(values.max_usage_per_user),
      starts_at: values.starts_at || null,
      expires_at: values.expires_at || null,
      status: values.status,
    }

    try {
      if (isEditing) {
        await updateVoucher.mutateAsync({ id: voucher.id, ...payload })
        addToast({ title: 'Đã cập nhật voucher.', variant: 'success' })
      } else {
        await createVoucher.mutateAsync(payload)
        addToast({ title: 'Đã thêm voucher mới.', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      if (applyServerErrors(error, setError)) return
      addToast({ title: 'Có lỗi xảy ra.', description: error.message, variant: 'error' })
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={isEditing ? 'Sửa voucher' : 'Thêm voucher mới'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input label="Mã voucher" id="code" error={errors.code?.message} {...register('code')} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="text-sm font-medium text-foreground">
            Loại
          </label>
          <select
            id="type"
            {...register('type')}
            className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="fixed">Số tiền cố định</option>
            <option value="percentage">Phần trăm</option>
          </select>
        </div>

        <Input label="Giá trị" id="value" type="number" error={errors.value?.message} {...register('value')} />

        {type === 'percentage' && (
          <Input
            label="Giảm tối đa (không bắt buộc)"
            id="max_discount"
            type="number"
            error={errors.max_discount?.message}
            {...register('max_discount')}
          />
        )}

        <Input
          label="Giá trị đơn hàng tối thiểu (không bắt buộc)"
          id="min_order_value"
          type="number"
          error={errors.min_order_value?.message}
          {...register('min_order_value')}
        />

        <Input
          label="Lượt sử dụng tối đa"
          id="max_usage_total"
          type="number"
          error={errors.max_usage_total?.message}
          {...register('max_usage_total')}
        />

        <Input
          label="Lượt sử dụng / người"
          id="max_usage_per_user"
          type="number"
          error={errors.max_usage_per_user?.message}
          {...register('max_usage_per_user')}
        />

        <Input
          label="Ngày bắt đầu (không bắt buộc)"
          id="starts_at"
          type="date"
          error={errors.starts_at?.message}
          {...register('starts_at')}
        />

        <Input
          label="Ngày hết hạn (không bắt buộc)"
          id="expires_at"
          type="date"
          error={errors.expires_at?.message}
          {...register('expires_at')}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-foreground">
            Trạng thái
          </label>
          <select
            id="status"
            {...register('status')}
            className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? 'Lưu thay đổi' : 'Thêm voucher mới'}
        </Button>
      </form>
    </Modal>
  )
}
