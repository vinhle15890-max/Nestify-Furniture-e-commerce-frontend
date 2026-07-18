import { useState } from 'react'
import { Sparkles, Check, X, Pencil, RefreshCw, ImageOff } from 'lucide-react'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Modal } from '../../../components/Modal'
import { Pagination } from '../../../components/Pagination'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { PageHeader } from '../../../components/admin/PageHeader'
import { EmptyState } from '../../../components/admin/EmptyState'
import { RichTextEditor } from '../../../components/admin/RichTextEditor'
import { useToastStore } from '../../../store/toastStore'
import { computeSeoScore } from '../../../lib/seoScore'
import {
  useSeoDrafts,
  useBulkGenerateSeo,
  useSeoBatch,
  useApplyDraft,
  useDismissDraft,
  useUpdateDraft,
} from '../../../features/admin/seo/hooks'

const TABS = [
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'failed', label: 'Lỗi' },
]

function scoreTone(score) {
  if (score >= 80) return 'text-secondary'
  if (score >= 50) return 'text-accent'
  return 'text-destructive'
}

function ScoreBadge({ draft }) {
  const { score } = computeSeoScore({
    metaTitle: draft.meta_title,
    metaDescription: draft.meta_description,
    description: draft.description,
    focusKeyword: draft.focus_keyword,
  })
  return (
    <span className={`shrink-0 text-sm font-semibold ${scoreTone(score)}`} title="Điểm SEO ước tính">
      SEO {score}
    </span>
  )
}

function Thumbnail({ url, alt }) {
  if (!url) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-surface-alt text-muted-foreground">
        <ImageOff size={18} aria-hidden="true" />
      </span>
    )
  }
  return <img src={url} alt={alt} className="h-12 w-12 shrink-0 rounded-control object-cover" />
}

function PendingRow({ draft, onApply, onEdit, onDismiss, busy }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
      <Thumbnail url={draft.thumbnail} alt={draft.product_name ?? ''} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-foreground">{draft.product_name}</p>
          <ScoreBadge draft={draft} />
        </div>
        <p className="mt-1 truncate text-sm text-foreground">{draft.meta_title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{draft.meta_description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button onClick={() => onApply(draft)} disabled={busy}>
          <Check size={15} aria-hidden="true" /> Áp dụng
        </Button>
        <Button variant="secondary" onClick={() => onEdit(draft)} disabled={busy}>
          <Pencil size={15} aria-hidden="true" /> Sửa
        </Button>
        <Button variant="ghost" onClick={() => onDismiss(draft)} disabled={busy} aria-label={`Bỏ bản nháp ${draft.product_name}`}>
          <X size={15} aria-hidden="true" /> Bỏ
        </Button>
      </div>
    </div>
  )
}

function DraftEditorModal({ draft, open, onOpenChange, onSave, saving }) {
  const [values, setValues] = useState(draft)

  if (!draft || !values) return null

  const setField = (field, value) => setValues((current) => ({ ...current, [field]: value }))
  const seo = computeSeoScore({
    metaTitle: values.meta_title,
    metaDescription: values.meta_description,
    description: values.description,
    focusKeyword: values.focus_keyword,
  })
  const invalid =
    !values.description?.trim() ||
    !values.meta_title?.trim() ||
    values.meta_title.length > 70 ||
    !values.meta_description?.trim() ||
    values.meta_description.length > 300 ||
    !values.focus_keyword?.trim() ||
    values.focus_keyword.length > 100

  const submit = (event) => {
    event.preventDefault()
    onSave({
      description: values.description,
      meta_title: values.meta_title,
      meta_description: values.meta_description,
      focus_keyword: values.focus_keyword,
    })
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Sửa bản nháp SEO — ${draft.product_name}`}
      description="Các thay đổi chỉ cập nhật bản nháp chờ duyệt, chưa thay đổi sản phẩm đang hiển thị."
      contentClassName="max-w-4xl"
    >
      <form className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1" onSubmit={submit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="draft_description" className="text-sm font-medium text-foreground">Mô tả sản phẩm</label>
          <RichTextEditor
            id="draft_description"
            ariaLabel="Mô tả sản phẩm bản nháp"
            value={values.description}
            onChange={(value) => setField('description', value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="draft_meta_title" className="text-sm font-medium text-foreground">Tiêu đề SEO bản nháp</label>
              <span className={`text-xs ${values.meta_title.length > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {values.meta_title.length}/60
              </span>
            </div>
            <Input id="draft_meta_title" value={values.meta_title} onChange={(event) => setField('meta_title', event.target.value)} />
          </div>
          <Input
            id="draft_focus_keyword"
            label="Từ khóa chính bản nháp"
            value={values.focus_keyword}
            onChange={(event) => setField('focus_keyword', event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="draft_meta_description" className="text-sm font-medium text-foreground">Mô tả SEO bản nháp</label>
            <span className={`text-xs ${values.meta_description.length > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {values.meta_description.length}/160
            </span>
          </div>
          <textarea
            id="draft_meta_description"
            rows={4}
            value={values.meta_description}
            onChange={(event) => setField('meta_description', event.target.value)}
            className="rounded-control border border-border bg-surface px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center justify-between rounded-control border border-border bg-surface-alt/40 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Điểm SEO trực tiếp</p>
            <p className="text-xs text-muted-foreground">Tính từ chính các giá trị bản nháp đang sửa.</p>
          </div>
          <p className={`text-2xl font-semibold tabular-nums ${scoreTone(seo.score)}`} aria-label={`Điểm SEO bản nháp ${seo.score} trên 100`}>
            {seo.score}<span className="text-sm text-muted-foreground">/100</span>
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Hủy</Button>
          <Button type="submit" disabled={saving || invalid}>{saving ? 'Đang lưu…' : 'Lưu bản nháp'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function FailedRow({ draft, onRetry, busy }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <Thumbnail url={draft.thumbnail} alt={draft.product_name ?? ''} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{draft.product_name}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-destructive">{draft.error ?? 'Sinh thất bại'}</p>
      </div>
      <Button variant="secondary" onClick={() => onRetry(draft)} disabled={busy} className="shrink-0">
        <RefreshCw size={15} aria-hidden="true" /> Sinh lại
      </Button>
    </div>
  )
}

export function AdminSeoReviewPage() {
  const [tab, setTab] = useState('pending')
  const [page, setPage] = useState(1)
  const [batchId, setBatchId] = useState(null)
  const [editingDraft, setEditingDraft] = useState(null)
  const addToast = useToastStore((state) => state.addToast)

  const { data, isLoading, isError, isFetching, refetch } = useSeoDrafts({ status: tab, page })
  const bulk = useBulkGenerateSeo()
  const apply = useApplyDraft()
  const dismiss = useDismissDraft()
  const updateDraft = useUpdateDraft()
  const { data: batchData } = useSeoBatch(batchId, { enabled: Boolean(batchId) })
  const batch = batchData?.data

  const drafts = data?.data ?? []
  const meta = data?.meta ?? { last_page: 1 }
  const busy = apply.isPending || dismiss.isPending || updateDraft.isPending

  const runBulk = (payload, emptyMessage) => {
    bulk.mutate(payload, {
      onSuccess: (res) => {
        const { batch_id, queued } = res.data ?? {}
        if (!queued) {
          addToast({ title: emptyMessage, variant: 'default' })
          return
        }
        setBatchId(batch_id)
        addToast({ title: `Đã xếp ${queued} sản phẩm vào hàng đợi sinh SEO`, variant: 'default' })
      },
      onError: (error) => addToast({ title: error.message ?? 'Không thể sinh SEO', variant: 'destructive' }),
    })
  }

  const handleGenerateMissing = () =>
    runBulk({ scope: 'missing' }, 'Không có sản phẩm nào thiếu SEO')

  const handleRetry = (draft) =>
    runBulk({ scope: 'selected', product_ids: [draft.product_id] }, 'Không thể sinh lại')

  const changeTab = (id) => {
    setTab(id)
    setPage(1)
  }

  const handleApply = (draft) =>
    apply.mutate(draft.product_id, {
      onSuccess: () => addToast({ title: `Đã áp dụng SEO cho "${draft.product_name}"`, variant: 'default' }),
      onError: (error) => addToast({ title: error.message ?? 'Không thể áp dụng', variant: 'destructive' }),
    })

  const handleDismiss = (draft) =>
    dismiss.mutate(draft.product_id, {
      onSuccess: () => addToast({ title: 'Đã bỏ bản nháp', variant: 'default' }),
      onError: (error) => addToast({ title: error.message ?? 'Không thể bỏ', variant: 'destructive' }),
    })

  const handleSaveDraft = (payload) =>
    updateDraft.mutate(
      { productId: editingDraft.product_id, payload },
      {
        onSuccess: () => {
          setEditingDraft(null)
          addToast({ title: 'Đã lưu bản nháp SEO', variant: 'default' })
        },
        onError: (error) => addToast({ title: error.message ?? 'Không thể lưu bản nháp', variant: 'destructive' }),
      },
    )

  const batchRunning = batch && !batch.finished

  return (
    <div>
      <PageHeader
        icon={Sparkles}
        title="Duyệt SEO"
        description="Xem và áp dụng các bản mô tả SEO do AI sinh hàng loạt."
        actions={
          <Button onClick={handleGenerateMissing} disabled={bulk.isPending}>
            <Sparkles size={16} aria-hidden="true" />
            Sinh cho SP thiếu SEO
          </Button>
        }
      />

      {batchRunning && (
        <div className="mt-4 rounded-card border border-border bg-surface-alt/50 px-4 py-3 text-sm text-muted-foreground">
          Đang sinh… {batch.processed}/{batch.total} xong{batch.failed ? `, ${batch.failed} lỗi` : ''}.
        </div>
      )}

      <div className="mt-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => changeTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải bản nháp..." />
        ) : isError && !data ? (
          <LoadErrorState title="Chưa thể tải bản nháp SEO" description="Tab và trang hiện tại được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
        ) : drafts.length === 0 ? (
          <Card>
            <EmptyState
              illustration="sofa"
              title={tab === 'pending' ? 'Chưa có bản nháp nào' : 'Không có bản lỗi'}
              description={
                tab === 'pending'
                  ? 'Bấm "Sinh cho SP thiếu SEO" để tạo bản nháp cho các sản phẩm còn thiếu.'
                  : 'Các bản sinh lỗi (do quá tải AI) sẽ hiện ở đây để bạn thử lại.'
              }
            />
          </Card>
        ) : (
          <div className="divide-y divide-border rounded-card border border-border bg-surface shadow-soft">
            {drafts.map((draft) =>
              tab === 'pending' ? (
                <PendingRow key={draft.id} draft={draft} onApply={handleApply} onEdit={setEditingDraft} onDismiss={handleDismiss} busy={busy} />
              ) : (
                <FailedRow key={draft.id} draft={draft} onRetry={handleRetry} busy={bulk.isPending} />
              ),
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <Pagination page={page} lastPage={meta.last_page ?? 1} onPageChange={setPage} />
      </div>

      <DraftEditorModal
        key={editingDraft?.id ?? 'closed'}
        draft={editingDraft}
        open={Boolean(editingDraft)}
        onOpenChange={(open) => {
          if (!open && !updateDraft.isPending) setEditingDraft(null)
        }}
        onSave={handleSaveDraft}
        saving={updateDraft.isPending}
      />
    </div>
  )
}
