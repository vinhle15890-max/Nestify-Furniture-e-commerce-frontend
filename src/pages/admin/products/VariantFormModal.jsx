import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Modal } from '../../../components/Modal'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { useCreateVariant, useUpdateVariant } from '../../../features/admin/products/hooks'
import { useToastStore } from '../../../store/toastStore'
import { applyServerErrors } from '../../../lib/formErrors'

const createSchema = yup.object({
  sku: yup.string().max(100, 'Tối đa 100 ký tự.'),
  name: yup.string().required('Vui lòng nhập tên biến thể.').max(255, 'Tối đa 255 ký tự.'),
  price: yup.number().typeError('Giá phải là số.').required('Vui lòng nhập giá.').min(0, 'Giá phải lớn hơn hoặc bằng 0.'),
  stock_quantity: yup
    .number()
    .typeError('Số lượng phải là số.')
    .required('Vui lòng nhập số lượng kho.')
    .min(0, 'Số lượng phải lớn hơn hoặc bằng 0.'),
  model_3d_url: yup.string().url('URL không hợp lệ.'),
})

const updateSchema = createSchema.omit(['sku']).concat(
  yup.object({ is_active: yup.boolean() }),
)

const emptyValues = {
  sku: '',
  name: '',
  price: '',
  stock_quantity: '',
  model_3d_url: '',
  is_active: true,
}

function toFormValues(variant) {
  return {
    sku: variant.sku ?? '',
    name: variant.name ?? '',
    price: variant.price ?? '',
    stock_quantity: variant.available_stock ?? '',
    model_3d_url: variant.model_3d_url ?? '',
    is_active: variant.is_active ?? true,
  }
}

export function VariantFormModal({ open, onOpenChange, productId, variant, onSaved }) {
  const isEditing = !!variant
  const createVariant = useCreateVariant()
  const updateVariant = useUpdateVariant()
  const addToast = useToastStore((state) => state.addToast)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(isEditing ? updateSchema : createSchema), defaultValues: emptyValues })

  useEffect(() => {
    if (open) {
      reset(variant ? toFormValues(variant) : emptyValues)
    }
  }, [open, variant, reset])

  const onSubmit = async (values) => {
    try {
      if (isEditing) {
        const response = await updateVariant.mutateAsync({
          id: variant.id,
          name: values.name,
          price: Number(values.price),
          stock_quantity: Number(values.stock_quantity),
          model_3d_url: values.model_3d_url || null,
          is_active: values.is_active,
        })
        addToast({ title: 'Đã cập nhật biến thể.', variant: 'success' })
        onSaved?.(response.data)
      } else {
        const response = await createVariant.mutateAsync({
          productId,
          sku: values.sku?.trim() || undefined,
          name: values.name,
          price: Number(values.price),
          stock_quantity: Number(values.stock_quantity),
          model_3d_url: values.model_3d_url || undefined,
        })
        addToast({ title: 'Đã thêm biến thể mới.', variant: 'success' })
        onSaved?.(response.data)
      }
      onOpenChange(false)
    } catch (error) {
      if (applyServerErrors(error, setError)) return
      addToast({ title: 'Có lỗi xảy ra.', description: error.message, variant: 'error' })
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={isEditing ? 'Sửa biến thể' : 'Thêm biến thể mới'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {!isEditing && (
          <div className="flex flex-col gap-1">
            <Input
              label="SKU"
              id="variant-sku"
              placeholder="Để trống để tự tạo"
              error={errors.sku?.message}
              {...register('sku')}
            />
            <p className="text-xs text-muted-foreground">Bỏ trống để hệ thống tự sinh mã từ tên sản phẩm.</p>
          </div>
        )}
        <Input label="Tên biến thể" id="variant-name" error={errors.name?.message} {...register('name')} />
        <Input label="Giá" id="variant-price" type="number" error={errors.price?.message} {...register('price')} />
        <Input
          label="Số lượng kho"
          id="variant-stock_quantity"
          type="number"
          error={errors.stock_quantity?.message}
          {...register('stock_quantity')}
        />
        <Input
          label="URL mô hình 3D (không bắt buộc)"
          id="variant-model_3d_url"
          error={errors.model_3d_url?.message}
          {...register('model_3d_url')}
        />

        {isEditing && (
          <label className="flex items-center gap-2 text-sm font-medium text-foreground" htmlFor="variant-is_active">
            <input id="variant-is_active" type="checkbox" {...register('is_active')} />
            Đang hoạt động
          </label>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? 'Lưu thay đổi' : 'Thêm biến thể'}
        </Button>
      </form>
    </Modal>
  )
}
