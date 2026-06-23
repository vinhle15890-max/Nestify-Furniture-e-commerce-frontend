import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Modal } from '../../../components/Modal'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { useCreateCategory, useUpdateCategory } from '../../../features/admin/categories/hooks'
import { useToastStore } from '../../../store/toastStore'
import { applyServerErrors } from '../../../lib/formErrors'

const schema = yup.object({
  name: yup.string().required('Vui lòng nhập tên danh mục.').max(255, 'Tối đa 255 ký tự.'),
  slug: yup
    .string()
    .required('Vui lòng nhập slug.')
    .max(255, 'Tối đa 255 ký tự.')
    .matches(/^[a-z0-9_-]+$/i, 'Slug chỉ gồm chữ, số, gạch ngang và gạch dưới.'),
  parent_id: yup.string(),
  image_url: yup.string().url('URL không hợp lệ.').max(2048, 'Tối đa 2048 ký tự.'),
})

const emptyValues = {
  name: '',
  slug: '',
  parent_id: '',
  image_url: '',
}

function toFormValues(category) {
  return {
    name: category.name ?? '',
    slug: category.slug ?? '',
    parent_id: category.parent_id != null ? String(category.parent_id) : '',
    image_url: category.image_url ?? '',
  }
}

// Flatten the category tree into a list of {id, name, depth}, excluding a category and its descendants.
function flattenCategories(tree, excludeId) {
  const result = []

  function walk(nodes, depth) {
    for (const node of nodes) {
      if (node.id === excludeId) continue
      result.push({ id: node.id, name: node.name, depth })
      if (node.children?.length) walk(node.children, depth + 1)
    }
  }

  walk(tree, 0)
  return result
}

export function CategoryFormModal({ open, onOpenChange, category, categoryTree }) {
  const isEditing = !!category
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const addToast = useToastStore((state) => state.addToast)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema), defaultValues: emptyValues })

  const parentOptions = useMemo(
    () => flattenCategories(categoryTree ?? [], category?.id),
    [categoryTree, category],
  )

  useEffect(() => {
    if (open) {
      reset(category ? toFormValues(category) : emptyValues)
    }
  }, [open, category, reset])

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      slug: values.slug,
      parent_id: values.parent_id ? Number(values.parent_id) : null,
      image_url: values.image_url || null,
    }

    try {
      if (isEditing) {
        await updateCategory.mutateAsync({ id: category.id, ...payload })
        addToast({ title: 'Đã cập nhật danh mục.', variant: 'success' })
      } else {
        await createCategory.mutateAsync(payload)
        addToast({ title: 'Đã thêm danh mục mới.', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      if (applyServerErrors(error, setError)) return
      addToast({ title: 'Có lỗi xảy ra.', description: error.message, variant: 'error' })
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={isEditing ? 'Sửa danh mục' : 'Thêm danh mục mới'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input label="Tên danh mục" id="name" error={errors.name?.message} {...register('name')} />
        <Input label="Slug" id="slug" error={errors.slug?.message} {...register('slug')} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="parent_id" className="text-sm font-medium text-foreground">
            Danh mục cha (không bắt buộc)
          </label>
          <select
            id="parent_id"
            {...register('parent_id')}
            className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Không có</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {'— '.repeat(option.depth)}
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Ảnh đại diện (URL, không bắt buộc)"
          id="image_url"
          error={errors.image_url?.message}
          {...register('image_url')}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? 'Lưu thay đổi' : 'Thêm danh mục'}
        </Button>
      </form>
    </Modal>
  )
}
