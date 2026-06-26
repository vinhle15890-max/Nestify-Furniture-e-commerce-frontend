import { Controller } from 'react-hook-form'
import { Sparkles } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Panel } from '../../../components/admin/Panel'
import { RichTextEditor } from '../../../components/admin/RichTextEditor'

// Recommended SEO character limits — counters warn past these.
const META_TITLE_MAX = 60
const META_DESCRIPTION_MAX = 160

// Strips HTML tags for a plain-text fallback (snippet preview / meta excerpt).
function toPlainText(html) {
  return (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Shared "Mô tả & SEO" panel used by both the product create and edit pages:
 * a rich-text description editor, an AI draft button, the SEO meta fields with
 * live counters, and a Google-style snippet preview. The RHF helpers are passed
 * in so each page keeps a single form.
 */
export function DescriptionSeoFields({
  control,
  register,
  errors,
  watch,
  slug,
  namePlaceholder = '',
  onGenerate,
  isGenerating = false,
  onEditorError,
}) {
  const metaTitleValue = watch('meta_title') ?? ''
  const metaDescriptionValue = watch('meta_description') ?? ''
  const descriptionValue = watch('description') ?? ''
  const snippetTitle = metaTitleValue.trim() || namePlaceholder || 'Tiêu đề sản phẩm'
  const snippetDescription =
    metaDescriptionValue.trim() || toPlainText(descriptionValue).slice(0, 160) || 'Mô tả sản phẩm sẽ hiển thị tại đây.'

  return (
    <Panel padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg text-foreground">Mô tả &amp; SEO</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Nội dung mô tả và thẻ meta quyết định điểm SEO của trang sản phẩm.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onGenerate} disabled={isGenerating}>
          <Sparkles size={16} aria-hidden="true" />
          {isGenerating ? 'Đang tạo…' : 'Gợi ý bằng AI'}
        </Button>
      </div>

      <div className="flex flex-col gap-6 p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-foreground">
            Mô tả sản phẩm
          </label>
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <RichTextEditor
                id="description"
                ariaLabel="Mô tả"
                value={field.value}
                onChange={field.onChange}
                onError={onEditorError}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-border pt-5 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="meta_title" className="text-sm font-medium text-foreground">
                Tiêu đề SEO
              </label>
              <span className={`text-xs ${metaTitleValue.length > META_TITLE_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                {metaTitleValue.length}/{META_TITLE_MAX}
              </span>
            </div>
            <Input id="meta_title" error={errors.meta_title?.message} placeholder={namePlaceholder} {...register('meta_title')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="focus_keyword" className="text-sm font-medium text-foreground">
              Từ khóa chính
            </label>
            <Input
              id="focus_keyword"
              error={errors.focus_keyword?.message}
              placeholder="vd: sofa da bò"
              {...register('focus_keyword')}
            />
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <label htmlFor="meta_description" className="text-sm font-medium text-foreground">
                Mô tả SEO
              </label>
              <span className={`text-xs ${metaDescriptionValue.length > META_DESCRIPTION_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                {metaDescriptionValue.length}/{META_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="meta_description"
              rows={3}
              {...register('meta_description')}
              className="rounded-control border border-border bg-surface px-3 py-2 text-base font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.meta_description && (
              <p role="alert" className="text-sm text-destructive">
                {errors.meta_description.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-control border border-border bg-surface-alt/40 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Xem trước trên Google
          </p>
          <p className="truncate text-sm text-secondary">nestify.vn › san-pham › {slug || 'slug-san-pham'}</p>
          <p className="truncate text-lg text-accent">{snippetTitle}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{snippetDescription}</p>
        </div>
      </div>
    </Panel>
  )
}
