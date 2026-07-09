import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { X } from 'lucide-react'
import { Modal } from '../../../components/Modal'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { useCreateCategory, useUpdateCategory } from '../../../features/admin/categories/hooks'
import { MediaLibraryModal } from '../../../features/admin/media/MediaLibraryModal'
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
})

const emptyValues = {
  name: '',
  slug: '',
  parent_id: '',
}

function toFormValues(category) {
  return {
    name: category.name ?? '',
    slug: category.slug ?? '',
    parent_id: category.parent_id != null ? String(category.parent_id) : '',
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

  // The image lives outside react-hook-form: it is set by picking an asset from the
  // media library, not by typing. We keep the public URL (for preview) and the asset
  // id (submitted as media_asset_id).
  const [image, setImage] = useState({ url: '', media_asset_id: null })
  const [pickerOpen, setPickerOpen] = useState(false)

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
      setImage({ url: category?.image_url ?? '', media_asset_id: category?.media_asset_id ?? null })
    }
  }, [open, category, reset])

  const handlePickImage = (assets) => {
    const asset = assets[0]
    if (asset) setImage({ url: asset.url, media_asset_id: asset.id })
  }

  const handleRemoveImage = () => setImage({ url: '', media_asset_id: null })

  const onSubmit = async (values) => {
    const base = {
      name: values.name,
      slug: values.slug,
      parent_id: values.parent_id ? Number(values.parent_id) : null,
    }

    let imageFields
    if (image.media_asset_id) {
      imageFields = { media_asset_id: image.media_asset_id } // library asset (shadows any legacy image via the resource)
    } else if (!image.url) {
      imageFields = { media_asset_id: null, image_url: null, image_public_id: null } // explicitly cleared
    } else {
      imageFields = {} // legacy image untouched — send nothing about the image
    }

    const payload = { ...base, ...imageFields }

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

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Ảnh đại diện (không bắt buộc)</span>

          {image.url ? (
            <div className="flex items-center gap-4">
              <img
                src={image.url}
                alt="Ảnh đại diện danh mục"
                className="h-20 w-20 rounded-card border border-border object-cover"
              />
              <div className="flex flex-col gap-2">
                <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                  Đổi ảnh
                </Button>
                <Button type="button" variant="ghost" onClick={handleRemoveImage}>
                  <X size={16} />
                  Gỡ ảnh
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1.5">
              <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                Chọn ảnh từ thư viện
              </Button>
              <p className="text-xs text-muted-foreground">Chọn ảnh có sẵn hoặc tải ảnh mới trong thư viện.</p>
            </div>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? 'Lưu thay đổi' : 'Thêm danh mục'}
        </Button>
      </form>

      <MediaLibraryModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiple={false}
        attachedAssetIds={[]}
        onSelect={handlePickImage}
      />
    </Modal>
  )
}
