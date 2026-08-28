import { useEffect, useRef, useState } from 'react'
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

// Random, easy-to-read voucher code (no ambiguous 0/O/1/I) so admins don't have
// to invent one. Uses the Web Crypto CSPRNG so codes aren't predictable (a
// guessable code = discount abuse); uniqueness is still enforced server-side on
// submit. The alphabet has 32 chars and 2^32 is divisible by 32, so `% length`
// introduces no modulo bias.
function generateVoucherCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buffer = new Uint32Array(5)
  crypto.getRandomValues(buffer)
  let code = 'NES'
  for (const value of buffer) {
    code += alphabet[value % alphabet.length]
  }
  return code
}

const schema = yup.object({
  code: yup.string().required('Vui lòng nhập mã voucher.').max(50, 'Tối đa 50 ký tự.'),
  type: yup.string().required('Vui lòng chọn loại voucher.').oneOf(['fixed', 'percentage']),
  value: yup
    .number()
    .transform(optionalNumber)
    .typeError('Giá trị phải là số.')
    .required('Vui lòng nhập giá trị.')
    .min(0, 'Giá trị phải lớn hơn hoặc bằng 0.')
    .when('type', {
      is: 'percentage',
      then: (field) => field.max(100, 'Voucher phần trăm không được vượt quá 100%.'),
      otherwise: (field) => field.max(9999999999.99, 'Giá trị voucher vượt quá giới hạn cho phép.'),
    }),
  max_discount: yup
    .number()
    .transform(optionalNumber)
    .typeError('Giảm tối đa phải là số.')
    .min(0, 'Giá trị phải lớn hơn hoặc bằng 0.')
    .max(9999999999.99, 'Giảm tối đa vượt quá giới hạn cho phép.')
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
  is_public: yup.boolean(), claim_required: yup.boolean(), stack_with_sale: yup.boolean(),
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
  is_public: false, claim_required: false, stack_with_sale: false,
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
    is_public: voucher.is_public ?? false,
    claim_required: voucher.claim_required ?? false,
    stack_with_sale: voucher.stack_with_sale ?? false,
  }
}

export function VoucherFormModal({ open, onOpenChange, voucher }) {
  const isEditing = !!voucher
  const createVoucher = useCreateVoucher()
  const updateVoucher = useUpdateVoucher()
  const addToast = useToastStore((state) => state.addToast)
  const [submitError, setSubmitError] = useState(null)
  const submitErrorRef = useRef(null)

  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: emptyValues })

  const type = useWatch({ control, name: 'type' })

  useEffect(() => {
    if (open) {
      reset(voucher ? toFormValues(voucher) : emptyValues)
      setSubmitError(null)
    }
  }, [open, voucher, reset])

  useEffect(() => {
    if (submitError) submitErrorRef.current?.focus()
  }, [submitError])

  const onSubmit = async (values) => {
    setSubmitError(null)
    const payload = {
      code: values.code,
      type: values.type,
      value: Number(values.value),
      max_discount: values.type === 'percentage' && values.max_discount !== '' ? Number(values.max_discount) : null,
      // 0 = "no minimum" (the column default). A blank field is transformed to undefined by
      // yup, so Number(...) → NaN → serialized as null; null hits a NOT NULL column → 500.
      // Coerce any non-finite value to 0.
      min_order_value: Number.isFinite(Number(values.min_order_value)) ? Number(values.min_order_value) : 0,
      max_usage_total: Number(values.max_usage_total),
      max_usage_per_user: Number(values.max_usage_per_user),
      starts_at: values.starts_at || null,
      expires_at: values.expires_at || null,
      status: values.status,
      is_public: Boolean(values.is_public),
      claim_required: Boolean(values.claim_required),
      stack_with_sale: Boolean(values.stack_with_sale),
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
      if (applyServerErrors(error, setError)) {
        const fields = error.details.fields
        const registeredFields = new Set([
          'code', 'type', 'value', 'max_discount', 'min_order_value',
          'max_usage_total', 'max_usage_per_user', 'starts_at', 'expires_at', 'status',
        ])
        const firstField = Object.keys(fields).find((field) => registeredFields.has(field))
        if (firstField) {
          setFocus(firstField)
        } else {
          const firstMessage = Object.values(fields).flat()[0]
          setSubmitError(firstMessage ?? 'Dữ liệu voucher chưa hợp lệ. Vui lòng kiểm tra lại.')
        }
        return
      }
      setSubmitError(
        error?.code === 'NETWORK_ERROR'
          ? 'Chưa thể lưu voucher. Vui lòng kiểm tra kết nối và thử lại.'
          : error?.message ?? 'Chưa thể lưu voucher. Vui lòng thử lại.',
      )
    }
  }

  const pending = isSubmitting || createVoucher.isPending || updateVoucher.isPending

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return
        onOpenChange(next)
      }}
      title={isEditing ? 'Sửa voucher' : 'Thêm voucher mới'}
      description={isEditing ? `Cập nhật điều kiện và thời hạn của voucher ${voucher.code}.` : 'Thiết lập mã, giá trị và điều kiện sử dụng voucher mới.'}
      contentClassName="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden"
      bodyClassName="min-h-0 overflow-y-auto pr-1"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="Mã voucher" id="code" error={errors.code?.message} {...register('code')} />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setValue('code', generateVoucherCode(), { shouldValidate: true })}
          >
            Tạo mã
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="text-sm font-medium text-foreground">
            Loại
          </label>
          <select
            id="type"
            {...register('type')}
            aria-invalid={errors.type ? 'true' : undefined}
            aria-describedby={errors.type ? 'type-error' : undefined}
            className={`rounded-control border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors.type ? 'border-destructive' : 'border-border'}`}
          >
            <option value="fixed">Số tiền cố định</option>
            <option value="percentage">Phần trăm</option>
          </select>
          {errors.type && <p id="type-error" role="alert" className="text-sm text-destructive">{errors.type.message}</p>}
        </div>

        <Input label="Giá trị" id="value" type="number" max={type === 'percentage' ? 100 : 9999999999.99} error={errors.value?.message} {...register('value')} />

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

        <fieldset className="space-y-3 rounded-control border border-border p-4">
          <legend className="px-1 text-sm font-medium text-foreground">Phân phối và kết hợp</legend>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" {...register('is_public')} /><span><strong className="block font-medium">Hiển thị tại trang Ưu đãi</strong><span className="text-muted-foreground">Khách có thể tìm voucher tại mục Ưu đãi trên menu và đường dẫn /vouchers.</span></span></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" {...register('claim_required')} /><span><strong className="block font-medium">Phải lưu vào ví trước khi dùng</strong><span className="text-muted-foreground">Không chấp nhận chỉ nhập mã khi chưa nhận.</span></span></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" {...register('stack_with_sale')} /><span><strong className="block font-medium">Cho phép dùng cùng giá sale</strong><span className="text-muted-foreground">Nếu tắt, giỏ có sản phẩm sale sẽ không áp dụng mã này.</span></span></label>
        </fieldset>

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
            aria-invalid={errors.status ? 'true' : undefined}
            aria-describedby={errors.status ? 'status-error' : undefined}
            className={`rounded-control border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors.status ? 'border-destructive' : 'border-border'}`}
          >
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
          {errors.status && <p id="status-error" role="alert" className="text-sm text-destructive">{errors.status.message}</p>}
        </div>

        {submitError && (
          <p ref={submitErrorRef} tabIndex={-1} role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Thêm voucher mới'}
        </Button>
      </form>
    </Modal>
  )
}
