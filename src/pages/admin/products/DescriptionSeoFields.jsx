import { Controller } from 'react-hook-form'
import { Sparkles, Image as ImageIcon } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Modal } from '../../../components/Modal'
import { Panel } from '../../../components/admin/Panel'
import { RichTextEditor } from '../../../components/admin/RichTextEditor'
import { computeSeoScore } from '../../../lib/seoScore'

// Recommended SEO character limits — counters warn past these.
const META_TITLE_MAX = 60
const META_DESCRIPTION_MAX = 160

const TONES = [
  { value: 'sang_trong', label: 'Sang trọng' },
  { value: 'than_thien', label: 'Thân thiện' },
  { value: 'toi_gian', label: 'Tối giản' },
]

// Strips HTML tags for a plain-text fallback (snippet preview / meta excerpt).
function toPlainText(html) {
  return (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Small inline "Gợi ý" button that drafts a single SEO field with AI.
function FieldSuggestButton({ field, label, onGenerateField, generatingField, disabled }) {
  if (!onGenerateField) return null
  const loading = generatingField === field
  return (
    <button
      type="button"
      aria-label={`Gợi ý ${label} bằng AI`}
      onClick={() => onGenerateField(field)}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1 rounded-control text-xs text-accent transition-colors duration-200 hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <Sparkles size={13} aria-hidden="true" />
      {loading ? 'Đang tạo…' : 'Gợi ý'}
    </button>
  )
}

const SCORE_DOT = { pass: 'bg-secondary', warn: 'bg-accent', fail: 'bg-destructive' }
function scoreColor(score) {
  if (score >= 80) return 'text-secondary'
  if (score >= 50) return 'text-accent'
  return 'text-destructive'
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
  onGenerateFromImages,
  isGenerating = false,
  onGenerateField,
  generatingField = null,
  tone = 'sang_trong',
  onToneChange,
  variations = null,
  onApplyDraft,
  onCloseVariations,
  onRegenerate,
  onEditorError,
  pendingDraftScore = null,
}) {
  const metaTitleValue = watch('meta_title') ?? ''
  const metaDescriptionValue = watch('meta_description') ?? ''
  const descriptionValue = watch('description') ?? ''
  const focusKeywordValue = watch('focus_keyword') ?? ''
  const snippetTitle = metaTitleValue.trim() || namePlaceholder || 'Tiêu đề sản phẩm'
  const snippetDescription =
    metaDescriptionValue.trim() || toPlainText(descriptionValue).slice(0, 160) || 'Mô tả sản phẩm sẽ hiển thị tại đây.'

  // Any AI generation in flight — used to disable the other suggest affordances.
  const anyGenerating = isGenerating || generatingField !== null
  const seo = computeSeoScore({
    metaTitle: metaTitleValue,
    metaDescription: metaDescriptionValue,
    description: descriptionValue,
    focusKeyword: focusKeywordValue,
  })

  return (
    <Panel padded={false}>
      {pendingDraftScore != null && (
        <div className="border-b border-border bg-surface-alt/50 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                📌 Draft SEO chờ duyệt
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Có bản mô tả SEO từ AI chờ áp dụng (điểm {pendingDraftScore}/100).
              </p>
            </div>
            <a
              href="/admin/products/seo"
              className="shrink-0 inline-flex items-center gap-1 rounded-control border border-foreground px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Xem tại Duyệt SEO
            </a>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg text-foreground">Mô tả &amp; SEO</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Nội dung mô tả và thẻ meta quyết định điểm SEO của trang sản phẩm.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onToneChange && (
            <div className="flex items-center gap-1 rounded-control border border-border p-0.5" role="group" aria-label="Giọng văn">
              {TONES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToneChange(option.value)}
                  disabled={anyGenerating}
                  aria-pressed={tone === option.value}
                  className={`rounded-control px-2.5 py-1 text-xs transition-colors duration-200 disabled:opacity-40 ${
                    tone === option.value ? 'bg-primary text-surface' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          <Button type="button" variant="secondary" onClick={onGenerate} disabled={anyGenerating}>
            <Sparkles size={16} aria-hidden="true" />
            {isGenerating ? 'Đang tạo…' : 'Gợi ý bằng AI'}
          </Button>
          {onGenerateFromImages && (
            <Button type="button" variant="secondary" onClick={onGenerateFromImages} disabled={anyGenerating}>
              <ImageIcon size={16} aria-hidden="true" />
              Gợi ý từ ảnh
            </Button>
          )}
        </div>
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
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="meta_title" className="text-sm font-medium text-foreground">
                Tiêu đề SEO
              </label>
              <div className="flex items-center gap-3">
                <FieldSuggestButton
                  field="meta_title"
                  label="tiêu đề SEO"
                  onGenerateField={onGenerateField}
                  generatingField={generatingField}
                  disabled={anyGenerating}
                />
                <span className={`text-xs ${metaTitleValue.length > META_TITLE_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {metaTitleValue.length}/{META_TITLE_MAX}
                </span>
              </div>
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
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="meta_description" className="text-sm font-medium text-foreground">
                Mô tả SEO
              </label>
              <div className="flex items-center gap-3">
                <FieldSuggestButton
                  field="meta_description"
                  label="mô tả SEO"
                  onGenerateField={onGenerateField}
                  generatingField={generatingField}
                  disabled={anyGenerating}
                />
                <span className={`text-xs ${metaDescriptionValue.length > META_DESCRIPTION_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {metaDescriptionValue.length}/{META_DESCRIPTION_MAX}
                </span>
              </div>
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

        <div className="rounded-control border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Điểm SEO</p>
            <p className={`text-2xl font-semibold tabular-nums ${scoreColor(seo.score)}`}>
              <span aria-label={`Điểm SEO ${seo.score} trên 100`}>{seo.score}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-alt">
            <div
              className={`h-full rounded-full ${seo.score >= 80 ? 'bg-secondary' : seo.score >= 50 ? 'bg-accent' : 'bg-destructive'}`}
              style={{ width: `${seo.score}%` }}
            />
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {seo.checks.map((check) => (
              <li key={check.id} className="flex items-center gap-2.5 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${SCORE_DOT[check.status]}`} aria-hidden="true" />
                <span className="flex-1 text-foreground">{check.label}</span>
                {check.hint && <span className="text-xs text-muted-foreground">{check.hint}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Modal
        open={Array.isArray(variations) && variations.length > 0}
        onOpenChange={(open) => {
          if (!open) onCloseVariations?.()
        }}
        title="Chọn phương án mô tả"
        description="AI đã tạo vài phương án — chọn bản bạn thích, có thể chỉnh lại sau."
      >
        <div className="flex flex-col gap-3">
          {(variations ?? []).map((draft, index) => (
            <div key={index} className="rounded-control border border-border p-4">
              <p className="text-sm font-medium text-foreground">{draft.meta_title || 'Không có tiêu đề'}</p>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                {toPlainText(draft.description).slice(0, 200)}
              </p>
              {draft.meta_description && <p className="mt-2 text-xs text-secondary">{draft.meta_description}</p>}
              <Button type="button" className="mt-3" onClick={() => onApplyDraft?.(draft)}>
                Dùng bản này
              </Button>
            </div>
          ))}
          {onRegenerate && (
            <Button type="button" variant="secondary" onClick={onRegenerate} disabled={isGenerating}>
              {isGenerating ? 'Đang tạo…' : 'Tạo lại'}
            </Button>
          )}
        </div>
      </Modal>
    </Panel>
  )
}
