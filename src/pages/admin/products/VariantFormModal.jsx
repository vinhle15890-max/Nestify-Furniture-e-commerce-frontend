import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Modal } from '../../../components/Modal'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { useCreateVariant, useUpdateVariant } from '../../../features/admin/products/hooks'
import { useToastStore } from '../../../store/toastStore'
import { applyServerErrors } from '../../../lib/formErrors'
import { variantSignature } from '../../../lib/variantOptions'

const priceStockShape = {
  price: yup.number().typeError('Giá phải là số.').required('Vui lòng nhập giá.').min(0, 'Giá phải lớn hơn hoặc bằng 0.'),
  stock_quantity: yup
    .number()
    .typeError('Số lượng phải là số.')
    .required('Vui lòng nhập số lượng kho.')
    .min(0, 'Số lượng phải lớn hơn hoặc bằng 0.'),
  model_3d_url: yup.string().url('URL không hợp lệ.'),
}
const nameShape = { name: yup.string().required('Vui lòng nhập tên biến thể.').max(255, 'Tối đa 255 ký tự.') }
const skuShape = { sku: yup.string().max(100, 'Tối đa 100 ký tự.') }

// Sản phẩm CÓ thuộc tính → tên biến thể được suy ra từ tổ hợp, không nhập tay.
// Sản phẩm KHÔNG thuộc tính → biến thể tự do, bắt buộc nhập tên.
const schemas = {
  createSimple: yup.object({ ...skuShape, ...nameShape, ...priceStockShape }),
  createOption: yup.object({ ...skuShape, ...priceStockShape }),
  updateSimple: yup.object({ ...nameShape, ...priceStockShape, is_active: yup.boolean() }),
  updateOption: yup.object({ ...priceStockShape, is_active: yup.boolean() }),
}

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

// Tên biến thể suy ra = nối label theo thứ tự option, ngăn bằng " / " (khớp BE).
function deriveName(attrs, options) {
  return options
    .map((o) => attrs[o.name])
    .filter((label) => label !== undefined && label !== '')
    .join(' / ')
}

export function VariantFormModal({ open, onOpenChange, productId, variant, onSaved, options = [], variants = [] }) {
  const isEditing = !!variant
  const hasOptions = (options ?? []).length > 0
  const createVariant = useCreateVariant()
  const updateVariant = useUpdateVariant()
  const addToast = useToastStore((state) => state.addToast)

  // Tổ hợp thuộc tính đang chọn (chỉ dùng khi hasOptions).
  const [selectedAttrs, setSelectedAttrs] = useState({})
  const [attrError, setAttrError] = useState(null)

  const schemaKey = `${isEditing ? 'update' : 'create'}${hasOptions ? 'Option' : 'Simple'}`

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schemas[schemaKey]), defaultValues: emptyValues })

  useEffect(() => {
    if (open) {
      reset(variant ? toFormValues(variant) : emptyValues)
      setSelectedAttrs(variant?.attributes ?? {})
      setAttrError(null)
    }
  }, [open, variant, reset])

  // Chữ ký tổ hợp đã tồn tại (loại chính biến thể đang sửa) → chặn trùng.
  const takenSignatures = useMemo(() => {
    if (!hasOptions) return new Set()
    return new Set(
      (variants ?? [])
        .filter((v) => v.id !== variant?.id)
        .map((v) => variantSignature(v.attributes ?? {}, options)),
    )
  }, [hasOptions, variants, variant, options])

  const derivedName = hasOptions ? deriveName(selectedAttrs, options) : ''

  const validateAttributes = () => {
    for (const option of options) {
      if (!selectedAttrs[option.name]) {
        setAttrError(`Vui lòng chọn giá trị cho thuộc tính "${option.name}".`)
        return false
      }
    }
    if (takenSignatures.has(variantSignature(selectedAttrs, options))) {
      setAttrError('Tổ hợp thuộc tính này đã có biến thể.')
      return false
    }
    setAttrError(null)
    return true
  }

  const onSubmit = async (values) => {
    if (hasOptions && !validateAttributes()) return

    try {
      if (isEditing) {
        const payload = {
          id: variant.id,
          price: Number(values.price),
          stock_quantity: Number(values.stock_quantity),
          model_3d_url: values.model_3d_url || null,
          is_active: values.is_active,
        }
        // Có thuộc tính → gửi attributes (BE tự suy tên + options_key). Không thì gửi tên tự do.
        if (hasOptions) payload.attributes = selectedAttrs
        else payload.name = values.name

        const response = await updateVariant.mutateAsync(payload)
        addToast({ title: 'Đã cập nhật biến thể.', variant: 'success' })
        onSaved?.(response.data)
      } else {
        const payload = {
          productId,
          sku: values.sku?.trim() || undefined,
          price: Number(values.price),
          stock_quantity: Number(values.stock_quantity),
          model_3d_url: values.model_3d_url || undefined,
        }
        if (hasOptions) payload.attributes = selectedAttrs
        else payload.name = values.name

        const response = await createVariant.mutateAsync(payload)
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

        {hasOptions ? (
          <div className="flex flex-col gap-3">
            {options.map((option) => (
              <div key={option.name} className="flex flex-col gap-1.5">
                <label
                  htmlFor={`variant-attr-${option.name}`}
                  className="text-sm font-medium text-foreground"
                >
                  {option.name}
                </label>
                <select
                  id={`variant-attr-${option.name}`}
                  aria-label={option.name}
                  value={selectedAttrs[option.name] ?? ''}
                  onChange={(event) => {
                    setSelectedAttrs((current) => ({ ...current, [option.name]: event.target.value }))
                    setAttrError(null)
                  }}
                  className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Chọn —</option>
                  {option.values.map((v) => (
                    <option key={v.label} value={v.label}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Tên biến thể:{' '}
              <span className="font-medium text-foreground">{derivedName || '—'}</span>
            </p>
            {attrError && <p className="text-sm text-destructive">{attrError}</p>}
          </div>
        ) : (
          <Input label="Tên biến thể" id="variant-name" error={errors.name?.message} {...register('name')} />
        )}

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
