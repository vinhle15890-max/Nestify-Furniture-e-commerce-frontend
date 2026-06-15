import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Modal } from '../../../components/Modal'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { useCategories } from '../../../features/catalog/hooks'
import { useCreateProduct } from '../../../features/admin/products/hooks'
import { useToastStore } from '../../../store/toastStore'
import { applyServerErrors } from '../../../lib/formErrors'

const schema = yup.object({
  name: yup.string().required('Vui lòng nhập tên sản phẩm.').max(255, 'Tối đa 255 ký tự.'),
  slug: yup
    .string()
    .required('Vui lòng nhập slug.')
    .max(255, 'Tối đa 255 ký tự.')
    .matches(/^[a-z0-9_-]+$/i, 'Slug chỉ gồm chữ, số, gạch ngang và gạch dưới.'),
  category_id: yup.string().required('Vui lòng chọn danh mục.'),
  description: yup.string(),
  status: yup.string().oneOf(['active', 'archived']),
})

const emptyValues = {
  name: '',
  slug: '',
  category_id: '',
  description: '',
  status: 'active',
}

// Flatten the category tree into a list of {id, name, depth} for the <select>.
function flattenCategories(tree) {
  const result = []

  function walk(nodes, depth) {
    for (const node of nodes) {
      result.push({ id: node.id, name: node.name, depth })
      if (node.children?.length) walk(node.children, depth + 1)
    }
  }

  walk(tree, 0)
  return result
}

export function ProductFormModal({ open, onOpenChange, onCreated }) {
  const createProduct = useCreateProduct()
  const { data: categoriesData } = useCategories()
  const addToast = useToastStore((state) => state.addToast)

  const categoryOptions = useMemo(() => flattenCategories(categoriesData?.data ?? []), [categoriesData])

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (open) reset(emptyValues)
  }, [open, reset])

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      slug: values.slug,
      category_id: Number(values.category_id),
      description: values.description || null,
      status: values.status,
    }

    try {
      const response = await createProduct.mutateAsync(payload)
      addToast({ title: 'Đã tạo sản phẩm mới.', variant: 'success' })
      onOpenChange(false)
      onCreated?.(response.data)
    } catch (error) {
      if (applyServerErrors(error, setError)) return
      addToast({ title: 'Có lỗi xảy ra.', description: error.message, variant: 'error' })
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Thêm sản phẩm mới">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input label="Tên sản phẩm" id="name" error={errors.name?.message} {...register('name')} />
        <Input label="Slug" id="slug" error={errors.slug?.message} {...register('slug')} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category_id" className="text-sm font-medium text-foreground">
            Danh mục
          </label>
          <select
            id="category_id"
            {...register('category_id')}
            className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Chọn danh mục</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {'— '.repeat(option.depth)}
                {option.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p role="alert" className="text-sm text-destructive">
              {errors.category_id.message}
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground" htmlFor="description">
          Mô tả (không bắt buộc)
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="rounded-control border border-border bg-surface px-3 py-2 text-base font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-foreground">
            Trạng thái
          </label>
          <select
            id="status"
            {...register('status')}
            className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="active">Đang bán</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          Tạo sản phẩm
        </Button>
      </form>
    </Modal>
  )
}
