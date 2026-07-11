import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Layers, Pencil, Plus, ImagePlus } from 'lucide-react'
import { BackLink } from '../../../components/BackLink'
import { Button } from '../../../components/Button'
import { Badge } from '../../../components/Badge'
import { Input } from '../../../components/Input'
import { Pagination } from '../../../components/Pagination'
import { Panel } from '../../../components/admin/Panel'
import { EmptyState } from '../../../components/admin/EmptyState'
import { Tabs, TabList, Tab, TabPanel } from '../../../components/admin/Tabs'
import { useCategories } from '../../../features/catalog/hooks'
import {
  useAdminProduct,
  useUpdateProduct,
  useReorderMedia,
  useDeleteMedia,
  useUpdateMedia,
  useAttachMedia,
  useGenerateDescription,
} from '../../../features/admin/products/hooks'
import { MediaLibraryModal } from '../../../features/admin/media/MediaLibraryModal'
import { useToastStore } from '../../../store/toastStore'
import { applyServerErrors } from '../../../lib/formErrors'
import { formatPrice } from '../../../lib/format'
import { VariantFormModal } from './VariantFormModal'
import { VariantOptionsPanel } from './VariantOptionsPanel'
import { VariantMatrixGenerator } from './VariantMatrixGenerator'
import { DescriptionSeoFields } from './DescriptionSeoFields'
import { productSchema, flattenCategories, toProductPayload } from './productForm'

const STATUS_LABELS = {
  active: { label: 'Đang bán', tone: 'in-stock' },
  archived: { label: 'Đã lưu trữ', tone: 'neutral' },
}

// How many variants to show per page in the variants table.
const VARIANTS_PER_PAGE = 8

// Which tab each react-hook-form field lives on, so a failed submit can jump to
// the first tab that has an error (its panel is hidden while another tab is active).
const FIELD_TAB = {
  name: 'thong-tin',
  slug: 'thong-tin',
  category_id: 'thong-tin',
  status: 'thong-tin',
  description: 'mo-ta-seo',
  meta_title: 'mo-ta-seo',
  meta_description: 'mo-ta-seo',
  focus_keyword: 'mo-ta-seo',
}
const TAB_ORDER = ['thong-tin', 'bien-the', 'mo-ta-seo', 'hinh-anh']

function findProductInCache(queryClient, productId) {
  const queries = queryClient.getQueryCache().findAll({ queryKey: ['admin', 'products'] })
  for (const query of queries) {
    const found = query.state.data?.data?.find((item) => item.id === productId)
    if (found) return found
  }
  return null
}

// Resolves the product to edit, then renders the editor. Navigating from the
// list passes it via router state (fast path); a deep-link / refresh has no
// state, so we fetch it from the API instead of showing an empty form.
export function AdminProductEditPage() {
  const { id } = useParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  const productId = Number(id)

  const seeded = location.state?.product ?? findProductInCache(queryClient, productId)
  const query = useAdminProduct(productId, { enabled: !seeded })
  const product = seeded ?? query.data?.data

  if (!product && query.isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải sản phẩm…</p>
  }

  if (!product) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Không tìm thấy sản phẩm.{' '}
          <Link to="/admin/products" className="font-medium text-foreground transition-colors hover:text-accent">
            Quay lại danh sách sản phẩm
          </Link>
        </p>
      </div>
    )
  }

  // Re-mount the editor if the resolved product changes (key) so its internal
  // state and form default values re-initialise from the new product.
  return <ProductEditor key={product.id} initialProduct={product} />
}

function ProductEditor({ initialProduct }) {
  const [product, setProduct] = useState(initialProduct)
  const navigate = useNavigate()

  const { data: categoriesData } = useCategories()
  const categoryOptions = useMemo(() => flattenCategories(categoriesData?.data ?? []), [categoriesData])

  const updateProduct = useUpdateProduct()
  const reorderMedia = useReorderMedia()
  const deleteMedia = useDeleteMedia()
  const updateMedia = useUpdateMedia()
  const attachMedia = useAttachMedia()
  const generateDescription = useGenerateDescription()
  const addToast = useToastStore((state) => state.addToast)

  const [variantModalOpen, setVariantModalOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [variantPage, setVariantPage] = useState(1)
  const [variantOptions, setVariantOptions] = useState(initialProduct?.variant_options ?? [])
  const [generatingField, setGeneratingField] = useState(null)
  const [tone, setTone] = useState('sang_trong')
  const [variations, setVariations] = useState(null)

  const {
    register,
    handleSubmit,
    setError,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name ?? '',
          slug: product.slug ?? '',
          category_id: product.category?.id != null ? String(product.category.id) : '',
          description: product.description ?? '',
          meta_title: product.meta_title ?? '',
          meta_description: product.meta_description ?? '',
          focus_keyword: product.focus_keyword ?? '',
          status: product.status ?? 'active',
        }
      : undefined,
  })

  const [activeTab, setActiveTab] = useState('thong-tin')

  const erroredTabs = new Set(
    Object.keys(errors)
      .map((field) => FIELD_TAB[field])
      .filter(Boolean),
  )

  const focusFirstErrorTab = (formErrors) => {
    const tabs = new Set(
      Object.keys(formErrors)
        .map((field) => FIELD_TAB[field])
        .filter(Boolean),
    )
    const first = TAB_ORDER.find((tab) => tabs.has(tab))
    if (first) setActiveTab(first)
  }

  const onSubmit = async (values) => {
    try {
      const response = await updateProduct.mutateAsync({
        id: product.id,
        ...toProductPayload(values),
        variant_options: variantOptions,
      })
      setProduct((current) => ({ ...current, ...response.data }))
      addToast({ title: 'Đã lưu sản phẩm.', variant: 'success' })
    } catch (error) {
      if (applyServerErrors(error, setError)) return
      addToast({ title: 'Không thể lưu sản phẩm.', description: error.message, variant: 'error' })
    }
  }

  const handleGenerateDescription = async () => {
    try {
      const response = await generateDescription.mutateAsync({
        name: watch('name') || product.name,
        category: product.category?.name ?? null,
        keyword: watch('focus_keyword') || null,
        attributes: product.attributes ?? {},
        tone,
        count: 2,
      })
      setVariations(response.data.drafts ?? [])
    } catch (error) {
      addToast({ title: 'Không thể tạo mô tả bằng AI.', description: error.message, variant: 'error' })
    }
  }

  const applyDraft = (draft) => {
    setValue('description', draft.description ?? '', { shouldDirty: true })
    setValue('meta_title', draft.meta_title ?? '', { shouldDirty: true })
    setValue('meta_description', draft.meta_description ?? '', { shouldDirty: true })
    if (draft.focus_keyword) setValue('focus_keyword', draft.focus_keyword, { shouldDirty: true })
    setVariations(null)
    addToast({ title: 'Đã áp dụng phương án. Kiểm tra và lưu lại.', variant: 'success' })
  }

  const productImageUrls = (product.media ?? []).filter((item) => item.type === 'image').map((item) => item.url)

  const handleGenerateFromImages = async () => {
    try {
      const response = await generateDescription.mutateAsync({
        name: watch('name') || product.name,
        category: product.category?.name ?? null,
        keyword: watch('focus_keyword') || null,
        attributes: product.attributes ?? {},
        tone,
        count: 2,
        image_urls: productImageUrls,
      })
      setVariations(response.data.drafts ?? [])
    } catch (error) {
      addToast({ title: 'Không thể tạo mô tả từ ảnh.', description: error.message, variant: 'error' })
    }
  }

  const handleGenerateField = async (field) => {
    setGeneratingField(field)
    try {
      const response = await generateDescription.mutateAsync({
        name: watch('name') || product.name,
        category: product.category?.name ?? null,
        keyword: watch('focus_keyword') || null,
        attributes: product.attributes ?? {},
        description: watch('description') || null,
        tone,
        field,
      })
      if (response.data[field] !== undefined) {
        setValue(field, response.data[field] ?? '', { shouldDirty: true })
      }
      addToast({ title: 'AI đã cập nhật trường đã chọn. Kiểm tra và lưu lại.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể tạo nội dung bằng AI.', description: error.message, variant: 'error' })
    } finally {
      setGeneratingField(null)
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

  const handleAttachMedia = async (assets) => {
    try {
      const response = await attachMedia.mutateAsync({ productId: product.id, mediaAssetIds: assets.map((a) => a.id) })
      setProduct((current) => ({ ...current, media: response.data }))
      addToast({ title: 'Đã thêm ảnh vào sản phẩm.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể thêm ảnh.', description: error.message, variant: 'error' })
    }
  }

  const handleDeleteMedia = async (media) => {
    try {
      await deleteMedia.mutateAsync({ productId: product.id, mediaId: media.id })
      setProduct((current) => ({ ...current, media: (current.media ?? []).filter((item) => item.id !== media.id) }))
      addToast({ title: 'Đã gỡ ảnh khỏi sản phẩm.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể gỡ ảnh.', description: error.message, variant: 'error' })
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

  // Tag a media item to a variant (or back to "all variants"). Empty select → null.
  const handleTagMedia = async (media, value) => {
    const variantId = value === '' ? null : Number(value)
    try {
      const response = await updateMedia.mutateAsync({ productId: product.id, mediaId: media.id, variantId })
      setProduct((current) => ({
        ...current,
        media: (current.media ?? []).map((item) => (item.id === media.id ? response.data : item)),
      }))
    } catch (error) {
      addToast({ title: 'Không thể gán ảnh cho phiên bản.', description: error.message, variant: 'error' })
    }
  }

  const sortedMedia = [...(product.media ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const attachedAssetIds = (product.media ?? []).map((m) => m.media_asset_id).filter(Boolean)

  const allVariants = product.variants ?? []
  const variantLastPage = Math.max(1, Math.ceil(allVariants.length / VARIANTS_PER_PAGE))
  const currentVariantPage = Math.min(variantPage, variantLastPage)
  const pagedVariants = allVariants.slice(
    (currentVariantPage - 1) * VARIANTS_PER_PAGE,
    currentVariantPage * VARIANTS_PER_PAGE,
  )

  const statusInfo = STATUS_LABELS[product.status] ?? { label: product.status, tone: 'neutral' }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/products">Quay lại danh sách sản phẩm</BackLink>

      {/* Title bar: name + status + global Save */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="truncate font-display text-2xl text-foreground">{product.name}</h2>
            <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">/{product.slug}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/products')}>
            Hủy
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit(onSubmit, focusFirstErrorTab)}>
            Lưu sản phẩm
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabList ariaLabel="Cấu hình sản phẩm">
          <Tab value="thong-tin" hasError={erroredTabs.has('thong-tin')}>Thông tin</Tab>
          <Tab value="bien-the">Biến thể</Tab>
          <Tab value="mo-ta-seo" hasError={erroredTabs.has('mo-ta-seo')}>Mô tả &amp; SEO</Tab>
          <Tab value="hinh-anh">Hình ảnh</Tab>
        </TabList>

        {/* THÔNG TIN — metadata fields (no inner <form>; Save is global) */}
        <TabPanel value="thong-tin">
          <Panel padded={false}>
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-lg text-foreground">Thông tin sản phẩm</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Cấu hình metadata của sản phẩm.</p>
            </div>
            <div className="flex flex-col gap-4 p-5">
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
            </div>
          </Panel>
        </TabPanel>

        {/* BIẾN THỂ — variants table + options + matrix generator */}
        <TabPanel value="bien-the">
          <div className="flex flex-col gap-6">
            <Panel padded={false}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-display text-lg text-foreground">
                    <Layers size={18} className="text-accent" aria-hidden="true" />
                    Biến thể
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {allVariants.length} biến thể · giá &amp; tồn kho
                  </p>
                </div>
                <Button onClick={openCreateVariantModal}>
                  <Plus size={16} aria-hidden="true" />
                  Thêm biến thể
                </Button>
              </div>

              {allVariants.length === 0 ? (
                <EmptyState
                  illustration="package"
                  icon={Layers}
                  title="Chưa có biến thể nào"
                  description="Thêm biến thể đầu tiên để thiết lập SKU, giá bán và tồn kho cho sản phẩm này."
                  action={
                    <Button onClick={openCreateVariantModal}>
                      <Plus size={16} aria-hidden="true" />
                      Thêm biến thể
                    </Button>
                  }
                />
              ) : (
                <>
                  <div className="max-h-[30rem] overflow-auto">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">Danh sách biến thể sản phẩm</caption>
                      <thead>
                        <tr className="border-b border-border bg-surface-alt/60 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          <th className="sticky top-0 bg-surface-alt px-5 py-3">SKU</th>
                          <th className="sticky top-0 bg-surface-alt px-5 py-3">Tên</th>
                          <th className="sticky top-0 bg-surface-alt px-5 py-3 text-right">Giá</th>
                          <th className="sticky top-0 bg-surface-alt px-5 py-3 text-right">Tồn kho</th>
                          <th className="sticky top-0 bg-surface-alt px-5 py-3">Trạng thái</th>
                          <th className="sticky top-0 bg-surface-alt px-5 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedVariants.map((variant) => (
                          <tr
                            key={variant.id}
                            className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt/40"
                          >
                            <td className="px-5 py-3 font-mono text-xs text-foreground">{variant.sku}</td>
                            <td className="px-5 py-3 font-medium text-foreground">{variant.name}</td>
                            <td className="px-5 py-3 text-right text-foreground">{formatPrice(variant.price)}</td>
                            <td
                              className={`px-5 py-3 text-right tabular-nums ${
                                variant.available_stock === 0 ? 'font-medium text-destructive' : 'text-foreground'
                              }`}
                            >
                              {variant.available_stock}
                            </td>
                            <td className="px-5 py-3">
                              <Badge tone={variant.is_active ? 'in-stock' : 'neutral'}>
                                {variant.is_active ? 'Hoạt động' : 'Tạm ngưng'}
                              </Badge>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                type="button"
                                aria-label="Sửa biến thể"
                                title="Sửa biến thể"
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-surface-alt hover:text-accent"
                                onClick={() => openEditVariantModal(variant)}
                              >
                                <Pencil size={16} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {variantLastPage > 1 && (
                    <div className="border-t border-border px-5 py-4">
                      <Pagination page={currentVariantPage} lastPage={variantLastPage} onPageChange={setVariantPage} />
                    </div>
                  )}
                </>
              )}
            </Panel>
            <Panel padded={false}>
              <div className="border-b border-border px-5 py-4">
                <h3 className="font-display text-lg text-foreground">Thuộc tính biến thể</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Định nghĩa các thuộc tính (màu sắc, kích thước…) rồi sinh tự động các biến thể tổ hợp.
                </p>
              </div>
              <div className="flex flex-col gap-6 p-5">
                <VariantOptionsPanel value={variantOptions} onChange={setVariantOptions} />
                <p className="text-xs text-muted-foreground">
                  {`Lưu thuộc tính bằng nút "Lưu sản phẩm" ở trên, sau đó sinh biến thể bên dưới.`}
                </p>
                <div className="border-t border-border pt-5">
                  <VariantMatrixGenerator
                    productId={product.id}
                    options={variantOptions}
                    variants={allVariants}
                    onCreated={(variants) => setProduct((current) => ({ ...current, variants }))}
                  />
                </div>
              </div>
            </Panel>
          </div>
        </TabPanel>

        {/* MÔ TẢ & SEO */}
        <TabPanel value="mo-ta-seo">
          <DescriptionSeoFields
            control={control}
            register={register}
            errors={errors}
            watch={watch}
            slug={product.slug}
            namePlaceholder={product.name}
            onGenerate={handleGenerateDescription}
            onGenerateFromImages={productImageUrls.length > 0 ? handleGenerateFromImages : undefined}
            isGenerating={generateDescription.isPending && generatingField === null}
            onGenerateField={handleGenerateField}
            generatingField={generatingField}
            tone={tone}
            onToneChange={setTone}
            variations={variations}
            onApplyDraft={applyDraft}
            onCloseVariations={() => setVariations(null)}
            onRegenerate={handleGenerateDescription}
            onEditorError={(error) =>
              addToast({ title: 'Không thể chèn ảnh.', description: error.message, variant: 'error' })
            }
          />
        </TabPanel>

        {/* HÌNH ẢNH — media library */}
        <TabPanel value="hinh-anh">
          <Panel padded={false}>
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <ImagePlus size={18} className="text-accent" aria-hidden="true" />
              <h3 className="font-display text-lg text-foreground">Hình ảnh / Video</h3>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {sortedMedia.map((media, index) => (
                  <div key={media.id} className="flex flex-col gap-2 rounded-card border border-border p-2">
                    <div className="aspect-square overflow-hidden rounded-control bg-background">
                      {media.type === 'video' ? (
                        <video src={media.url} className="h-full w-full object-cover" />
                      ) : (
                        <img src={media.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {media.type === 'video' ? 'Video' : 'Ảnh'} · Thứ tự {media.sort_order}
                    </p>
                    {product.variants?.length > 0 && (
                      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        Áp dụng cho
                        <select
                          value={media.variant_id ?? ''}
                          onChange={(event) => handleTagMedia(media, event.target.value)}
                          className="rounded-control border border-border bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">Tất cả phiên bản</option>
                          {product.variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-label="Lên"
                          disabled={index === 0}
                          onClick={() => handleMoveMedia(index, -1)}
                          className="cursor-pointer text-foreground hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Lên
                        </button>
                        <button
                          type="button"
                          aria-label="Xuống"
                          disabled={index === sortedMedia.length - 1}
                          onClick={() => handleMoveMedia(index, 1)}
                          className="cursor-pointer text-foreground hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Xuống
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label="Gỡ"
                        className="cursor-pointer text-destructive hover:opacity-80"
                        onClick={() => handleDeleteMedia(media)}
                      >
                        Gỡ
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                  Thêm ảnh
                </Button>
              </div>
              <MediaLibraryModal
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                multiple
                attachedAssetIds={attachedAssetIds}
                onSelect={handleAttachMedia}
              />
            </div>
          </Panel>
        </TabPanel>
      </Tabs>

      <VariantFormModal
        open={variantModalOpen}
        onOpenChange={setVariantModalOpen}
        productId={product.id}
        variant={editingVariant}
        onSaved={handleVariantSaved}
        options={product.variant_options ?? []}
        variants={allVariants}
      />
    </div>
  )
}
