import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { useCategories } from '../../../features/catalog/hooks'
import {
  useUpdateProduct,
  useUploadMedia,
  useReorderMedia,
  useDeleteMedia,
} from '../../../features/admin/products/hooks'
import { useToastStore } from '../../../store/toastStore'
import { applyServerErrors } from '../../../lib/formErrors'
import { formatPrice } from '../../../lib/format'
import { VariantFormModal } from './VariantFormModal'

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

function findProductInCache(queryClient, productId) {
  const queries = queryClient.getQueryCache().findAll({ queryKey: ['admin', 'products'] })
  for (const query of queries) {
    const found = query.state.data?.data?.find((item) => item.id === productId)
    if (found) return found
  }
  return null
}

export function AdminProductEditPage() {
  const { id } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const productId = Number(id)

  const [product, setProduct] = useState(
    () => location.state?.product ?? findProductInCache(queryClient, productId),
  )

  const { data: categoriesData } = useCategories()
  const categoryOptions = useMemo(() => flattenCategories(categoriesData?.data ?? []), [categoriesData])

  const updateProduct = useUpdateProduct()
  const uploadMedia = useUploadMedia()
  const reorderMedia = useReorderMedia()
  const deleteMedia = useDeleteMedia()
  const addToast = useToastStore((state) => state.addToast)

  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState(null)
  const [mediaType, setMediaType] = useState('image')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: product
      ? {
          name: product.name ?? '',
          slug: product.slug ?? '',
          category_id: product.category?.id != null ? String(product.category.id) : '',
          description: product.description ?? '',
          status: product.status ?? 'active',
        }
      : undefined,
  })

  if (!product) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Không tìm thấy sản phẩm.{' '}
          <Link to="/admin/products" className="text-primary hover:underline">
            Quay lại danh sách sản phẩm
          </Link>
        </p>
      </div>
    )
  }

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      slug: values.slug,
      category_id: Number(values.category_id),
      description: values.description || null,
      status: values.status,
    }

    try {
      const response = await updateProduct.mutateAsync({ id: product.id, ...payload })
      setProduct((current) => ({ ...current, ...response.data }))
      addToast({ title: 'Đã lưu sản phẩm.', variant: 'success' })
    } catch (error) {
      if (applyServerErrors(error, setError)) return
      addToast({ title: 'Không thể lưu sản phẩm.', description: error.message, variant: 'error' })
    }
  }

  const openCreateVariantModal = () => {
    setEditingVariant(null)
    setVariantModalOpen(true)
  }

  const openEditVariantModal = (variant) => {
    setEditingVariant(variant)
    setVariantModalOpen(true)
  }

  const handleVariantSaved = (variant) => {
    setProduct((current) => {
      const variants = current.variants ?? []
      const index = variants.findIndex((item) => item.id === variant.id)
      if (index === -1) {
        return { ...current, variants: [...variants, variant] }
      }
      const next = [...variants]
      next[index] = variant
      return { ...current, variants: next }
    })
  }

  const handleUploadMedia = async (event) => {
    event.preventDefault()
    const form = event.target
    const file = form.elements.file.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('type', form.elements.type.value)
    formData.append('file', file)

    try {
      const response = await uploadMedia.mutateAsync({ productId: product.id, formData })
      setProduct((current) => ({ ...current, media: [...(current.media ?? []), response.data] }))
      addToast({ title: 'Đã tải lên tệp.', variant: 'success' })
      event.target.reset()
      setMediaType('image')
    } catch (error) {
      addToast({ title: 'Không thể tải lên tệp.', description: error.message, variant: 'error' })
    }
  }

  const handleDeleteMedia = async (media) => {
    try {
      await deleteMedia.mutateAsync({ productId: product.id, mediaId: media.id })
      setProduct((current) => ({ ...current, media: (current.media ?? []).filter((item) => item.id !== media.id) }))
      addToast({ title: 'Đã xóa tệp.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể xóa tệp.', description: error.message, variant: 'error' })
    }
  }

  const handleMoveMedia = async (index, direction) => {
    const sorted = [...(product.media ?? [])].sort((a, b) => a.sort_order - b.sort_order)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= sorted.length) return

    const reordered = [...sorted]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    const ids = reordered.map((item) => item.id)

    try {
      const response = await reorderMedia.mutateAsync({ productId: product.id, ids })
      setProduct((current) => ({ ...current, media: response.data }))
    } catch (error) {
      addToast({ title: 'Không thể sắp xếp lại tệp.', description: error.message, variant: 'error' })
    }
  }

  const sortedMedia = [...(product.media ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl text-foreground">{product.name}</h2>

        <Card className="mt-4">
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
              Mô tả
              <textarea
                id="description"
                {...register('description')}
                rows={4}
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

            <div>
              <Button type="submit" disabled={isSubmitting}>
                Lưu sản phẩm
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-xl text-foreground">Phiên bản</h3>
          <Button onClick={openCreateVariantModal}>Thêm phiên bản</Button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-surface shadow-soft">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Giá</th>
                <th className="px-4 py-3">Tồn kho</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(product.variants ?? []).map((variant) => (
                <tr key={variant.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 text-foreground">{variant.sku}</td>
                  <td className="px-4 py-3 text-foreground">{variant.name}</td>
                  <td className="px-4 py-3 text-foreground">{formatPrice(variant.price)}</td>
                  <td className="px-4 py-3 text-foreground">{variant.available_stock}</td>
                  <td className="px-4 py-3 text-foreground">{variant.is_active ? 'Hoạt động' : 'Tạm ngưng'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="cursor-pointer text-primary hover:text-primary-hover"
                      onClick={() => openEditVariantModal(variant)}
                    >
                      Sửa phiên bản
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-display text-xl text-foreground">Hình ảnh / Video</h3>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {sortedMedia.map((media, index) => (
            <div key={media.id} className="flex flex-col gap-2 rounded-card border border-border p-2">
              <div className="aspect-square overflow-hidden rounded-control bg-background">
                {media.type === 'video' ? (
                  <video src={media.url} className="h-full w-full object-cover" />
                ) : (
                  <img src={media.url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {media.type === 'video' ? 'Video' : 'Ảnh'} · Thứ tự {media.sort_order}
              </p>
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Lên"
                    disabled={index === 0}
                    onClick={() => handleMoveMedia(index, -1)}
                    className="cursor-pointer text-foreground hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Lên
                  </button>
                  <button
                    type="button"
                    aria-label="Xuống"
                    disabled={index === sortedMedia.length - 1}
                    onClick={() => handleMoveMedia(index, 1)}
                    className="cursor-pointer text-foreground hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Xuống
                  </button>
                </div>
                <button
                  type="button"
                  className="cursor-pointer text-destructive hover:opacity-80"
                  onClick={() => handleDeleteMedia(media)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleUploadMedia} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="media-type" className="text-sm font-medium text-foreground">
              Loại tệp
            </label>
            <select
              id="media-type"
              name="type"
              value={mediaType}
              onChange={(event) => setMediaType(event.target.value)}
              className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="image">Ảnh</option>
              <option value="video">Video</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="media-file" className="text-sm font-medium text-foreground">
              Tệp
            </label>
            <input
              id="media-file"
              name="file"
              type="file"
              accept={mediaType === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp'}
              className="text-sm text-foreground"
            />
          </div>

          <Button type="submit" disabled={uploadMedia.isPending}>
            Tải lên
          </Button>
        </form>
      </div>

      <VariantFormModal
        open={variantModalOpen}
        onOpenChange={setVariantModalOpen}
        productId={product.id}
        variant={editingVariant}
        onSaved={handleVariantSaved}
      />
    </div>
  )
}
