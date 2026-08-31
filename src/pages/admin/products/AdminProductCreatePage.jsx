import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useNavigate } from 'react-router-dom'
import { Layers, Images } from 'lucide-react'
import { BackLink } from '../../../components/BackLink'
import { Button } from '../../../components/Button'
import { Badge } from '../../../components/Badge'
import { Input } from '../../../components/Input'
import { Panel } from '../../../components/admin/Panel'
import { useCategories } from '../../../features/catalog/hooks'
import { useCreateProduct, useGenerateDescription } from '../../../features/admin/products/hooks'
import { useToastStore } from '../../../store/toastStore'
import { applyServerErrors } from '../../../lib/formErrors'
import { Tabs, TabList, Tab, TabPanel } from '../../../components/admin/Tabs'
import { slugify } from '../../../lib/slugify'
import { DescriptionSeoFields } from './DescriptionSeoFields'
import { ProductAttributesFields } from './ProductAttributesFields'
import { productSchema, flattenCategories, toProductPayload, emptyProductAttributes } from './productForm'

const emptyValues = {
  name: '',
  slug: '',
  category_id: '',
  description: '',
  meta_title: '',
  meta_description: '',
  focus_keyword: '',
  product_attributes: emptyProductAttributes,
  status: 'active',
  is_featured: false,
  featured_position: '',
}

// "New product" page — same rich layout as the editor, but variants and media
// stay locked until the product exists. Saving creates the record and drops the
// admin straight into the full edit page (no throwaway draft records).
export function AdminProductCreatePage() {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()
  const generateDescription = useGenerateDescription()
  const addToast = useToastStore((state) => state.addToast)

  const { data: categoriesData } = useCategories()
  const categoryOptions = useMemo(() => flattenCategories(categoriesData?.data ?? []), [categoriesData])

  const {
    register,
    handleSubmit,
    setError,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(productSchema), defaultValues: emptyValues })

  const [slugTouched, setSlugTouched] = useState(false)
  const [generatingField, setGeneratingField] = useState(null)
  const [tone, setTone] = useState('sang_trong')
  const [variations, setVariations] = useState(null)
  const nameValue = watch('name')
  const isFeatured = watch('is_featured')

  useEffect(() => {
    if (slugTouched) return
    setValue('slug', slugify(nameValue), { shouldValidate: true })
  }, [nameValue, slugTouched, setValue])

  const onSubmit = async (values) => {
    try {
      const response = await createProduct.mutateAsync(toProductPayload(values))
      addToast({ title: 'Đã tạo sản phẩm. Thêm biến thể, hình ảnh và video ngay nào.', variant: 'success' })
      navigate(`/admin/products/${response.data.id}`, { state: { product: response.data } })
    } catch (error) {
      if (applyServerErrors(error, setError)) return
      addToast({ title: 'Không thể tạo sản phẩm.', description: error.message, variant: 'error' })
    }
  }

  const handleGenerateDescription = async () => {
    try {
      const categoryName = categoryOptions.find((option) => String(option.id) === watch('category_id'))?.name ?? null
      const response = await generateDescription.mutateAsync({
        name: watch('name'),
        category: categoryName,
        keyword: watch('focus_keyword') || null,
        attributes: toProductPayload(watch()).attributes,
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
    addToast({ title: 'Đã áp dụng phương án. Kiểm tra trước khi lưu.', variant: 'success' })
  }

  const handleGenerateField = async (field) => {
    setGeneratingField(field)
    try {
      const categoryName = categoryOptions.find((option) => String(option.id) === watch('category_id'))?.name ?? null
      const response = await generateDescription.mutateAsync({
        name: watch('name'),
        category: categoryName,
        keyword: watch('focus_keyword') || null,
        attributes: toProductPayload(watch()).attributes,
        description: watch('description') || null,
        tone,
        field,
      })
      if (response.data[field] !== undefined) {
        setValue(field, response.data[field] ?? '', { shouldDirty: true })
      }
      addToast({ title: 'AI đã cập nhật trường đã chọn. Kiểm tra trước khi lưu.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể tạo nội dung bằng AI.', description: error.message, variant: 'error' })
    } finally {
      setGeneratingField(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/products">Quay lại danh sách sản phẩm</BackLink>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate font-display text-2xl text-foreground">Sản phẩm mới</h1>
            <Badge tone="neutral">Bản nháp</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Điền thông tin rồi lưu để thêm biến thể, hình ảnh và video.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/products')}>
            Hủy
          </Button>
        </div>
      </div>

      <Tabs defaultValue="thong-tin">
        <TabList ariaLabel="Cấu hình sản phẩm">
          <Tab value="thong-tin">Thông tin</Tab>
          <Tab value="thong-so">Thông số &amp; chính sách</Tab>
          <Tab value="bien-the" disabled>Biến thể</Tab>
          <Tab value="mo-ta-seo">Mô tả &amp; SEO</Tab>
          <Tab value="hinh-anh" disabled>Hình ảnh &amp; Video</Tab>
        </TabList>

        {/* THÔNG TIN */}
        <TabPanel value="thong-tin">
          <Panel padded={false}>
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-lg text-foreground">Thông tin sản phẩm</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Cấu hình metadata của sản phẩm.</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
              <Input label="Tên sản phẩm" id="name" error={errors.name?.message} {...register('name')} />
              <Input
                label="Slug"
                id="slug"
                error={errors.slug?.message}
                {...register('slug', { onChange: () => setSlugTouched(true) })}
              />
              {!slugTouched && (
                <p className="-mt-2 text-xs text-muted-foreground">Tự tạo từ tên sản phẩm. Bạn có thể chỉnh lại.</p>
              )}

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

              <fieldset className="rounded-control border border-border p-4">
                <legend className="px-1 text-sm font-medium text-foreground">Tuyển chọn trên trang chủ</legend>
                <label className="flex min-h-12 items-center gap-3 text-sm text-foreground">
                  <input type="checkbox" className="size-4 accent-primary" {...register('is_featured')} />
                  Đưa sản phẩm vào danh sách do Nestify tuyển chọn
                </label>
                {isFeatured && (
                  <Input label="Thứ tự ưu tiên" id="featured_position" type="number" min="1" max="9999" helper="Số nhỏ hiển thị trước; để trống sẽ xếp sau các sản phẩm có thứ tự." error={errors.featured_position?.message} {...register('featured_position')} />
                )}
              </fieldset>

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

              <div className="flex items-center gap-2 border-t border-border pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  Tạo sản phẩm
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/admin/products')}>
                  Hủy
                </Button>
              </div>
            </form>
          </Panel>
        </TabPanel>

        <TabPanel value="thong-so">
          <Panel padded={false}>
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-lg text-foreground">Thông số &amp; chính sách</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Chuyển dữ liệu có cấu trúc thành các trường hiển thị riêng trên storefront.
              </p>
            </div>
            <div className="p-5">
              <ProductAttributesFields register={register} errors={errors.product_attributes} />
            </div>
          </Panel>
        </TabPanel>

        {/* BIẾN THỂ — locked until the product exists */}
        <TabPanel value="bien-the">
          <Panel>
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-border-strong">
                <Layers size={24} aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-foreground">Biến thể</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Lưu sản phẩm trước, sau đó bạn có thể thêm biến thể (SKU, giá, tồn kho).
              </p>
            </div>
          </Panel>
        </TabPanel>

        {/* MÔ TẢ & SEO */}
        <TabPanel value="mo-ta-seo">
          <DescriptionSeoFields
            control={control}
            register={register}
            errors={errors}
            watch={watch}
            slug={watch('slug')}
            namePlaceholder={watch('name')}
            onGenerate={handleGenerateDescription}
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

        {/* HÌNH ẢNH — locked until the product exists */}
        <TabPanel value="hinh-anh">
          <Panel>
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-border-strong">
                <Images size={24} aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-foreground">Hình ảnh / Video</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Lưu sản phẩm trước để tải lên hình ảnh và video.
              </p>
            </div>
          </Panel>
        </TabPanel>
      </Tabs>
    </div>
  )
}
